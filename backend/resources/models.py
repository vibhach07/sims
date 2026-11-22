from django.db import models
from django.contrib.auth.models import User

class StudyResource(models.Model):
    slug = models.SlugField(max_length=120, unique=True)
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='study_resources')
    subject = models.ForeignKey('courses.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='study_resources')
    title = models.CharField(max_length=255)
    exam = models.CharField(max_length=100)
    category = models.CharField(max_length=100, default='after-msc-btech')
    resource_type = models.CharField(max_length=50, default='notes') # formula-sheet, notes, pyq, syllabus
    file_format = models.CharField(max_length=20, default='PDF')
    pages = models.PositiveIntegerField(default=20)
    downloads_count = models.PositiveIntegerField(default=1200)
    description = models.TextField(blank=True)
    file_url = models.URLField(default='https://simsraipuredu.in/resources/sample-handbook.pdf')
    file = models.FileField(upload_to='study_materials/', blank=True, null=True, help_text="Upload document: PDF, Word (.docx/.doc), Excel (.xlsx), CSV, etc.")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_resources')
    review_status = models.CharField(
        max_length=20,
        choices=[('draft', 'Draft'), ('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='draft'
    )
    review_note = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_resources')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Study Material'
        verbose_name_plural = 'Study Materials'
        ordering = ['title']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        import os
        if self.file:
            ext = os.path.splitext(self.file.name)[1].lstrip('.').upper()
            if ext:
                self.file_format = ext
            try:
                self.file_url = self.file.url
            except Exception:
                pass
        super().save(*args, **kwargs)

class UserResourceEntitlement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resource_entitlements')
    resource = models.ForeignKey(StudyResource, on_delete=models.CASCADE, related_name='entitled_users')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'resource')

    def __str__(self):
        return f"{self.user.username} -> {self.resource.title}"
