from rest_framework import serializers
from .models import (
    Course, Module, Lecture, UserEnrollment, UserLectureProgress,
    Subject, CourseCategory, CourseTrack, Batch, WeeklyTimetable,
    DailyChallengeQuestion, DoubtQuery
)


class LectureProgressSerializer(serializers.ModelSerializer):
    lecture_id = serializers.ReadOnlyField(source='lecture.id')

    class Meta:
        model = UserLectureProgress
        fields = ['lecture_id', 'is_completed', 'last_position_seconds', 'updated_at']


class LectureSerializer(serializers.ModelSerializer):
    is_locked = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    embed_url = serializers.SerializerMethodField()
    video_type = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    last_position_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Lecture
        fields = [
            'id', 'title', 'duration', 'video_url', 'embed_url', 'video_type', 'summary',
            'order', 'is_free_preview', 'instructor_name',
            'is_locked', 'is_completed', 'last_position_seconds',
        ]

    def _is_enrolled(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        # Check context enrollment map/set/bool first to avoid N+1
        enrolled_course_ids = self.context.get('enrolled_course_ids')
        if enrolled_course_ids is not None:
            return obj.module.course_id in enrolled_course_ids
        is_enrolled = self.context.get('is_enrolled')
        if is_enrolled is not None:
            return bool(is_enrolled)
        return UserEnrollment.objects.filter(
            user=request.user, course=obj.module.course, is_active=True
        ).exists()

    def get_is_locked(self, obj):
        course = obj.module.course
        if not course.is_paid or obj.is_free_preview:
            return False
        return not self._is_enrolled(obj)

    def get_video_url(self, obj):
        """Never return a private video_url to a locked lecture."""
        if self.get_is_locked(obj):
            return None
        request = self.context.get('request')
        if obj.video_file:
            return request.build_absolute_uri(obj.video_file.url) if request else obj.video_file.url
        return obj.video_url or None

    def get_embed_url(self, obj):
        if self.get_is_locked(obj):
            return None
        request = self.context.get('request')
        if obj.video_file:
            return request.build_absolute_uri(obj.video_file.url) if request else obj.video_file.url
        return obj.get_embed_url() or None

    def get_video_type(self, obj):
        return obj.get_video_type()

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # Use pre-fetched progress_map from context when available (avoids N+1)
        progress_map = self.context.get('progress_map')
        if progress_map is not None:
            p = progress_map.get(obj.id)
            return p['is_completed'] if p else False
        prog = UserLectureProgress.objects.filter(user=request.user, lecture=obj).first()
        return prog.is_completed if prog else False

    def get_last_position_seconds(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        # Use pre-fetched progress_map from context when available (avoids N+1)
        progress_map = self.context.get('progress_map')
        if progress_map is not None:
            p = progress_map.get(obj.id)
            return p['last_position_seconds'] if p else 0
        prog = UserLectureProgress.objects.filter(user=request.user, lecture=obj).first()
        return prog.last_position_seconds if prog else 0


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LectureSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order', 'lessons']


class CourseDetailSerializer(serializers.ModelSerializer):
    curriculum = ModuleSerializer(many=True, read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    weekly_schedule = serializers.SerializerMethodField()
    review_status = serializers.CharField(read_only=True)
    review_note = serializers.CharField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True)

    def validate(self, attrs):
        request = self.context.get('request')
        is_admin = request and (request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin']))
        if not is_admin:
            # Strip or reject changes to admin-only pricing/publish fields
            for forbidden_field in ['price', 'original_price', 'is_paid', 'fee_status', 'is_published']:
                if forbidden_field in attrs:
                    if self.instance is not None:
                        raise serializers.ValidationError({forbidden_field: f'Only administrators can modify {forbidden_field}.'})
                    else:
                        # Creation: cannot set custom price or publish
                        if forbidden_field == 'is_published' and attrs[forbidden_field] is True:
                            raise serializers.ValidationError({'is_published': 'Educators cannot directly publish courses.'})
                        if forbidden_field in ['price', 'original_price'] and attrs[forbidden_field] not in [None, 0, '0', '0.00']:
                            raise serializers.ValidationError({forbidden_field: f'Only administrators can set {forbidden_field}.'})
                        if forbidden_field == 'is_paid' and attrs[forbidden_field] is True:
                            raise serializers.ValidationError({'is_paid': 'Educators cannot set courses as paid.'})
                        if forbidden_field == 'fee_status' and attrs.get('fee_status') not in [None, '']:
                            raise serializers.ValidationError({'fee_status': 'Only administrators can set fee_status.'})
        return super().validate(attrs)

    class Meta:
        model = Course
        fields = [
            'id', 'slug', 'title', 'subtitle', 'category', 'category_label',
            'target_exam', 'badge', 'duration', 'format', 'language', 'fee_status',
            'price', 'original_price', 'is_paid', 'short_description', 'long_description',
            'is_published', 'review_status', 'review_note', 'reviewed_at', 'curriculum', 'is_enrolled', 'is_owner',
            'weekly_schedule',
        ]

    def get_weekly_schedule(self, obj):
        from .models import WeeklyTimetable
        qs = WeeklyTimetable.objects.filter(is_published=True)
        # Match target_exam or title
        target = (obj.target_exam or '').lower()
        title = (obj.title or '').lower()
        matched = None
        for wt in qs:
            b_lower = wt.branch.lower()
            if any(term in b_lower for term in ['chemical', 'ch']) and any(term in target or term in title for term in ['chemical', 'ch']):
                matched = wt
                break
            if any(term in b_lower for term in ['computer', 'cs']) and any(term in target or term in title for term in ['computer', 'cs', 'cse']):
                matched = wt
                break
            if any(term in b_lower for term in ['mechanical', 'me']) and any(term in target or term in title for term in ['mechanical', 'me']):
                matched = wt
                break
            if any(term in b_lower for term in ['civil', 'ce']) and any(term in target or term in title for term in ['civil', 'ce']):
                matched = wt
                break
            if any(term in b_lower for term in ['electrical', 'ee']) and any(term in target or term in title for term in ['electrical', 'ee']):
                matched = wt
                break
            if 'csir' in b_lower and ('csir' in target or 'csir' in title or 'net' in target):
                matched = wt
                break
        if not matched:
            matched = qs.order_by('-start_date').first()
        if matched:
            return WeeklyTimetableSerializer(matched).data
        return None

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        enrolled_course_ids = self.context.get('enrolled_course_ids')
        if enrolled_course_ids is not None:
            return obj.id in enrolled_course_ids
        is_enrolled = self.context.get('is_enrolled')
        if is_enrolled is not None:
            return bool(is_enrolled)
        return UserEnrollment.objects.filter(
            user=request.user, course=obj, is_active=True
        ).exists()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        return obj.created_by_id == request.user.id


class CourseListSerializer(serializers.ModelSerializer):
    is_enrolled = serializers.SerializerMethodField()
    lecture_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'slug', 'title', 'subtitle', 'category', 'category_label',
            'target_exam', 'badge', 'duration', 'format', 'language', 'fee_status',
            'price', 'original_price', 'is_paid', 'short_description',
            'is_published', 'review_status', 'review_note', 'is_enrolled', 'lecture_count', 'is_owner',
        ]
        read_only_fields = ['is_published', 'is_owner']

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return UserEnrollment.objects.filter(
            user=request.user, course=obj, is_active=True
        ).exists()

    def get_lecture_count(self, obj):
        return Lecture.objects.filter(module__course=obj).count()

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        return obj.created_by_id == request.user.id


class SubjectSerializer(serializers.ModelSerializer):
    courseTitle = serializers.ReadOnlyField(source='course.title')

    class Meta:
        model = Subject
        fields = ['id', 'name', 'slug', 'description', 'course', 'courseTitle', 'order', 'is_active']

class ModuleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'course', 'title', 'description', 'order']

    def validate_course(self, course):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return course
        if request.user.is_staff or request.user.is_superuser:
            return course
        if course.created_by is None or course.created_by != request.user:
            raise serializers.ValidationError('You do not own this course.')
        return course


class LectureWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lecture
        fields = [
            'id', 'module', 'title', 'duration', 'video_url',
            'summary', 'order', 'is_free_preview', 'instructor_name',
        ]

    def validate_module(self, module):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return module
        if request.user.is_staff or request.user.is_superuser:
            return module
        course = module.course
        if course.created_by is None or course.created_by != request.user:
            raise serializers.ValidationError('You do not own the course for this module.')
        return module

    def validate_video_url(self, value):
        val = (value or '').strip()
        if not val:
            return ''
        if not val.startswith('https://'):
            raise serializers.ValidationError('video_url must use https://')
        return val

# ── Course Hierarchy & Catalogue Serializers (SIMS Raipur Dynamic Learning) ──

class CourseCategorySerializer(serializers.ModelSerializer):
    courses_count = serializers.SerializerMethodField()
    exams = serializers.SerializerMethodField()
    courses = serializers.SerializerMethodField()

    class Meta:
        model = CourseCategory
        fields = ['id', 'name', 'slug', 'description', 'icon_name', 'order', 'is_active', 'courses_count', 'exams', 'courses']

    def get_courses_count(self, obj):
        return obj.courses.filter(is_published=True).count()

    def get_exams(self, obj):
        return list(
            obj.courses.filter(is_published=True)
            .exclude(target_exam='')
            .values_list('target_exam', flat=True)
            .distinct()
        )

    def get_courses(self, obj):
        qs = obj.courses.filter(is_published=True).order_by('id')[:10]
        return [
            {
                'id': c.id,
                'title': c.title,
                'slug': c.slug,
                'target_exam': c.target_exam,
                'badge': c.badge,
                'price': float(c.price or 0.0),
                'is_paid': c.is_paid
            }
            for c in qs
        ]


class SubjectHierarchySerializer(serializers.ModelSerializer):
    modules_count = serializers.SerializerMethodField()
    lectures_count = serializers.SerializerMethodField()
    resources_count = serializers.SerializerMethodField()
    test_series_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'slug', 'description', 'order', 'is_active',
            'modules_count', 'lectures_count', 'resources_count', 'test_series_count'
        ]

    def get_modules_count(self, obj):
        if hasattr(obj, 'annotated_modules_count'):
            return obj.annotated_modules_count
        return obj.modules.count()

    def get_lectures_count(self, obj):
        if hasattr(obj, 'annotated_lectures_count'):
            return obj.annotated_lectures_count
        return Lecture.objects.filter(module__subject=obj).count()

    def get_resources_count(self, obj):
        if hasattr(obj, 'annotated_resources_count'):
            return obj.annotated_resources_count
        return obj.study_resources.filter(is_published=True, review_status='approved').count() if hasattr(obj, 'study_resources') else 0

    def get_test_series_count(self, obj):
        if hasattr(obj, 'annotated_tests_count'):
            return obj.annotated_tests_count
        return obj.test_series.filter(is_published=True, review_status='approved').count() if hasattr(obj, 'test_series') else 0


class CourseTrackSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField()

    class Meta:
        model = CourseTrack
        fields = ['id', 'name', 'code', 'slug', 'description', 'eligibility', 'order', 'is_active', 'subjects']

    def get_subjects(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'subjects' in obj._prefetched_objects_cache:
            qs = [s for s in obj.subjects.all() if s.is_active]
        else:
            qs = obj.subjects.filter(is_active=True).order_by('order', 'name')
        return SubjectHierarchySerializer(qs, many=True).data


class CourseHierarchySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category_ref.name', read_only=True, default='')
    tracks = serializers.SerializerMethodField()
    standalone_subjects = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'slug', 'title', 'subtitle', 'category', 'category_ref', 'category_name',
            'category_label', 'target_exam', 'badge', 'duration', 'format', 'language',
            'fee_status', 'price', 'original_price', 'is_paid', 'short_description',
            'long_description', 'eligibility', 'exam_overview', 'is_published',
            'tracks', 'standalone_subjects'
        ]

    def get_tracks(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'tracks' in obj._prefetched_objects_cache:
            qs = [t for t in obj.tracks.all() if t.is_active]
        else:
            qs = obj.tracks.filter(is_active=True).order_by('order', 'name')
        return CourseTrackSerializer(qs, many=True).data

    def get_standalone_subjects(self, obj):
        if hasattr(obj, 'prefetched_standalone_subjects'):
            qs = obj.prefetched_standalone_subjects
        else:
            qs = obj.subjects.filter(track__isnull=True, is_active=True).order_by('order', 'name')
        return SubjectHierarchySerializer(qs, many=True).data


class SubjectLearningDetailSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)
    track = CourseTrackSerializer(read_only=True)
    modules = ModuleSerializer(many=True, read_only=True)
    study_resources = serializers.SerializerMethodField()
    test_series = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'slug', 'description', 'order', 'is_active',
            'course', 'track', 'modules', 'study_resources', 'test_series'
        ]

    def get_study_resources(self, obj):
        from resources.serializers import StudyResourceSerializer
        request = self.context.get('request')
        qs = obj.study_resources.filter(is_published=True, review_status='approved').order_by('-created_at')[:10]
        return StudyResourceSerializer(qs, many=True, context={'request': request}).data

    def get_test_series(self, obj):
        from assessments.serializers import TestSeriesListSerializer
        request = self.context.get('request')
        qs = obj.test_series.filter(is_published=True, review_status='approved').order_by('-created_at')[:10]
        return TestSeriesListSerializer(qs, many=True, context={'request': request}).data


class WeeklyTimetableSerializer(serializers.ModelSerializer):
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    weekNumber = serializers.IntegerField(source='week_number')
    matrixData = serializers.JSONField(source='matrix_data')
    isPublished = serializers.BooleanField(source='is_published')
    schedule = serializers.JSONField(source='matrix_data', read_only=True)
    # Slot metadata for frontend rendering (never null — always the canonical 3 slots)
    slotDefinitions = serializers.SerializerMethodField()

    SLOT_DEFS = [
        {'key': 'morning',   'displayName': 'Morning Core',      'timeRange': '07:30 AM – 10:30 AM'},
        {'key': 'afternoon', 'displayName': 'Core Track',         'timeRange': '11:00 AM – 02:00 PM'},
        {'key': 'evening',   'displayName': 'Special / CBT Test', 'timeRange': '03:00 PM – 06:00 PM'},
    ]

    def get_slotDefinitions(self, obj):
        return self.SLOT_DEFS

    class Meta:
        model = WeeklyTimetable
        fields = [
            'id', 'branch',
            'start_date', 'end_date', 'week_number', 'matrix_data', 'is_published',
            'startDate', 'endDate', 'weekNumber', 'matrixData', 'isPublished', 'schedule',
            'slotDefinitions',
            'created_at', 'updated_at'
        ]


class BatchSerializer(serializers.ModelSerializer):
    courseTitle = serializers.CharField(source='course.title', read_only=True, allow_null=True)
    startDate = serializers.DateField(source='start_date', allow_null=True)
    endDate = serializers.DateField(source='end_date', allow_null=True)
    maxStudents = serializers.IntegerField(source='max_students')
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = Batch
        fields = ['id', 'name', 'code', 'branch', 'course', 'courseTitle', 'startDate', 'endDate', 'maxStudents', 'isActive', 'created_at']


class DailyChallengeQuestionSerializer(serializers.ModelSerializer):
    forDate = serializers.DateField(source='for_date')
    questionText = serializers.CharField(source='question_text')
    options = serializers.SerializerMethodField()

    class Meta:
        model = DailyChallengeQuestion
        fields = ['id', 'title', 'branch', 'subject', 'questionText', 'options', 'marks', 'forDate']

    def get_options(self, obj):
        return {
            'A': obj.option_a,
            'B': obj.option_b,
            'C': obj.option_c,
            'D': obj.option_d,
        }


class DoubtQuerySerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source='student.get_full_name', read_only=True)
    courseTitle = serializers.CharField(source='course.title', read_only=True, allow_null=True)
    queryText = serializers.CharField(source='query_text')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = DoubtQuery
        fields = ['id', 'student', 'studentName', 'course', 'courseTitle', 'subject', 'queryText', 'image', 'status', 'reply', 'createdAt', 'updatedAt']
        read_only_fields = ['student', 'status', 'reply', 'createdAt', 'updatedAt']
