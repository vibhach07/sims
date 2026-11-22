from rest_framework import serializers
from django.utils import timezone
from .models import LiveClass, Course, Module
from .live_utils import parse_and_validate_stream_url, validate_recording_url

class LiveClassPublicSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True, default=None)
    course_slug = serializers.CharField(source="course.slug", read_only=True, default=None)
    educator_name = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()
    embed_url = serializers.SerializerMethodField()
    join_url = serializers.SerializerMethodField()
    recording_url = serializers.SerializerMethodField()

    class Meta:
        model = LiveClass
        fields = [
            "id", "title", "description", "course", "course_title", "course_slug",
            "module", "educator_name", "scheduled_start", "scheduled_end",
            "provider", "status", "access", "is_locked", "embed_url",
            "join_url", "recording_url", "started_at", "ended_at"
        ]

    def get_educator_name(self, obj):
        if not obj.educator:
            return "SIMS Faculty"
        full_name = obj.educator.get_full_name().strip()
        if full_name:
            return full_name
        faculty = getattr(obj.educator, "faculty_profile", None)
        if faculty and faculty.name and faculty.name.strip():
            return faculty.name.strip()
        return "SIMS Faculty"

    def get_is_locked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return not obj.is_authorized(user)

    def get_embed_url(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not obj.is_authorized(user):
            return None
        # Available when live or ended with recording
        if obj.status == "live":
            return obj.get_embed_url()
        if obj.status == "ended" and obj.recording_url:
            if obj.provider in ["youtube", "vimeo"]:
                try:
                    _, embed, _ = parse_and_validate_stream_url(obj.recording_url, obj.provider)
                    return embed
                except Exception:
                    return None
            return None
        return None

    def get_join_url(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not obj.is_authorized(user):
            return None
        if obj.status == "live":
            return obj.get_join_url()
        if obj.status == "ended" and obj.recording_url:
            return obj.recording_url
        return None

    def get_recording_url(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not obj.is_authorized(user):
            return None
        return obj.recording_url if obj.status == "ended" else None


class LiveClassManageSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True, default=None)
    course_slug = serializers.CharField(source="course.slug", read_only=True, default=None)
    educator_name = serializers.SerializerMethodField()
    embed_url = serializers.SerializerMethodField()
    join_url = serializers.SerializerMethodField()

    class Meta:
        model = LiveClass
        fields = [
            "id", "title", "description", "course", "course_title", "course_slug",
            "module", "educator", "educator_name", "scheduled_start", "scheduled_end",
            "provider", "stream_url", "recording_url", "status", "access",
            "embed_url", "join_url", "started_at", "ended_at", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "educator", "status", "started_at", "ended_at", "created_at", "updated_at"]

    def get_educator_name(self, obj):
        if not obj.educator:
            return "SIMS Faculty"
        full_name = obj.educator.get_full_name().strip()
        if full_name:
            return full_name
        faculty = getattr(obj.educator, "faculty_profile", None)
        if faculty and faculty.name and faculty.name.strip():
            return faculty.name.strip()
        return "SIMS Faculty"

    def get_embed_url(self, obj):
        return obj.get_embed_url()

    def get_join_url(self, obj):
        return obj.get_join_url()

    def validate(self, attrs):
        # Ignore status in attrs if passed (read-only)
        attrs.pop("status", None)

        start = attrs.get("scheduled_start") or getattr(self.instance, "scheduled_start", None)
        end = attrs.get("scheduled_end") or getattr(self.instance, "scheduled_end", None)

        if start and end and end <= start:
            raise serializers.ValidationError({"scheduled_end": "End time must be after start time."})

        provider = attrs.get("provider") or getattr(self.instance, "provider", "youtube")
        stream_url = attrs.get("stream_url") or getattr(self.instance, "stream_url", None)

        if stream_url:
            clean_stream, _, _ = parse_and_validate_stream_url(stream_url, provider)
            attrs["stream_url"] = clean_stream

        recording_url = attrs.get("recording_url") or getattr(self.instance, "recording_url", None)
        if attrs.get("recording_url"):
            clean_rec = validate_recording_url(attrs["recording_url"], provider)
            attrs["recording_url"] = clean_rec

        # Check course and module ownership
        request = self.context.get("request")
        user = getattr(request, "user", None)
        is_admin = user and (user.is_staff or getattr(user, "profile", None) and user.profile.role in ["admin", "superadmin"])

        course = attrs.get("course") if "course" in attrs else getattr(self.instance, "course", None)
        module = attrs.get("module") if "module" in attrs else getattr(self.instance, "module", None)

        if module and course and module.course_id != course.id:
            raise serializers.ValidationError({"module": "Module does not belong to the selected course."})

        if module and not course:
            course = module.course
            attrs["course"] = course

        if not is_admin:
            if course and course.created_by_id != user.id:
                raise serializers.ValidationError({"course": "You can only schedule live classes for courses you created."})
            if module and module.course.created_by_id != user.id:
                raise serializers.ValidationError({"module": "You do not own the course for this module."})

        return attrs
