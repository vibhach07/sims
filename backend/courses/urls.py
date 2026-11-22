from django.urls import path
from .views import (
    SubjectListView, SubjectDetailView,
    CourseManageCreateView, CourseManageUpdateDeleteView,
    CourseSubmitReviewView, CourseReviewDecisionView, CourseOwnershipTransferView,
    CourseListView, CourseDetailView,
    LectureDetailView, LectureProgressView, MyLectureProgressListView,
    MyEnrolledCoursesView, VideoLectureDiscoveryView,
    ModuleManageView, ModuleManageDetailView,
    LectureManageView, LectureManageDetailView,
    # New hierarchy and discovery endpoints
    CourseCategoryListView, CourseCategoryDetailView,
    CourseHierarchyView, CourseTrackDetailView,
    SubjectLearningDetailView, RecommendedCoursesView,
    # Timetable, batches, daily challenge, doubts
    WeeklyTimetablePublicListView, BatchListView,
    DailyChallengeTodayView, DoubtQueryListCreateView,
)

urlpatterns = [
    # timetable & schedule matrix
    path('timetable/', WeeklyTimetablePublicListView.as_view(), name='timetable-list'),
    path('batches/', BatchListView.as_view(), name='batch-list'),
    path('daily-challenge/', DailyChallengeTodayView.as_view(), name='daily-challenge-today'),
    path('daily-challenge/submit/', DailyChallengeTodayView.as_view(), name='daily-challenge-submit'),
    path('doubts/', DoubtQueryListCreateView.as_view(), name='doubt-list-create'),

    # categories
    path('categories/', CourseCategoryListView.as_view(), name='category-list'),
    path('categories/<slug:slug>/', CourseCategoryDetailView.as_view(), name='category-detail'),

    # recommendations
    path('recommended/', RecommendedCoursesView.as_view(), name='course-recommended'),

    # subjects
    path('subjects/', SubjectListView.as_view(), name='subject-list'),
    path('subjects/<slug:slug>/', SubjectDetailView.as_view(), name='subject-detail'),

    # admin course, module & lecture management
    path('manage/', CourseManageCreateView.as_view(), name='course-create'),
    path('manage/<int:id>/', CourseManageUpdateDeleteView.as_view(), name='course-update-delete'),
    path('manage/<int:id>/submit-review/', CourseSubmitReviewView.as_view(), name='course-submit-review'),
    path('manage/<int:id>/review/', CourseReviewDecisionView.as_view(), name='course-review-decision'),
    path('manage/<int:id>/transfer/', CourseOwnershipTransferView.as_view(), name='course-transfer-single'),
    path('manage/transfer/', CourseOwnershipTransferView.as_view(), name='course-transfer-bulk'),
    path('manage/modules/', ModuleManageView.as_view(), name='module-create'),
    path('manage/modules/<int:id>/', ModuleManageDetailView.as_view(), name='module-detail'),
    path('manage/lectures/', LectureManageView.as_view(), name='lecture-create'),
    path('manage/lectures/<int:id>/', LectureManageDetailView.as_view(), name='lecture-manage-detail'),

    # catalog
    path('', CourseListView.as_view(), name='course-list'),
    path('video-discovery/', VideoLectureDiscoveryView.as_view(), name='video-discovery'),
    path('my-courses/', MyEnrolledCoursesView.as_view(), name='my-enrolled-courses'),

    # lecture detail + progress
    path('lectures/<int:lecture_id>/', LectureDetailView.as_view(), name='lecture-detail'),
    path('lectures/<int:lecture_id>/progress/', LectureProgressView.as_view(), name='lecture-progress'),
    path('progress/', MyLectureProgressListView.as_view(), name='my-lecture-progress'),

    # course hierarchy & subject learning
    path('<slug:slug>/hierarchy/', CourseHierarchyView.as_view(), name='course-hierarchy'),
    path('<slug:slug>/tracks/<slug:track_slug>/', CourseTrackDetailView.as_view(), name='course-track-detail'),
    path('<slug:slug>/subjects/<slug:subject_slug>/', SubjectLearningDetailView.as_view(), name='subject-learning-detail'),

    # course detail (slug) — must be last to avoid prefix collisions
    path('<slug:slug>/', CourseDetailView.as_view(), name='course-detail'),
]
