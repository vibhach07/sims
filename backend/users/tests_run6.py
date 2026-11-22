import io
from PIL import Image, ExifTags
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from users.models import FacultyProfile, UserProfile
from courses.models import Course

class FacultyManagementRun6Tests(APITestCase):
    def setUp(self):
        # Admin
        self.admin = User.objects.create_superuser("admin6@sims.com", "admin6@sims.com", "AdminPass123!")
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)
        UserProfile.objects.create(user=self.admin, role="admin")

        # Educator
        self.educator = User.objects.create_user("educator6@sims.com", "educator6@sims.com", "EducatorPass123!")
        self.educator_token, _ = Token.objects.get_or_create(user=self.educator)
        UserProfile.objects.create(user=self.educator, role="educator")

        # Student
        self.student = User.objects.create_user("student6@sims.com", "student6@sims.com", "StudentPass123!")
        self.student_token, _ = Token.objects.get_or_create(user=self.student)
        UserProfile.objects.create(user=self.student, role="student")

        # Courses
        self.course_gate = Course.objects.create(
            title="GATE Physics",
            slug="gate-physics",
            created_by=self.admin
        )

        # Faculty
        self.fac_active = FacultyProfile.objects.create(
            slug="dr-arun",
            name="Dr. Arun Verma",
            role="Head of Physics",
            specialization="Quantum Mechanics",
            qualification="Ph.D. IIT Bombay",
            experience="15+ Years",
            bio="Senior faculty member.",
            image="https://example.com/arun.jpg",
            display_order=1,
            is_active=True
        )

        self.fac_inactive = FacultyProfile.objects.create(
            slug="dr-hidden",
            name="Dr. Hidden Scientist",
            role="Visiting Scholar",
            specialization="Astrophysics",
            qualification="Ph.D. IISc",
            experience="10+ Years",
            bio="Inactive member.",
            image="https://example.com/hidden.jpg",
            display_order=2,
            is_active=False
        )

    def _create_image_file(self, filename="test.jpg", format="JPEG", size=(200, 200), color="blue", with_exif=False):
        img = Image.new("RGB", size, color=color)
        buf = io.BytesIO()
        if with_exif:
            exif = img.getexif()
            exif[ExifTags.Base.Software] = "CameraTest123"
            img.save(buf, format=format, exif=exif)
        else:
            img.save(buf, format=format)
        buf.seek(0)
        content_type = f"image/{format.lower() if format != 'JPEG' else 'jpeg'}"
        return SimpleUploadedFile(filename, buf.read(), content_type=content_type)

    def test_public_faculty_list_hides_inactive_and_linked_user_data(self):
        url = reverse("faculty-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [f["slug"] for f in res.data]
        self.assertIn("dr-arun", slugs)
        self.assertNotIn("dr-hidden", slugs)
        # Check no linked user account in public serializer
        for f in res.data:
            self.assertNotIn("account", f)
            self.assertNotIn("user", f)

    def test_url_scheme_validation(self):
        url = reverse("admin-faculty-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        
        # http:// should be rejected
        res = self.client.post(url, {
            "name": "Prof Scheme",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "image": "http://insecure-url.com/pic.jpg",
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image", res.data)

        # https:// should be accepted
        res2 = self.client.post(url, {
            "name": "Prof Scheme Valid",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "image": "https://secure-url.com/pic.jpg",
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

    def test_reject_both_photo_and_image_url(self):
        url = reverse("admin-faculty-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        img_file = self._create_image_file()
        res = self.client.post(url, {
            "name": "Prof Both",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "image": "https://secure-url.com/pic.jpg",
            "photo": img_file
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_spoofed_file_rejected(self):
        url = reverse("admin-faculty-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        spoofed = SimpleUploadedFile("fake.jpg", b"This is just plain text masquerading as image", content_type="image/jpeg")
        res = self.client.post(url, {
            "name": "Prof Spoof",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "photo": spoofed
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_oversize_rejected(self):
        url = reverse("admin-faculty-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        # > 2MB
        big_content = b"0" * (2 * 1024 * 1024 + 10)
        oversize = SimpleUploadedFile("big.jpg", big_content, content_type="image/jpeg")
        res = self.client.post(url, {
            "name": "Prof Oversize",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "photo": oversize
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_huge_dimensions_rejected(self):
        url = reverse("admin-faculty-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        huge_img = self._create_image_file("huge.jpg", size=(4001, 100))
        res = self.client.post(url, {
            "name": "Prof Huge",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "photo": huge_img
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_upload_resizes_and_strips_exif(self):
        url = reverse("admin-faculty-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        exif_img = self._create_image_file("exif_test.jpg", size=(1200, 1000), with_exif=True)
        res = self.client.post(url, {
            "name": "Prof Exif",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "photo": exif_img
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        fac = FacultyProfile.objects.get(pk=res.data["id"])
        self.assertTrue(bool(fac.photo))
        
        # Open saved image
        saved_img = Image.open(fac.photo.path)
        # Check resized to max 800x800
        self.assertLessEqual(saved_img.width, 800)
        self.assertLessEqual(saved_img.height, 800)
        # Check EXIF stripped
        exif = saved_img.getexif()
        self.assertNotIn(ExifTags.Base.Software, exif)

    def test_replace_removes_old_file_and_deletion_removes_file(self):
        url = reverse("admin-faculty-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        img1 = self._create_image_file("one.png", format="PNG")
        res = self.client.post(url, {
            "name": "Prof Replace",
            "role": "Lecturer",
            "specialization": "Math",
            "qualification": "M.Sc",
            "experience": "5 Years",
            "bio": "Bio",
            "photo": img1
        }, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        fac = FacultyProfile.objects.get(pk=res.data["id"])
        old_path = fac.photo.path
        storage = fac.photo.storage
        self.assertTrue(storage.exists(fac.photo.name))

        # Replace with new photo
        detail_url = reverse("admin-faculty-detail", kwargs={"pk": fac.pk})
        img2 = self._create_image_file("two.png", format="PNG")
        res_up = self.client.patch(detail_url, {"photo": img2}, format="multipart")
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        fac.refresh_from_db()
        self.assertFalse(storage.exists(old_path))
        self.assertTrue(storage.exists(fac.photo.name))

        # Delete faculty removes file
        current_name = fac.photo.name
        res_del = self.client.delete(detail_url)
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(storage.exists(current_name))

    def test_grant_and_revoke_educator_access(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        grant_url = reverse("admin-faculty-grant-educator", kwargs={"pk": self.fac_active.pk})
        revoke_url = reverse("admin-faculty-revoke-educator", kwargs={"pk": self.fac_active.pk})

        # Grant to existing user
        res = self.client.post(grant_url, {"email": "student6@sims.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.profile.role, "educator")
        self.fac_active.refresh_from_db()
        self.assertEqual(self.fac_active.user, self.student)
        self.assertEqual(res.data["faculty"]["account"]["role"], "educator")

        # Try linking same user to another faculty -> rejected
        grant_other = reverse("admin-faculty-grant-educator", kwargs={"pk": self.fac_inactive.pk})
        res_conflict = self.client.post(grant_other, {"email": "student6@sims.com"}, format="json")
        self.assertEqual(res_conflict.status_code, status.HTTP_400_BAD_REQUEST)

        # Revoke educator
        res_rev = self.client.post(revoke_url)
        self.assertEqual(res_rev.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertEqual(self.student.profile.role, "student")
        self.fac_active.refresh_from_db()
        self.assertIsNone(self.fac_active.user)

    def test_educator_my_profile_permissions_matrix(self):
        url = reverse("educator-profile")
        
        # Student forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.student_token.key}")
        res_stud = self.client.get(url)
        self.assertEqual(res_stud.status_code, status.HTTP_403_FORBIDDEN)

        # Educator allowed
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.educator_token.key}")
        res_ed = self.client.get(url)
        self.assertEqual(res_ed.status_code, status.HTTP_200_OK)

        # Educator can update bio, qualification, experience, specialization
        res_up = self.client.patch(url, {
            "bio": "Updated educator bio by self.",
            "qualification": "Ph.D. Harvard",
            "experience": "20+ Years",
            "specialization": "Quantum Topology",
            "is_active": True,  # should be ignored
            "slug": "hacked-slug"  # should be ignored
        }, format="json")
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        self.assertEqual(res_up.data["bio"], "Updated educator bio by self.")
        self.assertEqual(res_up.data["qualification"], "Ph.D. Harvard")

        # Verify is_active and slug did not get changed
        fac = FacultyProfile.objects.filter(user=self.educator).first()
        self.assertFalse(fac.is_active)
        self.assertNotEqual(fac.slug, "hacked-slug")
