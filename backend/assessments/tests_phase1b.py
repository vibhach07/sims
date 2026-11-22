"""
Phase 1B tests: scoring, availability, max attempts, ownership,
cross-exam questions, repeat submission, expiry, answer leakage.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import (
    AttemptStatus, TestQuestion, TestSeries,
    UserTestAccess, UserTestAnswer, UserTestAttempt,
)
from .services import (
    AttemptAlreadySubmitted, AttemptExpired, AttemptNotFound,
    AttemptOwnershipError, ExamNotAvailable, MaxAttemptsReached,
    QuestionNotInExam, save_answer, start_attempt, submit_attempt,
    get_attempt_result, _compute_score,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_exam(slug='test-exam', total_marks=40, duration=60,
              is_published=True, is_paid=False, max_attempts=None,
              starts_at=None, ends_at=None,
              default_marks=4, default_negative_marks=1):
    return TestSeries.objects.create(
        slug=slug, title=slug, exam='GATE',
        total_marks=total_marks, duration_minutes=duration,
        is_published=is_published, is_paid=is_paid,
        max_attempts=max_attempts,
        starts_at=starts_at, ends_at=ends_at,
        default_marks=default_marks,
        default_negative_marks=default_negative_marks,
    )


def add_question(exam, num, correct='A', marks=None, neg=None):
    return TestQuestion.objects.create(
        test_series=exam, question_number=num, subject='Test',
        question_en=f'Q{num}', correct_option=correct,
        option_a_en='Opt A', option_b_en='Opt B',
        option_c_en='Opt C', option_d_en='Opt D',
        marks=marks, negative_marks=neg,
    )


def make_user(username='student@sims.com'):
    u, _ = User.objects.get_or_create(username=username, defaults={'email': username})
    u.set_password('Pass1234!')
    u.save()
    return u


def auth(client, user):
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return token


# ── Service-layer unit tests ───────────────────────────────────────────────────

class StartAttemptServiceTests(APITestCase):
    def setUp(self):
        self.user = make_user('start@sims.com')
        self.exam = make_exam('start-exam')
        add_question(self.exam, 1)

    def test_start_creates_attempt(self):
        attempt = start_attempt(self.user, self.exam)
        self.assertEqual(attempt.status, AttemptStatus.IN_PROGRESS)
        self.assertIsNotNone(attempt.started_at)
        self.assertIsNotNone(attempt.expires_at)

    def test_start_resumes_existing(self):
        a1 = start_attempt(self.user, self.exam)
        a2 = start_attempt(self.user, self.exam)
        self.assertEqual(a1.id, a2.id)

    def test_unpublished_exam_blocked(self):
        self.exam.is_published = False
        self.exam.save()
        with self.assertRaises(ExamNotAvailable):
            start_attempt(self.user, self.exam)

    def test_paid_exam_without_access_blocked(self):
        self.exam.is_paid = True
        self.exam.save()
        with self.assertRaises(ExamNotAvailable):
            start_attempt(self.user, self.exam)

    def test_paid_exam_with_access_allowed(self):
        self.exam.is_paid = True
        self.exam.save()
        UserTestAccess.objects.create(user=self.user, test_series=self.exam)
        attempt = start_attempt(self.user, self.exam)
        self.assertEqual(attempt.status, AttemptStatus.IN_PROGRESS)

    def test_exam_not_started_blocked(self):
        self.exam.starts_at = timezone.now() + timedelta(hours=1)
        self.exam.save()
        with self.assertRaises(ExamNotAvailable):
            start_attempt(self.user, self.exam)

    def test_exam_window_closed_blocked(self):
        self.exam.ends_at = timezone.now() - timedelta(hours=1)
        self.exam.save()
        with self.assertRaises(ExamNotAvailable):
            start_attempt(self.user, self.exam)

    def test_max_attempts_enforced(self):
        self.exam.max_attempts = 1
        self.exam.save()
        # Use up the one attempt
        a = UserTestAttempt.objects.create(
            user=self.user, test_series=self.exam,
            status=AttemptStatus.SUBMITTED, score=0, total_marks=40,
        )
        with self.assertRaises(MaxAttemptsReached):
            start_attempt(self.user, self.exam)

    def test_expired_attempt_auto_submitted_new_created(self):
        # Simulate an expired in-progress attempt
        attempt = UserTestAttempt.objects.create(
            user=self.user, test_series=self.exam,
            started_at=timezone.now() - timedelta(hours=2),
            expires_at=timezone.now() - timedelta(hours=1),
            status=AttemptStatus.IN_PROGRESS,
            score=0, total_marks=40,
        )
        new_attempt = start_attempt(self.user, self.exam)
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, AttemptStatus.AUTO_SUBMITTED)
        self.assertNotEqual(new_attempt.id, attempt.id)
        self.assertEqual(new_attempt.status, AttemptStatus.IN_PROGRESS)


class ScoringTests(APITestCase):
    def setUp(self):
        self.user = make_user('score@sims.com')
        self.exam = make_exam('score-exam', default_marks=4, default_negative_marks=1)
        self.q1 = add_question(self.exam, 1, correct='A')
        self.q2 = add_question(self.exam, 2, correct='B')
        self.q3 = add_question(self.exam, 3, correct='C')
        self.q4 = add_question(self.exam, 4, correct='D')

    def _make_attempt(self):
        return UserTestAttempt.objects.create(
            user=self.user, test_series=self.exam,
            started_at=timezone.now(), status=AttemptStatus.IN_PROGRESS,
            score=0, total_marks=0,
        )

    def test_all_correct(self):
        attempt = self._make_attempt()
        for q, sel in [(self.q1,'A'),(self.q2,'B'),(self.q3,'C'),(self.q4,'D')]:
            UserTestAnswer.objects.create(attempt=attempt, question=q, selected_option=sel)
        score, total, correct, wrong, unattempted = _compute_score(attempt, self.exam.questions.all())
        self.assertEqual(score, 16.0)
        self.assertEqual(total, 16.0)
        self.assertEqual(correct, 4)
        self.assertEqual(wrong, 0)
        self.assertEqual(unattempted, 0)

    def test_negative_marking(self):
        attempt = self._make_attempt()
        # Q1 correct (+4), Q2 wrong (-1), Q3 unattempted, Q4 wrong (-1)
        UserTestAnswer.objects.create(attempt=attempt, question=self.q1, selected_option='A')
        UserTestAnswer.objects.create(attempt=attempt, question=self.q2, selected_option='A')  # wrong
        UserTestAnswer.objects.create(attempt=attempt, question=self.q4, selected_option='A')  # wrong
        score, total, correct, wrong, unattempted = _compute_score(attempt, self.exam.questions.all())
        self.assertEqual(score, 2.0)   # 4 - 1 - 1 = 2
        self.assertEqual(correct, 1)
        self.assertEqual(wrong, 2)
        self.assertEqual(unattempted, 1)

    def test_score_floored_at_zero(self):
        attempt = self._make_attempt()
        # All wrong: 4 * -1 = -4 → floored to 0
        for q in [self.q1, self.q2, self.q3, self.q4]:
            wrong_opt = 'B' if q.correct_option != 'B' else 'A'
            UserTestAnswer.objects.create(attempt=attempt, question=q, selected_option=wrong_opt)
        score, _, _, _, _ = _compute_score(attempt, self.exam.questions.all())
        self.assertEqual(score, 0.0)

    def test_per_question_marks_override(self):
        # Q1 has custom marks=10, neg=2
        self.q1.marks = 10
        self.q1.negative_marks = 2
        self.q1.save(update_fields=['marks', 'negative_marks'])
        attempt = self._make_attempt()
        UserTestAnswer.objects.create(attempt=attempt, question=self.q1, selected_option='B')  # wrong
        UserTestAnswer.objects.create(attempt=attempt, question=self.q2, selected_option='B')  # correct
        score, total, _, _, _ = _compute_score(attempt, self.exam.questions.all())
        # Q1 wrong: -2, Q2 correct: +4, Q3 unattempted: 0, Q4 unattempted: 0
        self.assertEqual(score, 2.0)
        self.assertEqual(total, 10 + 4 + 4 + 4)  # 22.0

    def test_score_not_trusted_from_client(self):
        """Submitting with score in body must be ignored; server recomputes."""
        auth(self.client, self.user)
        attempt = start_attempt(self.user, self.exam)
        # Inject correct answer for Q1 only
        save_answer(self.user, attempt.id, self.q1.id, 'A')
        url = reverse('attempt-submit', kwargs={'attempt_id': attempt.id})
        # Send a bogus score in the body — should be ignored
        res = self.client.post(url, {'score': 9999, 'correct_count': 999}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        attempt.refresh_from_db()
        self.assertEqual(attempt.score, 4.0)   # only Q1 correct
        self.assertNotEqual(attempt.score, 9999)


class SaveAnswerServiceTests(APITestCase):
    def setUp(self):
        self.user = make_user('save@sims.com')
        self.other = make_user('other@sims.com')
        self.exam = make_exam('save-exam')
        self.q = add_question(self.exam, 1)
        self.attempt = UserTestAttempt.objects.create(
            user=self.user, test_series=self.exam,
            started_at=timezone.now(), status=AttemptStatus.IN_PROGRESS,
            expires_at=timezone.now() + timedelta(hours=1),
            score=0, total_marks=0,
        )

    def test_save_valid_answer(self):
        ans = save_answer(self.user, self.attempt.id, self.q.id, 'B')
        self.assertEqual(ans.selected_option, 'B')

    def test_update_answer(self):
        save_answer(self.user, self.attempt.id, self.q.id, 'A')
        ans = save_answer(self.user, self.attempt.id, self.q.id, 'C')
        self.assertEqual(ans.selected_option, 'C')
        self.assertEqual(UserTestAnswer.objects.filter(attempt=self.attempt, question=self.q).count(), 1)

    def test_clear_answer_null(self):
        save_answer(self.user, self.attempt.id, self.q.id, 'A')
        ans = save_answer(self.user, self.attempt.id, self.q.id, None)
        self.assertIsNone(ans.selected_option)

    def test_invalid_option_rejected(self):
        from .services import ExamServiceError
        with self.assertRaises(ExamServiceError):
            save_answer(self.user, self.attempt.id, self.q.id, 'X')

    def test_ownership_enforced(self):
        with self.assertRaises(AttemptOwnershipError):
            save_answer(self.other, self.attempt.id, self.q.id, 'A')

    def test_cross_exam_question_rejected(self):
        other_exam = make_exam('other-exam')
        bad_q = add_question(other_exam, 1)
        with self.assertRaises(QuestionNotInExam):
            save_answer(self.user, self.attempt.id, bad_q.id, 'A')

    def test_save_after_submit_rejected(self):
        self.attempt.status = AttemptStatus.SUBMITTED
        self.attempt.save(update_fields=['status'])
        with self.assertRaises(AttemptAlreadySubmitted):
            save_answer(self.user, self.attempt.id, self.q.id, 'A')

    def test_expired_attempt_auto_submits(self):
        self.attempt.expires_at = timezone.now() - timedelta(minutes=1)
        self.attempt.save(update_fields=['expires_at'])
        with self.assertRaises(AttemptExpired):
            save_answer(self.user, self.attempt.id, self.q.id, 'A')
        self.attempt.refresh_from_db()
        self.assertEqual(self.attempt.status, AttemptStatus.AUTO_SUBMITTED)


class SubmitAttemptTests(APITestCase):
    def setUp(self):
        self.user = make_user('submit@sims.com')
        self.other = make_user('sub_other@sims.com')
        self.exam = make_exam('submit-exam')
        self.q1 = add_question(self.exam, 1, correct='A')
        self.q2 = add_question(self.exam, 2, correct='B')

    def test_submit_scores_correctly(self):
        attempt = start_attempt(self.user, self.exam)
        save_answer(self.user, attempt.id, self.q1.id, 'A')   # correct
        save_answer(self.user, attempt.id, self.q2.id, 'A')   # wrong
        result = submit_attempt(self.user, attempt.id)
        self.assertEqual(result.status, AttemptStatus.SUBMITTED)
        self.assertEqual(result.score, 3.0)   # +4 -1 = 3
        self.assertEqual(result.correct_count, 1)
        self.assertEqual(result.wrong_count, 1)

    def test_submit_idempotent(self):
        attempt = start_attempt(self.user, self.exam)
        r1 = submit_attempt(self.user, attempt.id)
        r2 = submit_attempt(self.user, attempt.id)
        self.assertEqual(r1.id, r2.id)
        self.assertEqual(r1.score, r2.score)

    def test_ownership_enforced_on_submit(self):
        attempt = start_attempt(self.user, self.exam)
        with self.assertRaises(AttemptOwnershipError):
            submit_attempt(self.other, attempt.id)

    def test_submit_populates_legacy_answers_json(self):
        attempt = start_attempt(self.user, self.exam)
        save_answer(self.user, attempt.id, self.q1.id, 'A')
        submit_attempt(self.user, attempt.id)
        attempt.refresh_from_db()
        self.assertIn(str(self.q1.id), attempt.answers_json)
        self.assertEqual(attempt.answers_json[str(self.q1.id)], 0)  # A = 0-indexed

    def test_time_taken_populated(self):
        attempt = UserTestAttempt.objects.create(
            user=self.user, test_series=self.exam,
            started_at=timezone.now() - timedelta(minutes=10),
            status=AttemptStatus.IN_PROGRESS, score=0, total_marks=0,
        )
        result = submit_attempt(self.user, attempt.id)
        self.assertGreaterEqual(result.time_taken_seconds, 600 - 5)  # ~10 min


class AnswerLeakageTests(APITestCase):
    """Correct answers / explanations must NEVER appear before submission."""

    def setUp(self):
        self.user = make_user('leak@sims.com')
        self.exam = make_exam('leak-exam')
        self.q = add_question(self.exam, 1, correct='C')
        self.q.explanation_en = 'Explanation is secret'
        self.q.save(update_fields=['explanation_en'])
        auth(self.client, self.user)

    def test_detail_endpoint_hides_answers_before_attempt(self):
        url = reverse('test-series-detail', kwargs={'slug': self.exam.slug})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for q in res.data.get('questions', []):
            self.assertNotIn('correctAnswer', q)
            self.assertNotIn('correct_option', q)
            self.assertNotIn('explanation', q)
            self.assertNotIn('explanation_en', q)

    def test_in_progress_attempt_hides_answers(self):
        attempt = start_attempt(self.user, self.exam)
        url = reverse('attempt-detail', kwargs={'attempt_id': attempt.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # savedAnswers key present; no correctAnswer key anywhere in response
        import json
        body = json.dumps(res.data)
        self.assertNotIn('correctOption', body)
        self.assertNotIn('correct_option', body)
        self.assertNotIn('explanation', body)

    def test_result_includes_answers_when_show_review_true(self):
        attempt = start_attempt(self.user, self.exam)
        save_answer(self.user, attempt.id, self.q.id, 'C')
        submit_attempt(self.user, attempt.id)
        self.exam.show_review = True
        self.exam.save(update_fields=['show_review'])
        url = reverse('attempt-result', kwargs={'attempt_id': attempt.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        review = res.data.get('review', [])
        self.assertTrue(len(review) > 0)
        self.assertEqual(review[0]['correctOption'], 'C')

    def test_result_hides_review_when_show_review_false(self):
        attempt = start_attempt(self.user, self.exam)
        submit_attempt(self.user, attempt.id)
        self.exam.show_review = False
        self.exam.save(update_fields=['show_review'])
        url = reverse('attempt-result', kwargs={'attempt_id': attempt.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get('review'), [])

    def test_cannot_get_result_of_in_progress_attempt(self):
        attempt = start_attempt(self.user, self.exam)
        url = reverse('attempt-result', kwargs={'attempt_id': attempt.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)


class AttemptAPIEndpointTests(APITestCase):
    def setUp(self):
        self.user = make_user('api@sims.com')
        self.other = make_user('api_other@sims.com')
        self.exam = make_exam('api-exam')
        self.q1 = add_question(self.exam, 1, correct='A')
        self.q2 = add_question(self.exam, 2, correct='D')
        auth(self.client, self.user)

    def test_start_endpoint(self):
        url = reverse('test-series-start', kwargs={'slug': self.exam.slug})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], AttemptStatus.IN_PROGRESS)
        self.assertIn('expiresAt', res.data)
        self.assertIn('id', res.data)

    def test_save_answer_endpoint(self):
        attempt = start_attempt(self.user, self.exam)
        url = reverse('attempt-save-answer', kwargs={'attempt_id': attempt.id})
        res = self.client.post(url, {'question_id': self.q1.id, 'selected_option': 'A'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['selectedOption'], 'A')

    def test_submit_endpoint(self):
        attempt = start_attempt(self.user, self.exam)
        save_answer(self.user, attempt.id, self.q1.id, 'A')
        url = reverse('attempt-submit', kwargs={'attempt_id': attempt.id})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], AttemptStatus.SUBMITTED)
        self.assertIn('score', res.data)
        self.assertIn('percentage', res.data)

    def test_result_endpoint_after_submit(self):
        attempt = start_attempt(self.user, self.exam)
        submit_attempt(self.user, attempt.id)
        url = reverse('attempt-result', kwargs={'attempt_id': attempt.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('score', res.data)

    def test_unauthenticated_blocked(self):
        self.client.credentials()
        url = reverse('test-series-start', kwargs={'slug': self.exam.slug})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_other_user_cannot_access_attempt(self):
        attempt = start_attempt(self.user, self.exam)
        auth(self.client, self.other)
        url = reverse('attempt-detail', kwargs={'attempt_id': attempt.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_option_rejected_via_api(self):
        attempt = start_attempt(self.user, self.exam)
        auth(self.client, self.user)
        url = reverse('attempt-save-answer', kwargs={'attempt_id': attempt.id})
        res = self.client.post(url, {'question_id': self.q1.id, 'selected_option': 'Z'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_my_attempts_v2(self):
        attempt = start_attempt(self.user, self.exam)
        submit_attempt(self.user, attempt.id)
        url = reverse('my-test-attempts-v2')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertIn('testSlug', res.data[0])
        self.assertIn('status', res.data[0])

    def test_unpublished_exam_start_blocked(self):
        self.exam.is_published = False
        self.exam.save()
        url = reverse('test-series-start', kwargs={'slug': self.exam.slug})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_max_attempts_via_api(self):
        self.exam.max_attempts = 1
        self.exam.save()
        attempt = start_attempt(self.user, self.exam)
        submit_attempt(self.user, attempt.id)
        # Second start should be blocked
        url = reverse('test-series-start', kwargs={'slug': self.exam.slug})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_repeat_submit_idempotent_via_api(self):
        attempt = start_attempt(self.user, self.exam)
        url = reverse('attempt-submit', kwargs={'attempt_id': attempt.id})
        r1 = self.client.post(url)
        r2 = self.client.post(url)
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertEqual(r1.data['score'], r2.data['score'])
