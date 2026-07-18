// src/pages/SyllabusStatus.jsx
import React, { useState, useEffect } from 'react';
import { BarChart2, PlusCircle, BookOpen, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SyllabusStatus() {
  const [userRole, setUserRole] = useState(null);
  const [trackers, setTrackers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [totalUnits, setTotalUnits] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Get Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile) setUserRole(profile.role);

    // 2. Fetch Classes
    const { data: classData } = await supabase.from('classes').select('id, class_name').order('class_name');
    if (classData) setClasses(classData);

    // 3. Fetch Trackers
    const { data: trackerData } = await supabase
      .from('syllabus_tracker')
      .select('*, classes(class_name), profiles(full_name)')
      .order('class_id', { ascending: true });

    if (trackerData) setTrackers(trackerData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTracker = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('syllabus_tracker').insert([{
      class_id: classId,
      subject,
      total_units: parseInt(totalUnits),
      teacher_id: user.id
    }]);

    if (!error) {
      setClassId(''); setSubject(''); setTotalUnits(10);
      fetchData(); // Refresh UI
    } else {
      if (error.code === '23505') {
        alert("A tracker for this subject in this class already exists.");
      } else {
        alert("Failed to initialize syllabus tracker.");
      }
    }
    setIsSubmitting(false);
  };

  const handleUpdateProgress = async (id, currentCompleted, total) => {
    if (currentCompleted >= total) return; // Cannot exceed total
    
    const { error } = await supabase
      .from('syllabus_tracker')
      .update({ 
        completed_units: currentCompleted + 1,
        last_updated: new Date().toISOString()
      })
      .eq('id', id);

    if (!error) fetchData();
  };

  if (isLoading) return <div className="max-w-6xl mx-auto h-96 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // 🔴 Prevent Parents from viewing this page
  if (userRole === 'PARENT') {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500">Syllabus tracking is restricted to teaching faculty.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-indigo-500" />
          Syllabus Progress Tracker
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Monitor curriculum completion rates across all classes and subjects.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Initialization Form */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-500" /> Initialize Subject
            </h3>
          </div>
          
          <form onSubmit={handleCreateTracker} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Class</label>
              <select required value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
                <option value="">-- Select Class --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject Name</label>
              <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Total Units/Chapters</label>
              <input type="number" min="1" required value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-school-navy hover:bg-slate-800 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300">
              {isSubmitting ? 'Initializing...' : 'Track Subject'}
            </button>
          </form>
        </div>

        {/* Right Column: Global Progress Board */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-400" /> Active Syllabus Trackers
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {trackers.length > 0 ? trackers.map(tracker => {
              const percentage = Math.round((tracker.completed_units / tracker.total_units) * 100);
              const isComplete = percentage === 100;
              
              return (
                <div key={tracker.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-school-navy">{tracker.subject}</h4>
                      <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{tracker.classes?.class_name}</span>
                        <span>•</span>
                        <span>Taught by {tracker.profiles?.full_name}</span>
                      </p>
                    </div>
                    
                    {/* Log Progress Button */}
                    {!isComplete && (
                      <button 
                        onClick={() => handleUpdateProgress(tracker.id, tracker.completed_units, tracker.total_units)}
                        className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        + Log Unit
                      </button>
                    )}
                  </div>

                  {/* Progress Bar UI */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Completion Status</span>
                      <span className={isComplete ? 'text-emerald-600' : 'text-school-navy'}>
                        {tracker.completed_units} / {tracker.total_units} Units ({percentage}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : 
                          percentage > 50 ? 'bg-indigo-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {isComplete && (
                    <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2 rounded-lg text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Syllabus Completely Covered
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BookOpen className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium text-sm">No syllabi are currently being tracked.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}