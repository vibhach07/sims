import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.contrib import admin
from django.urls import reverse
from django.utils import timezone
from users.models import UserProfile, AuditLog
from courses.models import Course, Subject, CourseCategory, CourseTrack
from resources.models import StudyResource
from assessments.models import TestSeries, UserTestAttempt
from orders.models import Order, PaymentWebhookLog

User = get_user_model()


class AdminSuiteTests(TestCase):
    def setUp(self):
        # Superuser
        self.superuser = User.objects.create_superuser(
            'superadmin@sims.com', 'superadmin@sims.com', 'SuperPass123!'
        )
        UserProfile.objects.create(user=self.superuser, role='superadmin')

        # Staff user
        self.staff_user = User.objects.create_user(
            'staff@sims.com', 'staff@sims.com', 'StaffPass123!', is_staff=True
        )
        UserProfile.objects.create(user=self.staff_user, role='staff')

        # Non-staff educator
        self.educator = User.objects.create_user(
            'educator@sims.com', 'educator@sims.com', 'EdPass123!', is_staff=False
        )
        UserProfile.objects.create(user=self.educator, role='educator')

        # Non-staff student
        self.student = User.objects.create_user(
            'student@sims.com', 'student@sims.com', 'StudPass123!', is_staff=False
        )
        UserProfile.objects.create(user=self.student, role='student')

    def test_admin_login_page_branding(self):
        response = self.client.get('/admin/login/')
        self.assertEqual(response.status_code, 200)
        content = response.content.decode('utf-8')
        self.assertTrue('SIMS Raipur' in content or 'SIMS' in content)

    def test_staff_changelist_smoke_test_all_models(self):
        self.client.force_login(self.superuser)
        registered_models = list(admin.site._registry.keys())
        self.assertGreater(len(registered_models), 10, 'Expected at least 10 registered models in admin')

        for model in registered_models:
            app_label = model._meta.app_label
            model_name = model._meta.model_name
            url = reverse(f'admin:{app_label}_{model_name}_changelist')
            res = self.client.get(url)
            self.assertEqual(
                res.status_code,
                200,
                f'Failed to load admin changelist for {app_label}.{model_name} at {url}'
            )

    def test_non_staff_educator_and_student_refused(self):
        # Educator refused
        self.client.force_login(self.educator)
        res_ed = self.client.get('/admin/')
        # Django admin redirects non-staff to login with ?next=/admin/
        self.assertEqual(res_ed.status_code, 302)
        self.assertIn('/admin/login/', res_ed.url)

        # Student refused
        self.client.force_login(self.student)
        res_st = self.client.get('/admin/')
        self.assertEqual(res_st.status_code, 302)
        self.assertIn('/admin/login/', res_st.url)

    def test_landing_page_200(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        content = res.content.decode('utf-8')
        self.assertIn('SIMS Raipur API', content)
        self.assertIn('Operational', content)

    def test_custom_404_and_500(self):
        # Browser request -> HTML 404
        res_html = self.client.get('/nonexistent-slug-xyz/', HTTP_ACCEPT='text/html')
        self.assertEqual(res_html.status_code, 404)
        self.assertIn('text/html', res_html['Content-Type'])
        self.assertIn('Page Not Found', res_html.content.decode('utf-8'))

        # API request -> JSON 404
        res_json = self.client.get('/api/nonexistent-endpoint/', HTTP_ACCEPT='application/json')
        self.assertEqual(res_json.status_code, 404)
        self.assertIn('application/json', res_json['Content-Type'])
        data = res_json.json()
        self.assertEqual(data.get('status'), 404)
        self.assertEqual(data.get('error'), 'Not Found')

    def test_dashboard_renders_with_bounded_queries(self):
        from django.test.utils import CaptureQueriesContext
        from django.db import connection
        self.client.force_login(self.superuser)
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.get('/admin/')
            self.assertEqual(res.status_code, 200)
            content = res.content.decode('utf-8')
            self.assertIn('Executive Control Center', content)
        self.assertLessEqual(len(ctx), 20)

    def test_readonly_admins_reject_add_and_change(self):
        from users.admin import AuditLogAdmin
        from assessments.admin import UserTestAttemptAdmin
        from orders.admin import OrderAdmin, PaymentWebhookLogAdmin

        audit_admin = AuditLogAdmin(AuditLog, admin.site)
        attempt_admin = UserTestAttemptAdmin(UserTestAttempt, admin.site)
        order_admin = OrderAdmin(Order, admin.site)
        webhook_admin = PaymentWebhookLogAdmin(PaymentWebhookLog, admin.site)

        request = self.client.get('/admin/').wsgi_request
        request.user = self.superuser

        # AuditLog immutable
        self.assertFalse(audit_admin.has_add_permission(request))
        self.assertFalse(audit_admin.has_change_permission(request))
        self.assertFalse(audit_admin.has_delete_permission(request))

        # UserTestAttempt read-only, delete for superuser only
        self.assertFalse(attempt_admin.has_add_permission(request))
        self.assertFalse(attempt_admin.has_change_permission(request))
        self.assertTrue(attempt_admin.has_delete_permission(request))

        request.user = self.staff_user
        self.assertFalse(attempt_admin.has_delete_permission(request))
        request.user = self.superuser

        # Order cannot be manually added or deleted
        self.assertFalse(order_admin.has_add_permission(request))
        self.assertFalse(order_admin.has_delete_permission(request))

        # PaymentWebhookLog immutable
        self.assertFalse(webhook_admin.has_add_permission(request))
        self.assertFalse(webhook_admin.has_delete_permission(request))

    def test_admin_actions_write_audit_log(self):
        from courses.admin import CourseAdmin
        from resources.admin import StudyResourceAdmin
        from users.admin import UserAdmin

        course_admin = CourseAdmin(Course, admin.site)
        res_admin = StudyResourceAdmin(StudyResource, admin.site)
        user_admin = UserAdmin(User, admin.site)

        request = self.client.get('/admin/').wsgi_request
        request.user = self.superuser

        # 1. Course approve action
        c = Course.objects.create(
            title='Pending Action Course',
            slug='pending-action-course',
            category='technical',
            target_exam='NEET',
            created_by=self.educator,
            review_status='pending',
            is_published=False,
        )
        course_admin.approve_selected(request, Course.objects.filter(id=c.id))
        c.refresh_from_db()
        self.assertEqual(c.review_status, 'approved')
        self.assertTrue(c.is_published)
        self.assertTrue(AuditLog.objects.filter(action='approve_course', object_id=str(c.id)).exists())

        # 2. Resource approve action
        r = StudyResource.objects.create(
            title='Pending Action Resource',
            slug='pending-action-res',
            exam='NEET',
            category='notes',
            resource_type='notes',
            file_format='pdf',
            file_url='https://example.com/file.pdf',
            created_by=self.educator,
            review_status='pending',
            is_published=False,
        )
        res_admin.approve_resources(request, StudyResource.objects.filter(id=r.id))
        r.refresh_from_db()
        self.assertEqual(r.review_status, 'approved')
        self.assertTrue(r.is_published)
        self.assertTrue(AuditLog.objects.filter(action='approve_resource', object_id=str(r.id)).exists())

        # 3. User suspend action
        user_admin.suspend_selected(request, User.objects.filter(id=self.student.id))
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_active)
        self.assertTrue(AuditLog.objects.filter(action='suspend_user', object_id=str(self.student.id)).exists())

    def test_crawl_all_registered_admin_models(self):
        from django.test.client import RequestFactory
        from django.contrib.auth.models import Group
        from rest_framework.authtoken.models import Token
        from datetime import timedelta
        from users.models import (
            FacultyProfile, EducatorApplication, Enquiry,
            Notification, EmailVerificationToken, PasswordResetToken
        )
        from courses.models import (
            Module, Lecture, LiveClass, UserEnrollment, UserLectureProgress,
            Batch, WeeklyTimetable, DailyChallengeQuestion,
            DashboardCourseMockTest, DoubtQuery, FacultyAvailabilitySlot
        )
        from assessments.models import (
            TestQuestion, UserTestAccess, TestSeriesItem,
            QuestionPaperImportJob, QuestionImage
        )
        from orders.models import Payment
        from django.core.files.uploadedfile import SimpleUploadedFile
        import uuid
        from resources.models import UserResourceEntitlement
        from site_config.models import SiteSettings, Centre

        self.client.force_login(self.superuser)
        rf = RequestFactory()

        # Seed fixtures for all models
        Group.objects.get_or_create(name="TestGroupAdmin")
        Token.objects.get_or_create(user=self.student)
        FacultyProfile.objects.get_or_create(
            slug="faculty-admin-crawl",
            defaults=dict(name="Dr. Crawl", role="Director", specialization="Physics", qualification="PhD", experience="10y", bio="Bio")
        )
        EducatorApplication.objects.get_or_create(
            email="appcrawl@sims.com",
            defaults=dict(name="Applicant Crawl", phone="9876543210", subjects="Physics", qualification="MSc", experience="3y", bio="Bio", demo_link="https://example.com/demo")
        )
        Enquiry.objects.get_or_create(
            email="enquiry@sims.com",
            defaults=dict(name="Enquirer", phone="9876543210", course_interested="GATE")
        )
        AuditLog.objects.get_or_create(
            action="crawl_init",
            defaults=dict(object_type="system", object_id="1", object_title="Crawl Init")
        )
        Notification.objects.get_or_create(
            title="Admin Notification",
            defaults=dict(user=self.student, body="Test admin notice")
        )
        EmailVerificationToken.create_for_user(self.student)
        PasswordResetToken.create_for_user(self.student)

        cat, _ = CourseCategory.objects.get_or_create(
            slug="crawl-cat",
            defaults=dict(name="Crawl Category", description="Crawl Desc", icon_name="GraduationCap")
        )
        course, _ = Course.objects.get_or_create(
            slug="crawl-course",
            defaults=dict(title="Crawl Course", category="technical", target_exam="GATE", category_ref=cat)
        )
        CourseTrack.objects.get_or_create(
            course=course,
            slug="crawl-track",
            defaults=dict(name="Crawl Track", code="CT")
        )
        module, _ = Module.objects.get_or_create(
            course=course,
            title="Crawl Module",
            defaults=dict(order=1)
        )
        lecture, _ = Lecture.objects.get_or_create(
            module=module,
            title="Crawl Lecture",
            defaults=dict(duration="15:00", video_url="https://example.com/crawl.mp4", order=1)
        )
        LiveClass.objects.get_or_create(
            title="Crawl Live",
            defaults=dict(
                course=course,
                educator=self.educator,
                stream_url="https://example.com/stream",
                scheduled_start=timezone.now(),
                scheduled_end=timezone.now() + timedelta(hours=1),
            )
        )
        Subject.objects.get_or_create(slug="crawl-sub", defaults=dict(name="Crawl Subject", course=course))
        UserEnrollment.objects.get_or_create(user=self.student, course=course)
        UserLectureProgress.objects.get_or_create(user=self.student, lecture=lecture)
        Batch.objects.get_or_create(code="BATCH-CRAWL", defaults=dict(name="Crawl Batch", branch="Chemical Engineering (CH)", course=course))
        WeeklyTimetable.objects.get_or_create(
            branch="Chemical Engineering (CH)", start_date="2026-11-02",
            defaults=dict(end_date="2026-11-07", week_number=1, is_published=True, matrix_data={})
        )
        DailyChallengeQuestion.objects.get_or_create(
            title="Crawl Question",
            defaults=dict(
                branch="Chemical Engineering (CH)", subject="Heat Transfer",
                question_text="Sample Q", option_a="A", option_b="B", option_c="C", option_d="D",
                correct_option="A", for_date=timezone.localdate()
            )
        )

        test_series, _ = TestSeries.objects.get_or_create(
            slug="crawl-test-series",
            defaults=dict(title="Crawl Test Series", exam="GATE")
        )
        TestQuestion.objects.get_or_create(
            test_series=test_series,
            question_number=1,
            defaults=dict(subject="Math", question_en="What is 2+2?", option_a_en="4", option_b_en="3", option_c_en="2", option_d_en="1", correct_option="A")
        )
        UserTestAttempt.objects.get_or_create(user=self.student, test_series=test_series)
        UserTestAccess.objects.get_or_create(user=self.student, test_series=test_series)

        resource, _ = StudyResource.objects.get_or_create(
            slug="crawl-resource",
            defaults=dict(title="Crawl Resource", exam="GATE", category="notes", resource_type="notes", file_format="pdf", file_url="https://example.com/f.pdf")
        )
        UserResourceEntitlement.objects.get_or_create(user=self.student, resource=resource)

        order, _ = Order.objects.get_or_create(
            order_id="ORD-CRAWL-101",
            defaults=dict(user=self.student, item_type="course", item_id=str(course.id), item_title="Crawl Course", amount=100.00)
        )
        PaymentWebhookLog.objects.get_or_create(
            event_id="EVT-CRAWL-101",
            defaults=dict(event_type="payment.captured", order=order)
        )

        SiteSettings.objects.get_or_create(defaults=dict(site_name="SIMS Raipur Admin Test"))
        Centre.objects.get_or_create(name="Crawl Centre", defaults=dict(city="Raipur", phone="9876543210"))

        DashboardCourseMockTest.objects.get_or_create(
            course=course, title="Crawl Mock", defaults=dict(duration_minutes=60, total_marks=100.0)
        )
        DoubtQuery.objects.get_or_create(
            student=self.student, query_text="Crawl Doubt", defaults=dict(course=course, status="pending")
        )
        FacultyAvailabilitySlot.objects.get_or_create(
            faculty=FacultyProfile.objects.first(), day_of_week="Monday",
            start_time="10:00:00", end_time="12:00:00", defaults=dict(is_available=True)
        )
        TestSeriesItem.objects.get_or_create(
            test_series=test_series, title="Item 1", defaults=dict(item_type="test", order=1)
        )
        QuestionPaperImportJob.objects.get_or_create(
            job_id="JOB-CRAWL-101",
            defaults=dict(file_name="paper.pdf", file_size=1024, total_questions=10, status="completed")
        )
        tiny_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        QuestionImage.objects.get_or_create(
            public_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            defaults=dict(
                test_series=test_series,
                image=SimpleUploadedFile("tiny.png", tiny_png, content_type="image/png"),
                width=1, height=1, content_hash="hash-crawl-1"
            )
        )
        Payment.objects.get_or_create(
            order=order, transaction_id="TXN-CRAWL-101",
            defaults=dict(gateway="razorpay", amount=100.00, currency="INR", status="success")
        )

        registered_models = list(admin.site._registry.items())
        self.assertGreater(len(registered_models), 15)

        for model, model_admin in registered_models:
            app_label = model._meta.app_label
            model_name = model._meta.model_name
            prefix = f"{app_label}.{model_name}"

            cl_url = reverse(f"admin:{app_label}_{model_name}_changelist")

            # 1. Changelist 200
            resp = self.client.get(cl_url)
            self.assertEqual(resp.status_code, 200, f"Changelist failed for {prefix} at {cl_url}")

            # 2. Search ?q=test 200
            search_url = f"{cl_url}?q=test"
            resp = self.client.get(search_url)
            self.assertEqual(resp.status_code, 200, f"Search ?q=test failed for {prefix} at {search_url}")

            # 3. Add page (skip only if has_add_permission is False)
            req = rf.get(cl_url)
            req.user = self.superuser
            if model_admin.has_add_permission(req):
                add_url = reverse(f"admin:{app_label}_{model_name}_add")
                resp = self.client.get(add_url)
                self.assertEqual(resp.status_code, 200, f"Add page failed for {prefix} at {add_url}")

            # 4. Change page for existing object 200
            obj = model.objects.first()
            self.assertIsNotNone(obj, f"Fixture missing for {prefix}")
            change_url = reverse(f"admin:{app_label}_{model_name}_change", args=[obj.pk])
            resp = self.client.get(change_url)
            self.assertEqual(resp.status_code, 200, f"Change page failed for {prefix} at {change_url}")

            # 5. Each list_filter value 200
            cl_inst = model_admin.get_changelist_instance(req)
            for spec in getattr(cl_inst, "filter_specs", []):
                for choice in spec.choices(cl_inst):
                    qs = choice.get("query_string")
                    if qs:
                        filter_url = f"{cl_url}{qs}"
                        resp = self.client.get(filter_url)
                        self.assertEqual(resp.status_code, 200, f"Filter {filter_url} failed for {prefix}")
