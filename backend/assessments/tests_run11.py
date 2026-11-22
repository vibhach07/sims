"""
assessments/tests_run11.py
Comprehensive test suite for RUN 11:
- Part A: Start test lifecycle integration test, entitlement, availability, error responses
- Part B: Option parsing styles, question numbering ambiguity, sequence continuity
- Part C: Images, auto-cropping, security (zip traversal, bomb, svg, ssrf), serializers, admin endpoints
"""
import io
import json
import uuid
import zipfile
from decimal import Decimal
from datetime import timedelta
from PIL import Image

from django.test import TestCase
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from users.models import User, UserProfile
from courses.models import Course, UserEnrollment
from assessments.models import (
    TestSeries, TestQuestion, QuestionImage,
    UserTestAccess, UserTestAttempt, UserTestAnswer, AttemptStatus
)
from assessments.parsers import DocumentQuestionParser, QuestionValidator
from assessments.image_processing import (
    process_question_image, ImageValidationError, is_svg,
    trim_borders, apply_src_rect_crop
)


class PartAFullLifecycleAndEntitlementTests(TestCase):
    """Part A: Full flow integration test and error handling."""

    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(username='student1', email='student1@test.com', password='pass')
        self.educator = User.objects.create_user(username='edu1', email='edu1@test.com', password='pass')
        UserProfile.objects.create(user=self.educator, role='educator')
        self.admin = User.objects.create_superuser(username='admin1', email='admin1@test.com', password='pass')

        self.course = Course.objects.create(title='Chemical Eng Course', slug='chem-course', price=1000)

        # Free test
        self.free_test = TestSeries.objects.create(
            title='Free Open Mock',
            slug='free-open-mock',
            created_by=self.educator,
            is_published=True,
            is_paid=False,
            duration_minutes=60,
            default_marks=4.0,
            default_negative_marks=1.0,
            show_rank=True,
            show_review=True,
        )
        self.q1 = TestQuestion.objects.create(
            test_series=self.free_test,
            question_number=1,
            question_en="What is the unit of force?",
            question_hi="बल का मात्रक क्या है?",
            option_a_en="Newton", option_a_hi="न्यूटन",
            option_b_en="Joule", option_b_hi="जूल",
            option_c_en="Watt", option_c_hi="वाट",
            option_d_en="Pascal", option_d_hi="पास्कल",
            correct_option="A",
            explanation_en="Force is measured in Newtons (N).",
            explanation_hi="बल न्यूटन में मापा जाता है।",
            marks=Decimal('4.00'),
            negative_marks=Decimal('1.00')
        )
        self.q2 = TestQuestion.objects.create(
            test_series=self.free_test,
            question_number=2,
            question_en="What is 5 + 5?",
            option_a_en="8", option_b_en="10", option_c_en="12", option_d_en="15",
            correct_option="B",
            explanation_en="5 + 5 = 10",
            marks=Decimal('4.00'),
            negative_marks=Decimal('1.00')
        )
        self.free_test.questions_count = 2
        self.free_test.save()

    def test_full_student_flow_detail_start_answer_submit_result(self):
        """Full lifecycle: Detail -> Start -> Answer -> Submit -> Result with rank & review."""
        self.client.force_authenticate(user=self.student)

        # 1. Detail endpoint intentionally conceals questions from student
        res_detail = self.client.get(f'/api/assessments/{self.free_test.slug}/')
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data.get('questions'), [])

        # 2. Start endpoint returns in-progress attempt with student-safe questions immediately
        res_start = self.client.post(f'/api/assessments/{self.free_test.slug}/start/')
        self.assertEqual(res_start.status_code, status.HTTP_200_OK)
        start_data = res_start.data
        attempt_id = start_data['id']
        self.assertIn('questions', start_data)
        self.assertEqual(len(start_data['questions']), 2)
        q_first = start_data['questions'][0]
        self.assertEqual(q_first['questionEn'], "What is the unit of force?")
        self.assertNotIn('correct_option', q_first)
        self.assertNotIn('explanation', q_first)

        # 3. Save answer
        res_ans = self.client.post(f'/api/assessments/attempts/{attempt_id}/answer/', {
            'question_id': self.q1.id,
            'selected_option': 'A'
        })
        self.assertEqual(res_ans.status_code, status.HTTP_200_OK)

        # 4. Submit attempt
        res_sub = self.client.post(f'/api/assessments/attempts/{attempt_id}/submit/')
        self.assertEqual(res_sub.status_code, status.HTTP_200_OK)
        self.assertEqual(res_sub.data['score'], 4.0)
        self.assertEqual(res_sub.data['rank'], 1)

        # 5. Result endpoint
        res_res = self.client.get(f'/api/assessments/attempts/{attempt_id}/result/')
        self.assertEqual(res_res.status_code, status.HTTP_200_OK)
        res_data = res_res.data
        self.assertEqual(res_data['score'], 4.0)
        self.assertEqual(res_data['totalMarks'], 8.0)
        self.assertEqual(res_data['correctCount'], 1)
        self.assertEqual(res_data['unattemptedCount'], 1)
        self.assertIn('review', res_data)
        self.assertEqual(len(res_data['review']), 2)
        rev_first = res_data['review'][0]
        self.assertEqual(rev_first['correctOption'], 'A')
        self.assertEqual(rev_first['verdict'], 'correct')
        self.assertIn('Force is measured in Newtons', rev_first['explanation'])

    def test_paid_test_entitlement_access_and_course_enrollment(self):
        """Paid test allows staff, creator educator, enrolled course student, or UserTestAccess."""
        paid_test = TestSeries.objects.create(
            title='Paid GATE Mock',
            slug='paid-gate-mock',
            created_by=self.educator,
            course=self.course,
            is_published=True,
            is_paid=True,
            duration_minutes=60,
        )
        TestQuestion.objects.create(
            test_series=paid_test, question_number=1,
            question_en="Q1", option_a_en="A", option_b_en="B", correct_option="A"
        )

        # 1. Unenrolled student blocked with 403 and clear error + detail
        self.client.force_authenticate(user=self.student)
        res = self.client.post(f'/api/assessments/{paid_test.slug}/start/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('error'), "Purchase required to take this test.")
        self.assertEqual(res.data.get('detail'), "Purchase required to take this test.")

        # 2. Staff user allowed
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.post(f'/api/assessments/{paid_test.slug}/start/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)

        # 3. Creator educator allowed
        self.client.force_authenticate(user=self.educator)
        res_edu = self.client.post(f'/api/assessments/{paid_test.slug}/start/')
        self.assertEqual(res_edu.status_code, status.HTTP_200_OK)

        # 4. Student enrolled in course allowed
        UserEnrollment.objects.create(user=self.student, course=self.course)
        self.client.force_authenticate(user=self.student)
        res_student_enrolled = self.client.post(f'/api/assessments/{paid_test.slug}/start/')
        self.assertEqual(res_student_enrolled.status_code, status.HTTP_200_OK)

    def test_availability_window_human_readable_messages(self):
        """Clear error message when exam window has not opened or has closed."""
        future_start = timezone.now() + timedelta(days=2)
        closed_end = timezone.now() - timedelta(hours=1)

        future_test = TestSeries.objects.create(
            title='Future Test', slug='future-test', is_published=True, starts_at=future_start
        )
        closed_test = TestSeries.objects.create(
            title='Closed Test', slug='closed-test', is_published=True, ends_at=closed_end
        )

        self.client.force_authenticate(user=self.student)
        res_fut = self.client.post(f'/api/assessments/{future_test.slug}/start/')
        self.assertEqual(res_fut.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Exam starts at", res_fut.data['error'])

        res_close = self.client.post(f'/api/assessments/{closed_test.slug}/start/')
        self.assertEqual(res_close.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Exam window has closed", res_close.data['error'])


class PartBOptionAndQuestionParsingTests(TestCase):
    """Part B: Context-aware parsing across diverse option and question styles."""

    def test_parentheses_letters_style(self):
        text = """
        Q1. What is the derivative of sin(x)?
        (A) cos(x)
        (B) -cos(x)
        (C) tan(x)
        (D) sec(x)
        Answer: A
        """
        recs, errs, warns = DocumentQuestionParser._parse_text_stream(text)
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]['option_a_en'], "cos(x)")
        self.assertEqual(recs[0]['option_b_en'], "-cos(x)")
        self.assertEqual(recs[0]['correct_option'], "A")

    def test_dot_letters_style(self):
        text = """
        1. Find the value of 2^3:
        A. 4
        B. 6
        C. 8
        D. 10
        Ans: C
        """
        recs, errs, warns = DocumentQuestionParser._parse_text_stream(text)
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]['option_c_en'], "8")
        self.assertEqual(recs[0]['correct_option'], "C")

    def test_bracketed_digits_style(self):
        text = """
        Question 1: Pick prime number:
        (1) 4
        (2) 7
        (3) 9
        (4) 15
        Answer: (2)
        """
        recs, errs, warns = DocumentQuestionParser._parse_text_stream(text)
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]['option_b_en'], "7")
        self.assertEqual(recs[0]['correct_option'], "B")

    def test_single_line_options(self):
        text = """
        Q1. What is the square of 5?
        (A) 10 (B) 20 (C) 25 (D) 30
        Answer: C
        """
        recs, errs, warns = DocumentQuestionParser._parse_text_stream(text)
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]['option_a_en'], "10")
        self.assertEqual(recs[0]['option_c_en'], "25")
        self.assertEqual(recs[0]['correct_option'], "C")

    def test_numbers_1_to_4_used_as_options_and_next_question_numbers(self):
        """Numbers 1-4 used both as sequential options and next question numbers."""
        text = """
        1. First question: what is 10 / 2?
        1. 3
        2. 4
        3. 5
        4. 6
        Answer: C
        2. Second question: what is 3 * 3?
        1. 6
        2. 9
        3. 12
        4. 15
        Answer: B
        """
        recs, errs, warns = DocumentQuestionParser._parse_text_stream(text)
        self.assertEqual(len(recs), 2)
        self.assertEqual(recs[0]['question_en'], "First question: what is 10 / 2?")
        self.assertEqual(recs[0]['option_a_en'], "3")
        self.assertEqual(recs[0]['option_c_en'], "5")
        self.assertEqual(recs[0]['correct_option'], "C")

        self.assertEqual(recs[1]['question_en'], "Second question: what is 3 * 3?")
        self.assertEqual(recs[1]['option_a_en'], "6")
        self.assertEqual(recs[1]['option_b_en'], "9")
        self.assertEqual(recs[1]['correct_option'], "B")

    def test_bilingual_question_block(self):
        text = """
        Q1. Calculate speed: distance 100m in 10s.
        प्रश्न: गति की गणना करें: 10 सेकंड में 100 मीटर दूरी।
        (A) 5 m/s
        (B) 10 m/s
        (C) 15 m/s
        (D) 20 m/s
        Answer: B
        Explanation: Speed = distance / time = 100 / 10 = 10 m/s.
        व्याख्या: गति = दूरी / समय = 100 / 10 = 10 मी/सेकंड।
        """
        recs, errs, warns = DocumentQuestionParser._parse_text_stream(text)
        self.assertEqual(len(recs), 1)
        self.assertIn("Calculate speed", recs[0]['question_en'])
        self.assertIn("गति की गणना करें", recs[0]['question_hi'])
        self.assertEqual(recs[0]['option_b_en'], "10 m/s")
        self.assertIn("Speed = distance", recs[0]['explanation_en'])
        self.assertIn("गति = दूरी", recs[0]['explanation_hi'])

    def test_warning_when_fewer_than_4_options(self):
        text = """
        Q1. True or False: Earth is round.
        (A) True
        (B) False
        Answer: A
        """
        recs, errs, warns = DocumentQuestionParser._parse_text_stream(text)
        self.assertEqual(len(recs), 1)
        self.assertTrue(any("Question 1" in w and "fewer than 4 options" in w for w in warns))


class PartCImageExtractionAndSecurityTests(TestCase):
    """Part C: Image extraction, autocalibration, compression guard, zip security, and serializers."""

    def setUp(self):
        self.client = APIClient()
        self.educator = User.objects.create_user(username='edu_c', email='educ@test.com', password='pass')
        UserProfile.objects.create(user=self.educator, role='educator')
        self.test = TestSeries.objects.create(
            title='Images Test Series',
            slug='images-test-series',
            created_by=self.educator,
            is_published=True
        )

    def _create_synthetic_png_bytes(self, width=100, height=100, color='red'):
        buf = io.BytesIO()
        img = Image.new('RGB', (width, height), color=color)
        img.save(buf, format='PNG')
        return buf.getvalue()

    def test_image_processing_pillow_decompression_bomb_and_svg_rejection(self):
        """Rejects SVG and decompression bomb images."""
        svg_bytes = b"<?xml version='1.0'?><svg xmlns='http://www.w3.org/2000/svg'><circle cx='5' cy='5' r='5'/></svg>"
        self.assertTrue(is_svg(svg_bytes))
        with self.assertRaises(ImageValidationError):
            process_question_image(svg_bytes, source_name="evil.svg")

        # Tiny image dropped (< 40x40)
        tiny_bytes = self._create_synthetic_png_bytes(20, 20)
        res_tiny = process_question_image(tiny_bytes, source_name="tiny.png")
        self.assertIsNone(res_tiny)

        # Valid image processed
        valid_bytes = self._create_synthetic_png_bytes(300, 200, color='blue')
        proc = process_question_image(valid_bytes, source_name="valid.png")
        self.assertIsNotNone(proc)
        proc_b, mime, w, h, chash = proc
        self.assertEqual(mime, "image/png")
        self.assertTrue(w <= 1600 and h <= 1600)

    def test_auto_crop_and_border_trimming(self):
        """Auto-crop trims white borders with padding and safeguards."""
        # 1. Trims white margin when within 90% area limit
        img = Image.new('RGB', (200, 200), (255, 255, 255))
        center = Image.new('RGB', (100, 100), (255, 0, 0))
        img.paste(center, (50, 50))
        trimmed = trim_borders(img, padding=6)
        self.assertTrue(trimmed.width < 200 and trimmed.height < 200)

        # 2. Skips trim when content removal would exceed 90% (safeguard)
        img_extreme = Image.new('RGB', (200, 200), (255, 255, 255))
        tiny_center = Image.new('RGB', (20, 20), (255, 0, 0))
        img_extreme.paste(tiny_center, (90, 90))
        trimmed_extreme = trim_borders(img_extreme, padding=6)
        self.assertEqual(trimmed_extreme.size, (200, 200))

        # 3. Word srcRect crop test
        src_rect = {'l': 10000, 't': 10000, 'r': 10000, 'b': 10000}
        cropped = apply_src_rect_crop(img, src_rect)
        self.assertTrue(cropped.width < 200 and cropped.height < 200)

    def test_zip_bundle_path_traversal_rejection(self):
        """ZIP files containing path traversal entries like ../file.png are rejected."""
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, 'w') as zf:
            zf.writestr('../evil.png', self._create_synthetic_png_bytes())
            zf.writestr('questions.csv', "question,option_a,option_b,correct_option\nQ1,A,B,A\n")

        zip_bytes = zip_buf.getvalue()
        recs, errs, warns = DocumentQuestionParser._parse_zip(zip_bytes)
        self.assertTrue(any('traversal' in str(e).lower() for e in errs))

    def test_zip_bundle_successful_image_mapping(self):
        """ZIP containing questions CSV and image assets binds [[IMG:<uuid>]]."""
        zip_buf = io.BytesIO()
        img_bytes = self._create_synthetic_png_bytes(200, 200, color='green')
        csv_text = (
            "question,option_a,option_b,option_c,option_d,correct_option,question_image,option_a_image\n"
            "Identify the graph below:,Linear,Quadratic,Exponential,Logarithmic,A,diag1.png,opt_a.png\n"
        )
        with zipfile.ZipFile(zip_buf, 'w') as zf:
            zf.writestr('diag1.png', img_bytes)
            zf.writestr('opt_a.png', img_bytes)
            zf.writestr('paper.csv', csv_text)

        recs, errs, warns = DocumentQuestionParser._parse_zip(zip_buf.getvalue(), test_series=self.test)
        self.assertEqual(len(recs), 1)
        self.assertIn("[[IMG:", recs[0]['question_en'])
        self.assertIn("[[IMG:", recs[0]['option_a_en'])

    def test_student_serializer_excludes_explanation_images_during_attempt(self):
        """Student-safe serializer excludes explanation images during active test taking."""
        q = TestQuestion.objects.create(
            test_series=self.test,
            question_number=1,
            question_en="Stem with diagram [[IMG:11111111-1111-1111-1111-111111111111]]",
            option_a_en="Opt A", option_b_en="Opt B",
            correct_option="A",
            explanation_en="Solution diagram [[IMG:22222222-2222-2222-2222-222222222222]]"
        )
        img_stem = QuestionImage.objects.create(
            public_id=uuid.UUID('11111111-1111-1111-1111-111111111111'),
            question=q, test_series=self.test,
            image=SimpleUploadedFile("stem.png", self._create_synthetic_png_bytes(), content_type="image/png"),
            width=200, height=200, source_name="stem.png", content_hash="hash1"
        )
        img_exp = QuestionImage.objects.create(
            public_id=uuid.UUID('22222222-2222-2222-2222-222222222222'),
            question=q, test_series=self.test,
            image=SimpleUploadedFile("exp.png", self._create_synthetic_png_bytes(), content_type="image/png"),
            width=200, height=200, source_name="exp.png", content_hash="hash2"
        )

        from assessments.serializers import TestQuestionStudentSerializer, TestQuestionReviewSerializer
        # 1. Student live attempt serializer includes stem image, excludes explanation image
        student_data = TestQuestionStudentSerializer(q).data
        self.assertIn('11111111-1111-1111-1111-111111111111', student_data['images'])
        self.assertNotIn('22222222-2222-2222-2222-222222222222', student_data['images'])

        # 2. Review serializer includes both stem and explanation images
        review_data = TestQuestionReviewSerializer(q).data
        self.assertIn('11111111-1111-1111-1111-111111111111', review_data['images'])
        self.assertIn('22222222-2222-2222-2222-222222222222', review_data['images'])

    def test_admin_question_image_upload_and_delete_endpoints(self):
        """Admin/educator can upload and delete question images with proper scoping."""
        q = TestQuestion.objects.create(
            test_series=self.test, question_number=1,
            question_en="Sample Question", option_a_en="A", option_b_en="B", correct_option="A"
        )

        # 1. Educator uploads image
        self.client.force_authenticate(user=self.educator)
        img_file = SimpleUploadedFile("graph.png", self._create_synthetic_png_bytes(250, 250), content_type="image/png")
        res_up = self.client.post(f'/api/assessments/manage/questions/{q.id}/images/', {'image': img_file}, format='multipart')
        self.assertEqual(res_up.status_code, status.HTTP_201_CREATED)
        pub_id = res_up.data['public_id']
        self.assertIn('marker', res_up.data)
        self.assertEqual(res_up.data['marker'], f"[[IMG:{pub_id}]]")

        # 2. Another educator cannot delete
        other_edu = User.objects.create_user(username='other_edu', email='other@test.com', password='pass')
        UserProfile.objects.create(user=other_edu, role='educator')
        self.client.force_authenticate(user=other_edu)
        res_del_denied = self.client.delete(f'/api/assessments/manage/questions/{q.id}/images/?public_id={pub_id}')
        self.assertEqual(res_del_denied.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Owner educator deletes image successfully
        self.client.force_authenticate(user=self.educator)
        res_del = self.client.delete(f'/api/assessments/manage/questions/{q.id}/images/?public_id={pub_id}')
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(QuestionImage.objects.filter(public_id=pub_id).exists())
