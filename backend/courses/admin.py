import json
from datetime import datetime, timedelta
from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from django.http import JsonResponse
from django.utils import timezone
from django.contrib import messages
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.decorators import display, action
from users.models import log_action, FacultyProfile
from .models import (
    CourseCategory, Course, CourseTrack, Module, Lecture,
    UserEnrollment, UserLectureProgress, Subject, LiveClass,
    Batch, WeeklyTimetable, DailyChallengeQuestion,
    DashboardCourseMockTest, DoubtQuery, FacultyAvailabilitySlot
)

@admin.register(CourseCategory)
class CourseCategoryAdmin(ModelAdmin):
    list_display = ('name', 'slug', 'courses_count_display', 'target_exams_display', 'order', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('order', 'name')

    def courses_count_display(self, obj):
        count = obj.courses.count()
        return f"{count} Course{'s' if count != 1 else ''}"
    courses_count_display.short_description = "Total Courses"

    def target_exams_display(self, obj):
        exams = list(obj.courses.exclude(target_exam='').values_list('target_exam', flat=True).distinct()[:4])
        return ", ".join(exams) if exams else "—"
    target_exams_display.short_description = "Target Exams"

    def has_module_permission(self, request):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])

    def has_add_permission(self, request):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])

    def has_change_permission(self, request, obj=None):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])

    def has_delete_permission(self, request, obj=None):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])


@admin.register(CourseTrack)
class CourseTrackAdmin(ModelAdmin):
    list_display = ('name', 'code', 'course', 'order', 'is_active')
    list_filter = ('is_active', 'course')
    search_fields = ('name', 'code', 'slug', 'course__title', 'description')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('course', 'order', 'name')

    def has_module_permission(self, request):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])

    def has_add_permission(self, request):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])

    def has_change_permission(self, request, obj=None):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])

    def has_delete_permission(self, request, obj=None):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])




class CourseTrackInline(TabularInline):
    model = CourseTrack
    extra = 0
    tab = True
    fields = ('name', 'code', 'slug', 'order', 'is_active')
    prepopulated_fields = {'slug': ('name',)}


class LectureInline(StackedInline):
    model = Lecture
    extra = 0
    tab = True
    fields = ('title', 'duration', 'video_url', 'is_free_preview', 'order', 'instructor_name')


class ModuleInline(StackedInline):
    model = Module
    extra = 0
    tab = True
    fields = ('title', 'order', 'description')


from django import forms

class CourseAdminForm(forms.ModelForm):
    review_status = forms.ChoiceField(
        choices=[('draft', 'Draft'), ('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        required=False,
        initial='draft'
    )

    class Meta:
        model = Course
        fields = '__all__'

    def clean_review_status(self):
        return self.cleaned_data.get('review_status') or 'draft'


@admin.register(Course)
class CourseAdmin(ModelAdmin):
    form = CourseAdminForm
    list_display = (
        'title',
        'category',
        'target_exam',
        'price',
        'created_by',
        'show_review_badge',
        'show_published_badge',
        'created_at',
    )
    list_filter = ('review_status', 'is_published', 'category', 'is_paid', 'target_exam')
    search_fields = ('title', 'subtitle', 'slug', 'category', 'target_exam', 'created_by__username', 'created_by__email')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ModuleInline]
    actions = ['approve_selected', 'unpublish_selected']
    fieldsets = (
        ('Program Information', {
            'fields': ('title', 'slug', 'subtitle', 'badge', 'category', 'category_ref', 'category_label', 'target_exam', 'eligibility', 'exam_overview', 'created_by')
        }),
        ('Academic Review & Workflow', {
            'fields': ('review_status', 'review_note', 'reviewed_by', 'reviewed_at')
        }),
        ('Commercial & Pricing', {
            'fields': ('is_paid', 'price', 'original_price', 'fee_status', 'is_published')
        }),
        ('Curriculum Summary', {
            'fields': ('duration', 'format', 'language', 'short_description', 'long_description')
        }),
    )

    @display(description='Review Status', label={
        'draft': 'secondary',
        'pending': 'warning',
        'approved': 'success',
        'rejected': 'danger',
    })
    def show_review_badge(self, obj):
        return obj.review_status

    @display(description='Published', label={True: 'success', False: 'secondary'})
    def show_published_badge(self, obj):
        return obj.is_published

    @action(description='Approve selected courses')
    def approve_selected(self, request, queryset):
        now = timezone.now()
        count = 0
        for c in queryset:
            c.review_status = 'approved'
            c.is_published = True
            c.reviewed_by = request.user
            c.reviewed_at = now
            c.save(update_fields=['review_status', 'is_published', 'reviewed_by', 'reviewed_at'])
            log_action(actor=request.user, action='approve_course', object_type='course', object_id=c.id, object_title=c.title, owner=c.created_by)
            count += 1
        self.message_user(request, f'{count} course(s) approved and published.', messages.SUCCESS)

    @action(description='Unpublish selected courses')
    def unpublish_selected(self, request, queryset):
        count = 0
        for c in queryset:
            c.is_published = False
            c.save(update_fields=['is_published'])
            log_action(actor=request.user, action='unpublish_course', object_type='course', object_id=c.id, object_title=c.title, owner=c.created_by)
            count += 1
        self.message_user(request, f'{count} course(s) unpublished.', messages.SUCCESS)


@admin.register(Module)
class ModuleAdmin(ModelAdmin):
    list_display = ('title', 'course', 'subject', 'order')
    list_filter = ('course', 'subject')
    search_fields = ('title', 'course__title', 'description')
    ordering = ('course', 'order')
    inlines = [LectureInline]


@admin.register(Lecture)
class LectureAdmin(ModelAdmin):
    list_display = ('title', 'module', 'get_course', 'duration', 'order', 'is_free_preview', 'instructor_name')
    list_filter = ('is_free_preview', 'module__course')
    search_fields = ('title', 'summary', 'module__title', 'module__course__title', 'instructor_name')
    ordering = ('module__course', 'module', 'order')
    fieldsets = (
        ('Lecture Details', {
            'fields': ('module', 'title', 'duration', 'order', 'instructor_name', 'is_free_preview', 'summary')
        }),
        ('Video Delivery (Upload MP4 or Paste YouTube/Embed URL)', {
            'fields': ('video_file', 'video_url')
        }),
    )

    @display(description='Course')
    def get_course(self, obj):
        return obj.module.course.title if obj.module and obj.module.course else '-'


@admin.register(LiveClass)
class LiveClassAdmin(ModelAdmin):
    list_display = ('title', 'course', 'educator', 'provider', 'scheduled_start', 'show_status_badge', 'access')
    list_filter = ('status', 'provider', 'access', 'scheduled_start')
    search_fields = ('title', 'description', 'stream_url', 'educator__username', 'educator__email')
    ordering = ('-scheduled_start',)
    actions = ['cancel_selected', 'end_selected']
    fieldsets = (
        ('Class Overview', {
            'fields': ('title', 'description', 'course', 'module', 'educator')
        }),
        ('Schedule & Streaming', {
            'fields': ('provider', 'stream_url', 'recording_url', 'scheduled_start', 'scheduled_end')
        }),
        ('Access Gate & Lifecycle', {
            'fields': ('access', 'status', 'started_at', 'ended_at')
        }),
    )

    @display(description='Status', label={
        'scheduled': 'info',
        'live': 'danger',
        'ended': 'secondary',
        'cancelled': 'warning',
    })
    def show_status_badge(self, obj):
        return obj.status

    @action(description='Cancel selected classes (scheduled only)')
    def cancel_selected(self, request, queryset):
        cancelled_count = 0
        for lc in queryset:
            if lc.status == 'scheduled':
                lc.status = 'cancelled'
                lc.save(update_fields=['status'])
                log_action(actor=request.user, action='cancel_live', object_type='live_class', object_id=lc.id, object_title=lc.title, owner=lc.educator)
                cancelled_count += 1
        self.message_user(request, f'{cancelled_count} scheduled class(es) marked cancelled.', messages.SUCCESS)

    @action(description='End selected classes (live only)')
    def end_selected(self, request, queryset):
        ended_count = 0
        now = timezone.now()
        for lc in queryset:
            if lc.status == 'live':
                lc.status = 'ended'
                lc.ended_at = now
                lc.save(update_fields=['status', 'ended_at'])
                log_action(actor=request.user, action='end_live', object_type='live_class', object_id=lc.id, object_title=lc.title, owner=lc.educator)
                ended_count += 1
        self.message_user(request, f'{ended_count} live class(es) ended.', messages.SUCCESS)


@admin.register(Subject)
class SubjectAdmin(ModelAdmin):
    list_display = ('name', 'slug', 'course', 'track', 'order', 'is_active', 'created_at')
    list_filter = ('is_active', 'course', 'track')
    search_fields = ('name', 'slug', 'description', 'course__title', 'track__name', 'track__code')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(UserEnrollment)
class UserEnrollmentAdmin(ModelAdmin):
    list_display = ('user', 'course', 'enrolled_at', 'is_active')
    list_filter = ('is_active', 'course', 'enrolled_at')
    search_fields = ('user__username', 'user__email', 'course__title')
    raw_id_fields = ('user', 'course')


@admin.register(UserLectureProgress)
class UserLectureProgressAdmin(ModelAdmin):
    list_display = ('user', 'lecture', 'is_completed', 'last_position_seconds', 'updated_at')
    list_filter = ('is_completed', 'updated_at')
    search_fields = ('user__username', 'user__email', 'lecture__title')
    raw_id_fields = ('user', 'lecture')
    readonly_fields = ('updated_at',)


@admin.register(Batch)
class BatchAdmin(ModelAdmin):
    list_display = ('name', 'code', 'branch', 'course', 'start_date', 'max_students', 'is_active', 'created_at')
    list_filter = ('branch', 'is_active', 'course')
    search_fields = ('name', 'code', 'branch', 'course__title')
    ordering = ('-created_at',)


@admin.register(WeeklyTimetable)
class WeeklyTimetableAdmin(ModelAdmin):
    change_list_template = 'admin/courses/weeklytimetable/change_list.html'
    list_display = ('branch', 'week_number', 'start_date', 'end_date', 'is_published', 'updated_at')
    list_filter = ('branch', 'is_published')
    search_fields = ('branch',)
    ordering = ('-start_date',)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('matrix/', self.admin_site.admin_view(self.matrix_view), name='courses_weeklytimetable_matrix'),
            path('save-matrix/', self.admin_site.admin_view(self.save_matrix_api), name='courses_weeklytimetable_save_matrix'),
            path('load-matrix/', self.admin_site.admin_view(self.load_matrix_api), name='courses_weeklytimetable_load_matrix'),
        ]
        return custom_urls + urls

    def matrix_view(self, request):
        today = timezone.localdate()
        monday = today - timedelta(days=today.weekday())
        start_date_str = request.GET.get('start_date') or monday.strftime('%Y-%m-%d')

        branches = [
            'Chemical Engineering (CH)',
            'Computer Science & Engineering (CS)',
            'Mechanical Engineering (ME)',
            'Civil Engineering (CE)',
            'Electrical Engineering (EE)',
            'CSIR-NET Chemical Sciences',
            'UGC-NET Paper 1 & General'
        ]

        active_faculty = FacultyProfile.objects.filter(is_active=True).order_by('name')
        default_faculty = active_faculty.first()

        selected_branch = request.GET.get('branch', branches[0])
        saved_tt = WeeklyTimetable.objects.filter(branch=selected_branch, start_date=start_date_str).first()
        if not saved_tt:
            saved_tt = WeeklyTimetable.objects.filter(branch=selected_branch).order_by('-start_date').first()
        saved_matrix_json = json.dumps(saved_tt.matrix_data if saved_tt else {})

        slot_defs = [
            {'key': 'morning',   'display_name': 'MORNING CORE',      'time_range': '07:30 AM – 10:30 AM'},
            {'key': 'afternoon', 'display_name': 'CORE TRACK',         'time_range': '11:00 AM – 02:00 PM'},
            {'key': 'evening',   'display_name': 'SPECIAL / CBT TEST', 'time_range': '03:00 PM – 06:00 PM'},
        ]

        context = {
            **self.admin_site.each_context(request),
            'title': 'Create / Edit Weekly Timetable Matrix',
            'branches': branches,
            'selected_branch': selected_branch,
            'start_date': start_date_str,
            'week_number': saved_tt.week_number if saved_tt else 1,
            'days': ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
            'slot_defs': slot_defs,
            'faculty_members': active_faculty,
            'default_faculty_id': default_faculty.id if default_faculty else '',
            'saved_matrix': bool(saved_tt and saved_tt.matrix_data),
            'saved_matrix_json': saved_matrix_json,
        }
        return render(request, 'admin/courses/weekly_timetable_matrix.html', context)

    def save_matrix_api(self, request):
        if request.method != 'POST':
            return JsonResponse({'error': 'POST required'}, status=405)
        try:
            data = json.loads(request.body.decode('utf-8'))
            branch = data.get('branch', 'Chemical Engineering (CH)')
            start_date_str = data.get('start_date')
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = start_date + timedelta(days=5)
            week_number = int(data.get('week_number', 1))
            matrix_data = data.get('matrix_data', {})

            timetable, created = WeeklyTimetable.objects.update_or_create(
                branch=branch,
                start_date=start_date,
                defaults={
                    'end_date': end_date,
                    'week_number': week_number,
                    'matrix_data': matrix_data,
                    'is_published': True
                }
            )
            return JsonResponse({'success': True, 'id': timetable.id, 'created': created})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    def load_matrix_api(self, request):
        branch = request.GET.get('branch')
        start_date_str = request.GET.get('start_date')
        if not branch:
            return JsonResponse({'error': 'Missing branch parameter'}, status=400)
        try:
            timetable = None
            if start_date_str:
                try:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    timetable = WeeklyTimetable.objects.filter(branch=branch, start_date=start_date).first()
                except ValueError:
                    pass
            if not timetable:
                timetable = WeeklyTimetable.objects.filter(branch=branch).order_by('-start_date').first()
            if timetable:
                return JsonResponse({
                    'success': True,
                    'week_number': timetable.week_number,
                    'start_date': str(timetable.start_date),
                    'end_date': str(timetable.end_date),
                    'matrix_data': timetable.matrix_data,
                    'is_published': timetable.is_published
                })
            return JsonResponse({'success': False, 'message': 'No saved timetable found'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@admin.register(DailyChallengeQuestion)
class DailyChallengeQuestionAdmin(ModelAdmin):
    list_display = ('title', 'branch', 'subject', 'for_date', 'correct_option', 'marks', 'is_active')
    list_filter = ('branch', 'is_active', 'for_date')
    search_fields = ('title', 'subject', 'question_text')
    ordering = ('-for_date',)


@admin.register(DashboardCourseMockTest)
class DashboardCourseMockTestAdmin(ModelAdmin):
    list_display = ('title', 'course', 'test_series', 'scheduled_date', 'duration_minutes', 'total_marks', 'is_active')
    list_filter = ('is_active', 'course')
    search_fields = ('title', 'course__title')
    ordering = ('-scheduled_date',)


@admin.register(DoubtQuery)
class DoubtQueryAdmin(ModelAdmin):
    list_display = ('id', 'student', 'course', 'subject', 'status', 'created_at', 'resolved_by')
    list_filter = ('status', 'course')
    search_fields = ('student__username', 'student__email', 'subject', 'query_text', 'reply')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(FacultyAvailabilitySlot)
class FacultyAvailabilitySlotAdmin(ModelAdmin):
    list_display = ('faculty', 'day_of_week', 'start_time', 'end_time', 'is_available')
    list_filter = ('day_of_week', 'is_available', 'faculty')
    search_fields = ('faculty__name', 'notes')
    ordering = ('day_of_week', 'start_time')
