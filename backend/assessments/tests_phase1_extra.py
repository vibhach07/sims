from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
import io
import docx
from assessments.models import TestSeries, TestQuestion, UserTestAttempt, AttemptStatus, IntegrityMode

User = get_user_model()

class Phase1ExtraTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="student1", email="s1@test.com", password="pw")
        self.staff = User.objects.create_superuser(username="admin", email="a@test.com", password="pw")
        self.test = TestSeries.objects.create(
            title="Math Exam",
            slug="math-exam",
            duration_minutes=10,
            default_marks=4.0,
            default_negative_marks=1.0,
            starts_at=timezone.now() - timedelta(days=1),
            ends_at=timezone.now() + timedelta(days=1),
            is_published=True,
            show_rank=True,
            show_review=True,
            integrity_mode=IntegrityMode.STRICT,
            created_by=self.staff
        )
        self.q1 = TestQuestion.objects.create(
            test_series=self.test,
            question_number=1,
            subject="Math",
            question_en="Q1 with latex",
            option_a_en="A",
            option_b_en="B",
            option_c_en="C",
            option_d_en="D",
            correct_option="A"
        )
        self.test.questions_count = 1
        self.test.save(update_fields=['questions_count'])

    def test_student_gets_empty_questions_in_detail_view(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.get(f"/api/assessments/{self.test.slug}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get("questions"), [])

        # Staff gets questions
        client.force_authenticate(user=self.staff)
        res_admin = client.get(f"/api/assessments/{self.test.slug}/")
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(len(res_admin.data.get("questions")), 1)

    def test_list_view_query_count_upper_bound(self):
        # Create 5 test series
        for i in range(5):
            TestSeries.objects.create(
                title=f"Test {i}",
                slug=f"test-{i}",
                duration_minutes=15,
                default_marks=4.0,
                default_negative_marks=1.0,
                is_published=True,
                created_by=self.staff
            )
        client = APIClient()
        client.force_authenticate(user=self.user)
        # Verify no N+1 queries occur regardless of number of test series
        with self.assertNumQueries(4):
            res = client.get("/api/assessments/")
            self.assertEqual(res.status_code, 200)
            self.assertGreaterEqual(len(res.data), 6)

    def test_latex_stored_byte_for_byte(self):
        latex_q = r"मान ज्ञात कीजिए: $\sqrt{16}$ and $\frac{a}{b}$ and $$\int_0^1 x^2dx$$ and \(x^2\)"
        csv_content = (
            f'question,option_a,option_b,option_c,option_d,answer\n"{latex_q}",A,B,C,D,A\n'
        ).encode('utf-8')
        client = APIClient()
        client.force_authenticate(user=self.staff)
        f_obj = SimpleUploadedFile("latex.csv", csv_content, content_type="text/csv")
        res = client.post(f"/api/assessments/{self.test.slug}/bulk-import/", {"file": f_obj, "mode": "append"}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        imported_q = TestQuestion.objects.filter(test_series=self.test, question_en=latex_q).first()
        self.assertIsNotNone(imported_q)
        self.assertEqual(imported_q.question_en, latex_q)

    def test_docx_superscript_and_equation_warning(self):
        doc = docx.Document()
        p = doc.add_paragraph()
        p.add_run("1. Solve x")
        run2 = p.add_run("2")
        run2.font.superscript = True
        p.add_run(" + y")
        run4 = p.add_run("3")
        run4.font.subscript = True
        p.add_run(" = 0?")
        
        # Add options
        doc.add_paragraph("A) 1\nB) 2\nC) 3\nD) 4\nAnswer: A")
        
        # Add an equation object in a paragraph
        from docx.oxml import OxmlElement
        p_eq = doc.add_paragraph("Q2. Next question")
        omath = OxmlElement('m:oMath')
        p_eq._p.append(omath)
        doc.add_paragraph("A) 1\nB) 2\nC) 3\nD) 4\nAnswer: B")

        docx_io = io.BytesIO()
        doc.save(docx_io)
        docx_bytes = docx_io.getvalue()

        client = APIClient()
        client.force_authenticate(user=self.staff)
        f_obj = SimpleUploadedFile("math.docx", docx_bytes, content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        res = client.post(f"/api/assessments/{self.test.slug}/bulk-import/", {"file": f_obj, "mode": "append"}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertTrue(any("Equation object in" in w for w in data["warnings"]))
        imported = TestQuestion.objects.filter(test_series=self.test, question_en__icontains="x^{2}").first()
        self.assertIsNotNone(imported)
        self.assertIn("x^{2}", imported.question_en)
        self.assertIn("y_{3}", imported.question_en)

    def test_integrity_visibility_events(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        start_res = client.post(f"/api/assessments/{self.test.slug}/start/")
        attempt_id = start_res.data["id"]
        res1 = client.post(f"/api/assessments/attempts/{attempt_id}/integrity/", {"event": "hidden"})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(res1.data["autoSubmitted"])
        attempt = UserTestAttempt.objects.get(id=attempt_id)
        attempt.hidden_at = timezone.now() - timedelta(seconds=5)
        attempt.save(update_fields=["hidden_at"])
        res2 = client.post(f"/api/assessments/attempts/{attempt_id}/integrity/", {"event": "visible"})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data["autoSubmitted"])
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, AttemptStatus.AUTO_SUBMITTED)
        self.assertTrue(attempt.integrity_violation)

    def test_auto_submit_management_command(self):
        expired_att = UserTestAttempt.objects.create(
            user=self.user,
            test_series=self.test,
            status=AttemptStatus.IN_PROGRESS,
            started_at=timezone.now() - timedelta(minutes=20),
            expires_at=timezone.now() - timedelta(minutes=10)
        )
        out = io.StringIO()
        call_command("auto_submit_expired_attempts", stdout=out)
        self.assertIn("auto-submitted 1 expired attempt(s)", out.getvalue())
        expired_att.refresh_from_db()
        self.assertEqual(expired_att.status, AttemptStatus.AUTO_SUBMITTED)

    def test_csv_export_endpoint(self):
        client = APIClient()
        client.force_authenticate(user=self.staff)
        res = client.get("/api/assessments/manage/attempts/export/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "text/csv; charset=utf-8")
        content = res.content.decode("utf-8-sig")
        self.assertIn("Student,Email,Phone,Test,Status,Score", content)

    def test_replace_mode_with_existing_attempts_fails_409(self):
        UserTestAttempt.objects.create(
            user=self.user,
            test_series=self.test,
            status=AttemptStatus.SUBMITTED,
            started_at=timezone.now() - timedelta(minutes=20),
            expires_at=timezone.now() - timedelta(minutes=10)
        )
        client = APIClient()
        client.force_authenticate(user=self.staff)
        csv_lines = ["question,option_a,option_b,option_c,option_d,answer", "New Q,A,B,C,D,A"]
        csv_bytes = "\n".join(csv_lines).encode("utf-8")
        f_obj = SimpleUploadedFile("replace.csv", csv_bytes, content_type="text/csv")
        res = client.post(f"/api/assessments/{self.test.slug}/bulk-import/", {"file": f_obj, "mode": "replace"}, format="multipart")
        self.assertEqual(res.status_code, 409)
        self.assertIn("Cannot replace questions in a test series that already has student attempts", res.json()["error"])
