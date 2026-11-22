from django.urls import path
from .views_live import (
    LiveClassPublicListView,
    LiveClassPublicDetailView,
    LiveClassManageListView,
    LiveClassManageDetailView,
    LiveClassGoLiveView,
    LiveClassEndView,
    LiveClassCancelView,
    LiveClassConvertToLectureView,
)

urlpatterns = [
    # Public & student endpoints
    path("", LiveClassPublicListView.as_view(), name="live-list"),
    path("<int:pk>/", LiveClassPublicDetailView.as_view(), name="live-detail"),

    # Educator & admin manage endpoints
    path("manage/", LiveClassManageListView.as_view(), name="live-manage-list"),
    path("manage/<int:pk>/", LiveClassManageDetailView.as_view(), name="live-manage-detail"),
    path("manage/<int:pk>/go-live/", LiveClassGoLiveView.as_view(), name="live-go-live"),
    path("manage/<int:pk>/end/", LiveClassEndView.as_view(), name="live-end"),
    path("manage/<int:pk>/cancel/", LiveClassCancelView.as_view(), name="live-cancel"),
    path("manage/<int:pk>/convert-to-lecture/", LiveClassConvertToLectureView.as_view(), name="live-convert-to-lecture"),
]
