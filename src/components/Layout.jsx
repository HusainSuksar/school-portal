// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import InstallAppButton from './InstallAppButton';
import NotificationBell from './NotificationBell';

import {
  BookOpen, Users, Calendar, Settings, LogOut, HelpCircle, AlertTriangle,
  CheckCircle2, Award, FileText, BookTemplate, BarChart2, Trophy, Search,
  PhoneCall, History, ShieldCheck, Book, Shield, Briefcase, Database, Inbox,
  LifeBuoy, Activity, GraduationCap, Key, Lock, Link, CalendarClock, Menu, X, User,
  CalendarDays, ChevronLeft, ChevronRight, Home, Command
} from 'lucide-react';

export default function Layout() {
  const [profile, setProfile] = useState({ name: 'Loading...', role: '' });
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  // UX States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // Zen Mode for Desktop
  const [isSearchOpen, setIsSearchOpen] = useState(false); // Command Palette
  const [searchQuery, setSearchQuery] = useState('');

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function initUser() {
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
    initUser();

    // Command Palette Keyboard Shortcut (Cmd+K or Ctrl+K)
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu & command palette on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = '/login';
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword.length < 6) return setErrorMsg('Password must be at least 6 characters long.');
    if (newPassword !== confirmPassword) return setErrorMsg('Passwords do not match.');

    setIsUpdating(true);
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) {
      setErrorMsg(authError.message);
      setIsUpdating(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({ requires_password_change: false }).eq('id', user.id);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Dynamic styling for sidebar links
  const navLinkClass = ({ isActive }) =>
    `flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} rounded-xl transition-all duration-200 text-sm font-medium ${
      isActive ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  const isParent = profile.role === 'PARENT';
  const isTeacher = profile.role === 'TEACHER' || profile.role === 'CLASS_TR';
  const isAdmin = profile.role === 'ADMIN' || profile.role === 'HOS';
  const isStaff = isTeacher || isAdmin;

  // Dynamic Breadcrumb Generator
  const getPageTitle = (path) => {
    if (path === '/' || path === '/admin' || path === '/teacher') return 'Overview Dashboard';
    return path.replace('/', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen bg-slate-50 overflow-hidden relative">

      {/* --- PASSWORD RESET MODAL --- */}
      {showPasswordReset && (
        <div className="absolute inset-0 z-[100] bg-school-navy/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-school-navy mb-2">Secure Your Account</h2>
            <p className="text-sm text-slate-500 mb-6">Welcome, {profile.name}! Please change your default password to continue.</p>

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
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="Minimum 6 characters" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <CheckCircle2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" placeholder="Repeat new password" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={handleLogout} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50">Cancel & Logout</button>
                <button type="submit" disabled={isUpdating || !newPassword || !confirmPassword} className="flex-1 bg-school-navy text-white rounded-lg text-sm font-bold hover:bg-slate-800 flex items-center justify-center disabled:opacity-70">{isUpdating ? 'Updating...' : 'Save & Continue'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- GLOBAL COMMAND PALETTE (CMD+K) --- */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-[90] bg-school-navy/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-200" onClick={() => setIsSearchOpen(false)}>
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl border border-white overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 py-4 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input 
                autoFocus 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search students, pages, or commands..." 
                className="flex-1 bg-transparent border-none text-lg text-school-navy placeholder:text-slate-400 focus:outline-none focus:ring-0" 
              />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded">ESC</span>
            </div>
            <div className="p-2 bg-slate-50/50 min-h-[200px] max-h-[60vh] overflow-y-auto">
              {/* Dummy results for visualization - would connect to real search in production */}
              <p className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Quick Actions</p>
              <button onClick={() => {navigate(isAdmin ? '/admin' : isTeacher ? '/teacher' : '/'); setIsSearchOpen(false)}} className="w-full text-left px-3 py-3 hover:bg-white hover:shadow-sm rounded-xl flex items-center gap-3 transition-all"><Home className="w-4 h-4 text-indigo-500"/> <span className="font-bold text-school-navy text-sm">Go to Dashboard</span></button>
              <button onClick={() => {navigate('/help-centre'); setIsSearchOpen(false)}} className="w-full text-left px-3 py-3 hover:bg-white hover:shadow-sm rounded-xl flex items-center gap-3 transition-all"><LifeBuoy className="w-4 h-4 text-emerald-500"/> <span className="font-bold text-school-navy text-sm">Create Support Ticket</span></button>
              {isStaff && <button onClick={() => {navigate('/student-lookup'); setIsSearchOpen(false)}} className="w-full text-left px-3 py-3 hover:bg-white hover:shadow-sm rounded-xl flex items-center gap-3 transition-all"><Search className="w-4 h-4 text-amber-500"/> <span className="font-bold text-school-navy text-sm">Lookup Student</span></button>}
            </div>
          </div>
        </div>
      )}

      {/* --- SMARTPHONE TOP HEADER --- */}
      <div className="md:hidden bg-white px-4 py-3 flex items-center justify-between border-b border-slate-200 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 text-slate-400 hover:text-school-navy hover:bg-slate-50 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">MSB Indore</p>
            <h1 className="font-black text-school-navy text-sm leading-tight truncate max-w-[150px]">{getPageTitle(location.pathname)}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full">
            <Search className="w-5 h-5" />
          </button>
          <div className="bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* --- DESKTOP ZEN-MODE SIDEBAR --- */}
      <aside className={`
        hidden md:flex flex-col bg-school-navy text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out relative z-20 shrink-0
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}>
        {/* Zen Mode Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-indigo-600 text-white p-1 rounded-full shadow-lg hover:bg-indigo-500 transition-transform hover:scale-110 z-50"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className={`p-6 border-b border-slate-800/50 flex items-center shrink-0 h-20 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-school-yellow rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <BookOpen className="w-5 h-5 text-school-navy" />
              </div>
              {!isCollapsed && <h1 className="text-xl font-black text-white tracking-tight">Portal</h1>}
            </div>
          </div>

          <nav className={`p-4 space-y-6 overflow-y-auto flex-1 custom-scrollbar-dark ${isCollapsed ? 'px-2' : ''}`}>
            
            {/* PARENT NAV */}
            {isParent && (
              <div>
                {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Parent Portal</p>}
                <div className="space-y-1">
                  <NavLink to="/" className={navLinkClass} title="My Student"><Users className="w-5 h-5 shrink-0" /> {!isCollapsed && "My Student"}</NavLink>
                  <NavLink to="/calendar" className={navLinkClass} title="Calendar"><Calendar className="w-5 h-5 shrink-0" /> {!isCollapsed && "Academic Calendar"}</NavLink>
                  <NavLink to="/request-leave" className={navLinkClass} title="Request Leave"><CalendarClock className="w-5 h-5 shrink-0" /> {!isCollapsed && "Request Leave"}</NavLink>
                </div>
              </div>
            )}

            {/* STAFF SPECIFIC LINKS */}
            {isStaff && (
              <>
                <div>
                  {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Dashboards</p>}
                  <div className="space-y-1">
                    {isAdmin && <NavLink to="/admin" className={navLinkClass} title="Master Admin"><Activity className="w-5 h-5 shrink-0" /> {!isCollapsed && "Master Admin"}</NavLink>}
                    <NavLink to="/teacher" className={navLinkClass} title="Teacher Desk"><BookOpen className="w-5 h-5 shrink-0" /> {!isCollapsed && "Teacher Desk"}</NavLink>
                  </div>
                </div>

                <div>
                  {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Academics</p>}
                  <div className="space-y-1">
                    <NavLink to="/calendar" className={navLinkClass} title="Calendar"><Calendar className="w-5 h-5 shrink-0" /> {!isCollapsed && "Academic Calendar"}</NavLink>
                    <NavLink to="/lesson-plans" className={navLinkClass} title="Lesson Plans"><FileText className="w-5 h-5 shrink-0" /> {!isCollapsed && "Lesson Plans"}</NavLink>
                    <NavLink to="/lesson-templates" className={navLinkClass} title="Lesson Templates"><BookTemplate className="w-5 h-5 shrink-0" /> {!isCollapsed && "Lesson Templates"}</NavLink>
                    <NavLink to="/syllabus-status" className={navLinkClass} title="Syllabus Status"><BarChart2 className="w-5 h-5 shrink-0" /> {!isCollapsed && "Syllabus Status"}</NavLink>
                    <NavLink to="/gradebook" className={navLinkClass} title="Gradebook"><GraduationCap className="w-5 h-5 shrink-0" /> {!isCollapsed && "Master Gradebook"}</NavLink>
                    <NavLink to="/attendance" className={navLinkClass} title="Attendance"><Calendar className="w-5 h-5 shrink-0" /> {!isCollapsed && "Daily Attendance"}</NavLink>
                  </div>
                </div>

                <div>
                  {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Conduct</p>}
                  <div className="space-y-1">
                    <NavLink to="/log-points" className={navLinkClass} title="Log Points"><Award className="w-5 h-5 shrink-0" /> {!isCollapsed && "Log Points"}</NavLink>
                    <NavLink to="/class-summaries" className={navLinkClass} title="Class Summaries"><Trophy className="w-5 h-5 shrink-0" /> {!isCollapsed && "Class Summaries"}</NavLink>
                    <NavLink to="/student-lookup" className={navLinkClass} title="Student Lookup"><Search className="w-5 h-5 shrink-0" /> {!isCollapsed && "Student Lookup"}</NavLink>
                  </div>
                </div>
              </>
            )}

            {/* SHARED COMMUNICATION */}
            <div>
              {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Communication</p>}
              <div className="space-y-1">
                <NavLink to="/communication" className={navLinkClass} title="Comm. Hub"><PhoneCall className="w-5 h-5 shrink-0" /> {!isCollapsed && "Comm. Hub"}</NavLink>
                <NavLink to="/help-centre" className={navLinkClass} title="Help Centre"><LifeBuoy className="w-5 h-5 shrink-0" /> {!isCollapsed && "Help Centre"}</NavLink>
              </div>
            </div>

            {/* ADMIN STRICT CONTROL */}
            {isAdmin && (
              <>
                <div>
                  {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">HOS Control</p>}
                  <div className="space-y-1">
                    <NavLink to="/timetable-manager" className={navLinkClass} title="Timetable Manager"><CalendarDays className="w-5 h-5 shrink-0" /> {!isCollapsed && "Timetable Manager"}</NavLink>
                    <NavLink to="/leave-approvals" className={navLinkClass} title="Leave Approvals"><ShieldCheck className="w-5 h-5 shrink-0" /> {!isCollapsed && "Leave Approvals"}</NavLink>
                    <NavLink to="/monitor-attendance" className={navLinkClass} title="Monitor Attendance"><Users className="w-5 h-5 shrink-0" /> {!isCollapsed && "Monitor Attendance"}</NavLink>
                    <NavLink to="/school-log-book" className={navLinkClass} title="School Log Book"><Book className="w-5 h-5 shrink-0" /> {!isCollapsed && "School Log Book"}</NavLink>
                  </div>
                </div>
                <div>
                  {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">Administration</p>}
                  <div className="space-y-1">
                    <NavLink to="/manage-students" className={navLinkClass} title="Manage Students"><Shield className="w-5 h-5 shrink-0" /> {!isCollapsed && "Manage Students"}</NavLink>
                    <NavLink to="/manage-teachers" className={navLinkClass} title="Manage Teachers"><Briefcase className="w-5 h-5 shrink-0" /> {!isCollapsed && "Manage Teachers"}</NavLink>
                    <NavLink to="/its-audit" className={navLinkClass} title="ITS Audit"><Database className="w-5 h-5 shrink-0" /> {!isCollapsed && "ITS Audit"}</NavLink>
                    <NavLink to="/support-inbox" className={navLinkClass} title="Support Inbox"><Inbox className="w-5 h-5 shrink-0" /> {!isCollapsed && "Support Inbox"}</NavLink>
                    <NavLink to="/system-settings" className={navLinkClass} title="System Settings"><Settings className="w-5 h-5 shrink-0" /> {!isCollapsed && "System Settings"}</NavLink>
                    <NavLink to="/staff-onboarding" className={navLinkClass} title="Bulk Staff Onboarding"><Users className="w-5 h-5 shrink-0" /> {!isCollapsed && "Staff Onboarding"}</NavLink>
                    <NavLink to="/academic-mapping" className={navLinkClass} title="Academic Mapping"><BookOpen className="w-5 h-5 shrink-0" /> {!isCollapsed && "Academic Mapping"}</NavLink>
                    <NavLink to="/parent-onboarding" className={navLinkClass} title="Parent Linking"><Link className="w-5 h-5 shrink-0" /> {!isCollapsed && "Parent Linking"}</NavLink>
                  </div>
                </div>
              </>
            )}

            {/* MY WORKSPACE */}
            <div>
              {!isCollapsed && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3">My Workspace</p>}
              <div className="space-y-1">
                <NavLink to="/my-history" className={navLinkClass} title="My History"><History className="w-5 h-5 shrink-0" /> {!isCollapsed && "My History"}</NavLink>
                {isTeacher && <NavLink to="/leave-approvals" className={navLinkClass} title="Request Leave"><Calendar className="w-5 h-5 shrink-0" /> {!isCollapsed && "Request Leave"}</NavLink>}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className={`p-4 border-t border-slate-800/50 bg-school-navy shrink-0 transition-all ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold shrink-0 shadow-inner">
                {profile.name !== 'Loading...' ? profile.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{profile.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 truncate">
                  {profile.role ? profile.role.replace('_', ' ') : 'Loading...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold mx-auto mb-4" title={profile.name}>
              {profile.name !== 'Loading...' ? profile.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <NavLink to="/profile" className={navLinkClass} title="My Profile"><User className="w-5 h-5 shrink-0" /> {!isCollapsed && "My Profile"}</NavLink>
          <button onClick={handleLogout} className={`flex w-full items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} text-red-400 rounded-xl hover:bg-slate-800 transition-colors text-sm mt-1 font-bold`} title="Logout">
            <LogOut className="w-5 h-5 shrink-0" /> {!isCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* --- SMARTPHONE SIDE MENU (Secondary Nav) --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-school-navy/40 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-school-navy">Menu</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mt-1">{profile.role?.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            
            {/* Simplified Mobile Menu list using identical structure to desktop, adapted for light theme */}
            <nav className="p-4 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              {/* (We keep the same links here for mobile deep access, but styled for the light background) */}
               {isParent && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">Parent Portal</p>
                    <div className="space-y-1">
                      <NavLink to="/" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Users className="w-5 h-5 shrink-0" /> My Student</NavLink>
                      <NavLink to="/calendar" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Calendar className="w-5 h-5 shrink-0" /> Academic Calendar</NavLink>
                      <NavLink to="/request-leave" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><CalendarClock className="w-5 h-5 shrink-0" /> Request Leave</NavLink>
                    </div>
                  </div>
                )}
                {/* Add standard staff/admin menus for mobile deep dive here if needed. 
                    For brevity and mobile UX, the Bottom Nav handles the core 80% of use cases. */}
                 {isStaff && (
                   <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">Quick Access</p>
                    <div className="space-y-1">
                       {isAdmin && <NavLink to="/admin" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Activity className="w-5 h-5 shrink-0" /> Master Admin</NavLink>}
                       <NavLink to="/teacher" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><BookOpen className="w-5 h-5 shrink-0" /> Teacher Desk</NavLink>
                       <NavLink to="/student-lookup" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Search className="w-5 h-5 shrink-0" /> Student Lookup</NavLink>
                       <NavLink to="/calendar" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Calendar className="w-5 h-5 shrink-0" /> Academic Calendar</NavLink>
                       <NavLink to="/help-centre" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><LifeBuoy className="w-5 h-5 shrink-0" /> Help Centre</NavLink>
                    </div>
                   </div>
                 )}
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3 mt-6">Settings</p>
                    <NavLink to="/profile" className={({isActive}) => `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><User className="w-5 h-5 shrink-0" /> My Profile</NavLink>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50"><LogOut className="w-5 h-5 shrink-0" /> Logout</button>
                 </div>
            </nav>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 relative overflow-y-auto bg-slate-50/50 pb-20 md:pb-0">
        
        {/* Desktop Header / Command Context */}
        <div className="hidden md:flex items-center justify-between p-6 pb-2 sticky top-0 bg-slate-50/80 backdrop-blur-md z-10">
           <div className="flex items-center text-sm font-bold text-slate-400 gap-2">
              <Home className="w-4 h-4" />
              <span>/</span>
              <span className="text-school-navy">{getPageTitle(location.pathname)}</span>
           </div>
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSearchOpen(true)} className="flex items-center gap-3 bg-white border border-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold hover:border-indigo-300 hover:text-indigo-500 shadow-sm transition-all group">
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Search Portal...</span>
                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-500 ml-2">Cmd K</span>
              </button>
              <div className="bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
                <NotificationBell />
              </div>
           </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>

        {/* Floating Action Button (Desktop Only) */}
        <div className="hidden md:flex fixed bottom-6 right-6 flex-col gap-3 z-20">
          <InstallAppButton />
        </div>
      </main>

      {/* --- SMARTPHONE BOTTOM NAVIGATION BAR --- */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 pb-safe">
        <div className="flex justify-around items-center px-2 pt-2 pb-3">
          
          {isParent && (
            <>
              <NavLink to="/" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <Home className={`w-6 h-6 ${location.pathname === '/' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
              </NavLink>
              <NavLink to="/calendar" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <Calendar className={`w-6 h-6 ${location.pathname === '/calendar' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Calendar</span>
              </NavLink>
              <NavLink to="/request-leave" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <CalendarClock className="w-6 h-6" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Leave</span>
              </NavLink>
            </>
          )}

          {isTeacher && !isAdmin && (
             <>
              <NavLink to="/teacher" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <Home className={`w-6 h-6 ${location.pathname === '/teacher' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Desk</span>
              </NavLink>
              <NavLink to="/attendance" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Present</span>
              </NavLink>
              <NavLink to="/log-points" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <Award className="w-6 h-6" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Points</span>
              </NavLink>
            </>
          )}

          {isAdmin && (
             <>
              <NavLink to="/admin" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <Activity className={`w-6 h-6 ${location.pathname === '/admin' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Admin</span>
              </NavLink>
              <NavLink to="/timetable-manager" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <CalendarDays className="w-6 h-6" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Routine</span>
              </NavLink>
              <NavLink to="/help-centre" className={({isActive}) => `flex flex-col items-center gap-1 p-2 w-16 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                <LifeBuoy className={`w-6 h-6 ${location.pathname === '/help-centre' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Support</span>
              </NavLink>
            </>
          )}

          {/* Persistent Search Icon for Mobile Bottom Nav */}
          <button onClick={() => setIsSearchOpen(true)} className="flex flex-col items-center gap-1 p-2 w-16 text-slate-400 hover:text-indigo-600 transition-colors">
             <Command className="w-6 h-6" />
             <span className="text-[9px] font-bold uppercase tracking-wider">Search</span>
          </button>

        </div>
      </div>

    </div>
  );
}