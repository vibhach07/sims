from datetime import timedelta
from io import StringIO
from django.contrib.auth.models import User
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from courses.models import Course, Module, Lecture, UserEnrollment, LiveClass
from assessments.models import TestSeries
from resources.models import StudyResource
from users.models import UserProfile, Notification

class LiveClassRun7Tests(APITestCase):
    def setUp(self):
        # Admin
        self.admin = User.objects.create_superuser("admin_live@sims.com", "admin_live@sims.com", "AdminPass123!")
        self.admin_token, _ = Token.objects.get_or_create(user=self.admin)
        UserProfile.objects.create(user=self.admin, role="admin")

        # Educator 1
        self.educator1 = User.objects.create_user("ed1_live@sims.com", "ed1_live@sims.com", "EdPass123!")
        self.ed1_token, _ = Token.objects.get_or_create(user=self.educator1)
        UserProfile.objects.create(user=self.educator1, role="educator")

        # Educator 2
        self.educator2 = User.objects.create_user("ed2_live@sims.com", "ed2_live@sims.com", "EdPass123!")
        self.ed2_token, _ = Token.objects.get_or_create(user=self.educator2)
        UserProfile.objects.create(user=self.educator2, role="educator")

        # Student enrolled
        self.student_enrolled = User.objects.create_user("stud_enrolled@sims.com", "stud_enrolled@sims.com", "StudPass123!")
        self.student_token, _ = Token.objects.get_or_create(user=self.student_enrolled)
        UserProfile.objects.create(user=self.student_enrolled, role="student")

        # Student not enrolled
        self.student_other = User.objects.create_user("stud_other@sims.com", "stud_other@sims.com", "StudPass123!")
        self.other_token, _ = Token.objects.get_or_create(user=self.student_other)
        UserProfile.objects.create(user=self.student_other, role="student")

        # Course & Module owned by educator1
        self.course = Course.objects.create(
            title="GATE Aerospace Live",
            slug="gate-aero-live",
            price=1999.00,
            is_paid=True,
            created_by=self.educator1
        )
        self.module = Module.objects.create(
            course=self.course,
            title="Module 1: Aerodynamics",
            order=1
        )
        UserEnrollment.objects.create(
            user=self.student_enrolled,
            course=self.course,
            is_active=True
        )

        # Course & Module owned by educator2
        self.course2 = Course.objects.create(
            title="GATE Propulsion Live",
            slug="gate-propulsion-live",
            price=1999.00,
            is_paid=True,
            created_by=self.educator2
        )
        self.module2 = Module.objects.create(
            course=self.course2,
            title="Module 1: Rockets",
            order=1
        )

        now = timezone.now()
        self.live_class = LiveClass.objects.create(
            title="Aerodynamics Problem Solving",
            course=self.course,
            module=self.module,
            educator=self.educator1,
            scheduled_start=now + timedelta(hours=1),
            scheduled_end=now + timedelta(hours=2),
            provider="youtube",
            stream_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            access="course_students",
            status="scheduled"
        )

    def test_live_class_crud_permissions(self):
        url = reverse("live-manage-list")

        # Unauthenticated -> 401
        self.client.credentials()
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Student -> 403
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.student_token.key}")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Educator 1 -> 200, sees only own classes
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        res1 = self.client.get(url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res1.data), 1)

        # Educator 2 -> 200, sees 0 classes
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed2_token.key}")
        res2 = self.client.get(url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data), 0)

        # Admin -> sees all
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        res_adm = self.client.get(url)
        self.assertEqual(res_adm.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_adm.data), 1)

    def test_stream_url_parsing_and_validation(self):
        url = reverse("live-manage-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        now = timezone.now()

        # Reject http
        res = self.client.post(url, {
            "title": "Insecure Stream",
            "course": self.course.id,
            "scheduled_start": now + timedelta(hours=1),
            "scheduled_end": now + timedelta(hours=2),
            "provider": "youtube",
            "stream_url": "http://youtube.com/watch?v=dQw4w9WgXcQ"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # YouTube formats valid
        yt_formats = [
            "https://youtu.be/dQw4w9WgXcQ",
            "https://www.youtube.com/live/dQw4w9WgXcQ",
            "https://www.youtube.com/embed/dQw4w9WgXcQ",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s"
        ]
        for idx, yt_url in enumerate(yt_formats):
            res_yt = self.client.post(url, {
                "title": f"YT Test {idx}",
                "course": self.course.id,
                "scheduled_start": now + timedelta(hours=idx + 1),
                "scheduled_end": now + timedelta(hours=idx + 2),
                "provider": "youtube",
                "stream_url": yt_url
            }, format="json")
            self.assertEqual(res_yt.status_code, status.HTTP_201_CREATED)
            self.assertEqual(res_yt.data["embed_url"], "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")

        # Vimeo valid
        res_vim = self.client.post(url, {
            "title": "Vimeo Stream",
            "course": self.course.id,
            "scheduled_start": now + timedelta(hours=6),
            "scheduled_end": now + timedelta(hours=7),
            "provider": "vimeo",
            "stream_url": "https://vimeo.com/123456789"
        }, format="json")
        self.assertEqual(res_vim.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_vim.data["embed_url"], "https://player.vimeo.com/video/123456789")

        # Zoom valid
        res_zoom = self.client.post(url, {
            "title": "Zoom Class",
            "course": self.course.id,
            "scheduled_start": now + timedelta(hours=8),
            "scheduled_end": now + timedelta(hours=9),
            "provider": "zoom",
            "stream_url": "https://us02web.zoom.us/j/123456789"
        }, format="json")
        self.assertEqual(res_zoom.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(res_zoom.data["embed_url"])
        self.assertEqual(res_zoom.data["join_url"], "https://us02web.zoom.us/j/123456789")

    def test_zoom_and_meet_spoofs_rejected(self):
        url = reverse("live-manage-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        now = timezone.now()

        # Zoom spoofs
        for bad_zoom in ["https://zoom.us.evil.com/j/123", "https://notzoom.us/j/123", "https://zoom.us@evil.com/j/123"]:
            res = self.client.post(url, {
                "title": "Spoof Zoom",
                "course": self.course.id,
                "scheduled_start": now + timedelta(hours=1),
                "scheduled_end": now + timedelta(hours=2),
                "provider": "zoom",
                "stream_url": bad_zoom
            }, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Meet spoofs
        for bad_meet in ["https://meet.google.com.evil.com/abc", "https://notmeet.google.com/abc", "https://meet.google.com@evil.com/abc"]:
            res = self.client.post(url, {
                "title": "Spoof Meet",
                "course": self.course.id,
                "scheduled_start": now + timedelta(hours=1),
                "scheduled_end": now + timedelta(hours=2),
                "provider": "meet",
                "stream_url": bad_meet
            }, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_provider_other_returns_no_embed_url(self):
        url = reverse("live-manage-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        now = timezone.now()

        res = self.client.post(url, {
            "title": "Custom CDN Live",
            "course": self.course.id,
            "scheduled_start": now + timedelta(hours=1),
            "scheduled_end": now + timedelta(hours=2),
            "provider": "other",
            "stream_url": "https://streaming.mycdn.com/live/feed1"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(res.data["embed_url"])
        self.assertEqual(res.data["join_url"], "https://streaming.mycdn.com/live/feed1")

    def test_status_transitions_and_authorization(self):
        # 1. Check student authorization before going live
        detail_url = reverse("live-detail", kwargs={"pk": self.live_class.pk})

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.student_token.key}")
        res1 = self.client.get(detail_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(res1.data["is_locked"])
        self.assertIsNone(res1.data["embed_url"])

        # Non-enrolled student: locked
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.other_token.key}")
        res_other = self.client.get(detail_url)
        self.assertEqual(res_other.status_code, status.HTTP_200_OK)
        self.assertTrue(res_other.data["is_locked"])
        self.assertIsNone(res_other.data["embed_url"])

        # 2. Go live
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        go_live_url = reverse("live-go-live", kwargs={"pk": self.live_class.pk})
        res_live = self.client.post(go_live_url)
        self.assertEqual(res_live.status_code, status.HTTP_200_OK)
        self.assertEqual(res_live.data["status"], "live")
        self.assertIsNotNone(res_live.data["started_at"])

        # Now enrolled student can access embed_url
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.student_token.key}")
        res_enrolled_live = self.client.get(detail_url)
        self.assertFalse(res_enrolled_live.data["is_locked"])
        self.assertEqual(res_enrolled_live.data["embed_url"], "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")

        # 3. End live class
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        end_url = reverse("live-end", kwargs={"pk": self.live_class.pk})
        res_end = self.client.post(end_url, {"recording_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}, format="json")
        self.assertEqual(res_end.status_code, status.HTTP_200_OK)
        self.assertEqual(res_end.data["status"], "ended")
        self.assertIsNotNone(res_end.data["ended_at"])

        # Student can now watch recording
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.student_token.key}")
        res_rec = self.client.get(detail_url)
        self.assertFalse(res_rec.data["is_locked"])
        self.assertEqual(res_rec.data["embed_url"], "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")

    def test_patch_cannot_change_status(self):
        manage_detail_url = reverse("live-manage-detail", kwargs={"pk": self.live_class.pk})
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")

        res = self.client.patch(manage_detail_url, {"status": "live"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.live_class.refresh_from_db()
        self.assertEqual(self.live_class.status, "scheduled")

    def test_go_live_status_transitions_and_permissions(self):
        go_live_url = reverse("live-go-live", kwargs={"pk": self.live_class.pk})
        end_url = reverse("live-end", kwargs={"pk": self.live_class.pk})

        # Anonymous gets 401
        self.client.credentials()
        self.assertEqual(self.client.post(go_live_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(end_url).status_code, status.HTTP_401_UNAUTHORIZED)

        # Student gets 403
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.student_token.key}")
        self.assertEqual(self.client.post(go_live_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.post(end_url).status_code, status.HTTP_403_FORBIDDEN)

        # Non-owner educator gets 404
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed2_token.key}")
        self.assertEqual(self.client.post(go_live_url).status_code, status.HTTP_404_NOT_FOUND)

        # Go-live on ended or cancelled returns 409
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        self.live_class.status = "ended"
        self.live_class.save()
        res_ended = self.client.post(go_live_url)
        self.assertEqual(res_ended.status_code, status.HTTP_409_CONFLICT)

        self.live_class.status = "cancelled"
        self.live_class.save()
        res_canc = self.client.post(go_live_url)
        self.assertEqual(res_canc.status_code, status.HTTP_409_CONFLICT)

    def test_cancel_action_and_public_detail_hidden(self):
        self.live_class.status = "scheduled"
        self.live_class.save()

        cancel_url = reverse("live-cancel", kwargs={"pk": self.live_class.pk})
        detail_url = reverse("live-detail", kwargs={"pk": self.live_class.pk})

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        res_cancel = self.client.post(cancel_url)
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cancel.data["status"], "cancelled")

        # Cancelled class returns 404 on public detail for anonymous
        self.client.credentials()
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_404_NOT_FOUND)

        # Returns 404 for non-owner student
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.student_token.key}")
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_404_NOT_FOUND)

        # Owner gets 200
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_200_OK)

        # Admin gets 200
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_200_OK)

    def test_educator_cannot_attach_to_other_educator_course_or_module(self):
        url = reverse("live-manage-list")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed2_token.key}")
        now = timezone.now()

        # ed2 tries to attach to ed1's course
        res = self.client.post(url, {
            "title": "Intruder Class",
            "course": self.course.id,
            "scheduled_start": now + timedelta(hours=1),
            "scheduled_end": now + timedelta(hours=2),
            "provider": "youtube",
            "stream_url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("course", res.data)

        # ed2 tries to attach to ed1's module
        res2 = self.client.post(url, {
            "title": "Intruder Module Class",
            "module": self.module.id,
            "scheduled_start": now + timedelta(hours=1),
            "scheduled_end": now + timedelta(hours=2),
            "provider": "youtube",
            "stream_url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_convert_to_lecture_scenarios_and_permissions(self):
        self.live_class.status = "ended"
        self.live_class.recording_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        self.live_class.save()

        convert_url = reverse("live-convert-to-lecture", kwargs={"pk": self.live_class.pk})

        # ed2 cannot convert into ed1's module (403)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed2_token.key}")
        # ed2 tries on ed1's class -> gets 404
        self.assertEqual(self.client.post(convert_url, {"module_id": self.module.id}).status_code, status.HTTP_404_NOT_FOUND)

        # If ed2 owns a live class but tries to convert into ed1's module -> 400 or 403
        live2 = LiveClass.objects.create(
            title="Ed2 Class",
            course=self.course2,
            educator=self.educator2,
            scheduled_start=timezone.now(),
            scheduled_end=timezone.now() + timedelta(hours=1),
            provider="youtube",
            stream_url="https://youtube.com/watch?v=dQw4w9WgXcQ",
            recording_url="https://youtube.com/watch?v=dQw4w9WgXcQ",
            status="ended"
        )
        convert_url2 = reverse("live-convert-to-lecture", kwargs={"pk": live2.pk})
        res_other_mod = self.client.post(convert_url2, {"module_id": self.module.id})
        # module does not belong to course2 -> 400 (or 403 for ownership)
        self.assertIn(res_other_mod.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])

        # Valid convert by ed1
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")
        res_ok = self.client.post(convert_url, {
            "module_id": self.module.id,
            "title": "Aerodynamics Archive Lecture"
        }, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_201_CREATED)
        lec = Lecture.objects.get(id=res_ok.data["lecture_id"])
        self.assertEqual(lec.title, "Aerodynamics Archive Lecture")
        self.assertTrue(lec.video_url.startswith("https://"))

    def test_recording_url_spoofs_rejected_in_end_and_convert(self):
        end_url = reverse("live-end", kwargs={"pk": self.live_class.pk})
        convert_url = reverse("live-convert-to-lecture", kwargs={"pk": self.live_class.pk})
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")

        # Set status live for end
        self.live_class.status = "live"
        self.live_class.save()

        bad_urls = [
            "javascript:alert(1)",
            "http://youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtube.com.evil.com/rec",
            "https://youtube.com@evil.com/rec"
        ]
        for bad in bad_urls:
            res_end = self.client.post(end_url, {"recording_url": bad}, format="json")
            self.assertEqual(res_end.status_code, status.HTTP_400_BAD_REQUEST)

        # For convert
        self.live_class.status = "ended"
        self.live_class.save()
        for bad in bad_urls:
            res_conv = self.client.post(convert_url, {"module_id": self.module.id, "recording_url": bad}, format="json")
            self.assertEqual(res_conv.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_live_statuses_and_stale_ended(self):
        now = timezone.now()
        # 1. Missed scheduled class
        past_class = LiveClass.objects.create(
            title="Missed Live Class",
            educator=self.educator1,
            scheduled_start=now - timedelta(hours=3),
            scheduled_end=now - timedelta(hours=2),
            status="scheduled",
            stream_url="https://youtube.com/watch?v=dQw4w9WgXcQ"
        )

        # 2. Stale live class (> 3h past scheduled_end)
        stale_live = LiveClass.objects.create(
            title="Stale Live Class",
            educator=self.educator1,
            scheduled_start=now - timedelta(hours=6),
            scheduled_end=now - timedelta(hours=4),
            status="live",
            stream_url="https://youtube.com/watch?v=dQw4w9WgXcQ"
        )

        out = StringIO()
        call_command("update_live_statuses", stdout=out)

        past_class.refresh_from_db()
        stale_live.refresh_from_db()
        self.assertEqual(past_class.status, "ended")
        self.assertEqual(stale_live.status, "ended")

    def test_send_live_reminders_idempotency(self):
        now = timezone.now()
        upcoming_class = LiveClass.objects.create(
            title="Calculus Live",
            course=self.course,
            educator=self.educator1,
            scheduled_start=now + timedelta(minutes=15),
            scheduled_end=now + timedelta(minutes=75),
            status="scheduled",
            stream_url="https://youtube.com/watch?v=dQw4w9WgXcQ",
            reminder_30m_sent=False
        )

        initial_notif_count = Notification.objects.count()
        out = StringIO()
        call_command("send_live_reminders", stdout=out)
        upcoming_class.refresh_from_db()
        self.assertTrue(upcoming_class.reminder_30m_sent)
        self.assertEqual(Notification.objects.count(), initial_notif_count + 1)

        # Run command second time -> should NOT create duplicate notification
        call_command("send_live_reminders", stdout=out)
        self.assertEqual(Notification.objects.count(), initial_notif_count + 1)

    def test_educator_cannot_set_fee_status_published_or_price(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.ed1_token.key}")

        # --- 1. Course ---
        course_url = reverse("course-create")
        valid_course = {
            "title": "Valid Educator Course",
            "slug": "valid-ed-course-1",
            "category": "technical",
            "target_exam": "NEET",
        }
        res_c = self.client.post(course_url, valid_course, format="json")
        self.assertEqual(res_c.status_code, status.HTTP_201_CREATED)
        created_course_id = res_c.data["id"]

        for forbidden, val in [
            ("fee_status", "paid"),
            ("is_published", True),
            ("price", 499.00),
            ("original_price", 999.00),
            ("is_paid", True),
        ]:
            bad_payload = dict(valid_course, slug=f"bad-c-{forbidden}", **{forbidden: val})
            res = self.client.post(course_url, bad_payload, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, f"Course create with {forbidden} should fail")
            self.assertIn(forbidden, res.data)

        update_course_url = reverse("course-update-delete", kwargs={"id": created_course_id})
        for forbidden, val in [
            ("fee_status", "paid"),
            ("is_published", True),
            ("price", 499.00),
            ("original_price", 999.00),
            ("is_paid", True),
        ]:
            res = self.client.patch(update_course_url, {forbidden: val}, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, f"Course patch with {forbidden} should fail")
            self.assertIn(forbidden, res.data)

        # --- 2. TestSeries ---
        test_url = reverse("admin-test-create")
        valid_test = {
            "title": "Valid Educator Test",
            "slug": "valid-ed-test-1",
            "exam": "NEET",
            "category": "mock",
            "durationMinutes": 60,
            "totalMarks": 100,
        }
        res_t = self.client.post(test_url, valid_test, format="json")
        self.assertEqual(res_t.status_code, status.HTTP_201_CREATED)
        created_test_slug = res_t.data["slug"]

        for forbidden, val in [
            ("is_published", True),
            ("price", 199.00),
            ("original_price", 299.00),
            ("is_paid", True),
        ]:
            bad_payload = dict(valid_test, slug=f"bad-t-{forbidden}", **{forbidden: val})
            res = self.client.post(test_url, bad_payload, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, f"Test create with {forbidden} should fail")
            self.assertTrue(forbidden in res.data or (forbidden == "is_published" and "isPublished" in res.data) or (forbidden == "original_price" and "originalPrice" in res.data) or (forbidden == "is_paid" and "isPaid" in res.data))

        test_detail_url = reverse("admin-test-detail", kwargs={"slug": created_test_slug})
        for forbidden, val in [
            ("is_published", True),
            ("price", 199.00),
            ("original_price", 299.00),
            ("is_paid", True),
        ]:
            res = self.client.patch(test_detail_url, {forbidden: val}, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, f"Test patch with {forbidden} should fail")
            self.assertTrue(forbidden in res.data or (forbidden == "is_published" and "isPublished" in res.data) or (forbidden == "original_price" and "originalPrice" in res.data) or (forbidden == "is_paid" and "isPaid" in res.data))

        # --- 3. StudyResource ---
        res_url = reverse("resource-list")
        valid_res = {
            "title": "Valid Educator Resource",
            "slug": "valid-ed-res-1",
            "exam": "NEET",
            "category": "notes",
            "resource_type": "notes",
            "file_format": "pdf",
            "file_url": "https://example.com/valid.pdf",
        }
        res_r = self.client.post(res_url, valid_res, format="json")
        self.assertEqual(res_r.status_code, status.HTTP_201_CREATED)
        created_res_slug = res_r.data["slug"]

        for forbidden, val in [
            ("is_published", True),
            ("price", 99.00),
            ("original_price", 149.00),
            ("is_paid", True),
        ]:
            bad_payload = dict(valid_res, slug=f"bad-r-{forbidden}", **{forbidden: val})
            res = self.client.post(res_url, bad_payload, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, f"Resource create with {forbidden} should fail")
            self.assertIn(forbidden, res.data)

        res_detail_url = reverse("resource-detail", kwargs={"slug": created_res_slug})
        for forbidden, val in [
            ("is_published", True),
            ("price", 99.00),
            ("original_price", 149.00),
            ("is_paid", True),
        ]:
            res = self.client.patch(res_detail_url, {forbidden: val}, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, f"Resource patch with {forbidden} should fail")
            self.assertIn(forbidden, res.data)

        # --- 4. Admin CAN set all these fields ---
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")
        res_admin_c = self.client.post(course_url, dict(
            valid_course,
            slug="admin-course-paid-xyz",
            fee_status="paid",
            price=499.00,
            original_price=999.00,
            is_paid=True,
            is_published=True,
        ), format="json")
        self.assertEqual(res_admin_c.status_code, status.HTTP_201_CREATED)

        res_admin_t = self.client.post(test_url, dict(
            valid_test,
            slug="admin-test-paid-xyz",
            price=199.00,
            originalPrice=299.00,
            isPaid=True,
            isPublished=True,
        ), format="json")
        self.assertEqual(res_admin_t.status_code, status.HTTP_201_CREATED)

        res_admin_r = self.client.post(res_url, dict(
            valid_res,
            slug="admin-res-paid-xyz",
            price=99.00,
            original_price=149.00,
            is_paid=True,
            is_published=True,
        ), format="json")
        self.assertEqual(res_admin_r.status_code, status.HTTP_201_CREATED)

    def test_meet_recording_url_google_drive_and_youtube_handle_reject(self):
        from courses.live_utils import validate_recording_url
        from rest_framework.exceptions import ValidationError

        drive_url = "https://drive.google.com/file/d/1a2b3c4d5e/view"
        docs_url = "https://docs.google.com/document/d/1a2b3c4d5e/edit"
        self.assertEqual(validate_recording_url(drive_url, "meet"), drive_url)
        self.assertEqual(validate_recording_url(docs_url, "meet"), docs_url)

        yt_handle = "https://www.youtube.com/@simsraipur/videos"
        with self.assertRaises(ValidationError) as ctx:
            validate_recording_url(yt_handle, "youtube")
        self.assertIn("channel handles (/@handle) cannot be used", str(ctx.exception))

    def test_live_class_stale_hours_setting_override(self):
        from django.test import override_settings
        from io import StringIO
        from django.core.management import call_command

        now = timezone.now()
        stale_class = LiveClass.objects.create(
            title="Stale Setting Override Class",
            course=self.course,
            educator=self.educator1,
            scheduled_start=now - timezone.timedelta(hours=2),
            scheduled_end=now - timezone.timedelta(hours=1, minutes=30),
            provider="zoom",
            stream_url="https://zoom.us/j/999111222",
            status="live",
            started_at=now - timezone.timedelta(hours=2),
        )

        out = StringIO()
        call_command("update_live_statuses", stdout=out)
        stale_class.refresh_from_db()
        self.assertEqual(stale_class.status, "live")

        with override_settings(LIVE_CLASS_STALE_HOURS=1):
            call_command("update_live_statuses", stdout=out)
            stale_class.refresh_from_db()
            self.assertEqual(stale_class.status, "ended")

    def test_educator_name_never_falls_back_to_username(self):
        from courses.serializers_live import LiveClassPublicSerializer
        from users.models import FacultyProfile

        now = timezone.now()
        # 1. Educator with full name
        self.educator1.first_name = "Priya"
        self.educator1.last_name = "Sharma"
        self.educator1.save()
        lc1 = LiveClass.objects.create(
            title="Name Test 1",
            course=self.course,
            educator=self.educator1,
            scheduled_start=now + timezone.timedelta(hours=1),
            scheduled_end=now + timezone.timedelta(hours=2),
            provider="zoom",
            stream_url="https://zoom.us/j/123456789",
            status="scheduled",
        )
        ser1 = LiveClassPublicSerializer(lc1)
        self.assertEqual(ser1.data["educator_name"], "Priya Sharma")

        # 2. Educator without first/last name, but with FacultyProfile name
        self.educator2.first_name = ""
        self.educator2.last_name = ""
        self.educator2.save()
        FacultyProfile.objects.update_or_create(
            user=self.educator2,
            defaults={"name": "Dr. Rajesh Patel"}
        )
        lc2 = LiveClass.objects.create(
            title="Name Test 2",
            course=self.course,
            educator=self.educator2,
            scheduled_start=now + timezone.timedelta(hours=3),
            scheduled_end=now + timezone.timedelta(hours=4),
            provider="zoom",
            stream_url="https://zoom.us/j/987654321",
            status="scheduled",
        )
        ser2 = LiveClassPublicSerializer(lc2)
        self.assertEqual(ser2.data["educator_name"], "Dr. Rajesh Patel")

        # 3. No first/last name, no FacultyProfile -> SIMS Faculty (never username!)
        FacultyProfile.objects.filter(user=self.educator2).delete()
        self.educator2.refresh_from_db()
        lc2.refresh_from_db()
        ser3 = LiveClassPublicSerializer(lc2)
        self.assertEqual(ser3.data["educator_name"], "SIMS Faculty")
        self.assertNotEqual(ser3.data["educator_name"], self.educator2.username)
