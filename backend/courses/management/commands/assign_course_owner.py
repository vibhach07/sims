from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from courses.models import Course

User = get_user_model()


class Command(BaseCommand):
    help = "Assign created_by on unowned courses (where created_by is null) to a specified user email."

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            required=True,
            type=str,
            help='Email of the user to assign courses to.',
        )
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument(
            '--slug',
            type=str,
            help='Slug of the specific course to assign.',
        )
        group.add_argument(
            '--all-unowned',
            action='store_true',
            help='Assign all unowned courses (created_by is null) to this user.',
        )

    def handle(self, *args, **options):
        email = options['email'].strip()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f"User with email '{email}' does not exist.")

        if options.get('all_unowned'):
            qs = Course.objects.filter(created_by__isnull=True)
            count = qs.update(created_by=user)
            self.stdout.write(self.style.SUCCESS(f"Updated {count} unowned course(s) to owner '{email}'."))
            return

        slug = options.get('slug')
        if slug:
            qs = Course.objects.filter(slug=slug, created_by__isnull=True)
            if not qs.exists():
                if not Course.objects.filter(slug=slug).exists():
                    raise CommandError(f"Course with slug '{slug}' does not exist.")
                else:
                    self.stdout.write(self.style.WARNING(f"Course '{slug}' already has an owner or 0 updated."))
                    return
            count = qs.update(created_by=user)
            self.stdout.write(self.style.SUCCESS(f"Updated {count} course '{slug}' to owner '{email}'."))
