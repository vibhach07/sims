from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings

def root_landing_view(request):
    admin_slug = getattr(settings, 'DJANGO_ADMIN_URL', 'admin').strip('/')
    context = {
        "title": "SIMS Raipur API",
        "status": "Operational",
        "status_code": "OK",
        "version": "1.8.0",
        "build_id": "2026.10-production",
        "admin_url": f"/{admin_slug}/",
        "admin_login_url": f"/{admin_slug}/login/",
        "frontend_url": getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
    }
    return render(request, "landing.html", context, status=200)


def api_root(request):
    return JsonResponse({
        "status": "ok",
        "service": "SIMS Raipur API",
        "version": "1.8.0"
    })


def custom_404_view(request, exception=None):
    if request.path.startswith("/api/") or "application/json" in request.headers.get("Accept", ""):
        return JsonResponse({"detail": "Resource not found.", "error": "Not Found", "status": 404}, status=404)
    admin_slug = getattr(settings, 'DJANGO_ADMIN_URL', 'admin').strip('/')
    return render(request, "404.html", {
        "title": "Page Not Found - SIMS Raipur",
        "admin_url": f"/{admin_slug}/",
        "frontend_url": getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
    }, status=404)


def custom_500_view(request):
    if request.path.startswith("/api/") or "application/json" in request.headers.get("Accept", ""):
        return JsonResponse({"detail": "Internal server error.", "error": "Server Error", "status": 500}, status=500)
    admin_slug = getattr(settings, 'DJANGO_ADMIN_URL', 'admin').strip('/')
    return render(request, "500.html", {
        "title": "Server Error - SIMS Raipur",
        "admin_url": f"/{admin_slug}/",
        "frontend_url": getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
    }, status=500)
