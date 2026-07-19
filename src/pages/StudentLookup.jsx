// src/pages/StudentLookup.jsx
import React, { useState, useEffect } from 'react';
import { Search, User, Award, CheckCircle2, AlertTriangle, Clock, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function StudentLookup() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentData, setStudentData] = useState({
    attendancePct: 0,
    tashjee: 0,
    tanbeeh: 0,
    recentLogs: []
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // 1. Live Search Function
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchTerm) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const { data } = await supabase
        .from('students')
        .select('id, its_number, full_name, classes(class_name)')
        .or(`full_name.ilike.%${searchTerm}%,its_number.ilike.%${searchTerm}%`)
        .limit(10);
        
      if (data) setSearchResults(data);
      setIsSearching(false);
    }, 300); // 300ms debounce to prevent spamming the database

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // 2. Fetch Complete Student Profile
  const loadStudentProfile = async (student) => {
    setSelectedStudent(student);
    setIsLoadingProfile(true);
    setSearchTerm(''); // Clear search bar
    setSearchResults([]); // Hide dropdown

    try {
      // Fetch Attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', student.id);
        
      let attPct = 100;
      if (attendance && attendance.length > 0) {
        const presentOrLate = attendance.filter(r => r.status === 'Present' || r.status === 'Late').length;
        attPct = Math.round((presentOrLate / attendance.length) * 100);
      }

      // Fetch Behavior Logs
      const { data: logs } = await supabase
        .from('behavior_logs')
        .select('log_type, points, reason, logged_at, profiles(full_name)')
        .eq('student_id', student.id)
        .order('logged_at', { ascending: false });

      let tPts = 0;
      let bPts = 0;
      let recent = [];

      if (logs) {
        logs.forEach(log => {
          if (log.log_type === 'Tashjee') tPts += log.points;
          if (log.log_type === 'Tanbeeh') bPts += log.points;
        });
        recent = logs.slice(0, 10); // Keep last 10 logs
      }

      setStudentData({
        attendancePct: attPct,
        tashjee: tPts,
        tanbeeh: bPts,
        recentLogs: recent
      });

    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* 1. Page Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-500" />
            Student Lookup
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Search the master directory for a comprehensive 360° student view.</p>
        </div>
        
        <div className="relative w-full md:w-96 z-50">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Enter ITS number or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {searchResults.map(student => (
                <div 
                  key={student.id} 
                  onClick={() => loadStudentProfile(student)}
                  className="p-4 flex items-center justify-between hover:bg-indigo-50 cursor-pointer transition-colors group"
                >
                  <div>
                    <p className="font-bold text-school-navy">{student.full_name}</p>
                    <p className="text-xs text-slate-500 font-medium">{student.its_number} • {student.classes?.class_name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. The 360 Profile View */}
      {selectedStudent && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          
          {/* Identity Card */}
          <div className="bg-school-navy rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 relative z-10 shadow-inner">
              <span className="text-2xl font-bold text-slate-300">{selectedStudent.full_name.charAt(0)}</span>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold">{selectedStudent.full_name}</h2>
              <p className="text-slate-300 font-medium mt-1 flex items-center gap-2">
                <span className="bg-slate-800/50 px-2 py-1 rounded text-xs border border-slate-700">{selectedStudent.its_number}</span>
                {selectedStudent.classes?.class_name}
              </p>
            </div>
            <BookOpen className="w-48 h-48 absolute -right-10 -bottom-10 text-slate-800 opacity-50" />
          </div>

          {isLoadingProfile ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Analytics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-indigo-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Attendance Rate</h3>
                  <p className="text-3xl font-bold text-school-navy">{studentData.attendancePct}%</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-emerald-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Tashjee</h3>
                  <p className="text-3xl font-bold text-emerald-700">+{studentData.tashjee}</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-red-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Tanbeeh</h3>
                  <p className="text-3xl font-bold text-red-700">-{studentData.tanbeeh}</p>
                </div>
              </div>

              {/* Comprehensive Log History */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-school-navy flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" /> Disciplinary & Behavioral Record
                  </h3>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {studentData.recentLogs.length > 0 ? (
                    studentData.recentLogs.map((log, index) => (
                      <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                            log.log_type === 'Tashjee' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.log_type === 'Tashjee' ? '+' : '-'}{log.points}
                          </div>
                          <div>
                            <p className="font-bold text-school-navy">{log.reason}</p>
                            <p className="text-xs text-slate-400 font-medium">Logged by {log.profiles?.full_name} • {new Date(log.logged_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                          log.log_type === 'Tashjee' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {log.log_type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center">
                      <User className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium">No behavioral records found for this student.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Initial Empty State */}
      {!selectedStudent && !isSearching && !searchTerm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
          <Search className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Search the Directory</h3>
          <p className="text-slate-500 mt-2 max-w-md">Use the search bar above to instantly pull up a student's attendance records, point history, and behavioral standing.</p>
        </div>
      )}
      
    </div>
  );
}