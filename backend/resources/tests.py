from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import StudyResource, UserResourceEntitlement

class StudyResourceTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin_res@sims.com', 'admin_res@sims.com', 'AdminPass123!')
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)

        self.student = User.objects.create_user('student_res@sims.com', 'student_res@sims.com', 'StudentPass123!')
        self.student_token, _ = Token.objects.get_or_create(user=self.student)

        self.public_res = StudyResource.objects.create(
            slug='gate-maths-formula-sheet',
            title='GATE Mathematics Formula Handbook',
            exam='GATE',
            is_paid=False,
            is_published=True
        )

        self.unpub_res = StudyResource.objects.create(
            slug='draft-handbook',
            title='Draft Handbook Under Review',
            exam='GATE',
            is_paid=False,
            is_published=False
        )

    def test_public_can_list_published_resources_only(self):
        url = reverse('resource-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [r['slug'] for r in res.data]
        self.assertIn('gate-maths-formula-sheet', slugs)
        self.assertNotIn('draft-handbook', slugs)

    def test_admin_can_see_all_and_mutate_resources(self):
        url = reverse('resource-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [r['slug'] for r in res.data]
        self.assertIn('draft-handbook', slugs)

        # Admin create
        create_payload = {
            'slug': 'iit-jam-pyq',
            'title': 'IIT-JAM 10-Year Solved Papers',
            'exam': 'IIT-JAM',
            'category': 'post-graduate-entrance',
            'resource_type': 'pyq',
            'file_format': 'PDF',
            'pages': 150,
            'is_paid': False,
            'is_published': True
        }
        res_c = self.client.post(url, create_payload, format='json')
        self.assertEqual(res_c.status_code, status.HTTP_201_CREATED)
        self.assertTrue(StudyResource.objects.filter(slug='iit-jam-pyq').exists())
