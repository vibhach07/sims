from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from assessments.models import UserTestAttempt, AttemptStatus
from assessments.services import _finalize_attempt


class Command(BaseCommand):
    help = "Auto-submits expired in-progress test attempts past expires_at + grace_seconds."

    def add_arguments(self, parser):
        parser.add_argument(
            '--grace-seconds',
            type=int,
            default=5,
            help="Grace period seconds past expires_at before auto-submitting (default: 5)"
        )

    def handle(self, *args, **options):
        grace = options['grace_seconds']
        cutoff = timezone.now() - timedelta(seconds=grace)

        expired_attempts = UserTestAttempt.objects.filter(
            status=AttemptStatus.IN_PROGRESS,
            expires_at__isnull=False,
            expires_at__lt=cutoff
        )

        count = 0
        for attempt in expired_attempts:
            with transaction.atomic():
                locked = UserTestAttempt.objects.select_for_update().filter(
                    id=attempt.id, status=AttemptStatus.IN_PROGRESS
                ).first()
                if locked:
                    _finalize_attempt(locked, final_status=AttemptStatus.AUTO_SUBMITTED)
                    count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully auto-submitted {count} expired attempt(s)."))
