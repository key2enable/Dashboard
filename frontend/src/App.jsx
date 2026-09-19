// Description: Main application routing and role-based access control for a school management system.
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react';

import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Attendance from './pages/Attendance';
import Assessments from './pages/Assessments';
import LessonPlans from './pages/LessonPlans';
import Reports from './pages/Reports';
import StudentReport from './pages/StudentReport';
import Lessons from './pages/Lessons';
import StudentGroups from './pages/StudentGroups';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import AutoGrader from './pages/AutoGrader';
import RolePending from './components/RolePending';
import Quizzes     from './pages/Quizzes';
import QuizBuilder from './pages/QuizBuilder';
import TakeQuiz from './pages/TakeQuiz';
import QuizResults from './pages/QuizResults';
import TeachersPage from './pages/TeachersPage';



import StudentQuizzes from './pages/StudentQuizzes';
import FolderView from "@/pages/FolderView";
import MoodKiosk from './pages/MoodKiosk';
import StudentQRCodes from './pages/StudentQRCodes';
import StudentMoodReport from './pages/StudentMoodReport';
import { ADMIN_EMAILS } from './adminList';



function RoleRedirect() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role;
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  if (ADMIN_EMAILS.includes(email)) return <Navigate to="/teacher/dashboard" replace />;
  if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (role === 'student') return <Navigate to="/student/dashboard" replace />;
  // return <div>⚠️ Role not assigned. Please contact admin.</div>;
  return <Navigate to="/role-pending" replace />;
}

function App() {
  return (
    <Routes>

       <Route path="/role-pending" element={<RolePending />} />

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/lessons"
        element={
          <ProtectedRoute allowedRole="student">
            <Lessons />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/report"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentReport />
          </ProtectedRoute>
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute allowedRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/attendance"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/assessments"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Assessments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/lesson-plans"
        element={
          <ProtectedRoute allowedRole="teacher">
            <LessonPlans />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/reports"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <ProtectedRoute allowedRole="teacher">
            <StudentGroups />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/auto-grade"
        element={
          <ProtectedRoute allowedRole="teacher">
            <AutoGrader />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/quizzes"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Quizzes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/qr-codes"
        element={
          <ProtectedRoute allowedRole="teacher">
            <StudentQRCodes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/mood-reports"
        element={
          <ProtectedRoute allowedRole="teacher">
            <StudentMoodReport />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/teachers"
        element={
          <ProtectedRoute allowedRole="teacher" requireAdmin={true}>
            <TeachersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/quizzes/new"
        element={
          <ProtectedRoute allowedRole="teacher">
            <QuizBuilder mode="new" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/quizzes/:id/edit"
        element={
          <ProtectedRoute allowedRole="teacher">
            <QuizBuilder mode="edit" />
          </ProtectedRoute>
        }
      />

      {/* Take Quiz Route */}
      <Route
        path="/teacher/quizzes/:id/take"
        element={
          <ProtectedRoute allowedRole="teacher">
            <TakeQuiz />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/quizzes/results"
        element={
          <ProtectedRoute allowedRole="teacher">
            <QuizResults />
          </ProtectedRoute>
        }
      />
      
      <Route
          path="/teacher/quizzes/folder/:folderId"
          element={
            <ProtectedRoute allowedRole="teacher">
              <FolderView />
            </ProtectedRoute>
          }
        />

      <Route
        path="/student/quizzes"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentQuizzes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/quizzes/take/:id"
        element={
          <ProtectedRoute allowedRole="student">
            <TakeQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/quizzes/results"
        element={
          <ProtectedRoute allowedRole="student">
            <QuizResults />
          </ProtectedRoute>
        }
      />

      <Route path="/undefined/*" element={<RolePending />} />



      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public, unauthenticated door-screen kiosk */}
      <Route path="/mood-kiosk" element={<MoodKiosk />} />

      {/* Auth Page with Clerk */}
      <Route
        path="/dashboard/*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-[#F3F9FD]">
            <SignedOut>
              <SignIn
                routing="path"
                path="/dashboard"
                redirectUrl="/dashboard"
                appearance={{
                  variables: {
                    colorPrimary: "#2E87D4",
                    colorText: "#1F2937",
                    colorBackground: "#FFFFFF",
                  },
                  elements: {
                    formButtonPrimary: "bg-[#2E87D4] hover:bg-[#1c6cb7]",
                  },
                }}
              />
            </SignedOut>
            <SignedIn>
              <RoleRedirect />
            </SignedIn>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
