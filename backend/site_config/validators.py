import re
from django.core.exceptions import ValidationError

def validate_whatsapp_number(value):
    if not value:
        return
    val = str(value).strip()
    if not re.match(r'^[0-9]{10,15}$', val):
        raise ValidationError('WhatsApp number must contain only digits (country code included, no +) and be 10-15 digits long.')

def validate_whatsapp_url(value):
    if not value:
        return
    val = str(value).strip()
    allowed_prefixes = (
        'https://wa.me/',
        'https://chat.whatsapp.com/',
        'https://whatsapp.com/channel/'
    )
    if not any(val.startswith(p) for p in allowed_prefixes):
        raise ValidationError('WhatsApp URL must start with https://wa.me/, https://chat.whatsapp.com/, or https://whatsapp.com/channel/.')

def validate_maps_url(value):
    if not value:
        return
    val = str(value).strip()
    allowed_prefixes = (
        'https://maps.app.goo.gl/',
        'https://www.google.com/maps/',
        'https://maps.google.com/'
    )
    if not any(val.startswith(p) for p in allowed_prefixes):
        raise ValidationError('Maps URL must start with https://maps.app.goo.gl/ or https://www.google.com/maps/.')

def validate_embed_url(value):
    if not value:
        return
    val = str(value).strip()
    if not val.startswith('https://www.google.com/maps/embed'):
        raise ValidationError('Map embed URL must start with https://www.google.com/maps/embed.')
