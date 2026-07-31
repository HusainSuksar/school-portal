// src/pages/TimetableManager.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, User, Save, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableManager() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [academicMappings, setAcademicMappings] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { day, slot_id }
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function initData() {
      const { data: teachersData } = await supabase.from('profiles').select('id, full_name').in('role', ['TEACHER', 'CLASS_TR']).order('full_name');
      if (teachersData) setTeachers(teachersData);
      
      const { data: slots } = await supabase.from('time_slots').select('*').order('sort_order');
      if (slots) setTimeSlots(slots);
      
      setIsLoading(false);
    }
    initData();
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      loadTeacherTimetable(selectedTeacherId);
    } else {
      setTimetable({});
      setAcademicMappings([]);
    }
  }, [selectedTeacherId]);

  const loadTeacherTimetable = async (teacherId) => {
    setIsLoading(true);
    // 1. Fetch Academic Mapping Sync (classes & subjects this teacher is assigned to)
    const { data: mappings } = await supabase
      .from('class_subjects')
      .select('class_id, classes(class_name), subjects(name)')
      .eq('teacher_id', teacherId);
    if (mappings) setAcademicMappings(mappings);

    // 2. Fetch Existing Timetable
    const { data: existingData } = await supabase
      .from('teacher_timetables')
      .select('*')
      .eq('teacher_id', teacherId);

    const formatData = {};
    if (existingData) {
      existingData.forEach(entry => {
        formatData[`${entry.day_of_week}_${entry.slot_id}`] = entry;
      });
    }
    setTimetable(formatData);
    setIsLoading(false);
  };

  const handleCellClick = (day, slot) => {
    if (slot.is_break || slot.id === 'P0') return; // Breaks and Dua are locked
    setEditingCell({ day, slot_id: slot.id });
  };

  const handleAssign = async (selectionType, mappingData, customVal) => {
    setIsSaving(true);
    const { day, slot_id } = editingCell;
    const key = `${day}_${slot_id}`;

    let payload = {
      teacher_id: selectedTeacherId,
      day_of_week: day,
      slot_id: slot_id,
      class_id: null,
      subject: null,
      custom_label: null
    };

    if (selectionType === 'ACADEMIC') {
      payload.class_id = mappingData.class_id;
      payload.subject = mappingData.subjects.name;
    } else if (selectionType === 'CUSTOM') {
      payload.custom_label = customVal;
    }

    const { data, error } = await supabase
      .from('teacher_timetables')
      .upsert(payload, { onConflict: 'teacher_id, day_of_week, slot_id' })
      .select()
      .single();

    if (!error && data) {
      setTimetable(prev => ({ ...prev, [key]: data }));
    } else if (!error && selectionType === 'CLEAR') {
      // If cleared, delete from db
      await supabase.from('teacher_timetables').delete().eq('teacher_id', selectedTeacherId).eq('day_of_week', day).eq('slot_id', slot_id);
      const newTimetable = { ...timetable };
      delete newTimetable[key];
      setTimetable(newTimetable);
    }
    
    setEditingCell(null);
    setIsSaving(false);
  };

  const renderCellContent = (day, slot) => {
    if (slot.id === 'P0') return <div className="text-xs font-bold text-indigo-700 bg-indigo-50 p-2 rounded">Dua</div>;
    if (slot.is_break) return <div className="text-xs font-bold text-slate-500 bg-slate-100 p-2 rounded">{slot.label}</div>;

    const entry = timetable[`${day}_${slot.id}`];
    if (!entry) return <div className="text-[10px] text-slate-400 font-medium hover:text-indigo-500">Unassigned</div>;
    
    if (entry.custom_label) {
      return <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded">{entry.custom_label}</div>;
    }

    // Academic mapping match
    const clsName = academicMappings.find(m => m.class_id === entry.class_id)?.classes?.class_name || 'Class';
    return (
      <div className="text-xs font-bold text-school-navy bg-indigo-50 border border-indigo-100 p-1.5 rounded flex flex-col">
        <span className="text-indigo-700 truncate">{entry.subject}</span>
        <span className="text-[10px] text-slate-500">{clsName}</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 h-full flex flex-col">
      <div className="pb-4 border-b border-slate-200 shrink-0">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-500" /> Timetable Manager
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Assign academic periods or custom roles. Synced with Academic Mapping.</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 shrink-0 z-20">
        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider block">Target Teacher</label>
        <select
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-school-navy font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:border-indigo-500 min-w-[250px]"
        >
          <option value="">-- Select Teacher --</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </div>

      {selectedTeacherId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                <tr>
                  <th className="p-4 border-b border-r border-slate-200 font-bold text-slate-500 w-32 bg-slate-100">Period</th>
                  {DAYS.map(day => <th key={day} className="p-4 border-b border-slate-200 font-bold text-school-navy text-center w-[16%]">{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot.id} className={slot.is_break ? 'bg-slate-50' : 'hover:bg-slate-50/50'}>
                    <td className="p-3 border-b border-r border-slate-200 bg-slate-50 text-center">
                      <p className="font-bold text-school-navy text-sm">{slot.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</p>
                    </td>
                    {DAYS.map(day => (
                      <td 
                        key={`${day}-${slot.id}`} 
                        onClick={() => handleCellClick(day, slot)}
                        className={`p-2 border-b border-slate-100 text-center align-middle h-16 ${!slot.is_break && slot.id !== 'P0' ? 'cursor-pointer hover:bg-indigo-50/30' : ''}`}
                      >
                        {renderCellContent(day, slot)}
                        
                        {/* INLINE EDIT POPOVER */}
                        {editingCell?.day === day && editingCell?.slot_id === slot.id && (
                          <div className="absolute z-50 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-64 mt-2 -ml-24">
                            <h4 className="font-bold text-school-navy text-sm mb-3">Assign {day} {slot.label}</h4>
                            
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Mapped Subjects</p>
                            <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                              {academicMappings.map((map, idx) => (
                                <button key={idx} onClick={() => handleAssign('ACADEMIC', map)} className="w-full text-left text-xs font-bold text-school-navy bg-slate-50 hover:bg-indigo-50 p-2 rounded border border-slate-100">
                                  {map.subjects.name} ({map.classes.class_name})
                                </button>
                              ))}
                              {academicMappings.length === 0 && <p className="text-xs text-red-500 italic">No mapped subjects. Check Academic Mapping module.</p>}
                            </div>

                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Custom Role</p>
                            <div className="flex gap-1 mb-3">
                              <button onClick={() => handleAssign('CUSTOM', null, 'FREE')} className="flex-1 text-xs font-bold bg-emerald-50 text-emerald-700 py-1.5 rounded border border-emerald-200">FREE</button>
                              <button onClick={() => handleAssign('CUSTOM', null, 'Meeting')} className="flex-1 text-xs font-bold bg-amber-50 text-amber-700 py-1.5 rounded border border-amber-200">Meeting</button>
                            </div>

                            <div className="flex justify-between pt-3 border-t border-slate-100 mt-2">
                              <button onClick={() => setEditingCell(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                              <button onClick={() => handleAssign('CLEAR')} className="text-xs font-bold text-red-500 hover:text-red-700">Clear Cell</button>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}