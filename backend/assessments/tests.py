from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import TestSeries, TestQuestion, UserTestAccess, UserTestAttempt
from courses.models import Course, Subject
import json

class AssessmentAndImportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin@sims.com', 'admin@sims.com', 'AdminPass123!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.student = User.objects.create_user('student1@sims.com', 'student1@sims.com', 'StudentPass123!')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        self.test_series = TestSeries.objects.create(
            slug='gate-maths-mock',
            title='GATE Mathematics Mock Test 1',
            exam='GATE',
            duration_minutes=30,
            total_marks=20,
            questions_count=1,
            is_paid=False,
            is_published=True
        )

        self.q1 = TestQuestion.objects.create(
            test_series=self.test_series,
            subject='Linear Algebra',
            question='What is the trace of an identity matrix 3x3?',
            options_json=['1', '2', '3', '0'],
            correct_answer=2, # index 2 is '3'
            explanation='Trace is sum of diagonal elements: 1+1+1=3.',
            order=1
        )

    def test_student_cannot_see_correct_answer_before_submit(self):
        url = reverse('test-series-detail', kwargs={'slug': self.test_series.slug})
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Part A1 deliberate change: student gets empty list from GET /<slug>/ to prevent paper leak before timer starts
        questions = res.data.get('questions', [])
        self.assertEqual(len(questions), 0)

        # Now start attempt and verify student-safe questions via attempt-detail
        start_res = self.client.post(reverse('test-series-start', kwargs={'slug': self.test_series.slug}))
        self.assertIn(start_res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        attempt_id = start_res.data['id']
        att_res = self.client.get(reverse('attempt-detail', kwargs={'attempt_id': attempt_id}))
        self.assertEqual(att_res.status_code, status.HTTP_200_OK)
        attempt_questions = att_res.data.get('questions', [])
        self.assertEqual(len(attempt_questions), 1)
        self.assertNotIn('correctAnswer', attempt_questions[0])
        self.assertNotIn('correct_answer', attempt_questions[0])
        self.assertNotIn('explanation', attempt_questions[0])

    def test_student_submit_and_server_scoring(self):
        url = reverse('submit-test-attempt', kwargs={'slug': self.test_series.slug})
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        
        # Submit correct answer (option index 2)
        res = self.client.post(url, {'answers': {str(self.q1.id): 2}}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['attempt']['score'], 20.0)
        self.assertEqual(res.data['attempt']['correctCount'], 1)
        self.assertEqual(res.data['attempt']['wrongCount'], 0)
        
        # Review questions in submit response SHOULD contain correct answer & explanation
        review = res.data.get('review', [])
        self.assertEqual(len(review), 1)
        self.assertIn('correctAnswer', review[0])
        self.assertEqual(review[0]['correctAnswer'], 2)

    def test_bulk_question_import_valid_json(self):
        url = reverse('bulk-question-import', kwargs={'slug': self.test_series.slug})
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')

        valid_payload = [
            {
                'subject': 'Calculus',
                'question': 'What is the derivative of sin(x)?',
                'options': ['cos(x)', '-cos(x)', 'tan(x)', 'sec(x)'],
                'correct_answer': 0,
                'explanation': 'd/dx(sin x) = cos x.'
            },
            {
                'subject': 'Calculus',
                'question': 'What is the limit of sin(x)/x as x approaches 0?',
                'options': ['0', '1', 'infinity', 'undefined'],
                'correct_answer': 1,
                'explanation': 'Standard limit is 1.'
            }
        ]

        res = self.client.post(url, {'questions_json': json.dumps(valid_payload)}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['imported_count'], 2)
        self.assertEqual(self.test_series.questions.count(), 3)

    def test_bulk_question_import_atomic_rollback_on_invalid(self):
        url = reverse('bulk-question-import', kwargs={'slug': self.test_series.slug})
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')

        initial_count = self.test_series.questions.count()

        # One valid, one invalid (out of bounds correct_answer)
        mixed_payload = [
            {
                'subject': 'Physics',
                'question': 'What is the unit of force?',
                'options': ['Newton', 'Joule'],
                'correct_answer': 0
            },
            {
                'subject': 'Physics',
                'question': 'What is the speed of light in vacuum?',
                'options': ['3e8 m/s', '3e6 m/s'],
                'correct_answer': 9 # Invalid index
            }
        ]

        res = self.client.post(url, {'questions_json': json.dumps(mixed_payload)}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', res.data)
        # Atomic rollback verification: total count must not have changed
        self.assertEqual(self.test_series.questions.count(), initial_count)

    def test_non_admin_cannot_bulk_import(self):
        url = reverse('bulk-question-import', kwargs={'slug': self.test_series.slug})
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res = self.client.post(url, {'questions_json': '[]'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from .models import IntegrityMode, AttemptStatus, UserTestAnswer

class Phase1AModelAndMigrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('teststudent@sims.com', 'teststudent@sims.com', 'Pass1234!')

    def test_exam_nullable_window_and_integrity_defaults(self):
        # 1. Existing style exam with null window: stays valid
        exam = TestSeries.objects.create(
            slug='open-window-exam',
            title='Open Window Exam',
            exam='GATE',
            starts_at=None,
            ends_at=None
        )
        self.assertEqual(exam.integrity_mode, IntegrityMode.STRICT)
        self.assertTrue(exam.show_rank)
        self.assertTrue(exam.show_review)
        self.assertIsNone(exam.max_attempts)

        # 2. Window validation: ends_at > starts_at
        now = timezone.now()
        exam.starts_at = now + timedelta(hours=2)
        exam.ends_at = now + timedelta(hours=1)
        with self.assertRaises(ValidationError):
            exam.save()

        exam.ends_at = now + timedelta(hours=3)
        exam.save()
        self.assertIsNotNone(exam.ends_at)

    def test_question_bilingual_sync_and_canonical_mapping(self):
        exam = TestSeries.objects.create(
            slug='bilingual-exam',
            title='Bilingual Exam',
            exam='NET'
        )

        # Create with canonical new fields
        q = TestQuestion.objects.create(
            test_series=exam,
            question_number=1,
            subject='Math',
            question_en='What is 2+2?',
            question_hi='2+2 क्या है?',
            option_a_en='3',
            option_b_en='4',
            option_c_en='5',
            option_d_en='6',
            correct_option='B',
            explanation_en='2+2 equals 4.'
        )
        # Should automatically synchronize legacy fields
        self.assertEqual(q.question, 'What is 2+2?')
        self.assertEqual(q.correct_answer, 1) # 'B' is 1
        self.assertEqual(q.options_json, ['3', '4', '5', '6'])
        self.assertEqual(q.explanation, '2+2 equals 4.')

        # Create using legacy fields
        q2 = TestQuestion.objects.create(
            test_series=exam,
            order=2,
            subject='Math',
            question='What is 3*3?',
            options_json=['6', '8', '9', '12'],
            correct_answer=2, # index 2 is '9'
            explanation='3*3 is 9.'
        )
        # Should synchronize new fields
        self.assertEqual(q2.question_number, 2)
        self.assertEqual(q2.question_en, 'What is 3*3?')
        self.assertEqual(q2.correct_option, 'C') # index 2 -> C
        self.assertEqual(q2.option_c_en, '9')

    def test_attempt_lifecycle_and_answer_storage(self):
        exam = TestSeries.objects.create(
            slug='lifecycle-exam',
            title='Lifecycle Exam',
            exam='JAM',
            total_marks=20
        )
        q1 = TestQuestion.objects.create(
            test_series=exam,
            question_number=1,
            question_en='Q1',
            correct_option='A'
        )
        q2 = TestQuestion.objects.create(
            test_series=exam,
            question_number=2,
            question_en='Q2',
            correct_option='B'
        )

        attempt = UserTestAttempt.objects.create(
            user=self.user,
            test_series=exam,
            score=10.0,
            total_marks=20.0,
            status=AttemptStatus.SUBMITTED,
            percentage=50.0
        )

        ans1 = UserTestAnswer.objects.create(
            attempt=attempt,
            question=q1,
            selected_option='A',
            is_marked_for_review=False
        )
        self.assertEqual(ans1.selected_option, 'A')

        # Verify uniqueness constraint on (attempt, question)
        with self.assertRaises(Exception):
            UserTestAnswer.objects.create(
                attempt=attempt,
                question=q1,
                selected_option='B'
            )

class Phase1ACorrectnessAndRegressionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('audit_user@sims.com', 'audit_user@sims.com', 'Secret1234!')
        self.exam = TestSeries.objects.create(
            slug='audit-exam',
            title='Audit Exam',
            exam='GATE'
        )

    def test_conflicting_question_text_priority(self):
        # When canonical question_en and legacy question both provided with different values:
        # question_en is canonical and must not be overwritten by legacy question
        q = TestQuestion(
            test_series=self.exam,
            question_number=1,
            question_en='Canonical English Text',
            question='Legacy Text'
        )
        q.save()
        # Verified canonical behavior: question_en retains its value
        self.assertEqual(q.question_en, 'Canonical English Text')

    def test_conflicting_correct_answer_priority(self):
        # When canonical correct_option ('B') and legacy correct_answer (2 = 'C') both provided:
        # canonical correct_option wins and synchronizes correct_answer
        q = TestQuestion(
            test_series=self.exam,
            question_number=2,
            option_a_en='A1', option_b_en='B1', option_c_en='C1', option_d_en='D1',
            correct_option='B',
            correct_answer=2
        )
        q.save()
        self.assertEqual(q.correct_option, 'B')
        self.assertEqual(q.correct_answer, 1) # B is 1

    def test_legacy_only_creation_backward_compatibility(self):
        # Legacy frontend / scripts creating questions with only legacy fields
        q = TestQuestion(
            test_series=self.exam,
            order=3,
            question='Legacy question only',
            options_json=['Opt1', 'Opt2', 'Opt3', 'Opt4'],
            correct_answer=3, # D
            explanation='Legacy explanation only'
        )
        q.save()
        self.assertEqual(q.question_number, 3)
        self.assertEqual(q.question_en, 'Legacy question only')
        self.assertEqual(q.correct_option, 'D')
        self.assertEqual(q.option_d_en, 'Opt4')
        self.assertEqual(q.explanation_en, 'Legacy explanation only')

    def test_student_detail_serializer_omits_answers_and_explanations(self):
        # Security audit: student calling test-series-detail must never receive answers or explanations
        q = TestQuestion.objects.create(
            test_series=self.exam,
            question_number=4,
            question_en='Secret Question',
            option_a_en='A', option_b_en='B', option_c_en='C', option_d_en='D',
            correct_option='A',
            correct_answer=0,
            explanation='Secret explanation'
        )
        url = reverse('test-series-detail', kwargs={'slug': self.exam.slug})
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        questions = res.data.get('questions', [])
        for item in questions:
            self.assertNotIn('correct_answer', item)
            self.assertNotIn('correctAnswer', item)
            self.assertNotIn('correct_option', item)
            self.assertNotIn('explanation', item)
            self.assertNotIn('explanation_en', item)
