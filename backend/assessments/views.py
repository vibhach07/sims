import csv
import json
import uuid
import logging
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import (
    TestSeries, TestQuestion, UserTestAccess, UserTestAttempt,
    AttemptStatus, UserTestAnswer, QuestionImage
)
from .serializers import (
    TestSeriesListSerializer, TestSeriesDetailSerializer,
    TestSeriesManageSerializer, TestQuestionAdminSerializer,
    UserTestAttemptSerializer, TestQuestionReviewSerializer,
    AttemptStartSerializer, SaveAnswerRequestSerializer,
    SaveAnswerResponseSerializer, AttemptResultSerializer,
    InProgressAttemptSerializer, UserTestAttemptListSerializer,
)
from .services import (
    ExamServiceError, start_attempt, save_answer,
    submit_attempt, get_attempt_result, record_visibility_event,
)
from .parsers import DocumentQuestionParser, QuestionValidator, normalize_for_comparison

logger = logging.getLogger(__name__)


class IsAdminOrEducator(permissions.BasePermission):
    """Allows access to staff, superusers, and users with role in [admin, superadmin, educator]."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.role in ['admin', 'superadmin', 'educator'])


def _service_response(exc: ExamServiceError):
    return Response({'error': exc.detail, 'detail': exc.detail}, status=exc.status_code)


# ── Public / Student Endpoints ───────────────────────────────────────────────

class TestSeriesListView(generics.ListAPIView):
    """
    GET /api/assessments/
    Lists test series with rich dashboard button states (canStart, blockReason, usedAttempts, etc).
    Educators see only their own tests; staff/superusers see all; others see published only.
    """
    serializer_class = TestSeriesListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.is_superuser or user.is_staff:
                qs = TestSeries.objects.all()
            else:
                profile = getattr(user, 'profile', None)
                if profile and profile.role == 'educator':
                    qs = TestSeries.objects.filter(created_by=user)
                else:
                    qs = TestSeries.objects.filter(is_published=True)
        else:
            qs = TestSeries.objects.filter(is_published=True)

        category = self.request.query_params.get('category')
        exam = self.request.query_params.get('exam')
        if category:
            qs = qs.filter(category=category)
        if exam:
            qs = qs.filter(exam__icontains=exam)
        return qs.order_by('-created_at')


class TestSeriesDetailView(generics.RetrieveAPIView):
    """
    GET /api/assessments/<slug>/
    Students receive general metadata but NO questions to prevent leaking before start.
    Staff/educators receive full review serialization.
    """
    serializer_class = TestSeriesDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (
            user.is_superuser or user.is_staff or
            (getattr(user, 'profile', None) and user.profile.role in ['admin', 'superadmin', 'educator'])
        ):
            return TestSeries.objects.all()
        return TestSeries.objects.filter(is_published=True)


class SubmitTestAttemptView(APIView):
    """
    POST /api/assessments/<slug>/submit/
    [DEPRECATED] Legacy client-side submission endpoint preserved for backward compatibility.
    New frontend code must use /api/assessments/attempts/<id>/submit/.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        test = get_object_or_404(TestSeries, slug=slug)
        if test.is_paid:
            has_access = UserTestAccess.objects.filter(user=request.user, test_series=test).exists()
            if not has_access:
                return Response({'error': 'Purchase required to take this test.'}, status=status.HTTP_403_FORBIDDEN)

        answers = request.data.get('answers', {})
        questions = test.questions.all()

        correct_count = 0
        wrong_count = 0
        unattempted_count = 0
        marks_per_question = test.total_marks / max(test.questions_count, 1)

        for q in questions:
            user_ans = answers.get(str(q.id))
            if user_ans is None or user_ans == -1:
                unattempted_count += 1
            elif int(user_ans) == q.correct_answer:
                correct_count += 1
            else:
                wrong_count += 1

        score = (correct_count * marks_per_question) - (wrong_count * (marks_per_question / 3.0))
        score = max(0.0, round(score, 2))

        attempt = UserTestAttempt.objects.create(
            user=request.user,
            test_series=test,
            score=score,
            total_marks=test.total_marks,
            correct_count=correct_count,
            wrong_count=wrong_count,
            unattempted_count=unattempted_count,
            answers_json=answers,
            status=AttemptStatus.SUBMITTED,
            submitted_at=timezone.now()
        )

        return Response({
            'attempt': UserTestAttemptSerializer(attempt).data,
            'review': TestQuestionReviewSerializer(questions, many=True).data
        }, status=status.HTTP_201_CREATED)


class MyTestAttemptsView(generics.ListAPIView):
    """GET /api/assessments/my-attempts/ (v1)"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserTestAttemptSerializer

    def get_queryset(self):
        return UserTestAttempt.objects.filter(user=self.request.user).order_by('-completed_at')


class MyTestAttemptsV2View(generics.ListAPIView):
    """GET /api/assessments/my-attempts/v2/ (v2 richer metadata)"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserTestAttemptListSerializer

    def get_queryset(self):
        return (
            UserTestAttempt.objects
            .select_related('user', 'test_series')
            .filter(user=self.request.user)
            .order_by('-started_at', '-completed_at')
        )


# ── Admin & Educator Management Endpoints ────────────────────────────────────

class AdminTestSeriesCreateView(generics.CreateAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = TestSeriesManageSerializer
    queryset = TestSeries.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin'])
        test = serializer.save(
            created_by=user,
            review_status='approved' if is_admin else 'draft',
            is_published=True if is_admin else False
        )
        log_action(
            actor=user,
            action='create',
            object_type='test_series',
            object_id=test.id,
            object_title=test.title,
            owner=test.created_by,
            changes={'title': ['', test.title]}
        )


class AdminTestSeriesUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = TestSeriesManageSerializer
    queryset = TestSeries.objects.all()
    lookup_field = 'slug'

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if not (user.is_superuser or user.is_staff):
            profile = getattr(user, 'profile', None)
            if profile and profile.role == 'educator':
                if obj.created_by_id != user.id:
                    self.permission_denied(request, message="Educators can only manage their own tests.")

    def perform_update(self, serializer):
        old_title = serializer.instance.title
        test = serializer.save()
        log_action(
            actor=self.request.user,
            action='update',
            object_type='test_series',
            object_id=test.id,
            object_title=test.title,
            owner=test.created_by,
            changes={'title': [old_title, test.title]}
        )

    def perform_destroy(self, instance):
        log_action(
            actor=self.request.user,
            action='delete',
            object_type='test_series',
            object_id=instance.id,
            object_title=instance.title,
            owner=instance.created_by,
            changes={'deleted': [instance.title, None]}
        )
        instance.delete()


class AdminTestAttemptsListView(generics.ListAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = UserTestAttemptSerializer

    def get_queryset(self):
        user = self.request.user
        qs = UserTestAttempt.objects.select_related('user', 'test_series').order_by('-completed_at')
        if not (user.is_superuser or user.is_staff):
            profile = getattr(user, 'profile', None)
            if profile and profile.role == 'educator':
                qs = qs.filter(test_series__created_by=user)

        slug = self.kwargs.get('slug')
        if slug:
            qs = qs.filter(test_series__slug=slug)
        return qs


class AdminTestAttemptsExportCSVView(APIView):
    """
    GET /api/assessments/manage/attempts/export/?test=<slug>
    Export finalized attempts as UTF-8 BOM CSV.
    """
    permission_classes = [IsAdminOrEducator]

    def get(self, request):
        user = request.user
        qs = UserTestAttempt.objects.select_related('user', 'user__profile', 'test_series').order_by('-submitted_at')

        if not (user.is_superuser or user.is_staff):
            profile = getattr(user, 'profile', None)
            if profile and profile.role == 'educator':
                qs = qs.filter(test_series__created_by=user)

        test_slug = request.query_params.get('test')
        if test_slug:
            qs = qs.filter(test_series__slug=test_slug)

        date_str = timezone.now().strftime('%Y-%m-%d')
        filename = f"sims-results-{date_str}.csv"

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'no-store'
        # Write UTF-8 BOM so Excel opens Hindi characters properly
        response.write('\ufeff'.encode('utf-8'))

        writer = csv.writer(response)
        writer.writerow([
            "Student", "Email", "Phone", "Test", "Status", "Score",
            "Percentage", "Correct", "Wrong", "Unanswered",
            "Started At", "Submitted At", "Time Taken Seconds"
        ])

        is_admin = user.is_superuser or user.is_staff or (getattr(user, 'profile', None) and user.profile.role in ['admin', 'superadmin'])

        for att in qs:
            usr = att.user
            profile = getattr(usr, 'profile', None)
            phone = profile.phone if (profile and is_admin) else ""
            student_name = f"{usr.first_name} {usr.last_name}".strip() or usr.username

            writer.writerow([
                student_name,
                usr.email,
                phone,
                att.test_series.title,
                att.status,
                att.score,
                att.percentage,
                att.correct_count,
                att.wrong_count,
                att.unattempted_count,
                att.started_at.strftime('%Y-%m-%d %H:%M:%S') if att.started_at else "",
                att.submitted_at.strftime('%Y-%m-%d %H:%M:%S') if att.submitted_at else "",
                att.time_taken_seconds,
            ])

        return response


class AdminQuestionCreateView(generics.CreateAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = TestQuestionAdminSerializer
    queryset = TestQuestion.objects.all()

    def perform_create(self, serializer):
        test_series = serializer.validated_data['test_series']
        user = self.request.user
        if not (user.is_superuser or user.is_staff):
            profile = getattr(user, 'profile', None)
            if profile and profile.role == 'educator' and test_series.created_by_id != user.id:
                raise permissions.exceptions.PermissionDenied("You can only add questions to your own test.")

        max_q = test_series.questions.order_by('-question_number').values_list('question_number', flat=True).first() or 0
        q_num = serializer.validated_data.get('question_number') or (max_q + 1)
        instance = serializer.save(question_number=q_num, order=q_num)
        test_series.questions_count = test_series.questions.count()
        test_series.save(update_fields=['questions_count'])
        return instance


class AdminQuestionUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrEducator]
    serializer_class = TestQuestionAdminSerializer
    queryset = TestQuestion.objects.all()
    lookup_field = 'id'

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        if not (user.is_superuser or user.is_staff):
            profile = getattr(user, 'profile', None)
            if profile and profile.role == 'educator' and obj.test_series.created_by_id != user.id:
                self.permission_denied(request, message="You can only edit questions in your own test.")

    def perform_destroy(self, instance):
        test_series = instance.test_series
        instance.delete()
        test_series.questions_count = test_series.questions.count()
        test_series.save(update_fields=['questions_count'])


# ── Bulk Question Import with Preview, Replace & Append Modes ───────────────

class BulkQuestionImportView(APIView):
    """
    POST /api/assessments/<slug>/bulk-import/
    Bulk question import supporting CSV, XLSX, DOCX, text-based PDF, and JSON.
    Parameters:
      - preview=true|false
      - mode=append|replace (replace is rejected with 409 if attempts exist)
    """
    permission_classes = [IsAdminOrEducator]

    def post(self, request, slug):
        test_series = get_object_or_404(TestSeries, slug=slug)

        user = request.user
        if not (user.is_superuser or user.is_staff):
            profile = getattr(user, 'profile', None)
            if profile and profile.role == 'educator' and test_series.created_by_id != user.id:
                return Response(
                    {'error': 'Permission denied: educators can only manage and import into tests they created.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        preview_mode = request.data.get('preview', False)
        if isinstance(preview_mode, str):
            preview_mode = preview_mode.lower() in ('true', '1')

        mode = request.data.get('mode', 'append').lower()
        if mode not in ('append', 'replace'):
            mode = 'append'

        # If mode is replace and attempts exist, refuse with 409
        if mode == 'replace':
            has_attempts = UserTestAttempt.objects.filter(test_series=test_series).exists()
            if has_attempts:
                return Response(
                    {'error': 'Cannot replace questions in a test series that already has student attempts. Use append mode.'},
                    status=status.HTTP_409_CONFLICT
                )

        file_obj = request.FILES.get('file')
        raw_json = request.data.get('questions_json')

        max_upload_size = getattr(settings, 'MAX_UPLOAD_SIZE_BYTES', 500 * 1024 * 1024)
        max_upload_mb = getattr(settings, 'MAX_UPLOAD_SIZE_MB', 500)
        if file_obj and hasattr(file_obj, 'size') and file_obj.size > max_upload_size:
            return Response(
                {'error': f'Uploaded file exceeds the maximum allowed size of {max_upload_mb}MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        candidates = []
        parsing_errors = []
        parsing_warnings = []

        if file_obj:
            candidates, parsing_errors, parsing_warnings = DocumentQuestionParser.parse_file(
                file_obj, test_series=test_series, user=request.user
            )
        elif raw_json:
            try:
                parsed_data = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
                if isinstance(parsed_data, dict) and 'questions' in parsed_data:
                    raw_items = parsed_data['questions']
                elif isinstance(parsed_data, list):
                    raw_items = parsed_data
                else:
                    raw_items = []
                    parsing_errors.append({'row': 0, 'question': 'Payload', 'errors': ['Expected JSON list or object with "questions".']})
                if raw_items:
                    candidates, parsing_errors, parsing_warnings = DocumentQuestionParser._map_table_rows(raw_items, format_type='json')
            except Exception as e:
                parsing_errors.append({'row': 0, 'question': 'JSON Syntax', 'errors': [f'Invalid JSON payload: {str(e)}']})
        else:
            return Response({'error': 'No file or questions_json provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if parsing_errors:
            return Response({
                'total_rows': 0,
                'valid_count': 0,
                'invalid_count': len(parsing_errors),
                'errors': parsing_errors,
                'warnings': parsing_warnings,
                'is_preview': preview_mode,
                'mode': mode,
                'skipped_duplicates': 0,
            }, status=status.HTTP_400_BAD_REQUEST)

        if not candidates:
            return Response({'error': 'No question rows found in file/payload.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_rows = []
        validation_errors = []
        validation_warnings = list(parsing_warnings)
        skipped_duplicates = 0

        # In replace mode, existing DB questions don't trigger duplicate check
        if mode == 'replace':
            existing_questions = set()
        else:
            existing_questions = set(
                normalize_for_comparison(q)
                for q in test_series.questions.values_list('question', flat=True) if q
            )

        for idx, cand in enumerate(candidates, start=1):
            cleaned, errs, warns, is_dup = QuestionValidator.validate_candidate(
                cand, existing_questions, idx, mode=mode
            )
            if warns:
                validation_warnings.extend(warns)

            if is_dup:
                skipped_duplicates += 1
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
                    existing_questions.add(normalize_for_comparison(cleaned['question_en']))

        needs_review_count = sum(1 for q in valid_rows if q.get('needs_review') or not q.get('correct_option'))
        detected_images_count = sum(1 for q in valid_rows if '[[IMG:' in f"{q.get('question_en','')} {q.get('option_a_en','')} {q.get('option_b_en','')} {q.get('option_c_en','')} {q.get('option_d_en','')} {q.get('explanation_en','')}")

        summary = {
            'total_rows': len(candidates),
            'valid_count': len(valid_rows),
            'invalid_count': len(validation_errors),
            'skipped_duplicates': skipped_duplicates,
            'total_detected': len(candidates),
            'successfully_extracted': len(valid_rows),
            'needs_review': needs_review_count,
            'images_count': detected_images_count,
            'extraction_errors': len(validation_errors),
            'errors': validation_errors,
            'warnings': validation_warnings,
            'is_preview': preview_mode,
            'mode': mode,
            'will_delete_count': test_series.questions.count() if mode == 'replace' else 0,
            'preview_questions': valid_rows if preview_mode else []
        }

        if preview_mode:
            return Response(summary, status=status.HTTP_200_OK)

        if validation_errors:
            return Response(summary, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            locked_series = TestSeries.objects.select_for_update().get(id=test_series.id)
            if mode == 'replace':
                locked_series.question_images.all().delete()
                locked_series.questions.all().delete()
                start_num = 1
            else:
                current_count = locked_series.questions.count()
                max_q_num = locked_series.questions.order_by('-question_number').values_list('question_number', flat=True).first() or 0
                start_num = max(current_count, max_q_num) + 1

            created_objs = []
            for i, item in enumerate(valid_rows):
                q_num = start_num + i
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
                    marks=item.get('marks'),
                    negative_marks=item.get('negative_marks'),
                    question=item['question'],
                    options_json=item['options_json'],
                    correct_answer=item['correct_answer'],
                    explanation=item['explanation'],
                    order=q_num
                ))

            TestQuestion.objects.bulk_create(created_objs, batch_size=100)

            # Re-fetch created questions to get primary keys and attach QuestionImage records
            saved_questions = locked_series.questions.filter(question_number__gte=start_num).order_by('question_number')
            import re
            from .models import QuestionImage
            for q_obj in saved_questions:
                all_text = f"{q_obj.question_en} {q_obj.option_a_en} {q_obj.option_b_en} {q_obj.option_c_en} {q_obj.option_d_en} {q_obj.explanation_en}"
                uuids = re.findall(r'\[\[IMG:([a-f0-9\-]+)\]\]', all_text, re.I)
                if uuids:
                    QuestionImage.objects.filter(public_id__in=uuids).update(question=q_obj, test_series=locked_series)

            locked_series.questions_count = locked_series.questions.count()
            locked_series.save(update_fields=['questions_count'])

        summary['imported_count'] = len(created_objs)
        summary['new_total_questions'] = locked_series.questions_count
        summary['images_count'] = QuestionImage.objects.filter(test_series=locked_series).count()
        return Response(summary, status=status.HTTP_201_CREATED)


class ImportGenerateTestSeriesView(APIView):
    """
    POST /api/assessments/manage/import-generate/
    Directly parse a document (PDF, Word, CSV, Excel, JSON, TXT, Image)
    and generate a complete TestSeries with scheduling, marks, and all questions.
    """
    permission_classes = [IsAdminOrEducator]

    def post(self, request):
        user = request.user
        preview_mode = request.data.get('preview', False)
        if isinstance(preview_mode, str):
            preview_mode = preview_mode.lower() in ('true', '1')

        file_obj = request.FILES.get('file')
        raw_json = request.data.get('questions_json')

        max_upload_size = getattr(settings, 'MAX_UPLOAD_SIZE_BYTES', 500 * 1024 * 1024)
        max_upload_mb = getattr(settings, 'MAX_UPLOAD_SIZE_MB', 500)
        if file_obj and hasattr(file_obj, 'size') and file_obj.size > max_upload_size:
            return Response(
                {'error': f'Uploaded file exceeds maximum allowed size of {max_upload_mb}MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        candidates = []
        parsing_errors = []
        parsing_warnings = []
        suggested_title = ""

        if file_obj:
            candidates, parsing_errors, parsing_warnings = DocumentQuestionParser.parse_file(
                file_obj, test_series=None, user=request.user
            )
            suggested_title = DocumentQuestionParser.infer_title(getattr(file_obj, 'name', ''))
        elif raw_json:
            try:
                parsed_data = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
                if isinstance(parsed_data, list):
                    candidates, parsing_errors = DocumentQuestionParser._map_table_rows(parsed_data, format_type='json')
                else:
                    return Response({'error': 'questions_json must be an array of question objects.'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'error': f'Invalid JSON format: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': 'Please provide a file or questions_json to import.'}, status=status.HTTP_400_BAD_REQUEST)

        # In preview mode, return candidates immediately for review
        if preview_mode:
            return Response({
                'preview': True,
                'suggested_title': suggested_title or "New Test Series",
                'questions_count': len(candidates),
                'questions': candidates,
                'errors': parsing_errors,
                'warnings': parsing_warnings
            }, status=status.HTTP_200_OK)

        if not candidates and parsing_errors:
            return Response({
                'error': 'Document parsing failed with errors.',
                'errors': parsing_errors,
                'warnings': parsing_warnings
            }, status=status.HTTP_400_BAD_REQUEST)

        if not candidates:
            return Response({
                'error': 'No valid questions could be detected in the uploaded file.',
                'warnings': parsing_warnings
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate candidate rows using QuestionValidator
        valid_rows = []
        validation_errors = []
        existing_questions = set()
        default_marks = request.data.get('default_marks', 4.00)
        default_negative_marks = request.data.get('default_negative_marks', 1.00)

        for idx, cand in enumerate(candidates, start=1):
            cleaned, errs, warns, is_dup = QuestionValidator.validate_candidate(
                cand, existing_questions, idx, mode='append'
            )
            if warns:
                parsing_warnings.extend(warns)
            if is_dup:
                continue
            if errs:
                validation_errors.append({
                    'row': cand.get('row_number', idx),
                    'question': str(cand.get('question_en', '') or cand.get('question_hi', ''))[:60] or f'Row #{idx}',
                    'errors': errs
                })
                continue

            if cleaned:
                m = cleaned.get('marks') or default_marks
                nm = cleaned.get('negative_marks') or default_negative_marks
                try:
                    cleaned['marks'] = Decimal(str(m))
                except Exception:
                    cleaned['marks'] = Decimal('4.00')
                try:
                    cleaned['negative_marks'] = Decimal(str(nm))
                except Exception:
                    cleaned['negative_marks'] = Decimal('1.00')

                cleaned['question'] = cleaned['question_en']
                cleaned['options_json'] = [
                    cleaned['option_a_en'],
                    cleaned['option_b_en'],
                    cleaned['option_c_en'],
                    cleaned['option_d_en']
                ]
                ans_letter = cleaned.get('correct_option', 'A')
                cleaned['correct_answer'] = (ord(ans_letter) - ord('A')) if ans_letter in ('A', 'B', 'C', 'D') else 0
                cleaned['explanation'] = cleaned.get('explanation_en', '')
                valid_rows.append(cleaned)
                existing_questions.add(normalize_for_comparison(cleaned['question_en']))

        if not valid_rows:
            return Response({
                'error': 'None of the questions passed validation.',
                'errors': validation_errors,
                'warnings': parsing_warnings
            }, status=status.HTTP_400_BAD_REQUEST)

        # Test series fields
        title = (request.data.get('title') or suggested_title or 'Imported Test Series').strip()
        exam = (request.data.get('exam') or 'NIMCET').strip()
        category = (request.data.get('category') or 'after-msc-btech').strip()
        duration_minutes = int(request.data.get('duration_minutes') or 60)
        course_id = request.data.get('course') or None
        subject_id = request.data.get('subject') or None
        description = request.data.get('description', '').strip()
        is_paid = request.data.get('is_paid', False)
        if isinstance(is_paid, str):
            is_paid = is_paid.lower() in ('true', '1')
        price = Decimal(str(request.data.get('price', 0.00))) if is_paid else Decimal('0.00')
        is_published = request.data.get('is_published', True)
        if isinstance(is_published, str):
            is_published = is_published.lower() in ('true', '1')

        # Schedule parsing
        starts_at = request.data.get('starts_at') or None
        ends_at = request.data.get('ends_at') or None
        if starts_at and isinstance(starts_at, str):
            try:
                starts_at = timezone.datetime.fromisoformat(starts_at.replace('Z', '+00:00'))
            except Exception:
                starts_at = None
        if ends_at and isinstance(ends_at, str):
            try:
                ends_at = timezone.datetime.fromisoformat(ends_at.replace('Z', '+00:00'))
            except Exception:
                ends_at = None

        max_attempts = request.data.get('max_attempts')
        if max_attempts in ('', None, 'null'):
            max_attempts = None
        else:
            try:
                max_attempts = int(max_attempts)
            except Exception:
                max_attempts = None

        # Generate unique slug
        base_slug = slugify(title)[:100] or 'test-series'
        slug = base_slug
        count = 1
        while TestSeries.objects.filter(slug=slug).exists():
            slug = f"{base_slug[:90]}-{uuid.uuid4().hex[:6]}"

        total_marks = sum(r['marks'] for r in valid_rows)

        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin'])

        integrity_mode = request.data.get('integrity_mode', 'off')
        if integrity_mode not in ['strict', 'warn', 'off']:
            integrity_mode = 'off'

        with transaction.atomic():
            test_series = TestSeries.objects.create(
                slug=slug,
                title=title,
                exam=exam,
                category=category,
                course_id=course_id,
                subject_id=subject_id,
                duration_minutes=duration_minutes,
                total_marks=total_marks,
                questions_count=len(valid_rows),
                default_marks=Decimal(str(default_marks)),
                default_negative_marks=Decimal(str(default_negative_marks)),
                starts_at=starts_at,
                ends_at=ends_at,
                max_attempts=max_attempts,
                integrity_mode=integrity_mode,
                description=description,
                is_paid=is_paid,
                price=price,
                is_published=is_published if is_admin else False,
                created_by=user,
                review_status='approved' if is_admin else 'draft'
            )

            created_objs = []
            for q_num, item in enumerate(valid_rows, start=1):
                created_objs.append(TestQuestion(
                    test_series=test_series,
                    question_number=q_num,
                    subject=item.get('subject') or exam,
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
                    marks=item['marks'],
                    negative_marks=item['negative_marks'],
                    question=item['question'],
                    options_json=item['options_json'],
                    correct_answer=item['correct_answer'],
                    explanation=item['explanation'],
                    order=q_num
                ))

            TestQuestion.objects.bulk_create(created_objs, batch_size=100)

        return Response({
            'message': f'Test series "{test_series.title}" successfully generated with {len(created_objs)} questions.',
            'test': TestSeriesManageSerializer(test_series).data,
            'imported_count': len(created_objs),
            'total_marks': float(total_marks),
            'warnings': parsing_warnings
        }, status=status.HTTP_201_CREATED)


# ── Attempt Lifecycle Views ──────────────────────────────────────────────────

class StartAttemptView(APIView):
    """POST /api/assessments/<slug>/start/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        import time
        test = get_object_or_404(TestSeries, slug=slug)
        for attempt_num in range(3):
            try:
                attempt = start_attempt(request.user, test)
                return Response(InProgressAttemptSerializer(attempt, context={'request': request}).data, status=status.HTTP_200_OK)
            except ExamServiceError as exc:
                return _service_response(exc)
            except Exception as exc:
                if 'database is locked' in str(exc).lower() and attempt_num < 2:
                    time.sleep(0.3 * (attempt_num + 1))
                    continue
                logger.exception("Assessment start failed for slug '%s': %s", slug, exc)
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AttemptDetailView(APIView):
    """GET /api/assessments/attempts/<int:attempt_id>/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, attempt_id):
        attempt = (
            UserTestAttempt.objects
            .select_related('test_series')
            .prefetch_related('answers')
            .filter(id=attempt_id).first()
        )
        if not attempt:
            return Response({'error': 'Attempt not found.'}, status=status.HTTP_404_NOT_FOUND)
        if attempt.user_id != request.user.id and not request.user.is_staff:
            return Response({'error': 'You do not own this attempt.'}, status=status.HTTP_403_FORBIDDEN)
        if attempt.status != AttemptStatus.IN_PROGRESS:
            return Response({'error': 'Attempt is not in progress. Use the result endpoint.'}, status=status.HTTP_409_CONFLICT)
        return Response(InProgressAttemptSerializer(attempt, context={'request': request}).data)


class SaveAnswerView(APIView):
    """POST /api/assessments/attempts/<int:attempt_id>/answer/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        req_ser = SaveAnswerRequestSerializer(data=request.data)
        if not req_ser.is_valid():
            return Response(req_ser.errors, status=status.HTTP_400_BAD_REQUEST)

        vd = req_ser.validated_data
        try:
            answer = save_answer(
                user=request.user,
                attempt_id=attempt_id,
                question_id=vd['question_id'],
                selected_option=vd.get('selected_option'),
                mark_for_review=vd.get('mark_for_review', False),
            )
        except ExamServiceError as exc:
            return _service_response(exc)
        return Response(SaveAnswerResponseSerializer(answer).data, status=status.HTTP_200_OK)


class SubmitAttemptView(APIView):
    """POST /api/assessments/attempts/<int:attempt_id>/submit/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        try:
            attempt = submit_attempt(request.user, attempt_id)
        except ExamServiceError as exc:
            return _service_response(exc)
        attempt = (
            UserTestAttempt.objects
            .select_related('test_series')
            .prefetch_related('answers__question')
            .get(id=attempt.id)
        )
        return Response(AttemptResultSerializer(attempt).data, status=status.HTTP_200_OK)


class AttemptResultView(APIView):
    """GET /api/assessments/attempts/<int:attempt_id>/result/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, attempt_id):
        try:
            attempt = get_attempt_result(request.user, attempt_id)
        except ExamServiceError as exc:
            return _service_response(exc)
        attempt = (
            UserTestAttempt.objects
            .select_related('test_series')
            .prefetch_related('answers__question')
            .get(id=attempt.id)
        )
        return Response(AttemptResultSerializer(attempt).data)


class AttemptIntegrityView(APIView):
    """
    POST /api/assessments/attempts/<int:attempt_id>/integrity/
    Body: {"event": "hidden" | "visible"}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        event = request.data.get("event")
        if event not in ("hidden", "visible"):
            return Response({"error": "Event must be 'hidden' or 'visible'."}, status=status.HTTP_400_BAD_REQUEST)

        res = record_visibility_event(request.user, attempt_id, event)
        return Response(res, status=status.HTTP_200_OK)

from users.models import log_action, Notification
from django.utils import timezone


class TestSeriesSubmitReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        test = generics.get_object_or_404(TestSeries, slug=slug)
        is_admin = request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])
        if not is_admin and test.created_by != request.user:
            return Response({'error': 'You do not own this test.'}, status=status.HTTP_403_FORBIDDEN)

        question_count = TestQuestion.objects.filter(test_series=test).count()
        if question_count < 1:
            return Response({'error': 'Test must have at least 1 question before submitting for review.'}, status=status.HTTP_400_BAD_REQUEST)

        if test.review_status not in ['draft', 'rejected']:
            return Response({'error': f'Cannot submit review from status {test.review_status}.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = test.review_status
        test.review_status = 'pending'
        test.save()

        log_action(
            actor=request.user,
            action='submit_review',
            object_type='test_series',
            object_id=test.id,
            object_title=test.title,
            owner=test.created_by,
            changes={'review_status': [old_status, 'pending']}
        )

        return Response({'message': 'Test submitted for review.', 'review_status': test.review_status})


class TestSeriesReviewDecisionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, slug):
        test = generics.get_object_or_404(TestSeries, slug=slug)
        decision = request.data.get('decision')
        note = request.data.get('note', '').strip()

        if decision not in ['approve', 'reject']:
            return Response({'error': 'decision must be approve or reject.'}, status=status.HTTP_400_BAD_REQUEST)

        if decision == 'reject' and not note:
            return Response({'error': 'A note is required when rejecting content.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = test.review_status
        old_published = test.is_published

        if decision == 'approve':
            test.review_status = 'approved'
            test.is_published = True
            test.reviewed_by = request.user
            test.reviewed_at = timezone.now()
            test.review_note = note
            test.save()

            if test.created_by:
                Notification.objects.create(
                    user=test.created_by,
                    title='Test Series Approved',
                    body=f'Your test "{test.title}" has been approved and is now live!',
                    link=f'/educator/tests'
                )
        else:
            test.review_status = 'rejected'
            test.reviewed_by = request.user
            test.reviewed_at = timezone.now()
            test.review_note = note
            test.save()

            if test.created_by:
                Notification.objects.create(
                    user=test.created_by,
                    title='Test Series Rejected',
                    body=f'Your test "{test.title}" review was rejected: {note}',
                    link=f'/educator/tests'
                )

        log_action(
            actor=request.user,
            action=decision,
            object_type='test_series',
            object_id=test.id,
            object_title=test.title,
            owner=test.created_by,
            changes={
                'review_status': [old_status, test.review_status],
                'is_published': [old_published, test.is_published],
                'note': ['', note]
            }
        )

        return Response({
            'message': f'Test review completed: {decision}.',
            'review_status': test.review_status,
            'is_published': test.is_published
        })


class TestSeriesOwnershipTransferView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, slug=None):
        to_user_id = request.data.get('to_user')
        if not to_user_id:
            return Response({'error': 'to_user is required.'}, status=status.HTTP_400_BAD_REQUEST)

        to_user = generics.get_object_or_404(User, id=to_user_id)

        test_slugs = request.data.get('slugs') or request.data.get('ids')
        if slug:
            test_slugs = [slug]
        elif not test_slugs:
            return Response({'error': 'Specify test slug or slugs/ids list.'}, status=status.HTTP_400_BAD_REQUEST)

        # Allow matching by either slug or id
        tests = TestSeries.objects.filter(models.Q(slug__in=test_slugs) | models.Q(id__in=[s for s in test_slugs if str(s).isdigit()]))
        transferred_count = 0

        for test in tests:
            old_owner = test.created_by
            test.created_by = to_user
            test.save()
            transferred_count += 1

            log_action(
                actor=request.user,
                action='transfer_ownership',
                object_type='test_series',
                object_id=test.id,
                object_title=test.title,
                owner=to_user,
                changes={'owner': [old_owner.email if old_owner else None, to_user.email]}
            )

            if old_owner and old_owner != to_user:
                Notification.objects.create(
                    user=old_owner,
                    title='Test Ownership Transferred',
                    body=f'Ownership of "{test.title}" was transferred to {to_user.email} by administrator.',
                    link='/educator/tests'
                )
            Notification.objects.create(
                user=to_user,
                title='Test Ownership Assigned',
                body=f'You have been assigned ownership of test "{test.title}".',
                link='/educator/tests'
            )

        return Response({'message': f'Successfully transferred {transferred_count} test(s) to {to_user.email}.'})


class AdminQuestionImageUploadDeleteView(APIView):
    """
    manage/questions/<int:id>/images/
    POST: upload image for question. Scoped by educator permissions.
    DELETE: delete image by public_id.
    """
    permission_classes = [IsAdminOrEducator]

    def _get_question_and_check_perms(self, request, question_id):
        question = generics.get_object_or_404(TestQuestion.objects.select_related('test_series'), id=question_id)
        user = request.user
        if not (user.is_superuser or user.is_staff):
            profile = getattr(user, 'profile', None)
            if profile and profile.role == 'educator':
                if question.test_series.created_by_id != user.id:
                    self.permission_denied(request, message="Educators can only manage images for their own tests.")
        return question

    def post(self, request, id):
        question = self._get_question_and_check_perms(request, id)
        img_file = request.FILES.get('image') or request.FILES.get('file')
        if not img_file:
            return Response({'error': 'No image file provided in request.'}, status=status.HTTP_400_BAD_REQUEST)

        from .image_processing import process_question_image, ImageValidationError
        raw_bytes = img_file.read()
        try:
            processed = process_question_image(raw_bytes, source_name=img_file.name)
        except ImageValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not processed:
            return Response({'error': 'Image is too small or invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        proc_bytes, mime, w, h, content_hash = processed
        from django.core.files.uploadedfile import SimpleUploadedFile
        ext = 'png' if 'png' in mime else 'jpg'
        upload_file = SimpleUploadedFile(f"{uuid.uuid4().hex}.{ext}", proc_bytes, content_type=mime)

        q_img = QuestionImage.objects.create(
            question=question,
            test_series=question.test_series,
            image=upload_file,
            width=w,
            height=h,
            source_name=img_file.name,
            content_hash=content_hash,
            created_by=request.user
        )

        return Response({
            'id': q_img.id,
            'public_id': str(q_img.public_id),
            'url': request.build_absolute_uri(q_img.image.url),
            'width': q_img.width,
            'height': q_img.height,
            'marker': f"[[IMG:{q_img.public_id}]]"
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, id):
        question = self._get_question_and_check_perms(request, id)
        public_id = request.data.get('public_id') or request.query_params.get('public_id')
        if not public_id:
            return Response({'error': 'public_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        img = QuestionImage.objects.filter(question=question, public_id=public_id).first()
        if not img:
            return Response({'error': 'Image not found for this question.'}, status=status.HTTP_404_NOT_FOUND)

        img.delete()
        return Response({'message': 'Image deleted successfully.'}, status=status.HTTP_200_OK)
