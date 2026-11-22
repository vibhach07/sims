from django.db import migrations

def backfill_review_status(apps, schema_editor):
    TestSeries = apps.get_model('assessments', 'TestSeries')
    TestSeries.objects.filter(is_published=True).update(review_status='approved')
    TestSeries.objects.filter(is_published=False).update(review_status='draft')

class Migration(migrations.Migration):
    dependencies = [
        ('assessments', '0005_testseries_review_note_testseries_review_status_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_review_status, migrations.RunPython.noop),
    ]
