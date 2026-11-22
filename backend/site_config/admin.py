import urllib.parse
from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import display
from .models import SiteSettings, Centre


@admin.register(SiteSettings)
class SiteSettingsAdmin(ModelAdmin):
    list_display = (
        'site_name',
        'whatsapp_counsellor_number',
        'support_phone',
        'whatsapp_test_link',
        'updated_at',
    )
    readonly_fields = ('updated_at',)

    fieldsets = (
        ('Branding & Identity', {
            'fields': ('site_name',)
        }),
        ('WhatsApp Integration', {
            'fields': (
                'whatsapp_counsellor_number',
                'whatsapp_counsellor_message',
                'whatsapp_group_url',
                'floating_whatsapp_enabled',
                'floating_whatsapp_target',
                'floating_whatsapp_message',
            )
        }),
        ('Support Contacts', {
            'fields': ('support_phone', 'support_email')
        }),
        ('System Timestamps', {
            'fields': ('updated_at',)
        }),
    )

    @display(description='WhatsApp Link')
    def whatsapp_test_link(self, obj):
        if not obj.whatsapp_counsellor_number:
            return '-'
        msg = (obj.whatsapp_counsellor_message or '').replace('{course}', 'courses')
        url = f"https://wa.me/{obj.whatsapp_counsellor_number}?text={urllib.parse.quote(msg, safe='')}"
        return format_html('<a href="{}" target="_blank" class="text-primary-600 font-semibold underline">Test WhatsApp</a>', url)

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()


@admin.register(Centre)
class CentreAdmin(ModelAdmin):
    list_display = (
        'name',
        'city',
        'phone',
        'show_primary',
        'show_active',
        'map_test_link',
        'order',
    )
    list_filter = ('is_primary', 'is_active', 'city')
    search_fields = ('name', 'address', 'city', 'phone')
    ordering = ('order', 'name')
    list_per_page = 25

    fieldsets = (
        ('Centre Details', {
            'fields': ('name', 'address', 'city', 'phone')
        }),
        ('Location & Maps', {
            'fields': ('maps_url', 'latitude', 'longitude', 'embed_url')
        }),
        ('Display & Ordering', {
            'fields': ('is_primary', 'is_active', 'order')
        }),
    )

    @display(description='Primary', boolean=True)
    def show_primary(self, obj):
        return obj.is_primary

    @display(description='Active', boolean=True)
    def show_active(self, obj):
        return obj.is_active

    @display(description='Map Link')
    def map_test_link(self, obj):
        link = obj.map_link
        if not link:
            return '-'
        return format_html('<a href="{}" target="_blank" class="text-primary-600 font-semibold underline">Test Map Link</a>', link)
