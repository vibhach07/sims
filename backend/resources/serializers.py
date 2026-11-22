from rest_framework import serializers
from .models import StudyResource, UserResourceEntitlement

class StudyResourceSerializer(serializers.ModelSerializer):
    is_entitled = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    review_status = serializers.CharField(read_only=True)
    review_note = serializers.CharField(read_only=True)
    created_by_email = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    subject_title = serializers.SerializerMethodField()

    class Meta:
        model = StudyResource
        fields = [
            'id', 'slug', 'title', 'course', 'course_title', 'subject', 'subject_title',
            'exam', 'category', 'resource_type',
            'file', 'file_format', 'pages', 'downloads_count', 'description',
            'file_url', 'is_published', 'review_status', 'review_note',
            'price', 'original_price', 'is_paid', 'is_entitled', 'download_url',
            'created_by_email'
        ]

    def get_course_title(self, obj):
        return obj.course.title if obj.course else None

    def get_subject_title(self, obj):
        return obj.subject.name if obj.subject else None

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None

    def validate(self, attrs):
        request = self.context.get('request')
        is_admin = request and (request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin']))
        if not is_admin:
            for forbidden_field in ['price', 'original_price', 'is_paid', 'is_published']:
                if forbidden_field in attrs:
                    if self.instance is not None:
                        if getattr(self.instance, forbidden_field) != attrs[forbidden_field]:
                            raise serializers.ValidationError({forbidden_field: f'Only administrators can modify {forbidden_field}.'})
                    else:
                        if forbidden_field == 'is_published' and attrs[forbidden_field] is True:
                            raise serializers.ValidationError({'is_published': 'Educators cannot directly publish resources.'})
                        if forbidden_field in ['price', 'original_price'] and attrs[forbidden_field] not in [None, 0, '0', '0.00']:
                            raise serializers.ValidationError({forbidden_field: f'Only administrators can set {forbidden_field}.'})
                        if forbidden_field == 'is_paid' and attrs[forbidden_field] is True:
                            raise serializers.ValidationError({'is_paid': 'Educators cannot mark resources as paid.'})
        return super().validate(attrs)

    def get_is_entitled(self, obj):
        request = self.context.get('request')
        if not obj.is_paid:
            return True
        if not request or not request.user.is_authenticated:
            return False
        return UserResourceEntitlement.objects.filter(user=request.user, resource=obj).exists()

    def get_download_url(self, obj):
        if not self.get_is_entitled(obj):
            return None
        return obj.file_url

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if not self.get_is_entitled(instance):
            ret['file_url'] = None
            ret['download_url'] = None
            ret['file'] = None
        return ret
