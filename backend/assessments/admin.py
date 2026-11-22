import json
import uuid
from decimal import Decimal
from django.contrib import admin, messages
from django.urls import path, reverse
from django.shortcuts import render, redirect, get_object_or_404
from django.db import transaction
from django.db.models import Count
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.utils.html import format_html
from django.utils import timezone
from django.utils.text import slugify
from unfold.admin import ModelAdmin, StackedInline
from unfold.decorators import display, action
from users.models import log_action
from courses.models import Course, Subject
from .models import (
    TestSeries, TestQuestion, UserTestAccess, UserTestAttempt,
    TestSeriesItem, QuestionPaperImportJob, QuestionImage
)
from .parsers import DocumentQuestionParser, QuestionValidator
from .pipeline.services.import_service import ImportPipelineService
from .pipeline.services.storage import save_uploaded_file


class TestQuestionInline(StackedInline):
    model = TestQuestion
    extra = 0
    tab = True
    fields = ('question_number', 'subject', 'question_en', 'option_a_en', 'option_b_en', 'option_c_en', 'option_d_en', 'correct_option', 'marks', 'negative_marks')


@admin.register(TestSeries)
class TestSeriesAdmin(ModelAdmin):
    change_list_template = "admin/assessments/testseries/change_list.html"
    list_display = (
        'title',
        'exam',
        'category',
        'question_count_col',
        'price',
        'created_by',
        'show_review_badge',
        'show_published_badge',
        'results_link',
        'created_at',
    )
    list_filter = ('review_status', 'is_published', 'exam', 'category', 'is_paid')
    search_fields = ('title', 'slug', 'exam', 'description', 'created_by__username', 'created_by__email')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [TestQuestionInline]
    actions = ['approve_selected', 'unpublish_selected']
    fieldsets = (
        ('Assessment Metadata', {
            'fields': ('title', 'slug', 'course', 'subject', 'exam', 'category', 'description', 'created_by')
        }),
        ('Academic Review & Workflow', {
            'fields': ('review_status', 'review_note', 'reviewed_by', 'reviewed_at')
        }),
        ('Exam Rules & Structure', {
            'fields': ('duration_minutes', 'total_marks', 'questions_count', 'default_marks', 'default_negative_marks', 'starts_at', 'ends_at', 'max_attempts', 'integrity_mode')
        }),
        ('Pricing & Visibility', {
            'fields': ('is_paid', 'price', 'original_price', 'is_published', 'show_rank', 'show_review')
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            user_attempts_count=Count('user_attempts', distinct=True),
            questions_total=Count('questions', distinct=True),
        )

    @display(description='Questions')
    def question_count_col(self, obj):
        count = getattr(obj, 'questions_total', None)
        if count is None:
            count = obj.questions.count()
        return format_html('<a href="/admin/assessments/testquestion/?test_series__id__exact={}" class="font-bold text-primary-600">{} Questions</a>', obj.id, count)

    @display(description='Results')
    def results_link(self, obj):
        attempts = getattr(obj, 'user_attempts_count', None)
        if attempts is None:
            attempts = obj.user_attempts.count()
        return format_html('<a href="/admin/assessments/usertestattempt/?test_series__id__exact={}" class="text-xs text-font-subtle-light dark:text-font-subtle-dark font-medium">{} Attempts</a>', obj.id, attempts)

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

    @action(description='Approve selected test series')
    def approve_selected(self, request, queryset):
        now = timezone.now()
        count = 0
        for ts in queryset:
            ts.review_status = 'approved'
            ts.is_published = True
            ts.reviewed_by = request.user
            ts.reviewed_at = now
            ts.save(update_fields=['review_status', 'is_published', 'reviewed_by', 'reviewed_at'])
            log_action(actor=request.user, action='approve_test_series', object_type='test_series', object_id=ts.id, object_title=ts.title, owner=ts.created_by)
            count += 1
        self.message_user(request, f'{count} test series approved and published.', messages.SUCCESS)

    @action(description='Unpublish selected test series')
    def unpublish_selected(self, request, queryset):
        count = 0
        for ts in queryset:
            ts.is_published = False
            ts.save(update_fields=['is_published'])
            log_action(actor=request.user, action='unpublish_test_series', object_type='test_series', object_id=ts.id, object_title=ts.title, owner=ts.created_by)
            count += 1
        self.message_user(request, f'{count} test series unpublished.', messages.SUCCESS)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('bulk-import/', self.admin_site.admin_view(self.bulk_import_wizard_view), name='assessments_bulk_import_wizard'),
            path('bulk-import/parse/', self.admin_site.admin_view(self.bulk_import_parse_api), name='assessments_bulk_import_parse'),
            path('bulk-import/publish/', self.admin_site.admin_view(self.bulk_import_publish_api), name='assessments_bulk_import_publish'),
            path('classic-import/', self.admin_site.admin_view(self.bulk_import_classic_view), name='assessments_bulk_import'),
        ]
        return custom_urls + urls

    def bulk_import_classic_view(self, request):
        """Classic CSV/XLSX/DOCX/PDF import (stage-1 preview → stage-2 confirm)."""
        if not request.user.is_staff:
            raise PermissionDenied

        context = {
            **self.admin_site.each_context(request),
            'title': 'Bulk Question Importer (Word / PDF / CSV / Excel)',
            'test_series_list': TestSeries.objects.all().order_by('-created_at'),
            'preview_data': None,
            'target_test': None,
            'serialized_valid_rows': '[]',
        }

        if request.method == 'POST':
            action_type = request.POST.get('action_type', 'preview')
            test_series_id = request.POST.get('test_series_id')
            if not test_series_id:
                messages.error(request, "Please select a target test series.")
                return render(request, 'admin/assessments/bulk_import.html', context)

            target_test = get_object_or_404(TestSeries, id=test_series_id)
            context['target_test'] = target_test

            if action_type == 'preview':
                uploaded_file = request.FILES.get('file')
                if not uploaded_file:
                    messages.error(request, "Please choose a file to upload.")
                    return render(request, 'admin/assessments/bulk_import.html', context)

                candidates, parsing_errors, parsing_warnings = DocumentQuestionParser.parse_file(uploaded_file)
                if parsing_errors:
                    context['preview_data'] = {
                        'total_rows': 0,
                        'valid_count': 0,
                        'invalid_count': len(parsing_errors),
                        'errors': parsing_errors,
                        'warnings': parsing_warnings,
                        'preview_questions': []
                    }
                    return render(request, 'admin/assessments/bulk_import.html', context)

                valid_rows = []
                validation_errors = []
                existing_questions = set(
                    q.lower() for q in target_test.questions.values_list('question', flat=True) if q
                )

                for idx, cand in enumerate(candidates, start=1):
                    cleaned, errs, warns, is_dup = QuestionValidator.validate_candidate(cand, existing_questions, idx)
                    if is_dup:
                        continue
                    if errs:
                        validation_errors.append({
                            'row': cand.get('row_number', idx),
                            'question': str(cand.get('question_en', '') or cand.get('question_hi', ''))[:60] or f'Row #{idx}',
                            'errors': errs
                        })
                    else:
                        valid_rows.append(cleaned)
                        if cleaned['question_en']:
                            existing_questions.add(cleaned['question_en'].lower())

                serializable_rows = []
                for item in valid_rows:
                    row_copy = dict(item)
                    if isinstance(row_copy.get('marks'), Decimal):
                        row_copy['marks'] = str(row_copy['marks'])
                    if isinstance(row_copy.get('negative_marks'), Decimal):
                        row_copy['negative_marks'] = str(row_copy['negative_marks'])
                    serializable_rows.append(row_copy)

                context['preview_data'] = {
                    'total_rows': len(candidates),
                    'valid_count': len(valid_rows),
                    'invalid_count': len(validation_errors),
                    'errors': validation_errors,
                    'warnings': parsing_warnings,
                    'preview_questions': valid_rows[:10]
                }
                context['serialized_valid_rows'] = json.dumps(serializable_rows)
                return render(request, 'admin/assessments/bulk_import.html', context)

            elif action_type == 'confirm':
                raw_serialized = request.POST.get('serialized_valid_rows', '[]')
                try:
                    valid_rows = json.loads(raw_serialized)
                except Exception:
                    messages.error(request, "Invalid confirmation payload.")
                    return redirect('admin:assessments_bulk_import')

                if not valid_rows:
                    messages.error(request, "No valid questions to commit.")
                    return redirect('admin:assessments_bulk_import')

                with transaction.atomic():
                    locked_series = TestSeries.objects.select_for_update().get(id=target_test.id)
                    current_count = locked_series.questions.count()
                    max_q_num = locked_series.questions.order_by('-question_number').values_list('question_number', flat=True).first() or 0
                    start_num = max(current_count, max_q_num) + 1

                    created_objs = []
                    for i, item in enumerate(valid_rows):
                        q_num = start_num + i
                        marks_val = Decimal(item['marks']) if item.get('marks') else None
                        neg_val = Decimal(item['negative_marks']) if item.get('negative_marks') else None
                        created_objs.append(TestQuestion(
                            test_series=locked_series,
                            question_number=q_num,
                            subject=item['subject'],
                            question_en=item['question_en'],
                            question_hi=item.get('question_hi'),
                            option_a_en=item['option_a_en'],
                            option_a_hi=item.get('option_a_hi'),
                            option_b_en=item['option_b_en'],
                            option_b_hi=item.get('option_b_hi'),
                            option_c_en=item['option_c_en'],
                            option_c_hi=item.get('option_c_hi'),
                            option_d_en=item['option_d_en'],
                            option_d_hi=item.get('option_d_hi'),
                            correct_option=item['correct_option'],
                            explanation_en=item.get('explanation_en', ''),
                            explanation_hi=item.get('explanation_hi'),
                            marks=marks_val,
                            negative_marks=neg_val,
                            question=item['question'],
                            options_json=item['options_json'],
                            correct_answer=item['correct_answer'],
                            explanation=item['explanation'],
                            order=q_num
                        ))

                    TestQuestion.objects.bulk_create(created_objs)
                    locked_series.questions_count = locked_series.questions.count()
                    locked_series.save(update_fields=['questions_count'])

                messages.success(
                    request,
                    format_html(
                        "Successfully imported <strong>{}</strong> question(s) into <strong>{}</strong>.",
                        len(created_objs), locked_series.title
                    )
                )
                return redirect('admin:assessments_testquestion_changelist')

        return render(request, 'admin/assessments/bulk_import.html', context)

    def bulk_import_wizard_view(self, request):
        if not request.user.is_staff:
            raise PermissionDenied

        test_series_list = TestSeries.objects.all().order_by('-created_at')
        courses_list = Course.objects.all().order_by('title')
        subjects_list = Subject.objects.all().order_by('name')

        context = {
            **self.admin_site.each_context(request),
            'title': '5-Step Bulk Question & Examination Import Wizard',
            'test_series_list': test_series_list,
            'courses_list': courses_list,
            'subjects_list': subjects_list,
        }
        return render(request, 'admin/assessments/bulk_import_wizard.html', context)

    def bulk_import_parse_api(self, request):
        if not request.user.is_staff:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        if request.method != 'POST':
            return JsonResponse({'error': 'Method not allowed'}, status=405)

        files = request.FILES.getlist('files')
        if not files:
            single = request.FILES.get('file')
            if single:
                files = [single]

        if not files:
            return JsonResponse({'error': 'No file uploaded.'}, status=400)

        all_questions = []
        all_images = []
        all_warnings = []
        all_errors = []
        inferred_title = ""

        for file_obj in files:
            try:
                saved_path = save_uploaded_file(file_obj)
                res = ImportPipelineService.execute_pipeline(saved_path, file_obj.name)
                if not inferred_title and res.get('title'):
                    inferred_title = res.get('title')

                for q in res.get('questions', []):
                    all_questions.append(q)

                for img in res.get('extracted_images', []):
                    if img not in all_images:
                        all_images.append(img)

                for w in res.get('warnings', []):
                    if w not in all_warnings:
                        all_warnings.append(w)

                for err in res.get('errors', []):
                    all_errors.append(err)
            except Exception as e:
                all_errors.append(f"Error parsing {file_obj.name}: {str(e)}")

        for idx, q in enumerate(all_questions, start=1):
            q['question_number'] = idx

        return JsonResponse({
            'success': True,
            'title': inferred_title or "New Assessment Mock Test",
            'total_questions': len(all_questions),
            'questions': all_questions,
            'extracted_images': all_images,
            'warnings': all_warnings,
            'errors': all_errors
        })

    def bulk_import_publish_api(self, request):
        if not request.user.is_staff:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        if request.method != 'POST':
            return JsonResponse({'error': 'Method not allowed'}, status=405)

        try:
            payload = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({'error': 'Invalid JSON payload'}, status=400)

        mode = payload.get('mode', 'new')
        target_series_id = payload.get('existing_test_id')
        title = (payload.get('title') or '').strip()
        discipline = payload.get('discipline', 'CH')
        exam = payload.get('exam', f'GATE ({discipline})')
        test_type = payload.get('test_type', 'All-India Open Mock')
        package_id = payload.get('package_id')
        category = payload.get('category', 'after-msc-btech')
        try:
            duration_minutes = int(payload.get('duration_minutes', 180))
        except (ValueError, TypeError):
            duration_minutes = 180

        instructions = payload.get('instructions', '')
        subject_name = payload.get('subject_name', '')
        topic_name = payload.get('topic_name', '')
        is_published = bool(payload.get('is_published', True))
        starts_at = payload.get('starts_at') or None
        ends_at = payload.get('ends_at') or None
        available_immediately = bool(payload.get('available_immediately', True))
        if available_immediately:
            starts_at = None

        from django.utils.dateparse import parse_datetime
        if starts_at and isinstance(starts_at, str):
            try:
                parsed = parse_datetime(starts_at)
                starts_at = parsed if (not parsed or timezone.is_aware(parsed)) else timezone.make_aware(parsed)
            except Exception:
                starts_at = None
        if ends_at and isinstance(ends_at, str):
            try:
                parsed = parse_datetime(ends_at)
                ends_at = parsed if (not parsed or timezone.is_aware(parsed)) else timezone.make_aware(parsed)
            except Exception:
                ends_at = None

        questions_data = payload.get('questions', [])
        if not questions_data:
            return JsonResponse({'error': 'No questions to publish.'}, status=400)

        course_obj = None
        if package_id:
            try:
                course_obj = Course.objects.filter(id=package_id).first()
            except Exception:
                pass

        with transaction.atomic():
            if mode == 'existing' and target_series_id:
                test_series = get_object_or_404(TestSeries, id=target_series_id)
                current_count = test_series.questions.count()
                max_q_num = test_series.questions.order_by('-question_number').values_list('question_number', flat=True).first() or 0
                start_num = max(current_count, max_q_num) + 1
            else:
                if not title:
                    return JsonResponse({'error': 'Test paper title is required.'}, status=400)

                base_slug = slugify(title)[:100] or 'test-series'
                slug = base_slug
                while TestSeries.objects.filter(slug=slug).exists():
                    slug = f"{base_slug[:90]}-{uuid.uuid4().hex[:6]}"

                test_series = TestSeries.objects.create(
                    slug=slug,
                    title=title,
                    exam=f"{exam} — {test_type}",
                    category=category,
                    course=course_obj,
                    duration_minutes=duration_minutes,
                    total_marks=0,
                    questions_count=0,
                    default_marks=Decimal('1.00'),
                    default_negative_marks=Decimal('0.33'),
                    starts_at=starts_at,
                    ends_at=ends_at,
                    max_attempts=None,
                    integrity_mode='strict',
                    description=instructions,
                    is_paid=bool(course_obj),
                    is_published=is_published,
                    created_by=request.user,
                    review_status='approved'
                )
                start_num = 1

            created_objs = []
            total_marks = Decimal('0.00')

            for idx, q in enumerate(questions_data):
                q_num = start_num + idx
                correct_letter = (q.get('correct_option') or 'A').upper()
                if correct_letter not in ['A', 'B', 'C', 'D']:
                    correct_letter = 'A'
                correct_idx = ord(correct_letter) - ord('A')

                try:
                    q_marks = Decimal(str(q.get('marks', 1.0)))
                except Exception:
                    q_marks = Decimal('1.00')

                try:
                    q_neg = Decimal(str(q.get('negative_marks', 0.33)))
                except Exception:
                    q_neg = Decimal('0.33')

                total_marks += q_marks

                opt_a = q.get('option_a_en') or 'Option A'
                opt_b = q.get('option_b_en') or 'Option B'
                opt_c = q.get('option_c_en') or 'Option C'
                opt_d = q.get('option_d_en') or 'Option D'

                q_text = q.get('question_en') or q.get('question') or ''
                import re
                if q.get('image_url') and q['image_url'] not in q_text:
                    if re.search(r'\[image:\s*[^\]]+\]', q_text, re.I):
                        q_text = re.sub(r'\[image:\s*[^\]]+\]', f"![Figure]({q['image_url']})", q_text, count=1, flags=re.I)
                    else:
                        q_text = f"{q_text}\n\n![Figure]({q['image_url']})"
                q_text = re.sub(r'\[image:\s*[^\]]+\]', '', q_text, flags=re.I)

                created_objs.append(TestQuestion(
                    test_series=test_series,
                    question_number=q_num,
                    subject=q.get('subject') or subject_name or 'General',
                    question_en=q_text,
                    question_hi=q.get('question_hi'),
                    option_a_en=opt_a,
                    option_a_hi=q.get('option_a_hi'),
                    option_b_en=opt_b,
                    option_b_hi=q.get('option_b_hi'),
                    option_c_en=opt_c,
                    option_c_hi=q.get('option_c_hi'),
                    option_d_en=opt_d,
                    option_d_hi=q.get('option_d_hi'),
                    correct_option=correct_letter,
                    explanation_en=q.get('explanation_en') or q.get('explanation') or '',
                    explanation_hi=q.get('explanation_hi'),
                    marks=q_marks,
                    negative_marks=q_neg,
                    question=q_text,
                    options_json=[opt_a, opt_b, opt_c, opt_d],
                    correct_answer=correct_idx,
                    explanation=q.get('explanation_en') or q.get('explanation') or '',
                    order=q_num
                ))

            TestQuestion.objects.bulk_create(created_objs, batch_size=100)

            test_series.questions_count = test_series.questions.count()
            if mode == 'new':
                test_series.total_marks = int(total_marks)
            else:
                test_series.total_marks = int(sum(
                    Decimal(str(m or 0)) for m in test_series.questions.values_list('marks', flat=True)
                ))
            test_series.save(update_fields=['questions_count', 'total_marks'])

            log_action(
                actor=request.user,
                action='bulk_import_questions',
                object_type='test_series',
                object_id=test_series.id,
                object_title=test_series.title,
                owner=test_series.created_by
            )

        messages.success(
            request,
            format_html(
                "Successfully imported <strong>{}</strong> question(s) into <strong>{}</strong>.",
                len(created_objs), test_series.title
            )
        )

        return JsonResponse({
            'success': True,
            'message': f"Created {len(created_objs)} questions.",
            'test_id': test_series.id,
            'redirect_url': reverse('admin:assessments_testseries_change', args=[test_series.id])
        })


@admin.register(TestQuestion)
class TestQuestionAdmin(ModelAdmin):
    list_display = ('question_number', 'test_series', 'subject', 'get_short_text', 'correct_option', 'marks')
    list_filter = ('test_series', 'subject')
    search_fields = ('question', 'question_en', 'subject', 'explanation_en', 'test_series__title')
    ordering = ('test_series', 'question_number')

    @display(description='Question Text')
    def get_short_text(self, obj):
        txt = obj.question_en or obj.question or ""
        return (txt[:75] + "...") if len(txt) > 75 else txt




@admin.register(UserTestAttempt)
class UserTestAttemptAdmin(ModelAdmin):
    list_display = (
        'user',
        'test_series',
        'show_status',
        'score',
        'total_marks',
        'get_percentage',
        'time_taken_seconds',
        'show_integrity',
        'submitted_at',
    )
    list_filter = ('status', 'integrity_violation', 'submitted_at', 'test_series')
    search_fields = ('user__username', 'user__email', 'test_series__title')
    raw_id_fields = ('user', 'test_series')
    readonly_fields = (
        'user', 'test_series', 'status', 'score', 'total_marks', 'percentage',
        'correct_count', 'wrong_count', 'unattempted_count', 'time_taken_seconds',
        'started_at', 'expires_at', 'submitted_at', 'completed_at',
        'integrity_violation', 'hidden_at', 'answers_json'
    )

    fieldsets = (
        ('Attempt Overview', {
            'fields': ('user', 'test_series', 'status', 'integrity_violation')
        }),
        ('Performance & Results', {
            'fields': ('score', 'total_marks', 'percentage', 'correct_count', 'wrong_count', 'unattempted_count', 'time_taken_seconds')
        }),
        ('Timestamps', {
            'fields': ('started_at', 'expires_at', 'submitted_at', 'completed_at', 'hidden_at')
        }),
        ('Submission Answers', {
            'fields': ('answers_json',),
            'classes': ('collapse',)
        }),
    )

    @display(description='Status', label={
        'in_progress': 'info',
        'completed': 'success',
        'timed_out': 'warning',
        'abandoned': 'secondary',
        'cancelled_integrity': 'danger',
    })
    def show_status(self, obj):
        return obj.status

    @display(description='Percentage')
    def get_percentage(self, obj):
        return f"{obj.percentage:.1f}%" if obj.percentage is not None else "-"

    @display(description='Integrity Violation', boolean=True)
    def show_integrity(self, obj):
        return obj.integrity_violation

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return bool(request.user and request.user.is_superuser)


@admin.register(UserTestAccess)
class UserTestAccessAdmin(ModelAdmin):
    list_display = ('user', 'test_series', 'granted_at')
    list_filter = ('test_series', 'granted_at')
    search_fields = ('user__username', 'user__email', 'test_series__title')
    raw_id_fields = ('user', 'test_series')


@admin.register(TestSeriesItem)
class TestSeriesItemAdmin(ModelAdmin):
    list_display = ('title', 'test_series', 'item_type', 'order', 'is_active', 'created_at')
    list_filter = ('item_type', 'is_active', 'test_series')
    search_fields = ('title', 'test_series__title')
    ordering = ('test_series', 'order')


@admin.register(QuestionPaperImportJob)
class QuestionPaperImportJobAdmin(ModelAdmin):
    list_display = ('job_id', 'test_series', 'file_name', 'total_questions', 'status', 'uploaded_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('job_id', 'file_name', 'test_series__title')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


@admin.register(QuestionImage)
class QuestionImageAdmin(ModelAdmin):
    list_display = ('public_id', 'test_series', 'question', 'width', 'height', 'source_name', 'created_at')
    list_filter = ('created_at', 'test_series')
    search_fields = ('public_id', 'source_name', 'alt_text', 'test_series__title')
    ordering = ('-created_at',)
    readonly_fields = ('public_id', 'content_hash', 'created_at')
