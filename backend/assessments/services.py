"""
assessments/services.py
Service layer for exam attempts, scoring, integrity, and subject analysis.
"""
from __future__ import annotations
import logging
from datetime import timedelta
from typing import Dict, List, Optional, Tuple, Any

from django.db import transaction, connection
from django.utils import timezone

from .models import (
    AttemptStatus, IntegrityMode, TestQuestion, TestSeries,
    UserTestAccess, UserTestAnswer, UserTestAttempt,
)

logger = logging.getLogger(__name__)


# ── Exceptions ────────────────────────────────────────────────────────────────

class ExamServiceError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code

class ExamNotAvailable(ExamServiceError):
    def __init__(self, detail: str = "Exam not available."):
        super().__init__(detail, status_code=403)

class MaxAttemptsReached(ExamServiceError):
    def __init__(self, detail: str = "Maximum attempts reached."):
        super().__init__(detail, status_code=403)

class AttemptNotFound(ExamServiceError):
    def __init__(self, detail: str = "Attempt not found."):
        super().__init__(detail, status_code=404)

class AttemptOwnershipError(ExamServiceError):
    def __init__(self, detail: str = "You do not own this attempt."):
        super().__init__(detail, status_code=403)

class AttemptAlreadySubmitted(ExamServiceError):
    def __init__(self, detail: str = "Attempt already submitted."):
        super().__init__(detail, status_code=409)

class AttemptExpired(ExamServiceError):
    def __init__(self, detail: str = "Attempt has expired."):
        super().__init__(detail, status_code=410)

class InvalidStateTransition(ExamServiceError):
    def __init__(self, detail: str = "Invalid state transition."):
        super().__init__(detail, status_code=409)

class QuestionNotInExam(ExamServiceError):
    def __init__(self, detail: str = "Question does not belong to this exam."):
        super().__init__(detail, status_code=400)


# ── Private guards ────────────────────────────────────────────────────────────

def _check_entitlement(user, test: TestSeries) -> None:
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return
    if test.created_by_id and user.id == test.created_by_id:
        return
    if test.is_paid:
        entitled = UserTestAccess.objects.filter(user=user, test_series=test).exists()
        if not entitled and test.course_id:
            from courses.models import UserEnrollment
            entitled = UserEnrollment.objects.filter(user=user, course=test.course).exists()
        if not entitled:
            raise ExamNotAvailable("Purchase required to take this test.")


def _check_availability(test: TestSeries) -> None:
    if not test.is_published:
        raise ExamNotAvailable("Exam is not published.")
    now = timezone.now()
    if test.starts_at and now < test.starts_at:
        formatted_start = test.starts_at.strftime("%b %d, %Y %I:%M %p")
        raise ExamNotAvailable(f"Exam starts at {formatted_start}.")
    if test.ends_at and now > test.ends_at:
        formatted_end = test.ends_at.strftime("%b %d, %Y %I:%M %p")
        raise ExamNotAvailable(f"Exam window has closed on {formatted_end}.")


def _check_max_attempts(user, test: TestSeries) -> None:
    if test.max_attempts is None:
        return
    used = UserTestAttempt.objects.filter(
        user=user, test_series=test,
        status__in=[AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED],
    ).count()
    if used >= test.max_attempts:
        raise MaxAttemptsReached(
            f"You have used {used}/{test.max_attempts} allowed attempt(s)."
        )


def _compute_score(
    attempt: UserTestAttempt, questions_qs
) -> Tuple[float, float, int, int, int]:
    """Server-side scoring. Never trusts client input."""
    test = attempt.test_series
    answers_map: Dict[int, Optional[str]] = {
        a.question_id: a.selected_option
        for a in attempt.answers.select_related("question").all()
    }

    raw_score = 0.0
    total_marks = 0.0
    correct_count = wrong_count = unattempted_count = 0

    for q in questions_qs:
        q_marks = float(q.marks) if q.marks is not None else float(test.default_marks)
        q_neg = float(q.negative_marks) if q.negative_marks is not None else float(test.default_negative_marks)
        total_marks += q_marks

        selected = answers_map.get(q.id)
        if selected is None:
            unattempted_count += 1
        elif selected.upper() == q.correct_option.upper():
            raw_score += q_marks
            correct_count += 1
        else:
            raw_score -= q_neg
            wrong_count += 1

    return max(0.0, round(raw_score, 2)), round(total_marks, 2), correct_count, wrong_count, unattempted_count


def compute_subject_analysis(attempt: UserTestAttempt) -> List[Dict[str, Any]]:
    """Compute per-subject performance breakdown using shared scoring logic."""
    test = attempt.test_series
    answers_map: Dict[int, Optional[str]] = {
        a.question_id: a.selected_option
        for a in attempt.answers.all()
    }

    subjects: Dict[str, Dict[str, Any]] = {}
    for q in test.questions.all().order_by('question_number', 'order'):
        subj = q.subject or 'General'
        if subj not in subjects:
            subjects[subj] = {
                'subject': subj,
                'total': 0,
                'correct': 0,
                'wrong': 0,
                'unanswered': 0,
                'score': 0.0,
                'maxMarks': 0.0,
            }

        q_marks = float(q.marks) if q.marks is not None else float(test.default_marks)
        q_neg = float(q.negative_marks) if q.negative_marks is not None else float(test.default_negative_marks)

        s_entry = subjects[subj]
        s_entry['total'] += 1
        s_entry['maxMarks'] += q_marks

        selected = answers_map.get(q.id)
        if selected is None:
            s_entry['unanswered'] += 1
        elif selected.upper() == q.correct_option.upper():
            s_entry['correct'] += 1
            s_entry['score'] += q_marks
        else:
            s_entry['wrong'] += 1
            s_entry['score'] -= q_neg

    out = []
    for s_entry in subjects.values():
        s_entry['score'] = max(0.0, round(s_entry['score'], 2))
        s_entry['maxMarks'] = round(s_entry['maxMarks'], 2)
        out.append(s_entry)
    return out


# ── Public service functions ──────────────────────────────────────────────────

def start_attempt(user, test: TestSeries) -> UserTestAttempt:
    """Start or resume an in-progress attempt. Thread-safe via select_for_update."""
    _check_availability(test)
    _check_entitlement(user, test)

    with transaction.atomic():
        qs = UserTestAttempt.objects.filter(
            user=user, test_series=test, status=AttemptStatus.IN_PROGRESS,
        )
        if connection.vendor != 'sqlite':
            qs = qs.select_for_update()
        existing = qs.first()

        if existing:
            if existing.expires_at and timezone.now() > existing.expires_at:
                _auto_submit(existing)
                # Fall through — create a new attempt
            else:
                return existing

        _check_max_attempts(user, test)

        now = timezone.now()
        duration = test.duration_minutes or 0
        expires_at = now + timedelta(minutes=duration) if duration > 0 else None
        total_marks = float(test.total_marks) if test.total_marks is not None else 0.0
        return UserTestAttempt.objects.create(
            user=user,
            test_series=test,
            started_at=now,
            expires_at=expires_at,
            status=AttemptStatus.IN_PROGRESS,
            score=0.0,
            total_marks=total_marks,
            correct_count=0,
            wrong_count=0,
            unattempted_count=0,
            percentage=0.0,
            answers_json={},
        )


def save_answer(
    user, attempt_id: int, question_id: int,
    selected_option: Optional[str], mark_for_review: bool = False,
) -> UserTestAnswer:
    """Save/update a single answer for an in-progress attempt."""
    attempt = (
        UserTestAttempt.objects.select_related("test_series")
        .filter(id=attempt_id).first()
    )
    if attempt is None:
        raise AttemptNotFound()
    if attempt.user_id != user.id:
        raise AttemptOwnershipError()
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise AttemptAlreadySubmitted(
            f"Attempt status is '{attempt.status}'; answers can only be saved while in progress."
        )
    if attempt.expires_at and timezone.now() > attempt.expires_at:
        _auto_submit(attempt)
        raise AttemptExpired()

    try:
        question = TestQuestion.objects.get(id=question_id, test_series=attempt.test_series)
    except TestQuestion.DoesNotExist:
        raise QuestionNotInExam(
            f"Question {question_id} does not belong to exam '{attempt.test_series.slug}'."
        )

    if selected_option is not None:
        selected_option = selected_option.strip().upper()
        if selected_option not in ("A", "B", "C", "D"):
            raise ExamServiceError("selected_option must be one of A, B, C, D, or null.")

    answer, _ = UserTestAnswer.objects.update_or_create(
        attempt=attempt, question=question,
        defaults={"selected_option": selected_option, "is_marked_for_review": mark_for_review},
    )
    return answer


def submit_attempt(user, attempt_id: int) -> UserTestAttempt:
    """Submit and score an attempt. Idempotent — repeated calls return existing result."""
    attempt = (
        UserTestAttempt.objects.select_related("test_series")
        .filter(id=attempt_id).first()
    )
    if attempt is None:
        raise AttemptNotFound()
    if attempt.user_id != user.id:
        raise AttemptOwnershipError()

    with transaction.atomic():
        qs = UserTestAttempt.objects.filter(id=attempt_id)
        if connection.vendor != 'sqlite':
            qs = qs.select_for_update()
        attempt = qs.get()
        if attempt.status in (AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED):
            return attempt  # Idempotent
        if attempt.status != AttemptStatus.IN_PROGRESS:
            raise InvalidStateTransition(f"Cannot submit attempt with status '{attempt.status}'.")
        return _finalize_attempt(attempt, final_status=AttemptStatus.SUBMITTED)


def get_attempt_result(user, attempt_id: int) -> UserTestAttempt:
    """Return a submitted attempt for result review. Ownership-checked."""
    attempt = (
        UserTestAttempt.objects.select_related("test_series", "user")
        .filter(id=attempt_id).first()
    )
    if attempt is None:
        raise AttemptNotFound()
    if attempt.user_id != user.id and not user.is_staff:
        raise AttemptOwnershipError()
    if attempt.status == AttemptStatus.IN_PROGRESS:
        raise InvalidStateTransition("Attempt is still in progress.")
    return attempt


def record_visibility_event(user, attempt_id: int, event: str) -> Dict[str, Any]:
    """
    Handle student window hidden / visible events.
    integrity_mode:
      - 'off': no-op, return {autoSubmitted: false}
      - 'hidden': sets hidden_at = now if not set
      - 'visible': if hidden_at set and elapsed > 2s:
          'strict' -> auto-submit with integrity_violation=True
          'warn' -> set integrity_violation=True, warning=True
        Always clear hidden_at after handling.
    """
    attempt = (
        UserTestAttempt.objects.select_related("test_series")
        .filter(id=attempt_id).first()
    )
    if attempt is None:
        raise AttemptNotFound()
    if attempt.user_id != user.id:
        raise AttemptOwnershipError()
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return {"autoSubmitted": False}

    mode = attempt.test_series.integrity_mode
    if mode == IntegrityMode.OFF:
        return {"autoSubmitted": False}

    now = timezone.now()
    if event == "hidden":
        if not attempt.hidden_at:
            attempt.hidden_at = now
            attempt.save(update_fields=["hidden_at"])
        return {"autoSubmitted": False}

    elif event == "visible":
        if attempt.hidden_at:
            elapsed = (now - attempt.hidden_at).total_seconds()
            attempt.hidden_at = None
            if elapsed > 2.0:
                if mode == IntegrityMode.STRICT:
                    attempt.integrity_violation = True
                    attempt.save(update_fields=["hidden_at", "integrity_violation"])
                    _finalize_attempt(attempt, final_status=AttemptStatus.AUTO_SUBMITTED)
                    return {"autoSubmitted": True, "integrityViolation": True}
                elif mode == IntegrityMode.WARN:
                    attempt.integrity_violation = True
                    attempt.save(update_fields=["hidden_at", "integrity_violation"])
                    return {"autoSubmitted": False, "warning": True, "integrityViolation": True}
            attempt.save(update_fields=["hidden_at"])
        return {"autoSubmitted": False}

    return {"autoSubmitted": False}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _auto_submit(attempt: UserTestAttempt) -> UserTestAttempt:
    if attempt.status != AttemptStatus.IN_PROGRESS:
        return attempt
    return _finalize_attempt(attempt, final_status=AttemptStatus.AUTO_SUBMITTED)


def _finalize_attempt(attempt: UserTestAttempt, final_status: str) -> UserTestAttempt:
    """Score and persist. Caller must hold DB lock."""
    questions = attempt.test_series.questions.all()
    score, total_marks, correct_count, wrong_count, unattempted_count = _compute_score(attempt, questions)

    now = timezone.now()
    time_taken = max(0, int((now - attempt.started_at).total_seconds())) if attempt.started_at else 0
    percentage = round((score / total_marks) * 100.0, 2) if total_marks > 0 else 0.0

    answers_json = {}
    for ans in attempt.answers.select_related("question").all():
        if ans.selected_option:
            answers_json[str(ans.question_id)] = ord(ans.selected_option.upper()) - ord("A")

    attempt.score = score
    attempt.total_marks = total_marks
    attempt.correct_count = correct_count
    attempt.wrong_count = wrong_count
    attempt.unattempted_count = unattempted_count
    attempt.percentage = percentage
    attempt.time_taken_seconds = time_taken
    attempt.status = final_status
    attempt.submitted_at = now
    attempt.answers_json = answers_json
    attempt.save(update_fields=[
        "score", "total_marks", "correct_count", "wrong_count", "unattempted_count",
        "percentage", "time_taken_seconds", "status", "submitted_at", "answers_json",
        "integrity_violation",
    ])
    logger.info(
        "Attempt %d finalized: user=%s exam=%s status=%s score=%.2f/%.2f",
        attempt.id, attempt.user_id, attempt.test_series.slug,
        final_status, score, total_marks,
    )
    return attempt
