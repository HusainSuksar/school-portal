// src/pages/MonitorAttendance.jsx
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle, Users, ChevronRight, BarChart3, Search, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MonitorAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  
  const [allClasses, setAllClasses] = useState([]);
  const [submittedRegisters, setSubmittedRegisters] = useState([]);
  
  const [globalStats, setGlobalStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    percentage: 0
  });

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  async function fetchAttendanceData() {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'ADMIN' && profile?.role !== 'HOS') {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // 1. Fetch all active classes
      const { data: classData } = await supabase
        .from('classes')
        .select('id, class_name')
        .order('class_name');
        
      if (classData) setAllClasses(classData);

      // 2. Fetch all attendance records for the selected date
      const { data: attendanceRecords, error } = await supabase
        .from('attendance')
        .select('class_id, status, recorded_by, profiles(full_name)')
        .eq('date', selectedDate);

      if (error) throw error;

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLeave = 0;
      
      // Group the flat records by class
      const classMap = {};

      if (attendanceRecords) {
        attendanceRecords.forEach(record => {
          // Global Counters
          if (record.status === 'Present' || record.status === 'Late') totalPresent++;
          else if (record.status === 'Absent') totalAbsent++;
          else if (record.status === 'Excused' || record.status === 'Leave') totalLeave++;

          // Class Grouping
          if (!classMap[record.class_id]) {
            classMap[record.class_id] = {
              classId: record.class_id,
              submittedBy: record.profiles?.full_name || 'Staff Member',
              present: 0,
              total: 0
            };
          }
          
          classMap[record.class_id].total++;
          if (record.status === 'Present' || record.status === 'Late') {
            classMap[record.class_id].present++;
          }
        });
      }

      // Convert the map to the array format the UI expects
      const parsedRegisters = Object.values(classMap).map(reg => {
        const matchedClass = classData?.find(c => c.id === reg.classId);
        return {
          ...reg,
          className: matchedClass ? matchedClass.class_name : 'Unknown Class',
          percentage: reg.total > 0 ? Math.round((reg.present / reg.total) * 100) : 0
        };
      });
        
      setSubmittedRegisters(parsedRegisters);

      // Calculate Global Stats
      const globalTotal = totalPresent + totalAbsent + totalLeave;
      const globalPct = globalTotal > 0 ? Math.round((totalPresent / globalTotal) * 100) : 0;
      
      setGlobalStats({
        present: totalPresent,
        absent: totalAbsent,
        leave: totalLeave,
        percentage: globalPct
      });

    } catch (error) {
      console.error("Error fetching attendance overview:", error);
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!isLoading && !isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500">Attendance monitoring is reserved for school administrators and HOS.</p>
      </div>
    );
  }

  // Identify classes that have NOT submitted attendance yet
  const submittedClassIds = submittedRegisters.map(r => r.classId);
  const missingClasses = allClasses.filter(c => !submittedClassIds.includes(c.id));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* 1. Header & Date Picker */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            Attendance Overview
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Monitor school-wide daily registers and track missing submissions.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
          <CalendarIcon className="w-5 h-5 text-slate-400 ml-2" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]} // Cannot select future dates
            className="p-2 text-sm font-bold text-school-navy focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* 2. Global Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
              <span className="text-3xl font-black text-indigo-600 mt-1 block">{globalStats.percentage}%</span>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Present</span>
              <span className="text-3xl font-black text-emerald-600 mt-1 block">{globalStats.present}</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Absent</span>
              <span className="text-3xl font-black text-red-500 mt-1 block">{globalStats.absent}</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Approved Leaves</span>
              <span className="text-3xl font-black text-blue-600 mt-1 block">{globalStats.leave}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 3. Action Required: Missing Classes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-school-navy">Pending Submissions</h3>
                <span className="ml-auto bg-amber-50 text-amber-700 font-bold text-xs px-2 py-0.5 rounded-full border border-amber-200">
                  {missingClasses.length} Missing
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[400px] flex-1 custom-scrollbar">
                {missingClasses.length > 0 ? (
                  missingClasses.map((cls) => (
                    <div key={cls.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-700">{cls.class_name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-1 rounded">
                        Not Taken
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-slate-600">All Registers Submitted!</p>
                    <p className="text-xs mt-1">Every class has recorded attendance for this date.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Live Register Grid */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-school-navy">Submitted Registers ({submittedRegisters.length})</h3>
              </div>

              <div className="overflow-y-auto max-h-[450px] flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 sticky top-0 shadow-sm">
                      <th className="p-4 font-bold">Class Name</th>
                      <th className="p-4 font-bold">Submitted By</th>
                      <th className="p-4 font-bold text-center">Present / Total</th>
                      <th className="p-4 font-bold text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submittedRegisters.length > 0 ? (
                      submittedRegisters.map((reg, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-sm font-bold text-school-navy">{reg.className}</td>
                          <td className="p-4 text-sm text-slate-600 flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" /> {reg.submittedBy}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-600 text-center">
                            {reg.present} / {reg.total}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              reg.percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                              reg.percentage >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {reg.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 text-sm">
                          No attendance registers have been submitted for this date yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
