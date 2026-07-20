// src/pages/LogPoints.jsx
import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, Search, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LogPoints() {
  const [students, setStudents] = useState([]);
  const [pointRules, setPointRules] = useState({ Tashjee: [], Tanbeeh: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [logType, setLogType] = useState('Tashjee');
  const [selectedReason, setSelectedReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      // 1. Fetch Students
      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, its_number, classes(class_name)')
        .order('full_name');
      if (studentData) setStudents(studentData);

      // 2. Fetch Dynamic Point Rules
      const { data: rulesData } = await supabase
        .from('point_rules')
        .select('*')
        .order('points', { ascending: false });

      if (rulesData) {
        const rules = { Tashjee: [], Tanbeeh: [] };
        rulesData.forEach(r => rules[r.type].push(r));
        setPointRules(rules);
      }
    }
    loadData();
  }, []);

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.its_number.includes(searchTerm)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedReason) return;
    
    setIsSubmitting(true);
    
    const reasonData = pointRules[logType].find(opt => opt.reason === selectedReason);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('behavior_logs').insert([{ 
      student_id: selectedStudent.id,
      teacher_id: user.id,
      log_type: logType,
      points: reasonData.points,
      reason: selectedReason
    }]);

    setIsSubmitting(false);

    if (error) {
      alert("Failed to log points.");
    } else {
      setSuccessMsg(`Successfully awarded ${logType} to ${selectedStudent.full_name}!`);
      setSelectedStudent(null);
      setSelectedReason('');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-500" />
            Log Behavior Points
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Award Tashjee or Tanbeeh points to students.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-bold text-emerald-800">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Student Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy mb-3">1. Select Student</h3>
            <div className="relative">
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
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 custom-scrollbar">
            {filteredStudents.map(student => (
              <div 
                key={student.id} 
                onClick={() => setSelectedStudent(student)}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 ${
                  selectedStudent?.id === student.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-school-navy">{student.full_name}</p>
                  <p className="text-xs text-slate-400">{student.classes?.class_name} • ITS: {student.its_number}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy">2. Award Points</h3>
          </div>
          
          {selectedStudent ? (
            <form onSubmit={handleSubmit} className="p-6 flex flex-col h-full">
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Selected Student</p>
                <p className="text-lg font-bold text-indigo-700">{selectedStudent.full_name}</p>
              </div>

              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                  type="button"
                  onClick={() => { setLogType('Tashjee'); setSelectedReason(''); }}
                  className={`py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border transition-colors ${
                    logType === 'Tashjee' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Award className="w-4 h-4" /> Appreciative
                </button>
                <button 
                  type="button"
                  onClick={() => { setLogType('Tanbeeh'); setSelectedReason(''); }}
                  className={`py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border transition-colors ${
                    logType === 'Tanbeeh' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" /> Behavioral
                </button>
              </div>

              {/* Reason Dropdown */}
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Reason</label>
                <select 
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  required
                >
                  <option value="" disabled>-- Select a reason --</option>
                  {pointRules[logType].map((opt, idx) => (
                    <option key={idx} value={opt.reason}>
                      {opt.reason} ({logType === 'Tashjee' ? '+' : '-'}{opt.points} PTS)
                    </option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || !selectedReason}
                className={`w-full py-4 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-auto ${
                  logType === 'Tashjee' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300' 
                    : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-300'
                }`}
              >
                {isSubmitting ? 'Logging to Database...' : `Award ${logType} Points`}
              </button>
            </form>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <User className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Select a student from the list to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}