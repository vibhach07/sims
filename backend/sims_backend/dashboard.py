from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Sum
from django.urls import reverse_lazy
from django.utils import timezone
from users.models import UserProfile, Enquiry, EducatorApplication
from courses.models import Course, LiveClass
from assessments.models import TestSeries, UserTestAttempt
from resources.models import StudyResource
from orders.models import Order


def badge_pending_approvals(request):
    try:
        count = (
            Course.objects.filter(review_status="pending").count()
            + TestSeries.objects.filter(review_status="pending").count()
            + StudyResource.objects.filter(review_status="pending").count()
        )
        return str(count) if count > 0 else ""
    except Exception:
        return ""


def badge_educator_applications(request):
    try:
        count = EducatorApplication.objects.filter(status="pending").count()
        return str(count) if count > 0 else ""
    except Exception:
        return ""


def dashboard_callback(request, context):
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # 1. Cheap aggregated counts (O(1) indexed count queries)
    total_students = UserProfile.objects.filter(role="student").count()
    active_educators = User.objects.filter(profile__role="educator", is_active=True).count()

    pending_courses = Course.objects.filter(review_status="pending").count()
    pending_tests = TestSeries.objects.filter(review_status="pending").count()
    pending_resources = StudyResource.objects.filter(review_status="pending").count()
    pending_approvals = pending_courses + pending_tests + pending_resources

    new_applications = EducatorApplication.objects.filter(status="pending").count()
    enquiries_week = Enquiry.objects.filter(created_at__gte=week_ago).count()
    live_today = LiveClass.objects.filter(scheduled_start__gte=today_start, scheduled_start__lt=today_end).count()
    tests_7d = UserTestAttempt.objects.filter(started_at__gte=week_ago).count()

    paid_orders_30d = Order.objects.filter(created_at__gte=month_ago, status="paid")
    total_orders_30d = paid_orders_30d.count()

    is_superuser = bool(request.user and request.user.is_superuser)
    revenue_30d = None
    if is_superuser:
        revenue_agg = paid_orders_30d.aggregate(rev=Sum("amount"))
        revenue_30d = float(revenue_agg["rev"] or 0.0)

    # KPI cards list
    kpi_cards = [
        {
            "title": "Total Students",
            "value": f"{total_students:,}",
            "icon": "school",
            "color": "primary",
            "subtitle": "Registered enrolled students",
        },
        {
            "title": "Active Educators",
            "value": f"{active_educators:,}",
            "icon": "badge",
            "color": "success",
            "subtitle": "Verified teaching faculty",
        },
        {
            "title": "Pending Approvals",
            "value": str(pending_approvals),
            "icon": "pending_actions",
            "color": "warning" if pending_approvals > 0 else "info",
            "subtitle": f"{pending_courses} courses, {pending_tests} tests, {pending_resources} notes",
        },
        {
            "title": "Educator Applications",
            "value": str(new_applications),
            "icon": "how_to_reg",
            "color": "warning" if new_applications > 0 else "info",
            "subtitle": "Awaiting verification",
        },
        {
            "title": "Enquiries This Week",
            "value": str(enquiries_week),
            "icon": "contact_support",
            "color": "info",
            "subtitle": "Past 7 days student leads",
        },
        {
            "title": "Live Classes Today",
            "value": str(live_today),
            "icon": "sensors",
            "color": "danger" if live_today > 0 else "secondary",
            "subtitle": "Scheduled interactive sessions",
        },
        {
            "title": "Tests Attempted (7d)",
            "value": f"{tests_7d:,}",
            "icon": "quiz",
            "color": "primary",
            "subtitle": "Completed mock test papers",
        },
        {
            "title": "Orders (30d)",
            "value": f"{total_orders_30d:,}",
            "icon": "shopping_cart",
            "color": "success",
            "subtitle": f"₹{revenue_30d:,.2f} Gross Revenue" if is_superuser else "Paid course & test purchases",
        },
    ]

    quick_links = [
        {
            "title": "Open React Admin Panel",
            "url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/admin/dashboard",
            "icon": "open_in_new",
            "variant": "primary",
            "external": True,
        },
        {
            "title": "Pending Approvals",
            "url": f"/{getattr(settings, 'DJANGO_ADMIN_URL', 'admin').strip('/')}/courses/course/?review_status__exact=pending",
            "icon": "rate_review",
            "variant": "warning",
            "count": pending_approvals,
        },
        {
            "title": "Educator Applications",
            "url": f"/{getattr(settings, 'DJANGO_ADMIN_URL', 'admin').strip('/')}/users/educatorapplication/",
            "icon": "person_add",
            "variant": "info",
            "count": new_applications,
        },
    ]

    context.update({
        "kpi_cards": kpi_cards,
        "quick_links": quick_links,
        "is_superuser": is_superuser,
        "total_students": total_students,
        "active_educators": active_educators,
        "pending_approvals": pending_approvals,
        "new_applications": new_applications,
        "enquiries_week": enquiries_week,
        "live_today": live_today,
        "tests_7d": tests_7d,
        "total_orders_30d": total_orders_30d,
        "revenue_30d": revenue_30d,
    })
    return context
