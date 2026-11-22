from django.urls import path
from .views import (
    EducatorApplyView,
    AdminEducatorApplicationListView,
    AdminEducatorApplicationApproveView,
    AdminEducatorApplicationRejectView,
    AdminEducatorListView,
    AdminEducatorActionView,
    AdminEducatorDetailView,
    AdminAuditListView, EducatorActivityListView, AdminApprovalsCombinedView,
    NotificationListView, NotificationUnreadCountView, NotificationMarkReadView, NotificationMarkAllReadView,
    VerifyEmailView, ResendVerificationEmailView, RequestPasswordResetView, ConfirmPasswordResetView,
    RegisterView, LoginView, LogoutView, MeView, FacultyListView, FacultyDetailView,
    GoogleAuthView, GoogleAuthConfigView,
    PublicEnquiryCreateView, AdminEnquiryListView, AdminEnquiryDetailView,
    AdminDashboardStatsView, StudentProgressView, EducatorStudentProgressListView,
    AdminFacultyListView, AdminFacultyDetailView,
    AdminFacultyGrantEducatorView, AdminFacultyRevokeEducatorView,
    EducatorProfileView, StudentPreferencesView, VerifyPortalPasscodeView
)

urlpatterns = [
    # Email Verification & Password Recovery
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verification'),
    path('password-reset/', RequestPasswordResetView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', ConfirmPasswordResetView.as_view(), name='password-reset-confirm'),

    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),
    path('google/config/', GoogleAuthConfigView.as_view(), name='google-auth-config'),
    path('verify-portal-passcode/', VerifyPortalPasscodeView.as_view(), name='verify-portal-passcode'),
    path('me/', MeView.as_view(), name='me'),
    path('profile/preferences/', StudentPreferencesView.as_view(), name='student-preferences'),
    
    # Admin Faculty Management (RUN 6)
    path('admin/faculty/', AdminFacultyListView.as_view(), name='admin-faculty-list'),
    path('admin/faculty/<int:pk>/', AdminFacultyDetailView.as_view(), name='admin-faculty-detail'),
    path('admin/faculty/<int:pk>/grant-educator/', AdminFacultyGrantEducatorView.as_view(), name='admin-faculty-grant-educator'),
    path('admin/faculty/<int:pk>/revoke-educator/', AdminFacultyRevokeEducatorView.as_view(), name='admin-faculty-revoke-educator'),

    # Educator My Profile (RUN 6)
    path('educator/profile/', EducatorProfileView.as_view(), name='educator-profile'),
    path('faculty/', FacultyListView.as_view(), name='faculty-list'),
    path('faculty/<slug:slug>/', FacultyDetailView.as_view(), name='faculty-detail'),
    
    # Enquiries
    path('enquiries/', PublicEnquiryCreateView.as_view(), name='enquiry-create'),
    path('admin/enquiries/', AdminEnquiryListView.as_view(), name='admin-enquiry-list'),
    path('admin/enquiries/<int:pk>/', AdminEnquiryDetailView.as_view(), name='admin-enquiry-detail'),

    # Admin Statistics
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),

    # Student & Educator Progress
    path('progress/', StudentProgressView.as_view(), name='student-progress'),
    path('educator/students/', EducatorStudentProgressListView.as_view(), name='educator-students-progress'),

    # educator onboarding (public)
    path('educator/apply/', EducatorApplyView.as_view(), name='educator-apply'),

    # admin educator applications
    path('admin/educator-applications/', AdminEducatorApplicationListView.as_view(), name='admin-educator-applications'),
    path('admin/educator-applications/<int:pk>/approve/', AdminEducatorApplicationApproveView.as_view(), name='admin-educator-application-approve'),
    path('admin/educator-applications/<int:pk>/reject/', AdminEducatorApplicationRejectView.as_view(), name='admin-educator-application-reject'),

    # admin educator management
    path('admin/educators/', AdminEducatorListView.as_view(), name='admin-educators-list'),
    path('admin/educators/<int:pk>/', AdminEducatorDetailView.as_view(), name='admin-educator-detail'),
    path('admin/educators/<int:pk>/<str:action>/', AdminEducatorActionView.as_view(), name='admin-educator-action'),

    # Audit log
    path('admin/audit/', AdminAuditListView.as_view(), name='admin-audit-list'),
    path('educator/activity/', EducatorActivityListView.as_view(), name='educator-activity-list'),

    # Approvals combined queue
    path('admin/approvals/', AdminApprovalsCombinedView.as_view(), name='admin-approvals-combined'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/mark-all-read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
]
