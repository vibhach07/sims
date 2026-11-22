from django.db import models
from django.contrib.auth.models import User

class Role(models.TextChoices):
    STUDENT = 'student', 'Student'
    EDUCATOR = 'educator', 'Educator'
    STAFF = 'staff', 'Staff'
    ADMIN = 'admin', 'Admin'
    SUPERADMIN = 'superadmin', 'Superadmin'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    phone = models.CharField(max_length=20, blank=True, default='')
    target_exam = models.CharField(max_length=100, blank=True, default='')
    education_level = models.CharField(max_length=100, blank=True, default='')
    degree = models.CharField(max_length=100, blank=True, default='')
    engineering_branch = models.CharField(max_length=100, blank=True, default='')
    target_paper = models.CharField(max_length=100, blank=True, default='')
    preferred_subjects = models.JSONField(default=list, blank=True)
    avatar = models.TextField(blank=True, default='')
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User profile'
        verbose_name_plural = 'User profiles'

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class FacultyProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='faculty_profile', null=True, blank=True)
    slug = models.SlugField(max_length=150, unique=True)
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=200, help_text="Designation, e.g. Senior Academic Director")
    specialization = models.CharField(max_length=255)
    qualification = models.CharField(max_length=255)
    experience = models.CharField(max_length=100)
    bio = models.TextField()
    image = models.URLField(max_length=500, blank=True, default="")
    photo = models.ImageField(upload_to='faculty/', blank=True, null=True)
    display_order = models.IntegerField(default=0)
    email_public = models.EmailField(max_length=254, blank=True, null=True)
    courses_taught = models.JSONField(default=list, help_text="List of course slugs, e.g. ['gate', 'net']")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'id']
        verbose_name = 'Faculty Member'
        verbose_name_plural = 'Faculty Members'

    def __str__(self):
        return self.name

    def get_image_url(self, request=None):
        if self.photo:
            try:
                if request:
                    return request.build_absolute_uri(self.photo.url)
                return self.photo.url
            except Exception:
                pass
        if self.image:
            return self.image
        from urllib.parse import quote
        name_str = quote(self.name or "Faculty")
        return f"https://ui-avatars.com/api/?name={name_str}&background=061426&color=D9A52E&size=400"

    def delete(self, *args, **kwargs):
        if self.photo:
            try:
                storage = self.photo.storage
                if storage.exists(self.photo.name):
                    storage.delete(self.photo.name)
            except Exception:
                pass
        super().delete(*args, **kwargs)

    def save(self, *args, **kwargs):
        if self.pk:
            try:
                old = FacultyProfile.objects.filter(pk=self.pk).first()
                if old and old.photo and old.photo != self.photo:
                    storage = old.photo.storage
                    if storage.exists(old.photo.name):
                        storage.delete(old.photo.name)
            except Exception:
                pass
        super().save(*args, **kwargs)

class Enquiry(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('enrolled', 'Enrolled'),
    ]

    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=25)
    course_interested = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Enquiries'

    def __str__(self):
        return f"{self.name} - {self.course_interested} ({self.status})"


import secrets
from django.utils import timezone
from datetime import timedelta

class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verification_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    @classmethod
    def create_for_user(cls, user, expires_hours=24):
        # Invalidate old unused tokens
        cls.objects.filter(user=user, is_used=False).delete()
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=expires_hours)
        return cls.objects.create(user=user, token=token, expires_at=expires_at)

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at

    def __str__(self):
        return f"Verify Token for {self.user.email} (used: {self.is_used})"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    @classmethod
    def create_for_user(cls, user, expires_hours=1):
        # Invalidate old unused tokens
        cls.objects.filter(user=user, is_used=False).delete()
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=expires_hours)
        return cls.objects.create(user=user, token=token, expires_at=expires_at)

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at

    def __str__(self):
        return f"Reset Token for {self.user.email} (used: {self.is_used})"


class EducatorApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=25)
    subjects = models.CharField(max_length=255)
    qualification = models.CharField(max_length=255)
    experience = models.CharField(max_length=100)
    bio = models.TextField()
    demo_link = models.URLField(max_length=500)
    resume_link = models.URLField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_note = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_educator_applications')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='educator_application')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.email}) - {self.status}"


class AuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_actions')
    actor_role = models.CharField(max_length=50, blank=True, default='')
    action = models.CharField(max_length=100) # create, update, delete, submit_review, approve, reject, transfer, suspend, reactivate, demote, import
    object_type = models.CharField(max_length=50) # course, module, lecture, test_series, test_question, study_resource, faculty_profile, educator_application, user
    object_id = models.CharField(max_length=100, blank=True, default='')
    object_title = models.CharField(max_length=255, blank=True, default='')
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_owned_objects')
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.actor} - {self.action} on {self.object_type}:{self.object_id}"


def log_action(actor, action, object_type, object_id='', object_title='', owner=None, changes=None):
    actor_role = ''
    if actor and hasattr(actor, 'profile'):
        actor_role = actor.profile.role
    elif actor and (actor.is_superuser or actor.is_staff):
        actor_role = 'admin'

    # Filter sensitive keys from changes
    safe_changes = {}
    if isinstance(changes, dict):
        for k, v in changes.items():
            if any(secret in k.lower() for secret in ['password', 'secret', 'token', 'key']):
                continue
            # Truncate strings to 500 chars if necessary
            if isinstance(v, list) and len(v) == 2:
                old_val = str(v[0])[:500] if v[0] is not None else None
                new_val = str(v[1])[:500] if v[1] is not None else None
                safe_changes[k] = [old_val, new_val]
            else:
                safe_changes[k] = v

    return AuditLog.objects.create(
        actor=actor,
        actor_role=actor_role,
        action=action,
        object_type=object_type,
        object_id=str(object_id),
        object_title=str(object_title)[:255],
        owner=owner,
        changes=safe_changes
    )


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    link = models.CharField(max_length=500, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"
