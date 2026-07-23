// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import LogPoints from './pages/LogPoints';
import LessonPlans from './pages/LessonPlans';
import LessonTemplates from './pages/LessonTemplates';
import SyllabusStatus from './pages/SyllabusStatus';
import ClassSummaries from './pages/ClassSummaries';
import StudentLookup from './pages/StudentLookup';
import Communication from './pages/Communication';
import MyHistory from './pages/MyHistory';
import LeaveApprovals from './pages/LeaveApprovals';
import MonitorAttendance from './pages/MonitorAttendance';
import SchoolLogBook from './pages/SchoolLogBook';
import ManageStudents from './pages/ManageStudents';
import ManageTeachers from './pages/ManageTeachers';
import ITSAudit from './pages/ITSAudit';
import SupportInbox from './pages/SupportInbox';
import HelpCentre from './pages/HelpCentre';
import SystemSettings from './pages/SystemSettings';
import AdminDashboard from './pages/AdminDashboard';
import AcademicCalendar from './pages/AcademicCalendar';
import Gradebook from './pages/Gradebook';
import StaffOnboarding from './pages/StaffOnboarding';
import AcademicMapping from './pages/AcademicMapping';
import ParentOnboarding from './pages/ParentOnboarding';
import Attendance from './pages/Attendance';
import RequestStudentLeave from './pages/RequestStudentLeave';
import Profile from './pages/Profile';

const CalendarPage = () => <h2 className="text-3xl font-bold text-school-navy">Academic Calendar</h2>;

export default function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // 2. Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-school-navy text-school-yellow font-bold text-xl">Loading System...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        
        {/* PUBLIC ROUTE */}
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/admin" />} 
        />

        {/* PRIVATE ROUTES */}
        <Route 
          path="/" 
          element={session ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<ParentDashboard />} />
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="log-points" element={<LogPoints />} />
          <Route path="lesson-plans" element={<LessonPlans />} />
          <Route path="lesson-templates" element={<LessonTemplates />} />
          <Route path="syllabus-status" element={<SyllabusStatus />} />
          <Route path="class-summaries" element={<ClassSummaries />} />
          <Route path="student-lookup" element={<StudentLookup />} />
          <Route path="communication" element={<Communication />} />
          <Route path="my-history" element={<MyHistory />} />
          <Route path="leave-approvals" element={<LeaveApprovals />} />
          <Route path="monitor-attendance" element={<MonitorAttendance />} />
          <Route path="school-log-book" element={<SchoolLogBook />} />
          <Route path="manage-students" element={<ManageStudents />} />
          <Route path="manage-teachers" element={<ManageTeachers />} />
          <Route path="its-audit" element={<ITSAudit />} />
          <Route path="support-inbox" element={<SupportInbox />} />
          <Route path="help-centre" element={<HelpCentre />} />
          <Route path="system-settings" element={<SystemSettings />} />
          <Route path="calendar" element={<AcademicCalendar />} />
          <Route path="/gradebook" element={<Gradebook />} />
          <Route path="/staff-onboarding" element={<StaffOnboarding />} />
          <Route path="/academic-mapping" element={<AcademicMapping />} />
          <Route path="/parent-onboarding" element={<ParentOnboarding />} />
          <Route element={<Attendance />} path="/attendance" />
          <Route element={<RequestStudentLeave />} path="/request-leave" />
          <Route element={<Profile />} path="/profile" />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}