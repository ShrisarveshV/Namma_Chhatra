import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HeadmasterDashboard from './pages/HeadmasterDashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import ClassesSections from './pages/ClassesSections';
import Analytics from './pages/Analytics';
import StudentLookup from './pages/StudentLookup';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import HighRiskStudents from './pages/HighRiskStudents';
import AttendanceDashboard from './pages/AttendanceDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AiAnalysis from './pages/AiAnalysis';
import CounselingRoster from './pages/CounselingRoster';
import MarkAttendance from './pages/MarkAttendance';

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="overview" replace />;
}

function RoleBasedDashboard() {
  const { user } = useAuth();
  return user?.role === 'HEADMASTER' ? <HeadmasterDashboard /> : <TeacherDashboard />;
}

function ProtectedDashboard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role || 'TEACHER';
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar role={role} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedDashboard />}>
            <Route index element={<DefaultRedirect />} />

            {/* ── Dashboard Entry ──────────────────────────────── */}
            <Route path="overview" element={<RoleBasedDashboard />} />

            {/* ── Headmaster-only routes ─────────────────────── */}
            <Route path="teachers" element={<Teachers />} />
            <Route path="classes" element={<ClassesSections />} />

            {/* ── Shared routes (Teacher + Headmaster) ──────── */}
            <Route path="attendance-management" element={<AttendanceDashboard />} />
            <Route path="mark-attendance" element={<MarkAttendance />} />
            <Route path="students" element={<Students />} />
            <Route path="high-risk" element={<HighRiskStudents />} />
            <Route path="ai-analysis" element={<AiAnalysis />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="counseling" element={<CounselingRoster />} />
            <Route path="student-lookup" element={<StudentLookup />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />

            <Route path="*" element={<DefaultRedirect />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
