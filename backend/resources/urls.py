from django.urls import path
from .views import (
    StudyResourceListView, StudyResourceDetailView, DownloadResourceView,
    StudyResourceSubmitReviewView, StudyResourceReviewDecisionView, StudyResourceOwnershipTransferView
)

urlpatterns = [
    path('', StudyResourceListView.as_view(), name='resource-list'),
    path('transfer/', StudyResourceOwnershipTransferView.as_view(), name='resource-transfer-bulk'),
    path('<slug:slug>/', StudyResourceDetailView.as_view(), name='resource-detail'),
    path('<slug:slug>/download/', DownloadResourceView.as_view(), name='resource-download'),
    path('<slug:slug>/submit-review/', StudyResourceSubmitReviewView.as_view(), name='resource-submit-review'),
    path('<slug:slug>/review/', StudyResourceReviewDecisionView.as_view(), name='resource-review-decision'),
    path('<slug:slug>/transfer/', StudyResourceOwnershipTransferView.as_view(), name='resource-transfer-single'),
]
