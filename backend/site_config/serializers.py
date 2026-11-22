import urllib.parse
from rest_framework import serializers
from .models import SiteSettings, Centre

class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            'site_name',
            'whatsapp_counsellor_number',
            'whatsapp_group_url',
            'whatsapp_counsellor_message',
            'floating_whatsapp_enabled',
            'floating_whatsapp_target',
            'floating_whatsapp_message',
            'support_phone',
            'support_email',
            'instagram_url',
            'facebook_url',
            'youtube_url',
            'website_url',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class SiteSettingsAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = [
            'site_name',
            'whatsapp_counsellor_number',
            'whatsapp_group_url',
            'whatsapp_counsellor_message',
            'floating_whatsapp_enabled',
            'floating_whatsapp_target',
            'floating_whatsapp_message',
            'support_phone',
            'support_email',
            'instagram_url',
            'facebook_url',
            'youtube_url',
            'website_url',
            'admin_passcode',
            'educator_passcode',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class CentrePublicSerializer(serializers.ModelSerializer):
    map_link = serializers.CharField(read_only=True)
    directions_link = serializers.CharField(read_only=True)

    class Meta:
        model = Centre
        fields = [
            'id',
            'name',
            'address',
            'city',
            'phone',
            'maps_url',
            'latitude',
            'longitude',
            'embed_url',
            'is_primary',
            'order',
            'map_link',
            'directions_link',
        ]


class CentreAdminSerializer(serializers.ModelSerializer):
    map_link = serializers.CharField(read_only=True)
    directions_link = serializers.CharField(read_only=True)

    class Meta:
        model = Centre
        fields = [
            'id',
            'name',
            'address',
            'city',
            'phone',
            'maps_url',
            'latitude',
            'longitude',
            'embed_url',
            'is_primary',
            'is_active',
            'order',
            'map_link',
            'directions_link',
        ]


class PublicSiteConfigSerializer(serializers.Serializer):
    settings = SiteSettingsSerializer()
    centres = CentrePublicSerializer(many=True)
    counsellor_chat_url = serializers.SerializerMethodField()
    floating_target_url = serializers.SerializerMethodField()

    def get_counsellor_chat_url(self, obj):
        settings = obj.get('settings')
        if not settings or not settings.whatsapp_counsellor_number:
            return None
        text = settings.whatsapp_counsellor_message.replace('{course}', 'your courses')
        return f"https://wa.me/{settings.whatsapp_counsellor_number}?text={urllib.parse.quote(text, safe='')}"

    def get_floating_target_url(self, obj):
        settings = obj.get('settings')
        if not settings or not settings.floating_whatsapp_enabled:
            return None
        if settings.floating_whatsapp_target == 'group' and settings.whatsapp_group_url:
            return settings.whatsapp_group_url
        if settings.whatsapp_counsellor_number:
            msg = settings.floating_whatsapp_message or settings.whatsapp_counsellor_message.replace('{course}', 'your programs')
            return f"https://wa.me/{settings.whatsapp_counsellor_number}?text={urllib.parse.quote(msg, safe='')}"
        return None
