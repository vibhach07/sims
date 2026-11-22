from django.urls import path
from .views import (
    # Existing (preserved)
    TestSeriesListView, TestSeriesDetailView,
    SubmitTestAttemptView, MyTestAttemptsView,
    BulkQuestionImportView, ImportGenerateTestSeriesView,
    AdminTestSeriesCreateView, AdminTestSeriesUpdateDeleteView,
    AdminTestAttemptsListView, AdminQuestionCreateView, AdminQuestionUpdateDeleteView,
    AdminQuestionImageUploadDeleteView,
    # Phase 1B
    StartAttemptView, AttemptDetailView, SaveAnswerView,
    SubmitAttemptView, AttemptResultView, MyTestAttemptsV2View,
    AdminTestAttemptsExportCSVView, AttemptIntegrityView,
    TestSeriesSubmitReviewView, TestSeriesReviewDecisionView, TestSeriesOwnershipTransferView,
)
from .pipeline.api.import_views import (
    PipelineUploadView, PipelineJobStatusView, PipelineCropView, PipelinePublishView
)

urlpatterns = [
    # ── Modular Bulk Import Pipeline ──────────────────────────────────────────
    path('pipeline/upload/', PipelineUploadView.as_view(), name='pipeline-upload'),
    path('pipeline/status/<str:job_id>/', PipelineJobStatusView.as_view(), name='pipeline-status'),
    path('pipeline/crop/', PipelineCropView.as_view(), name='pipeline-crop'),
    path('pipeline/publish/', PipelinePublishView.as_view(), name='pipeline-publish'),
    # ── Public / student catalog ──────────────────────────────────────────────
    path('', TestSeriesListView.as_view(), name='test-series-list'),

    # ── My attempts (v1 preserved, v2 richer) ─────────────────────────────────
    path('my-attempts/', MyTestAttemptsView.as_view(), name='my-test-attempts'),
    path('my-attempts/v2/', MyTestAttemptsV2View.as_view(), name='my-test-attempts-v2'),

    # ── Admin test management ─────────────────────────────────────────────────
    path('manage/', AdminTestSeriesCreateView.as_view(), name='admin-test-create'),
    path('manage/import-generate/', ImportGenerateTestSeriesView.as_view(), name='admin-test-import-generate'),
    path('manage/attempts/', AdminTestAttemptsListView.as_view(), name='admin-test-all-attempts'),
    path('manage/attempts/export/', AdminTestAttemptsExportCSVView.as_view(), name='admin-test-attempts-export'),
    path('manage/questions/', AdminQuestionCreateView.as_view(), name='admin-question-create'),
    path('manage/questions/<int:id>/', AdminQuestionUpdateDeleteView.as_view(), name='admin-question-detail'),
    path('manage/questions/<int:id>/images/', AdminQuestionImageUploadDeleteView.as_view(), name='admin-question-images'),
    path('manage/<slug:slug>/', AdminTestSeriesUpdateDeleteView.as_view(), name='admin-test-detail'),
    path('manage/<slug:slug>/submit-review/', TestSeriesSubmitReviewView.as_view(), name='admin-test-submit-review'),
    path('manage/<slug:slug>/review/', TestSeriesReviewDecisionView.as_view(), name='admin-test-review-decision'),
    path('manage/<slug:slug>/transfer/', TestSeriesOwnershipTransferView.as_view(), name='admin-test-transfer-single'),
    path('manage/transfer/', TestSeriesOwnershipTransferView.as_view(), name='admin-test-transfer-bulk'),
    path('manage/<slug:slug>/attempts/', AdminTestAttemptsListView.as_view(), name='admin-test-attempts'),

    # ── Phase 1B: Attempt lifecycle (attempt-scoped) ──────────────────────────
    path('attempts/<int:attempt_id>/', AttemptDetailView.as_view(), name='attempt-detail'),
    path('attempts/<int:attempt_id>/answer/', SaveAnswerView.as_view(), name='attempt-save-answer'),
    path('attempts/<int:attempt_id>/submit/', SubmitAttemptView.as_view(), name='attempt-submit'),
    path('attempts/<int:attempt_id>/result/', AttemptResultView.as_view(), name='attempt-result'),
    path('attempts/<int:attempt_id>/integrity/', AttemptIntegrityView.as_view(), name='attempt-integrity'),

    # ── Per-exam routes ────────────────────────────────────────────────────────
    path('<slug:slug>/', TestSeriesDetailView.as_view(), name='test-series-detail'),
    path('<slug:slug>/start/', StartAttemptView.as_view(), name='test-series-start'),
    path('<slug:slug>/submit/', SubmitTestAttemptView.as_view(), name='submit-test-attempt'),  # legacy
    path('<slug:slug>/bulk-import/', BulkQuestionImportView.as_view(), name='bulk-question-import'),
]
