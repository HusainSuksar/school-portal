// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { 
  BookOpen, Users, Calendar, Settings, LogOut, HelpCircle, AlertTriangle, 
  CheckCircle2, Award, FileText, BookTemplate, BarChart2, Trophy, Search, 
  PhoneCall, History, ShieldCheck, Book, Shield, Briefcase , Database, Inbox,
  LifeBuoy, Activity, GraduationCap, Key, Lock, Link, CalendarClock
} from 'lucide-react';

export default function Layout() {
  const [profile, setProfile] = useState({ name: 'Loading...', role: '' });
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, requires_password_change')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setProfile({ name: data.full_name, role: data.role });
          
          if (data.requires_password_change) {
            setShowPasswordReset(true);
          }
        }
      }
    }
    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = '/login'; 
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsUpdating(true);

    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (authError) {
      setErrorMsg(authError.message);
      setIsUpdating(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles')
      .update({ requires_password_change: false })
      .eq('id', user.id);

    await supabase.auth.signOut();
    setShowPasswordReset(false);
    setIsUpdating(false);
    window.location.href = '/login'; 
  };

  const navLinkClass = ({isActive}) => 
    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
      isActive ? 'bg-slate-800 text-school-yellow' : 'hover:bg-slate-800 hover:text-white'
    }`;

  // Role Checks
  const isParent = profile.role === 'PARENT';
  const isTeacher = profile.role === 'TEACHER' || profile.role === 'CLASS_TR';
  const isAdmin = profile.role === 'ADMIN' || profile.role === 'HOS';
  const isStaff = isTeacher || isAdmin;

  return (
    <div className="flex h-screen w-screen bg-school-gray overflow-hidden relative">
      
      {/* --- PASSWORD RESET INTERCEPTOR MODAL --- */}
      {showPasswordReset && (
        <div className="absolute inset-0 z-50 bg-school-navy/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-school-navy mb-2">Secure Your Account</h2>
            <p className="text-sm text-slate-500 mb-6">
              Welcome, {profile.name}! Because this is your first time logging in, you are required to change your default password to continue.
            </p>

            {errorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-red-700">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <CheckCircle2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel & Logout
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating || !newPassword || !confirmPassword}
                  className="flex-1 bg-school-navy text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isUpdating ? 'Updating...' : 'Save & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. The Dark Navy Sidebar */}
      <aside className="w-64 bg-school-navy flex flex-col justify-between text-slate-300 overflow-y-auto custom-scrollbar">
        
        <div>
          <div className="p-6 border-b border-slate-700 sticky top-0 bg-school-navy z-10">
            <h1 className="text-2xl font-bold text-school-yellow flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Portal
            </h1>
          </div>
          
          <nav className="p-4 space-y-6">
            
            {isParent && (
  <div>
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Parent Portal</p>
    <div className="space-y-1">
      <NavLink to="/" className={navLinkClass}><Users className="w-4 h-4" /> My Student</NavLink>
      <NavLink to="/calendar" className={navLinkClass}><Calendar className="w-4 h-4" /> Academic Calendar</NavLink>
      <NavLink to="/request-leave" className={navLinkClass}><CalendarClock className="w-4 h-4" /> Request Leave</NavLink>
    </div>
  </div>
)}

            {/* STAFF SPECIFIC LINKS */}
            {isStaff && (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dashboards</p>
                  <div className="space-y-1">
                    {isAdmin && <NavLink to="/admin" className={navLinkClass}><Activity className="w-4 h-4" /> Master Admin</NavLink>}
                    <NavLink to="/teacher" className={navLinkClass}><BookOpen className="w-4 h-4" /> Teacher Desk</NavLink>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Academics</p>
                  <div className="space-y-1">
                    <NavLink to="/calendar" className={navLinkClass}><Calendar className="w-4 h-4" /> Academic Calendar</NavLink>
                    <NavLink to="/lesson-plans" className={navLinkClass}><FileText className="w-4 h-4" /> Lesson Plans</NavLink>
                    <NavLink to="/lesson-templates" className={navLinkClass}><BookTemplate className="w-4 h-4" /> Lesson Templates</NavLink>
                    <NavLink to="/syllabus-status" className={navLinkClass}><BarChart2 className="w-4 h-4" /> Syllabus Status</NavLink>
                    <NavLink to="/gradebook" className={navLinkClass}><GraduationCap className="w-4 h-4" /> Master Gradebook</NavLink>
                    <NavLink to="/attendance" className={navLinkClass}><Calendar className="w-4 h-4" /> Daily Attendance</NavLink>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Conduct</p>
                  <div className="space-y-1">
                    <NavLink to="/log-points" className={navLinkClass}><Award className="w-4 h-4" /> Log Points</NavLink>
                    <NavLink to="/class-summaries" className={navLinkClass}><Trophy className="w-4 h-4" /> Class Summaries</NavLink>
                    <NavLink to="/student-lookup" className={navLinkClass}><Search className="w-4 h-4" /> Student Lookup</NavLink>
                  </div>
                </div>
              </>
            )}

            {/* SHARED COMMUNICATION */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Communication</p>
              <div className="space-y-1">
                <NavLink to="/communication" className={navLinkClass}><PhoneCall className="w-4 h-4" /> Comm. Hub</NavLink>
                <NavLink to="/help-centre" className={navLinkClass}><LifeBuoy className="w-4 h-4" /> Help Centre</NavLink>
              </div>
            </div>

            {/* ADMIN & HOS STRICT CONTROL */}
            {isAdmin && (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">HOS Control</p>
                  <div className="space-y-1">
                    <NavLink to="/leave-approvals" className={navLinkClass}><ShieldCheck className="w-4 h-4" /> Leave Approvals</NavLink>
                    <NavLink to="/monitor-attendance" className={navLinkClass}><Users className="w-4 h-4" /> Monitor Attendance</NavLink>
                    <NavLink to="/school-log-book" className={navLinkClass}><Book className="w-4 h-4" /> School Log Book</NavLink>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administration</p>
                  <div className="space-y-1">
                    <NavLink to="/manage-students" className={navLinkClass}><Shield className="w-4 h-4" /> Manage Students</NavLink>
                    <NavLink to="/manage-teachers" className={navLinkClass}><Briefcase className="w-4 h-4" /> Manage Teachers</NavLink>
                    <NavLink to="/its-audit" className={navLinkClass}><Database className="w-4 h-4" /> ITS Audit</NavLink>
                    <NavLink to="/support-inbox" className={navLinkClass}><Inbox className="w-4 h-4" /> Support Inbox</NavLink>
                    <NavLink to="/system-settings" className={navLinkClass}><Settings className="w-4 h-4" /> System Settings</NavLink>
                    <NavLink to="/staff-onboarding" className={navLinkClass}><Users className="w-4 h-4" /> Bulk Staff Onboarding</NavLink>
                    <NavLink to="/academic-mapping" className={navLinkClass}><BookOpen className="w-4 h-4" /> Academic Mapping</NavLink>
                    <NavLink to="/parent-onboarding" className={navLinkClass}><Link className="w-4 h-4" /> Parent Linking</NavLink>
                  </div>
                </div>
              </>
            )}

            {/* MY WORKSPACE */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">My Workspace</p>
              <div className="space-y-1">
                <NavLink to="/my-history" className={navLinkClass}><History className="w-4 h-4" /> My History</NavLink>
                {isTeacher && <NavLink to="/leave-approvals" className={navLinkClass}><Calendar className="w-4 h-4" /> Request Leave</NavLink>}
              </div>
            </div>

          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-700 bg-school-navy sticky bottom-0">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              {profile.name !== 'Loading...' ? profile.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-white line-clamp-1">{profile.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {profile.role ? profile.role.replace('_', ' ') : 'Loading...'}
              </p>
            </div>
          </div>
          <button className="flex w-full items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2 text-red-400 rounded-md hover:bg-slate-800 transition-colors text-sm mt-1">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 relative overflow-y-auto p-8">
        <Outlet />
        <div className="fixed bottom-6 right-6 flex flex-col gap-3">
          <button className="bg-white p-3 rounded-full shadow-lg text-school-navy hover:bg-slate-50 transition-colors border border-slate-200 cursor-pointer">
            <AlertTriangle className="w-5 h-5" />
          </button>
          <button className="bg-school-yellow p-3 rounded-full shadow-lg text-school-navy hover:bg-yellow-400 transition-colors cursor-pointer">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}