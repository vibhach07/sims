import json
from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from assessments.models import TestSeries, TestQuestion
from courses.models import Course, Subject


class BulkImportWizardTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create_superuser(
            username='admin_wizard',
            email='admin_wizard@sims.test',
            password='Password123!'
        )
        self.staff_user = User.objects.create_user(
            username='staff_wizard',
            email='staff_wizard@sims.test',
            password='Password123!',
            is_staff=True
        )
        self.normal_user = User.objects.create_user(
            username='student_wizard',
            email='student_wizard@sims.test',
            password='Password123!',
            is_staff=False
        )

    def test_wizard_view_permission(self):
        url = reverse('admin:assessments_bulk_import_wizard')

        # Normal user -> 403 or redirect
        self.client.force_login(self.normal_user)
        res = self.client.get(url)
        self.assertIn(res.status_code, [302, 403])

        # Staff user -> 200 OK
        self.client.force_login(self.staff_user)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'Step 4 — Examination Parameters')
        self.assertContains(res, 'Live Marks Distribution Engine')

    def test_parse_api_csv_file(self):
        self.client.force_login(self.admin_user)
        url = reverse('admin:assessments_bulk_import_parse')

        csv_content = (
            "question,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks,subject\n"
            "What is the capital of India?,Mumbai,New Delhi,Kolkata,Chennai,B,1.0,0.33,General\n"
            "What is 2 + 2?,3,4,5,6,B,2.0,0.66,Mathematics\n"
        ).encode('utf-8')

        uploaded = SimpleUploadedFile("gate_mock_test.csv", csv_content, content_type="text/csv")
        res = self.client.post(url, {'files': [uploaded]})

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('total_questions'), 2)
        self.assertEqual(data['questions'][0]['correct_option'], 'B')

    def test_publish_api_creates_test_and_questions(self):
        self.client.force_login(self.admin_user)
        url = reverse('admin:assessments_bulk_import_publish')

        payload = {
            'mode': 'new',
            'title': 'GATE Chemical Engineering CBT Test Series — Mock Test #03',
            'discipline': 'CH',
            'exam': 'GATE (CH)',
            'test_type': 'All-India Open Mock',
            'duration_minutes': 180,
            'instructions': 'Standard exam instructions',
            'is_published': True,
            'available_immediately': True,
            'questions': [
                {
                    'question_number': 1,
                    'subject': 'Heat Transfer',
                    'question_en': 'What is Fourier law of conduction?',
                    'option_a_en': 'q = -k A dT/dx',
                    'option_b_en': 'q = h A dT',
                    'option_c_en': 'q = sigma A T^4',
                    'option_d_en': 'q = m Cp dT',
                    'correct_option': 'A',
                    'marks': 1.0,
                    'negative_marks': 0.33,
                    'explanation_en': 'Fourier law applies to conductive heat transfer.'
                },
                {
                    'question_number': 2,
                    'subject': 'Mass Transfer',
                    'question_en': 'What is Fick first law of diffusion?',
                    'option_a_en': 'J = -D dC/dx',
                    'option_b_en': 'J = k dC',
                    'option_c_en': 'J = v C',
                    'option_d_en': 'J = P / RT',
                    'correct_option': 'A',
                    'marks': 2.0,
                    'negative_marks': 0.66,
                    'explanation_en': 'Fick first law governs steady-state diffusion.'
                }
            ]
        }

        res = self.client.post(
            url,
            data=json.dumps(payload),
            content_type='application/json'
        )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        test_id = data.get('test_id')
        self.assertTrue(test_id)

        # Check DB records
        ts = TestSeries.objects.get(id=test_id)
        self.assertEqual(ts.title, 'GATE Chemical Engineering CBT Test Series — Mock Test #03')
        self.assertEqual(ts.duration_minutes, 180)
        self.assertEqual(ts.questions_count, 2)
        self.assertEqual(ts.total_marks, 3)  # 1.0 + 2.0
        self.assertTrue(ts.is_published)

        questions = ts.questions.all().order_by('question_number')
        self.assertEqual(questions.count(), 2)
        self.assertEqual(questions[0].correct_option, 'A')
        self.assertEqual(questions[0].marks, Decimal('1.00'))
        self.assertEqual(questions[1].marks, Decimal('2.00'))

    def test_publish_api_append_to_existing_series(self):
        self.client.force_login(self.admin_user)

        # Create base test series
        existing_ts = TestSeries.objects.create(
            slug='existing-gate-test',
            title='Existing Test Paper',
            exam='GATE',
            category='after-msc-btech',
            duration_minutes=60,
            total_marks=5,
            questions_count=1,
            created_by=self.admin_user
        )
        TestQuestion.objects.create(
            test_series=existing_ts,
            question_number=1,
            subject='Math',
            question_en='Q1 initial',
            option_a_en='A',
            option_b_en='B',
            option_c_en='C',
            option_d_en='D',
            correct_option='A',
            marks=Decimal('5.00')
        )

        url = reverse('admin:assessments_bulk_import_publish')
        payload = {
            'mode': 'existing',
            'existing_test_id': existing_ts.id,
            'questions': [
                {
                    'question_number': 1,
                    'subject': 'Fluid Mechanics',
                    'question_en': 'Q2 appended',
                    'option_a_en': 'Opt 1',
                    'option_b_en': 'Opt 2',
                    'option_c_en': 'Opt 3',
                    'option_d_en': 'Opt 4',
                    'correct_option': 'B',
                    'marks': 2.0,
                    'negative_marks': 0.66
                }
            ]
        }

        res = self.client.post(
            url,
            data=json.dumps(payload),
            content_type='application/json'
        )

        self.assertEqual(res.status_code, 200)
        existing_ts.refresh_from_db()
        self.assertEqual(existing_ts.questions_count, 2)
        self.assertEqual(existing_ts.total_marks, 7)  # 5 + 2

        q2 = existing_ts.questions.get(question_number=2)
        self.assertEqual(q2.question_en, 'Q2 appended')
        self.assertEqual(q2.correct_option, 'B')
