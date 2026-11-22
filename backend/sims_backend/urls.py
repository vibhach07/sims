import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import root_landing_view, api_root, custom_404_view, custom_500_view

admin_slug = getattr(settings, 'DJANGO_ADMIN_URL', 'admin').strip('/')

urlpatterns = [
    path('', root_landing_view, name='root-landing'),
    path('api/', api_root, name='api-root'),
    path(f'{admin_slug}/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/users/', include('users.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/assessments/', include('assessments.urls')),
    path('api/resources/', include('resources.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/site/', include('site_config.urls')),
    path('api/live/', include('courses.urls_live')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'sims_backend.views.custom_404_view'
handler500 = 'sims_backend.views.custom_500_view'
