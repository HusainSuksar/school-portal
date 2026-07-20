// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, Users, Calendar, Award, CheckCircle2, 
  MessageSquare, HelpCircle, Settings, LogOut, 
  Menu, X, Shield, FileText, ClipboardList, Briefcase, Search, Book, Inbox, CalendarClock, PhoneCall
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Layout() {
  const [profile, setProfile] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
      }
    }
    getProfile();
  }, []);

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!profile) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-4 border-school-yellow border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const role = profile.role;

  // Define Navigation Items based on Roles
  let navItems = [];

  if (role === 'PARENT') {
    navItems = [
      { label: 'My Student', icon: Users, path: '/' },
      { label: 'Academic Calendar', icon: Calendar, path: '/calendar' },
      { label: 'Request Leave', icon: CalendarClock, path: '/leave-approvals' },
      { label: 'Comm. Hub', icon: PhoneCall, path: '/communication' },
      { label: 'Help Centre', icon: HelpCircle, path: '/support' },
    ];
  } else {
    // Staff, Teachers, HOS, Admins
    navItems = [
      { label: role === 'ADMIN' ? 'Command Center' : 'Teacher Desk', icon: BookOpen, path: '/' },
      { label: 'Academic Calendar', icon: Calendar, path: '/calendar' },
      { label: 'Lesson Plans', icon: FileText, path: '/lesson-plans' },
      { label: 'Lesson Templates', icon: ClipboardList, path: '/lesson-templates' },
      { label: 'Syllabus Status', icon: Book, path: '/syllabus' },
      { label: 'Master Gradebook', icon: Award, path: '/gradebook' },
      { label: 'Daily Attendance', icon: CheckCircle2, path: '/attendance' },
      { label: 'Log Points', icon: Award, path: '/log-points' },
      { label: 'Class Summaries', icon: Users, path: '/summaries' },
      { label: 'Student Lookup', icon: Search, path: '/student-lookup' },
      { label: 'Comm. Hub', icon: PhoneCall, path: '/communication' },
      { label: 'Leave Approvals', icon: CalendarClock, path: '/leave-approvals' },
      { label: 'Monitor Attendance', icon: CheckCircle2, path: '/monitor-attendance' },
    ];

    if (role === 'ADMIN' || role === 'HOS') {
      navItems.push(
        { label: 'School Log Book', icon: Book, path: '/logbook' },
        { label: 'ITS Audit', icon: Shield, path: '/its-audit' },
        { label: 'Support Inbox', icon: Inbox, path: '/support-inbox' }
      );
    }

    if (role === 'ADMIN') {
      navItems.push(
        { label: 'Manage Students', icon: Users, path: '/manage-students' },
        { label: 'Manage Staff', icon: Users, path: '/manage-staff' }
      );
    }

    navItems.push({ label: 'Help Centre', icon: HelpCircle, path: '/support' });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden bg-school-navy text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-school-yellow" />
          <h1 className="font-bold text-lg tracking-wider">Portal</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION (Drawer on Mobile, Fixed on Desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-school-navy text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:min-h-screen
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        {/* Brand Header (Desktop) */}
        <div className="p-6 border-b border-slate-800 hidden md:flex items-center gap-3">
          <div className="p-2 bg-school-yellow/10 rounded-lg text-school-yellow">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-white text-lg tracking-wider">PORTAL</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Academic System</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left ${
                  isActive 
                    ? 'bg-school-yellow text-school-navy shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-school-navy' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Footer Profile & Settings */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-2">
          {role === 'ADMIN' && (
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                location.pathname === '/settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" /> System Settings
            </button>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-school-yellow font-bold flex items-center justify-center shrink-0 border border-slate-700">
                {profile.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{profile.full_name}</p>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{profile.role}</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800/60 shrink-0"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY BACKDROP */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8">
        <Outlet />
      </main>

    </div>
  );
}