from django.shortcuts import get_object_or_404
from django.db import models
from django.conf import settings
import requests
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Avg

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .serializers import (
    AdminFacultyProfileSerializer,
    EducatorFacultyProfileSerializer,

    UserSerializer, RegisterSerializer, FacultyProfileSerializer,
    EnquirySerializer, EnquiryAdminSerializer, EducatorApplicationSerializer, EducatorApplicationPublicSerializer
)
from .models import UserProfile, FacultyProfile, Enquiry, EducatorApplication, PasswordResetToken
from .permissions import IsAdminUser, IsStaffOrEducator, IsEducator
from courses.models import Course, Module, Lecture, UserEnrollment, UserLectureProgress
from assessments.models import TestSeries, TestQuestion, UserTestAttempt
from resources.models import StudyResource
from orders.models import Order

def set_auth_cookie(response, token_key: str):
    """Sets a secure HttpOnly cookie containing the authentication token."""
    max_age = 30 * 24 * 60 * 60  # 30 days
    response.set_cookie(
        key='auth_token',
        value=token_key,
        max_age=max_age,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
        path='/'
    )
    return response


def clear_auth_cookie(response):
    """Clears the HttpOnly authentication cookie."""
    response.delete_cookie(
        key='auth_token',
        path='/'
    )
    return response


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            email_sent = False
            email_error = None
            try:
                token_obj = EmailVerificationToken.create_for_user(user)
                send_verification_email(user, token_obj)
                email_sent = True
            except Exception as e:
                email_error = str(e)

            resp_data = {
                'token': token.key,
                'user': UserSerializer(user).data,
                'email_sent': email_sent,
                'message': 'Registration successful. A verification link has been sent to your email.' if email_sent else 'Account created, but verification email could not be delivered. Please use resend verification.'
            }
            if email_error:
                resp_data['email_error'] = email_error
            resp = Response(resp_data, status=status.HTTP_201_CREATED)
            return set_auth_cookie(resp, token.key)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        email = (request.data.get('email') or request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        portal = request.data.get('portal', 'student')

        if not email or not password:
            return Response({'error': 'Email/username and password required.'}, status=status.HTTP_400_BAD_REQUEST)

        found_user = User.objects.filter(models.Q(username__iexact=email) | models.Q(email__iexact=email)).first()
        if not found_user or not found_user.check_password(password):
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not found_user.is_active:
            return Response(
                {'error': 'Your account has been suspended. Please contact support.', 'code': 'suspended'},
                status=status.HTTP_403_FORBIDDEN
            )

        profile = getattr(found_user, 'profile', None)
        if not profile:
            from .models import UserProfile, Role
            default_role = Role.ADMIN if (found_user.is_staff or found_user.is_superuser) else (Role.EDUCATOR if portal == 'educator' else Role.STUDENT)
            profile, _ = UserProfile.objects.get_or_create(user=found_user, defaults={'role': default_role})

        role = profile.role if profile else 'student'
        is_staff = found_user.is_staff or found_user.is_superuser

        if portal == 'educator':
            if not (is_staff or role in ['educator', 'admin', 'superadmin']):
                return Response(
                    {'error': 'This account is not registered as an educator.', 'code': 'not_educator'},
                    status=status.HTTP_403_FORBIDDEN
                )

        is_new_user = False
        token, _ = Token.objects.get_or_create(user=found_user)
        user_data = UserSerializer(found_user).data
        user_data['role'] = role
        user_data['is_staff'] = is_staff
        user_data['is_new_user'] = is_new_user
        user_data['profile_complete'] = bool(profile.target_exam and profile.phone)

        resp = Response({
            'token': token.key,
            'user': user_data
        })
        return set_auth_cookie(resp, token.key)


class GoogleAuthConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'client_id': getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '') or ''
        })


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        credential = (
            request.data.get('credential')
            or request.data.get('token')
            or request.data.get('id_token')
            or ''
        ).strip()
        portal = request.data.get('portal', 'student')

        if not credential:
            return Response(
                {'error': 'Google credential token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        google_data = None
        # Attempt 1: verify as ID Token via Google tokeninfo
        try:
            resp = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': credential},
                timeout=10
            )
            if resp.status_code == 200:
                google_data = resp.json()
        except Exception:
            pass

        # Attempt 2: verify as access token via userinfo
        if not google_data:
            try:
                resp = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {credential}'},
                    timeout=10
                )
                if resp.status_code == 200:
                    google_data = resp.json()
            except Exception:
                pass

        if not google_data or not google_data.get('email'):
            return Response(
                {'error': 'Invalid or expired Google authentication credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        configured_client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
        if configured_client_id and 'aud' in google_data:
            if google_data['aud'] != configured_client_id:
                return Response(
                    {'error': 'Token was not issued for this application client.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        email = google_data.get('email', '').strip().lower()
        name = google_data.get('name', '').strip()
        given_name = google_data.get('given_name', '').strip()
        family_name = google_data.get('family_name', '').strip()
        picture = google_data.get('picture', '').strip()

        found_user = User.objects.filter(
            models.Q(username__iexact=email) | models.Q(email__iexact=email)
        ).first()

        is_new_user = False
        if not found_user:
            if portal == 'educator':
                return Response(
                    {
                        'error': 'No educator account found with this Google email. Please register or apply first.',
                        'code': 'not_educator'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            is_new_user = True
            # Create student user
            first = given_name or (name.split()[0] if name else 'Student')
            last = family_name or (' '.join(name.split()[1:]) if len(name.split()) > 1 else '')
            found_user = User.objects.create(
                username=email,
                email=email,
                first_name=first,
                last_name=last,
            )
            found_user.set_unusable_password()
            found_user.save()

        if not found_user.is_active:
            return Response(
                {'error': 'Your account has been suspended. Please contact support.', 'code': 'suspended'},
                status=status.HTTP_403_FORBIDDEN
            )

        from .models import UserProfile, Role
        profile, _ = UserProfile.objects.get_or_create(
            user=found_user,
            defaults={
                'role': Role.ADMIN if (found_user.is_staff or found_user.is_superuser) else (Role.EDUCATOR if portal == 'educator' else Role.STUDENT),
                'is_email_verified': True,
            }
        )

        update_fields = []
        if not profile.is_email_verified:
            profile.is_email_verified = True
            update_fields.append('is_email_verified')
        if picture and not profile.avatar:
            profile.avatar = picture
            update_fields.append('avatar')
        if update_fields:
            profile.save(update_fields=update_fields)

        role = profile.role if profile else 'student'
        is_staff = found_user.is_staff or found_user.is_superuser

        if portal == 'educator':
            if not (is_staff or role in ['educator', 'admin', 'superadmin']):
                return Response(
                    {'error': 'This Google account is not registered as an educator.', 'code': 'not_educator'},
                    status=status.HTTP_403_FORBIDDEN
                )

        token, _ = Token.objects.get_or_create(user=found_user)
        user_data = UserSerializer(found_user).data
        user_data['role'] = role
        user_data['is_staff'] = is_staff
        user_data['is_new_user'] = is_new_user
        user_data['profile_complete'] = bool(profile.target_exam and profile.phone)

        resp = Response({
            'token': token.key,
            'user': user_data
        })
        return set_auth_cookie(resp, token.key)

class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if request.user and request.user.is_authenticated:
            Token.objects.filter(user=request.user).delete()
        resp = Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        return clear_auth_cookie(resp)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        phone = request.data.get('phone')
        target_exam = request.data.get('target_exam')
        avatar = request.data.get('avatar')
        avatar_file = request.FILES.get('avatar_file') or request.FILES.get('avatar')
        name = request.data.get('name')

        if name is not None:
            parts = str(name).strip().split(' ', 1)
            request.user.first_name = parts[0]
            request.user.last_name = parts[1] if len(parts) > 1 else ''
            request.user.save()

        if phone is not None:
            profile.phone = phone
        if target_exam is not None:
            profile.target_exam = target_exam

        if avatar_file:
            import os, uuid
            from django.core.files.storage import default_storage
            ext = os.path.splitext(avatar_file.name)[1].lower() or '.png'
            filename = f"avatars/user_{request.user.id}_{uuid.uuid4().hex[:8]}{ext}"
            saved_path = default_storage.save(filename, avatar_file)
            profile.avatar = request.build_absolute_uri(default_storage.url(saved_path))
        elif avatar is not None:
            if isinstance(avatar, str) and avatar.startswith('data:image'):
                import os, uuid, base64
                from django.core.files.storage import default_storage
                from django.core.files.base import ContentFile
                try:
                    format_part, imgstr = avatar.split(';base64,')
                    ext = format_part.split('/')[-1] or 'png'
                    data = base64.b64decode(imgstr)
                    filename = f"avatars/user_{request.user.id}_{uuid.uuid4().hex[:8]}.{ext}"
                    saved_path = default_storage.save(filename, ContentFile(data))
                    profile.avatar = request.build_absolute_uri(default_storage.url(saved_path))
                except Exception:
                    profile.avatar = avatar
            else:
                profile.avatar = avatar

        profile.save()
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        return self.put(request)

class FacultyListView(generics.ListCreateAPIView):
    serializer_class = FacultyProfileSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        # Admins can see all faculty (including inactive); public sees only active
        user = self.request.user
        if user.is_authenticated and (user.is_staff or getattr(user, 'profile', None) and user.profile.role in ['admin', 'superadmin']):
            return FacultyProfile.objects.all().order_by('id')
        return FacultyProfile.objects.filter(is_active=True).order_by('id')

class FacultyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FacultyProfile.objects.all()
    serializer_class = FacultyProfileSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAdminUser()]
        return [permissions.AllowAny()]

class PublicEnquiryCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_burst'
    serializer_class = EnquirySerializer
    queryset = Enquiry.objects.all()

class AdminEnquiryListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = EnquiryAdminSerializer
    queryset = Enquiry.objects.all()

class AdminEnquiryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = EnquiryAdminSerializer
    queryset = Enquiry.objects.all()

class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from courses.models import Subject
        from django.db.models import Sum

        total_courses = Course.objects.filter(is_published=True).count()
        total_subjects = Subject.objects.filter(is_active=True).count()
        total_faculty = FacultyProfile.objects.filter(is_active=True).count()
        total_tests = TestSeries.objects.filter(is_published=True).count()
        total_resources = StudyResource.objects.filter(is_published=True).count()
        total_enquiries = Enquiry.objects.count()
        open_enquiries = Enquiry.objects.filter(status='new').count()
        total_students = UserProfile.objects.filter(role='student').count()
        total_enrollments = UserEnrollment.objects.filter(is_active=True).count()
        total_test_attempts = UserTestAttempt.objects.count()
        
        # Financial / Order stats
        paid_orders = Order.objects.filter(status='paid')
        total_paid_orders = paid_orders.count()
        total_verified_revenue = float(paid_orders.aggregate(Sum('amount'))['amount__sum'] or 0.0)
        pending_orders = Order.objects.filter(status='pending').count()
        failed_orders = Order.objects.filter(status='failed').count()
        pending_approvals = (
            Course.objects.filter(review_status='pending').count() +
            TestSeries.objects.filter(review_status='pending').count() +
            StudyResource.objects.filter(review_status='pending').count()
        )
        new_applications = EducatorApplication.objects.filter(status='pending').count()
        active_educators = User.objects.filter(profile__role='educator', is_active=True).count()

        return Response({
            'pendingApprovals': pending_approvals,
            'newApplications': new_applications,
            'activeEducators': active_educators,
            'totalCourses': total_courses,
            'totalSubjects': total_subjects,
            'totalFaculty': total_faculty,
            'totalTests': total_tests,
            'totalResources': total_resources,
            'totalEnquiries': total_enquiries,
            'openEnquiries': open_enquiries,
            'totalStudents': total_students,
            'totalEnrollments': total_enrollments,
            'totalTestAttempts': total_test_attempts,
            'totalPaidOrders': total_paid_orders,
            'totalVerifiedRevenue': total_verified_revenue,
            'pendingOrders': pending_orders,
            'failedOrders': failed_orders,
        })

class StudentProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollments = UserEnrollment.objects.filter(user=user, is_active=True).select_related('course')
        
        enrolled_courses = []
        for e in enrollments:
            total_lectures = Lecture.objects.filter(module__course=e.course).count()
            completed_lectures = UserLectureProgress.objects.filter(
                user=user,
                lecture__module__course=e.course,
                is_completed=True
            ).count()
            pct = round((completed_lectures / total_lectures * 100), 1) if total_lectures > 0 else 0

            enrolled_courses.append({
                'id': e.course.id,
                'slug': e.course.slug,
                'title': e.course.title,
                'category_label': e.course.category_label,
                'format': e.course.format,
                'lectureCount': total_lectures,
                'completedCount': completed_lectures,
                'progressPercentage': pct,
                'enrolledAt': e.enrolled_at,
            })

        attempts = UserTestAttempt.objects.filter(user=user).select_related('test_series').order_by('-completed_at')
        tests_data = []
        for a in attempts:
            tests_data.append({
                'id': a.id,
                'testId': a.test_series.id,
                'testSlug': a.test_series.slug,
                'testTitle': a.test_series.title,
                'score': a.score,
                'totalMarks': a.total_marks,
                'correctCount': a.correct_count,
                'wrongCount': a.wrong_count,
                'unattemptedCount': a.unattempted_count,
                'completedAt': a.completed_at,
            })

        avg_score = attempts.aggregate(Avg('score'))['score__avg'] or 0.0

        return Response({
            'student': {
                'id': user.id,
                'username': user.username,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
                'targetExam': getattr(user, 'profile', None).target_exam if hasattr(user, 'profile') else '',
            },
            'enrolledCourses': enrolled_courses,
            'testsAttempted': tests_data,
            'summary': {
                'totalCoursesEnrolled': len(enrolled_courses),
                'totalTestsAttempted': len(tests_data),
                'averageMockScore': round(avg_score, 1),
            }
        })

class EducatorStudentProgressListView(APIView):
    permission_classes = [IsStaffOrEducator]

    def get(self, request):
        user = request.user
        is_admin = user.is_staff or user.is_superuser
        if not is_admin:
            profile = getattr(user, 'profile', None)
            is_admin = profile and profile.role in ['admin', 'superadmin']

        if is_admin:
            students = User.objects.filter(profile__role='student')
        else:
            course_student_ids = UserEnrollment.objects.filter(
                course__created_by=user, is_active=True
            ).values_list('user_id', flat=True)

            test_student_ids = UserTestAttempt.objects.filter(
                test_series__created_by=user
            ).values_list('user_id', flat=True)

            combined_ids = set(course_student_ids) | set(test_student_ids)
            students = User.objects.filter(id__in=combined_ids, profile__role='student')

        students = students.prefetch_related('enrollments__course', 'test_attempts').distinct()

        result = []
        for s in students:
            attempts = s.test_attempts.all()
            if not is_admin:
                attempts = attempts.filter(test_series__created_by=user)

            avg_score = attempts.aggregate(Avg('score'))['score__avg'] or 0.0
            
            if is_admin:
                primary_enrollment = s.enrollments.filter(is_active=True).first()
            else:
                primary_enrollment = s.enrollments.filter(course__created_by=user, is_active=True).first()

            primary_course_title = primary_enrollment.course.title if primary_enrollment else (s.profile.target_exam or 'Aspirant')
            latest_attempt = attempts.order_by('-completed_at').first()
            last_active = latest_attempt.completed_at.strftime('%Y-%m-%d %H:%M') if latest_attempt else (s.last_login.strftime('%Y-%m-%d %H:%M') if s.last_login else 'Registered')

            item = {
                'id': f"S{s.id:04d}",
                'userId': s.id,
                'name': f"{s.first_name} {s.last_name}".strip() or s.username,
                'email': s.email,
                'course': primary_course_title,
                'avgScore': round(avg_score, 1),
                'attemptsCount': attempts.count(),
                'lastActive': last_active,
                'status': 'Active' if s.is_active else 'Inactive',
            }
            result.append(item)

        return Response(result)

from django.core.mail import send_mail
from django.conf import settings
from .models import EmailVerificationToken, PasswordResetToken

def send_verification_email(user, token_obj):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    verify_url = f"{frontend_url}/verify-email?token={token_obj.token}"
    subject = "Verify your email - SIMS Raipur"
    message = f"""Hello {user.first_name or user.username},

Thank you for registering at SIMS Raipur. Please verify your email by clicking the link below:

{verify_url}

This link is valid for 24 hours. If you did not register, please ignore this email.

Best regards,
SIMS Raipur Team
"""
    send_mail(
        subject,
        message,
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'SIMS Raipur <no-reply@simsraipuredu.in>'),
        [user.email],
        fail_silently=False
    )

def send_password_reset_email(user, token_obj):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url}/reset-password?token={token_obj.token}"
    subject = "Password Reset Request - SIMS Raipur"
    message = f"""Hello {user.first_name or user.username},

We received a request to reset your SIMS Raipur password. Please click the link below to set a new password:

{reset_url}

This link is single-use and will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.

Best regards,
SIMS Raipur Team
"""
    send_mail(
        subject,
        message,
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'SIMS Raipur <no-reply@simsraipuredu.in>'),
        [user.email],
        fail_silently=False
    )

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token')
        if not token_str:
            return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            token_obj = EmailVerificationToken.objects.select_related('user__profile').get(token=token_str)
        except EmailVerificationToken.DoesNotExist:
            return Response({'error': 'Invalid verification token.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if token_obj.is_used:
            return Response({'error': 'This verification token has already been used.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not token_obj.is_valid():
            return Response({'error': 'Verification token has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = token_obj.user
        token_obj.is_used = True
        token_obj.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.is_email_verified = True
        profile.save()

        # Reload user to ensure profile relation reflects updated state
        user.refresh_from_db()

        auth_token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'message': 'Email successfully verified.',
            'token': auth_token.key,
            'user': UserSerializer(user).data
        })

class ResendVerificationEmailView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_burst'

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            profile = getattr(user, 'profile', None)
            if profile and profile.is_email_verified:
                return Response({'message': 'Email is already verified.'})
            
            token_obj = EmailVerificationToken.create_for_user(user)
            send_verification_email(user, token_obj)
        except User.DoesNotExist:
            pass # Non-enumerating response
        
        return Response({'message': 'If an account exists with this email, a verification link has been sent.'})

class RequestPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_burst'

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            token_obj = PasswordResetToken.create_for_user(user)
            send_password_reset_email(user, token_obj)
        except User.DoesNotExist:
            pass # Non-enumerating response
        
        return Response({'message': 'If an account exists with this email, a password reset link has been sent.'})

class ConfirmPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token')
        new_password = request.data.get('new_password')

        if not token_str or not new_password:
            return Response({'error': 'Token and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            validate_password(new_password)
        except DjangoValidationError as err:
            return Response({'error': list(err.messages)}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            token_obj = PasswordResetToken.objects.select_related('user').get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid reset token.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if token_obj.is_used:
            return Response({'error': 'This reset token has already been used.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not token_obj.is_valid():
            return Response({'error': 'Reset token has expired.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = token_obj.user
        user.set_password(new_password)
        user.save()

        token_obj.is_used = True
        token_obj.save()

        # Invalidate previous auth tokens on password reset for security
        Token.objects.filter(user=user).delete()
        new_auth_token = Token.objects.create(user=user)

        return Response({
            'message': 'Password has been reset successfully. You may now log in.',
            'token': new_auth_token.key,
            'user': UserSerializer(user).data
        })

from django.utils import timezone
from django.utils.text import slugify


class EducatorApplyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'educator_apply'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if EducatorApplication.objects.filter(email__iexact=email, status='pending').exists():
            return Response(
                {'error': 'A pending educator application with this email address already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EducatorApplicationPublicSerializer(data=request.data)
        if serializer.is_valid():
            app = serializer.save(email=email)
            return Response(
                EducatorApplicationSerializer(app).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminEducatorApplicationListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = EducatorApplicationSerializer

    def get_queryset(self):
        qs = EducatorApplication.objects.all()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class AdminEducatorApplicationApproveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        app = generics.get_object_or_404(EducatorApplication, pk=pk)
        if app.status != 'pending':
            return Response({'error': f'Application has already been {app.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=app.email).first()
        if not user:
            base_username = slugify(app.name).replace('-', '')[:20] or 'educator'
            candidate = base_username
            counter = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create(
                username=candidate,
                email=app.email.lower(),
                first_name=app.name.split()[0] if app.name else 'Educator',
                last_name=' '.join(app.name.split()[1:]) if len(app.name.split()) > 1 else '',
            )
            user.set_unusable_password()
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = 'educator'
        if app.phone:
            profile.phone = app.phone
        profile.save()

        if not hasattr(user, 'faculty_profile'):
            fac_slug = slugify(app.name) or f"faculty-{user.id}"
            cand_slug = fac_slug
            idx = 1
            while FacultyProfile.objects.filter(slug=cand_slug).exists():
                cand_slug = f"{fac_slug}-{idx}"
                idx += 1

            FacultyProfile.objects.create(
                user=user,
                name=app.name,
                slug=cand_slug,
                role='Educator',
                specialization=app.subjects,
                qualification=app.qualification,
                experience=app.experience,
                bio=app.bio,
                image='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                is_active=False,
            )

        app.status = 'approved'
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.created_user = user
        app.save()

        log_action(
            actor=request.user,
            action='approve_application',
            object_type='educator_application',
            object_id=app.id,
            object_title=app.name,
            owner=user,
            changes={'status': ['pending', 'approved']}
        )
        Notification.objects.create(
            user=user,
            title='Educator Application Approved',
            body='Congratulations! Your application to teach at SIMS Raipur has been approved.'
        )

        try:
            token_obj = PasswordResetToken.create_for_user(user)
            send_password_reset_email(user, token_obj)
        except Exception:
            pass

        return Response(EducatorApplicationSerializer(app).data)


class AdminEducatorApplicationRejectView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        app = generics.get_object_or_404(EducatorApplication, pk=pk)
        if app.status != 'pending':
            return Response({'error': f'Application has already been {app.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        note = request.data.get('admin_note', '').strip()
        if not note:
            return Response({'error': 'Rejection note is required.'}, status=status.HTTP_400_BAD_REQUEST)

        app.status = 'rejected'
        app.admin_note = note
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.save()

        log_action(
            actor=request.user,
            action='reject_application',
            object_type='educator_application',
            object_id=app.id,
            object_title=app.name,
            owner=app.created_user,
            changes={'status': ['pending', 'rejected'], 'note': ['', note]}
        )
        return Response(EducatorApplicationSerializer(app).data)


class AdminEducatorListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        educators = User.objects.filter(profile__role='educator').select_related('profile')
        result = []
        for ed in educators:
            courses_count = Course.objects.filter(created_by=ed).count()
            tests_count = TestSeries.objects.filter(created_by=ed).count()
            resources_count = StudyResource.objects.filter(created_by=ed).count()
            courses_pending = Course.objects.filter(created_by=ed, review_status='pending').count()
            tests_pending = TestSeries.objects.filter(created_by=ed, review_status='pending').count()
            resources_pending = StudyResource.objects.filter(created_by=ed, review_status='pending').count()
            pending_count = courses_pending + tests_pending + resources_pending

            course_student_ids = set(UserEnrollment.objects.filter(course__created_by=ed, is_active=True).values_list('user_id', flat=True))
            test_student_ids = set(UserTestAttempt.objects.filter(test_series__created_by=ed).values_list('user_id', flat=True))
            total_students_count = len(course_student_ids | test_student_ids)

            result.append({
                'id': ed.id,
                'name': f"{ed.first_name} {ed.last_name}".strip() or ed.username,
                'email': ed.email,
                'role': ed.profile.role,
                'is_active': ed.is_active,
                'last_login': ed.last_login.strftime('%Y-%m-%d %H:%M') if ed.last_login else None,
                'courses_count': courses_count,
                'tests_count': tests_count,
                'resources_count': resources_count,
                'pending_count': pending_count,
                'students_count': total_students_count,
                'counts': {
                    'courses': courses_count,
                    'tests': tests_count,
                    'resources': resources_count,
                    'pending_items': pending_count,
                    'students': total_students_count,
                }
            })
        return Response(result)

    def post(self, request):
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip().lower()
        if not email or not name:
            return Response({'error': 'Name and email are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            base_username = slugify(name).replace('-', '')[:20] or 'educator'
            candidate = base_username
            counter = 1
            while User.objects.filter(username=candidate).exists():
                candidate = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create(
                username=candidate,
                email=email,
                first_name=name.split()[0] if name else 'Educator',
                last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
            )
            user.set_unusable_password()
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = 'educator'
        profile.save()

        try:
            token_obj = PasswordResetToken.create_for_user(user)
            send_password_reset_email(user, token_obj)
        except Exception:
            pass

        return Response({
            'id': user.id,
            'name': f"{user.first_name} {user.last_name}".strip(),
            'email': user.email,
            'role': profile.role,
            'is_active': user.is_active,
        }, status=status.HTTP_201_CREATED)


class AdminEducatorActionView(APIView):
    permission_classes = [IsAdminUser]

    def _check_admin_guards(self, request, target_user):
        if target_user.id == request.user.id:
            return Response({'error': 'You cannot perform this action on yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        
        target_role = getattr(target_user, 'profile', None) and target_user.profile.role
        if target_user.is_superuser or target_user.is_staff or target_role in ['admin', 'superadmin']:
            admin_count = User.objects.filter(
                models.Q(is_superuser=True) | models.Q(is_staff=True) | models.Q(profile__role__in=['admin', 'superadmin'])
            ).distinct().count()
            if admin_count <= 1:
                return Response({'error': 'Cannot suspend or remove the last remaining administrator.'}, status=status.HTTP_400_BAD_REQUEST)
        return None

    def post(self, request, pk, action):
        target_user = generics.get_object_or_404(User, pk=pk)

        if action == 'suspend':
            guard_err = self._check_admin_guards(request, target_user)
            if guard_err:
                return guard_err
            target_user.is_active = False
            target_user.save()
            log_action(actor=request.user, action='suspend', object_type='user', object_id=target_user.id, object_title=target_user.email, owner=target_user)
            Notification.objects.create(user=target_user, title='Account Suspended', body='Your educator account has been suspended by an administrator.')
            return Response({'message': f'User {target_user.email} suspended.'})

        elif action == 'reactivate':
            target_user.is_active = True
            target_user.save()
            log_action(actor=request.user, action='reactivate', object_type='user', object_id=target_user.id, object_title=target_user.email, owner=target_user)
            Notification.objects.create(user=target_user, title='Account Reactivated', body='Your educator account has been reactivated.')
            return Response({'message': f'User {target_user.email} reactivated.'})

        elif action == 'remove':
            guard_err = self._check_admin_guards(request, target_user)
            if guard_err:
                return guard_err
            profile, _ = UserProfile.objects.get_or_create(user=target_user)
            profile.role = 'student'
            profile.save()
            log_action(actor=request.user, action='demote', object_type='user', object_id=target_user.id, object_title=target_user.email, owner=target_user)
            Notification.objects.create(user=target_user, title='Role Changed', body='Your role has been changed to student.')
            return Response({'message': f'User {target_user.email} demoted to student role.'})

        elif action == 'send-invite':
            try:
                token_obj = PasswordResetToken.create_for_user(target_user)
                send_password_reset_email(target_user, token_obj)
                return Response({'message': f'Invite email dispatched to {target_user.email}.'})
            except Exception as e:
                return Response({'error': f'Failed to send email: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.pagination import PageNumberPagination
from .models import AuditLog, Notification, log_action
from .serializers import AuditLogSerializer, NotificationSerializer
from courses.models import Course
from assessments.models import TestSeries
from resources.models import StudyResource



class AdminEducatorDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        ed = generics.get_object_or_404(User, pk=pk)
        faculty = getattr(ed, 'faculty_profile', None)

        courses = Course.objects.filter(created_by=ed).order_by('-created_at')
        tests = TestSeries.objects.filter(created_by=ed).order_by('-created_at')
        resources = StudyResource.objects.filter(created_by=ed).order_by('-created_at')

        courses_data = [{
            'id': c.id,
            'title': c.title,
            'slug': c.slug,
            'category': c.category,
            'price': str(c.price),
            'is_published': c.is_published,
            'review_status': c.review_status,
            'created_at': c.created_at.isoformat() if c.created_at else None,
        } for c in courses]

        tests_data = [{
            'id': t.id,
            'title': t.title,
            'slug': t.slug,
            'category': t.category,
            'price': str(t.price),
            'is_published': t.is_published,
            'review_status': t.review_status,
            'created_at': t.created_at.isoformat() if t.created_at else None,
        } for t in tests]

        resources_data = [{
            'id': r.id,
            'title': r.title,
            'slug': r.slug,
            'category': r.category,
            'file_type': r.file_type,
            'is_published': r.is_published,
            'review_status': r.review_status,
            'created_at': r.created_at.isoformat() if r.created_at else None,
        } for r in resources]

        course_student_ids = set(UserEnrollment.objects.filter(course__created_by=ed, is_active=True).values_list('user_id', flat=True))
        test_student_ids = set(UserTestAttempt.objects.filter(test_series__created_by=ed).values_list('user_id', flat=True))
        student_users = User.objects.filter(id__in=(course_student_ids | test_student_ids))
        students_data = [{
            'id': s.id,
            'name': f"{s.first_name} {s.last_name}".strip() or s.username,
            'email': s.email,
            'date_joined': s.date_joined.strftime('%Y-%m-%d') if s.date_joined else None,
        } for s in student_users[:50]]

        audit_logs = AuditLog.objects.filter(models.Q(actor=ed) | models.Q(owner=ed)).order_by('-timestamp')[:25]
        activity_data = AuditLogSerializer(audit_logs, many=True).data

        faculty_data = None
        if faculty:
            faculty_data = {
                'id': faculty.id,
                'slug': faculty.slug,
                'name': faculty.name,
                'role': faculty.role,
                'specialization': faculty.specialization,
                'qualification': faculty.qualification,
                'experience': faculty.experience,
                'bio': faculty.bio,
                'image': faculty.image,
                'is_active': faculty.is_active,
            }

        return Response({
            'educator': {
                'id': ed.id,
                'name': f"{ed.first_name} {ed.last_name}".strip() or ed.username,
                'email': ed.email,
                'role': getattr(ed, 'profile', None) and ed.profile.role or 'educator',
                'is_active': ed.is_active,
                'last_login': ed.last_login.strftime('%Y-%m-%d %H:%M') if ed.last_login else None,
                'date_joined': ed.date_joined.strftime('%Y-%m-%d %H:%M') if ed.date_joined else None,
            },
            'faculty': faculty_data,
            'courses': courses_data,
            'tests': tests_data,
            'resources': resources_data,
            'students': students_data,
            'activity': activity_data,
            'counts': {
                'courses': courses.count(),
                'tests': tests.count(),
                'resources': resources.count(),
                'students': len(course_student_ids | test_student_ids),
                'pending_items': (
                    courses.filter(review_status='pending').count() +
                    tests.filter(review_status='pending').count() +
                    resources.filter(review_status='pending').count()
                )
            }
        })

    def patch(self, request, pk):
        ed = generics.get_object_or_404(User, pk=pk)
        faculty = getattr(ed, 'faculty_profile', None)
        if not faculty:
            slug = slugify(f"{ed.first_name}-{ed.last_name}").strip('-') or f"faculty-{ed.id}"
            candidate = slug
            idx = 1
            while FacultyProfile.objects.filter(slug=candidate).exists():
                candidate = f"{slug}-{idx}"
                idx += 1
            faculty = FacultyProfile.objects.create(
                user=ed,
                slug=candidate,
                name=f"{ed.first_name} {ed.last_name}".strip() or ed.username,
                role='Faculty Educator',
                is_active=True
            )

        for field in ['name', 'role', 'specialization', 'qualification', 'experience', 'bio', 'image', 'is_active']:
            if field in request.data:
                setattr(faculty, field, request.data[field])
        faculty.save()
        log_action(actor=request.user, action='update_faculty', object_type='faculty', object_id=faculty.id, object_title=faculty.name, owner=ed)

        return Response({
            'message': 'Faculty profile updated.',
            'faculty': {
                'id': faculty.id,
                'slug': faculty.slug,
                'name': faculty.name,
                'role': faculty.role,
                'specialization': faculty.specialization,
                'qualification': faculty.qualification,
                'experience': faculty.experience,
                'bio': faculty.bio,
                'image': faculty.image,
                'is_active': faculty.is_active,
            }
        })


class AuditPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminAuditListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    pagination_class = AuditPagination

    def get_queryset(self):
        qs = AuditLog.objects.all().select_related('actor', 'owner')
        owner = self.request.query_params.get('owner')
        actor = self.request.query_params.get('actor')
        obj_type = self.request.query_params.get('type')
        action = self.request.query_params.get('action')
        from_date = self.request.query_params.get('from')
        to_date = self.request.query_params.get('to')

        if owner:
            qs = qs.filter(owner_id=owner)
        if actor:
            qs = qs.filter(actor_id=actor)
        if obj_type:
            qs = qs.filter(object_type=obj_type)
        if action:
            qs = qs.filter(action=action)
        if from_date:
            qs = qs.filter(created_at__gte=from_date)
        if to_date:
            qs = qs.filter(created_at__lte=to_date)
        return qs


class EducatorActivityListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditPagination

    def get_queryset(self):
        user = self.request.user
        return AuditLog.objects.filter(
            models.Q(owner=user) | models.Q(actor=user)
        ).select_related('actor', 'owner')


class AdminApprovalsCombinedView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending_courses = Course.objects.filter(review_status='pending').select_related('created_by')
        pending_tests = TestSeries.objects.filter(review_status='pending').select_related('created_by')
        pending_resources = StudyResource.objects.filter(review_status='pending').select_related('created_by')

        courses_data = [{
            'id': c.id,
            'type': 'course',
            'title': c.title,
            'slug': c.slug,
            'created_by': c.created_by.email if c.created_by else None,
            'created_by_name': c.created_by.get_full_name() if c.created_by else 'Unknown',
            'created_at': c.created_at,
            'review_status': c.review_status,
            'review_note': c.review_note,
        } for c in pending_courses]

        tests_data = [{
            'id': t.id,
            'type': 'test',
            'title': t.title,
            'slug': t.slug,
            'created_by': t.created_by.email if t.created_by else None,
            'created_by_name': t.created_by.get_full_name() if t.created_by else 'Unknown',
            'created_at': t.created_at,
            'review_status': t.review_status,
            'review_note': t.review_note,
        } for t in pending_tests]

        resources_data = [{
            'id': r.id,
            'type': 'resource',
            'title': r.title,
            'slug': r.slug,
            'created_by': r.created_by.email if r.created_by else None,
            'created_by_name': r.created_by.get_full_name() if r.created_by else 'Unknown',
            'created_at': r.created_at,
            'review_status': r.review_status,
            'review_note': r.review_note,
        } for r in pending_resources]

        return Response({
            'courses': courses_data,
            'tests': tests_data,
            'resources': resources_data,
            'total_pending': len(courses_data) + len(tests_data) + len(resources_data),
        })


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = generics.get_object_or_404(Notification, pk=pk, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({'message': 'Marked as read.'})


class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})


class AdminFacultyListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminFacultyProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = FacultyProfile.objects.all().order_by('display_order', 'id')

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action='create_faculty',
            object_type='faculty',
            object_id=instance.id,
            object_title=instance.name
        )


class AdminFacultyDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminFacultyProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = FacultyProfile.objects.all()

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action='update_faculty',
            object_type='faculty',
            object_id=instance.id,
            object_title=instance.name
        )

    def perform_destroy(self, instance):
        fid = instance.id
        fname = instance.name
        instance.delete()
        log_action(
            actor=self.request.user,
            action='delete_faculty',
            object_type='faculty',
            object_id=fid,
            object_title=fname
        )


class AdminFacultyGrantEducatorView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        faculty = get_object_or_404(FacultyProfile, pk=pk)
        email = (request.data.get('email') or '').strip().lower()
        if not email or '@' not in email:
            return Response({'email': 'Valid email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        is_new_user = False
        if not user:
            username = email
            if User.objects.filter(username=username).exists():
                username = f"{email.split('@')[0]}_{uuid.uuid4().hex[:6]}"
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=faculty.name.split()[0] if faculty.name else '',
                last_name=' '.join(faculty.name.split()[1:]) if faculty.name and len(faculty.name.split()) > 1 else '',
                is_active=True
            )
            is_new_user = True

        linked_other = FacultyProfile.objects.filter(user=user).exclude(pk=faculty.pk).first()
        if linked_other:
            return Response(
                {'detail': f"User {email} is already linked to another faculty profile ({linked_other.name})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = 'educator'
        profile.save()

        faculty.user = user
        faculty.save()

        log_action(
            actor=request.user,
            action='grant_educator',
            object_type='faculty',
            object_id=faculty.id,
            object_title=faculty.name,
            owner=user,
            changes={'email': email, 'is_new_user': is_new_user}
        )

        serializer = AdminFacultyProfileSerializer(faculty, context={'request': request})
        return Response({
            'message': f"Educator access granted to {email}.",
            'faculty': serializer.data
        }, status=status.HTTP_200_OK)


class AdminFacultyRevokeEducatorView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        faculty = get_object_or_404(FacultyProfile, pk=pk)
        target_user = faculty.user
        if not target_user:
            return Response({'detail': 'No user account currently linked to this faculty profile.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(target_user, 'profile', None)
        if profile:
            profile.role = 'student'
            profile.save()

        faculty.user = None
        faculty.save()

        log_action(
            actor=request.user,
            action='revoke_educator',
            object_type='faculty',
            object_id=faculty.id,
            object_title=faculty.name,
            owner=target_user,
            changes={'demoted_user_id': target_user.id, 'email': target_user.email}
        )

        serializer = AdminFacultyProfileSerializer(faculty, context={'request': request})
        return Response({
            'message': f"Educator access revoked for {target_user.email}. Role changed to student.",
            'faculty': serializer.data
        }, status=status.HTTP_200_OK)


class EducatorProfileView(APIView):
    permission_classes = [IsEducator]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        faculty = FacultyProfile.objects.filter(user=request.user).first()
        if not faculty:
            from django.utils.text import slugify
            name = request.user.get_full_name() or request.user.username
            base_slug = slugify(name) or f"educator-{request.user.id}"
            slug = base_slug
            counter = 1
            while FacultyProfile.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            faculty = FacultyProfile.objects.create(
                user=request.user,
                name=name,
                slug=slug,
                role='Educator',
                is_active=False
            )
        serializer = EducatorFacultyProfileSerializer(faculty, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)

    def patch(self, request):
        faculty = FacultyProfile.objects.filter(user=request.user).first()
        if not faculty:
            from django.utils.text import slugify
            name = request.user.get_full_name() or request.user.username
            base_slug = slugify(name) or f"educator-{request.user.id}"
            slug = base_slug
            counter = 1
            while FacultyProfile.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            faculty = FacultyProfile.objects.create(
                user=request.user,
                name=name,
                slug=slug,
                role='Educator',
                is_active=False
            )

        serializer = EducatorFacultyProfileSerializer(faculty, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_action(
            actor=request.user,
            action='update_profile',
            object_type='faculty',
            object_id=faculty.id,
            object_title=faculty.name,
            owner=request.user
        )

        return Response(serializer.data)

from .serializers import StudentPreferencesSerializer

class StudentPreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = StudentPreferencesSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        return self.patch(request)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = StudentPreferencesSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
