from django.db import migrations

def seed_centre_and_settings(apps, schema_editor):
    SiteSettings = apps.get_model('site_config', 'SiteSettings')
    Centre = apps.get_model('site_config', 'Centre')

    if not SiteSettings.objects.exists():
        SiteSettings.objects.create(
            pk=1,
            site_name='SIMS Raipur',
            whatsapp_counsellor_number='',
            whatsapp_group_url='',
            whatsapp_counsellor_message='Hi SIMS Raipur, I would like to talk to a counsellor about {course}.',
            floating_whatsapp_enabled=True,
            floating_whatsapp_target='counsellor',
            floating_whatsapp_message='Hi SIMS Raipur, I would like to inquire about coaching programs.',
            support_phone='8959774702',
            support_email='info@simsraipuredu.in',
        )

    if not Centre.objects.exists():
        Centre.objects.create(
            name='SIMS Raipur Main Campus',
            address='3rd Floor, SBI Building, Main Road, Chaoubey Colony, Samta, Raipur – 492001',
            city='Raipur',
            phone='8959774702',
            maps_url='https://maps.google.com/?q=SIMS+Raipur+Chaoubey+Colony',
            is_primary=True,
            is_active=True,
            order=0,
        )

def unseed_centre_and_settings(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('site_config', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_centre_and_settings, unseed_centre_and_settings),
    ]
