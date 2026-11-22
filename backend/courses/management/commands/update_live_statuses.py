from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from courses.models import LiveClass

class Command(BaseCommand):
    help = "Marks scheduled live classes past their end as ended, and ends stale live classes."

    def handle(self, *args, **options):
        now = timezone.now()
        missed = LiveClass.objects.filter(
            status="scheduled",
            scheduled_end__lt=now
        )
        count_missed = missed.count()
        missed.update(status="ended", ended_at=now)

        stale_hours = getattr(settings, "LIVE_CLASS_STALE_HOURS", 3)
        stale_cutoff = now - timezone.timedelta(hours=stale_hours)
        stale = LiveClass.objects.filter(
            status="live",
            scheduled_end__lt=stale_cutoff
        )
        count_stale = stale.count()
        stale.update(status="ended", ended_at=now)

        self.stdout.write(self.style.SUCCESS(
            f"Updated {count_missed} scheduled class(es) and {count_stale} stale live class(es) to ended."
        ))
