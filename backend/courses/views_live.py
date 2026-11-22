from django.shortcuts import get_object_or_404
from django.http import Http404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from users.permissions import IsStaffOrEducator, IsAdminUser
from users.models import log_action, Notification
from .models import LiveClass, Course, Module, Lecture, UserEnrollment
from .serializers_live import LiveClassPublicSerializer, LiveClassManageSerializer
from .live_utils import parse_and_validate_stream_url, validate_recording_url

class LiveClassPublicListView(generics.ListAPIView):
    serializer_class = LiveClassPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = LiveClass.objects.exclude(status="cancelled")
        status_param = self.request.query_params.get("status")
        now = timezone.now()

        if status_param == "live":
            qs = qs.filter(status="live")
        elif status_param == "upcoming":
            qs = qs.filter(status="scheduled", scheduled_end__gte=now)
        elif status_param == "past":
            qs = qs.filter(status="ended")

        return qs.order_by("scheduled_start")


class LiveClassPublicDetailView(generics.RetrieveAPIView):
    queryset = LiveClass.objects.all()
    serializer_class = LiveClassPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        obj = super().get_object()
        if obj.status == "cancelled":
            user = self.request.user
            is_admin = user.is_authenticated and (
                user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]
            )
            is_owner = user.is_authenticated and obj.educator_id == user.id
            if not (is_admin or is_owner):
                raise Http404("Live class not found.")
        return obj


class LiveClassManageListView(generics.ListCreateAPIView):
    serializer_class = LiveClassManageSerializer
    permission_classes = [IsStaffOrEducator]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]:
            return LiveClass.objects.all().order_by("-scheduled_start")
        return LiveClass.objects.filter(educator=user).order_by("-scheduled_start")

    def perform_create(self, serializer):
        user = self.request.user
        is_admin = user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]
        educator = user
        if is_admin and "educator" in self.request.data:
            educator_id = self.request.data.get("educator")
            if educator_id:
                from django.contrib.auth.models import User
                target = User.objects.filter(id=educator_id).first()
                if target:
                    educator = target

        instance = serializer.save(educator=educator)
        log_action(
            actor=user,
            action="create_live_class",
            object_type="live_class",
            object_id=instance.id,
            object_title=instance.title,
            owner=instance.educator
        )


class LiveClassManageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LiveClassManageSerializer
    permission_classes = [IsStaffOrEducator]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]:
            return LiveClass.objects.all()
        return LiveClass.objects.filter(educator=user)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action="update_live_class",
            object_type="live_class",
            object_id=instance.id,
            object_title=instance.title,
            owner=instance.educator
        )

    def perform_destroy(self, instance):
        title = instance.title
        cid = instance.id
        owner = instance.educator
        instance.delete()
        log_action(
            actor=self.request.user,
            action="delete_live_class",
            object_type="live_class",
            object_id=cid,
            object_title=title,
            owner=owner
        )


class LiveClassGoLiveView(APIView):
    permission_classes = [IsStaffOrEducator]

    def post(self, request, pk):
        user = request.user
        is_admin = user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]
        if is_admin:
            live_class = get_object_or_404(LiveClass, pk=pk)
        else:
            live_class = get_object_or_404(LiveClass, pk=pk, educator=user)

        if live_class.status != "scheduled":
            return Response(
                {"detail": f"Cannot transition to 'live' from current status '{live_class.status}'."},
                status=status.HTTP_409_CONFLICT
            )

        new_stream = request.data.get("stream_url")
        if new_stream:
            clean_stream, _, _ = parse_and_validate_stream_url(new_stream, live_class.provider)
            live_class.stream_url = clean_stream

        if not live_class.stream_url:
            return Response({"stream_url": "Stream URL is required to go live."}, status=status.HTTP_400_BAD_REQUEST)

        live_class.status = "live"
        live_class.started_at = timezone.now()
        live_class.live_reminder_sent = True
        live_class.save()

        # Send live notification in batches of 500
        if live_class.course:
            enrolled_users = UserEnrollment.objects.filter(course=live_class.course, is_active=True).values_list("user", flat=True)
            notifs = [
                Notification(
                    user_id=uid,
                    title="Live Class Started!",
                    body=f"{live_class.title} is LIVE now. Click to join classroom.",
                    link=f"/student/live/{live_class.id}"
                )
                for uid in enrolled_users
            ]
            if notifs:
                Notification.objects.bulk_create(notifs, batch_size=500)

        log_action(
            actor=user,
            action="go_live",
            object_type="live_class",
            object_id=live_class.id,
            object_title=live_class.title,
            owner=live_class.educator
        )

        serializer = LiveClassManageSerializer(live_class, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class LiveClassEndView(APIView):
    permission_classes = [IsStaffOrEducator]

    def post(self, request, pk):
        user = request.user
        is_admin = user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]
        if is_admin:
            live_class = get_object_or_404(LiveClass, pk=pk)
        else:
            live_class = get_object_or_404(LiveClass, pk=pk, educator=user)

        if live_class.status != "live":
            return Response(
                {"detail": f"Cannot transition to 'ended' from current status '{live_class.status}'."},
                status=status.HTTP_409_CONFLICT
            )

        recording_url = request.data.get("recording_url")
        if recording_url:
            clean_rec = validate_recording_url(recording_url, live_class.provider)
            live_class.recording_url = clean_rec

        live_class.status = "ended"
        live_class.ended_at = timezone.now()
        live_class.save()

        log_action(
            actor=user,
            action="end_live",
            object_type="live_class",
            object_id=live_class.id,
            object_title=live_class.title,
            owner=live_class.educator
        )

        serializer = LiveClassManageSerializer(live_class, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class LiveClassCancelView(APIView):
    permission_classes = [IsStaffOrEducator]

    def post(self, request, pk):
        user = request.user
        is_admin = user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]
        if is_admin:
            live_class = get_object_or_404(LiveClass, pk=pk)
        else:
            live_class = get_object_or_404(LiveClass, pk=pk, educator=user)

        if live_class.status != "scheduled":
            return Response(
                {"detail": f"Cannot cancel class from current status '{live_class.status}'."},
                status=status.HTTP_409_CONFLICT
            )

        live_class.status = "cancelled"
        live_class.save()

        log_action(
            actor=user,
            action="cancel_live",
            object_type="live_class",
            object_id=live_class.id,
            object_title=live_class.title,
            owner=live_class.educator
        )

        serializer = LiveClassManageSerializer(live_class, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class LiveClassConvertToLectureView(APIView):
    permission_classes = [IsStaffOrEducator]

    def post(self, request, pk):
        user = request.user
        is_admin = user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"]
        if is_admin:
            live_class = get_object_or_404(LiveClass, pk=pk)
        else:
            live_class = get_object_or_404(LiveClass, pk=pk, educator=user)

        module_id = request.data.get("module_id") or (live_class.module_id if live_class.module else None)
        if not module_id:
            return Response({"module_id": "Target course module is required."}, status=status.HTTP_400_BAD_REQUEST)

        module = get_object_or_404(Module, pk=module_id)

        # The module must belong to the live class's course
        if live_class.course_id and module.course_id != live_class.course_id:
            return Response({"module_id": "Target module does not belong to this live class's course."}, status=status.HTTP_400_BAD_REQUEST)

        # Only admin/staff or the owner of module.course
        if not is_admin and module.course.created_by_id != user.id:
            return Response({"detail": "Permission denied for this module."}, status=status.HTTP_403_FORBIDDEN)

        rec_url = request.data.get("recording_url") or live_class.recording_url
        if not rec_url:
            return Response({"recording_url": "Recording URL is required to convert to a lecture."}, status=status.HTTP_400_BAD_REQUEST)

        clean_rec = validate_recording_url(rec_url, live_class.provider)
        live_class.recording_url = clean_rec
        live_class.save()

        lecture_title = request.data.get("title") or f"[Live Class] {live_class.title}"
        summary = request.data.get("summary") or live_class.description
        order = module.lessons.count() + 1
        instructor = live_class.educator.get_full_name() or live_class.educator.username

        lecture = Lecture.objects.create(
            module=module,
            title=lecture_title,
            video_url=clean_rec,
            summary=summary,
            order=order,
            instructor_name=instructor
        )

        log_action(
            actor=user,
            action="convert_live_to_lecture",
            object_type="lecture",
            object_id=lecture.id,
            object_title=lecture.title,
            owner=live_class.educator,
            changes={"live_class_id": live_class.id, "module_id": module.id}
        )

        return Response({
            "message": "Live class recording converted to course lecture successfully.",
            "lecture_id": lecture.id,
            "lecture_title": lecture.title,
            "module_id": module.id,
            "course_slug": module.course.slug
        }, status=status.HTTP_201_CREATED)
