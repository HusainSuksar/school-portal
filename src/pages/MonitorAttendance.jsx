// src/pages/MonitorAttendance.jsx
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle, Users, ChevronRight, BarChart3, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MonitorAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allClasses, setAllClasses] = useState([]);
  const [submittedRegisters, setSubmittedRegisters] = useState([]);
  
  const [globalStats, setGlobalStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    percentage: 0
  });

  useEffect(() => {
    async function fetchAttendanceData() {
      setIsLoading(true);
      
      try {
        // 1. Fetch all active classes
        const { data: classData } = await supabase
          .from('classes')
          .select('id, class_name')
          .order('class_name');
          
        if (classData) setAllClasses(classData);

        // 2. Fetch registers and records for the selected date
        // Deep joining classes, profiles (teacher), and attendance_records
        const { data: registersData, error } = await supabase
          .from('attendance_registers')
          .select(`
            id,
            register_date,
            classes (id, class_name),
            profiles (full_name),
            attendance_records (status)
          `)
          .eq('register_date', selectedDate);

        if (error) throw error;

        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLeave = 0;
        let parsedRegisters = [];

        if (registersData) {
          registersData.forEach(reg => {
            let classPresent = 0;
            let classAbsent = 0;
            let classLeave = 0;

            reg.attendance_records.forEach(record => {
              if (record.status === 'Present') { classPresent++; totalPresent++; }
              if (record.status === 'Absent') { classAbsent++; totalAbsent++; }
              if (record.status === 'Leave') { classLeave++; totalLeave++; }
            });

            const classTotal = classPresent + classAbsent + classLeave;
            const classPct = classTotal > 0 ? Math.round((classPresent / classTotal) * 100) : 0;

            parsedRegisters.push({
              classId: reg.classes.id,
              className: reg.classes.class_name,
              submittedBy: reg.profiles.full_name,
              present: classPresent,
              total: classTotal,
              percentage: classPct
            });
          });
          
          setSubmittedRegisters(parsedRegisters);
        }

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

    fetchAttendanceData();
  }, [selectedDate]);

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
          {/* 2. Global Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Present</p>
              <p className="text-2xl font-bold text-emerald-600">{globalStats.present}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Absent</p>
              <p className="text-2xl font-bold text-red-600">{globalStats.absent}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">On Leave</p>
              <p className="text-2xl font-bold text-amber-500">{globalStats.leave}</p>
            </div>
            <div className="bg-indigo-600 p-4 rounded-xl shadow-md flex flex-col items-center justify-center text-center text-white relative overflow-hidden">
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1 relative z-10">Global Average</p>
              <p className="text-3xl font-bold relative z-10">{globalStats.percentage}%</p>
              <BarChart3 className="w-16 h-16 absolute -right-2 -bottom-2 text-indigo-800 opacity-30" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 3. Missing Registers List */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-red-50 rounded-xl border border-red-200 p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-red-200/50">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-800">Pending Registers ({missingClasses.length})</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                  {missingClasses.length > 0 ? (
                    missingClasses.map(cls => (
                      <div key={cls.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center">
                        <span className="font-bold text-school-navy text-sm">{cls.class_name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 px-2 py-1 rounded">Missing</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-red-400 opacity-70">
                      <CheckCircle2 className="w-8 h-8 mb-2" />
                      <p className="text-sm font-bold">100% Submitted</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Submitted Registers Detail */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-school-navy flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Submitted Today ({submittedRegisters.length})
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto">
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