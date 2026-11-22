import os
from pathlib import Path
from django.urls import reverse_lazy
from django.templatetags.static import static

# Load .env for local development (no-op if python-dotenv not installed or in Docker)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Security settings — all driven by env vars in production ──────────────────
DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

_secret_key_env = os.environ.get('DJANGO_SECRET_KEY', '')
if _secret_key_env:
    SECRET_KEY = _secret_key_env
elif DEBUG:
    # Dev-only fallback — never used in production
    SECRET_KEY = 'dev-only-insecure-sims-raipur-key-do-not-use-in-prod'
else:
    from django.core.exceptions import ImproperlyConfigured
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY environment variable must be set in production (DEBUG=False).'
    )

_allowed_hosts_raw = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_raw.split(',') if h.strip()]

DJANGO_ADMIN_URL = os.environ.get('DJANGO_ADMIN_URL', 'admin').strip('/')

INSTALLED_APPS = [
    # Unfold admin theme must be declared before django.contrib.admin
    'unfold',
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # SIMS Apps
    'users',
    'courses',
    'assessments',
    'resources',
    'orders',
    'site_config',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'sims_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'sims_backend.wsgi.application'

# ── Database ──────────────────────────────────────────────────
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path[1:],
            'USER': parsed.username,
            'PASSWORD': parsed.password,
            'HOST': parsed.hostname,
            'PORT': parsed.port or 5432,
        }
    }
else:
    db_path = os.environ.get('SQLITE_DB_PATH', BASE_DIR / 'db.sqlite3')
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': Path(db_path),
            'OPTIONS': {
                'timeout': 60,
            },
        }
    }

# Ensure SQLite uses WAL mode and high busy_timeout to prevent 'database is locked' errors
from django.db.backends.signals import connection_created
from django.dispatch import receiver

@receiver(connection_created)
def configure_sqlite_pragmas(sender, connection, **kwargs):
    if connection.vendor == 'sqlite':
        cursor = connection.cursor()
        cursor.execute('PRAGMA journal_mode=WAL;')
        cursor.execute('PRAGMA busy_timeout=60000;')
        cursor.execute('PRAGMA synchronous=NORMAL;')

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage' if not DEBUG else 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}

MEDIA_URL = os.environ.get("MEDIA_URL", "/media/")
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", BASE_DIR / "media"))

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Password Hashers (Scrypt enabled with backward-compatible fallbacks)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.ScryptPasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'users.authentication.CookieOrHeaderTokenAuthentication',
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '300/minute',
        'auth_burst': '10/minute',
        'login': '10/minute',
        'educator_apply': '5/hour',
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ] if not DEBUG else [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

# CORS
CORS_ALLOW_ALL_ORIGINS = False
_cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = (
    [o.strip() for o in _cors_origins_env.split(',') if o.strip()]
    if _cors_origins_env
    else (['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://127.0.0.1:8000'] if DEBUG else [])
)
CORS_ALLOW_CREDENTIALS = True

# ── Razorpay ─────────────────────────────────────────────────
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_sims_placeholder')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'sims_secret_placeholder')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')

# ── Google OAuth ─────────────────────────────────────────────
GOOGLE_OAUTH_CLIENT_ID = os.environ.get('GOOGLE_OAUTH_CLIENT_ID', '')
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '')

# ── Email ────────────────────────────────────────────────────
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'SIMS Raipur <no-reply@simsraipuredu.in>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# ── Live Classes ──────────────────────────────────────────────
LIVE_CLASS_STALE_HOURS = int(os.environ.get("LIVE_CLASS_STALE_HOURS", 3))

# ── Production HTTPS / Security Headers ────────────────────────
if not DEBUG:
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True') == 'True'
    CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'True') == 'True'
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', 31536000))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'True') == 'True'
    SECURE_HSTS_PRELOAD = os.environ.get('SECURE_HSTS_PRELOAD', 'True') == 'True'

# ── DJANGO UNFOLD CONFIGURATION ────────────────────────────────
UNFOLD = {
    "SITE_TITLE": "SIMS Raipur Admin",
    "SITE_HEADER": "SIMS Raipur",
    "SITE_SUBHEADER": "Control center",
    "SITE_ICON": lambda request: static("img/sims-logo.png"),
    "SITE_LOGO": {
        "light": lambda request: static("img/sims-logo.png"),
        "dark": lambda request: static("img/sims-logo.png"),
    },
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "COLORS": {
        "primary": {
            "50": "#FDF8EB",
            "100": "#F9ECC8",
            "200": "#F4DC9E",
            "300": "#ECC76D",
            "400": "#E5B643",
            "500": "#D9A52E",
            "600": "#BA851E",
            "700": "#946317",
            "800": "#784D17",
            "900": "#643F17",
            "950": "#392008",
        },
    },
    "LOGIN": {
        "redirect_after": lambda request: reverse_lazy("admin:index"),
    },
    "DASHBOARD_CALLBACK": "sims_backend.dashboard.dashboard_callback",
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": "",
                "items": [
                    {
                        "title": "User profiles",
                        "icon": "person",
                        "link": reverse_lazy("admin:users_userprofile_changelist"),
                        "permission": lambda request: request.user.has_perm("users.view_userprofile"),
                    },
                ],
            },
            {
                "title": "AUTHENTICATION AND AUTHORIZATION",
                "separator": True,
                "items": [
                    {
                        "title": "Groups",
                        "icon": "group_work",
                        "link": reverse_lazy("admin:auth_group_changelist"),
                        "permission": lambda request: request.user.has_perm("auth.view_group"),
                    },
                    {
                        "title": "Users",
                        "icon": "person",
                        "link": reverse_lazy("admin:auth_user_changelist"),
                        "permission": lambda request: request.user.has_perm("auth.view_user"),
                    },
                ],
            },
            {
                "title": "COURSES & EXAM PROGRAMS",
                "separator": True,
                "items": [
                    {
                        "title": "Exam & Course Categories",
                        "icon": "category",
                        "link": reverse_lazy("admin:courses_coursecategory_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_coursecategory"),
                    },
                    {
                        "title": "Courses",
                        "icon": "school",
                        "link": reverse_lazy("admin:courses_course_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_course"),
                    },
                    {
                        "title": "Course Modules",
                        "icon": "view_module",
                        "link": reverse_lazy("admin:courses_module_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_module"),
                    },
                    {
                        "title": "Course Lectures",
                        "icon": "play_circle",
                        "link": reverse_lazy("admin:courses_lecture_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_lecture"),
                    },
                    {
                        "title": "Batches",
                        "icon": "groups",
                        "link": reverse_lazy("admin:courses_batch_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_batch"),
                    },
                    {
                        "title": "Weekly Timetable Matrix",
                        "icon": "calendar_month",
                        "link": reverse_lazy("admin:courses_weeklytimetable_matrix"),
                        "permission": lambda request: request.user.is_staff,
                    },
                    {
                        "title": "Live / Recorded Lectures",
                        "icon": "sensors",
                        "link": reverse_lazy("admin:courses_liveclass_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_liveclass"),
                    },
                    {
                        "title": "Student Enrollments",
                        "icon": "assignment_ind",
                        "link": reverse_lazy("admin:courses_userenrollment_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_userenrollment"),
                    },
                    {
                        "title": "Daily Challenge Questions",
                        "icon": "help",
                        "link": reverse_lazy("admin:courses_dailychallengequestion_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_dailychallengequestion"),
                    },
                    {
                        "title": "Dashboard Course Mock Tests",
                        "icon": "assignment",
                        "link": reverse_lazy("admin:courses_dashboardcoursemocktest_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_dashboardcoursemocktest"),
                    },
                    {
                        "title": "Doubt Queries",
                        "icon": "contact_support",
                        "link": reverse_lazy("admin:courses_doubtquery_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_doubtquery"),
                    },
                    {
                        "title": "Faculty Availability Slots",
                        "icon": "schedule",
                        "link": reverse_lazy("admin:courses_facultyavailabilityslot_changelist"),
                        "permission": lambda request: request.user.has_perm("courses.view_facultyavailabilityslot"),
                    },
                    {
                        "title": "Faculty Members",
                        "icon": "badge",
                        "link": reverse_lazy("admin:users_facultyprofile_changelist"),
                        "permission": lambda request: request.user.has_perm("users.view_facultyprofile"),
                    },
                ],
            },
            {
                "title": "TEST SERIES & CBT ASSESSMENTS",
                "separator": True,
                "items": [
                    {
                        "title": "Test Series",
                        "icon": "quiz",
                        "link": reverse_lazy("admin:assessments_testseries_changelist"),
                        "permission": lambda request: request.user.has_perm("assessments.view_testseries"),
                    },
                    {
                        "title": "Questions",
                        "icon": "format_list_numbered",
                        "link": reverse_lazy("admin:assessments_testquestion_changelist"),
                        "permission": lambda request: request.user.has_perm("assessments.view_testquestion"),
                    },
                    {
                        "title": "Test Series Items",
                        "icon": "list_alt",
                        "link": reverse_lazy("admin:assessments_testseriesitem_changelist"),
                        "permission": lambda request: request.user.has_perm("assessments.view_testseriesitem"),
                    },
                    {
                        "title": "Question Paper Import Jobs",
                        "icon": "upload_file",
                        "link": reverse_lazy("admin:assessments_questionpaperimportjob_changelist"),
                        "permission": lambda request: request.user.has_perm("assessments.view_questionpaperimportjob"),
                    },
                    {
                        "title": "Attempts",
                        "icon": "analytics",
                        "link": reverse_lazy("admin:assessments_usertestattempt_changelist"),
                        "permission": lambda request: request.user.has_perm("assessments.view_usertestattempt"),
                    },
                ],
            },
            {
                "title": "LIBRARY & STUDY RESOURCES",
                "separator": True,
                "items": [
                    {
                        "title": "Study Materials",
                        "icon": "local_library",
                        "link": reverse_lazy("admin:resources_studyresource_changelist"),
                        "permission": lambda request: request.user.has_perm("resources.view_studyresource"),
                    },
                    {
                        "title": "Entitlements",
                        "icon": "lock_open",
                        "link": reverse_lazy("admin:resources_userresourceentitlement_changelist"),
                        "permission": lambda request: request.user.has_perm("resources.view_userresourceentitlement"),
                    },
                ],
            },
            {
                "title": "SALES & ORDERS",
                "separator": True,
                "items": [
                    {
                        "title": "Orders",
                        "icon": "shopping_cart",
                        "link": reverse_lazy("admin:orders_order_changelist"),
                        "permission": lambda request: request.user.has_perm("orders.view_order"),
                    },
                    {
                        "title": "Payments",
                        "icon": "payments",
                        "link": reverse_lazy("admin:orders_payment_changelist"),
                        "permission": lambda request: request.user.has_perm("orders.view_payment"),
                    },
                    {
                        "title": "Webhook Logs",
                        "icon": "receipt_long",
                        "link": reverse_lazy("admin:orders_paymentwebhooklog_changelist"),
                        "permission": lambda request: request.user.has_perm("orders.view_paymentwebhooklog"),
                    },
                ],
            },
            {
                "title": "Website",
                "separator": True,
                "items": [
                    {
                        "title": "Site Settings",
                        "icon": "settings",
                        "link": reverse_lazy("admin:site_config_sitesettings_changelist"),
                        "permission": lambda request: request.user.has_perm("site_config.view_sitesettings"),
                    },
                    {
                        "title": "Centres",
                        "icon": "location_on",
                        "link": reverse_lazy("admin:site_config_centre_changelist"),
                        "permission": lambda request: request.user.has_perm("site_config.view_centre"),
                    },
                    {
                        "title": "Enquiries",
                        "icon": "contact_support",
                        "link": reverse_lazy("admin:users_enquiry_changelist"),
                        "permission": lambda request: request.user.has_perm("users.view_enquiry"),
                    },
                ],
            },
            {
                "title": "Audit",
                "separator": True,
                "items": [
                    {
                        "title": "Audit Logs",
                        "icon": "security",
                        "link": reverse_lazy("admin:users_auditlog_changelist"),
                        "permission": lambda request: request.user.has_perm("users.view_auditlog"),
                    },
                    {
                        "title": "Notifications",
                        "icon": "notifications",
                        "link": reverse_lazy("admin:users_notification_changelist"),
                        "permission": lambda request: request.user.has_perm("users.view_notification"),
                    },
                ],
            },
        ],
    },
}

# ── File Upload Configuration (No arbitrary size limits; streaming to disk) ──
MAX_UPLOAD_SIZE_MB = int(os.environ.get('MAX_UPLOAD_SIZE_MB', 500))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # Files > 10MB stream safely to disk
DATA_UPLOAD_MAX_MEMORY_SIZE = None  # No limit on request payload
DATA_UPLOAD_MAX_NUMBER_FIELDS = 50000  # Supports papers with hundreds of questions & options
FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.MemoryFileUploadHandler',
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]

