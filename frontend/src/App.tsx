import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CourseProvider } from './contexts/CourseContext';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { CheckoutModal } from './components/ui/CheckoutModal';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { EducatorLayout } from './components/layout/EducatorLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { CoursesPage } from './pages/public/CoursesPage';
import { CourseDetailPage } from './pages/public/CourseDetailPage';
import { SubjectLearningPage } from './pages/public/SubjectLearningPage';
import { CategoryPage } from './pages/public/CategoryPage';
import { FacultyDirectoryPage } from './pages/public/FacultyDirectoryPage';
import { FacultyProfilePage } from './pages/public/FacultyProfilePage';
import { TestSeriesPage } from './pages/public/TestSeriesPage';
import { StudyMaterialPage } from './pages/public/StudyMaterialPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/public/VerifyEmailPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';
import { LegalPages } from './pages/public/LegalPages';
import { VideoLecturesPage } from './pages/public/VideoLecturesPage';
import { PaymentSuccessPage } from './pages/public/PaymentSuccessPage';
import { PaymentFailurePage } from './pages/public/PaymentFailurePage';

// Student Pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { MyCoursesPage } from './pages/student/MyCoursesPage';
import { LearningClassroomPage } from './pages/student/LearningClassroomPage';
import { StudentTestsPage } from './pages/student/StudentTestsPage';
import { TestTakingPage } from './pages/student/TestTakingPage';
import { TestResultsPage } from './pages/student/TestResultsPage';
import { BookmarksPage } from './pages/student/BookmarksPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { StudentProfileSetupPage } from './pages/student/StudentProfileSetupPage';

import { EducatorDashboardPage } from './pages/educator/EducatorDashboardPage';
import { EducatorCoursesPage } from './pages/educator/EducatorCoursesPage';
import { CourseEditorPage } from './pages/educator/CourseEditorPage';
import { EducatorStudentsPage } from './pages/educator/EducatorStudentsPage';
import { EducatorTestsPage } from './pages/educator/EducatorTestsPage';
import { EducatorResourcesPage } from './pages/educator/EducatorResourcesPage';
import { EducatorProfilePage } from './pages/educator/EducatorProfilePage';
import { EducatorNotificationsPage } from './pages/educator/EducatorNotificationsPage';
import { EducatorActivityPage } from './pages/educator/EducatorActivityPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminFacultyPage } from './pages/admin/AdminFacultyPage';
import { AdminEnquiriesPage } from './pages/admin/AdminEnquiriesPage';
import { AdminTestsPage } from './pages/admin/AdminTestsPage';
import { AdminEducatorsControlPage } from './pages/admin/AdminEducatorsControlPage';
import { AdminEducatorDetailPage } from './pages/admin/AdminEducatorDetailPage';
import { AdminSiteSettingsPage } from './pages/admin/AdminSiteSettingsPage';
import { AdminLiveClassesPage } from './pages/admin/AdminLiveClassesPage';
import { EducatorLoginPage } from './pages/educator/EducatorLoginPage';
import { EducatorApplyPage } from './pages/educator/EducatorApplyPage';
import { EducatorLiveClassesPage } from './pages/educator/EducatorLiveClassesPage';
import { StudentLiveClassesPage } from './pages/student/StudentLiveClassesPage';
import { ImportWizard } from './features/test-series-import';
import { StudentLiveClassroomPage } from './pages/student/StudentLiveClassroomPage';
import { RoleRoute } from './components/layout/RoleRoute';
import { SiteProvider } from './contexts/SiteContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ScrollToTop } from './components/common/ScrollToTop';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';

const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ScrollToTop />
        <SiteProvider>
          <AuthProvider>
            <CourseProvider>
              <PurchaseProvider>
              <CheckoutModal />
              <Routes>
              {/* Public Website Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/category/:slug" element={<CategoryPage />} />
                <Route path="/courses/:slug" element={<CourseDetailPage />} />
                <Route path="/courses/:slug/subjects/:subjectSlug" element={<SubjectLearningPage />} />
                <Route path="/lectures" element={<VideoLecturesPage />} />
                <Route path="/categories/:slug" element={<CategoryPage />} />
                <Route path="/faculty" element={<FacultyDirectoryPage />} />
                <Route path="/faculty/:slug" element={<FacultyProfilePage />} />
                <Route path="/test-series" element={<TestSeriesPage />} />
                <Route path="/study-material" element={<StudyMaterialPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/privacy-policy" element={<LegalPages type="privacy" />} />
                <Route path="/terms" element={<LegalPages type="terms" />} />
                <Route path="/educator/login" element={<EducatorLoginPage />} />
                <Route path="/educator/apply" element={<EducatorApplyPage />} />
                <Route path="/live" element={<StudentLiveClassesPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/payment/failure" element={<PaymentFailurePage />} />
              </Route>

              {/* Student Learning Platform Routes */}
              <Route element={<RoleRoute allowedRoles={['student', 'educator', 'admin', 'staff', 'superadmin']} />}>
                <Route element={<StudentLayout />}>
                  <Route path="/student/dashboard" element={<StudentDashboardPage />} />
                  <Route path="/student/live" element={<StudentLiveClassesPage />} />
                  <Route path="/student/live/:id" element={<StudentLiveClassroomPage />} />
                  <Route path="/student/my-courses" element={<MyCoursesPage />} />
                  <Route path="/student/tests" element={<StudentTestsPage />} />
                  <Route path="/student/tests/:testId" element={<TestTakingPage />} />
                  <Route path="/student/results/:testId" element={<TestResultsPage />} />
                  <Route path="/student/attempts/:attemptId/result" element={<TestResultsPage />} />
                  <Route path="/student/bookmarks" element={<BookmarksPage />} />
                  <Route path="/student/profile" element={<StudentProfilePage />} />
                  <Route path="/student/profile-setup" element={<StudentProfileSetupPage />} />
                </Route>
                <Route path="/learn/:courseSlug" element={<LearningClassroomPage />} />
                <Route path="/learn/:courseSlug/:lessonId" element={<LearningClassroomPage />} />
              </Route>

              {/* Educator Workspace Routes */}
              <Route element={<RoleRoute allowedRoles={['educator', 'admin', 'staff', 'superadmin']} />}>
                <Route element={<EducatorLayout />}>
                  <Route path="/educator/dashboard" element={<EducatorDashboardPage />} />
                  <Route path="/educator/live" element={<EducatorLiveClassesPage />} />
                  <Route path="/educator/courses" element={<EducatorCoursesPage />} />
                  <Route path="/educator/courses/new" element={<CourseEditorPage />} />
                  <Route path="/educator/courses/:id/edit" element={<CourseEditorPage />} />
                  <Route path="/educator/tests" element={<EducatorTestsPage />} />
                  <Route path="/educator/tests/import" element={<ImportWizard />} />
                  <Route path="/educator/resources" element={<EducatorResourcesPage />} />
                  <Route path="/educator/students" element={<EducatorStudentsPage />} />
                  <Route path="/educator/profile" element={<EducatorProfilePage />} />
                  <Route path="/educator/notifications" element={<EducatorNotificationsPage />} />
                  <Route path="/educator/activity" element={<EducatorActivityPage />} />
                </Route>
              </Route>

              {/* Admin Panel Routes */}
              <Route element={<RoleRoute allowedRoles={['admin', 'staff', 'superadmin']} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/live" element={<AdminLiveClassesPage />} />
                  <Route path="/admin/courses" element={<AdminCoursesPage />} />
                  <Route path="/admin/students" element={<AdminStudentsPage />} />
                  <Route path="/admin/faculty" element={<AdminFacultyPage />} />
                  <Route path="/admin/enquiries" element={<AdminEnquiriesPage />} />
                  <Route path="/admin/tests" element={<AdminTestsPage />} />
                  <Route path="/admin/tests/import" element={<ImportWizard />} />
                  <Route path="/admin/educators" element={<AdminEducatorsControlPage />} />
                  <Route path="/admin/educators/:id" element={<AdminEducatorDetailPage />} />
                  <Route path="/admin/settings" element={<AdminSiteSettingsPage />} />
                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <FloatingWhatsAppButton />
          </PurchaseProvider>
        </CourseProvider>
      </AuthProvider>
    </SiteProvider>
    </ThemeProvider>
  </BrowserRouter>
  );
};

export default App;
