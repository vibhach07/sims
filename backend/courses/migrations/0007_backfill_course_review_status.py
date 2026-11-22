from django.db import migrations

def backfill_review_status(apps, schema_editor):
    Course = apps.get_model('courses', 'Course')
    Course.objects.filter(is_published=True).update(review_status='approved')
    Course.objects.filter(is_published=False).update(review_status='draft')

class Migration(migrations.Migration):
    dependencies = [
        ('courses', '0006_course_review_note_course_review_status_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_review_status, migrations.RunPython.noop),
    ]
