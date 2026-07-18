// src/pages/LessonPlans.jsx
import React, { useState, useEffect } from 'react';
import { FileText, PlusCircle, CheckCircle2, Clock, BookOpen, User, Calendar, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LessonPlans() {
  const [userRole, setUserRole] = useState(null);
  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State (For Teachers)
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLessonData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Get Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile) setUserRole(profile.role);

    // 2. Fetch Classes for the dropdown
    const { data: classData } = await supabase.from('classes').select('id, class_name').order('class_name');
    if (classData) setClasses(classData);

    // 3. Fetch Plans (RLS automatically filters: Teachers see theirs, Admins see all)
    const { data: planData } = await supabase
      .from('lesson_plans')
      .select('*, classes(class_name), profiles(full_name)')
      .order('plan_date', { ascending: false });

    if (planData) setPlans(planData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLessonData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('lesson_plans').insert([{
      teacher_id: user.id,
      class_id: classId,
      subject,
      topic,
      content,
      plan_date: planDate,
      status: 'Submitted'
    }]);

    if (!error) {
      setClassId(''); setSubject(''); setTopic(''); setContent(''); setPlanDate('');
      fetchLessonData(); // Refresh UI
    } else {
      alert("Failed to submit lesson plan.");
    }
    setIsSubmitting(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('lesson_plans').update({ status: newStatus }).eq('id', id);
    if (!error) fetchLessonData();
  };

  if (isLoading) return <div className="max-w-6xl mx-auto h-96 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // 🔴 Prevent Parents from viewing this page entirely
  if (userRole === 'PARENT') {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Staff Portal Only</h2>
        <p className="text-slate-500">Curriculum management is reserved for faculty and administration.</p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'HOS';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-500" />
          Lesson Planning
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isAdmin ? 'Review and approve faculty curriculum plans.' : 'Draft and submit your daily lesson plans.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Submission Form (For Teachers) */}
        {!isAdmin && (
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-school-navy flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-500" /> New Lesson Plan
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Class</label>
                <select required value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">-- Select Class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Date of Execution</label>
                <input type="date" required value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
                <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Topic</label>
                <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Algebraic Expressions" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Lesson Details</label>
                <textarea required value={content} onChange={(e) => setContent(e.target.value)} rows="4" placeholder="Brief outline of activities..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500"></textarea>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300">
                {isSubmitting ? 'Submitting...' : 'Submit Plan'}
              </button>
            </form>
          </div>
        )}

        {/* Right Column: The Lesson Plan Board */}
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] ${isAdmin ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-400" /> {isAdmin ? 'Global Curriculum Board' : 'My Lesson Plans'}
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {plans.length > 0 ? plans.map(plan => (
              <div key={plan.id} className="p-5 border border-slate-200 rounded-xl hover:shadow-md transition-shadow relative">
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    plan.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                    plan.status === 'Submitted' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {plan.status === 'Submitted' && <Clock className="inline w-3 h-3 mr-1" />}
                    {plan.status}
                  </span>
                </div>

                <div className="pr-24">
                  <h4 className="font-bold text-lg text-school-navy">{plan.subject}: {plan.topic}</h4>
                  <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {new Date(plan.plan_date).toLocaleDateString()}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{plan.classes?.class_name}</span>
                  </p>
                </div>

                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{plan.content}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <User className="w-4 h-4" /> Authored by {plan.profiles?.full_name}
                  </div>
                  
                  {/* Admin Actions */}
                  {isAdmin && plan.status === 'Submitted' && (
                    <button 
                      onClick={() => updateStatus(plan.id, 'Reviewed')}
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark as Reviewed
                    </button>
                  )}
                </div>

              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium text-sm">No lesson plans have been submitted yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}