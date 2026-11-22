from django.db import models
from .permissions import IsAdminOrEducator, IsCourseOwnerOrAdmin
import math
import re
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    Course, Module, Lecture, UserEnrollment, UserLectureProgress, Subject,
    Batch, WeeklyTimetable, DailyChallengeQuestion, DoubtQuery
)
from .serializers import (
    CourseListSerializer, CourseDetailSerializer,
    LectureSerializer, SubjectSerializer, LectureProgressSerializer,
    ModuleWriteSerializer, LectureWriteSerializer,
    WeeklyTimetableSerializer, BatchSerializer,
    DailyChallengeQuestionSerializer, DoubtQuerySerializer
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _user_enrolled(user, course) -> bool:
    """True when an authenticated user has an active enrollment."""
    if not user or not user.is_authenticated:
        return False
    return UserEnrollment.objects.filter(user=user, course=course, is_active=True).exists()


def _lecture_accessible(request, lecture) -> bool:
    """Return True when the requesting user may view this lecture's video."""
    course = lecture.module.course
    if not course.is_paid:
        return True
    if lecture.is_free_preview:
        return True
    if request.user and request.user.is_authenticated:
        if request.user.is_staff:
            return True
        return _user_enrolled(request.user, course)
    return False


def _parse_duration_seconds(duration_str) -> int | None:
    """Safely parse human duration strings (e.g. '45 mins', '1 hr 30 mins', '10:30') into seconds."""
    if not duration_str or not isinstance(duration_str, str):
        return None
    d = duration_str.strip().lower()

    colon_match = re.match(r'^(\d+):(\d{2})(?::(\d{2}))?$', d)
    if colon_match:
        parts = [int(p) for p in colon_match.groups() if p is not None]
        if len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        elif len(parts) == 2:
            return parts[0] * 60 + parts[1]

    total = 0
    matched = False
    h_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)', d)
    if h_match:
        total += int(float(h_match.group(1)) * 3600)
        matched = True

    m_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m\b)', d)
    if m_match:
        total += int(float(m_match.group(1)) * 60)
        matched = True

    s_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s\b)', d)
    if s_match:
        total += int(float(s_match.group(1)))
        matched = True

    return total if matched and total > 0 else None


# ── public catalog ────────────────────────────────────────────────────────────

class CourseListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CourseListSerializer

    def get_queryset(self):
        if self.request.query_params.get('my_courses') == 'true' and self.request.user.is_authenticated:
            if self.request.user.is_staff or self.request.user.is_superuser:
                qs = Course.objects.all()
            else:
                qs = Course.objects.filter(created_by=self.request.user)
        else:
            qs = Course.objects.filter(is_published=True)

        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(models.Q(category=category) | models.Q(category_ref__slug=category))
        if search:
            qs = qs.filter(title__icontains=search)
        return qs


class CourseDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CourseDetailSerializer
    lookup_field = 'slug'
    queryset = Course.objects.filter(is_published=True).prefetch_related('curriculum__lessons')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Build progress_map in one extra query to avoid N+1 per lecture
        progress_map: dict = {}
        if request.user.is_authenticated:
            progress_qs = UserLectureProgress.objects.filter(
                user=request.user,
                lecture__module__course=instance,
            ).values('lecture_id', 'is_completed', 'last_position_seconds')
            progress_map = {p['lecture_id']: p for p in progress_qs}
        is_enrolled = False
        if request.user.is_authenticated:
            is_enrolled = UserEnrollment.objects.filter(
                user=request.user, course=instance, is_active=True
            ).exists()
        serializer = self.get_serializer(
            instance,
            context={**self.get_serializer_context(), 'progress_map': progress_map, 'is_enrolled': is_enrolled},
        )
        return Response(serializer.data)


# ── lecture detail (server-enforced access) ───────────────────────────────────

class LectureDetailView(APIView):
    """
    GET /api/courses/lectures/<id>/
    Returns lecture metadata.  video_url is null when the caller lacks access.
    Includes recommended study resources related to the lecture's course/subject.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, lecture_id):
        lecture = get_object_or_404(Lecture.objects.select_related('module__course'), id=lecture_id)
        serializer = LectureSerializer(lecture, context={'request': request})
        data = serializer.data

        # Recommend study materials for this lecture's course / subject
        try:
            from resources.models import StudyResource
            from resources.serializers import StudyResourceSerializer
            course = lecture.module.course
            res_qs = StudyResource.objects.filter(is_published=True, review_status='approved')
            if course:
                rec_items = res_qs.filter(course=course)[:6]
                if not rec_items.exists():
                    rec_items = res_qs.all()[:6]
            else:
                rec_items = res_qs.all()[:6]
            data['recommended_resources'] = StudyResourceSerializer(rec_items, many=True, context={'request': request}).data
        except Exception:
            data['recommended_resources'] = []

        return Response(data)


# ── progress endpoints ────────────────────────────────────────────────────────

class LectureProgressView(APIView):
    """
    GET   /api/courses/lectures/<id>/progress/ — retrieve saved position + completion for request.user
    POST  /api/courses/lectures/<id>/progress/ — toggle completion, optionally save validated position
    PATCH /api/courses/lectures/<id>/progress/ — save validated playback position only (preserves completion)
    """
    permission_classes = [permissions.IsAuthenticated]

    MAX_POSITION_SECONDS = 86400  # 24-hour absolute safety cap

    def _get_lecture_or_403(self, request, lecture_id):
        """Return lecture if user may access it, else return 403 response."""
        lecture = get_object_or_404(Lecture.objects.select_related('module__course'), id=lecture_id)
        if not _lecture_accessible(request, lecture):
            return None, Response(
                {'error': 'You must be enrolled in this course to track progress.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return lecture, None

    def _validate_and_extract_position(self, lecture, data) -> tuple[int | None, Response | None]:
        """
        Validate 'last_position_seconds':
        - None: returns (None, None) -> no update requested
        - Rejects non-numeric strings, non-finite values (NaN, inf), negatives, and values > 86400 (24h hard cap).
        - Does NOT compare against lecture.duration — that would break variable-length videos.
        """
        if 'last_position_seconds' not in data:
            return None, None

        raw = data.get('last_position_seconds')
        if raw is None:
            return None, None

        try:
            val_float = float(raw)
        except (ValueError, TypeError):
            return None, Response(
                {'error': 'last_position_seconds must be a valid finite number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not math.isfinite(val_float):
            return None, Response(
                {'error': 'last_position_seconds must be finite.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if val_float < 0:
            return None, Response(
                {'error': 'last_position_seconds cannot be negative.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if val_float > self.MAX_POSITION_SECONDS:
            return None, Response(
                {'error': f'last_position_seconds exceeds maximum allowed position ({self.MAX_POSITION_SECONDS} seconds).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return int(val_float), None

    def get(self, request, lecture_id):
        lecture, err = self._get_lecture_or_403(request, lecture_id)
        if err:
            return err
        # Strict user isolation: only fetch request.user's progress
        prog = UserLectureProgress.objects.filter(user=request.user, lecture=lecture).first()
        if not prog:
            return Response({
                'lecture_id': lecture.id,
                'is_completed': False,
                'last_position_seconds': 0,
            })
        return Response(LectureProgressSerializer(prog).data)

    def post(self, request, lecture_id):
        """Toggle is_completed; also save last_position_seconds if provided and valid."""
        lecture, err = self._get_lecture_or_403(request, lecture_id)
        if err:
            return err

        pos, pos_err = self._validate_and_extract_position(lecture, request.data)
        if pos_err:
            return pos_err

        prog, _ = UserLectureProgress.objects.get_or_create(user=request.user, lecture=lecture)
        prog.is_completed = not prog.is_completed
        if pos is not None:
            prog.last_position_seconds = pos
        prog.save()
        return Response(LectureProgressSerializer(prog).data)

    def patch(self, request, lecture_id):
        """Save playback position without changing completion status."""
        lecture, err = self._get_lecture_or_403(request, lecture_id)
        if err:
            return err

        pos, pos_err = self._validate_and_extract_position(lecture, request.data)
        if pos_err:
            return pos_err

        prog, _ = UserLectureProgress.objects.get_or_create(user=request.user, lecture=lecture)
        if pos is not None:
            prog.last_position_seconds = pos
            prog.save(update_fields=['last_position_seconds', 'updated_at'])
        return Response(LectureProgressSerializer(prog).data)


class MyLectureProgressListView(generics.ListAPIView):
    """
    GET /api/courses/progress/
    Returns all lecture progress records strictly for the authenticated user.
    Used to hydrate completedLessonIds and resume positions on login.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LectureProgressSerializer

    def get_queryset(self):
        return UserLectureProgress.objects.filter(user=self.request.user).select_related('lecture')


# ── enrolled courses ──────────────────────────────────────────────────────────

class MyEnrolledCoursesView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourseListSerializer

    def get_queryset(self):
        enrolled_ids = UserEnrollment.objects.filter(
            user=self.request.user, is_active=True
        ).values_list('course_id', flat=True)
        return Course.objects.filter(id__in=enrolled_ids)


# ── video discovery (public catalog with lecture previews) ────────────────────

class VideoLectureDiscoveryView(APIView):
    """
    Returns published courses with structured modules and lectures.
    Locked lectures have video_url=null (enforced by LectureSerializer).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        courses = Course.objects.filter(is_published=True).prefetch_related('curriculum__lessons')
        search = request.query_params.get('search', '').strip()
        category = request.query_params.get('category', '').strip()
        if category:
            courses = courses.filter(category=category)
        if search:
            courses = courses.filter(title__icontains=search)
        enrolled_course_ids = set()
        progress_map = {}
        if request.user.is_authenticated:
            enrolled_course_ids = set(UserEnrollment.objects.filter(
                user=request.user, is_active=True
            ).values_list('course_id', flat=True))
            progress_qs = UserLectureProgress.objects.filter(
                user=request.user
            ).values('lecture_id', 'is_completed', 'last_position_seconds')
            progress_map = {p['lecture_id']: p for p in progress_qs}
        serializer = CourseDetailSerializer(
            courses,
            many=True,
            context={
                'request': request,
                'enrolled_course_ids': enrolled_course_ids,
                'progress_map': progress_map,
            }
        )
        return Response(serializer.data)


# ── admin course management ───────────────────────────────────────────────────

class CourseManageCreateView(generics.CreateAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = CourseDetailSerializer
    queryset = Course.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin'])
        course = serializer.save(
            created_by=user,
            review_status='approved' if is_admin else 'draft',
            is_published=True if is_admin else False
        )
        log_action(
            actor=user,
            action='create',
            object_type='course',
            object_id=course.id,
            object_title=course.title,
            owner=course.created_by,
            changes={'title': ['', course.title]}
        )


class CourseManageUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsCourseOwnerOrAdmin]
    serializer_class = CourseDetailSerializer
    queryset = Course.objects.all()
    lookup_field = 'id'

    def perform_update(self, serializer):
        old_title = serializer.instance.title
        course = serializer.save()
        log_action(
            actor=self.request.user,
            action='update',
            object_type='course',
            object_id=course.id,
            object_title=course.title,
            owner=course.created_by,
            changes={'title': [old_title, course.title]}
        )

    def perform_destroy(self, instance):
        log_action(
            actor=self.request.user,
            action='delete',
            object_type='course',
            object_id=instance.id,
            object_title=instance.title,
            owner=instance.created_by,
            changes={'deleted': [instance.title, None]}
        )
        instance.delete()


# ── subjects ──────────────────────────────────────────────────────────────────

class SubjectListView(generics.ListCreateAPIView):
    queryset = Subject.objects.filter(is_active=True)
    serializer_class = SubjectSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]


class ModuleManageView(generics.CreateAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = ModuleWriteSerializer
    queryset = Module.objects.all()


class ModuleManageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsCourseOwnerOrAdmin]
    serializer_class = ModuleWriteSerializer
    queryset = Module.objects.all()
    lookup_field = 'id'


class LectureManageView(generics.CreateAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = LectureWriteSerializer
    queryset = Lecture.objects.all()


class LectureManageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsCourseOwnerOrAdmin]
    serializer_class = LectureWriteSerializer
    queryset = Lecture.objects.all()
    lookup_field = 'id'

from users.models import log_action, Notification
from django.utils import timezone
from django.contrib.auth.models import User


class CourseSubmitReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        course = generics.get_object_or_404(Course, id=id)
        is_admin = request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])
        if not is_admin and course.created_by != request.user:
            return Response({'error': 'You do not own this course.'}, status=status.HTTP_403_FORBIDDEN)

        # Check has at least 1 lecture
        lecture_count = Lecture.objects.filter(module__course=course).count()
        if lecture_count < 1:
            return Response({'error': 'Course must have at least 1 lecture before submitting for review.'}, status=status.HTTP_400_BAD_REQUEST)

        if course.review_status not in ['draft', 'rejected']:
            return Response({'error': f'Cannot submit review from status {course.review_status}.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = course.review_status
        course.review_status = 'pending'
        course.save()

        log_action(
            actor=request.user,
            action='submit_review',
            object_type='course',
            object_id=course.id,
            object_title=course.title,
            owner=course.created_by,
            changes={'review_status': [old_status, 'pending']}
        )

        return Response({'message': 'Course submitted for review.', 'review_status': course.review_status})


class CourseReviewDecisionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, id):
        course = generics.get_object_or_404(Course, id=id)
        decision = request.data.get('decision')
        note = request.data.get('note', '').strip()

        if decision not in ['approve', 'reject']:
            return Response({'error': 'decision must be approve or reject.'}, status=status.HTTP_400_BAD_REQUEST)

        if decision == 'reject' and not note:
            return Response({'error': 'A note is required when rejecting content.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = course.review_status
        old_published = course.is_published

        if decision == 'approve':
            course.review_status = 'approved'
            course.is_published = True
            course.reviewed_by = request.user
            course.reviewed_at = timezone.now()
            course.review_note = note
            course.save()

            if course.created_by:
                Notification.objects.create(
                    user=course.created_by,
                    title='Course Approved',
                    body=f'Your course "{course.title}" has been approved and is now live!',
                    link=f'/educator/courses/{course.id}/edit'
                )
        else:
            course.review_status = 'rejected'
            course.reviewed_by = request.user
            course.reviewed_at = timezone.now()
            course.review_note = note
            course.save()

            if course.created_by:
                Notification.objects.create(
                    user=course.created_by,
                    title='Course Rejected',
                    body=f'Your course "{course.title}" review was rejected: {note}',
                    link=f'/educator/courses/{course.id}/edit'
                )

        log_action(
            actor=request.user,
            action=decision,
            object_type='course',
            object_id=course.id,
            object_title=course.title,
            owner=course.created_by,
            changes={
                'review_status': [old_status, course.review_status],
                'is_published': [old_published, course.is_published],
                'note': ['', note]
            }
        )

        return Response({
            'message': f'Course review completed: {decision}.',
            'review_status': course.review_status,
            'is_published': course.is_published
        })


class CourseOwnershipTransferView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, id=None):
        to_user_id = request.data.get('to_user')
        if not to_user_id:
            return Response({'error': 'to_user is required.'}, status=status.HTTP_400_BAD_REQUEST)

        to_user = generics.get_object_or_404(User, id=to_user_id)

        course_ids = request.data.get('ids')
        if id:
            course_ids = [id]
        elif not course_ids:
            return Response({'error': 'Specify course id or ids list.'}, status=status.HTTP_400_BAD_REQUEST)

        courses = Course.objects.filter(id__in=course_ids)
        transferred_count = 0

        for course in courses:
            old_owner = course.created_by
            course.created_by = to_user
            course.save()
            transferred_count += 1

            # Log audit
            log_action(
                actor=request.user,
                action='transfer_ownership',
                object_type='course',
                object_id=course.id,
                object_title=course.title,
                owner=to_user,
                changes={'owner': [old_owner.email if old_owner else None, to_user.email]}
            )

            # Notify both
            if old_owner and old_owner != to_user:
                Notification.objects.create(
                    user=old_owner,
                    title='Course Ownership Transferred',
                    body=f'Ownership of "{course.title}" was transferred to {to_user.email} by administrator.',
                    link='/educator/courses'
                )
            Notification.objects.create(
                user=to_user,
                title='Course Ownership Assigned',
                body=f'You have been assigned ownership of course "{course.title}".',
                link=f'/educator/courses/{course.id}/edit'
            )

        return Response({'message': f'Successfully transferred {transferred_count} course(s) to {to_user.email}.'})

# ── Course Hierarchy & Catalogue Views (SIMS Raipur Dynamic Learning) ──────────

from django.db.models import Count, Q, Prefetch
from .models import CourseCategory, CourseTrack
from .serializers import (
    CourseCategorySerializer, CourseHierarchySerializer,
    CourseTrackSerializer, SubjectLearningDetailSerializer
)

def _annotated_subjects_qs():
    return Subject.objects.filter(is_active=True).annotate(
        annotated_modules_count=Count('modules', distinct=True),
        annotated_lectures_count=Count('modules__lessons', distinct=True),
        annotated_resources_count=Count(
            'study_resources',
            filter=Q(study_resources__is_published=True, study_resources__review_status='approved'),
            distinct=True
        ),
        annotated_tests_count=Count(
            'test_series',
            filter=Q(test_series__is_published=True, test_series__review_status='approved'),
            distinct=True
        ),
    ).order_by('order', 'name')

class CourseCategoryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CourseCategorySerializer
    queryset = CourseCategory.objects.filter(is_active=True).order_by('order', 'name')


class CourseCategoryDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CourseCategorySerializer
    lookup_field = 'slug'
    queryset = CourseCategory.objects.filter(is_active=True)


class CourseHierarchyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        course = get_object_or_404(
            Course.objects.filter(is_published=True).select_related('category_ref').prefetch_related(
                Prefetch(
                    'tracks',
                    queryset=CourseTrack.objects.filter(is_active=True).prefetch_related(
                        Prefetch('subjects', queryset=_annotated_subjects_qs())
                    ).order_by('order', 'name')
                ),
                Prefetch(
                    'subjects',
                    queryset=_annotated_subjects_qs().filter(track__isnull=True),
                    to_attr='prefetched_standalone_subjects'
                )
            ),
            slug=slug
        )
        serializer = CourseHierarchySerializer(course, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CourseTrackDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug, track_slug):
        course = get_object_or_404(Course, slug=slug, is_published=True)
        track = get_object_or_404(
            CourseTrack.objects.filter(course=course, is_active=True).prefetch_related(
                Prefetch('subjects', queryset=_annotated_subjects_qs())
            ),
            slug=track_slug
        )
        serializer = CourseTrackSerializer(track, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubjectLearningDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug, subject_slug):
        course = get_object_or_404(Course, slug=slug, is_published=True)
        subject = get_object_or_404(Subject, course=course, slug=subject_slug, is_active=True)
        serializer = SubjectLearningDetailSerializer(subject, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class RecommendedCoursesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        target_exam = request.query_params.get('target_exam', '').strip()
        education_level = request.query_params.get('education_level', '').strip()
        branch = request.query_params.get('branch', '').strip()

        # If authenticated student and params missing, pull from profile
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            prof = request.user.profile
            if not target_exam and prof.target_exam:
                target_exam = prof.target_exam
            if not education_level and prof.education_level:
                education_level = prof.education_level
            if not branch and prof.engineering_branch:
                branch = prof.engineering_branch

        qs = Course.objects.filter(is_published=True, review_status='approved')
        if target_exam:
            # Match target exam or course title
            exam_matched = qs.filter(models.Q(target_exam__icontains=target_exam) | models.Q(title__icontains=target_exam))
            if exam_matched.exists():
                serializer = CourseListSerializer(exam_matched[:6], many=True, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

        # Fallback to featured active approved courses (never unpublished)
        serializer = CourseListSerializer(qs.order_by('-id')[:6], many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class WeeklyTimetablePublicListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = WeeklyTimetable.objects.filter(is_published=True)

        # Allow returning all timetables if requested
        if request.query_params.get('all') in ['true', '1', 'True'] or request.query_params.get('format') == 'list':
            return Response(WeeklyTimetableSerializer(qs.order_by('-start_date'), many=True).data, status=status.HTTP_200_OK)

        branch = request.query_params.get('branch')
        course_param = request.query_params.get('course') or request.query_params.get('course_id')
        exam_param = request.query_params.get('exam') or request.query_params.get('target_exam')

        # If course provided, resolve course target_exam or title
        if course_param:
            course = Course.objects.filter(models.Q(slug=course_param) | models.Q(id=int(course_param) if course_param.isdigit() else 0)).first()
            if course:
                exam_param = exam_param or course.target_exam or course.title

        query_key = (branch or exam_param or '').strip().lower()

        matched = None
        if query_key:
            # 1. Exact or icontains
            matched = qs.filter(models.Q(branch__icontains=query_key) | models.Q(branch=query_key)).first()
            # 2. Branch abbreviations & synonyms
            if not matched:
                for wt in qs:
                    b_l = wt.branch.lower()
                    if any(t in query_key for t in ['chemical', 'ch']) and any(t in b_l for t in ['chemical', 'ch']):
                        matched = wt
                        break
                    if any(t in query_key for t in ['computer', 'cs', 'cse']) and any(t in b_l for t in ['computer', 'cs']):
                        matched = wt
                        break
                    if any(t in query_key for t in ['mechanical', 'me']) and any(t in b_l for t in ['mechanical', 'me']):
                        matched = wt
                        break
                    if any(t in query_key for t in ['civil', 'ce']) and any(t in b_l for t in ['civil', 'ce']):
                        matched = wt
                        break
                    if any(t in query_key for t in ['electrical', 'ee']) and any(t in b_l for t in ['electrical', 'ee']):
                        matched = wt
                        break
                    if 'csir' in query_key and 'csir' in b_l:
                        matched = wt
                        break

        if matched:
            return Response(WeeklyTimetableSerializer(matched).data, status=status.HTTP_200_OK)

        latest = qs.order_by('-start_date').first()
        if latest:
            return Response(WeeklyTimetableSerializer(latest).data, status=status.HTTP_200_OK)
        return Response({'detail': 'No timetable available currently.'}, status=status.HTTP_404_NOT_FOUND)


class BatchListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        branch = request.query_params.get('branch')
        qs = Batch.objects.filter(is_active=True)
        if branch:
            qs = qs.filter(branch__icontains=branch)
        serializer = BatchSerializer(qs.order_by('-created_at'), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DailyChallengeTodayView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.localdate()
        branch = request.query_params.get('branch')
        qs = DailyChallengeQuestion.objects.filter(is_active=True, for_date__lte=today)
        if branch:
            qs = qs.filter(branch__icontains=branch)
        question = qs.order_by('-for_date').first()
        if not question:
            return Response({'detail': 'No challenge question available today.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(DailyChallengeQuestionSerializer(question).data, status=status.HTTP_200_OK)

    def post(self, request):
        question_id = request.data.get('question_id')
        selected_option = str(request.data.get('selected_option', '')).strip().upper()
        if not question_id or not selected_option:
            return Response({'error': 'question_id and selected_option are required.'}, status=status.HTTP_400_BAD_REQUEST)

        question = get_object_or_404(DailyChallengeQuestion, id=question_id)
        is_correct = (question.correct_option.upper() == selected_option)
        return Response({
            'question_id': question.id,
            'selected_option': selected_option,
            'is_correct': is_correct,
            'correct_option': question.correct_option,
            'explanation': question.explanation,
            'marks_awarded': float(question.marks) if is_correct else 0.0
        }, status=status.HTTP_200_OK)


class DoubtQueryListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doubts = DoubtQuery.objects.filter(student=request.user).order_by('-created_at')
        serializer = DoubtQuerySerializer(doubts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        query_text = request.data.get('query_text', '').strip()
        if not query_text:
            return Response({'query_text': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        course_id = request.data.get('course')
        course = Course.objects.filter(id=course_id).first() if course_id else None
        subject = request.data.get('subject', '').strip()
        image = request.FILES.get('image')

        doubt = DoubtQuery.objects.create(
            student=request.user,
            course=course,
            subject=subject,
            query_text=query_text,
            image=image
        )
        return Response(DoubtQuerySerializer(doubt).data, status=status.HTTP_201_CREATED)
