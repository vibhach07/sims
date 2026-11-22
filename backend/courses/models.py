from django.conf import settings
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class CourseCategory(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default='')
    icon_name = models.CharField(max_length=50, default='GraduationCap')
    order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Course Category'
        verbose_name_plural = 'Course Categories'

    def __str__(self):
        return self.name

class Course(models.Model):
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=100) # e.g. after-msc-btech
    category_ref = models.ForeignKey(CourseCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='courses')
    category_label = models.CharField(max_length=100, default='Program')
    target_exam = models.CharField(max_length=100)
    eligibility = models.TextField(blank=True, default='')
    exam_overview = models.TextField(blank=True, default='')
    badge = models.CharField(max_length=50, blank=True)
    duration = models.CharField(max_length=50, default='10-12 Months')
    format = models.CharField(max_length=100, default='Classroom / Live / Recorded')
    language = models.CharField(max_length=50, default='English & Hindi (Bilingual)')
    fee_status = models.CharField(max_length=100, default='Admissions Open')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_paid = models.BooleanField(default=True)
    short_description = models.TextField(blank=True)
    long_description = models.TextField(blank=True)
    is_published = models.BooleanField(default=True)
    review_status = models.CharField(
        max_length=20,
        choices=[('draft', 'Draft'), ('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='draft'
    )
    review_note = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_courses')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_courses')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'
        ordering = ['title']

    def __str__(self):
        return self.title

class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='curriculum')
    subject = models.ForeignKey('Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order']
        verbose_name = 'Course Module'
        verbose_name_plural = 'Course Modules'

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Lecture(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    duration = models.CharField(max_length=50, default='45 mins')
    video_url = models.URLField(max_length=500, blank=True, default='')
    video_file = models.FileField(upload_to='lectures/videos/', blank=True, null=True, help_text="Direct MP4/WebM video upload")
    summary = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)
    is_free_preview = models.BooleanField(default=False)
    instructor_name = models.CharField(max_length=100, default='SIMS Faculty')

    class Meta:
        ordering = ['order']
        verbose_name = 'Course Lecture'
        verbose_name_plural = 'Course Lectures'

    def __str__(self):
        return f"{self.module.title} - {self.title}"

    def get_effective_video_url(self):
        if self.video_file:
            return self.video_file.url
        return self.video_url or ''

    def get_embed_url(self):
        raw = self.get_effective_video_url()
        if not raw:
            return ''
        import re
        yt_m = re.search(r'(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})', raw)
        if yt_m:
            return f"https://www.youtube-nocookie.com/embed/{yt_m.group(1)}"
        vimeo_m = re.search(r'vimeo\.com\/(?:video\/)?([0-9]+)', raw)
        if vimeo_m:
            return f"https://player.vimeo.com/video/{vimeo_m.group(1)}"
        return raw

    def get_video_type(self):
        raw = self.get_effective_video_url().lower()
        if 'youtube.com' in raw or 'youtu.be' in raw:
            return 'youtube'
        if 'vimeo.com' in raw:
            return 'vimeo'
        if raw.endswith(('.mp4', '.webm', '.ogg', '.m4v')) or self.video_file:
            return 'video/mp4'
        return 'stream'

class UserEnrollment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrolled_users')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'course')
        verbose_name = 'Student Enrollment'
        verbose_name_plural = 'Student Enrollments'

    def __str__(self):
        return f"{self.user.username} -> {self.course.title}"

class UserLectureProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lecture_progress')
    lecture = models.ForeignKey(Lecture, on_delete=models.CASCADE, related_name='user_progress')
    is_completed = models.BooleanField(default=False)
    last_position_seconds = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lecture')

    def __str__(self):
        return f"{self.user.username} - {self.lecture.title} (Completed: {self.is_completed})"


class CourseTrack(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='tracks')
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=30, blank=True, default='')
    slug = models.SlugField(max_length=150)
    description = models.TextField(blank=True, default='')
    eligibility = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'slug')
        ordering = ['order', 'name']
        verbose_name = 'Course Track / Paper'
        verbose_name_plural = 'Course Tracks / Papers'

    def __str__(self):
        code_str = f" ({self.code})" if self.code else ""
        return f"{self.course.title} - {self.name}{code_str}"

class Subject(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150)
    description = models.TextField(blank=True, default='')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='subjects')
    track = models.ForeignKey(CourseTrack, on_delete=models.SET_NULL, null=True, blank=True, related_name='subjects')
    order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        unique_together = ('course', 'track', 'slug')
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'

    def __str__(self):
        track_str = f" [{self.track.code or self.track.name}]" if self.track else ""
        return f"{self.name}{track_str}" 


class LiveClass(models.Model):
    PROVIDER_CHOICES = [
        ('youtube', 'YouTube Live'),
        ('vimeo', 'Vimeo Live'),
        ('zoom', 'Zoom Meeting'),
        ('meet', 'Google Meet'),
        ('other', 'Other Stream'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('live', 'Live Now'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled'),
    ]

    ACCESS_CHOICES = [
        ('course_students', 'Enrolled Course Students'),
        ('free_for_all', 'Free For All (Public)'),
        ('logged_in', 'All Logged-in Users'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='live_classes')
    module = models.ForeignKey(Module, on_delete=models.SET_NULL, null=True, blank=True, related_name='live_classes')
    educator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='live_classes')

    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()

    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='youtube')
    stream_url = models.URLField(max_length=1000)
    recording_url = models.URLField(max_length=1000, blank=True, default="")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    access = models.CharField(max_length=20, choices=ACCESS_CHOICES, default='course_students')

    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    reminder_30m_sent = models.BooleanField(default=False)
    live_reminder_sent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_start']
        verbose_name = 'Live / Recorded Lecture'
        verbose_name_plural = 'Live / Recorded Lectures'

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.scheduled_end and self.scheduled_start and self.scheduled_end <= self.scheduled_start:
            raise ValidationError("scheduled_end must be after scheduled_start.")

    def get_embed_url(self):
        from .live_utils import parse_and_validate_stream_url
        try:
            _, embed_url, _ = parse_and_validate_stream_url(self.stream_url, self.provider)
            return embed_url
        except Exception:
            return None

    def get_join_url(self):
        from .live_utils import parse_and_validate_stream_url
        try:
            _, _, join_url = parse_and_validate_stream_url(self.stream_url, self.provider)
            return join_url
        except Exception:
            return self.stream_url

    def is_authorized(self, user):
        if self.access == 'free_for_all':
            return True
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or getattr(user, 'profile', None) and user.profile.role in ['admin', 'superadmin']:
            return True
        if self.educator_id == user.id or (self.course and self.course.created_by_id == user.id):
            return True
        if self.access == 'logged_in':
            return True
        if self.access == 'course_students':
            if not self.course:
                return True
            return UserEnrollment.objects.filter(user=user, course=self.course, is_active=True).exists()
        return False


# ── BATCHES & WEEKLY TIMETABLE MATRIX ──────────────────────────

class Batch(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, blank=True)
    branch = models.CharField(max_length=100, default='Chemical Engineering (CH)')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    max_students = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Batch'
        verbose_name_plural = 'Batches'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.branch})"


class WeeklyTimetable(models.Model):
    branch = models.CharField(max_length=100, default='Chemical Engineering (CH)')
    start_date = models.DateField(help_text="Monday of the schedule week")
    end_date = models.DateField(help_text="Saturday of the schedule week")
    week_number = models.PositiveIntegerField(default=1)
    matrix_data = models.JSONField(default=dict, help_text="Matrix of time slots, days, subjects, and assigned faculty")
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Weekly Timetable Matrix'
        verbose_name_plural = 'Weekly Timetable Matrix'
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.branch} - Week {self.week_number} ({self.start_date} to {self.end_date})"


class DailyChallengeQuestion(models.Model):
    title = models.CharField(max_length=255)
    branch = models.CharField(max_length=100, blank=True, default='Chemical Engineering (CH)')
    subject = models.CharField(max_length=150, blank=True)
    question_text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')])
    explanation = models.TextField(blank=True)
    marks = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    for_date = models.DateField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Daily Challenge Question'
        verbose_name_plural = 'Daily Challenge Questions'
        ordering = ['-for_date']

    def __str__(self):
        return f"{self.title} ({self.for_date})"


class DashboardCourseMockTest(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='dashboard_mock_tests')
    test_series = models.ForeignKey('assessments.TestSeries', on_delete=models.SET_NULL, null=True, blank=True, related_name='dashboard_course_links')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=180)
    total_marks = models.PositiveIntegerField(default=100)
    scheduled_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Dashboard Course Mock Test'
        verbose_name_plural = 'Dashboard Course Mock Tests'
        ordering = ['-scheduled_date']

    def __str__(self):
        return f"{self.title} - {self.course.title}"


class DoubtQuery(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doubt_queries')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='doubts')
    subject = models.CharField(max_length=150, blank=True)
    query_text = models.TextField()
    image = models.ImageField(upload_to='doubts/', null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('in_review', 'In Review'), ('resolved', 'Resolved')],
        default='pending'
    )
    reply = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_doubt_queries'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Doubt Query'
        verbose_name_plural = 'Doubt Queries'
        ordering = ['-created_at']

    def __str__(self):
        return f"Doubt #{self.id} - {self.student.username} ({self.status})"


class FacultyAvailabilitySlot(models.Model):
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    faculty = models.ForeignKey('users.FacultyProfile', on_delete=models.CASCADE, related_name='availability_slots')
    day_of_week = models.CharField(max_length=15, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    notes = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Faculty Availability Slot'
        verbose_name_plural = 'Faculty Availability Slots'
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f"{self.faculty.name} - {self.get_day_of_week_display()} ({self.start_time} - {self.end_time})"
