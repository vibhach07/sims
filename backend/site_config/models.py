import urllib.parse
from django.db import models
from .validators import (
    validate_whatsapp_number,
    validate_whatsapp_url,
    validate_maps_url,
    validate_embed_url
)

class SiteSettings(models.Model):
    site_name = models.CharField(max_length=200, default='SIMS Raipur')
    whatsapp_counsellor_number = models.CharField(
        max_length=20, blank=True, validators=[validate_whatsapp_number],
        help_text='Country code and digits only, e.g. 918959774702'
    )
    whatsapp_group_url = models.URLField(
        max_length=500, blank=True, validators=[validate_whatsapp_url],
        help_text='https://chat.whatsapp.com/... or https://wa.me/...'
    )
    whatsapp_counsellor_message = models.TextField(
        default='Hi SIMS Raipur, I would like to talk to a counsellor about {course}.'
    )
    floating_whatsapp_enabled = models.BooleanField(default=True)
    floating_whatsapp_target = models.CharField(
        max_length=20,
        choices=[('counsellor', 'Counsellor'), ('group', 'Group')],
        default='counsellor'
    )
    floating_whatsapp_message = models.TextField(
        default='Hi SIMS Raipur, I would like to inquire about coaching programs.',
        blank=True
    )
    support_phone = models.CharField(max_length=50, default='8959774702', blank=True)
    support_email = models.EmailField(default='info@simsraipuredu.in', blank=True)
    instagram_url = models.URLField(max_length=500, blank=True, default='', help_text='e.g. https://www.instagram.com/simsraipur')
    facebook_url = models.URLField(max_length=500, blank=True, default='', help_text='e.g. https://www.facebook.com/simsraipur')
    youtube_url = models.URLField(max_length=500, blank=True, default='', help_text='e.g. https://www.youtube.com/@simsraipur')
    website_url = models.URLField(max_length=500, blank=True, default='https://simsraipuredu.in')
    admin_passcode = models.CharField(
        max_length=100,
        default='admin123',
        blank=True,
        help_text='Passcode required to unlock Admin Panel'
    )
    educator_passcode = models.CharField(
        max_length=100,
        default='educator123',
        blank=True,
        help_text='Passcode required to unlock Educator Workspace'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"{self.site_name} Settings"


class Centre(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100, default='Raipur')
    phone = models.CharField(max_length=50, blank=True)
    maps_url = models.URLField(
        max_length=500, blank=True, validators=[validate_maps_url],
        help_text='Optional Google Maps share link'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    embed_url = models.URLField(
        max_length=1000, blank=True, validators=[validate_embed_url],
        help_text='Optional Google Maps embed iframe URL'
    )
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['-is_primary', 'order', 'id']
        verbose_name = 'Centre'
        verbose_name_plural = 'Centres'

    def save(self, *args, **kwargs):
        if self.is_primary:
            Centre.objects.exclude(pk=self.pk).update(is_primary=False)
        else:
            if not Centre.objects.exclude(pk=self.pk).filter(is_primary=True).exists():
                self.is_primary = True
        super().save(*args, **kwargs)

    @property
    def map_link(self):
        if self.maps_url:
            return self.maps_url
        if self.latitude is not None and self.longitude is not None:
            return f"https://www.google.com/maps/search/?api=1&query={self.latitude},{self.longitude}"
        query = f"{self.name} {self.address}".strip()
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(query)}"

    @property
    def directions_link(self):
        if self.latitude is not None and self.longitude is not None:
            dest = f"{self.latitude},{self.longitude}"
        else:
            dest = urllib.parse.quote_plus(f"{self.name} {self.address}".strip())
        return f"https://www.google.com/maps/dir/?api=1&destination={dest}"

    def __str__(self):
        return f"{self.name} ({self.city})" + (' [Primary]' if self.is_primary else '')
