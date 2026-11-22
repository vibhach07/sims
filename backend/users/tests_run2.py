from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from courses.models import Course, Module, Lecture
from assessments.models import TestSeries, TestQuestion
from resources.models import StudyResource
from users.models import UserProfile, AuditLog, Notification


class Run2ReviewAndAuditTests(APITestCase):
    def setUp(self):
        # Admin
        self.admin = User.objects.create_superuser(username='admin_r2', email='admin_r2@sims.test', password='AdminPass123!')
        self.admin_profile, _ = UserProfile.objects.get_or_create(user=self.admin)
        self.admin_profile.role = 'admin'
        self.admin_profile.save()

        # Educator 1
        self.educator1 = User.objects.create_user(username='educator1_r2', email='ed1_r2@sims.test', password='EdPass123!')
        self.ed1_profile, _ = UserProfile.objects.get_or_create(user=self.educator1)
        self.ed1_profile.role = 'educator'
        self.ed1_profile.save()

        # Educator 2
        self.educator2 = User.objects.create_user(username='educator2_r2', email='ed2_r2@sims.test', password='EdPass123!')
        self.ed2_profile, _ = UserProfile.objects.get_or_create(user=self.educator2)
        self.ed2_profile.role = 'educator'
        self.ed2_profile.save()

        # Student
        self.student = User.objects.create_user(username='student1_r2', email='student1_r2@sims.test', password='StudentPass123!')
        self.student_profile, _ = UserProfile.objects.get_or_create(user=self.student)
        self.student_profile.role = 'student'
        self.student_profile.save()

    def test_course_submit_review_state_machine(self):
        course = Course.objects.create(
            slug='ed1-course-r2',
            title='Ed1 Course',
            category='after-msc-btech',
            target_exam='CSIR NET',
            created_by=self.educator1,
            review_status='draft',
            is_published=False
        )
        url = reverse('course-submit-review', kwargs={'id': course.id})

        # Cannot submit without lectures
        self.client.force_authenticate(user=self.educator1)
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('at least 1 lecture', res.data['error'])

        # Add module + lecture
        module = Module.objects.create(course=course, title='Module 1', order=1)
        Lecture.objects.create(module=module, title='Lesson 1', video_url='https://example.com/video', order=1)

        # Other educator cannot submit
        self.client.force_authenticate(user=self.educator2)
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Educator 1 submits successfully
        self.client.force_authenticate(user=self.educator1)
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        course.refresh_from_db()
        self.assertEqual(course.review_status, 'pending')

        # Audit log written
        audit = AuditLog.objects.filter(object_type='course', object_id=str(course.id), action='submit_review').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor, self.educator1)
        self.assertEqual(audit.owner, self.educator1)

        # Educator cannot review decision
        review_url = reverse('course-review-decision', kwargs={'id': course.id})
        res = self.client.post(review_url, {'decision': 'approve'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin approves
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(review_url, {'decision': 'approve', 'note': 'Looks good!'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        course.refresh_from_db()
        self.assertEqual(course.review_status, 'approved')
        self.assertTrue(course.is_published)

        # Notification dispatched to owner
        notif = Notification.objects.filter(user=self.educator1, title='Course Approved').first()
        self.assertIsNotNone(notif)

    def test_educator_cannot_publish_or_set_price(self):
        self.client.force_authenticate(user=self.educator1)
        # Attempt to create course with is_published=True
        res = self.client.post(reverse('course-create'), {
            'slug': 'test-pub-course-r2',
            'title': 'Test Course',
            'category': 'after-msc-btech',
            'target_exam': 'CSIR NET',
            'is_published': True,
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to set price
        res = self.client.post(reverse('course-create'), {
            'slug': 'test-price-course-r2',
            'title': 'Test Course Price',
            'category': 'after-msc-btech',
            'target_exam': 'CSIR NET',
            'price': '499.00',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_test_series_submit_and_review(self):
        test = TestSeries.objects.create(
            slug='test-series-ed1-r2',
            title='Test Series 1',
            exam='CSIR NET',
            created_by=self.educator1,
            review_status='draft',
            is_published=False
        )
        url = reverse('admin-test-submit-review', kwargs={'slug': test.slug})

        # Submit without questions fails
        self.client.force_authenticate(user=self.educator1)
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('at least 1 question', res.data['error'])

        # Add question
        TestQuestion.objects.create(test_series=test, question='What is 2+2?', question_number=1)

        # Submit succeeds
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        test.refresh_from_db()
        self.assertEqual(test.review_status, 'pending')

        # Admin rejects with note
        self.client.force_authenticate(user=self.admin)
        review_url = reverse('admin-test-review-decision', kwargs={'slug': test.slug})
        res = self.client.post(review_url, {'decision': 'reject', 'note': 'Needs better explanations'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        test.refresh_from_db()
        self.assertEqual(test.review_status, 'rejected')
        self.assertFalse(test.is_published)

        # Notification sent
        notif = Notification.objects.filter(user=self.educator1, title='Test Series Rejected').first()
        self.assertIsNotNone(notif)
        self.assertIn('Needs better explanations', notif.body)

    def test_study_resource_educator_lifecycle(self):
        self.client.force_authenticate(user=self.educator1)
        res = self.client.post(reverse('resource-list'), {
            'slug': 'physics-formula-sheet-r2',
            'title': 'Physics Formula Sheet',
            'exam': 'CSIR NET',
            'file_url': 'https://example.com/sheet.pdf',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        resource = StudyResource.objects.get(slug='physics-formula-sheet-r2')
        self.assertEqual(resource.created_by, self.educator1)
        self.assertEqual(resource.review_status, 'draft')
        self.assertFalse(resource.is_published)

        # Educator submits
        res = self.client.post(reverse('resource-submit-review', kwargs={'slug': resource.slug}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        resource.refresh_from_db()
        self.assertEqual(resource.review_status, 'pending')

        # Admin approves
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(reverse('resource-review-decision', kwargs={'slug': resource.slug}), {
            'decision': 'approve'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        resource.refresh_from_db()
        self.assertEqual(resource.review_status, 'approved')
        self.assertTrue(resource.is_published)

    def test_admin_approvals_combined_queue(self):
        c = Course.objects.create(slug='pend-c-r2', title='Pending Course', category='cat', target_exam='exam', review_status='pending', is_published=False, created_by=self.educator1)
        t = TestSeries.objects.create(slug='pend-t-r2', title='Pending Test', exam='exam', review_status='pending', is_published=False, created_by=self.educator1)
        r = StudyResource.objects.create(slug='pend-r-r2', title='Pending Res', exam='exam', review_status='pending', is_published=False, created_by=self.educator1)

        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-approvals-combined'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['total_pending'], 3)
        course_ids = [item['id'] for item in res.data['courses']]
        self.assertIn(c.id, course_ids)

    def test_ownership_transfer_single_and_bulk(self):
        c1 = Course.objects.create(slug='c1-r2', title='Course 1', category='cat', target_exam='exam', created_by=self.educator1)
        c2 = Course.objects.create(slug='c2-r2', title='Course 2', category='cat', target_exam='exam', created_by=self.educator1)

        self.client.force_authenticate(user=self.admin)
        # Single transfer
        res = self.client.post(reverse('course-transfer-single', kwargs={'id': c1.id}), {'to_user': self.educator2.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        c1.refresh_from_db()
        self.assertEqual(c1.created_by, self.educator2)

        # Bulk transfer
        res = self.client.post(reverse('course-transfer-bulk'), {'ids': [c2.id], 'to_user': self.educator2.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        c2.refresh_from_db()
        self.assertEqual(c2.created_by, self.educator2)

        # Notifications sent to both
        self.assertTrue(Notification.objects.filter(user=self.educator1, title='Course Ownership Transferred').exists())
        self.assertTrue(Notification.objects.filter(user=self.educator2, title='Course Ownership Assigned').exists())

    def test_audit_scoping_educator_vs_admin(self):
        AuditLog.objects.create(actor=self.educator1, owner=self.educator1, action='create', object_type='course', object_title='Ed1 Course')
        AuditLog.objects.create(actor=self.educator2, owner=self.educator2, action='create', object_type='course', object_title='Ed2 Course')

        # Educator 1 only sees their own
        self.client.force_authenticate(user=self.educator1)
        res = self.client.get(reverse('educator-activity-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [item['object_title'] for item in res.data['results']]
        self.assertIn('Ed1 Course', titles)
        self.assertNotIn('Ed2 Course', titles)

        # Admin sees all via admin-audit-list
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(reverse('admin-audit-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [item['object_title'] for item in res.data['results']]
        self.assertIn('Ed1 Course', titles)
        self.assertIn('Ed2 Course', titles)

        # Educator cannot access admin audit list
        self.client.force_authenticate(user=self.educator1)
        res = self.client.get(reverse('admin-audit-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_entries_immutable_and_cannot_be_edited(self):
        log = AuditLog.objects.create(
            actor=self.educator1,
            owner=self.educator1,
            action='create',
            object_type='course',
            object_title='Immutable Course'
        )
        self.client.force_authenticate(user=self.admin)
        # Attempt to POST/PUT/PATCH/DELETE to audit list returns 405 Method Not Allowed
        res_post = self.client.post(reverse('admin-audit-list'), {'action': 'fake'})
        self.assertEqual(res_post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        res_put = self.client.put(reverse('admin-audit-list'), {'action': 'fake'})
        self.assertEqual(res_put.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        res_delete = self.client.delete(reverse('admin-audit-list'))
        self.assertEqual(res_delete.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_notifications_endpoints_and_lifecycle(self):
        n1 = Notification.objects.create(user=self.educator1, title='Note 1', body='Body 1', is_read=False)
        n2 = Notification.objects.create(user=self.educator1, title='Note 2', body='Body 2', is_read=False)

        self.client.force_authenticate(user=self.educator1)
        # List
        res = self.client.get(reverse('notification-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

        # Unread count
        res_count = self.client.get(reverse('notification-unread-count'))
        self.assertEqual(res_count.status_code, status.HTTP_200_OK)
        self.assertEqual(res_count.data['unread_count'], 2)

        # Mark single read
        res_read = self.client.post(reverse('notification-mark-read', kwargs={'pk': n1.id}))
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)
        n1.refresh_from_db()
        self.assertTrue(n1.is_read)

        # Mark all read
        res_all = self.client.post(reverse('notification-mark-all-read'))
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        n2.refresh_from_db()
        self.assertTrue(n2.is_read)

    def test_permissions_matrix_unauthenticated_and_student(self):
        # 1. Unauthenticated (401)
        self.client.logout()
        res = self.client.get(reverse('admin-approvals-combined'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        res = self.client.get(reverse('notification-list'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        res = self.client.get(reverse('educator-activity-list'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Student (403 on admin & educator endpoints)
        self.client.force_authenticate(user=self.student)
        res = self.client.get(reverse('admin-approvals-combined'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        res = self.client.get(reverse('admin-audit-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        res = self.client.post(reverse('course-transfer-bulk'), {'ids': [1], 'to_user': 2})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
