// src/pages/ManageStudents.jsx
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, CheckCircle2, AlertCircle, Trash2, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ManageStudents() {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'enrollment', 'migration'
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State: Enrollment
  const [itsNumber, setItsNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [classId, setClassId] = useState('');
  
  // Form State: Migration
  const [sourceClass, setSourceClass] = useState('');
  const [targetClass, setTargetClass] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const fetchData = async () => {
    setIsLoading(true);
    const { data: classData } = await supabase.from('classes').select('*').order('class_name');
    if (classData) setClasses(classData);

    const { data: studentData } = await supabase.from('students').select('id, its_number, full_name, classes(class_name), class_id').order('full_name');
    if (studentData) setStudents(studentData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    if (!/^\d{8}$/.test(itsNumber.trim())) {
      setStatusMsg({ type: 'error', text: 'ITS Number must be exactly 8 digits containing only numbers.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('students').insert([{ its_number: itsNumber.trim(), full_name: fullName, class_id: classId }]);
      if (error) throw error;

      setStatusMsg({ type: 'success', text: `${fullName} has been successfully enrolled.` });
      setItsNumber(''); setFullName(''); setClassId('');
      fetchData();
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (error) {
      setStatusMsg({ type: 'error', text: error.code === '23505' ? 'Student with this ITS already exists.' : 'Failed to enroll student.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMigration = async (e) => {
    e.preventDefault();
    if (!sourceClass || !targetClass || sourceClass === targetClass) return;
    
    const studentsToMove = students.filter(s => s.class_id === sourceClass).length;
    if (studentsToMove === 0) {
      setStatusMsg({ type: 'error', text: 'No students found in the source class.' });
      return;
    }

    if (!window.confirm(`Are you sure you want to move ${studentsToMove} students to a new class?`)) return;

    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    const { error } = await supabase.from('students').update({ class_id: targetClass }).eq('class_id', sourceClass);

    if (error) {
      setStatusMsg({ type: 'error', text: 'Failed to migrate students.' });
    } else {
      setStatusMsg({ type: 'success', text: `Successfully migrated ${studentsToMove} students.` });
      setSourceClass(''); setTargetClass('');
      fetchData();
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the system? This deletes their attendance and behavior records.`)) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) fetchData();
  };

  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.its_number.includes(searchTerm));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" /> Manage Students
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Enroll students, run year-end migrations, and manage the directory.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-fit">
        <button onClick={() => { setActiveTab('directory'); setStatusMsg({type: '', text: ''}); }} className={`flex-1 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'directory' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Search className="w-4 h-4" /> Directory
        </button>
        <button onClick={() => { setActiveTab('enrollment'); setStatusMsg({type: '', text: ''}); }} className={`flex-1 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'enrollment' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <UserPlus className="w-4 h-4" /> Enrollment
        </button>
        <button onClick={() => { setActiveTab('migration'); setStatusMsg({type: '', text: ''}); }} className={`flex-1 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'migration' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ArrowRightLeft className="w-4 h-4" /> Batch Migrate
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 min-h-[500px]">
        {activeTab === 'directory' && (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-school-navy">Master Directory ({students.length})</h3>
              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by name or ITS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="h-64 flex items-center justify-center"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 sticky top-0">
                      <th className="p-4 font-bold">ITS Number</th>
                      <th className="p-4 font-bold">Student Name</th>
                      <th className="p-4 font-bold">Assigned Class</th>
                      <th className="p-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-mono text-slate-500">{student.its_number}</td>
                        <td className="p-4 text-sm font-bold text-school-navy">{student.full_name}</td>
                        <td className="p-4 text-sm text-slate-600"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium text-xs">{student.classes?.class_name || 'Unassigned'}</span></td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDelete(student.id, student.full_name)} className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'enrollment' && (
          <form onSubmit={handleEnroll} className="max-w-lg space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">ITS Number</label>
              <input type="text" required value={itsNumber} onChange={(e) => setItsNumber(e.target.value)} placeholder="e.g. 50000004" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Student's official name" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Assign to Class</label>
              <select required value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer">
                <option value="" disabled>-- Select a Class --</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-school-navy hover:bg-slate-800 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300">
              {isSubmitting ? 'Processing...' : 'Enroll Student'}
            </button>
          </form>
        )}

        {activeTab === 'migration' && (
          <div className="max-w-2xl">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">Warning: Batch migration instantly moves all students from the source class into the destination class. This action is irreversible.</p>
            </div>
            <form onSubmit={handleMigration} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">1. Source Class (Move From)</label>
                  <select required value={sourceClass} onChange={(e) => setSourceClass(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="" disabled>-- Select Source --</option>
                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name} ({students.filter(s => s.class_id === cls.id).length} students)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">2. Destination Class (Move To)</label>
                  <select required value={targetClass} onChange={(e) => setTargetClass(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="" disabled>-- Select Target --</option>
                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting || !sourceClass || !targetClass} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300 flex justify-center items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> {isSubmitting ? 'Migrating...' : 'Execute Class Migration'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}