from django.urls import path
from .views import (
    PublicSiteConfigView,
    AdminSiteSettingsView,
    AdminCentreListCreateView,
    AdminCentreDetailView
)

urlpatterns = [
    # Public cached configuration
    path('', PublicSiteConfigView.as_view(), name='site-config-public'),

    # Admin settings
    path('admin/settings/', AdminSiteSettingsView.as_view(), name='site-settings-admin'),

    # Admin centres
    path('admin/centres/', AdminCentreListCreateView.as_view(), name='site-centres-admin-list'),
    path('admin/centres/<int:pk>/', AdminCentreDetailView.as_view(), name='site-centres-admin-detail'),
]
