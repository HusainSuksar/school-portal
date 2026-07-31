// src/pages/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { BookOpen, Users, CheckCircle2, Award, Clock, AlertTriangle, ChevronRight, Calendar, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('Teacher');
  const [stats, setStats] = useState({ tashjeeGiven: 0, tanbeehGiven: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  
  // Timetable State
  const [timeSlots, setTimeSlots] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [currentDay, setCurrentDay] = useState('');
  const [activeSlotId, setActiveSlotId] = useState(null);
  
  const [currentDateStr] = useState(new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }));

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) setTeacherName(profile.full_name);

        const today = new Date().toISOString().split('T')[0];
        const { data: logs } = await supabase.from('behavior_logs').select('*, students(full_name)').eq('teacher_id', user.id).gte('logged_at', `${today}T00:00:00Z`);

        if (logs) {
          setStats({
            tashjeeGiven: logs.filter(l => l.log_type === 'Tashjee').length,
            tanbeehGiven: logs.filter(l => l.log_type === 'Tanbeeh').length
          });
          setRecentLogs(logs.slice(0, 5).map(log => ({
            id: log.id,
            student: log.students?.full_name || 'Unknown Student',
            type: log.log_type,
            pts: log.points,
            time: new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }

        // --- Fetch Timetable Data ---
        const { data: slots } = await supabase.from('time_slots').select('*').order('sort_order');
        if (slots) setTimeSlots(slots);

        const { data: ttData } = await supabase.from('teacher_timetables').select('*, classes(class_name)').eq('teacher_id', user.id);
        const formatData = {};
        if (ttData) {
          ttData.forEach(entry => {
            formatData[`${entry.day_of_week}_${entry.slot_id}`] = entry;
          });
        }
        setTimetable(formatData);

        // --- Calculate Live Highlight ---
        const now = new Date();
        const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
        setCurrentDay(dayStr);

        const currTime = now.toTimeString().slice(0, 8); // HH:MM:SS
        if (slots) {
          const active = slots.find(s => currTime >= s.start_time && currTime <= s.end_time);
          if (active) setActiveSlotId(active.id);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
    
    // Check every minute to update the active slot highlight automatically
    const interval = setInterval(() => {
      const currTime = new Date().toTimeString().slice(0, 8);
      const active = timeSlots.find(s => currTime >= s.start_time && currTime <= s.end_time);
      setActiveSlotId(active ? active.id : null);
    }, 60000);
    return () => clearInterval(interval);

  }, [timeSlots.length]); // Dependency ensures interval gets the populated array

  const renderCellContent = (day, slot) => {
    if (slot.id === 'P0') return <div className="text-sm font-black text-indigo-700 bg-indigo-50/50 h-full flex items-center justify-center">Dua</div>;
    if (slot.is_break) return null; // Breaks handled by row style

    const entry = timetable[`${day}_${slot.id}`];
    if (!entry) return <div className="text-xs text-slate-300">-</div>;
    
    if (entry.custom_label) {
      return <div className="text-xs font-bold text-amber-700 h-full flex items-center justify-center">{entry.custom_label}</div>;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-sm font-bold text-school-navy">{entry.subject}</span>
        <span className="text-[10px] text-slate-500 font-bold uppercase">{entry.classes?.class_name}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto h-96 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Syncing with database...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. Welcome Banner */}
      <div className="bg-school-navy rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Salaam, {teacherName}</h2>
          <p className="text-slate-300">Here is your academic overview for today.</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 px-6 py-3 rounded-xl flex items-center gap-3 relative z-10">
          <Calendar className="w-5 h-5 text-school-yellow" />
          <span className="font-bold tracking-wide">{currentDateStr}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 2. Live Timetable Card (Spans 3 columns) */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" /> My Weekly Schedule
            </h3>
            {activeSlotId && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Now
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-center border-collapse min-w-[700px]">
              <thead className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-200">
                <tr>
                  <th className="p-3 w-28 bg-slate-50 border-r border-slate-200"></th>
                  {DAYS.map(day => (
                    <th key={day} className={`p-3 font-bold text-sm transition-colors border-l border-slate-100 ${day === currentDay ? 'bg-indigo-50 text-indigo-700 border-b-2 border-b-indigo-500' : 'text-slate-500'}`}>
                      {day}
                      {day === currentDay && <div className="text-[10px] text-indigo-400 uppercase tracking-widest mt-0.5">Today</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => {
                  const isLiveRow = slot.id === activeSlotId;
                  
                  return (
                    <tr key={slot.id} className={`${slot.is_break ? 'bg-slate-50/70' : 'hover:bg-slate-50/30'} ${isLiveRow ? 'bg-indigo-50/20' : ''}`}>
                      <td className={`p-2 border-b border-r border-slate-200 bg-slate-50 relative ${isLiveRow ? 'border-l-4 border-l-emerald-500 text-emerald-700' : 'text-slate-500'}`}>
                        <p className={`font-bold text-sm ${isLiveRow ? 'text-emerald-700' : 'text-school-navy'}`}>{slot.label}</p>
                        <p className="text-[10px] font-medium">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</p>
                      </td>
                      
                      {slot.is_break ? (
                        <td colSpan={5} className="p-2 border-b border-slate-200 text-center bg-slate-50/50">
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{slot.label}</span>
                        </td>
                      ) : (
                        DAYS.map(day => {
                          const isLiveCell = isLiveRow && day === currentDay;
                          return (
                            <td 
                              key={`${day}-${slot.id}`} 
                              className={`p-2 border-b border-l border-slate-100 h-16 transition-all ${isLiveCell ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/30 shadow-sm relative' : ''}`}
                            >
                              {isLiveCell && <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>}
                              {renderCellContent(day, slot)}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Quick Actions & Stats (Right Column) */}
        <div className="lg:col-span-1 space-y-6 flex flex-col h-full">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-xl shadow-md flex flex-col justify-center text-white cursor-pointer hover:shadow-lg transition-shadow group shrink-0">
            <div className="flex justify-between items-center mb-2">
              <CheckCircle2 className="w-6 h-6 text-indigo-200" />
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-bold text-lg">Take Attendance</h3>
            <p className="text-xs text-indigo-200 mt-1">Submit your morning register</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-school-navy flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" /> Today's Logs
              </h3>
            </div>
            
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        log.type === 'Tashjee' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.type === 'Tashjee' ? '+' : '-'}{log.pts}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-school-navy truncate">{log.student}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{log.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full text-center text-slate-400 text-sm font-medium flex flex-col items-center justify-center p-6">
                  <Award className="w-8 h-8 mb-2 opacity-20" />
                  No points logged today.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}