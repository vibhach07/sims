from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import display
from .models import StudyResource, UserResourceEntitlement
from users.models import log_action


@admin.register(StudyResource)
class StudyResourceAdmin(ModelAdmin):
    list_display = (
        'title',
        'exam',
        'category',
        'resource_type',
        'file_format',
        'show_review_status',
        'price',
        'is_paid',
        'show_published',
        'created_by',
        'created_at',
    )
    list_filter = ('exam', 'category', 'resource_type', 'file_format', 'review_status', 'is_paid', 'is_published')
    search_fields = ('title', 'slug', 'exam', 'description')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('review_note', 'reviewed_by', 'reviewed_at', 'created_at')
    ordering = ('-created_at',)
    list_per_page = 25
    actions = ['approve_resources', 'unpublish_resources']

    fieldsets = (
        ('Resource Information', {
            'fields': ('title', 'slug', 'course', 'subject', 'exam', 'category', 'resource_type', 'description', 'created_by')
        }),
        ('File & Content Details', {
            'fields': ('file', 'file_format', 'file_url', 'pages', 'downloads_count')
        }),
        ('Pricing & Visibility', {
            'fields': ('is_paid', 'price', 'original_price', 'is_published')
        }),
        ('Review & Moderation', {
            'fields': ('review_status', 'review_note', 'reviewed_by', 'reviewed_at')
        }),
    )

    @display(description='Review Status', label={
        'approved': 'success',
        'pending': 'warning',
        'changes_requested': 'danger',
        'draft': 'info',
    })
    def show_review_status(self, obj):
        return obj.review_status

    @display(description='Published', boolean=True)
    def show_published(self, obj):
        return obj.is_published

    @admin.action(description='Approve selected resources')
    def approve_resources(self, request, queryset):
        count = 0
        for res in queryset:
            res.review_status = 'approved'
            res.is_published = True
            res.reviewed_by = request.user
            res.reviewed_at = timezone.now()
            res.save()
            count += 1
            log_action(actor=request.user, action='approve_resource', object_type='resource', object_id=res.id, object_title=res.title, owner=res.created_by)
        self.message_user(request, f'Successfully approved {count} resource(s).')

    @admin.action(description='Unpublish selected resources')
    def unpublish_resources(self, request, queryset):
        count = 0
        for res in queryset:
            res.is_published = False
            res.save()
            count += 1
            log_action(actor=request.user, action='unpublish_resource', object_type='resource', object_id=res.id, object_title=res.title, owner=res.created_by)
        self.message_user(request, f'Successfully unpublished {count} resource(s).')


@admin.register(UserResourceEntitlement)
class UserResourceEntitlementAdmin(ModelAdmin):
    list_display = ('user', 'resource', 'granted_at')
    list_filter = ('resource', 'granted_at')
    search_fields = ('user__username', 'user__email', 'resource__title')
    raw_id_fields = ('user', 'resource')
    readonly_fields = ('granted_at',)
    ordering = ('-granted_at',)
    list_per_page = 25
