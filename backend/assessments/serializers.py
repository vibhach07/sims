from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers
from .models import (
    TestSeries, TestQuestion, UserTestAccess,
    UserTestAttempt, UserTestAnswer, AttemptStatus
)


class TestQuestionStudentSerializer(serializers.ModelSerializer):
    """
    Student-safe serializer:
    Never leaks correct_option, correct_answer, or explanation.
    Includes bilingual fields, resolved marks/negativeMarks, and optionsEn/optionsHi.
    """
    number = serializers.IntegerField(source='question_number')
    questionEn = serializers.SerializerMethodField()
    questionHi = serializers.SerializerMethodField()
    options = serializers.JSONField(source='options_json')  # legacy array preserved
    optionsEn = serializers.SerializerMethodField()
    optionsHi = serializers.SerializerMethodField()
    marks = serializers.SerializerMethodField()
    negativeMarks = serializers.SerializerMethodField()
    imageUrl = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = TestQuestion
        fields = [
            'id', 'number', 'subject', 'question', 'questionEn', 'questionHi',
            'options', 'optionsEn', 'optionsHi', 'marks', 'negativeMarks', 'imageUrl', 'images', 'order'
        ]

    def get_questionEn(self, obj):
        import re
        txt = obj.question_en or obj.question or ''
        request = self.context.get('request')
        if hasattr(obj, 'images'):
            images_map = {str(img.public_id): (request.build_absolute_uri(img.image.url) if request else img.image.url) for img in obj.images.all()}
            for pid, url in images_map.items():
                txt = re.sub(r'\[\[IMG:' + re.escape(pid) + r'\]\]', f'![Figure]({url})', txt, flags=re.I)
        txt = re.sub(r'\[image:\s*[^\]]+\]', '', txt, flags=re.I)
        return txt

    def get_questionHi(self, obj):
        import re
        txt = obj.question_hi
        if not txt:
            return None
        request = self.context.get('request')
        if hasattr(obj, 'images'):
            images_map = {str(img.public_id): (request.build_absolute_uri(img.image.url) if request else img.image.url) for img in obj.images.all()}
            for pid, url in images_map.items():
                txt = re.sub(r'\[\[IMG:' + re.escape(pid) + r'\]\]', f'![Figure]({url})', txt, flags=re.I)
        txt = re.sub(r'\[image:\s*[^\]]+\]', '', txt, flags=re.I)
        return txt

    def get_images(self, obj):
        import re
        request = self.context.get('request')
        exp_text = f"{obj.explanation_en or ''} {obj.explanation_hi or ''} {obj.explanation or ''}"
        exp_uuids = set(re.findall(r'\[\[IMG:([a-f0-9\-]+)\]\]', exp_text, re.I))

        stem_opt_text = f"{obj.question_en or ''} {obj.question_hi or ''} {obj.option_a_en or ''} {obj.option_b_en or ''} {obj.option_c_en or ''} {obj.option_d_en or ''}"
        stem_uuids = set(re.findall(r'\[\[IMG:([a-f0-9\-]+)\]\]', stem_opt_text, re.I))

        images_qs = obj.images.all() if hasattr(obj, 'images') else []
        out = {}
        for img in images_qs:
            pid = str(img.public_id)
            if pid in exp_uuids and pid not in stem_uuids:
                continue
            out[pid] = {
                'url': request.build_absolute_uri(img.image.url) if request else img.image.url,
                'width': img.width,
                'height': img.height,
                'alt': img.alt_text or img.source_name,
            }
        return out

    def get_imageUrl(self, obj):
        import re
        request = self.context.get('request')
        txt = obj.question_en or obj.question or ''
        m = re.search(r'!\[.*?\]\(([^\)]+)\)', txt)
        if m:
            url = m.group(1).strip()
            if request and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        m_img = re.search(r'\[\[IMG:([a-f0-9\-]+)\]\]', txt, re.I)
        if m_img and hasattr(obj, 'images'):
            img = obj.images.filter(public_id=m_img.group(1)).first()
            if img and img.image:
                return request.build_absolute_uri(img.image.url) if request else img.image.url
        if hasattr(obj, 'images'):
            img = obj.images.first()
            if img and img.image:
                return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None

    def get_optionsEn(self, obj):
        return {
            'A': obj.option_a_en or '',
            'B': obj.option_b_en or '',
            'C': obj.option_c_en or '',
            'D': obj.option_d_en or '',
        }

    def get_optionsHi(self, obj):
        if not any([obj.option_a_hi, obj.option_b_hi, obj.option_c_hi, obj.option_d_hi]):
            return None
        return {
            'A': obj.option_a_hi or '',
            'B': obj.option_b_hi or '',
            'C': obj.option_c_hi or '',
            'D': obj.option_d_hi or '',
        }

    def get_marks(self, obj):
        if obj.marks is not None:
            return float(obj.marks)
        if obj.test_series and obj.test_series.default_marks is not None:
            return float(obj.test_series.default_marks)
        return 4.0

    def get_negativeMarks(self, obj):
        if obj.negative_marks is not None:
            return float(obj.negative_marks)
        if obj.test_series and obj.test_series.default_negative_marks is not None:
            return float(obj.test_series.default_negative_marks)
        return 1.0


class TestQuestionReviewSerializer(serializers.ModelSerializer):
    options = serializers.JSONField(source='options_json')
    correctAnswer = serializers.IntegerField(source='correct_answer')
    correctOption = serializers.CharField(source='correct_option')
    questionEn = serializers.CharField(source='question_en')
    questionHi = serializers.CharField(source='question_hi', allow_null=True)
    explanationEn = serializers.CharField(source='explanation_en')
    explanationHi = serializers.CharField(source='explanation_hi', allow_null=True)
    imageUrl = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = TestQuestion
        fields = [
            'id', 'subject', 'question', 'questionEn', 'questionHi',
            'options', 'correctAnswer', 'correctOption',
            'explanation', 'explanationEn', 'explanationHi', 'imageUrl', 'images', 'order'
        ]

    def get_images(self, obj):
        request = self.context.get('request')
        images_qs = obj.images.all() if hasattr(obj, 'images') else []
        out = {}
        for img in images_qs:
            pid = str(img.public_id)
            out[pid] = {
                'url': request.build_absolute_uri(img.image.url) if request else img.image.url,
                'width': img.width,
                'height': img.height,
                'alt': img.alt_text or img.source_name,
            }
        return out

    def get_imageUrl(self, obj):
        import re
        request = self.context.get('request')
        txt = obj.question_en or obj.question or ''
        m = re.search(r'!\[.*?\]\(([^\)]+)\)', txt)
        if m:
            url = m.group(1).strip()
            if request and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        m_img = re.search(r'\[\[IMG:([a-f0-9\-]+)\]\]', txt, re.I)
        if m_img and hasattr(obj, 'images'):
            img = obj.images.filter(public_id=m_img.group(1)).first()
            if img and img.image:
                return request.build_absolute_uri(img.image.url) if request else img.image.url
        if hasattr(obj, 'images'):
            img = obj.images.first()
            if img and img.image:
                return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


class TestQuestionAdminSerializer(serializers.ModelSerializer):
    options = serializers.JSONField(source='options_json', required=False)
    correctAnswer = serializers.IntegerField(source='correct_answer', required=False)
    correctOption = serializers.CharField(source='correct_option', required=False)
    questionEn = serializers.CharField(source='question_en', required=False, allow_blank=True)
    questionHi = serializers.CharField(source='question_hi', required=False, allow_null=True, allow_blank=True)
    optionAEn = serializers.CharField(source='option_a_en', required=False, allow_blank=True)
    optionAHi = serializers.CharField(source='option_a_hi', required=False, allow_null=True, allow_blank=True)
    optionBEn = serializers.CharField(source='option_b_en', required=False, allow_blank=True)
    optionBHi = serializers.CharField(source='option_b_hi', required=False, allow_null=True, allow_blank=True)
    optionCEn = serializers.CharField(source='option_c_en', required=False, allow_blank=True)
    optionCHi = serializers.CharField(source='option_c_hi', required=False, allow_null=True, allow_blank=True)
    optionDEn = serializers.CharField(source='option_d_en', required=False, allow_blank=True)
    optionDHi = serializers.CharField(source='option_d_hi', required=False, allow_null=True, allow_blank=True)
    explanationEn = serializers.CharField(source='explanation_en', required=False, allow_blank=True)
    explanationHi = serializers.CharField(source='explanation_hi', required=False, allow_null=True, allow_blank=True)
    marks = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True)
    negativeMarks = serializers.DecimalField(source='negative_marks', max_digits=6, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = TestQuestion
        fields = [
            'id', 'test_series', 'question_number', 'subject', 'question', 'options',
            'correctAnswer', 'correctOption', 'explanation', 'order',
            'questionEn', 'questionHi',
            'optionAEn', 'optionAHi', 'optionBEn', 'optionBHi',
            'optionCEn', 'optionCHi', 'optionDEn', 'optionDHi',
            'explanationEn', 'explanationHi', 'marks', 'negativeMarks'
        ]


class TestSeriesListSerializer(serializers.ModelSerializer):
    durationMinutes = serializers.IntegerField(source='duration_minutes')
    totalMarks = serializers.IntegerField(source='total_marks')
    totalQuestions = serializers.IntegerField(source='questions_count')
    isPaid = serializers.BooleanField(source='is_paid')
    isPublished = serializers.BooleanField(source='is_published')
    originalPrice = serializers.DecimalField(source='original_price', max_digits=10, decimal_places=2, allow_null=True)
    startsAt = serializers.DateTimeField(source='starts_at', allow_null=True)
    endsAt = serializers.DateTimeField(source='ends_at', allow_null=True)
    maxAttempts = serializers.IntegerField(source='max_attempts', allow_null=True)
    integrityMode = serializers.CharField(source='integrity_mode')
    
    # Dynamic fields for dashboard buttons
    isEntitled = serializers.SerializerMethodField()
    usedAttempts = serializers.SerializerMethodField()
    inProgressAttemptId = serializers.SerializerMethodField()
    canStart = serializers.SerializerMethodField()
    blockReason = serializers.SerializerMethodField()

    class Meta:
        model = TestSeries
        fields = [
            'id', 'slug', 'title', 'exam', 'category', 'durationMinutes',
            'totalMarks', 'totalQuestions', 'description', 'price',
            'originalPrice', 'isPaid', 'isPublished', 'startsAt', 'endsAt',
            'maxAttempts', 'integrityMode', 'isEntitled', 'usedAttempts',
            'inProgressAttemptId', 'canStart', 'blockReason'
        ]

    def _get_user_stats(self, obj):
        """Memoize or retrieve user attempt & access stats for the current request."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        # Cache on serializer instance across items if not already done
        if not hasattr(self, '_user_cache'):
            user = request.user
            # 1 query for access
            entitled_ids = set(UserTestAccess.objects.filter(user=user).values_list('test_series_id', flat=True))
            
            # 1 query for attempts
            attempts = UserTestAttempt.objects.filter(user=user).values(
                'id', 'test_series_id', 'status', 'expires_at'
            )
            used_counts = {}
            active_attempts = {}
            now = timezone.now()
            for att in attempts:
                ts_id = att['test_series_id']
                st = att['status']
                if st in (AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED):
                    used_counts[ts_id] = used_counts.get(ts_id, 0) + 1
                elif st == AttemptStatus.IN_PROGRESS:
                    exp = att['expires_at']
                    if not exp or exp > now:
                        active_attempts[ts_id] = att['id']

            self._user_cache = {
                'entitled_ids': entitled_ids,
                'used_counts': used_counts,
                'active_attempts': active_attempts,
            }

        return self._user_cache

    def get_isEntitled(self, obj):
        if not obj.is_paid:
            return True
        cache = self._get_user_stats(obj)
        if cache is None:
            return False
        return obj.id in cache['entitled_ids']

    def get_usedAttempts(self, obj):
        cache = self._get_user_stats(obj)
        if cache is None:
            return 0
        return cache['used_counts'].get(obj.id, 0)

    def get_inProgressAttemptId(self, obj):
        cache = self._get_user_stats(obj)
        if cache is None:
            return None
        return cache['active_attempts'].get(obj.id, None)

    def get_canStart(self, obj):
        reason = self.get_blockReason(obj)
        return reason is None

    def get_blockReason(self, obj):
        request = self.context.get('request')
        if not obj.is_published:
            return "unpublished"

        now = timezone.now()
        if obj.starts_at and now < obj.starts_at:
            return "not_started"
        if obj.ends_at and now > obj.ends_at:
            return "ended"

        if obj.questions_count == 0:
            return "no_questions"

        if not request or not request.user.is_authenticated:
            return "purchase_required" if obj.is_paid else None

        cache = self._get_user_stats(obj)
        if obj.is_paid and obj.id not in cache['entitled_ids']:
            return "purchase_required"

        # If user has an active in-progress attempt, they can resume/start
        if cache['active_attempts'].get(obj.id):
            return None

        if obj.max_attempts is not None:
            used = cache['used_counts'].get(obj.id, 0)
            if used >= obj.max_attempts:
                return "attempts_used"

        return None


class TestSeriesDetailSerializer(serializers.ModelSerializer):
    durationMinutes = serializers.IntegerField(source='duration_minutes')
    totalMarks = serializers.IntegerField(source='total_marks')
    totalQuestions = serializers.IntegerField(source='questions_count')
    isPaid = serializers.BooleanField(source='is_paid')
    isPublished = serializers.BooleanField(source='is_published')
    originalPrice = serializers.DecimalField(source='original_price', max_digits=10, decimal_places=2, allow_null=True)
    startsAt = serializers.DateTimeField(source='starts_at', allow_null=True)
    endsAt = serializers.DateTimeField(source='ends_at', allow_null=True)
    maxAttempts = serializers.IntegerField(source='max_attempts', allow_null=True)
    defaultMarks = serializers.DecimalField(source='default_marks', max_digits=6, decimal_places=2)
    defaultNegativeMarks = serializers.DecimalField(source='default_negative_marks', max_digits=6, decimal_places=2)
    integrityMode = serializers.CharField(source='integrity_mode')
    showRank = serializers.BooleanField(source='show_rank')
    showReview = serializers.BooleanField(source='show_review')
    isEntitled = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = TestSeries
        fields = [
            'id', 'slug', 'title', 'exam', 'category', 'durationMinutes',
            'totalMarks', 'totalQuestions', 'description', 'price',
            'originalPrice', 'isPaid', 'isPublished', 'startsAt', 'endsAt',
            'maxAttempts', 'defaultMarks', 'defaultNegativeMarks',
            'integrityMode', 'showRank', 'showReview',
            'isEntitled', 'questions'
        ]

    def get_isEntitled(self, obj):
        request = self.context.get('request')
        if not obj.is_paid:
            return True
        if not request or not request.user.is_authenticated:
            return False
        return UserTestAccess.objects.filter(user=request.user, test_series=obj).exists()

    def get_questions(self, obj):
        request = self.context.get('request')
        is_admin_or_educator = (
            request
            and request.user
            and request.user.is_authenticated
            and (
                request.user.is_staff or
                (getattr(request.user, 'profile', None) and request.user.profile.role in ['admin', 'superadmin', 'educator'])
            )
        )
        if is_admin_or_educator:
            return TestQuestionReviewSerializer(obj.questions.all().order_by('question_number', 'order'), many=True).data

        # Students NEVER receive questions from test detail view to prevent leaking before start
        return []


class TestSeriesManageSerializer(serializers.ModelSerializer):
    durationMinutes = serializers.IntegerField(source='duration_minutes', required=False)
    totalMarks = serializers.IntegerField(source='total_marks', required=False)
    totalQuestions = serializers.IntegerField(source='questions_count', required=False)
    isPaid = serializers.BooleanField(source='is_paid', required=False)
    isPublished = serializers.BooleanField(source='is_published', required=False)
    originalPrice = serializers.DecimalField(source='original_price', max_digits=10, decimal_places=2, allow_null=True, required=False)
    defaultMarks = serializers.DecimalField(source='default_marks', max_digits=6, decimal_places=2, required=False)
    defaultNegativeMarks = serializers.DecimalField(source='default_negative_marks', max_digits=6, decimal_places=2, required=False)
    startsAt = serializers.DateTimeField(source='starts_at', allow_null=True, required=False)
    endsAt = serializers.DateTimeField(source='ends_at', allow_null=True, required=False)
    maxAttempts = serializers.IntegerField(source='max_attempts', allow_null=True, required=False)
    integrityMode = serializers.CharField(source='integrity_mode', required=False)
    showRank = serializers.BooleanField(source='show_rank', required=False)
    showReview = serializers.BooleanField(source='show_review', required=False)
    reviewStatus = serializers.CharField(source='review_status', read_only=True)
    reviewNote = serializers.CharField(source='review_note', read_only=True)

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        for snake, camel in [('is_published', 'isPublished'), ('original_price', 'originalPrice'), ('is_paid', 'isPaid')]:
            if snake in data:
                ret[snake] = data[snake]
            elif camel in data:
                ret[snake] = data[camel]
        return ret

    class Meta:
        model = TestSeries
        fields = [
            'id', 'slug', 'title', 'exam', 'category', 'durationMinutes',
            'totalMarks', 'totalQuestions', 'description', 'price',
            'originalPrice', 'isPaid', 'isPublished',
            'defaultMarks', 'defaultNegativeMarks', 'startsAt', 'endsAt',
            'maxAttempts', 'integrityMode', 'showRank', 'showReview',
            'reviewStatus', 'reviewNote'
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        is_admin = request and (request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin']))
        if not is_admin:
            for forbidden_field in ['price', 'original_price', 'is_paid', 'is_published']:
                if forbidden_field in attrs:
                    err_key = 'isPublished' if forbidden_field == 'is_published' else ('originalPrice' if forbidden_field == 'original_price' else ('isPaid' if forbidden_field == 'is_paid' else forbidden_field))
                    if self.instance is not None:
                        raise serializers.ValidationError({forbidden_field: f'Only administrators can modify {forbidden_field}.', err_key: f'Only administrators can modify {forbidden_field}.'})
                    else:
                        if forbidden_field == 'is_published' and attrs.get(forbidden_field) is True:
                            raise serializers.ValidationError({'is_published': 'Educators cannot directly publish tests.', 'isPublished': 'Educators cannot directly publish tests.'})
                        if forbidden_field in ['price', 'original_price'] and attrs.get(forbidden_field) not in [None, 0, '0', '0.00']:
                            raise serializers.ValidationError({forbidden_field: f'Only administrators can set {forbidden_field}.', err_key: f'Only administrators can set {forbidden_field}.'})
                        if forbidden_field == 'is_paid' and attrs.get(forbidden_field) is True:
                            raise serializers.ValidationError({'is_paid': 'Educators cannot set tests as paid.', 'isPaid': 'Educators cannot set tests as paid.'})

        starts_at = attrs.get('starts_at', getattr(self.instance, 'starts_at', None))
        ends_at = attrs.get('ends_at', getattr(self.instance, 'ends_at', None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({"endsAt": "End time must be strictly after start time."})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class UserTestAttemptSerializer(serializers.ModelSerializer):
    testTitle = serializers.ReadOnlyField(source='test_series.title')
    totalMarks = serializers.FloatField(source='total_marks')
    correctCount = serializers.IntegerField(source='correct_count')
    wrongCount = serializers.IntegerField(source='wrong_count')
    unattemptedCount = serializers.IntegerField(source='unattempted_count')
    answers = serializers.JSONField(source='answers_json')
    completedAt = serializers.DateTimeField(source='completed_at')
    userName = serializers.ReadOnlyField(source='user.username')
    userEmail = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = UserTestAttempt
        fields = [
            'id', 'user', 'userName', 'userEmail', 'test_series', 'testTitle',
            'score', 'totalMarks', 'correctCount', 'wrongCount',
            'unattemptedCount', 'answers', 'completedAt'
        ]


# ── Attempt Lifecycle Serializers ─────────────────────────────────────────────

class AttemptStartSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    test_series = serializers.PrimaryKeyRelatedField(read_only=True)
    testSlug = serializers.SerializerMethodField()
    status = serializers.CharField()
    startedAt = serializers.DateTimeField(source='started_at')
    expiresAt = serializers.DateTimeField(source='expires_at', allow_null=True)
    durationMinutes = serializers.SerializerMethodField()

    def get_testSlug(self, obj):
        return obj.test_series.slug

    def get_durationMinutes(self, obj):
        return obj.test_series.duration_minutes


class SaveAnswerRequestSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_option = serializers.ChoiceField(
        choices=['A', 'B', 'C', 'D'], allow_null=True, required=False, default=None
    )
    mark_for_review = serializers.BooleanField(required=False, default=False)


class SaveAnswerResponseSerializer(serializers.ModelSerializer):
    questionId = serializers.IntegerField(source='question_id')
    selectedOption = serializers.CharField(source='selected_option', allow_null=True)
    markedForReview = serializers.BooleanField(source='is_marked_for_review')
    savedAt = serializers.DateTimeField(source='saved_at')

    class Meta:
        model = UserTestAnswer
        fields = ['questionId', 'selectedOption', 'markedForReview', 'savedAt']


class AttemptResultSerializer(serializers.ModelSerializer):
    testTitle = serializers.ReadOnlyField(source='test_series.title')
    testSlug = serializers.ReadOnlyField(source='test_series.slug')
    totalMarks = serializers.FloatField(source='total_marks')
    correctCount = serializers.IntegerField(source='correct_count')
    wrongCount = serializers.IntegerField(source='wrong_count')
    unattemptedCount = serializers.IntegerField(source='unattempted_count')
    timeTakenSeconds = serializers.IntegerField(source='time_taken_seconds')
    startedAt = serializers.DateTimeField(source='started_at')
    submittedAt = serializers.DateTimeField(source='submitted_at')
    showReview = serializers.BooleanField(source='test_series.show_review')
    showRank = serializers.BooleanField(source='test_series.show_rank')
    integrityViolation = serializers.BooleanField(source='integrity_violation')
    rank = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    subjectAnalysis = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()

    class Meta:
        model = UserTestAttempt
        fields = [
            'id', 'test_series', 'testTitle', 'testSlug',
            'status', 'score', 'totalMarks', 'percentage',
            'correctCount', 'wrongCount', 'unattemptedCount',
            'timeTakenSeconds', 'startedAt', 'submittedAt',
            'showReview', 'showRank', 'integrityViolation',
            'rank', 'participants', 'subjectAnalysis', 'review',
        ]

    def get_rank(self, obj):
        if not obj.test_series.show_rank:
            return None
        # Rank among finalized attempts of same test: higher score, tie-break by smaller time_taken_seconds
        better_count = UserTestAttempt.objects.filter(
            test_series=obj.test_series,
            status__in=[AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED]
        ).filter(
            score__gt=obj.score
        ).count()
        tie_better_time = UserTestAttempt.objects.filter(
            test_series=obj.test_series,
            status__in=[AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED],
            score=obj.score,
            time_taken_seconds__lt=obj.time_taken_seconds
        ).count()
        return 1 + better_count + tie_better_time

    def get_participants(self, obj):
        if not obj.test_series.show_rank:
            return None
        return UserTestAttempt.objects.filter(
            test_series=obj.test_series,
            status__in=[AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED]
        ).count()

    def get_subjectAnalysis(self, obj):
        from .services import compute_subject_analysis
        return compute_subject_analysis(obj)

    def get_review(self, obj):
        if not obj.test_series.show_review:
            return []
        answers_map = {
            a.question_id: a.selected_option
            for a in obj.answers.all()
        }
        out = []
        for q in obj.test_series.questions.all().order_by('question_number', 'order'):
            q_marks = float(q.marks) if q.marks is not None else float(obj.test_series.default_marks)
            q_neg = float(q.negative_marks) if q.negative_marks is not None else float(obj.test_series.default_negative_marks)
            sel = answers_map.get(q.id)
            if sel is None:
                verdict = 'unattempted'
            elif sel.upper() == q.correct_option.upper():
                verdict = 'correct'
            else:
                verdict = 'wrong'

            request = self.context.get('request')
            images_map = {
                str(img.public_id): {
                    'url': request.build_absolute_uri(img.image.url) if request else img.image.url,
                    'width': img.width,
                    'height': img.height,
                    'alt': img.alt_text or img.source_name,
                }
                for img in (q.images.all() if hasattr(q, 'images') else [])
            }

            out.append({
                'questionId': q.id,
                'questionNumber': q.question_number,
                'subject': q.subject,
                'question': q.question_en or q.question,
                'questionEn': q.question_en,
                'questionHi': q.question_hi,
                'optionA': q.option_a_en,
                'optionB': q.option_b_en,
                'optionC': q.option_c_en,
                'optionD': q.option_d_en,
                'optionAHi': q.option_a_hi,
                'optionBHi': q.option_b_hi,
                'optionCHi': q.option_c_hi,
                'optionDHi': q.option_d_hi,
                'correctOption': q.correct_option,
                'explanation': q.explanation_en or q.explanation,
                'explanationEn': q.explanation_en,
                'explanationHi': q.explanation_hi,
                'images': images_map,
                'selectedOption': sel,
                'verdict': verdict,
                'marks': q_marks,
                'negativeMarks': q_neg,
                'negativeMarts': q_neg,  # deprecated alias for backward compat
            })
        return out


class InProgressAttemptSerializer(serializers.ModelSerializer):
    """Safe in-progress view with questions delivered through attempt."""
    testTitle = serializers.ReadOnlyField(source='test_series.title')
    testSlug = serializers.ReadOnlyField(source='test_series.slug')
    startedAt = serializers.DateTimeField(source='started_at')
    expiresAt = serializers.DateTimeField(source='expires_at', allow_null=True)
    durationMinutes = serializers.ReadOnlyField(source='test_series.duration_minutes')
    serverNow = serializers.SerializerMethodField()
    integrityMode = serializers.ReadOnlyField(source='test_series.integrity_mode')
    showRank = serializers.ReadOnlyField(source='test_series.show_rank')
    savedAnswers = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = UserTestAttempt
        fields = [
            'id', 'test_series', 'testTitle', 'testSlug',
            'status', 'startedAt', 'expiresAt', 'durationMinutes',
            'serverNow', 'integrityMode', 'showRank',
            'savedAnswers', 'questions',
        ]

    def get_serverNow(self, obj):
        return timezone.now().isoformat()

    def get_savedAnswers(self, obj):
        return {
            str(a.question_id): {
                'selectedOption': a.selected_option,
                'markedForReview': a.is_marked_for_review,
            }
            for a in obj.answers.all()
        }

    def get_questions(self, obj):
        questions_qs = obj.test_series.questions.all().order_by('question_number', 'order')
        return TestQuestionStudentSerializer(questions_qs, many=True, context=self.context).data


class UserTestAttemptListSerializer(serializers.ModelSerializer):
    testTitle = serializers.ReadOnlyField(source='test_series.title')
    testSlug = serializers.ReadOnlyField(source='test_series.slug')
    totalMarks = serializers.FloatField(source='total_marks')
    correctCount = serializers.IntegerField(source='correct_count')
    wrongCount = serializers.IntegerField(source='wrong_count')
    unattemptedCount = serializers.IntegerField(source='unattempted_count')
    timeTakenSeconds = serializers.IntegerField(source='time_taken_seconds')
    startedAt = serializers.DateTimeField(source='started_at')
    submittedAt = serializers.DateTimeField(source='submitted_at', allow_null=True)
    completedAt = serializers.DateTimeField(source='completed_at')
    userName = serializers.ReadOnlyField(source='user.username')
    userEmail = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = UserTestAttempt
        fields = [
            'id', 'user', 'userName', 'userEmail',
            'test_series', 'testTitle', 'testSlug',
            'status', 'score', 'totalMarks', 'percentage',
            'correctCount', 'wrongCount', 'unattemptedCount',
            'timeTakenSeconds', 'startedAt', 'submittedAt', 'completedAt',
        ]
