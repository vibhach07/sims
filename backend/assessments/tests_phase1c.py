import io
import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from assessments.models import TestSeries, TestQuestion, UserTestAttempt, AttemptStatus
from django.utils import timezone
from assessments.parsers import (
    DocumentQuestionParser, QuestionValidator, normalize_correct_option
)
from users.models import UserProfile


class Phase1CParsingUnitTests(TestCase):
    """
    Unit tests for DocumentQuestionParser and QuestionValidator.
    """

    def test_normalize_correct_option_alphabetic(self):
        self.assertEqual(normalize_correct_option("A")[0], "A")
        self.assertEqual(normalize_correct_option("b")[0], "B")
        self.assertEqual(normalize_correct_option("(C)")[0], "C")
        self.assertEqual(normalize_correct_option("Option D")[0], "D")
        self.assertEqual(normalize_correct_option("उत्तर: A")[0], "A")

    def test_normalize_correct_option_legacy_json(self):
        # Legacy JSON integers 0, 1, 2, 3 must strictly map to A, B, C, D
        self.assertEqual(normalize_correct_option(0, format_type='json')[0], "A")
        self.assertEqual(normalize_correct_option(1, format_type='json')[0], "B")
        self.assertEqual(normalize_correct_option(2, format_type='json')[0], "C")
        self.assertEqual(normalize_correct_option(3, format_type='json')[0], "D")

        # Legacy JSON string representations "0", "1", "2", "3"
        self.assertEqual(normalize_correct_option("0", format_type='json')[0], "A")
        self.assertEqual(normalize_correct_option("1", format_type='json')[0], "B")
        self.assertEqual(normalize_correct_option("2", format_type='json')[0], "C")
        self.assertEqual(normalize_correct_option("3", format_type='json')[0], "D")

    def test_normalize_correct_option_docx_and_bracketed_numeric(self):
        # In DOCX / PDF formats, (1)-(4) or 1-4 standard convention
        self.assertEqual(normalize_correct_option("(1)", format_type='docx')[0], "A")
        self.assertEqual(normalize_correct_option("2", format_type='docx')[0], "B")
        self.assertEqual(normalize_correct_option("(3)", format_type='docx')[0], "C")
        self.assertEqual(normalize_correct_option("4", format_type='docx')[0], "D")

    def test_normalize_correct_option_tabular_numeric_ambiguity(self):
        # In CSV/table format, bare 1, 2, 3 is flagged as ambiguous to prevent misgrading
        val, err = normalize_correct_option("1", format_type='table')
        self.assertIsNone(val)
        self.assertIn("Ambiguous numeric answer", err)

        # But bracketed (1)-(4) in table is recognized as documented 1-based index
        self.assertEqual(normalize_correct_option("(1)", format_type='table')[0], "A")
        self.assertEqual(normalize_correct_option("(2)", format_type='table')[0], "B")

    def test_normalize_correct_option_rejects_multiple_correct(self):
        val, err = normalize_correct_option("A, B and D")
        self.assertIsNone(val)
        self.assertIn("Multiple-correct answer", err)

        val, err = normalize_correct_option("A & C")
        self.assertIsNone(val)
        self.assertIn("Multiple-correct answer", err)

    def test_option_contiguity_and_missing_intermediate_option(self):
        # A, C, D present but B is missing -> must be rejected
        candidate = {
            'question_en': 'Sample question?',
            'option_a_en': 'Option A text',
            'option_b_en': '',  # missing!
            'option_c_en': 'Option C text',
            'option_d_en': 'Option D text',
            'answer_raw': 'A'
        }
        res, errs, warns, is_dup = QuestionValidator.validate_candidate(candidate, set(), 1)
        self.assertIsNone(res)
        self.assertTrue(any("Non-contiguous options detected" in e for e in errs))

    def test_correct_answer_referencing_absent_option_rejected(self):
        # Only options A and B provided, but answer claims 'C'
        candidate = {
            'question_en': 'Binary choice question?',
            'option_a_en': 'True',
            'option_b_en': 'False',
            'option_c_en': '',
            'option_d_en': '',
            'answer_raw': 'C'
        }
        res, errs, warns, is_dup = QuestionValidator.validate_candidate(candidate, set(), 1)
        self.assertIsNone(res)
        self.assertTrue(any("references an option that is missing or empty" in e for e in errs))

    def test_csv_bilingual_parsing(self):
        csv_content = (
            "question_number,subject,question_en,question_hi,option_a_en,option_a_hi,"
            "option_b_en,option_b_hi,option_c_en,option_c_hi,option_d_en,option_d_hi,"
            "answer,explanation_en,explanation_hi,marks,negative_marks\n"
            "1,Math,What is 2+2?,2+2 क्या है?,3,३,4,४,5,५,6,६,B,Basic arithmetic,सरल अंकगणित,4.0,1.0\n"
        ).encode('utf-8')
        file_obj = SimpleUploadedFile("test.csv", csv_content, content_type="text/csv")
        questions, errors, warnings = DocumentQuestionParser.parse_file(file_obj)
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(questions), 1)
        q = questions[0]
        self.assertEqual(q['question_en'], "What is 2+2?")
        self.assertEqual(q['question_hi'], "2+2 क्या है?")
        self.assertEqual(q['option_b_hi'], "४")
        self.assertEqual(q['answer_raw'], "B")
        self.assertEqual(q['marks'], "4.0")
        self.assertEqual(q['negative_marks'], "1.0")

    def test_xlsx_parsing(self):
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append([
            "question_number", "subject", "question", "option_a", "option_b",
            "option_c", "option_d", "answer", "explanation"
        ])
        ws.append([
            1, "Physics", "Speed of light is?", "3x10^8 m/s", "3x10^6 m/s",
            "1x10^8 m/s", "None", "A", "Universal constant"
        ])
        bio = io.BytesIO()
        wb.save(bio)
        bio.seek(0)

        file_obj = SimpleUploadedFile("questions.xlsx", bio.read(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        questions, errors, warnings = DocumentQuestionParser.parse_file(file_obj)
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]['question_en'], "Speed of light is?")
        self.assertEqual(questions[0]['answer_raw'], "A")

    def test_docx_parsing_with_table(self):
        import docx
        doc = docx.Document()
        doc.add_paragraph("Q1. What is the powerhouse of the cell?")
        # Add options as table rows
        tbl = doc.add_table(rows=4, cols=1)
        tbl.rows[0].cells[0].text = "(1) Nucleus"
        tbl.rows[1].cells[0].text = "(2) Mitochondria"
        tbl.rows[2].cells[0].text = "(3) Ribosome"
        tbl.rows[3].cells[0].text = "(4) Golgi body"
        doc.add_paragraph("Answer: (2)")
        doc.add_paragraph("Explanation: Mitochondria generate ATP.")

        bio = io.BytesIO()
        doc.save(bio)
        bio.seek(0)

        file_obj = SimpleUploadedFile("bio_table.docx", bio.read(), content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        questions, errors, warnings = DocumentQuestionParser.parse_file(file_obj)
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]['question_en'], "What is the powerhouse of the cell?")
        self.assertEqual(questions[0]['option_b_en'], "Mitochondria")
        self.assertEqual(questions[0]['answer_raw'], "(2)")

    def test_corrupt_files_rejected_by_magic_bytes(self):
        bad_xlsx = SimpleUploadedFile("fake.xlsx", b"not a zip file", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        q, errors, w = DocumentQuestionParser.parse_file(bad_xlsx)
        self.assertEqual(len(errors), 1)
        self.assertIn("valid XLSX zip magic bytes", errors[0]['errors'][0])

        bad_pdf = SimpleUploadedFile("fake.pdf", b"not a pdf", content_type="application/pdf")
        q, errors, w = DocumentQuestionParser.parse_file(bad_pdf)
        self.assertEqual(len(errors), 1)
        self.assertIn("valid PDF magic bytes", errors[0]['errors'][0])


class Phase1CBulkImportAPITests(TestCase):
    """
    Integration tests for two-stage bulk question import API.
    """

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser('admin1c', 'admin1c@example.com', 'pass123')
        self.client.force_authenticate(user=self.admin)

        self.educator_user = User.objects.create_user('educator1c', 'edu1c@example.com', 'pass123')
        UserProfile.objects.create(user=self.educator_user, role='educator')

        self.student = User.objects.create_user('student1c', 'student1c@example.com', 'pass123')

        self.test_series = TestSeries.objects.create(
            slug='nimcet-mock-1c',
            title='NIMCET Mock 1C',
            exam='NIMCET',
            duration_minutes=30,
            total_marks=20,
            questions_count=0,
            created_by=self.admin
        )

    def test_preview_mode_does_not_modify_database(self):
        csv_content = (
            "question,option_a,option_b,option_c,option_d,answer\n"
            "First preview question?,Alpha,Beta,Gamma,Delta,A\n"
            "Second preview question?,Alpha,Beta,Gamma,Delta,B\n"
        ).encode('utf-8')
        file_obj = SimpleUploadedFile("questions.csv", csv_content, content_type="text/csv")

        url = f"/api/assessments/{self.test_series.slug}/bulk-import/"
        res = self.client.post(url, {'file': file_obj, 'preview': 'true'}, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(data['is_preview'])
        self.assertEqual(data['valid_count'], 2)
        self.assertEqual(data['invalid_count'], 0)
        self.assertEqual(len(data['preview_questions']), 2)

        # Database must NOT have any questions
        self.assertEqual(self.test_series.questions.count(), 0)
        self.test_series.refresh_from_db()
        self.assertEqual(self.test_series.questions_count, 0)

    def test_confirm_mode_persists_questions_with_proper_fields(self):
        csv_content = (
            "question_en,question_hi,option_a_en,option_a_hi,option_b_en,option_b_hi,"
            "option_c_en,option_c_hi,option_d_en,option_d_hi,answer,explanation_en,marks,negative_marks\n"
            "What is CPU?,CPU क्या है?,Processor,प्रोसेसर,Memory,मेमोरी,Disk,डिस्क,Screen,स्क्रीन,A,Brain of computer,4.0,1.0\n"
        ).encode('utf-8')
        file_obj = SimpleUploadedFile("questions.csv", csv_content, content_type="text/csv")

        url = f"/api/assessments/{self.test_series.slug}/bulk-import/"
        res = self.client.post(url, {'file': file_obj, 'preview': 'false'}, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data['imported_count'], 1)
        self.assertEqual(data['new_total_questions'], 1)

        # Check in DB
        q = self.test_series.questions.first()
        self.assertIsNotNone(q)
        self.assertEqual(q.question_en, "What is CPU?")
        self.assertEqual(q.question_hi, "CPU क्या है?")
        self.assertEqual(q.option_a_en, "Processor")
        self.assertEqual(q.option_a_hi, "प्रोसेसर")
        self.assertEqual(q.correct_option, "A")
        self.assertEqual(q.correct_answer, 0)  # legacy 0-index sync
        self.assertEqual(q.marks, Decimal("4.00"))
        self.assertEqual(q.negative_marks, Decimal("1.00"))
        self.assertEqual(q.question_number, 1)

    def test_safe_append_mode_and_collision_free_numbering(self):
        # Create an existing question
        TestQuestion.objects.create(
            test_series=self.test_series,
            question_number=1,
            question="Initial question",
            question_en="Initial question",
            option_a_en="A1", option_b_en="B1", option_c_en="C1", option_d_en="D1",
            correct_option="A", correct_answer=0
        )
        self.test_series.questions_count = 1
        self.test_series.save()

        # Import 2 more questions
        csv_content = (
            "question,option_a,option_b,option_c,option_d,answer\n"
            "Appended Q2?,A,B,C,D,B\n"
            "Appended Q3?,A,B,C,D,C\n"
        ).encode('utf-8')
        file_obj = SimpleUploadedFile("append.csv", csv_content, content_type="text/csv")

        url = f"/api/assessments/{self.test_series.slug}/bulk-import/"
        res = self.client.post(url, {'file': file_obj, 'preview': 'false'}, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.json()['imported_count'], 2)
        self.assertEqual(res.json()['new_total_questions'], 3)

        q_nums = list(self.test_series.questions.order_by('question_number').values_list('question_number', flat=True))
        self.assertEqual(q_nums, [1, 2, 3])

    def test_repeated_submission_duplicate_rejection(self):
        # Deliberate change: In append mode, duplicates are SKIPPED with a warning rather than blocking with 400
        csv_content = (
            "question,option_a,option_b,option_c,option_d,answer\nSingle test question?,OptA,OptB,OptC,OptD,A\n"
        ).encode('utf-8')

        url = f"/api/assessments/{self.test_series.slug}/bulk-import/"
        file_obj1 = SimpleUploadedFile("import1.csv", csv_content, content_type="text/csv")
        res1 = self.client.post(url, {'file': file_obj1}, format='multipart')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        file_obj2 = SimpleUploadedFile("import2.csv", csv_content, content_type="text/csv")
        res2 = self.client.post(url, {'file': file_obj2}, format='multipart')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        data2 = res2.json()
        self.assertEqual(data2['skipped_duplicates'], 1)
        self.assertEqual(data2['imported_count'], 0)
        self.assertTrue(any("Duplicate question skipped" in w for w in data2['warnings']))

    def test_educator_cannot_import_into_others_test_series(self):
        # Authenticate as educator
        self.client.force_authenticate(user=self.educator_user)
        # Test series is created by admin
        csv_content = "question,option_a,option_b,option_c,option_d,answer\nQ?,A,B,C,D,A\n".encode('utf-8')
        file_obj = SimpleUploadedFile("edu.csv", csv_content, content_type="text/csv")
        url = f"/api/assessments/{self.test_series.slug}/bulk-import/"
        res = self.client.post(url, {'file': file_obj}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("manage", res.json()['error'])

    def test_educator_can_import_into_own_test_series(self):
        self.test_series.created_by = self.educator_user
        self.test_series.save()

        self.client.force_authenticate(user=self.educator_user)
        csv_content = "question,option_a,option_b,option_c,option_d,answer\nQ Own?,A,B,C,D,A\n".encode('utf-8')
        file_obj = SimpleUploadedFile("edu_own.csv", csv_content, content_type="text/csv")
        url = f"/api/assessments/{self.test_series.slug}/bulk-import/"
        res = self.client.post(url, {'file': file_obj}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_unauthorized_student_access_rejected(self):
        self.client.force_authenticate(user=self.student)
        url = f"/api/assessments/{self.test_series.slug}/bulk-import/"
        res = self.client.post(url, {'questions_json': '[]'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class DjangoAdminBulkImportTests(TestCase):
    """
    Tests for Django Admin bulk import interface:
    - Admin access to import view
    - Non-admin student blocked (redirect or 302/403)
    - Educator permission scoping
    - Stage 1: Preview mode without database writes
    - Stage 2: Confirm mode with atomic commit
    - Reject malformed file
    """

    def setUp(self):
        from django.test import Client
        self.client = Client()
        self.admin = User.objects.create_superuser('admin_dj', 'admin_dj@example.com', 'pass123')
        self.student = User.objects.create_user('student_dj', 'student_dj@example.com', 'pass123')
        self.test_series = TestSeries.objects.create(
            slug='nimcet-admin-test',
            title='NIMCET Admin Test',
            exam='NIMCET',
            duration_minutes=45,
            total_marks=30,
            questions_count=0
        )
        self.import_url = '/admin/assessments/testseries/classic-import/'

    def test_admin_can_access_bulk_import_page(self):
        self.client.force_login(self.admin)
        res = self.client.get(self.import_url)
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Bulk Question Import")
        self.assertContains(res, "NIMCET Admin Test")

    def test_anonymous_and_student_cannot_access_admin_import(self):
        # Anonymous
        res_anon = self.client.get(self.import_url)
        self.assertEqual(res_anon.status_code, 302)  # Redirect to admin login

        # Student user
        self.client.force_login(self.student)
        res_stud = self.client.get(self.import_url)
        self.assertEqual(res_stud.status_code, 302)  # Admin rejects non-staff

    def test_admin_import_preview_does_not_write_to_db(self):
        self.client.force_login(self.admin)
        csv_content = (
            "question,option_a,option_b,option_c,option_d,answer\n"
            "Admin Preview Question?,OptA,OptB,OptC,OptD,A\n"
        ).encode('utf-8')
        file_obj = SimpleUploadedFile("admin_test.csv", csv_content, content_type="text/csv")

        post_data = {
            'action_type': 'preview',
            'test_series_id': self.test_series.id,
            'file': file_obj
        }
        res = self.client.post(self.import_url, post_data)
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Stage 1: Import Validation & Preview")
        self.assertContains(res, "Admin Preview Question?")
        self.assertContains(res, "Confirm & Commit 1 Questions")

        # Database must still have 0 questions
        self.assertEqual(self.test_series.questions.count(), 0)

    def test_admin_import_confirm_commits_questions(self):
        self.client.force_login(self.admin)
        valid_rows = [
            {
                'subject': 'Mathematics',
                'question_en': 'What is the sum of angles in a triangle?',
                'question_hi': None,
                'option_a_en': '90 deg',
                'option_a_hi': None,
                'option_b_en': '180 deg',
                'option_b_hi': None,
                'option_c_en': '270 deg',
                'option_c_hi': None,
                'option_d_en': '360 deg',
                'option_d_hi': None,
                'correct_option': 'B',
                'explanation_en': 'Euclidean geometry postulate',
                'explanation_hi': None,
                'marks': '4.00',
                'negative_marks': '1.00',
                'question': 'What is the sum of angles in a triangle?',
                'options_json': ['90 deg', '180 deg', '270 deg', '360 deg'],
                'correct_answer': 1,
                'explanation': 'Euclidean geometry postulate'
            }
        ]

        post_data = {
            'action_type': 'confirm',
            'test_series_id': self.test_series.id,
            'serialized_valid_rows': json.dumps(valid_rows)
        }
        res = self.client.post(self.import_url, post_data)
        self.assertEqual(res.status_code, 302)  # Redirects to changelist

        # Verify record in DB
        self.assertEqual(self.test_series.questions.count(), 1)
        q = self.test_series.questions.first()
        self.assertEqual(q.question_en, 'What is the sum of angles in a triangle?')
        self.assertEqual(q.correct_option, 'B')
        self.assertEqual(q.correct_answer, 1)
        self.assertEqual(q.marks, Decimal('4.00'))
        self.test_series.refresh_from_db()
        self.assertEqual(self.test_series.questions_count, 1)


from rest_framework.test import APITestCase
from users.models import UserProfile

class EducatorAssessmentsScopingTests(APITestCase):
    def setUp(self):
        self.educator_a = User.objects.create_user('edu_a', 'edua@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.educator_a, role='educator')
        self.educator_b = User.objects.create_user('edu_b', 'edub@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.educator_b, role='educator')

        self.student = User.objects.create_user('stud_eval', 'stud_eval@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.student, role='student', phone='9876543210')

        self.test_a = TestSeries.objects.create(
            slug='test-edu-a',
            title='Test Educator A',
            exam='NIMCET',
            duration_minutes=30,
            total_marks=20,
            questions_count=1,
            created_by=self.educator_a
        )
        self.q_a = TestQuestion.objects.create(
            test_series=self.test_a,
            question_number=1,
            question_en='Q A?',
            question='Q A?',
            option_a_en='1', option_b_en='2', option_c_en='3', option_d_en='4',
            correct_option='A',
            correct_answer=0,
            marks=Decimal('4.00'),
            negative_marks=Decimal('1.00')
        )

        self.test_b = TestSeries.objects.create(
            slug='test-edu-b',
            title='Test Educator B',
            exam='NIMCET',
            duration_minutes=30,
            total_marks=20,
            questions_count=1,
            created_by=self.educator_b
        )
        self.q_b = TestQuestion.objects.create(
            test_series=self.test_b,
            question_number=1,
            question_en='Q B?',
            question='Q B?',
            option_a_en='1', option_b_en='2', option_c_en='3', option_d_en='4',
            correct_option='B',
            correct_answer=1,
            marks=Decimal('4.00'),
            negative_marks=Decimal('1.00')
        )

        self.att_a = UserTestAttempt.objects.create(
            user=self.student,
            test_series=self.test_a,
            status=AttemptStatus.SUBMITTED,
            score=Decimal('16.00'),
            percentage=Decimal('80.00'),
            time_taken_seconds=600,
            submitted_at=timezone.now()
        )
        self.att_b = UserTestAttempt.objects.create(
            user=self.student,
            test_series=self.test_b,
            status=AttemptStatus.SUBMITTED,
            score=Decimal('12.00'),
            percentage=Decimal('60.00'),
            time_taken_seconds=500,
            submitted_at=timezone.now()
        )

    def test_educator_attempts_list_scoped_to_own_test(self):
        self.client.force_authenticate(user=self.educator_a)
        res = self.client.get('/api/assessments/manage/attempts/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in res.data]
        self.assertIn(self.att_a.id, ids)
        self.assertNotIn(self.att_b.id, ids)

    def test_educator_csv_export_scoped_and_no_phone(self):
        self.client.force_authenticate(user=self.educator_a)
        res = self.client.get('/api/assessments/manage/attempts/export/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        csv_text = res.content.decode('utf-8-sig')
        self.assertIn('Test Educator A', csv_text)
        self.assertNotIn('Test Educator B', csv_text)
        # Phone number must NEVER be exposed to educator
        self.assertNotIn('9876543210', csv_text)

    def test_educator_question_create_blocked_on_other_test(self):
        self.client.force_authenticate(user=self.educator_a)
        # Attempt to create question in educator B's test
        payload = {
            'test_series': self.test_b.id,
            'question_number': 2,
            'question_en': 'Hacked Question?',
            'question': 'Hacked Question?',
            'option_a_en': 'A', 'option_b_en': 'B', 'option_c_en': 'C', 'option_d_en': 'D',
            'correct_option': 'A',
            'correct_answer': 0,
            'marks': '4.00',
            'negative_marks': '1.00',
        }
        res = self.client.post('/api/assessments/manage/questions/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_educator_question_update_delete_blocked_on_other_test(self):
        self.client.force_authenticate(user=self.educator_a)
        # Attempt to edit question in educator B's test
        url = f'/api/assessments/manage/questions/{self.q_b.id}/'
        res_patch = self.client.patch(url, {'question_en': 'Tampered Q?'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to delete question in educator B's test
        res_del = self.client.delete(url)
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_import_generate_test_series_endpoint(self):
        admin = User.objects.create_superuser('super_import', 'imp@example.com', 'pass123')
        self.client.force_authenticate(user=admin)

        txt_content = (
            "Q1. Find the value of $\\lim_{x \\to 0} \\frac{\\sin x}{x}$.\n"
            "(A) 0\n(B) 1\n(C) -1\n(D) Does not exist\n"
            "Answer: B\nMarks: 4\nNegative: 1\n\n"
            "Q2. What is the derivative of $x^3$?\n"
            "(A) $3x^2$\n(B) $2x$\n(C) $x^2$\n(D) $3x$\n"
            "Answer: A\nMarks: 4\nNegative: 1\n"
        ).encode('utf-8')

        upload_file = SimpleUploadedFile("Calculus_Benchmark_Mock.txt", txt_content, content_type="text/plain")

        # 1. Preview mode
        res_prev = self.client.post('/api/assessments/manage/import-generate/', {
            'file': upload_file,
            'preview': 'true'
        }, format='multipart')
        self.assertEqual(res_prev.status_code, status.HTTP_200_OK)
        self.assertTrue(res_prev.data['preview'])
        self.assertEqual(res_prev.data['questions_count'], 2)
        self.assertEqual(res_prev.data['suggested_title'], 'Calculus Benchmark Mock')

        # 2. Generation mode with Scheduling
        upload_file.seek(0)
        starts = timezone.now() + timezone.timedelta(days=1)
        ends = starts + timezone.timedelta(hours=2)

        res_gen = self.client.post('/api/assessments/manage/import-generate/', {
            'file': upload_file,
            'preview': 'false',
            'title': 'Calculus Benchmark Mock 2026',
            'exam': 'NIMCET',
            'duration_minutes': 90,
            'starts_at': starts.isoformat(),
            'ends_at': ends.isoformat(),
        }, format='multipart')

        self.assertEqual(res_gen.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_gen.data['imported_count'], 2)
        test_slug = res_gen.data['test']['slug']

        # Verify DB records
        created_series = TestSeries.objects.get(slug=test_slug)
        self.assertEqual(created_series.title, 'Calculus Benchmark Mock 2026')
        self.assertEqual(created_series.questions_count, 2)
        self.assertEqual(created_series.duration_minutes, 90)
        self.assertIsNotNone(created_series.starts_at)
        self.assertIsNotNone(created_series.ends_at)
        self.assertEqual(created_series.questions.count(), 2)
