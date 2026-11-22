from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import UserProfile, EmailVerificationToken, PasswordResetToken, FacultyProfile, Enquiry
from django.utils import timezone
from datetime import timedelta

class AuthAndEmailTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.me_url = reverse('me')
        self.verify_url = reverse('verify-email')
        self.resend_verify_url = reverse('resend-verification')
        self.reset_request_url = reverse('password-reset-request')
        self.reset_confirm_url = reverse('password-reset-confirm')

    def test_registration_and_email_token_creation(self):
        data = {
            'name': 'Test Candidate',
            'email': 'candidate@example.com',
            'password': 'ComplexPassword!2026',
            'phone': '9876543210',
            'target_exam': 'GATE 2027'
        }
        res = self.client.post(self.register_url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', res.data)
        self.assertIn('email_sent', res.data)
        
        user = User.objects.get(email='candidate@example.com')
        self.assertEqual(user.first_name, 'Test Candidate')
        self.assertFalse(user.profile.is_email_verified)
        
        # Verify token created
        token_obj = EmailVerificationToken.objects.filter(user=user).first()
        self.assertIsNotNone(token_obj)
        self.assertFalse(token_obj.is_used)

    def test_weak_password_rejected(self):
        data = {
            'name': 'Weak User',
            'email': 'weak@example.com',
            'password': '123',
        }
        res = self.client.post(self.register_url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', res.data)

    def test_verify_email_flow(self):
        user = User.objects.create_user(username='verifyme@example.com', email='verifyme@example.com', password='ComplexPassword!2026')
        profile = UserProfile.objects.create(user=user, is_email_verified=False)
        token_obj = EmailVerificationToken.create_for_user(user)

        # Invalid token test
        res_invalid = self.client.post(self.verify_url, {'token': 'invalid-token-1234'}, format='json')
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid token test
        res = self.client.post(self.verify_url, {'token': token_obj.token}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        profile.refresh_from_db()
        self.assertTrue(profile.is_email_verified)
        token_obj.refresh_from_db()
        self.assertTrue(token_obj.is_used)

        # Re-use token test
        res_reuse = self.client.post(self.verify_url, {'token': token_obj.token}, format='json')
        self.assertEqual(res_reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_verification_token(self):
        user = User.objects.create_user(username='expired@example.com', email='expired@example.com', password='ComplexPassword!2026')
        UserProfile.objects.create(user=user)
        token_obj = EmailVerificationToken.create_for_user(user)
        token_obj.expires_at = timezone.now() - timedelta(hours=1)
        token_obj.save()

        res = self.client.post(self.verify_url, {'token': token_obj.token}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', str(res.data).lower())

    def test_password_reset_flow(self):
        user = User.objects.create_user(username='resetme@example.com', email='resetme@example.com', password='OldPassword!2026')
        UserProfile.objects.create(user=user)
        old_auth_token = Token.objects.create(user=user)

        # Request reset
        res_req = self.client.post(self.reset_request_url, {'email': user.email}, format='json')
        self.assertEqual(res_req.status_code, status.HTTP_200_OK)

        reset_token = PasswordResetToken.objects.filter(user=user, is_used=False).first()
        self.assertIsNotNone(reset_token)

        # Weak new password rejection
        res_weak = self.client.post(self.reset_confirm_url, {
            'token': reset_token.token,
            'new_password': '123'
        }, format='json')
        self.assertEqual(res_weak.status_code, status.HTTP_400_BAD_REQUEST)

        # Confirm reset with strong password
        res_conf = self.client.post(self.reset_confirm_url, {
            'token': reset_token.token,
            'new_password': 'NewSecurePassword!2026'
        }, format='json')
        self.assertEqual(res_conf.status_code, status.HTTP_200_OK)
        self.assertIn('token', res_conf.data)

        # Verify old auth token invalidated
        self.assertFalse(Token.objects.filter(key=old_auth_token.key).exists())

        # Test login with new password
        res_login = self.client.post(self.login_url, {'email': user.email, 'password': 'NewSecurePassword!2026'}, format='json')
        self.assertEqual(res_login.status_code, status.HTTP_200_OK)

        # Test login with old password fails
        res_login_old = self.client.post(self.login_url, {'email': user.email, 'password': 'OldPassword!2026'}, format='json')
        self.assertEqual(res_login_old.status_code, status.HTTP_401_UNAUTHORIZED)


class DashboardAndPermissionTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_dash@sims.com', 'admin_dash@sims.com', 'AdminPass123!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.educator = User.objects.create_user('educator_dash@sims.com', 'educator_dash@sims.com', 'EduPass123!')
        UserProfile.objects.create(user=self.educator, role='educator')
        self.educator_token, _ = Token.objects.get_or_create(user=self.educator)

        self.student = User.objects.create_user('student_dash@sims.com', 'student_dash@sims.com', 'StudentPass123!')
        UserProfile.objects.create(user=self.student, role='student')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        self.other_student = User.objects.create_user('other_student@sims.com', 'other_student@sims.com', 'StudentPass123!')
        UserProfile.objects.create(user=self.other_student, role='student')
        self.other_token, _ = Token.objects.get_or_create(user=self.other_student)

    def test_admin_dashboard_stats_permission(self):
        url = reverse('admin-stats')
        
        # Student cannot access admin stats
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can access admin stats
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('totalCourses', res.data)
        self.assertIn('totalVerifiedRevenue', res.data)
        self.assertIn('totalTestAttempts', res.data)

    def test_student_progress_isolation(self):
        url = reverse('student-progress')

        # Authenticated student sees their own progress
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['student']['email'], 'student_dash@sims.com')

        # Other student sees only their own progress
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token.key}')
        res2 = self.client.get(url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['student']['email'], 'other_student@sims.com')

    def test_educator_student_progress_access(self):
        url = reverse('educator-students-progress')

        # Student cannot access educator student roster
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Educator can access educator student roster
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.educator_token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)


class FacultyAndEnquiryTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_fac@sims.com', 'admin_fac@sims.com', 'AdminPass123!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.student = User.objects.create_user('student_fac@sims.com', 'student_fac@sims.com', 'StudentPass123!')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        self.fac1 = FacultyProfile.objects.create(
            slug='dr-verma',
            name='Dr. R. Verma',
            role='Head of Mathematics',
            specialization='Abstract Algebra',
            qualification='Ph.D. IIT Delhi',
            experience='15+ Years',
            bio='Expert educator in higher mathematics.',
            image='https://example.com/fac1.jpg',
            courses_taught=['gate']
        )

    def test_public_faculty_listing_and_detail(self):
        url = reverse('faculty-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 1)

        detail_url = reverse('faculty-detail', kwargs={'slug': 'dr-verma'})
        res_d = self.client.get(detail_url)
        self.assertEqual(res_d.status_code, status.HTTP_200_OK)
        self.assertEqual(res_d.data['name'], 'Dr. R. Verma')

    def test_admin_only_faculty_mutations(self):
        url = reverse('faculty-list')
        payload = {
            'slug': 'dr-sharma',
            'name': 'Dr. S. Sharma',
            'role': 'Director',
            'specialization': 'Quantum Physics',
            'qualification': 'Ph.D. IISc',
            'experience': '12+ Years',
            'bio': 'Pioneer in physics pedagogy.',
            'image': 'https://example.com/fac2.jpg',
            'coursesTaught': ['iit-jam']
        }
        # Student cannot create faculty
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res_stud = self.client.post(url, payload, format='json')
        self.assertEqual(res_stud.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can create faculty
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        res_adm = self.client.post(url, payload, format='json')
        self.assertEqual(res_adm.status_code, status.HTTP_201_CREATED)
        self.assertTrue(FacultyProfile.objects.filter(slug='dr-sharma').exists())

    def test_public_enquiry_create_and_admin_manage(self):
        create_url = reverse('enquiry-create')
        enq_payload = {
            'name': 'Priya Singh',
            'email': 'priya@example.com',
            'phone': '9876543210',
            'courseInterested': 'GATE Mathematics',
            'message': 'Please share weekend batch timings.'
        }
        # Public anonymous submission succeeds
        self.client.credentials()
        res_pub = self.client.post(create_url, enq_payload, format='json')
        self.assertEqual(res_pub.status_code, status.HTTP_201_CREATED)
        enq_id = res_pub.data['id']

        # Student cannot list enquiries
        list_url = reverse('admin-enquiry-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res_stud = self.client.get(list_url)
        self.assertEqual(res_stud.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can list and update enquiry status
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        res_adm = self.client.get(list_url)
        self.assertEqual(res_adm.status_code, status.HTTP_200_OK)

        detail_url = reverse('admin-enquiry-detail', kwargs={'pk': enq_id})
        res_patch = self.client.patch(detail_url, {'status': 'contacted'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['status'], 'contacted')


class RegistrationContractTests(TestCase):
    """
    Regression tests for registration contract:
    - Name field missing while first_name/last_name provided
    - First_name provided without name
    - Name provided without first_name
    - Duplicate email rejection
    - Email normalization (case-insensitivity)
    - Target exam persistence
    """

    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.register_url = '/api/auth/register/'

    def test_registration_with_firstname_and_lastname_only(self):
        # Exact payload sent by frontend before fix (no 'name' key)
        payload = {
            'email': 'frontend_user@example.com',
            'password': 'StrongPassword!2026',
            'first_name': 'Aarav',
            'last_name': 'Sharma',
            'phone': '9123456780',
            'target_exam': 'NIMCET (MCA Entrance)'
        }
        res = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('token', res.data)
        
        user = User.objects.get(email='frontend_user@example.com')
        self.assertEqual(user.first_name, 'Aarav')
        self.assertEqual(user.last_name, 'Sharma')
        self.assertEqual(user.profile.phone, '9123456780')
        self.assertEqual(user.profile.target_exam, 'NIMCET (MCA Entrance)')

    def test_registration_with_name_only(self):
        # Legacy payload with 'name' only
        payload = {
            'email': 'legacy_user@example.com',
            'password': 'StrongPassword!2026',
            'name': 'Priya Patel',
            'phone': '9876543210'
        }
        res = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(res.status_code, 201)
        
        user = User.objects.get(email='legacy_user@example.com')
        self.assertEqual(user.first_name, 'Priya Patel')

    def test_registration_duplicate_email_case_insensitive(self):
        User.objects.create_user(username='Existing@Example.com', email='existing@example.com', password='Pass!Password123')
        payload = {
            'email': 'EXISTING@EXAMPLE.COM',
            'password': 'AnotherPassword!2026',
            'first_name': 'Duplicate',
            'last_name': 'User'
        }
        res = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)
        self.assertIn('already exists', str(res.data['email']))

    def test_registration_missing_all_name_fields_fails(self):
        payload = {
            'email': 'noname@example.com',
            'password': 'StrongPassword!2026',
        }
        res = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('name', res.data)
