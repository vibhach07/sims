import os
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.dispatch import receiver


class IntegrityMode(models.TextChoices):
    STRICT = 'strict', 'Strict (Auto-submit on tab switch > 2s)'
    WARN = 'warn', 'Warn (Log violation without terminating)'
    OFF = 'off', 'Off (Integrity tracking disabled)'


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = 'in_progress', 'In Progress'
    SUBMITTED = 'submitted', 'Submitted'
    AUTO_SUBMITTED = 'auto_submitted', 'Auto Submitted'


class TestSeries(models.Model):
    slug = models.SlugField(max_length=120, unique=True)
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='test_series')
    subject = models.ForeignKey('courses.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='test_series')
    title = models.CharField(max_length=255)
    exam = models.CharField(max_length=100)
    category = models.CharField(max_length=100, default='after-msc-btech')
    duration_minutes = models.PositiveIntegerField(default=15)
    total_marks = models.PositiveIntegerField(default=15)
    questions_count = models.PositiveIntegerField(default=5)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Reference extension fields
    default_marks = models.DecimalField(max_digits=6, decimal_places=2, default=4.00)
    default_negative_marks = models.DecimalField(max_digits=6, decimal_places=2, default=1.00)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    max_attempts = models.PositiveIntegerField(null=True, blank=True, help_text="Null means unlimited attempts")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_exams')
    review_status = models.CharField(
        max_length=20,
        choices=[('draft', 'Draft'), ('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='draft'
    )
    review_note = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_tests')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    integrity_mode = models.CharField(max_length=20, choices=IntegrityMode.choices, default=IntegrityMode.STRICT)
    show_rank = models.BooleanField(default=True)
    show_review = models.BooleanField(default=True)

    def clean(self):
        super().clean()
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({'ends_at': "End time must be strictly after start time."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Test Series'
        verbose_name_plural = 'Test Series'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class TestQuestion(models.Model):
    test_series = models.ForeignKey(TestSeries, on_delete=models.CASCADE, related_name='questions')
    question_number = models.PositiveIntegerField(default=1)
    subject = models.CharField(max_length=100, default='General')

    # Bilingual content
    question_en = models.TextField(blank=True, default='')
    question_hi = models.TextField(blank=True, null=True)
    option_a_en = models.TextField(blank=True, default='')
    option_a_hi = models.TextField(blank=True, null=True)
    option_b_en = models.TextField(blank=True, default='')
    option_b_hi = models.TextField(blank=True, null=True)
    option_c_en = models.TextField(blank=True, default='')
    option_c_hi = models.TextField(blank=True, null=True)
    option_d_en = models.TextField(blank=True, default='')
    option_d_hi = models.TextField(blank=True, null=True)

    correct_option = models.CharField(max_length=1, blank=True, default='', help_text="A, B, C, or D")
    explanation_en = models.TextField(blank=True, default='')
    explanation_hi = models.TextField(blank=True, null=True)

    marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    negative_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    # Legacy fields preserved for backward compatibility
    question = models.TextField(blank=True, default='')
    options_json = models.JSONField(default=list)
    correct_answer = models.PositiveIntegerField(default=0)  # 0-indexed integer
    explanation = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['question_number', 'order']
        constraints = [
            models.UniqueConstraint(fields=['test_series', 'question_number'], name='unique_exam_question_number')
        ]

    def save(self, *args, **kwargs):
        # Synchronize new canonical fields with legacy fields if one is set but not the other
        if self.question_en and not self.question:
            self.question = self.question_en
        elif self.question and not self.question_en:
            self.question_en = self.question

        if self.option_a_en or self.option_b_en or self.option_c_en or self.option_d_en:
            opts = [self.option_a_en or '', self.option_b_en or '', self.option_c_en or '', self.option_d_en or '']
            if not self.options_json:
                self.options_json = opts
        elif self.options_json and isinstance(self.options_json, list):
            if len(self.options_json) > 0 and not self.option_a_en:
                self.option_a_en = str(self.options_json[0])
            if len(self.options_json) > 1 and not self.option_b_en:
                self.option_b_en = str(self.options_json[1])
            if len(self.options_json) > 2 and not self.option_c_en:
                self.option_c_en = str(self.options_json[2])
            if len(self.options_json) > 3 and not self.option_d_en:
                self.option_d_en = str(self.options_json[3])

        if self.correct_option:
            opt_letter = self.correct_option.strip().upper()
            if opt_letter in ['A', 'B', 'C', 'D']:
                self.correct_option = opt_letter
                self.correct_answer = ord(opt_letter) - ord('A')
        elif self.correct_answer is not None and not self.correct_option:
            if 0 <= self.correct_answer <= 3:
                self.correct_option = chr(ord('A') + self.correct_answer)

        if self.explanation_en and not self.explanation:
            self.explanation = self.explanation_en
        elif self.explanation and not self.explanation_en:
            self.explanation_en = self.explanation

        if self.order and (not self.question_number or self.question_number == 1):
            # If caller explicitly set order > 1 but didn't set question_number, sync question_number
            if 'question_number' not in self.__dict__ or self.question_number == 1:
                self.question_number = self.order
        elif self.question_number and not self.order:
            self.order = self.question_number

        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Test Question'
        verbose_name_plural = 'Test Questions'
        ordering = ['question_number', 'order']

    def __str__(self):
        return f"{self.test_series.title} - Q{self.question_number}"


class UserTestAccess(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='test_accesses')
    test_series = models.ForeignKey(TestSeries, on_delete=models.CASCADE, related_name='entitled_users')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'test_series')

    def __str__(self):
        return f"{self.user.username} -> {self.test_series.title}"


class UserTestAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='test_attempts')
    test_series = models.ForeignKey(TestSeries, on_delete=models.CASCADE, related_name='user_attempts')
    score = models.FloatField(default=0.0)
    total_marks = models.FloatField(default=0.0)
    correct_count = models.PositiveIntegerField(default=0)
    wrong_count = models.PositiveIntegerField(default=0)
    unattempted_count = models.PositiveIntegerField(default=0)

    # Legacy field preserved
    answers_json = models.JSONField(default=dict)
    completed_at = models.DateTimeField(auto_now_add=True)

    # Attempt lifecycle fields
    started_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=AttemptStatus.choices, default=AttemptStatus.SUBMITTED)
    percentage = models.FloatField(default=0.0)
    time_taken_seconds = models.PositiveIntegerField(default=0)
    hidden_at = models.DateTimeField(null=True, blank=True)
    integrity_violation = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Student Test Attempt'
        verbose_name_plural = 'Student Test Attempts'
        ordering = ['-completed_at']

    def __str__(self):
        return f"{self.user.username} Attempt: {self.test_series.title} - Status: {self.status} - Score: {self.score}"


class TestSeriesItem(models.Model):
    test_series = models.ForeignKey(TestSeries, on_delete=models.CASCADE, related_name='items')
    title = models.CharField(max_length=255)
    item_type = models.CharField(max_length=50, default='mock_test')
    order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Test Series Item'
        verbose_name_plural = 'Test Series Items'
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.test_series.title} - {self.title}"


class QuestionPaperImportJob(models.Model):
    job_id = models.CharField(max_length=64, unique=True)
    test_series = models.ForeignKey(TestSeries, on_delete=models.SET_NULL, null=True, blank=True, related_name='import_jobs')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=30, default='completed')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Question Paper Import Job'
        verbose_name_plural = 'Question Paper Import Jobs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_id} - {self.file_name} ({self.status})"


class UserTestAnswer(models.Model):
    attempt = models.ForeignKey(UserTestAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(TestQuestion, on_delete=models.CASCADE, related_name='attempt_answers')
    selected_option = models.CharField(max_length=1, null=True, blank=True, help_text="A, B, C, D or null")
    is_marked_for_review = models.BooleanField(default=False)
    saved_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['attempt', 'question'], name='unique_attempt_question_answer')
        ]
        indexes = [
            models.Index(fields=['attempt', 'question']),
        ]

    def __str__(self):
        return f"Attempt {self.attempt_id} - Q{self.question_id}: {self.selected_option}"


def question_image_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower() or '.png'
    if not ext.startswith('.'):
        ext = f'.{ext}'
    test_id = instance.test_series_id or 'temp'
    return f'question_images/{test_id}/{uuid.uuid4().hex}{ext}'


class QuestionImage(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    test_series = models.ForeignKey(TestSeries, on_delete=models.CASCADE, null=True, blank=True, related_name='question_images')
    question = models.ForeignKey(TestQuestion, on_delete=models.CASCADE, null=True, blank=True, related_name='images')
    image = models.ImageField(upload_to=question_image_upload_path)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=255, blank=True, default='')
    source_name = models.CharField(max_length=255, blank=True, default='')
    content_hash = models.CharField(max_length=64, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Question Image'
        verbose_name_plural = 'Question Images'
        ordering = ['created_at']

    def __str__(self):
        return f"Image {self.public_id} ({self.source_name})"


@receiver(models.signals.post_delete, sender=QuestionImage)
def cleanup_question_image_file(sender, instance, **kwargs):
    if instance.image:
        try:
            if os.path.isfile(instance.image.path):
                os.remove(instance.image.path)
        except Exception:
            pass
