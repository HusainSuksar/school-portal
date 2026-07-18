// src/pages/ManageStudents.jsx
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [itsNumber, setItsNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [classId, setClassId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // 1. Fetch Students & Classes
  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch Classes for the dropdown
    const { data: classData } = await supabase.from('classes').select('*').order('class_name');
    if (classData) setClasses(classData);

    // Fetch Students for the directory
    const { data: studentData } = await supabase
      .from('students')
      .select('id, its_number, full_name, classes(class_name)')
      .order('full_name');
      
    if (studentData) setStudents(studentData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Handle Enrollment
  const handleEnroll = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('students')
        .insert([{ 
          its_number: itsNumber, 
          full_name: fullName, 
          class_id: classId 
        }]);

      if (error) {
        if (error.code === '23505') throw new Error("A student with this ITS number already exists.");
        throw error;
      }

      setStatusMsg({ type: 'success', text: `${fullName} has been successfully enrolled.` });
      
      // Reset form
      setItsNumber('');
      setFullName('');
      setClassId('');
      
      // Refresh the directory
      fetchData();
      
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);

    } catch (error) {
      console.error("Enrollment error:", error);
      setStatusMsg({ type: 'error', text: error.message || 'Failed to enroll student.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Deletion
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the system? This will also delete their attendance and behavior records.`)) return;
    
    const { error } = await supabase.from('students').delete().eq('id', id);
    
    if (error) {
      alert("Failed to delete student.");
    } else {
      fetchData(); // Refresh list
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.its_number.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" />
          Manage Students
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Enroll new students and manage the master directory.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Enrollment Form */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" /> New Enrollment
            </h3>
          </div>
          
          <form onSubmit={handleEnroll} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ITS Number</label>
              <input 
                type="text" 
                required
                value={itsNumber}
                onChange={(e) => setItsNumber(e.target.value)}
                placeholder="e.g. 50000004"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Student's official name"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Assign to Class</label>
              <select 
                required
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="" disabled>-- Select a Class --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 bg-school-navy hover:bg-slate-800 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300"
            >
              {isSubmitting ? 'Processing...' : 'Enroll Student'}
            </button>
          </form>
        </div>

        {/* Right Column: Live Directory */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-school-navy">Master Directory ({students.length})</h3>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name or ITS..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 sticky top-0 shadow-sm">
                    <th className="p-4 font-bold">ITS Number</th>
                    <th className="p-4 font-bold">Student Name</th>
                    <th className="p-4 font-bold">Assigned Class</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-mono text-slate-500">{student.its_number}</td>
                        <td className="p-4 text-sm font-bold text-school-navy">{student.full_name}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium text-xs">
                            {student.classes?.class_name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDelete(student.id, student.full_name)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                            title="Remove Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-400 text-sm">
                        No students found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}