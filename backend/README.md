# SIMS Raipur Backend API Service

Django REST Framework backend for SIMS Raipur educational platform.

## Architecture
- **Framework**: Django 6.1 + Django REST Framework + django-cors-headers
- **Database**: PostgreSQL (via `DATABASE_URL`) with automatic SQLite3 local fallback (`db.sqlite3`)
- **Apps**:
  - `users`: User authentication, profile management, tokens (`/api/auth/`)
  - `courses`: Courses, modules, lectures, enrollments, video discovery, lecture progress (`/api/courses/`)
  - `assessments`: Test series, CBT mock questions, user test attempts, access gates (`/api/assessments/`)
  - `resources`: Downloadable notes, formula sheets, PYQs, entitlement gates (`/api/resources/`)
  - `orders`: Authoritative database pricing, pending orders, Razorpay payment verification, entitlement granting (`/api/orders/`)

## Environment Variables
- `RAZORPAY_KEY_ID`: Razorpay Merchant Key ID (defaults to sandbox `rzp_test_sims_placeholder`)
- `RAZORPAY_KEY_SECRET`: Razorpay Secret for HMAC-SHA256 signature verification
- `DATABASE_URL`: PostgreSQL connection string (optional)
- `DJANGO_SECRET_KEY`: Django secret key

## Running Backend
```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py seed_sims_data
python manage.py runserver 8000
```

## Running Tests
```bash
python manage.py test orders courses assessments resources users
```

## Scheduling Expired Attempts Auto-Submission
To ensure in-progress test attempts are finalized if a student closes their browser or loses connectivity, run `auto_submit_expired_attempts` periodically.

### 1. Cron Job (Every minute)
Add to the system crontab (`crontab -e`):
```cron
* * * * * cd /path/to/sims-raipur-backend && /path/to/sims-raipur-backend/venv/bin/python manage.py auto_submit_expired_attempts --grace-seconds 5 >> /var/log/sims_auto_submit.log 2>&1
```

### 2. Docker Compose Background Worker
Add a dedicated worker service to `docker-compose.yml`:
```yaml
  auto-submit-worker:
    build: .
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
    command: >
      sh -c "while true; do
        python manage.py auto_submit_expired_attempts --grace-seconds 5;
        sleep 30;
      done"
    depends_on:
      - web
```

## Site Configuration & WhatsApp Integration (RUN 5)
- Public endpoint: `GET /api/site/` (cached 5 min with ETag & Cache-Control).
- Admin endpoints: `GET/PUT /api/site/admin/settings/`, `GET/POST /api/site/admin/centres/`, `GET/PUT/DELETE /api/site/admin/centres/<id>/`.
- WhatsApp validation: Counsellor numbers must be digits-only (10-15 digits, country code included, no +). WhatsApp links must start with `https://wa.me/`, `https://chat.whatsapp.com/`, or `https://whatsapp.com/channel/`.
- Google Maps validation: Maps URL must be `https://maps.app.goo.gl/...` or `https://www.google.com/maps/...`. Embed URL must start with `https://www.google.com/maps/embed`.


## Media & File Upload Setup (Faculty Photos)
### Environment Variables
- `MEDIA_URL`: Public URL prefix for media files (default: `/media/`)
- `MEDIA_ROOT`: Absolute or relative path to store uploads on disk (default: `BASE_DIR / media`)

### Storage Architecture
- **Development**: Served automatically when `DEBUG=True` via Django `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`.
- **Production (Nginx)**:
  ```nginx
  location /media/ {
      alias /var/www/sims-raipur-backend/media/;
      expires 30d;
      add_header Cache-Control "public, no-transform";
  }
  ```
- **Production (Object Storage)**: Set up `django-storages[boto3]` or `django-storages[google]` by setting `DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"`.
- **Docker Compose**: Persisted via dedicated named volume:
  ```yaml
  volumes:
    - media_files:/app/media
  ```

### Upload Hardening Pipeline
- Accepted formats: JPEG, PNG, WebP verified via Pillow (`PIL.Image.verify()`).
- File size capped at 2MB; dimensions capped at 4000x4000px; animated GIFs/WebPs rejected.
- Uploads auto-resized to max 800x800px preserving aspect ratio using high-quality Lanczos resampling.
- EXIF metadata and GPS locations automatically stripped during re-encoding.
- Randomized UUID filenames assigned to eliminate client-supplied path traversal risks.
- Replacing or deleting a faculty profile automatically purges previous physical files from storage.


## Live Classes Scheduling & Reminder Workers (RUN 7)
Periodic maintenance commands keep live class statuses updated and send automated student notifications.

### 1. Crontab (Every 5 minutes for reminders, every 10 minutes for status updates)
```cron
*/5 * * * * cd /path/to/sims-raipur-backend && /path/to/sims-raipur-backend/venv/bin/python manage.py send_live_reminders >> /var/log/sims_live_reminders.log 2>&1
*/10 * * * * cd /path/to/sims-raipur-backend && /path/to/sims-raipur-backend/venv/bin/python manage.py update_live_statuses >> /var/log/sims_live_status.log 2>&1
```

### 2. Docker Compose Worker Service
```yaml
  live-classes-worker:
    build: .
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
    command: >
      sh -c "while true; do
        python manage.py update_live_statuses;
        python manage.py send_live_reminders;
        sleep 60;
      done"
    depends_on:
      - db
```
