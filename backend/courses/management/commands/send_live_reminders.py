from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from courses.models import LiveClass, UserEnrollment
from users.models import Notification

class Command(BaseCommand):
    help = "Sends 30-minute upcoming reminders and live reminders to enrolled students."

    def handle(self, *args, **options):
        now = timezone.now()
        thirty_mins_later = now + timedelta(minutes=30)

        # 1. Classes starting within 30 minutes that have not had 30m reminder sent
        upcoming = LiveClass.objects.filter(
            status="scheduled",
            scheduled_start__lte=thirty_mins_later,
            scheduled_start__gte=now,
            reminder_30m_sent=False
        )

        upcoming_count = 0
        upcoming_notifs = []
        for lc in upcoming:
            if lc.course:
                enrolled = UserEnrollment.objects.filter(course=lc.course, is_active=True).values_list("user", flat=True)
                for uid in enrolled:
                    upcoming_notifs.append(Notification(
                        user_id=uid,
                        title="Live Class Starting Soon",
                        body=f"{lc.title} starts in less than 30 minutes.",
                        link=f"/student/live/{lc.id}"
                    ))
            lc.reminder_30m_sent = True
            lc.save(update_fields=["reminder_30m_sent"])
            upcoming_count += 1

        if upcoming_notifs:
            Notification.objects.bulk_create(upcoming_notifs, batch_size=500)

        # 2. Classes currently live that have not had live reminder sent
        live_classes = LiveClass.objects.filter(
            status="live",
            live_reminder_sent=False
        )

        live_count = 0
        live_notifs = []
        for lc in live_classes:
            if lc.course:
                enrolled = UserEnrollment.objects.filter(course=lc.course, is_active=True).values_list("user", flat=True)
                for uid in enrolled:
                    live_notifs.append(Notification(
                        user_id=uid,
                        title="Live Class is LIVE Now!",
                        body=f"{lc.title} is currently live. Join the stream.",
                        link=f"/student/live/{lc.id}"
                    ))
            lc.live_reminder_sent = True
            lc.save(update_fields=["live_reminder_sent"])
            live_count += 1

        if live_notifs:
            Notification.objects.bulk_create(live_notifs, batch_size=500)

        self.stdout.write(self.style.SUCCESS(
            f"Sent reminders for {upcoming_count} upcoming class(es) and {live_count} live class(es)."
        ))
