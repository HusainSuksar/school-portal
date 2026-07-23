// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Users, Activity, ShieldAlert, CheckCircle2, AlertTriangle, TrendingUp, Server, Clock, Database, Inbox, Globe, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalStudents: 0,
    attendanceToday: 0,
    openTickets: 0,
    tashjeeToday: 0,
    tanbeehToday: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);

  const [currentDate] = useState(new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }));

  useEffect(() => {
    async function fetchGlobalStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Security Checkpoint: Verify they are an ADMIN or HOS
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'ADMIN' && profile?.role !== 'HOS') {
          setIsAuthorized(false);
          setIsLoading(false);
          return; // Stop execution
        }

        const today = new Date().toISOString().split('T')[0];
        
        // 1. Total Students
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        // 2. Open Support Tickets
        const { count: ticketCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Open');

        // 3. Today's Behavior Points
        const { data: pointsToday } = await supabase
          .from('behavior_logs')
          .select('log_type, points, reason, logged_at, students(full_name), profiles(full_name)')
          .gte('logged_at', `${today}T00:00:00Z`)
          .order('logged_at', { ascending: false });

        let tashjee = 0;
        let tanbeeh = 0;
        if (pointsToday) {
          pointsToday.forEach(log => {
            if (log.log_type === 'Tashjee') tashjee++;
            if (log.log_type === 'Tanbeeh') tanbeeh++;
          });
          setRecentLogs(pointsToday.slice(0, 5));
        }

        // 4. Today's Attendance Percentage
        // The Corrected Logic for AdminDashboard:
const { data: attendanceToday } = await supabase
  .from('attendance')
  .select('status')
  .eq('date', today);

let attPercentage = 0;
if (attendanceToday && attendanceToday.length > 0) {
  const attendedCount = attendanceToday.filter(r => r.status === 'Present' || r.status === 'Late').length;
  attPercentage = Math.round((attendedCount / attendanceToday.length) * 100);
}

        setGlobalStats({
          totalStudents: studentCount || 0,
          openTickets: ticketCount || 0,
          tashjeeToday: tashjee,
          tanbeehToday: tanbeeh,
          attendanceToday: attPercentage
        });

      } catch (error) {
        console.error("Error fetching global stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGlobalStats();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Strict visual block if they bypass the router
  if (!isAuthorized) {
    return (
      <div className="max-w-6xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500 mt-2">You do not have the required Administrator clearance to view this module.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ... [Rest of your AdminDashboard return statement remains exactly the same] ... */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            Master Administration
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Global system overview and real-time operational metrics.</p>
        </div>
        <div className="bg-school-navy text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm">
          <Clock className="w-4 h-4 text-school-yellow" />
          <span className="text-sm font-bold tracking-wide">{currentDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-indigo-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Population</h3>
          <p className="text-3xl font-bold text-school-navy">{globalStats.totalStudents} <span className="text-lg text-slate-400 font-medium">Students</span></p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Global Attendance</h3>
          <p className="text-3xl font-bold text-school-navy">{globalStats.attendanceToday}%</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-amber-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Points Logged Today</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-emerald-600">+{globalStats.tashjeeToday}</p>
            <span className="text-slate-300">/</span>
            <p className="text-xl font-bold text-red-500">-{globalStats.tanbeehToday}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-red-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            {globalStats.openTickets > 0 && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Action Required</h3>
          <p className="text-3xl font-bold text-school-navy">{globalStats.openTickets} <span className="text-lg text-slate-400 font-medium">Tickets</span></p>
        </div>
      </div>

      
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Coordinators</p>
                <p className="text-2xl font-bold text-emerald-400">21</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">States Online</p>
                <p className="text-2xl font-bold text-emerald-400">29</p>
              </div>
              <div className="col-span-2 pt-4 border-t border-slate-700 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Database Status</p>
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Supabase Connected
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" /> Live Behavior Log
            </h3>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-center">
            <div className="space-y-6">
              {recentLogs.length > 0 ? (
                recentLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-4 relative">
                    {index !== recentLogs.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-[-24px] w-0.5 bg-slate-100"></div>
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      log.log_type === 'Tashjee' ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'
                    }`}>
                      {log.log_type === 'Tashjee' ? <TrendingUp className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div className="pt-2">
                      <p className="text-sm font-bold text-slate-700">
                        {log.profiles?.full_name} awarded {log.log_type} to {log.students?.full_name}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {new Date(log.logged_at).toLocaleTimeString()} • {log.reason}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 text-sm">No behavior points logged today yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}