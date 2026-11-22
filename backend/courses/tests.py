from django.core.management import call_command
from io import StringIO
from users.models import UserProfile as Profile
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Course, Subject, Module, Lecture, UserEnrollment, UserLectureProgress, CourseCategory, CourseTrack


# ── fixtures ──────────────────────────────────────────────────────────────────

def make_course(slug='gate-maths', is_paid=True):
    return Course.objects.create(
        slug=slug, title='GATE Mathematics',
        category='after-msc-btech', target_exam='GATE',
        price=19999.00, is_paid=is_paid, is_published=True,
    )

TEST_VIDEO_URL = 'https://test.example.com/sample.mp4'

def make_structure(course):
    mod = Module.objects.create(course=course, title='Linear Algebra', order=1)
    free = Lecture.objects.create(module=mod, title='Free Preview Lecture', order=1, is_free_preview=True, video_url=TEST_VIDEO_URL)
    paid = Lecture.objects.create(module=mod, title='Paid Lecture', order=2, is_free_preview=False, video_url=TEST_VIDEO_URL)
    return mod, free, paid


# ── course + subject permission tests ────────────────────────────────────────

class CourseAndSubjectPermissionTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin@sims.com', 'admin@sims.com', 'AdminPass123!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.student = User.objects.create_user('student@sims.com', 'student@sims.com', 'StudentPass123!')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        self.course = make_course()

    def test_anonymous_and_student_cannot_create_course(self):
        url = reverse('course-create')
        payload = {
            'slug': 'new-course', 'title': 'New Course',
            'category': 'after-msc-btech', 'target_exam': 'GATE',
            'price': '10000.00',
        }
        res_anon = self.client.post(url, payload, format='json')
        self.assertIn(res_anon.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res_student = self.client.post(url, payload, format='json')
        self.assertEqual(res_student.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_and_manage_subject(self):
        url = reverse('subject-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        payload = {
            'name': 'Linear Algebra', 'slug': 'linear-algebra',
            'description': 'Matrices and Vector Spaces',
            'course': self.course.id, 'order': 1, 'is_active': True,
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Subject.objects.filter(slug='linear-algebra').exists())

    def test_public_can_view_subjects(self):
        Subject.objects.create(name='Calculus', slug='calculus', course=self.course)
        url = reverse('subject-list')
        self.client.credentials()
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)


# ── lecture access authorization ──────────────────────────────────────────────

class LectureAccessTests(APITestCase):
    """
    Covers anonymous, non-enrolled student, enrolled student, educator (staff),
    and administrator access to lecture detail and video_url.
    """
    def setUp(self):
        self.course = make_course(is_paid=True)
        _, self.free_lecture, self.paid_lecture = make_structure(self.course)

        self.anon_client = self.client

        self.student = User.objects.create_user('s@sims.in', 's@sims.in', 'Pass1234!')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        self.enrolled_student = User.objects.create_user('e@sims.in', 'e@sims.in', 'Pass1234!')
        self.enrolled_token, _ = Token.objects.get_or_create(user=self.enrolled_student)
        UserEnrollment.objects.create(user=self.enrolled_student, course=self.course)

        self.admin = User.objects.create_superuser('a@sims.in', 'a@sims.in', 'AdminPass1!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

    def _get_lecture(self, lecture, token=None):
        if token:
            self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        else:
            self.client.credentials()
        url = reverse('lecture-detail', kwargs={'lecture_id': lecture.id})
        return self.client.get(url)

    # free preview lecture
    def test_anonymous_can_access_free_preview_video(self):
        res = self._get_lecture(self.free_lecture)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['is_locked'])
        self.assertIsNotNone(res.data['video_url'])

    def test_non_enrolled_student_can_access_free_preview(self):
        res = self._get_lecture(self.free_lecture, self.student_token.key)
        self.assertFalse(res.data['is_locked'])
        self.assertIsNotNone(res.data['video_url'])

    # paid lecture — anonymous / non-enrolled
    def test_anonymous_cannot_access_paid_lecture_video(self):
        res = self._get_lecture(self.paid_lecture)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_locked'])
        self.assertIsNone(res.data['video_url'])

    def test_non_enrolled_student_cannot_access_paid_lecture_video(self):
        res = self._get_lecture(self.paid_lecture, self.student_token.key)
        self.assertTrue(res.data['is_locked'])
        self.assertIsNone(res.data['video_url'])

    # paid lecture — enrolled student
    def test_enrolled_student_can_access_paid_lecture_video(self):
        res = self._get_lecture(self.paid_lecture, self.enrolled_token.key)
        self.assertFalse(res.data['is_locked'])
        self.assertIsNotNone(res.data['video_url'])

    # admin / staff
    def test_admin_can_access_any_lecture_video(self):
        res = self._get_lecture(self.paid_lecture, self.admin_token.key)
        self.assertFalse(res.data['is_locked'])
        self.assertIsNotNone(res.data['video_url'])

    # free-access course
    def test_free_course_lecture_accessible_to_all(self):
        free_course = make_course(slug='free-intro', is_paid=False)
        mod = Module.objects.create(course=free_course, title='Intro', order=1)
        lec = Lecture.objects.create(module=mod, title='Free Lec', order=1, video_url=TEST_VIDEO_URL)
        res = self._get_lecture(lec)
        self.assertFalse(res.data['is_locked'])
        self.assertIsNotNone(res.data['video_url'])


# ── progress endpoints ────────────────────────────────────────────────────────

class LectureProgressTests(APITestCase):
    def setUp(self):
        self.course = make_course()
        _, _, self.lecture = make_structure(self.course)  # paid lecture

        self.enrolled = User.objects.create_user('enr@sims.in', 'enr@sims.in', 'Pass1234!')
        self.enrolled_token, _ = Token.objects.get_or_create(user=self.enrolled)
        UserEnrollment.objects.create(user=self.enrolled, course=self.course)

        self.other = User.objects.create_user('other@sims.in', 'other@sims.in', 'Pass1234!')
        self.other_token, _ = Token.objects.get_or_create(user=self.other)

    def _url(self):
        return reverse('lecture-progress', kwargs={'lecture_id': self.lecture.id})

    # GET — returns default zeros if no record
    def test_get_progress_returns_zeros_initially(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['is_completed'])
        self.assertEqual(res.data['last_position_seconds'], 0)

    # PATCH saves position
    def test_patch_saves_position(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res = self.client.patch(self._url(), {'last_position_seconds': 120}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['last_position_seconds'], 120)
        self.assertFalse(res.data['is_completed'])

    # POST toggles completed
    def test_post_toggles_completion(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res1 = self.client.post(self._url(), {'last_position_seconds': 300}, format='json')
        self.assertTrue(res1.data['is_completed'])
        res2 = self.client.post(self._url(), {}, format='json')
        self.assertFalse(res2.data['is_completed'])

    # idempotent position
    def test_patch_is_idempotent(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        self.client.patch(self._url(), {'last_position_seconds': 90}, format='json')
        res = self.client.patch(self._url(), {'last_position_seconds': 90}, format='json')
        self.assertEqual(res.data['last_position_seconds'], 90)

    # non-enrolled cannot record progress
    def test_non_enrolled_cannot_record_progress(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token.key}')
        res = self.client.patch(self._url(), {'last_position_seconds': 60}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # unauthenticated
    def test_unauthenticated_cannot_access_progress(self):
        self.client.credentials()
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # my-lecture-progress list
    def test_my_progress_list_returns_user_records(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        self.client.patch(self._url(), {'last_position_seconds': 55}, format='json')
        res = self.client.get(reverse('my-lecture-progress'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['last_position_seconds'], 55)

    # invalid position values rejected with 400 Bad Request
    def test_negative_position_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res = self.client.patch(self._url(), {'last_position_seconds': -10}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be negative', res.data.get('error', ''))

    def test_non_numeric_position_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res = self.client.patch(self._url(), {'last_position_seconds': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('valid finite number', res.data.get('error', ''))

    def test_nan_or_infinite_position_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res1 = self.client.patch(self._url(), {'last_position_seconds': 'NaN'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        res2 = self.client.patch(self._url(), {'last_position_seconds': 'Infinity'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_excessively_large_position_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res = self.client.patch(self._url(), {'last_position_seconds': 999999}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exceeds maximum allowed position', res.data.get('error', ''))

    def test_patch_preserves_completion_state(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        res_post = self.client.post(self._url(), {'last_position_seconds': 100}, format='json')
        self.assertTrue(res_post.data['is_completed'])
        res_patch = self.client.patch(self._url(), {'last_position_seconds': 150}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['last_position_seconds'], 150)
        self.assertTrue(res_patch.data['is_completed'])

    def test_user_isolation_progress(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        self.client.patch(self._url(), {'last_position_seconds': 200}, format='json')

        UserEnrollment.objects.create(user=self.other, course=self.course)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token.key}')
        res = self.client.get(self._url())
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['last_position_seconds'], 0)
        self.assertFalse(res.data['is_completed'])

    def test_lecture_switch_isolation_and_distinct_positions(self):
        """Two distinct lectures maintain their own isolated positions for the same user."""
        _, _, lecture2 = make_structure(self.course)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.enrolled_token.key}')
        
        # Save pos 150 for lecture 1
        url1 = reverse('lecture-progress', kwargs={'lecture_id': self.lecture.id})
        res1 = self.client.patch(url1, {'last_position_seconds': 150}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Save pos 75 for lecture 2
        url2 = reverse('lecture-progress', kwargs={'lecture_id': lecture2.id})
        res2 = self.client.patch(url2, {'last_position_seconds': 75}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        # Fetch both and verify positions are independent
        get1 = self.client.get(url1)
        self.assertEqual(get1.data['last_position_seconds'], 150)
        get2 = self.client.get(url2)
        self.assertEqual(get2.data['last_position_seconds'], 75)

    def test_free_preview_lecture_accessible_without_enrollment(self):
        """Free preview lecture allows progress and video_url even when unenrolled."""
        self.lecture.is_free_preview = True
        self.lecture.save()

        # Unenrolled user can view detail with video_url intact
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token.key}')
        detail_url = reverse('lecture-detail', kwargs={'lecture_id': self.lecture.id})
        detail_res = self.client.get(detail_url)
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertFalse(detail_res.data['is_locked'])
        self.assertIsNotNone(detail_res.data['video_url'])

        # Unenrolled user can also record progress on free preview
        prog_res = self.client.patch(self._url(), {'last_position_seconds': 40}, format='json')
        self.assertEqual(prog_res.status_code, status.HTTP_200_OK)
        self.assertEqual(prog_res.data['last_position_seconds'], 40)



# ── video discovery (no private URLs leak) ────────────────────────────────────

class VideoDiscoveryLeakTests(APITestCase):
    def setUp(self):
        self.course = make_course()
        make_structure(self.course)

    def test_anonymous_discovery_hides_paid_lecture_url(self):
        url = reverse('video-discovery')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for course_data in res.data:
            for module in course_data.get('curriculum', []):
                for lesson in module.get('lessons', []):
                    if lesson['is_locked']:
                        self.assertIsNone(lesson['video_url'],
                            f"Locked lecture {lesson['id']} leaked video_url")


# ── course admin tests ────────────────────────────────────────────────────────

class CourseAdminTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_user', 'admin@example.com', 'AdminPass123!')
        self.course = make_course(slug='test-admin-course')
        self.client.force_login(self.admin)

    def test_course_admin_changelist_and_change_views(self):
        changelist_url = reverse('admin:courses_course_changelist')
        res = self.client.get(changelist_url)
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'GATE Mathematics')

        add_url = reverse('admin:courses_course_add')
        res_add = self.client.get(add_url)
        self.assertEqual(res_add.status_code, 200)

        change_url = reverse('admin:courses_course_change', args=[self.course.id])
        res_change = self.client.get(change_url)
        self.assertEqual(res_change.status_code, 200)
        self.assertContains(res_change, 'GATE Mathematics')

    def test_course_admin_can_add_course(self):
        add_url = reverse('admin:courses_course_add')
        post_data = {
            'title': 'New Admin Created Course',
            'slug': 'new-admin-created-course',
            'subtitle': 'Sub text',
            'badge': 'Hot',
            'category': 'msc',
            'category_label': 'PG',
            'target_exam': 'IIT-JAM',
            'is_paid': True,
            'price': '14999.00',
            'original_price': '19999.00',
            'fee_status': 'Open',
            'is_published': True,
            'duration': '6 Months',
            'format': 'Online',
            'language': 'English',
            'short_description': 'Short summary',
            'long_description': 'Long details',
            'curriculum-TOTAL_FORMS': '0',
            'curriculum-INITIAL_FORMS': '0',
            'curriculum-MIN_NUM_FORMS': '0',
            'curriculum-MAX_NUM_FORMS': '1000',
        }
        res = self.client.post(add_url, post_data)
        self.assertEqual(res.status_code, 302)
        self.assertTrue(Course.objects.filter(slug='new-admin-created-course').exists())




# ── progress cap tests (86400 hard cap, no duration-based comparison) ─────────

class ProgressCapTests(APITestCase):
    """
    Verify that _validate_and_extract_position rejects only:
    - non-numeric strings
    - non-finite values (NaN, Infinity)
    - negative values
    - values > 86400
    And ACCEPTS any valid position <= 86400, regardless of lecture.duration.
    """
    def setUp(self):
        self.course = make_course()
        _, _, self.lecture = make_structure(self.course)
        self.user = User.objects.create_user('cap@sims.in', 'cap@sims.in', 'Pass1234!')
        self.token, _ = Token.objects.get_or_create(user=self.user)
        UserEnrollment.objects.create(user=self.user, course=self.course)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def _url(self):
        return reverse('lecture-progress', kwargs={'lecture_id': self.lecture.id})

    def test_position_86400_accepted(self):
        """86400 (exactly 24h) is the hard cap — must be accepted."""
        res = self.client.patch(self._url(), {'last_position_seconds': 86400}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['last_position_seconds'], 86400)

    def test_position_86401_rejected(self):
        """One second above the 24h cap must be rejected."""
        res = self.client.patch(self._url(), {'last_position_seconds': 86401}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('exceeds maximum allowed position', res.data.get('error', ''))

    def test_long_lecture_duration_does_not_cap_below_86400(self):
        """A lecture with duration='2 hrs' should allow position=7200, not reject it
        because the old code used duration+120 as the cap.
        With the new flat 86400 cap, 7200 must always be accepted."""
        self.lecture.duration = '2 hrs'
        self.lecture.save()
        res = self.client.patch(self._url(), {'last_position_seconds': 7200}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['last_position_seconds'], 7200)

    def test_zero_position_accepted(self):
        res = self.client.patch(self._url(), {'last_position_seconds': 0}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_negative_position_rejected(self):
        res = self.client.patch(self._url(), {'last_position_seconds': -1}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be negative', res.data.get('error', ''))

    def test_nan_string_rejected(self):
        res = self.client.patch(self._url(), {'last_position_seconds': 'NaN'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_infinity_string_rejected(self):
        res = self.client.patch(self._url(), {'last_position_seconds': 'Infinity'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ── N+1 query bound tests ──────────────────────────────────────────────────────

class QueryCountTests(APITestCase):
    """Upper-bound assertNumQueries for video discovery and course detail."""

    def setUp(self):
        self.course = make_course(slug='q-count-course')
        make_structure(self.course)
        self.user = User.objects.create_user('q@sims.in', 'q@sims.in', 'Pass1234!')
        self.token, _ = Token.objects.get_or_create(user=self.user)
        UserEnrollment.objects.create(user=self.user, course=self.course)

    def test_video_discovery_query_count(self):
        """Video discovery for authenticated user should complete in <= 8 queries."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('video-discovery')
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(ctx), 8)

    def test_course_detail_query_count(self):
        """Course detail (slug) for authenticated user should complete in <= 8 queries."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('course-detail', kwargs={'slug': self.course.slug})
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(ctx), 8)


# ── Module and Lecture Management CRUD Tests ─────────────────────────────────

class ModuleAndLectureManageTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin@sims.in', 'admin@sims.in', 'Pass1234!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)
        self.student = User.objects.create_user('stud@sims.in', 'stud@sims.in', 'Pass1234!')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)
        self.course = Course.objects.create(
            slug='crud-course',
            title='CRUD Test Course',
            category='nimcet',
            price=999.00,
            is_paid=True,
            is_published=True,
        )

    def test_non_admin_cannot_create_module(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        url = reverse('module-create')
        res = self.client.post(url, {'course': self.course.id, 'title': 'Test Mod', 'order': 1}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_module_and_lecture(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        # Create module
        m_url = reverse('module-create')
        res_m = self.client.post(m_url, {'course': self.course.id, 'title': 'Algebra', 'order': 1}, format='json')
        self.assertEqual(res_m.status_code, status.HTTP_201_CREATED)
        module_id = res_m.data['id']

        # Create lecture
        l_url = reverse('lecture-create')
        res_l = self.client.post(l_url, {
            'module': module_id,
            'title': 'Quadratic Equations',
            'duration': '45 mins',
            'video_url': 'https://example.com/video.mp4',
            'summary': 'Summary text',
            'order': 1,
            'is_free_preview': True,
        }, format='json')
        self.assertEqual(res_l.status_code, status.HTTP_201_CREATED)
        lecture_id = res_l.data['id']

        # Update lecture
        detail_url = reverse('lecture-manage-detail', kwargs={'id': lecture_id})
        res_up = self.client.patch(detail_url, {'title': 'Quadratic Eq Updated'}, format='json')
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        self.assertEqual(res_up.data['title'], 'Quadratic Eq Updated')

        # Invalid video_url rejected
        res_inv = self.client.patch(detail_url, {'video_url': 'javascript:alert(1)'}, format='json')
        self.assertEqual(res_inv.status_code, status.HTTP_400_BAD_REQUEST)

        # Delete lecture
        res_del = self.client.delete(detail_url)
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)


# ── HTTPS Video URL Validation Tests ──────────────────────────────────────────

class VideoUrlSchemeTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_scheme@sims.in', 'admin_scheme@sims.in', 'Pass1234!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)
        self.course = Course.objects.create(
            slug='scheme-course',
            title='Scheme Test Course',
            category='nimcet',
            price=999.00,
            is_paid=True,
            is_published=True,
            created_by=self.admin,
        )
        self.module = Module.objects.create(course=self.course, title='Mod 1', order=1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        self.url = reverse('lecture-create')

    def test_https_allowed(self):
        res = self.client.post(self.url, {
            'module': self.module.id,
            'title': 'Secure Lecture',
            'video_url': 'https://example.com/video.mp4',
            'order': 1,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_empty_allowed(self):
        res = self.client.post(self.url, {
            'module': self.module.id,
            'title': 'Empty URL Lecture',
            'video_url': '',
            'order': 2,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_http_rejected(self):
        res = self.client.post(self.url, {
            'module': self.module.id,
            'title': 'Insecure HTTP Lecture',
            'video_url': 'http://example.com/video.mp4',
            'order': 3,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('video_url', res.data)

    def test_javascript_scheme_rejected(self):
        res = self.client.post(self.url, {
            'module': self.module.id,
            'title': 'XSS Lecture',
            'video_url': 'javascript:alert(1)',
            'order': 4,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('video_url', res.data)

    def test_data_scheme_rejected(self):
        res = self.client.post(self.url, {
            'module': self.module.id,
            'title': 'Data URI Lecture',
            'video_url': 'data:text/html,<script>alert(1)</script>',
            'order': 5,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('video_url', res.data)

    def test_ftp_scheme_rejected(self):
        res = self.client.post(self.url, {
            'module': self.module.id,
            'title': 'FTP Lecture',
            'video_url': 'ftp://example.com/video.mp4',
            'order': 6,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('video_url', res.data)


# ── Educator Permissions and Ownership Tests ─────────────────────────────────

class CourseEducatorOwnershipTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_own@sims.in', 'admin_own@sims.in', 'Pass1234!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.educator1 = User.objects.create_user('ed1@sims.in', 'ed1@sims.in', 'Pass1234!')
        Profile.objects.get_or_create(user=self.educator1, role='educator')
        self.ed1_token, _ = Token.objects.get_or_create(user=self.educator1)

        self.educator2 = User.objects.create_user('ed2@sims.in', 'ed2@sims.in', 'Pass1234!')
        Profile.objects.get_or_create(user=self.educator2, role='educator')
        self.ed2_token, _ = Token.objects.get_or_create(user=self.educator2)

        self.student = User.objects.create_user('student_own@sims.in', 'student_own@sims.in', 'Pass1234!')
        Profile.objects.get_or_create(user=self.student, role='student')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        # Course owned by educator 1
        self.course_ed1 = Course.objects.create(
            slug='ed1-course',
            title='Educator 1 Course',
            category='nimcet',
            price=500.00,
            is_paid=True,
            is_published=True,
            created_by=self.educator1,
        )
        self.module_ed1 = Module.objects.create(course=self.course_ed1, title='Mod ED1', order=1)

        # Course with null owner (admin-created legacy)
        self.course_null = Course.objects.create(
            slug='null-course',
            title='Null Owner Course',
            category='nimcet',
            price=500.00,
            is_paid=True,
            is_published=True,
            created_by=None,
        )

    def test_anonymous_rejected(self):
        url = reverse('course-update-delete', kwargs={'id': self.course_ed1.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        url = reverse('course-update-delete', kwargs={'id': self.course_ed1.id})
        res = self.client.patch(url, {'title': 'Hacked Title'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_educator_can_edit_own_course_and_manage_curriculum(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed1_token.key}')
        # Edit own course
        url = reverse('course-update-delete', kwargs={'id': self.course_ed1.id})
        res = self.client.patch(url, {'title': 'Updated by Owner'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Updated by Owner')

        # Create module on own course
        m_res = self.client.post(reverse('module-create'), {
            'course': self.course_ed1.id,
            'title': 'New Mod by Owner',
            'order': 2,
        }, format='json')
        self.assertEqual(m_res.status_code, status.HTTP_201_CREATED)

    def test_educator_forbidden_on_other_educator_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed2_token.key}')
        url = reverse('course-update-delete', kwargs={'id': self.course_ed1.id})
        res = self.client.patch(url, {'title': 'Hacked by Other Educator'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Forbidden to add module to other educator's course
        m_res = self.client.post(reverse('module-create'), {
            'course': self.course_ed1.id,
            'title': 'Illegal Module',
            'order': 3,
        }, format='json')
        self.assertEqual(m_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_educator_forbidden_on_null_owner_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed1_token.key}')
        url = reverse('course-update-delete', kwargs={'id': self.course_null.id})
        res = self.client.patch(url, {'title': 'Hacked Null Course'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_allowed_on_all(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        # Admin edits ed1 course
        url1 = reverse('course-update-delete', kwargs={'id': self.course_ed1.id})
        res1 = self.client.patch(url1, {'title': 'Admin override ed1'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Admin edits null course
        url2 = reverse('course-update-delete', kwargs={'id': self.course_null.id})
        res2 = self.client.patch(url2, {'title': 'Admin override null'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)


# ── Management Command & Extended Ownership Permissions Tests ─────────────────

class AssignCourseOwnerCommandTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('assign_ed@sims.in', 'assign_ed@sims.in', 'Pass1234!')
        self.course1 = Course.objects.create(
            slug='unowned-1',
            title='Unowned 1',
            category='nimcet',
            price=100.00,
            created_by=None,
        )
        self.course2 = Course.objects.create(
            slug='unowned-2',
            title='Unowned 2',
            category='nimcet',
            price=100.00,
            created_by=None,
        )

    def test_assign_single_course_by_slug(self):
        out = StringIO()
        call_command('assign_course_owner', '--email', 'assign_ed@sims.in', '--slug', 'unowned-1', stdout=out)
        self.course1.refresh_from_db()
        self.assertEqual(self.course1.created_by, self.user)
        self.assertIn('Updated 1 course', out.getvalue())

    def test_assign_all_unowned(self):
        out = StringIO()
        call_command('assign_course_owner', '--email', 'assign_ed@sims.in', '--all-unowned', stdout=out)
        self.course1.refresh_from_db()
        self.course2.refresh_from_db()
        self.assertEqual(self.course1.created_by, self.user)
        self.assertEqual(self.course2.created_by, self.user)
        self.assertIn('Updated 2 unowned course(s)', out.getvalue())


class CourseExtendedOwnershipAndDraftTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_ext@sims.in', 'admin_ext@sims.in', 'Pass1234!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.ed1 = User.objects.create_user('ed1_ext@sims.in', 'ed1_ext@sims.in', 'Pass1234!')
        Profile.objects.get_or_create(user=self.ed1, role='educator')
        self.ed1_token, _ = Token.objects.get_or_create(user=self.ed1)

        self.ed2 = User.objects.create_user('ed2_ext@sims.in', 'ed2_ext@sims.in', 'Pass1234!')
        Profile.objects.get_or_create(user=self.ed2, role='educator')
        self.ed2_token, _ = Token.objects.get_or_create(user=self.ed2)

        self.student = User.objects.create_user('stud_ext@sims.in', 'stud_ext@sims.in', 'Pass1234!')
        Profile.objects.get_or_create(user=self.student, role='student')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        # Ed1's Course & Module
        self.course1 = Course.objects.create(
            slug='ed1-draft-course',
            title='Ed1 Course',
            category='nimcet',
            price=200.00,
            is_published=False,
            created_by=self.ed1,
        )
        self.mod1 = Module.objects.create(course=self.course1, title='Mod 1', order=1)
        self.lec1 = Lecture.objects.create(module=self.mod1, title='Lec 1', order=1)

        # Ed2's Course & Module
        self.course2 = Course.objects.create(
            slug='ed2-pub-course',
            title='Ed2 Course',
            category='nimcet',
            price=200.00,
            is_published=True,
            created_by=self.ed2,
        )
        self.mod2 = Module.objects.create(course=self.course2, title='Mod 2', order=1)
        self.lec2 = Lecture.objects.create(module=self.mod2, title='Lec 2', order=1)

    def test_educator_unpublished_course_appears_in_my_courses(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed1_token.key}')
        # Normal list hides unpublished
        res_pub = self.client.get(reverse('course-list'))
        self.assertEqual(res_pub.status_code, status.HTTP_200_OK)
        slugs_pub = [c['slug'] for c in res_pub.data]
        self.assertNotIn('ed1-draft-course', slugs_pub)

        # my_courses=true includes unpublished
        res_my = self.client.get(reverse('course-list') + '?my_courses=true')
        self.assertEqual(res_my.status_code, status.HTTP_200_OK)
        slugs_my = [c['slug'] for c in res_my.data]
        self.assertIn('ed1-draft-course', slugs_my)
        self.assertNotIn('ed2-pub-course', slugs_my)

    def test_educator_403_creating_lecture_in_another_educator_module(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed1_token.key}')
        res = self.client.post(reverse('lecture-create'), {
            'module': self.mod2.id,
            'title': 'Hacked Lecture in Mod 2',
            'order': 2,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('module', res.data)

    def test_educator_403_patching_and_deleting_another_educator_lecture(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed1_token.key}')
        url = reverse('lecture-manage-detail', kwargs={'id': self.lec2.id})
        res_patch = self.client.patch(url, {'title': 'Malicious Update'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

        res_del = self.client.delete(url)
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_403_on_module_and_lecture_create(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.student_token.key}')
        res_mod = self.client.post(reverse('module-create'), {
            'course': self.course1.id,
            'title': 'Student Mod',
        }, format='json')
        self.assertEqual(res_mod.status_code, status.HTTP_403_FORBIDDEN)

        res_lec = self.client.post(reverse('lecture-create'), {
            'module': self.mod1.id,
            'title': 'Student Lec',
        }, format='json')
        self.assertEqual(res_lec.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_cannot_move_lecture_into_unowned_module(self):
        # Ed1 owns lec1 in mod1. Ed1 attempts to update lec1 to point to mod2 (which Ed1 does NOT own)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.ed1_token.key}')
        url = reverse('lecture-manage-detail', kwargs={'id': self.lec1.id})
        res = self.client.patch(url, {'module': self.mod2.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('module', res.data)

class CourseHierarchyAndLearningTests(APITestCase):
    def setUp(self):
        self.cat = CourseCategory.objects.create(
            name="After MSc / B.Tech",
            slug="after-msc-btech",
            description="Graduate & PG programs",
            order=1
        )
        self.course = Course.objects.create(
            slug="gate",
            title="GATE Technical",
            category="after-msc-btech",
            category_ref=self.cat,
            target_exam="GATE",
            eligibility="B.Tech or M.Sc.",
            exam_overview="100 Marks Computer-based test",
            is_published=True,
            review_status='approved'
        )
        self.track = CourseTrack.objects.create(
            course=self.course,
            name="Computer Science",
            code="CS",
            slug="cs",
            order=1
        )
        self.subject = Subject.objects.create(
            course=self.course,
            track=self.track,
            name="Operating Systems",
            slug="os",
            order=1
        )
        self.module = Module.objects.create(
            course=self.course,
            subject=self.subject,
            title="Processes & Threads",
            order=1
        )
        self.user = User.objects.create_user("learner@sims.com", "learner@sims.com", "LearnerPass123!")
        Profile.objects.create(user=self.user, role='student')
        self.token = Token.objects.create(user=self.user)

    def test_categories_endpoint(self):
        res = self.client.get('/api/courses/categories/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['slug'], 'after-msc-btech')

    def test_course_hierarchy_endpoint(self):
        res = self.client.get('/api/courses/gate/hierarchy/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['slug'], 'gate')
        self.assertEqual(res.data['category_name'], 'After MSc / B.Tech')
        self.assertEqual(len(res.data['tracks']), 1)
        self.assertEqual(res.data['tracks'][0]['code'], 'CS')
        self.assertEqual(res.data['tracks'][0]['subjects'][0]['name'], 'Operating Systems')

    def test_subject_learning_detail_endpoint(self):
        res = self.client.get('/api/courses/gate/subjects/os/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Operating Systems')
        self.assertEqual(len(res.data['modules']), 1)
        self.assertEqual(res.data['modules'][0]['title'], 'Processes & Threads')

    def test_student_preferences_endpoint(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res_get = self.client.get('/api/auth/profile/preferences/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

        res_patch = self.client.patch('/api/auth/profile/preferences/', {
            'education_level': 'Postgraduate',
            'degree': 'M.Sc.',
            'engineering_branch': 'Computer Science',
            'target_exam': 'GATE',
            'target_paper': 'CS',
            'preferred_subjects': ['Operating Systems', 'Algorithms']
        }, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['target_paper'], 'CS')
        self.assertEqual(len(res_patch.data['preferred_subjects']), 2)

    def test_recommended_courses_endpoint(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res = self.client.get('/api/courses/recommended/?target_exam=GATE')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['slug'], 'gate')

    def test_subject_hierarchy_counts_with_real_data(self):
        from resources.models import StudyResource
        from assessments.models import TestSeries

        # Create real lecture, resource and test linked to subject
        Lecture.objects.create(
            module=self.module,
            title="Processes Overview",
            video_url="https://example.com/v.mp4",
            order=1
        )
        # Approved & published resource
        StudyResource.objects.create(
            slug="os-handbook",
            course=self.course,
            subject=self.subject,
            title="OS Handbook",
            exam="GATE",
            file_url="https://example.com/os.pdf",
            is_published=True,
            review_status='approved'
        )
        # Draft resource (must not count)
        StudyResource.objects.create(
            slug="os-draft-notes",
            course=self.course,
            subject=self.subject,
            title="OS Draft Notes",
            exam="GATE",
            file_url="https://example.com/draft.pdf",
            is_published=False,
            review_status='draft'
        )
        # Approved test series
        TestSeries.objects.create(
            slug="os-mock-1",
            course=self.course,
            subject=self.subject,
            title="OS Subject Test 1",
            exam="GATE",
            is_published=True,
            review_status='approved'
        )
        # Pending test series (must not count)
        TestSeries.objects.create(
            slug="os-pending-test",
            course=self.course,
            subject=self.subject,
            title="OS Pending Test",
            exam="GATE",
            is_published=True,
            review_status='pending'
        )

        res = self.client.get('/api/courses/gate/hierarchy/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sub_data = res.data['tracks'][0]['subjects'][0]
        self.assertEqual(sub_data['modules_count'], 1)
        self.assertEqual(sub_data['lectures_count'], 1)
        self.assertGreater(sub_data['resources_count'], 0)
        self.assertEqual(sub_data['resources_count'], 1)  # Only 1 approved/published
        self.assertGreater(sub_data['test_series_count'], 0)
        self.assertEqual(sub_data['test_series_count'], 1)  # Only 1 approved/published

    def test_security_subject_detail_does_not_leak_paid_or_unpublished(self):
        from resources.models import StudyResource
        from assessments.models import TestSeries

        self.course.is_paid = True
        self.course.price = 5000.00
        self.course.save()

        # Paid lecture with no preview
        Lecture.objects.create(
            module=self.module,
            title="Secret Core Theory",
            video_url="https://private.vimeo.com/video999",
            is_free_preview=False,
            order=1
        )
        # Paid study resource
        StudyResource.objects.create(
            slug="paid-secret-sheet",
            course=self.course,
            subject=self.subject,
            title="Paid Secret Formula Sheet",
            exam="GATE",
            price=500.00,
            is_paid=True,
            file_url="https://s3.private/sheet.pdf",
            is_published=True,
            review_status='approved'
        )
        # Draft study resource (should never appear)
        StudyResource.objects.create(
            slug="draft-secret-sheet",
            course=self.course,
            subject=self.subject,
            title="Draft Internal Document",
            exam="GATE",
            price=0.00,
            is_paid=False,
            file_url="https://s3.private/internal.pdf",
            is_published=False,
            review_status='draft'
        )
        # Approved test
        TestSeries.objects.create(
            slug="approved-test",
            course=self.course,
            subject=self.subject,
            title="Approved Exam",
            exam="GATE",
            is_published=True,
            review_status='approved'
        )
        # Unpublished/pending test
        TestSeries.objects.create(
            slug="pending-test",
            course=self.course,
            subject=self.subject,
            title="Pending Exam",
            exam="GATE",
            is_published=False,
            review_status='pending'
        )

        # Anonymous request
        self.client.credentials()  # Clear auth
        res = self.client.get('/api/courses/gate/subjects/os/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 1. Lecture video URL is NOT leaked
        lec = res.data['modules'][0]['lessons'][0]
        self.assertTrue(lec['is_locked'])
        self.assertIsNone(lec['video_url'])

        # 2. Paid resource file_url and download_url are NOT leaked
        res_list = res.data['study_resources']
        self.assertEqual(len(res_list), 1)  # Only 1 (the approved one)
        self.assertEqual(res_list[0]['slug'], 'paid-secret-sheet')
        self.assertFalse(res_list[0]['is_entitled'])
        self.assertIsNone(res_list[0]['file_url'])
        self.assertIsNone(res_list[0]['download_url'])

        # 3. Unpublished tests never appear
        test_list = res.data['test_series']
        self.assertEqual(len(test_list), 1)
        self.assertEqual(test_list[0]['slug'], 'approved-test')

    def test_404_cases_never_return_500(self):
        # 1. Unknown course
        res = self.client.get('/api/courses/nonexistent-course-xyz/hierarchy/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Unknown track
        res = self.client.get('/api/courses/gate/tracks/nonexistent-track-xyz/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # 3. Unknown subject
        res = self.client.get('/api/courses/gate/subjects/nonexistent-subject-xyz/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Inactive track
        self.track.is_active = False
        self.track.save()
        res = self.client.get('/api/courses/gate/tracks/cs/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.track.is_active = True
        self.track.save()

        # 5. Inactive subject
        self.subject.is_active = False
        self.subject.save()
        res = self.client.get('/api/courses/gate/subjects/os/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.subject.is_active = True
        self.subject.save()

        # 6. Unpublished course
        self.course.is_published = False
        self.course.save()
        res = self.client.get('/api/courses/gate/hierarchy/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        res_sub = self.client.get('/api/courses/gate/subjects/os/')
        self.assertEqual(res_sub.status_code, status.HTTP_404_NOT_FOUND)
        self.course.is_published = True
        self.course.save()

    def test_recommended_courses_scenarios(self):
        # Create an unpublished course
        Course.objects.create(
            slug="secret-course",
            title="Secret Upcoming Course",
            category="after-msc-btech",
            target_exam="GATE",
            is_published=False,
            review_status='approved'
        )
        # Create draft course
        Course.objects.create(
            slug="draft-course",
            title="Draft GATE Course",
            category="after-msc-btech",
            target_exam="GATE",
            is_published=True,
            review_status='draft'
        )

        # 1. Anonymous user
        self.client.credentials()
        res_anon = self.client.get('/api/courses/recommended/')
        self.assertEqual(res_anon.status_code, status.HTTP_200_OK)
        slugs = [c['slug'] for c in res_anon.data]
        self.assertNotIn('secret-course', slugs)
        self.assertNotIn('draft-course', slugs)

        # 2. Logged in with empty profile
        empty_user = User.objects.create_user("empty@sims.com", "empty@sims.com", "Pass12345!")
        empty_token = Token.objects.create(user=empty_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {empty_token.key}')
        res_empty = self.client.get('/api/courses/recommended/')
        self.assertEqual(res_empty.status_code, status.HTTP_200_OK)
        slugs_empty = [c['slug'] for c in res_empty.data]
        self.assertNotIn('secret-course', slugs_empty)
        self.assertNotIn('draft-course', slugs_empty)

        # 3. Logged in with profile target_exam
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        prof = self.user.profile
        prof.target_exam = "GATE"
        prof.save()
        res_pref = self.client.get('/api/courses/recommended/')
        self.assertEqual(res_pref.status_code, status.HTTP_200_OK)
        pref_slugs = [c['slug'] for c in res_pref.data]
        self.assertIn('gate', pref_slugs)
        self.assertNotIn('secret-course', pref_slugs)
        self.assertNotIn('draft-course', pref_slugs)

    def test_preferences_validation_and_student_isolation(self):
        # 1. No token -> 401
        self.client.credentials()
        res_unauth = self.client.get('/api/auth/profile/preferences/')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Invalid preferred_subjects as string -> 400 (not 500)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        res_bad_sub = self.client.patch('/api/auth/profile/preferences/', {
            'preferred_subjects': 'not-a-list-string'
        }, format='json')
        self.assertEqual(res_bad_sub.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Overlength string -> 400 (not 500)
        res_long = self.client.patch('/api/auth/profile/preferences/', {
            'target_paper': 'A' * 150
        }, format='json')
        self.assertEqual(res_long.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Isolation: Student 1 cannot change Student 2
        student2 = User.objects.create_user("student2@sims.com", "student2@sims.com", "Pass12345!")
        p2 = Profile.objects.create(user=student2, role='student')
        p2.target_exam = "ORIGINAL_EXAM"
        p2.save()

        # Student 1 attempts to pass user_id or modify
        res_attack = self.client.patch('/api/auth/profile/preferences/', {
            'user': student2.id,
            'user_id': student2.id,
            'target_exam': "HACKED_EXAM"
        }, format='json')
        self.assertEqual(res_attack.status_code, status.HTTP_200_OK)

        # Student 2 is completely unchanged
        p2.refresh_from_db()
        self.assertEqual(p2.target_exam, "ORIGINAL_EXAM")
        # Student 1 was updated
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.target_exam, "HACKED_EXAM")

    def test_n_plus_one_hierarchy_bounded_queries(self):
        # Add 5 more tracks and 15 subjects
        for t_i in range(2, 7):
            t = CourseTrack.objects.create(
                course=self.course,
                name=f"Track {t_i}",
                code=f"T{t_i}",
                slug=f"track-{t_i}",
                order=t_i
            )
            for s_i in range(1, 4):
                s = Subject.objects.create(
                    course=self.course,
                    track=t,
                    name=f"Subject {t_i}-{s_i}",
                    slug=f"sub-{t_i}-{s_i}",
                    order=s_i
                )
                Module.objects.create(
                    course=self.course,
                    subject=s,
                    title=f"Mod {t_i}-{s_i}",
                    order=1
                )

        # Ensure query count is bounded and constant (under 10 queries, not 180+)
        with self.assertNumQueries(4):
            res = self.client.get('/api/courses/gate/hierarchy/')
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(len(res.data['tracks']), 6)

    def test_educators_cannot_create_or_modify_categories_or_tracks(self):
        educator = User.objects.create_user("educator_test@sims.com", "educator_test@sims.com", "EdPass123!")
        Profile.objects.create(user=educator, role='educator')
        ed_token = Token.objects.create(user=educator)

        # API: Category endpoints have no write methods
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {ed_token.key}')
        res_cat_post = self.client.post('/api/courses/categories/', {'name': 'New Cat'}, format='json')
        self.assertEqual(res_cat_post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        res_cat_patch = self.client.patch('/api/courses/categories/after-msc-btech/', {'name': 'Modified'}, format='json')
        self.assertEqual(res_cat_patch.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # API: Track endpoints have no write methods
        res_track_post = self.client.post('/api/courses/gate/tracks/cs/', {'name': 'New Track'}, format='json')
        self.assertEqual(res_track_post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Admin: Check permissions on admin classes directly
        from courses.admin import CourseCategoryAdmin, CourseTrackAdmin
        from django.contrib.admin.sites import AdminSite
        from django.test import RequestFactory

        site = AdminSite()
        cat_admin = CourseCategoryAdmin(CourseCategory, site)
        track_admin = CourseTrackAdmin(CourseTrack, site)

        rf = RequestFactory()
        req = rf.get('/admin/')
        req.user = educator

        self.assertFalse(cat_admin.has_module_permission(req))
        self.assertFalse(cat_admin.has_add_permission(req))
        self.assertFalse(cat_admin.has_change_permission(req, self.cat))
        self.assertFalse(cat_admin.has_delete_permission(req, self.cat))

        self.assertFalse(track_admin.has_module_permission(req))
        self.assertFalse(track_admin.has_add_permission(req))
        self.assertFalse(track_admin.has_change_permission(req, self.track))
        self.assertFalse(track_admin.has_delete_permission(req, self.track))
