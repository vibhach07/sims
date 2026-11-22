from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from users.models import UserProfile
from .models import SiteSettings, Centre
from .validators import (
    validate_whatsapp_number,
    validate_whatsapp_url,
    validate_maps_url,
    validate_embed_url
)


class SiteConfigValidatorsTest(TestCase):
    def test_whatsapp_number_valid(self):
        validate_whatsapp_number("918959774702")
        validate_whatsapp_number("1234567890")
        validate_whatsapp_number("123456789012345")
        validate_whatsapp_number("")  # empty allowed
        validate_whatsapp_number(None)

    def test_whatsapp_number_invalid(self):
        with self.assertRaises(ValidationError):
            validate_whatsapp_number("+918959774702")  # no + allowed
        with self.assertRaises(ValidationError):
            validate_whatsapp_number("91-89597-74702")  # no hyphens
        with self.assertRaises(ValidationError):
            validate_whatsapp_number("123456789")  # less than 10 digits
        with self.assertRaises(ValidationError):
            validate_whatsapp_number("1234567890123456")  # >15 digits
        with self.assertRaises(ValidationError):
            validate_whatsapp_number("abc1234567890")

    def test_whatsapp_url_valid(self):
        validate_whatsapp_url("https://wa.me/918959774702")
        validate_whatsapp_url("https://chat.whatsapp.com/InviteCode123")
        validate_whatsapp_url("https://whatsapp.com/channel/ChannelId123")
        validate_whatsapp_url("")
        validate_whatsapp_url(None)

    def test_whatsapp_url_invalid(self):
        with self.assertRaises(ValidationError):
            validate_whatsapp_url("http://wa.me/918959774702")
        with self.assertRaises(ValidationError):
            validate_whatsapp_url("https://example.com/whatsapp")
        with self.assertRaises(ValidationError):
            validate_whatsapp_url("javascript:alert(1)")

    def test_maps_url_valid(self):
        validate_maps_url("https://maps.app.goo.gl/ShortLink123")
        validate_maps_url("https://www.google.com/maps/place/SIMS+Raipur")
        validate_maps_url("https://maps.google.com/?q=Raipur")
        validate_maps_url("")
        validate_maps_url(None)

    def test_maps_url_invalid(self):
        with self.assertRaises(ValidationError):
            validate_maps_url("http://maps.google.com/?q=Raipur")
        with self.assertRaises(ValidationError):
            validate_maps_url("https://evil.com/maps")

    def test_embed_url_valid(self):
        validate_embed_url("https://www.google.com/maps/embed?pb=12345")
        validate_embed_url("")
        validate_embed_url(None)

    def test_embed_url_invalid(self):
        with self.assertRaises(ValidationError):
            validate_embed_url("https://maps.google.com/something")
        with self.assertRaises(ValidationError):
            validate_embed_url("http://www.google.com/maps/embed?pb=123")


class CentreModelTest(TestCase):
    def test_single_primary_centre(self):
        c1 = Centre.objects.filter(is_primary=True).first()
        self.assertIsNotNone(c1)

        c2 = Centre.objects.create(
            name="Bilaspur Branch",
            address="Link Road, Bilaspur",
            city="Bilaspur",
            is_primary=True
        )

        c1.refresh_from_db()
        self.assertFalse(c1.is_primary)
        self.assertTrue(c2.is_primary)

    def test_link_builder_cases(self):
        centre_maps = Centre.objects.create(
            name="Test Centre 1",
            address="Road 1, City",
            maps_url="https://maps.app.goo.gl/ABCDEF"
        )
        self.assertEqual(centre_maps.map_link, "https://maps.app.goo.gl/ABCDEF")
        self.assertIn("https://www.google.com/maps/dir/?api=1&destination=", centre_maps.directions_link)

        centre_coords = Centre.objects.create(
            name="Test Centre 2",
            address="Road 2, City",
            latitude=21.2514,
            longitude=81.6296
        )
        self.assertEqual(centre_coords.map_link, "https://www.google.com/maps/search/?api=1&query=21.2514,81.6296")
        self.assertEqual(centre_coords.directions_link, "https://www.google.com/maps/dir/?api=1&destination=21.2514,81.6296")

        centre_addr = Centre.objects.create(
            name="SIMS Raipur – Samta & Chaoubey",
            address="Floor 3, SBI Bldg / Main Rd, Raipur (C.G.) – 492001"
        )
        self.assertTrue(centre_addr.map_link.startswith("https://www.google.com/maps/search/?api=1&query="))
        self.assertIn("SIMS+Raipur", centre_addr.map_link)
        self.assertTrue(centre_addr.directions_link.startswith("https://www.google.com/maps/dir/?api=1&destination="))


class SiteConfigAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(username='admin_usr', email='admin@sims.in', password='pass')
        UserProfile.objects.create(user=self.admin, role='admin')

        self.educator = User.objects.create_user(username='educator_usr', email='educator@sims.in', password='pass')
        UserProfile.objects.create(user=self.educator, role='educator')

        self.student = User.objects.create_user(username='student_usr', email='student@sims.in', password='pass')
        UserProfile.objects.create(user=self.student, role='student')

    def test_public_endpoint_accessible(self):
        res = self.client.get('/api/site/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('settings', res.data)
        self.assertIn('centres', res.data)
        self.assertEqual(res.data['settings']['site_name'], 'SIMS Raipur')
        self.assertIn('ETag', res.headers)
        self.assertIn('max-age=300', res.headers.get('Cache-Control', ''))

    def test_etag_recomputed_on_centre_edit_without_count_change(self):
        # Initial request
        res1 = self.client.get('/api/site/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        etag1 = res1.headers['ETag']

        # Request with matching If-None-Match gives 304
        res_cached = self.client.get('/api/site/', HTTP_IF_NONE_MATCH=etag1)
        self.assertEqual(res_cached.status_code, status.HTTP_304_NOT_MODIFIED)

        # Edit a centre's address without changing the count
        centre = Centre.objects.filter(is_active=True).first()
        self.assertIsNotNone(centre)
        centre.address = "Updated Address for ETag Test 123"
        centre.save()

        # Client sends the OLD etag1 -> must yield 200 with new data, not 304!
        res2 = self.client.get('/api/site/', HTTP_IF_NONE_MATCH=etag1)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertNotEqual(res2.headers['ETag'], etag1)
        self.assertEqual(res2.data['centres'][0]['address'], "Updated Address for ETag Test 123")

    def test_whatsapp_link_percent_20_encoding(self):
        # Configure WhatsApp number
        settings = SiteSettings.get_solo()
        settings.whatsapp_counsellor_number = "918959774702"
        settings.whatsapp_counsellor_message = "Hello SIMS, talk about {course} please."
        settings.floating_whatsapp_enabled = True
        settings.floating_whatsapp_target = "counsellor"
        settings.floating_whatsapp_message = "Hi SIMS, need help."
        settings.save()

        res = self.client.get('/api/site/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        counsellor_url = res.data['counsellor_chat_url']
        floating_url = res.data['floating_target_url']

        # Assert %20 is used, NOT +
        self.assertIn("%20", counsellor_url)
        self.assertNotIn("+", counsellor_url)
        self.assertIn("https://wa.me/918959774702?text=", counsellor_url)

        self.assertIn("%20", floating_url)
        self.assertNotIn("+", floating_url)
        self.assertIn("https://wa.me/918959774702?text=", floating_url)

    def test_admin_settings_permissions(self):
        res = self.client.get('/api/site/admin/settings/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/site/admin/settings/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.educator)
        res = self.client.get('/api/site/admin/settings/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/site/admin/settings/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        update_res = self.client.put('/api/site/admin/settings/', {
            'whatsapp_counsellor_number': '918959774702',
            'whatsapp_group_url': 'https://chat.whatsapp.com/TestGroup123',
            'floating_whatsapp_enabled': True,
            'floating_whatsapp_target': 'counsellor'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['whatsapp_counsellor_number'], '918959774702')

    def test_admin_centres_crud(self):
        self.client.force_authenticate(user=self.admin)

        res = self.client.post('/api/site/admin/centres/', {
            'name': 'Durg Branch',
            'address': 'Station Road, Durg',
            'city': 'Durg',
            'phone': '8959774703',
            'is_primary': False,
            'is_active': True,
            'order': 1
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        centre_id = res.data['id']
        self.assertIn('map_link', res.data)
        self.assertIn('directions_link', res.data)

        res = self.client.get(f'/api/site/admin/centres/{centre_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['city'], 'Durg')

        res = self.client.put(f'/api/site/admin/centres/{centre_id}/', {
            'name': 'Durg Main Center',
            'address': 'Station Road, Durg',
            'city': 'Durg',
            'is_primary': True
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_primary'])

        res = self.client.delete(f'/api/site/admin/centres/{centre_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
