// src/pages/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { BookOpen, Users, CheckCircle2, Award, Clock, AlertTriangle, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('Teacher');
  const [stats, setStats] = useState({
    tashjeeGiven: 0,
    tanbeehGiven: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  
  const [currentDate] = useState(new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }));

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Get the current logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Fetch their Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
          
        if (profile) setTeacherName(profile.full_name);

        // 3. Fetch their Behavior Logs for today
        const today = new Date().toISOString().split('T')[0];
        const { data: logs } = await supabase
          .from('behavior_logs')
          .select('*, students(full_name, class_id)')
          .eq('teacher_id', user.id)
          .gte('logged_at', `${today}T00:00:00Z`);

        if (logs) {
          // Calculate stats from the fetched logs
          const tashjee = logs.filter(log => log.log_type === 'Tashjee').length;
          const tanbeeh = logs.filter(log => log.log_type === 'Tanbeeh').length;
          setStats({ tashjeeGiven: tashjee, tanbeehGiven: tanbeeh });
          
          // Format logs for the UI
          const formattedLogs = logs.slice(0, 5).map(log => ({
            id: log.id,
            student: log.students?.full_name || 'Unknown Student',
            type: log.log_type,
            pts: log.points,
            time: new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setRecentLogs(formattedLogs);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto h-96 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Syncing with database...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* 1. Welcome Banner */}
      <div className="bg-school-navy rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Salaam, {teacherName}</h2>
          <p className="text-slate-300">Here is your academic overview for today.</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-3 relative z-10">
          <Calendar className="w-5 h-5 text-school-yellow" />
          <span className="font-bold tracking-wide">{currentDate}</span>
        </div>
        <BookOpen className="w-48 h-48 absolute -right-10 -bottom-10 text-slate-800 opacity-50" />
      </div>

      {/* 2. Quick Actions & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stat 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-b-4 border-b-emerald-500">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tashjee Today</h3>
            <p className="text-2xl font-bold text-emerald-700">+{stats.tashjeeGiven}</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-b-4 border-b-red-500">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanbeeh Today</h3>
            <p className="text-2xl font-bold text-red-700">-{stats.tanbeehGiven}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-xl shadow-md flex flex-col justify-center text-white cursor-pointer hover:shadow-lg transition-shadow group">
          <div className="flex justify-between items-center mb-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-200" />
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="font-bold text-lg">Take Attendance</h3>
          <p className="text-xs text-indigo-200 mt-1">Submit your morning register</p>
        </div>
      </div>

      {/* 3. Recent Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-school-navy flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" /> Recent Points Awarded
          </h3>
        </div>
        
        <div className="divide-y divide-slate-100">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                    log.type === 'Tashjee' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {log.type === 'Tashjee' ? '+' : '-'}{log.pts}
                  </div>
                  <div>
                    <p className="font-bold text-school-navy">{log.student}</p>
                    <p className="text-xs text-slate-400 font-medium">{log.time}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                  log.type === 'Tashjee' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  {log.type}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm font-medium flex flex-col items-center">
              <Award className="w-8 h-8 mb-2 opacity-20" />
              You haven't awarded any points today.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}