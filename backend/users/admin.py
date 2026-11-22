from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib import messages
from django.utils.html import format_html
from django.utils import timezone
from unfold.admin import ModelAdmin, StackedInline
from unfold.decorators import display, action
from .models import (
    UserProfile, FacultyProfile, Enquiry, EducatorApplication,
    AuditLog, Notification, EmailVerificationToken, PasswordResetToken, log_action
)

class UserProfileInline(StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ('role', 'phone', 'target_exam', 'avatar', 'is_email_verified')


admin.site.unregister(User)

@admin.register(User)
class UserAdmin(ModelAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'show_role', 'is_active', 'is_staff', 'last_login')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'profile__role')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    readonly_fields = ('last_login', 'date_joined')
    fieldsets = (
        ('Authentication Credentials', {
            'fields': ('username', 'email', 'is_active')
        }),
        ('Personal Details', {
            'fields': ('first_name', 'last_name')
        }),
        ('Permissions & Staff Access', {
            'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Audit Metadata', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    actions = ['suspend_selected', 'reactivate_selected', 'make_educator']

    @display(description='Role', label={
        'student': 'info',
        'educator': 'warning',
        'admin': 'danger',
        'superadmin': 'danger',
        'staff': 'primary'
    })
    def show_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.role if profile else 'student'

    def has_delete_permission(self, request, obj=None):
        if obj is not None:
            if hasattr(obj, 'orders') and obj.orders.exists():
                return False
        return super().has_delete_permission(request, obj)

    @action(description='Suspend selected users')
    def suspend_selected(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(request, 'Only superusers can suspend accounts.', messages.ERROR)
            return
        protected_self = queryset.filter(id=request.user.id)
        if protected_self.exists():
            self.message_user(request, 'Safety guard: You cannot suspend your own account.', messages.WARNING)
            queryset = queryset.exclude(id=request.user.id)
        count = queryset.update(is_active=False)
        for u in queryset:
            log_action(actor=request.user, action='suspend_user', object_type='user', object_id=u.id, object_title=u.username, owner=u)
        self.message_user(request, f'{count} user(s) suspended successfully.', messages.SUCCESS)

    @action(description='Reactivate selected users')
    def reactivate_selected(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(request, 'Only superusers can reactivate accounts.', messages.ERROR)
            return
        count = queryset.update(is_active=True)
        for u in queryset:
            log_action(actor=request.user, action='reactivate_user', object_type='user', object_id=u.id, object_title=u.username, owner=u)
        self.message_user(request, f'{count} user(s) reactivated successfully.', messages.SUCCESS)

    @action(description='Make educator (grant teaching role)')
    def make_educator(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(request, 'Only superusers can assign educator roles.', messages.ERROR)
            return
        count = 0
        for u in queryset:
            prof, _ = UserProfile.objects.get_or_create(user=u)
            if prof.role != 'educator':
                prof.role = 'educator'
                prof.save(update_fields=['role'])
                log_action(actor=request.user, action='make_educator', object_type='user', object_id=u.id, object_title=u.username, owner=u)
                count += 1
        self.message_user(request, f'{count} user(s) updated to educator role.', messages.SUCCESS)


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    list_display = ('user', 'role', 'phone', 'target_exam', 'is_email_verified', 'created_at')
    list_filter = ('role', 'is_email_verified')
    search_fields = ('user__username', 'user__email', 'phone', 'target_exam')
    ordering = ('-created_at',)


@admin.register(FacultyProfile)
class FacultyProfileAdmin(ModelAdmin):
    list_display = ('photo_thumbnail', 'name', 'role', 'show_active_badge', 'display_order', 'linked_account', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'role', 'specialization', 'email_public', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('display_order',)
    readonly_fields = ('image_preview', 'created_at')
    ordering = ('display_order', 'id')
    actions = ['activate_faculty', 'deactivate_faculty', 'grant_educator_access']
    fieldsets = (
        ('Personal & Designation', {
            'fields': ('name', 'slug', 'role', 'specialization', 'qualification', 'experience')
        }),
        ('Profile Media', {
            'fields': ('photo', 'image', 'image_preview')
        }),
        ('Contact & Account Binding', {
            'fields': ('user', 'email_public', 'display_order', 'is_active', 'courses_taught')
        }),
        ('Biography', {
            'fields': ('bio',)
        }),
    )

    @display(description='Active', label={True: 'success', False: 'secondary'})
    def show_active_badge(self, obj):
        return obj.is_active

    def photo_thumbnail(self, obj):
        url = obj.get_image_url()
        if url:
            return format_html('<img src="{}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />', url)
        return "-"
    photo_thumbnail.short_description = "Photo"

    def linked_account(self, obj):
        if obj.user:
            return format_html('<a href="/admin/auth/user/{}/change/" class="text-primary-600 font-bold">{}</a>', obj.user.id, obj.user.email or obj.user.username)
        return "None"
    linked_account.short_description = "Linked Account"

    def image_preview(self, obj):
        url = obj.get_image_url()
        if url:
            return format_html('<img src="{}" style="max-width: 180px; max-height: 180px; border-radius: 8px; border: 1px solid #ddd;" />', url)
        return "No image uploaded"
    image_preview.short_description = "Image Preview"

    @action(description='Activate selected faculty')
    def activate_faculty(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} faculty profile(s) activated.', messages.SUCCESS)

    @action(description='Deactivate selected faculty')
    def deactivate_faculty(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} faculty profile(s) deactivated.', messages.SUCCESS)

    @action(description='Grant educator portal access')
    def grant_educator_access(self, request, queryset):
        count = 0
        for fac in queryset:
            if not fac.user:
                email = fac.email_public or f"{fac.slug}@simsraipur.com"
                user, _ = User.objects.get_or_create(username=email, defaults={'email': email, 'is_active': True})
                user.first_name = fac.name.split()[0] if fac.name else ''
                user.save()
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.role = 'educator'
                profile.save()
                fac.user = user
                fac.save(update_fields=['user'])
                count += 1
            else:
                profile, _ = UserProfile.objects.get_or_create(user=fac.user)
                if profile.role != 'educator':
                    profile.role = 'educator'
                    profile.save(update_fields=['role'])
                    count += 1
        self.message_user(request, f'Granted educator access to {count} faculty member(s).', messages.SUCCESS)


@admin.register(EducatorApplication)
class EducatorApplicationAdmin(ModelAdmin):
    list_display = ('name', 'email', 'phone', 'subjects', 'experience', 'show_status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'email', 'phone', 'subjects', 'qualification', 'experience')
    readonly_fields = ('created_at', 'reviewed_at', 'reviewed_by')
    actions = ['approve_applications', 'reject_applications']

    @display(description='Status', label={
        'pending': 'warning',
        'approved': 'success',
        'rejected': 'danger'
    })
    def show_status(self, obj):
        return obj.status

    @action(description='Approve selected educator applications')
    def approve_applications(self, request, queryset):
        for app in queryset.filter(status='pending'):
            app.status = 'approved'
            app.reviewed_by = request.user
            app.reviewed_at = timezone.now()
            app.save()
            log_action(actor=request.user, action='approve_educator_application', object_type='educator_application', object_id=app.id, object_title=app.name)
        self.message_user(request, 'Selected applications approved.', messages.SUCCESS)

    @action(description='Reject selected educator applications')
    def reject_applications(self, request, queryset):
        for app in queryset.filter(status='pending'):
            app.status = 'rejected'
            app.reviewed_by = request.user
            app.reviewed_at = timezone.now()
            app.save()
            log_action(actor=request.user, action='reject_educator_application', object_type='educator_application', object_id=app.id, object_title=app.name)
        self.message_user(request, 'Selected applications rejected.', messages.SUCCESS)


@admin.register(Enquiry)
class EnquiryAdmin(ModelAdmin):
    list_display = ('name', 'email', 'phone', 'course_interested', 'show_status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'email', 'phone', 'course_interested')
    actions = ['mark_contacted', 'mark_enrolled', 'mark_closed']

    @display(description='Status', label={
        'new': 'info',
        'contacted': 'warning',
        'enrolled': 'success',
        'closed': 'secondary'
    })
    def show_status(self, obj):
        return obj.status

    @action(description='Mark as Contacted')
    def mark_contacted(self, request, queryset):
        queryset.update(status='contacted')

    @action(description='Mark as Enrolled')
    def mark_enrolled(self, request, queryset):
        queryset.update(status='enrolled')

    @action(description='Mark as Closed')
    def mark_closed(self, request, queryset):
        queryset.update(status='closed')


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    list_display = ('created_at', 'actor', 'action', 'object_type', 'object_title', 'owner')
    list_filter = ('action', 'object_type', 'created_at')
    search_fields = ('action', 'object_type', 'object_title', 'actor__username', 'actor__email')
    readonly_fields = ('actor', 'action', 'object_type', 'object_id', 'object_title', 'owner', 'changes', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ('created_at', 'user', 'title', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user__username', 'user__email', 'title', 'body')
    readonly_fields = ('user', 'title', 'body', 'link', 'is_read', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'is_used')
    list_filter = ('is_used', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('user', 'token', 'created_at', 'expires_at', 'is_used')

    def has_add_permission(self, request):
        return False


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'is_used')
    list_filter = ('is_used', 'created_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('user', 'token', 'created_at', 'expires_at', 'is_used')

    def has_add_permission(self, request):
        return False
