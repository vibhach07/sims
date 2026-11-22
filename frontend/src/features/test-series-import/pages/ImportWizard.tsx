import React, { useState, useEffect, useRef } from 'react';
import { Stepper } from '../components/Stepper';
import { Step1UploadDocument } from '../steps/Step1UploadDocument';
import { Step2Processing } from '../steps/Step2Processing';
import { Step3QuestionReview } from '../steps/Step3QuestionReview';
import { Step4TestConfiguration } from '../steps/Step4TestConfiguration';
import { Step5PreviewPublish } from '../steps/Step5PreviewPublish';
import { ImportService } from '../services/import.service';
import { ImportQuestion, PipelineJobState, StepNumber, TestConfig } from '../types/import.types';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const ImportWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [maxAccessibleStep, setMaxAccessibleStep] = useState<StepNumber>(1);

  // Document & Job State
  const [file, setFile] = useState<File | null>(null);
  const [jobState, setJobState] = useState<PipelineJobState | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Questions & Config State
  const [questions, setQuestions] = useState<ImportQuestion[]>([]);
  const [config, setConfig] = useState<TestConfig>({
    title: 'GATE Chemical Engineering CBT Test Series — Mock Test #03',
    exam: 'GATE',
    category: 'after-msc-btech',
    branch: 'CH',
    test_type: 'All-India Open Mock',
    assigned_package_id: '',
    publishing_status: 'Published',
    visibility: 'Restricted',
    available_immediately: true,
    subject: 'Chemical Reaction Engineering',
    topic: 'Kinetics and Reactor Design',
    duration_minutes: 180,
    language: 'English',
    instructions: `1. Total duration of exam is monitored by the server timer.\n2. Section A contains 1-mark questions with 0.33 negative marking for MCQs.\n3. Section B contains 2-mark questions with 0.66 negative marking for MCQs.\n4. MSQ and NAT questions carry NO negative marking.`,
    distribution_strategy: 'balanced_50_50',
    default_marks: 1.0,
    default_negative_marks: 0.33,
    has_schedule: false,
    integrity_mode: 'off',
    is_paid: false,
    price: '0.00',
    is_published: true,
    max_attempts: '',
    is_unlimited_attempts: true,
    description: 'GATE Chemical Engineering Mock Test Series.',
  });

  // Publish State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; test_slug: string; test_id: number; message: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  // Step 1: Start file upload & launch background job
  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadError(null);
    setIsUploading(true);
    setCurrentStep(2);

    try {
      const initJob = await ImportService.uploadDocument(selectedFile);
      setJobState(initJob);

      if (initJob.status === 'completed' && initJob.result) {
        handleJobCompleted(initJob);
      } else {
        startPolling(initJob.job_id);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to start file ingestion.');
      setJobState({
        job_id: 'err',
        status: 'failed',
        progress: 0,
        stage: 'failed',
        message: err.message || 'Upload failed.',
        error: err.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Poll job status until finished
  const startPolling = (jobId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const statusData = await ImportService.pollJobStatus(jobId);
        setJobState(statusData);

        if (statusData.status === 'completed' && statusData.result) {
          clearInterval(pollTimerRef.current);
          handleJobCompleted(statusData);
        } else if (statusData.status === 'failed') {
          clearInterval(pollTimerRef.current);
        }
      } catch (e: any) {
        clearInterval(pollTimerRef.current);
        setJobState((prev) => (prev ? { ...prev, status: 'failed', message: e.message } : null));
      }
    }, 1500);
  };

  const handleJobCompleted = (completedJob: PipelineJobState) => {
    const res = completedJob.result;
    if (!res) return;

    setQuestions(res.questions || []);
    setConfig((prev) => ({
      ...prev,
      title: res.title || prev.title || 'Imported Test Series',
    }));

    setTimeout(() => {
      setCurrentStep(3);
      setMaxAccessibleStep(5);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Step 5: Publish final test
  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);

    try {
      const res = await ImportService.publishTestSeries(config, questions);
      setPublishResult(res);
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish test series.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/tests"
          className="inline-flex items-center gap-1.5 text-xs text-[#A87519] dark:text-[#D5AD5B] font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Test Series Catalog
        </Link>
        <span className="text-xs text-slate-500 dark:text-[#85878B]">
          Bulk Import Wizard • Standalone Pipeline
        </span>
      </div>

      {/* Stepper Navigation */}
      <Stepper
        currentStep={currentStep}
        maxAccessibleStep={maxAccessibleStep}
        onSelectStep={(step) => setCurrentStep(step)}
      />

      {/* Wizard Steps */}
      {currentStep === 1 && (
        <Step1UploadDocument
          onFileSelected={handleFileSelected}
          isLoading={isUploading}
          error={uploadError}
        />
      )}

      {currentStep === 2 && (
        <Step2Processing
          jobState={jobState}
          onRetry={() => {
            setCurrentStep(1);
            setJobState(null);
          }}
        />
      )}

      {currentStep === 3 && (
        <Step3QuestionReview
          questions={questions}
          onQuestionsChange={setQuestions}
          defaultMarks={config.default_marks}
          defaultNegativeMarks={config.default_negative_marks}
          onProceed={() => setCurrentStep(4)}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {currentStep === 4 && (
        <Step4TestConfiguration
          config={config}
          questions={questions}
          onChange={setConfig}
          onProceed={() => setCurrentStep(5)}
          onBack={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 5 && (
        <Step5PreviewPublish
          config={config}
          questions={questions}
          onPublish={handlePublish}
          isPublishing={isPublishing}
          publishResult={publishResult}
          error={publishError}
          onBack={() => setCurrentStep(4)}
        />
      )}
    </div>
  );
};

