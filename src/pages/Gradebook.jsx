import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Gradebook() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // Teacher's specific assignments
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  
  // Active Grading Grid Data
  const [students, setStudents] = useState([]);
  const [gradesMap, setGradesMap] = useState({}); // { student_id: value }

  useEffect(() => {
    fetchTeacherAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      loadRosterAndGrades();
    } else {
      setStudents([]);
      setGradesMap({});
    }
  }, [selectedAssignmentId, selectedTerm]);

  const fetchTeacherAssignments = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Fetch ONLY the classes & subjects mapped to this specific teacher
    const { data: teacherMappings } = await supabase
      .from('class_subjects')
      .select(`
        id,
        class_id,
        subject_id,
        classes ( class_name ),
        subjects ( name )
      `)
      .eq('teacher_id', user.id)
      .order('classes(class_name)');

    if (teacherMappings) {
      setAssignments(teacherMappings);
    }
    setIsLoading(false);
  };

  const loadRosterAndGrades = async () => {
    // 1. SAFETY GUARD: If assignment data isn't fully ready yet, abort query immediately!
    if (!selectedAssignmentId) return;
    
    const activeAssignment = assignments.find(a => a.id === selectedAssignmentId);
    if (!activeAssignment || !activeAssignment.subject_id || !activeAssignment.class_id) return;

    setIsLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // 2. Fetch the students for this class
      const { data: roster, error: rosterError } = await supabase
        .from('students')
        .select('id, full_name, its_number')
        .eq('class_id', activeAssignment.class_id)
        .order('full_name');

      if (rosterError) throw rosterError;

      // 3. Fetch existing grades for this term
      const { data: existingGrades, error: gradesError } = await supabase
        .from('grades')
        .select('student_id, numeric_mark, letter_grade')
        .eq('subject_id', activeAssignment.subject_id)
        .eq('term', selectedTerm);

      if (gradesError) throw gradesError;

      // Map existing grades to our local state
      const newGradesMap = {};
      if (existingGrades) {
        existingGrades.forEach(g => {
          newGradesMap[g.student_id] = g.letter_grade || g.numeric_mark || '';
        });
      }

      if (roster) setStudents(roster);
      setGradesMap(newGradesMap);
    } catch (err) {
      console.error("Gradebook fetch execution failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeChange = (studentId, value) => {
    setGradesMap(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });
    
    const { data: { user } } = await supabase.auth.getUser();
    const activeAssignment = assignments.find(a => a.id === selectedAssignmentId);
    
    if (!activeAssignment || !user) {
      setIsSaving(false);
      return;
    }

    // Determine the grading system for the payload
    const classLevel = parseInt(activeAssignment.classes.class_name.match(/\d+/)?.[0] || '0', 10);
    const isLetterGrading = classLevel >= 1 && classLevel <= 4;

    // Build the bulk upsert payload
    const payload = students.map(student => {
      const rawValue = gradesMap[student.id];
      const dataRow = {
        student_id: student.id,
        subject_id: activeAssignment.subject_id,
        teacher_id: user.id,
        term: selectedTerm,
      };

      if (isLetterGrading) {
        dataRow.letter_grade = rawValue || null;
        dataRow.numeric_mark = null;
      } else {
        dataRow.numeric_mark = rawValue ? parseInt(rawValue, 10) : null;
        dataRow.letter_grade = null;
      }
      return dataRow;
    });

    // We only want to save rows where the teacher actually entered something
    const filteredPayload = payload.filter(p => p.letter_grade !== null || p.numeric_mark !== null);

    if (filteredPayload.length === 0) {
      setStatusMsg({ type: 'error', text: 'No grades entered to save.' });
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from('grades').upsert(filteredPayload, {
      onConflict: 'student_id, subject_id, term'
    });

    if (error) {
      console.error("Save Error:", error);
      setStatusMsg({ type: 'error', text: 'Failed to save grades. Please try again.' });
    } else {
      setStatusMsg({ type: 'success', text: `Successfully saved grades for ${filteredPayload.length} students.` });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
    
    setIsSaving(false);
  };

  // --- Dynamic UI Helpers ---
  const activeAssignment = assignments.find(a => a.id === selectedAssignmentId);
  const classLevel = activeAssignment ? parseInt(activeAssignment.classes.class_name.match(/\d+/)?.[0] || '0', 10) : 0;
  const isLetterGrading = classLevel >= 1 && classLevel <= 4;

  if (isLoading && assignments.length === 0) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-500" />
          Master Gradebook
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Select an assigned subject and term to input student grades.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      {/* Workspace Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">1. Select Target Subject</label>
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-school-navy font-bold py-3 px-4 rounded-xl focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Choose your assigned class --</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>{a.classes.class_name} • {a.subjects.name}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:w-64">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">2. Select Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-school-navy font-bold py-3 px-4 rounded-xl focus:outline-none focus:border-indigo-500"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Spreadsheet Input Grid */}
      {selectedAssignmentId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" /> Class Roster ({students.length})
            </h3>
            
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider ${isLetterGrading ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {isLetterGrading ? 'Letter Grading Active' : 'Numeric Marks Active'}
              </span>
              <button
                onClick={handleSaveGrades}
                disabled={isSaving || students.length === 0}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                Save Roster
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
               <div className="py-12 flex justify-center"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : students.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-4 font-bold w-16">No.</th>
                    <th className="p-4 font-bold">Student Name</th>
                    <th className="p-4 font-bold">ITS Number</th>
                    <th className="p-4 font-bold text-right w-48">{isLetterGrading ? 'Letter Grade' : 'Numeric Mark (%)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-4 text-sm font-bold text-school-navy">{student.full_name}</td>
                      <td className="p-4 text-sm text-slate-500">{student.its_number}</td>
                      <td className="p-4 text-right">
                        
                        {/* THE DYNAMIC INPUT */}
                        {isLetterGrading ? (
                          <select
                            value={gradesMap[student.id] || ''}
                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500 text-center"
                          >
                            <option value="">--</option>
                            <option value="A+">A+</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="F">F</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            value={gradesMap[student.id] || ''}
                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500 text-center"
                          />
                        )}

                      </td>
                    </tr>
                  ))}
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