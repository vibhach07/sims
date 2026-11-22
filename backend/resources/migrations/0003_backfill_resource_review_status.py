from django.db import migrations

def backfill_review_status(apps, schema_editor):
    StudyResource = apps.get_model('resources', 'StudyResource')
    StudyResource.objects.filter(is_published=True).update(review_status='approved')
    StudyResource.objects.filter(is_published=False).update(review_status='draft')

class Migration(migrations.Migration):
    dependencies = [
        ('resources', '0002_studyresource_created_by_studyresource_review_note_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_review_status, migrations.RunPython.noop),
    ]
