// src/pages/TakeAttendance.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Users, Calendar, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TakeAttendance() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const [currentDate] = useState(new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  }));

  // 1. Fetch available classes on load
  useEffect(() => {
    async function fetchClasses() {
      const { data } = await supabase.from('classes').select('id, class_name').order('class_name');
      if (data) setClasses(data);
    }
    fetchClasses();
  }, []);

  // 2. Fetch students when a class is selected
  useEffect(() => {
    async function fetchStudentsForClass() {
      if (!selectedClassId) {
        setStudents([]);
        return;
      }
      
      const { data } = await supabase
        .from('students')
        .select('id, full_name, its_number')
        .eq('class_id', selectedClassId)
        .order('full_name');
        
      if (data) {
        setStudents(data);
        // Pre-fill all students as 'Present' by default to save time
        const initialAttendance = {};
        data.forEach(student => {
          initialAttendance[student.id] = 'Present';
        });
        setAttendanceData(initialAttendance);
      }
    }
    
    fetchStudentsForClass();
    setStatusMsg({ type: '', text: '' }); // Reset messages on class change
  }, [selectedClassId]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmit = async () => {
    if (students.length === 0) return;
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // 1. Get the current teacher's user ID
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Create the Master Register for today
      // (Supabase defaults to CURRENT_DATE for register_date)
      const { data: register, error: registerError } = await supabase
        .from('attendance_registers')
        .insert([{ 
          class_id: selectedClassId, 
          teacher_id: user.id 
        }])
        .select()
        .single();

      if (registerError) {
        if (registerError.code === '23505') {
          throw new Error("Attendance for this class has already been submitted today.");
        }
        throw registerError;
      }

      // 3. Prepare and insert all individual student records
      const recordsToInsert = students.map(student => ({
        register_id: register.id,
        student_id: student.id,
        status: attendanceData[student.id]
      }));

      const { error: recordsError } = await supabase
        .from('attendance_records')
        .insert(recordsToInsert);

      if (recordsError) throw recordsError;

      setStatusMsg({ type: 'success', text: 'Register locked and submitted successfully.' });
      
    } catch (error) {
      console.error("Error submitting attendance:", error);
      setStatusMsg({ type: 'error', text: error.message || "Failed to submit attendance." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-500" />
            Daily Attendance Register
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Record and submit student attendance for your assigned classes.</p>
        </div>
        <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-200">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-bold">{currentDate}</span>
        </div>
      </div>

      {/* Class Selection & Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Select Class Register</label>
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
          >
            <option value="">-- Choose a Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.class_name}</option>
            ))}
          </select>
        </div>

        {statusMsg.text && (
          <div className={`flex-1 p-4 rounded-lg flex items-center gap-3 w-full md:w-auto animate-in fade-in ${
            statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <p className="text-sm font-bold">{statusMsg.text}</p>
          </div>
        )}
      </div>

      {/* Roster Table */}
      {selectedClassId && students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
          
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-school-navy">Student Roster ({students.length} Students)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">ITS Number</th>
                  <th className="p-4 font-bold">Student Name</th>
                  <th className="p-4 font-bold text-center">Present</th>
                  <th className="p-4 font-bold text-center">Absent</th>
                  <th className="p-4 font-bold text-center">Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-mono text-slate-500">{student.its_number}</td>
                    <td className="p-4 text-sm font-bold text-school-navy">{student.full_name}</td>
                    
                    {/* Status Radio Buttons */}
                    <td className="p-4 text-center">
                      <input 
                        type="radio" 
                        name={`status-${student.id}`} 
                        checked={attendanceData[student.id] === 'Present'}
                        onChange={() => handleStatusChange(student.id, 'Present')}
                        className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input 
                        type="radio" 
                        name={`status-${student.id}`} 
                        checked={attendanceData[student.id] === 'Absent'}
                        onChange={() => handleStatusChange(student.id, 'Absent')}
                        className="w-5 h-5 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input 
                        type="radio" 
                        name={`status-${student.id}`} 
                        checked={attendanceData[student.id] === 'Leave'}
                        onChange={() => handleStatusChange(student.id, 'Leave')}
                        className="w-5 h-5 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || statusMsg.type === 'success'}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                'Saving to Database...'
              ) : (
                <><Save className="w-4 h-4" /> Lock & Submit Register</>
              )}
            </button>
          </div>
          
        </div>
      )}

      {selectedClassId && students.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center">
          <Users className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-600 text-lg">No Students Found</h3>
          <p className="text-slate-500 text-sm mt-1">There are currently no students enrolled in this class in the database.</p>
        </div>
      )}

    </div>
  );
}