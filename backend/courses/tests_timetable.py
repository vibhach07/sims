import json
from datetime import timedelta
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from users.models import FacultyProfile
from .models import Batch, WeeklyTimetable, DailyChallengeQuestion, DoubtQuery, Course


class WeeklyTimetableAndFeaturesTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create_superuser(username="admin_tt", email="admin_tt@sims.test", password="password123")
        self.student_user = User.objects.create_user(username="student_tt", email="student_tt@sims.test", password="password123")
        self.faculty = FacultyProfile.objects.create(
            name="Dr. Arvind Rathore",
            slug="dr-arvind-rathore",
            role="Senior Academic Director",
            specialization="Chemical Engineering",
            qualification="Ph.D. IIT Delhi",
            experience="15+ Years",
            bio="Renowned educator for GATE Chemical Engineering."
        )
        self.course = Course.objects.create(
            title="GATE Chemical Engineering 2027",
            slug="gate-ch-2027",
            category="after-msc-btech",
            target_exam="GATE CH",
            price=29999.00
        )

    def test_admin_matrix_view_loads(self):
        self.client.force_login(self.admin_user)
        res = self.client.get('/admin/courses/weeklytimetable/matrix/')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "Create / Edit Weekly Timetable Matrix")
        self.assertContains(res, "Dr. Arvind Rathore")

    def test_admin_save_and_load_matrix_api(self):
        self.client.force_login(self.admin_user)
        matrix_payload = {
            'morning': {
                'mon': {'subject': 'Heat Transfer Operations', 'faculty_id': self.faculty.id, 'faculty_name': self.faculty.name},
                'tue': {'subject': 'Heat Transfer Operations', 'faculty_id': self.faculty.id, 'faculty_name': self.faculty.name},
            },
            'afternoon': {
                'mon': {'subject': 'Thermodynamics', 'faculty_id': self.faculty.id, 'faculty_name': self.faculty.name},
            },
            'evening': {
                'mon': {'subject': 'Numerical Problem Drill', 'faculty_id': self.faculty.id, 'faculty_name': self.faculty.name},
            }
        }
        post_data = {
            'branch': 'Chemical Engineering (CH)',
            'start_date': '2026-11-02',
            'week_number': 1,
            'matrix_data': matrix_payload
        }
        res_save = self.client.post(
            '/admin/courses/weeklytimetable/save-matrix/',
            data=json.dumps(post_data),
            content_type='application/json'
        )
        self.assertEqual(res_save.status_code, 200)
        self.assertTrue(res_save.json()['success'])

        # Verify saved in DB
        tt = WeeklyTimetable.objects.get(branch='Chemical Engineering (CH)', start_date='2026-11-02')
        self.assertEqual(tt.week_number, 1)
        self.assertEqual(tt.matrix_data['morning']['mon']['subject'], 'Heat Transfer Operations')

        # Load back via load API
        res_load = self.client.get('/admin/courses/weeklytimetable/load-matrix/?branch=Chemical%20Engineering%20(CH)&start_date=2026-11-02')
        self.assertEqual(res_load.status_code, 200)
        self.assertTrue(res_load.json()['success'])
        self.assertEqual(res_load.json()['matrix_data']['morning']['mon']['subject'], 'Heat Transfer Operations')

    def test_public_student_timetable_endpoint(self):
        WeeklyTimetable.objects.create(
            branch='Chemical Engineering (CH)',
            start_date='2026-11-02',
            end_date='2026-11-07',
            week_number=1,
            is_published=True,
            matrix_data={'morning': {'mon': {'subject': 'Fluid Mechanics'}}}
        )
        res = self.client.get('/api/courses/timetable/?branch=CH')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['weekNumber'], 1)
        self.assertEqual(res.json()['matrixData']['morning']['mon']['subject'], 'Fluid Mechanics')

    def test_batch_api(self):
        Batch.objects.create(
            name="GATE 2027 Morning Batch",
            code="CH-2027-AM",
            branch="Chemical Engineering (CH)",
            course=self.course,
            max_students=60
        )
        res = self.client.get('/api/courses/batches/?branch=Chemical')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]['code'], 'CH-2027-AM')

    def test_daily_challenge_get_and_submit(self):
        q = DailyChallengeQuestion.objects.create(
            title="Prandtl Number Significance",
            branch="Chemical Engineering (CH)",
            subject="Heat Transfer",
            question_text="Prandtl number is the ratio of:",
            option_a="Kinematic viscosity to thermal diffusivity",
            option_b="Thermal diffusivity to kinematic viscosity",
            option_c="Convective to conductive heat transfer",
            option_d="Inertial force to viscous force",
            correct_option="A",
            explanation="Pr = nu / alpha = (mu * Cp) / k.",
            marks=1.0,
            for_date=timezone.localdate()
        )

        # GET challenge
        res_get = self.client.get('/api/courses/daily-challenge/?branch=CH')
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()['title'], 'Prandtl Number Significance')
        self.assertNotIn('correct_option', res_get.json())  # never leak answer

        # POST wrong submission
        res_sub_wrong = self.client.post('/api/courses/daily-challenge/submit/', {
            'question_id': q.id,
            'selected_option': 'B'
        })
        self.assertEqual(res_sub_wrong.status_code, 200)
        self.assertFalse(res_sub_wrong.json()['is_correct'])
        self.assertEqual(res_sub_wrong.json()['marks_awarded'], 0.0)

        # POST correct submission
        res_sub_correct = self.client.post('/api/courses/daily-challenge/submit/', {
            'question_id': q.id,
            'selected_option': 'A'
        })
        self.assertEqual(res_sub_correct.status_code, 200)
        self.assertTrue(res_sub_correct.json()['is_correct'])
        self.assertEqual(res_sub_correct.json()['marks_awarded'], 1.0)
        self.assertIn('Pr = nu / alpha', res_sub_correct.json()['explanation'])

    def test_student_doubt_query_flow(self):
        self.client.force_login(self.student_user)
        # Create doubt
        res_post = self.client.post('/api/courses/doubts/', {
            'course': self.course.id,
            'subject': 'Heat Transfer',
            'query_text': 'Why does boiling heat transfer coefficient spike at critical heat flux?'
        })
        self.assertEqual(res_post.status_code, 201)
        self.assertEqual(res_post.json()['status'], 'pending')

        # List doubts
        res_list = self.client.get('/api/courses/doubts/')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 1)
        self.assertEqual(res_list.json()[0]['subject'], 'Heat Transfer')
