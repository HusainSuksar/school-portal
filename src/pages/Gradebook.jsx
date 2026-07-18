// src/pages/Gradebook.jsx
import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, Save, GraduationCap, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Gradebook() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [currentTerm, setCurrentTerm] = useState('Term 1');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Subjects List (Can be fetched from DB, hardcoded for demonstration)
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography'];

  useEffect(() => {
    async function initializeGradebook() {
      // Fetch Classes
      const { data: classData } = await supabase.from('classes').select('*').order('class_name');
      if (classData) setClasses(classData);

      // Fetch Active Term from System Settings
      const { data: settings } = await supabase.from('system_settings').select('current_term').limit(1).single();
      if (settings) setCurrentTerm(settings.current_term);

      setIsLoading(false);
    }
    initializeGradebook();
  }, []);

  // Fetch students when a class is selected
  useEffect(() => {
    async function loadRoster() {
      if (!selectedClass || !selectedSubject) {
        setStudents([]);
        return;
      }
      setIsLoading(true);

      // 1. Fetch Students
      const { data: roster } = await supabase
        .from('students')
        .select('id, full_name, its_number')
        .eq('class_id', selectedClass)
        .order('full_name');

      // 2. Fetch Existing Grades for this Class, Subject, and Term
      const { data: existingGrades } = await supabase
        .from('grades')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject', selectedSubject)
        .eq('term', currentTerm);

      // 3. Map existing grades into state
      const gradeMap = {};
      if (existingGrades) {
        existingGrades.forEach(g => {
          gradeMap[g.student_id] = {
            numeric_mark: g.numeric_mark || '',
            letter_grade: g.letter_grade || ''
          };
        });
      }

      setStudents(roster || []);
      setGrades(gradeMap);
      setIsLoading(false);
    }
    
    loadRoster();
  }, [selectedClass, selectedSubject, currentTerm]);

  // Determine Grading Logic Based on Class Level (1-4 = Letters, 5+ = Marks)
  const activeClassObj = classes.find(c => c.id === selectedClass);
  // Extract number from string like "Class 3" or "Grade 5"
  const classLevel = activeClassObj ? parseInt(activeClassObj.class_name.replace(/\D/g, '')) || 0 : 0;
  const usesLetterGrades = classLevel >= 1 && classLevel <= 4;
  const usesNumericMarks = classLevel >= 5;

  const handleGradeChange = (studentId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare payload
    const payload = students.map(student => ({
      student_id: student.id,
      class_id: selectedClass,
      subject: selectedSubject,
      term: currentTerm,
      numeric_mark: usesNumericMarks ? (grades[student.id]?.numeric_mark || null) : null,
      letter_grade: usesLetterGrades ? (grades[student.id]?.letter_grade || null) : null,
      teacher_id: user.id
    })).filter(g => g.numeric_mark !== null || g.letter_grade !== null); // Only save rows with actual data

    if (payload.length === 0) {
      setIsSaving(false);
      return;
    }

    // Upsert Grades
    const { error } = await supabase
      .from('grades')
      .upsert(payload, { onConflict: 'student_id, subject, term' });

    if (error) {
      console.error("Grade save error:", error);
      setStatusMsg({ type: 'error', text: 'Failed to save grades. Please try again.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Grades securely locked into the database.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-500" />
            Master Gradebook
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Active Term: <span className="font-bold text-school-navy">{currentTerm}</span></p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
          >
            <option value="">-- Select Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
          
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
          >
            <option value="">-- Select Subject --</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      {/* Grade Entry Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-school-navy flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-400" /> Evaluation Roster
          </h3>
          {students.length > 0 && (
            <button 
              onClick={handleSaveGrades}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 disabled:bg-slate-400"
            >
              <Save className="w-4 h-4" /> 
              {isSaving ? 'Committing...' : 'Lock Grades'}
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : students.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 sticky top-0 shadow-sm z-10">
                  <th className="p-4 font-bold">ITS Number</th>
                  <th className="p-4 font-bold">Student Name</th>
                  <th className="p-4 font-bold text-right">
                    {usesLetterGrades ? 'Letter Grade (A-F)' : 'Numeric Marks (0-100)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-mono text-slate-500">{student.its_number}</td>
                    <td className="p-4 text-sm font-bold text-school-navy">{student.full_name}</td>
                    <td className="p-4 text-right">
                      
                      {/* Dynamic Input based on Class Level Logic */}
                      {usesLetterGrades && (
                        <select
                          value={grades[student.id]?.letter_grade || ''}
                          onChange={(e) => handleGradeChange(student.id, 'letter_grade', e.target.value)}
                          className="w-24 p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center focus:outline-none focus:border-indigo-500 shadow-sm"
                        >
                          <option value="">-</option>
                          <option value="A+">A+</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="F">F</option>
                        </select>
                      )}

                      {usesNumericMarks && (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={grades[student.id]?.numeric_mark || ''}
                          onChange={(e) => handleGradeChange(student.id, 'numeric_mark', e.target.value)}
                          placeholder="0-100"
                          className="w-24 p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-center focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      )}

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-school-navy">Select a Class & Subject</h3>
              <p className="mt-1 text-sm">Use the dropdowns above to load the evaluation roster.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}