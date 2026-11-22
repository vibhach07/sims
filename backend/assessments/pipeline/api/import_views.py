"""
API Views for Bulk Import Pipeline
Endpoints for uploading files, polling job status, re-cropping figures, and publishing tests.
"""
import uuid
import threading
from decimal import Decimal
from django.utils.text import slugify
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from ..services.import_service import ImportPipelineService
from ..services.storage import save_uploaded_file
from ..services.auto_crop import crop_image_box
from ..jobs.import_job import create_job, get_job, set_job_result, set_job_error
from assessments.models import TestSeries, TestQuestion


class PipelineUploadView(APIView):
    """
    POST /api/assessments/pipeline/upload/
    Uploads a document (PDF, Word, Excel, CSV, Image) and launches parsing pipeline.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        job_id = uuid.uuid4().hex[:12]
        saved_path = save_uploaded_file(uploaded_file)
        create_job(job_id, uploaded_file.name)

        # Execute in worker thread for responsive progress polling
        def run_pipeline():
            try:
                res = ImportPipelineService.execute_pipeline(
                    saved_path,
                    uploaded_file.name,
                    job_id=job_id
                )
                set_job_result(job_id, res)
            except Exception as e:
                set_job_error(job_id, str(e))

        t = threading.Thread(target=run_pipeline, daemon=True)
        t.start()

        # Join up to 1.5 seconds so fast documents return synchronously
        t.join(timeout=1.5)

        job_data = get_job(job_id)
        return Response({
            'job_id': job_id,
            'status': job_data['status'] if job_data else 'processing',
            'progress': job_data['progress'] if job_data else 10,
            'message': job_data['message'] if job_data else 'Processing...',
            'result': job_data.get('result') if job_data else None
        }, status=status.HTTP_200_OK)


class PipelineJobStatusView(APIView):
    """
    GET /api/assessments/pipeline/status/<job_id>/
    Polls processing progress.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        job = get_job(job_id)
        if not job:
            return Response({'error': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(job, status=status.HTTP_200_OK)


class PipelineCropView(APIView):
    """
    POST /api/assessments/pipeline/crop/
    Allows manual re-cropping of a diagram or formula region.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image_file = request.FILES.get('image')
        box_data = {
            'x': float(request.data.get('x', 0)),
            'y': float(request.data.get('y', 0)),
            'width': float(request.data.get('width', 100)),
            'height': float(request.data.get('height', 100))
        }
        if not image_file:
            return Response({'error': 'Image file required.'}, status=status.HTTP_400_BAD_REQUEST)

        img_bytes = image_file.read()
        cropped_url = crop_image_box(img_bytes, box_data)
        if not cropped_url:
            return Response({'error': 'Failed to crop image.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'image_url': cropped_url}, status=status.HTTP_200_OK)


class PipelinePublishView(APIView):
    """
    POST /api/assessments/pipeline/publish/
    Creates the final TestSeries and TestQuestion instances using existing models.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        title = (data.get('title') or '').strip()
        if not title:
            return Response({'error': 'Test title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        exam = data.get('exam', 'GATE')
        category = data.get('category', 'after-msc-btech')
        duration_minutes = int(data.get('duration_minutes', 60))
        default_marks = Decimal(str(data.get('default_marks', 4.0)))
        default_negative_marks = Decimal(str(data.get('default_negative_marks', 1.0)))
        starts_at = data.get('starts_at') or None
        ends_at = data.get('ends_at') or None
        integrity_mode = data.get('integrity_mode', 'off')
        if integrity_mode not in ['strict', 'warn', 'off']:
            integrity_mode = 'off'

        is_paid = bool(data.get('is_paid', False))
        price = Decimal(str(data.get('price', '0.00')))
        is_published = bool(data.get('is_published', True))
        max_attempts = data.get('max_attempts')
        if max_attempts in [None, '', '0', 0]:
            max_attempts = None
        else:
            try:
                max_attempts = int(max_attempts)
            except Exception:
                max_attempts = None

        questions_data = data.get('questions', [])
        if not questions_data:
            return Response({'error': 'No questions to publish.'}, status=status.HTTP_400_BAD_REQUEST)

        # Unique slug
        base_slug = slugify(title)[:100] or 'test-series'
        slug = base_slug
        while TestSeries.objects.filter(slug=slug).exists():
            slug = f"{base_slug[:90]}-{uuid.uuid4().hex[:6]}"

        total_marks = Decimal('0.0')
        for q in questions_data:
            m = q.get('marks')
            total_marks += Decimal(str(m)) if m is not None else default_marks

        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin'])

        with transaction.atomic():
            test_series = TestSeries.objects.create(
                slug=slug,
                title=title,
                exam=exam,
                category=category,
                duration_minutes=duration_minutes,
                total_marks=total_marks,
                questions_count=len(questions_data),
                default_marks=default_marks,
                default_negative_marks=default_negative_marks,
                starts_at=starts_at,
                ends_at=ends_at,
                max_attempts=max_attempts,
                integrity_mode=integrity_mode,
                description=data.get('description', ''),
                is_paid=is_paid,
                price=price,
                is_published=is_published if is_admin else False,
                created_by=user,
                review_status='approved' if is_admin else 'draft'
            )

            created_objs = []
            for idx, q in enumerate(questions_data, start=1):
                correct_letter = (q.get('correct_option') or 'A').upper()
                if correct_letter not in ['A', 'B', 'C', 'D']:
                    correct_letter = 'A'
                correct_idx = ord(correct_letter) - ord('A')

                q_marks = Decimal(str(q.get('marks'))) if q.get('marks') is not None else default_marks
                q_neg = Decimal(str(q.get('negative_marks'))) if q.get('negative_marks') is not None else default_negative_marks

                opt_a = q.get('option_a_en') or 'Option A'
                opt_b = q.get('option_b_en') or 'Option B'
                opt_c = q.get('option_c_en') or 'Option C'
                opt_d = q.get('option_d_en') or 'Option D'

                created_objs.append(TestQuestion(
                    test_series=test_series,
                    question_number=idx,
                    subject=q.get('subject') or 'General',
                    question_en=q.get('question_en', ''),
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
                    explanation_en=q.get('explanation_en', ''),
                    explanation_hi=q.get('explanation_hi'),
                    marks=q_marks,
                    negative_marks=q_neg,
                    question=q.get('question_en', ''),
                    options_json=[opt_a, opt_b, opt_c, opt_d],
                    correct_answer=correct_idx,
                    explanation=q.get('explanation_en', ''),
                    order=idx
                ))

            TestQuestion.objects.bulk_create(created_objs, batch_size=100)

        return Response({
            'success': True,
            'message': f"Test series '{test_series.title}' created with {len(created_objs)} questions.",
            'test_slug': test_series.slug,
            'test_id': test_series.id,
            'questions_count': len(created_objs)
        }, status=status.HTTP_201_CREATED)

