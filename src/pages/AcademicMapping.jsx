// src/pages/AcademicMapping.jsx
import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, CheckCircle2, BookOpen, Users, X, GraduationCap, ChevronRight, Plus, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AcademicMapping() {
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [masterSubjects, setMasterSubjects] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Subject Creation State
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Bulk Matrix State
  const [showBulkMatrix, setShowBulkMatrix] = useState(false);
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [bulkSelectedClasses, setBulkSelectedClasses] = useState([]);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  useEffect(() => {
    if (selectedClass && !showBulkMatrix) {
      fetchClassSubjects(selectedClass.id);
    }
  }, [selectedClass, showBulkMatrix]);

  const fetchGlobalData = async () => {
    setIsLoading(true);
    
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, class_name, class_teacher_id, class_subjects(id, teacher_id)')
      .order('class_name');
      
    const { data: teachersData } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['TEACHER', 'CLASS_TR'])
      .order('full_name');
      
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .order('name');

    if (classesData) setClasses(classesData);
    if (teachersData) setTeachers(teachersData);
    if (subjectsData) setMasterSubjects(subjectsData);
    
    setIsLoading(false);
  };

  const fetchClassSubjects = async (classId) => {
    const { data } = await supabase
      .from('class_subjects')
      .select('id, teacher_id, subjects(id, name)')
      .eq('class_id', classId)
      .order('subjects(name)');
      
    if (data) setClassSubjects(data);
  };

  // --- Core Handlers (with the Optimistic UI Fix) ---
  const handleAssignClassTeacher = async (classId, teacherId) => {
    setIsUpdating(true);
    const val = teacherId === '' ? null : teacherId;
    
    const { error } = await supabase
      .from('classes')
      .update({ class_teacher_id: val })
      .eq('id', classId);
    
    if (error) {
      console.error("Supabase Save Error:", error);
      alert("Failed to save the Class Teacher. Please check database permissions.");
    } else {
      setClasses(classes.map(c => c.id === classId ? { ...c, class_teacher_id: val } : c));
      if (selectedClass?.id === classId) {
        setSelectedClass({ ...selectedClass, class_teacher_id: val });
      }
    }
    setIsUpdating(false);
  };

  const handleAddSubjectToClass = async (e) => {
    const subjectId = e.target.value;
    if (!subjectId) return;
    setIsUpdating(true);

    const { data, error } = await supabase
      .from('class_subjects')
      .insert([{ class_id: selectedClass.id, subject_id: subjectId }])
      .select('id, teacher_id, subjects(id, name)')
      .single();

    if (!error && data) {
      setClassSubjects([...classSubjects, data]);
      fetchGlobalData(); 
    }
    e.target.value = ''; 
    setIsUpdating(false);
  };

  const handleAssignSubjectTeacher = async (classSubjectId, teacherId) => {
    setIsUpdating(true);
    const val = teacherId === '' ? null : teacherId;
    await supabase.from('class_subjects').update({ teacher_id: val }).eq('id', classSubjectId);
    
    setClassSubjects(classSubjects.map(cs => cs.id === classSubjectId ? { ...cs, teacher_id: val } : cs));
    fetchGlobalData(); 
    setIsUpdating(false);
  };

  const handleRemoveSubject = async (classSubjectId) => {
    setIsUpdating(true);
    await supabase.from('class_subjects').delete().eq('id', classSubjectId);
    setClassSubjects(classSubjects.filter(cs => cs.id !== classSubjectId));
    fetchGlobalData(); 
    setIsUpdating(false);
  };

  const handleCreateMasterSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setIsUpdating(true);
    
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ name: newSubjectName.trim() }])
      .select()
      .single();

    if (!error && data) {
      setMasterSubjects([...masterSubjects, data]);
      setNewSubjectName('');
      setIsCreatingSubject(false);
    }
    setIsUpdating(false);
  };

  // --- NEW: Bulk Matrix Logic ---
  const toggleBulkClassSelection = (classId) => {
    if (bulkSelectedClasses.includes(classId)) {
      setBulkSelectedClasses(bulkSelectedClasses.filter(id => id !== classId));
    } else {
      setBulkSelectedClasses([...bulkSelectedClasses, classId]);
    }
  };

  const handleApplyBulkAssignment = async () => {
    if (!bulkSubjectId || bulkSelectedClasses.length === 0) return;
    setIsUpdating(true);

    // 1. Fetch existing mappings for this subject to prevent duplicate errors
    const { data: existingMappings } = await supabase
      .from('class_subjects')
      .select('class_id')
      .eq('subject_id', bulkSubjectId);
      
    const existingClassIds = existingMappings?.map(m => m.class_id) || [];

    // 2. Filter out classes that already have this subject
    const payload = bulkSelectedClasses
      .filter(classId => !existingClassIds.includes(classId))
      .map(classId => ({
        class_id: classId,
        subject_id: bulkSubjectId
      }));

    // 3. Bulk Insert
    if (payload.length > 0) {
      const { error } = await supabase.from('class_subjects').insert(payload);
      if (error) {
        console.error("Bulk Insert Error:", error);
        alert("Failed to apply bulk mapping.");
      }
    }

    // 4. Reset & Refresh
    setBulkSubjectId('');
    setBulkSelectedClasses([]);
    setShowBulkMatrix(false);
    fetchGlobalData();
    if (selectedClass) fetchClassSubjects(selectedClass.id);
    
    setIsUpdating(false);
  };

  const getClassHealth = (cls) => {
    const missingClassTr = !cls.class_teacher_id;
    const noSubjects = !cls.class_subjects || cls.class_subjects.length === 0;
    const missingSubTr = cls.class_subjects?.some(cs => !cs.teacher_id);
    
    if (missingClassTr || missingSubTr || noSubjects) return 'critical';
    return 'healthy';
  };

  const availableSubjects = masterSubjects.filter(
    ms => !classSubjects.some(cs => cs.subjects.id === ms.id)
  );

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 h-[calc(100vh-6rem)] flex flex-col relative">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            Academic Mapping Matrix
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Assign Class Teachers and configure subject workflows.</p>
        </div>
        
        {/* NEW: Bulk Matrix Toggle Button */}
        <button 
          onClick={() => setShowBulkMatrix(true)}
          className="bg-school-navy text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Layers className="w-4 h-4" /> Bulk Subject Matrix
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT PANE */}
        <div className="w-full md:w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-school-navy flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" /> Active Classes
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {classes.map(cls => {
              const health = getClassHealth(cls);
              const isSelected = selectedClass?.id === cls.id;
              
              return (
                <button
                  key={cls.id}
                  onClick={() => { setSelectedClass(cls); setShowBulkMatrix(false); }}
                  className={`w-full text-left p-4 rounded-lg border flex items-center justify-between transition-all ${
                    isSelected && !showBulkMatrix
                      ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' 
                      : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-school-navy">{cls.class_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {health === 'healthy' ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Fully Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Missing Data
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${isSelected && !showBulkMatrix ? 'text-indigo-500' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE (Dynamic: Either Class Config OR Bulk Matrix) */}
        <div className="w-full md:w-2/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
          
          {isUpdating && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* BULK MATRIX VIEW */}
          {showBulkMatrix ? (
            <div className="flex flex-col h-full bg-slate-50">
              <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
                    <Layers className="w-6 h-6 text-indigo-500" /> Bulk Subject Assignment
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Instantly inject a subject into multiple classes at once.</p>
                </div>
                <button onClick={() => setShowBulkMatrix(false)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Step 1: Select Subject */}
                <div className="mb-8">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">1. Select Master Subject</label>
                  <select
                    value={bulkSubjectId}
                    onChange={(e) => setBulkSubjectId(e.target.value)}
                    className="w-full max-w-md bg-white border border-slate-300 text-school-navy font-bold py-3 px-4 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  >
                    <option value="">-- Choose a subject to map --</option>
                    {masterSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Select Classes Grid */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">2. Select Target Classes</label>
                    <button 
                      onClick={() => setBulkSelectedClasses(bulkSelectedClasses.length === classes.length ? [] : classes.map(c => c.id))}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      {bulkSelectedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {classes.map(cls => {
                      const isChecked = bulkSelectedClasses.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          onClick={() => toggleBulkClassSelection(cls.id)}
                          className={`p-3 rounded-lg border text-sm font-bold flex items-center justify-between transition-all ${
                            isChecked 
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                          }`}
                        >
                          {cls.class_name}
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                            {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Apply */}
                <button
                  disabled={!bulkSubjectId || bulkSelectedClasses.length === 0 || isUpdating}
                  onClick={handleApplyBulkAssignment}
                  className="w-full md:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> 
                  Apply Subject to {bulkSelectedClasses.length} {bulkSelectedClasses.length === 1 ? 'Class' : 'Classes'}
                </button>
              </div>
            </div>

          ) : selectedClass ? (
            
            // STANDARD CLASS CONFIG VIEW
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-2xl font-bold text-school-navy mb-4">{selectedClass.class_name}</h2>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Primary Class Teacher</label>
                    <select
                      value={selectedClass.class_teacher_id || ''}
                      onChange={(e) => handleAssignClassTeacher(selectedClass.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-school-navy font-bold py-2 px-3 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Unassigned (Select a Teacher) --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="font-bold text-school-navy text-lg">Curriculum & Subjects</h3>
                  
                  <div className="flex items-center gap-2">
                    {isCreatingSubject ? (
                      <form onSubmit={handleCreateMasterSubject} className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder="e.g. Advanced Arabic"
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          className="border border-slate-300 rounded-lg py-1.5 px-3 text-sm font-bold text-school-navy focus:border-indigo-500 focus:outline-none"
                        />
                        <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors">
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => setIsCreatingSubject(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1.5 rounded-lg transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <select
                          onChange={handleAddSubjectToClass}
                          value=""
                          className="bg-school-navy text-white text-sm font-bold py-2 px-4 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors focus:outline-none"
                        >
                          <option value="" disabled>+ Add Subject to Class</option>
                          {availableSubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => setIsCreatingSubject(true)}
                          className="p-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                          title="Create a new Master Subject"
                        >
                          <Plus className="w-4 h-4" /> New
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {classSubjects.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-500">No subjects configured</p>
                    <p className="text-sm text-slate-400 mt-1">Add a subject from the master list above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classSubjects.map((cs) => (
                      <div key={cs.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 group">
                        <div className="flex-1">
                          <h4 className="font-bold text-school-navy">{cs.subjects.name}</h4>
                        </div>
                        
                        <div className="flex-1">
                          <select
                            value={cs.teacher_id || ''}
                            onChange={(e) => handleAssignSubjectTeacher(cs.id, e.target.value)}
                            className={`w-full border font-bold text-sm py-2 px-3 rounded-lg focus:outline-none transition-colors ${
                              !cs.teacher_id 
                                ? 'bg-red-50 border-red-200 text-red-700 focus:border-red-500' 
                                : 'bg-white border-slate-200 text-school-navy focus:border-indigo-500'
                            }`}
                          >
                            <option value="">-- Missing Teacher --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                          </select>
                        </div>

                        <button 
                          onClick={() => handleRemoveSubject(cs.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Remove subject from this class"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-6">
              <Shield className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-bold text-slate-500">No Class Selected</p>
              <p className="text-sm mt-1">Select a class from the matrix to map it, or use the Bulk Subject Matrix.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}