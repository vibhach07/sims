import re
from urllib.parse import urlparse, parse_qs
from rest_framework.exceptions import ValidationError

YOUTUBE_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{11}$")

YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
}

VIMEO_HOSTS = {
    "vimeo.com",
    "www.vimeo.com",
    "player.vimeo.com",
}

MEET_HOST = "meet.google.com"
MEET_RECORDING_HOSTS = {"meet.google.com", "drive.google.com", "docs.google.com"}

def validate_url_common(url, field_name="stream_url"):
    if not url or not isinstance(url, str):
        raise ValidationError({field_name: "URL is required."})

    cleaned = url.strip()
    if not cleaned.startswith("https://"):
        raise ValidationError({field_name: f"{field_name} must use https:// protocol."})

    if "@" in cleaned:
        # Check if it is user credentials before host, vs path handle
        parsed = urlparse(cleaned)
        if parsed.username or parsed.password:
            raise ValidationError({field_name: "URLs with user credentials are not permitted."})
        # If @ appears before hostname or in netloc
        if "@" in (parsed.netloc or ""):
            raise ValidationError({field_name: "URLs with user credentials are not permitted."})
    else:
        parsed = urlparse(cleaned)

    if parsed.scheme != "https":
        raise ValidationError({field_name: f"{field_name} must use https:// protocol."})

    if parsed.username or parsed.password:
        raise ValidationError({field_name: "URLs with user credentials are not permitted."})

    if parsed.port is not None and parsed.port != 443:
        raise ValidationError({field_name: "Non-standard ports are not permitted."})

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValidationError({field_name: "Invalid URL hostname."})

    return cleaned, parsed, hostname


def is_valid_host_for_provider(hostname, provider):
    if provider == "youtube":
        return hostname in YOUTUBE_HOSTS
    elif provider == "vimeo":
        return hostname in VIMEO_HOSTS
    elif provider == "zoom":
        return hostname == "zoom.us" or (hostname.endswith(".zoom.us") and hostname != ".zoom.us" and not hostname.startswith("."))
    elif provider == "meet":
        return hostname == MEET_HOST
    elif provider == "other":
        return bool(hostname)
    return False


def parse_and_validate_stream_url(stream_url, provider):
    cleaned, parsed, hostname = validate_url_common(stream_url, "stream_url")

    if hostname in YOUTUBE_HOSTS:
        if parsed.path.startswith("/@") or "/@" in parsed.path:
            raise ValidationError({
                "stream_url": "YouTube channel handles (/@handle) cannot be used. Please paste the direct watch link (youtube.com/watch?v=...)."
            })

    if not is_valid_host_for_provider(hostname, provider):
        raise ValidationError({"stream_url": f"Invalid host for provider '{provider}'."})

    if provider == "youtube":
        video_id = None
        if hostname == "youtu.be":
            path_parts = [p for p in parsed.path.split("/") if p]
            if path_parts:
                video_id = path_parts[0]
        elif hostname in YOUTUBE_HOSTS:
            if parsed.path.startswith("/live/"):
                path_parts = [p for p in parsed.path.split("/") if p]
                if len(path_parts) >= 2:
                    video_id = path_parts[1]
            elif parsed.path.startswith("/embed/"):
                path_parts = [p for p in parsed.path.split("/") if p]
                if len(path_parts) >= 2:
                    video_id = path_parts[1]
            elif parsed.path == "/watch":
                qs = parse_qs(parsed.query)
                video_id = qs.get("v", [None])[0]

        if not video_id or not YOUTUBE_ID_REGEX.match(video_id):
            raise ValidationError({
                "stream_url": "Invalid YouTube URL. Must be a valid watch, youtu.be, /live/ or /embed/ URL."
            })

        embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}"
        join_url = f"https://www.youtube.com/watch?v={video_id}"
        return cleaned, embed_url, join_url

    elif provider == "vimeo":
        video_id = None
        path_parts = [p for p in parsed.path.split("/") if p]
        if path_parts:
            candidate = path_parts[-1]
            if candidate.isdigit():
                video_id = candidate

        if not video_id:
            raise ValidationError({
                "stream_url": "Invalid Vimeo URL. Must contain a valid Vimeo video/event ID."
            })

        embed_url = f"https://player.vimeo.com/video/{video_id}"
        join_url = f"https://vimeo.com/{video_id}"
        return cleaned, embed_url, join_url

    elif provider == "zoom":
        return cleaned, None, cleaned

    elif provider == "meet":
        return cleaned, None, cleaned

    elif provider == "other":
        return cleaned, None, cleaned

    else:
        raise ValidationError({"provider": f"Unsupported provider '{provider}'."})


def validate_recording_url(recording_url, provider=None):
    cleaned, parsed, hostname = validate_url_common(recording_url, "recording_url")

    if hostname in YOUTUBE_HOSTS:
        if parsed.path.startswith("/@") or "/@" in parsed.path:
            raise ValidationError({
                "recording_url": "YouTube channel handles (/@handle) cannot be used as recording URLs. Please paste the direct watch link (youtube.com/watch?v=...)."
            })

    if provider:
        if provider == "meet":
            if hostname not in MEET_RECORDING_HOSTS:
                raise ValidationError({"recording_url": f"Invalid recording host for provider 'meet'. Allowed hosts: meet.google.com, drive.google.com, docs.google.com."})
        else:
            if not is_valid_host_for_provider(hostname, provider):
                raise ValidationError({"recording_url": f"Invalid recording host for provider '{provider}'."})
    else:
        valid_any = any(is_valid_host_for_provider(hostname, p) for p in ["youtube", "vimeo", "zoom", "meet", "other"]) or (hostname in MEET_RECORDING_HOSTS)
        if not valid_any:
            raise ValidationError({"recording_url": "Invalid recording URL host."})

    return cleaned
