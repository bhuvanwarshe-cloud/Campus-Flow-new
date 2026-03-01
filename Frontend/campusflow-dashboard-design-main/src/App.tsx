import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound"; import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProfileComplete from "./pages/ProfileComplete";
import ProfileView from "./pages/ProfileView";
import AdminUsers from "./pages/AdminUsers";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherClasses from "./pages/TeacherClasses";
import TeacherClassDetails from "./pages/TeacherClassDetails";
import TeacherAttendance from "./pages/TeacherAttendance";
import TeacherMarks from "./pages/TeacherMarks";
import TeacherNotifications from "./pages/TeacherNotifications";
import TeacherAnnouncements from "./pages/TeacherAnnouncements";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherAssignments from "./pages/TeacherAssignments";
import TeacherTests from "./pages/TeacherTests";
import StudentAssignments from "./pages/StudentAssignments";
import StudentTests from "./pages/StudentTests";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/classes"
                  element={
                    <ProtectedRoute>
                      <TeacherClasses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/classes/:classId"
                  element={
                    <ProtectedRoute>
                      <TeacherClassDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/attendance"
                  element={
                    <ProtectedRoute>
                      <TeacherAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/marks"
                  element={
                    <ProtectedRoute>
                      <TeacherMarks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/notifications"
                  element={
                    <ProtectedRoute>
                      <TeacherNotifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/announcements"
                  element={
                    <ProtectedRoute>
                      <TeacherAnnouncements />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/assignments"
                  element={
                    <ProtectedRoute>
                      <TeacherAssignments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/tests"
                  element={
                    <ProtectedRoute>
                      <TeacherTests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/students"
                  element={
                    <ProtectedRoute>
                      <TeacherStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/assignments"
                  element={
                    <ProtectedRoute>
                      <StudentAssignments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/tests"
                  element={
                    <ProtectedRoute>
                      <StudentTests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/complete"
                  element={
                    <ProtectedRoute>
                      <ProfileComplete />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfileView />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
