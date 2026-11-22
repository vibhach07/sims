from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch
from django.conf import settings
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from users.models import UserProfile, EducatorApplication
from courses.models import Course, Module, Lecture, UserEnrollment
from assessments.models import TestSeries, TestQuestion, UserTestAttempt


class PortalLoginTests(APITestCase):
    def setUp(self):
        # Student
        self.student = User.objects.create_user('stud@sims.in', 'stud@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.student, role='student')

        # Educator
        self.educator = User.objects.create_user('ed@sims.in', 'ed@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.educator, role='educator')

        # Admin
        self.admin = User.objects.create_superuser('admin@sims.in', 'admin@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.admin, role='admin')

        # Suspended Educator
        self.suspended_ed = User.objects.create_user('susp@sims.in', 'susp@sims.in', 'Pass1234!', is_active=False)
        UserProfile.objects.create(user=self.suspended_ed, role='educator')

        self.login_url = reverse('login')

    def test_student_login_on_student_portal(self):
        res = self.client.post(self.login_url, {'email': 'stud@sims.in', 'password': 'Pass1234!', 'portal': 'student'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user']['role'], 'student')
        self.assertFalse(res.data['user']['is_staff'])

    def test_student_login_on_educator_portal_rejected(self):
        res = self.client.post(self.login_url, {'email': 'stud@sims.in', 'password': 'Pass1234!', 'portal': 'educator'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('code'), 'not_educator')

    def test_educator_login_on_educator_portal(self):
        res = self.client.post(self.login_url, {'email': 'ed@sims.in', 'password': 'Pass1234!', 'portal': 'educator'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user']['role'], 'educator')

    def test_admin_login_on_both_portals(self):
        res1 = self.client.post(self.login_url, {'email': 'admin@sims.in', 'password': 'Pass1234!', 'portal': 'student'})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        res2 = self.client.post(self.login_url, {'email': 'admin@sims.in', 'password': 'Pass1234!', 'portal': 'educator'})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data['user']['is_staff'])

    def test_suspended_user_login_rejected(self):
        res = self.client.post(self.login_url, {'email': 'susp@sims.in', 'password': 'Pass1234!', 'portal': 'educator'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('code'), 'suspended')

    def test_wrong_password_does_not_leak_role(self):
        res = self.client.post(self.login_url, {'email': 'stud@sims.in', 'password': 'WrongPassword!', 'portal': 'educator'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class EducatorApplicationFlowTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_app@sims.in', 'admin_app@sims.in', 'Pass1234!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

    def test_apply_success(self):
        url = reverse('educator-apply')
        data = {
            'name': 'Dr. Sharma',
            'email': 'sharma@sims.in',
            'phone': '9876543210',
            'subjects': 'Mathematics, Linear Algebra',
            'qualification': 'PhD Mathematics',
            'experience': '10 years',
            'bio': 'Experienced GATE faculty',
            'demo_link': 'https://youtube.com/watch?v=12345678901',
            'resume_link': 'https://drive.google.com/resume.pdf',
        }
        res = self.client.post(url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'pending')

    def test_apply_duplicate_pending_blocked(self):
        EducatorApplication.objects.create(
            name='Dr. Sharma',
            email='sharma_dup@sims.in',
            phone='9876543210',
            subjects='Math',
            qualification='MSc',
            experience='5y',
            bio='Bio',
            demo_link='https://example.com/demo',
            status='pending'
        )
        url = reverse('educator-apply')
        res = self.client.post(url, {
            'name': 'Dr. Sharma Two',
            'email': 'sharma_dup@sims.in',
            'phone': '9876543210',
            'subjects': 'Math',
            'qualification': 'MSc',
            'experience': '5y',
            'bio': 'Bio',
            'demo_link': 'https://example.com/demo',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', res.data.get('error', ''))

    def test_admin_approve_creates_user_and_faculty_profile(self):
        app = EducatorApplication.objects.create(
            name='Prof Verma',
            email='verma@sims.in',
            phone='9876543211',
            subjects='Physics',
            qualification='PhD',
            experience='8y',
            bio='Physics Guru',
            demo_link='https://example.com/demo',
            status='pending'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        approve_url = reverse('admin-educator-application-approve', kwargs={'pk': app.id})
        res = self.client.post(approve_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        app.refresh_from_db()
        self.assertEqual(app.status, 'approved')
        self.assertIsNotNone(app.created_user)
        self.assertEqual(app.created_user.profile.role, 'educator')
        self.assertTrue(hasattr(app.created_user, 'faculty_profile'))
        self.assertFalse(app.created_user.faculty_profile.is_active)

    def test_admin_reject_requires_note(self):
        app = EducatorApplication.objects.create(
            name='Applicant X',
            email='appx@sims.in',
            phone='9876543212',
            subjects='CS',
            qualification='BTech',
            experience='1y',
            bio='Junior',
            demo_link='https://example.com/demo',
            status='pending'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        reject_url = reverse('admin-educator-application-reject', kwargs={'pk': app.id})
        
        # Missing note
        res_no_note = self.client.post(reject_url, {})
        self.assertEqual(res_no_note.status_code, status.HTTP_400_BAD_REQUEST)

        # With note
        res = self.client.post(reject_url, {'admin_note': 'Needs more teaching experience.'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'rejected')
        self.assertEqual(app.admin_note, 'Needs more teaching experience.')


class AdminEducatorManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_mgr@sims.in', 'admin_mgr@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.admin, role='admin')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.ed = User.objects.create_user('ed_mgr@sims.in', 'ed_mgr@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.ed, role='educator')
        self.ed_token, _ = Token.objects.get_or_create(user=self.ed)

    def test_educator_forbidden_from_admin_educator_management(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed_token.key}')
        res = self.client.get(reverse('admin-educators-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_add_educator(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        res = self.client.post(reverse('admin-educators-list'), {
            'name': 'Direct Faculty',
            'email': 'direct@sims.in'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['role'], 'educator')

    def test_admin_cannot_suspend_self(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        url = reverse('admin-educator-action', kwargs={'pk': self.admin.id, 'action': 'suspend'})
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('yourself', res.data.get('error', ''))

    def test_admin_suspend_and_reactivate_educator(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        # Suspend
        url_susp = reverse('admin-educator-action', kwargs={'pk': self.ed.id, 'action': 'suspend'})
        res = self.client.post(url_susp)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.ed.refresh_from_db()
        self.assertFalse(self.ed.is_active)

        # Reactivate
        url_react = reverse('admin-educator-action', kwargs={'pk': self.ed.id, 'action': 'reactivate'})
        res_react = self.client.post(url_react)
        self.assertEqual(res_react.status_code, status.HTTP_200_OK)
        self.ed.refresh_from_db()
        self.assertTrue(self.ed.is_active)

    def test_admin_remove_educator_demotes_to_student(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        url_rem = reverse('admin-educator-action', kwargs={'pk': self.ed.id, 'action': 'remove'})
        res = self.client.post(url_rem)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.ed.refresh_from_db()
        self.assertEqual(self.ed.profile.role, 'student')


class ScopedStudentProgressTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_sc@sims.in', 'admin_sc@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.admin, role='admin')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.ed1 = User.objects.create_user('ed1_sc@sims.in', 'ed1_sc@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.ed1, role='educator')
        self.ed1_token, _ = Token.objects.get_or_create(user=self.ed1)

        self.ed2 = User.objects.create_user('ed2_sc@sims.in', 'ed2_sc@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.ed2, role='educator')
        self.ed2_token, _ = Token.objects.get_or_create(user=self.ed2)

        # Student 1 enrolled in ed1 course
        self.stud1 = User.objects.create_user('stud1@sims.in', 'stud1@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.stud1, role='student', phone='9999999999')

        # Student 2 enrolled in ed2 course
        self.stud2 = User.objects.create_user('stud2@sims.in', 'stud2@sims.in', 'Pass1234!')
        UserProfile.objects.create(user=self.stud2, role='student', phone='8888888888')

        self.course_ed1 = Course.objects.create(slug='c-ed1', title='Course ED1', price=100, created_by=self.ed1)
        self.course_ed2 = Course.objects.create(slug='c-ed2', title='Course ED2', price=100, created_by=self.ed2)

        UserEnrollment.objects.create(user=self.stud1, course=self.course_ed1, is_active=True)
        UserEnrollment.objects.create(user=self.stud2, course=self.course_ed2, is_active=True)

    def test_educator_sees_only_own_students_and_no_phone(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed1_token.key}')
        url = reverse('educator-students-progress')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        emails = [s['email'] for s in res.data]
        self.assertIn('stud1@sims.in', emails)
        self.assertNotIn('stud2@sims.in', emails)

        # Ensure no phone is returned
        for s in res.data:
            self.assertNotIn('phone', s)

    def test_admin_sees_all_students(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        url = reverse('educator-students-progress')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        emails = [s['email'] for s in res.data]
        self.assertIn('stud1@sims.in', emails)
        self.assertIn('stud2@sims.in', emails)


class GoogleAuthTests(APITestCase):
    def test_google_config_endpoint(self):
        url = reverse('google-auth-config')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('client_id', res.data)

    def test_google_auth_missing_credential(self):
        url = reverse('google-auth')
        res = self.client.post(url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('requests.get')
    def test_google_auth_new_student_success(self, mock_get):
        from unittest.mock import MagicMock
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'email': 'newstudent@gmail.com',
            'email_verified': True,
            'name': 'New Student',
            'given_name': 'New',
            'family_name': 'Student',
            'picture': 'https://google.com/pic.jpg',
            'aud': settings.GOOGLE_OAUTH_CLIENT_ID or '',
        }
        mock_get.return_value = mock_resp

        url = reverse('google-auth')
        res = self.client.post(url, {'credential': 'fake_google_jwt', 'portal': 'student'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('token', res.data)
        self.assertEqual(res.data['user']['email'], 'newstudent@gmail.com')
        self.assertEqual(res.data['user']['role'], 'student')

    @patch('requests.get')
    def test_google_auth_educator_not_registered(self, mock_get):
        from unittest.mock import MagicMock
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'email': 'unknown_educator@gmail.com',
            'email_verified': True,
            'name': 'Unknown',
            'aud': settings.GOOGLE_OAUTH_CLIENT_ID or '',
        }
        mock_get.return_value = mock_resp

        url = reverse('google-auth')
        res = self.client.post(url, {'credential': 'fake_google_jwt', 'portal': 'educator'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('code'), 'not_educator')


class VerifyPasscodeTests(APITestCase):
    def setUp(self):
        from site_config.models import SiteSettings
        self.settings = SiteSettings.get_solo()
        self.settings.admin_passcode = 'test_admin_pass'
        self.settings.educator_passcode = 'test_edu_pass'
        self.settings.save()

        self.admin = User.objects.create_user('adm_pc', 'adm_pc@sims.test', 'pass123', is_staff=True, is_superuser=True)
        UserProfile.objects.create(user=self.admin, role='admin')

        self.educator = User.objects.create_user('edu_pc', 'edu_pc@sims.test', 'pass123')
        UserProfile.objects.create(user=self.educator, role='educator')

        self.student = User.objects.create_user('stu_pc', 'stu_pc@sims.test', 'pass123')
        UserProfile.objects.create(user=self.student, role='student')

    def test_admin_passcode_success(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/auth/verify-portal-passcode/', {'portal': 'admin', 'passcode': 'test_admin_pass'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))

    def test_admin_passcode_failure(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/auth/verify-portal-passcode/', {'portal': 'admin', 'passcode': 'wrong_pass'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_blocked_from_passcode(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post('/api/auth/verify-portal-passcode/', {'portal': 'admin', 'passcode': 'test_admin_pass'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data.get('code'), 'forbidden_role')

    def test_educator_passcode_success(self):
        self.client.force_authenticate(user=self.educator)
        res = self.client.post('/api/auth/verify-portal-passcode/', {'portal': 'educator', 'passcode': 'test_edu_pass'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))

