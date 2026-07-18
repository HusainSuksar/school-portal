// src/pages/LessonTemplates.jsx
import React, { useState, useEffect } from 'react';
import { BookTemplate, PlusCircle, Trash2, ShieldAlert, LayoutTemplate, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LessonTemplates() {
  const [userRole, setUserRole] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State (Admin Only)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentStructure, setContentStructure] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Get Role for UI rendering
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile) setUserRole(profile.role);

    // 2. Fetch Templates
    const { data } = await supabase
      .from('lesson_templates')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (data) setTemplates(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!title || !contentStructure) return;
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('lesson_templates').insert([{
      title,
      description,
      content_structure: contentStructure,
      created_by: user.id
    }]);

    if (!error) {
      setTitle(''); setDescription(''); setContentStructure('');
      fetchTemplates();
    } else {
      alert("Failed to create template.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    const { error } = await supabase.from('lesson_templates').delete().eq('id', id);
    if (!error) fetchTemplates();
  };

  if (isLoading) return <div className="max-w-6xl mx-auto h-96 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // 🔴 Prevent Parents from viewing this page
  if (userRole === 'PARENT') {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500">Curriculum templates are restricted to teaching faculty.</p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'HOS';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <BookTemplate className="w-6 h-6 text-indigo-500" />
          Master Lesson Templates
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isAdmin ? 'Design and publish standardized lesson structures.' : 'Browse official curriculum structures required for lesson planning.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Admin Creation Form */}
        {isAdmin && (
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-school-navy flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-500" /> Create Template
              </h3>
            </div>
            
            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Template Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standard 50-Min Math Lesson" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Brief Description</label>
                <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to use this template..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Required Structure</label>
                <textarea required value={contentStructure} onChange={(e) => setContentStructure(e.target.value)} rows="6" placeholder="1. Introduction (5 mins)&#10;2. Core Concept (20 mins)&#10;3. Practice (15 mins)&#10;4. Summary (10 mins)" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500"></textarea>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-school-navy hover:bg-slate-800 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300">
                {isSubmitting ? 'Publishing...' : 'Publish Template'}
              </button>
            </form>
          </div>
        )}

        {/* Right Column: Template Library */}
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-slate-400" /> Official Library
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map(template => (
                  <div key={template.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow bg-white flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-school-navy">{template.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(template.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 bg-slate-800 text-slate-300 font-mono text-sm whitespace-pre-wrap">
                      {template.content_structure}
                    </div>
                    
                    <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {template.profiles?.full_name}</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BookTemplate className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-school-navy">Library Empty</h3>
                <p className="text-sm mt-1 text-center max-w-sm">No official lesson templates have been published by the administration yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}