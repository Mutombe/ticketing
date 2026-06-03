"""
Django settings for the Tikiti ticketing platform.

Tikiti — tickets for every Zimbabwean event.
Secrets are loaded from backend/.env (gitignored). See .env.example.
"""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(key, default=None):
    return os.environ.get(key, default)


def env_bool(key, default=False):
    return str(env(key, default)).lower() in ("1", "true", "yes", "on")


# --- Security ----------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-dev-key")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = ["*"]

# --- Applications ------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "storages",
    # local
    "events",
    "accounts",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Database (Neon Postgres via DATABASE_URL, sqlite fallback) ---------------
DATABASE_URL = env("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL, conn_max_age=600, ssl_require=True
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# --- Password validation -----------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

# --- Internationalization ----------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Harare"
USE_I18N = True
USE_TZ = True

# --- Static & media ----------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

USE_SPACES = env_bool("USE_SPACES", False)
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
if USE_SPACES:
    SPACES_OPTIONS = {
        "bucket_name": env("DO_SPACES_BUCKET", "tikiti"),
        "endpoint_url": env("DO_SPACES_ENDPOINT"),
        "region_name": env("DO_SPACES_REGION", "sfo3"),
        "access_key": env("DO_SPACES_KEY"),
        "secret_key": env("DO_SPACES_SECRET"),
        "default_acl": "public-read",
        "querystring_auth": False,
        "file_overwrite": False,
        "location": "media",
    }
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": SPACES_OPTIONS,
    }
    MEDIA_URL = f"{env('DO_SPACES_ENDPOINT')}/{env('DO_SPACES_BUCKET')}/media/"
else:
    STORAGES["default"] = {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    }
    MEDIA_URL = "media/"
    MEDIA_ROOT = BASE_DIR / "media"

# --- Django REST Framework ---------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}

# --- Auth --------------------------------------------------------------------
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET", "")

# --- Paynow (Zimbabwe payments) ---------------------------------------------
# Get these from your Paynow merchant portal: https://www.paynow.co.zw
PAYNOW_INTEGRATION_ID = env("PAYNOW_INTEGRATION_ID", "")
PAYNOW_INTEGRATION_KEY = env("PAYNOW_INTEGRATION_KEY", "")
PAYNOW_RESULT_URL = env("PAYNOW_RESULT_URL", "")   # server callback (public URL)
PAYNOW_RETURN_URL = env("PAYNOW_RETURN_URL", "")   # browser return URL
PAYNOW_ENABLED = bool(PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY)

# --- CORS / CSRF -------------------------------------------------------------
_origins = [o.strip() for o in env("FRONTEND_ORIGINS", "").split(",") if o.strip()]
CSRF_TRUSTED_ORIGINS = list(_origins)
# Render exposes the service's public URL — trust it so the admin works there.
_render_url = env("RENDER_EXTERNAL_URL", "")
if _render_url:
    CSRF_TRUSTED_ORIGINS.append(_render_url)
if _origins:
    CORS_ALLOWED_ORIGINS = _origins
else:
    CORS_ALLOW_ALL_ORIGINS = True
