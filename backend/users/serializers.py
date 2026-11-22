from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import UserProfile, FacultyProfile, Enquiry, EducatorApplication

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'phone', 'target_exam', 'avatar', 'is_email_verified']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'profile', 'role']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'superadmin'
        profile = getattr(obj, 'profile', None)
        if profile and profile.role:
            return profile.role
        if obj.is_staff:
            return 'admin'
        return 'student'

class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, attrs):
        name = attrs.get('name', '').strip()
        first_name = attrs.get('first_name', '').strip()
        last_name = attrs.get('last_name', '').strip()

        if not name and not first_name:
            raise serializers.ValidationError({"name": "Name or first_name is required."})

        # Synchronize first_name, last_name, and name
        if first_name and not name:
            attrs['name'] = f"{first_name} {last_name}".strip() if last_name else first_name
        elif name and not first_name:
            parts = name.split(maxsplit=1)
            attrs['first_name'] = parts[0]
            if len(parts) > 1 and not last_name:
                attrs['last_name'] = parts[1]

        return attrs

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("User with this email already exists.")
        return normalized

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        first_name = validated_data.get('first_name', '').strip()
        last_name = validated_data.get('last_name', '').strip()
        name = validated_data.get('name', '').strip()
        phone = validated_data.get('phone', '').strip()
        target_exam = validated_data.get('target_exam', '').strip() or 'GATE Aspirant'

        # If explicit first_name was submitted, preserve first_name and last_name separately.
        # Otherwise, if only 'name' was submitted, store full name in first_name.
        raw_first_name = self.initial_data.get('first_name')
        if raw_first_name:
            user_first_name = first_name
            user_last_name = last_name
        else:
            user_first_name = name or first_name
            user_last_name = last_name

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=user_first_name,
            last_name=user_last_name
        )
        UserProfile.objects.create(
            user=user,
            role='student',
            phone=phone,
            target_exam=target_exam
        )
        return user

from django.utils.text import slugify
from .image_utils import validate_and_process_image

class FacultyProfileSerializer(serializers.ModelSerializer):
    coursesTaught = serializers.JSONField(source='courses_taught', required=False, default=list)
    displayOrder = serializers.IntegerField(source='display_order', read_only=True)
    emailPublic = serializers.EmailField(source='email_public', read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'slug', 'name', 'role', 'specialization',
            'qualification', 'experience', 'bio', 'image',
            'coursesTaught', 'displayOrder', 'emailPublic'
        ]
        read_only_fields = ['id', 'displayOrder', 'emailPublic']

    def get_image(self, obj):
        request = self.context.get('request')
        return obj.get_image_url(request)

    def validate_courses_taught(self, value):
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except Exception:
                pass
        if not isinstance(value, list):
            raise serializers.ValidationError("coursesTaught must be a list of slugs.")
        if value:
            from courses.models import Course
            if Course.objects.exists():
                existing = set(Course.objects.values_list('slug', flat=True))
                invalid = [s for s in value if s not in existing]
                if invalid:
                    raise serializers.ValidationError(f"Invalid course slug(s): {', '.join(invalid)}")
        return value

    def validate(self, attrs):
        photo = attrs.get('photo')
        image = attrs.get('image')
        if photo and image:
            raise serializers.ValidationError("Provide either a photo file or an image URL, not both.")
        if image and not image.startswith("https://"):
            raise serializers.ValidationError({"image": "Image URL must use https:// protocol."})
        if photo:
            attrs['photo'] = validate_and_process_image(photo)
            attrs['image'] = ""
        elif image:
            attrs['photo'] = None
        return attrs

    def create(self, validated_data):
        if not validated_data.get('slug'):
            name = validated_data.get('name', 'faculty')
            base_slug = slugify(name) or 'faculty'
            slug = base_slug
            counter = 1
            while FacultyProfile.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)


class AdminFacultyProfileSerializer(serializers.ModelSerializer):
    coursesTaught = serializers.JSONField(source='courses_taught', required=False, default=list)
    displayOrder = serializers.IntegerField(source='display_order', required=False, default=0)
    emailPublic = serializers.EmailField(source='email_public', required=False, allow_blank=True, allow_null=True)
    isActive = serializers.BooleanField(source='is_active', required=False, default=True)
    slug = serializers.SlugField(required=False, allow_blank=True)
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    resolvedImage = serializers.SerializerMethodField(read_only=True)
    account = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'slug', 'name', 'role', 'specialization',
            'qualification', 'experience', 'bio', 'image', 'photo',
            'resolvedImage', 'coursesTaught', 'displayOrder',
            'emailPublic', 'isActive', 'account', 'created_at'
        ]
        read_only_fields = ['id', 'resolvedImage', 'account', 'created_at']

    def get_resolvedImage(self, obj):
        request = self.context.get('request')
        return obj.get_image_url(request)

    def get_account(self, obj):
        if not obj.user:
            return None
        profile = getattr(obj.user, 'profile', None)
        status = 'active' if obj.user.is_active else 'suspended'
        return {
            'userId': obj.user.id,
            'email': obj.user.email,
            'role': profile.role if profile else 'educator',
            'status': status
        }

    def validate_courses_taught(self, value):
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except Exception:
                pass
        if not isinstance(value, list):
            raise serializers.ValidationError("coursesTaught must be a list of slugs.")
        if value:
            from courses.models import Course
            if Course.objects.exists():
                existing = set(Course.objects.values_list('slug', flat=True))
                invalid = [s for s in value if s not in existing]
                if invalid:
                    raise serializers.ValidationError(f"Invalid course slug(s): {', '.join(invalid)}")
        return value

    def validate(self, attrs):
        photo = attrs.get('photo')
        image = attrs.get('image')
        if photo and image:
            raise serializers.ValidationError("Provide either a photo file or an image URL, not both.")
        if image and not image.startswith("https://"):
            raise serializers.ValidationError({"image": "Image URL must use https:// protocol."})
        if photo:
            attrs['photo'] = validate_and_process_image(photo)
            attrs['image'] = ""
        elif image is not None and image != "":
            attrs['photo'] = None
        return attrs

    def create(self, validated_data):
        if not validated_data.get('slug'):
            name = validated_data.get('name', 'faculty')
            base_slug = slugify(name) or 'faculty'
            slug = base_slug
            counter = 1
            while FacultyProfile.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)


class EducatorFacultyProfileSerializer(serializers.ModelSerializer):
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    photo = serializers.ImageField(required=False, allow_null=True)
    resolvedImage = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'name', 'bio', 'qualification', 'experience',
            'specialization', 'image', 'photo', 'resolvedImage'
        ]
        read_only_fields = ['id', 'resolvedImage']

    def get_resolvedImage(self, obj):
        request = self.context.get('request')
        return obj.get_image_url(request)

    def validate(self, attrs):
        photo = attrs.get('photo')
        image = attrs.get('image')
        if photo and image:
            raise serializers.ValidationError("Provide either a photo file or an image URL, not both.")
        if image and not image.startswith("https://"):
            raise serializers.ValidationError({"image": "Image URL must use https:// protocol."})
        if photo:
            attrs['photo'] = validate_and_process_image(photo)
            attrs['image'] = ""
        elif image is not None and image != "":
            attrs['photo'] = None
        return attrs

class EnquirySerializer(serializers.ModelSerializer):
    courseInterested = serializers.CharField(source='course_interested')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    date = serializers.SerializerMethodField()

    class Meta:
        model = Enquiry
        fields = ['id', 'name', 'email', 'phone', 'courseInterested', 'message', 'status', 'createdAt', 'date']
        read_only_fields = ['id', 'status', 'createdAt', 'date']

    def get_date(self, obj):
        return obj.created_at.strftime('%Y-%m-%d')

class EnquiryAdminSerializer(serializers.ModelSerializer):
    courseInterested = serializers.CharField(source='course_interested')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    date = serializers.SerializerMethodField()

    class Meta:
        model = Enquiry
        fields = ['id', 'name', 'email', 'phone', 'courseInterested', 'message', 'status', 'createdAt', 'date']

    def get_date(self, obj):
        return obj.created_at.strftime('%Y-%m-%d')


class EducatorApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducatorApplication
        fields = [
            'id', 'name', 'email', 'phone', 'subjects', 'qualification',
            'experience', 'bio', 'demo_link', 'resume_link', 'status',
            'admin_note', 'reviewed_by', 'reviewed_at', 'created_user', 'created_at'
        ]
        read_only_fields = ['status', 'admin_note', 'reviewed_by', 'reviewed_at', 'created_user', 'created_at']

    def validate_demo_link(self, value):
        val = (value or '').strip()
        if not val.startswith('https://'):
            raise serializers.ValidationError('demo_link must use https://')
        return val

    def validate_resume_link(self, value):
        val = (value or '').strip()
        if val and not val.startswith('https://'):
            raise serializers.ValidationError('resume_link must use https://')
        return val


class EducatorApplicationPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducatorApplication
        fields = [
            'name', 'email', 'phone', 'subjects', 'qualification',
            'experience', 'bio', 'demo_link', 'resume_link'
        ]

    def validate_demo_link(self, value):
        val = (value or '').strip()
        if not val.startswith('https://'):
            raise serializers.ValidationError('demo_link must use https://')
        return val

    def validate_resume_link(self, value):
        val = (value or '').strip()
        if val and not val.startswith('https://'):
            raise serializers.ValidationError('resume_link must use https://')
        return val


from .models import AuditLog, Notification

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor', 'actor_name', 'actor_role', 'action',
            'object_type', 'object_id', 'object_title', 'owner', 'owner_name',
            'changes', 'created_at'
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return 'System'

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'body', 'link', 'is_read', 'created_at']

class StudentPreferencesSerializer(serializers.ModelSerializer):
    education_level = serializers.CharField(max_length=100, required=False, allow_blank=True)
    degree = serializers.CharField(max_length=100, required=False, allow_blank=True)
    engineering_branch = serializers.CharField(max_length=100, required=False, allow_blank=True)
    target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)
    target_paper = serializers.CharField(max_length=100, required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = [
            'education_level', 'degree', 'engineering_branch',
            'target_exam', 'target_paper', 'preferred_subjects'
        ]

    def validate_preferred_subjects(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("preferred_subjects must be a list of strings.")
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError("Each item in preferred_subjects must be a string.")
            if len(item) > 150:
                raise serializers.ValidationError("Subject names cannot exceed 150 characters.")
        if len(value) > 50:
            raise serializers.ValidationError("Cannot select more than 50 preferred subjects.")
        return value
