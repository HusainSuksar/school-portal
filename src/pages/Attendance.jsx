import React, { useState, useEffect } from 'react';
import { Calendar, Users, Save, CheckCircle2, AlertCircle, Lock, Unlock, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Attendance() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // User & Access State
  const [currentUser, setCurrentUser] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  
  // Active Grid State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); 
  
  // Lock & Override State
  const [isLocked, setIsLocked] = useState(false);
  const [canOverride, setCanOverride] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedDate) {
      loadRosterAndAttendance();
    } else {
      setStudents([]);
      setAttendanceMap({});
      setIsLocked(false);
      setLockInfo(null);
    }
  }, [selectedClassId, selectedDate]);

  const initializeComponent = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single();
    setCurrentUser(profile);

    if (profile.role === 'ADMIN') {
      const { data: allClasses } = await supabase.from('classes').select('id, class_name, class_teacher_id').order('class_name');
      setAssignedClasses(allClasses || []);
    } else {
      const { data: mappings } = await supabase.from('class_subjects').select('class_id, classes(id, class_name, class_teacher_id)').eq('teacher_id', user.id);
      
      const uniqueClasses = [];
      const map = new Map();
      if (mappings) {
        for (const item of mappings) {
          if (!map.has(item.class_id)) {
            map.set(item.class_id, true);
            uniqueClasses.push(item.classes);
          }
        }
      }
      const { data: homeroomClasses } = await supabase.from('classes').select('id, class_name, class_teacher_id').eq('class_teacher_id', user.id);
      if (homeroomClasses) {
        for (const hr of homeroomClasses) {
          if (!map.has(hr.id)) {
            map.set(hr.id, true);
            uniqueClasses.push(hr);
          }
        }
      }
      
      uniqueClasses.sort((a, b) => a.class_name.localeCompare(b.class_name));
      setAssignedClasses(uniqueClasses);
    }
    
    setIsLoading(false);
  };

  const loadRosterAndAttendance = async () => {
    setIsLoading(true);
    setStatusMsg({ type: '', text: '' });
    setIsLocked(false);
    setCanOverride(false);
    setLockInfo(null);

    const activeClass = assignedClasses.find(c => c.id === selectedClassId);
    if (!activeClass || !currentUser) return;

    const { data: roster } = await supabase
      .from('students')
      .select('id, full_name, its_number, parent_id')
      .eq('class_id', selectedClassId)
      .order('full_name');

    const { data: existingRecords } = await supabase
      .from('attendance')
      .select('student_id, status, recorded_by, profiles(full_name), updated_at')
      .eq('class_id', selectedClassId)
      .eq('date', selectedDate);

    const newMap = {};
    
    if (existingRecords && existingRecords.length > 0) {
      existingRecords.forEach(record => {
        newMap[record.student_id] = record.status;
      });
      
      const recorder = existingRecords[0].profiles?.full_name || 'a Teacher';
      const time = new Date(existingRecords[0].updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const recorderId = existingRecords[0].recorded_by;
      
      setLockInfo({ name: recorder, time: time });
      setIsLocked(true);

      if (
        currentUser.id === recorderId || 
        currentUser.id === activeClass.class_teacher_id || 
        currentUser.role === 'ADMIN'
      ) {
        setCanOverride(true);
      }

    } else {
      if (roster) {
        roster.forEach(student => {
          newMap[student.id] = 'Present';
        });
      }
    }

    if (roster) setStudents(roster);
    setAttendanceMap(newMap);
    setIsLoading(false);
  };

  const handleStatusChange = (studentId, status) => {
    if (isLocked) return;
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });
    
    const payload = students.map(student => ({
      student_id: student.id,
      class_id: selectedClassId,
      date: selectedDate,
      status: attendanceMap[student.id] || 'Present',
      recorded_by: currentUser.id,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('attendance').upsert(payload, {
      onConflict: 'student_id, date'
    });

    if (error) {
      console.error("Save Error:", error);
      setStatusMsg({ type: 'error', text: 'Failed to save attendance.' });
    } else {
      setStatusMsg({ type: 'success', text: `Attendance successfully recorded for ${students.length} students.` });
      
      setLockInfo({ name: currentUser.full_name, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      setIsLocked(true);
      setCanOverride(true); 
      
      // --- 🚀 NEW TARGETED NOTIFICATION TRIGGER ---
      // 1. Find all students marked 'Absent'
      const absentStudents = students.filter(student => 
        (attendanceMap[student.id] === 'Absent') && student.parent_id
      );

      // 2. Fire individual push notifications to their respective parents
      if (absentStudents.length > 0) {
        absentStudents.forEach(student => {
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds: [student.parent_id],
              title: 'Absence Alert',
              message: `${student.full_name} was marked absent today (${new Date(selectedDate).toLocaleDateString()}).`,
              url: '/' // Route parent back to dashboard
            })
          }).catch(console.error);
        });
      }
      
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
    
    setIsSaving(false);
  };

  if (isLoading && assignedClasses.length === 0) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 h-[calc(100vh-6rem)] flex flex-col">
      
      <div className="pb-4 border-b border-slate-200 shrink-0">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-500" />
          Daily Attendance Matrix
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Record and override student attendance across your assigned classes.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 shrink-0 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 shrink-0">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">1. Select Target Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-school-navy font-bold py-3 px-4 rounded-xl focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Choose your assigned class --</option>
            {assignedClasses.map(c => (
              <option key={c.id} value={c.id}>{c.class_name}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:w-64">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">2. Select Date</label>
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-school-navy font-bold py-3 px-4 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {selectedClassId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
          
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" /> Class Roster ({students.length})
            </h3>
            
            <div className="flex items-center gap-3">
              {lockInfo && isLocked && (
                <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200">
                  <Lock className="w-4 h-4 text-amber-500" />
                  Recorded by {lockInfo.name} at {lockInfo.time}
                </div>
              )}
              
              {lockInfo && isLocked && canOverride && (
                <button
                  onClick={() => setIsLocked(false)}
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" /> Override Edit
                </button>
              )}

              {!isLocked && (
                <button
                  onClick={handleSaveAttendance}
                  disabled={isSaving || students.length === 0}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                  Save Register
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {isLoading ? (
               <div className="py-12 flex justify-center"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : students.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-4 font-bold w-16 bg-white">No.</th>
                    <th className="p-4 font-bold bg-white">Student Name</th>
                    <th className="p-4 font-bold text-center bg-white">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => {
                    const status = attendanceMap[student.id];
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-4 text-sm font-bold text-school-navy">
                          {student.full_name}
                          <div className="text-xs text-slate-400 font-normal mt-0.5">{student.its_number}</div>
                        </td>
                        <td className="p-4">
                          
                          <div className={`flex justify-center gap-2 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
                            <button
                              onClick={() => handleStatusChange(student.id, 'Present')}
                              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                                status === 'Present' 
                                  ? 'bg-emerald-500 text-white shadow-sm' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'Absent')}
                              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                                status === 'Absent' 
                                  ? 'bg-red-500 text-white shadow-sm' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              onClick={() => handleStatusChange(student.id, 'Late')}
                              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${
                                status === 'Late' 
                                  ? 'bg-amber-500 text-white shadow-sm' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <Clock className="w-3 h-3" /> Late
                            </button>
                          </div>

                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm font-medium">
                No students found in this class roster.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}