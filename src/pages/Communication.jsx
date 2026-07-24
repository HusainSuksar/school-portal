// src/pages/Communication.jsx
import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Trash2, Users, CheckCircle2, Clock, Globe, PhoneCall, MessageSquare, History, UserPlus, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Communication() {
  const [activeTab, setActiveTab] = useState('announcements'); // announcements, queue, history
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Announcements State
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL');
  
  // CRM / Call Queue State
  const [queueStudents, setQueueStudents] = useState([]);
  const [commHistory, setCommHistory] = useState([]);
  
  // Logging Form State
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);
  const [logType, setLogType] = useState('Routine Call');
  const [logNotes, setLogNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get User Profile
    const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single();
    if (profile) setCurrentUserProfile(profile);

    const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'HOS';
    const isStaff = profile?.role === 'TEACHER' || profile?.role === 'CLASS_TR' || isAdmin;

    // 2. Fetch Announcements
    const { data: annData } = await supabase.from('announcements').select('*, profiles(full_name)').order('created_at', { ascending: false });
    if (annData) setAnnouncements(annData);

    // 3. Fetch CRM Data (Only if Staff/Admin)
    if (isStaff) {
      // Fetch Logs
      let logsQuery = supabase.from('communication_logs').select('*, students(full_name), profiles(full_name)').order('logged_at', { ascending: false });
      if (!isAdmin) logsQuery = logsQuery.eq('teacher_id', user.id); // Teachers only see their logs
      
      const { data: logs } = await logsQuery;
      if (logs) setCommHistory(logs);

      // Fetch Students for Queue
      let studentsQuery = supabase.from('students').select('id, full_name, classes(class_name), profiles(full_name, phone_number)');
      
      if (!isAdmin) {
        // Find classes this teacher is responsible for
        const { data: mappings } = await supabase.from('class_subjects').select('class_id').eq('teacher_id', user.id);
        const { data: hr } = await supabase.from('classes').select('id').eq('class_teacher_id', user.id);
        
        const classIds = new Set();
        mappings?.forEach(m => classIds.add(m.class_id));
        hr?.forEach(h => classIds.add(h.id));
        
        if (classIds.size > 0) {
          studentsQuery = studentsQuery.in('class_id', Array.from(classIds));
        } else {
          studentsQuery = studentsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Force empty if no classes
        }
      }
      
      const { data: students } = await studentsQuery;

      if (students && logs) {
        // Calculate the "Up Next" Queue
        const queue = students.map(student => {
          const studentLogs = logs.filter(l => l.student_id === student.id);
          const lastLog = studentLogs[0]; // Already sorted newest first
          const lastCallDate = lastLog ? new Date(lastLog.logged_at) : null;
          
          // Calculate days since last contact
          const daysSince = lastCallDate ? Math.floor((new Date() - lastCallDate) / (1000 * 60 * 60 * 24)) : 999;
          
          return { ...student, lastCallDate, daysSince };
        });

        // Sort: Never called (999) first, then oldest calls first
        queue.sort((a, b) => b.daysSince - a.daysSince);
        setQueueStudents(queue);
      }
    }

    setIsLoading(false);
  };

  // --- ACTIONS ---
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    setIsSubmitting(true);
    
    // 1. Save to Supabase database (as usual)
    const { error } = await supabase.from('announcements').insert([{ 
      title, 
      message, 
      target_audience: targetAudience, 
      created_by: currentUserProfile.id 
    }]);

    if (!error) { 
      // 2. NEW: Call your Vercel Serverless Function to fire the Push Notifications
      try {
        await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, message, targetAudience })
        });
      } catch (pushError) {
        console.error("Failed to trigger push API:", pushError);
      }

      // 3. Reset form
      setTitle(''); 
      setMessage(''); 
      setTargetAudience('ALL'); 
      fetchHubData(); 
    }
    
    setIsSubmitting(false);
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await supabase.from('announcements').delete().eq('id', id);
    fetchHubData();
  };

  const openWhatsApp = (phone) => {
    if (!phone) return alert("No phone number on record for this parent.");
    const formatted = phone.replace(/\D/g,'');
    window.open(`https://wa.me/${formatted}`, '_blank');
  };

  const isStaff = currentUserProfile?.role && currentUserProfile.role !== 'PARENT';
  const isAdmin = currentUserProfile?.role === 'ADMIN' || currentUserProfile?.role === 'HOS';

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 relative">
      
      {/* HEADER */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <PhoneCall className="w-6 h-6 text-indigo-500" />
          Communication Hub
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Official announcements and parent-teacher contact logs.</p>
      </div>

      {/* TABS (Staff Only) */}
      {isStaff && (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-fit">
          <button onClick={() => setActiveTab('announcements')} className={`flex-1 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'announcements' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Megaphone className="w-4 h-4" /> Announcements
          </button>
          <button onClick={() => setActiveTab('queue')} className={`flex-1 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <UserPlus className="w-4 h-4" /> Call Queue
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 md:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <History className="w-4 h-4" /> Comm History
          </button>
        </div>
      )}

      {/* --- TAB 1: ANNOUNCEMENTS --- */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Admin Broadcast Box */}
          {isAdmin && (
            <div className="bg-school-navy rounded-xl shadow-lg border border-slate-800 overflow-hidden text-white relative">
              <Globe className="w-32 h-32 absolute -right-4 -top-4 text-slate-800 opacity-50" />
              <div className="p-4 border-b border-slate-700 bg-slate-900/50 relative z-10">
                <h3 className="font-bold flex items-center gap-2"><Send className="w-4 h-4 text-school-yellow" /> Broadcast Message</h3>
              </div>
              <form onSubmit={handleBroadcast} className="p-6 space-y-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Subject Header</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Campus closed tomorrow..." className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Audience</label>
                    <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer">
                      <option value="ALL">Entire School</option>
                      <option value="PARENTS">Parents Only</option>
                      <option value="STAFF">Staff Only</option>
                    </select>
                  </div>
                </div>
                <div>
                  <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type official announcement..." rows={3} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500" />
                </div>
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:opacity-50">
                  {isSubmitting ? 'Transmitting...' : 'Broadcast Message'}
                </button>
              </form>
            </div>
          )}

          {/* Live Newsfeed */}
          <div className="space-y-4">
            {announcements.length > 0 ? announcements.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group overflow-hidden">
                <div className="absolute top-0 right-0">
                  <span className={`text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg flex items-center gap-1 ${
                    item.target_audience === 'ALL' ? 'bg-emerald-100 text-emerald-700' :
                    item.target_audience === 'PARENTS' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    <Users className="w-3 h-3" /> {item.target_audience}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-school-navy pr-24">{item.title}</h3>
                <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{item.message}</p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item.profiles?.full_name}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteAnnouncement(item.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400"><Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="font-bold">No Announcements</p></div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: CALL QUEUE --- */}
      {activeTab === 'queue' && isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queueStudents.map((student, idx) => (
            <div key={student.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
              
              <div className="flex justify-between items-start mb-4">
                <div className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider ${
                  student.daysSince > 30 ? 'bg-red-100 text-red-700' : 
                  student.daysSince > 14 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {student.daysSince === 999 ? 'Never Contacted' : `${student.daysSince} Days Ago`}
                </div>
                {idx === 0 && <span className="bg-school-yellow text-school-navy text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">Up Next</span>}
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-lg text-school-navy">{student.full_name}</h3>
                <p className="text-sm font-bold text-slate-500 mb-4">{student.classes?.class_name}</p>
                
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs uppercase font-bold text-slate-400 mb-1">Primary Contact</p>
                  <p className="text-sm font-bold text-slate-700 line-clamp-1">{student.profiles?.full_name || 'Unlinked Parent'}</p>
                  <p className="text-sm text-slate-500 font-mono mt-0.5">{student.profiles?.phone_number || 'No Phone Number'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6">
                <button 
                  onClick={() => openWhatsApp(student.profiles?.phone_number)}
                  className="py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-emerald-200"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button 
                  onClick={() => { setActiveStudent(student); setShowLogModal(true); }}
                  className="py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-indigo-200"
                >
                  <Phone className="w-3.5 h-3.5" /> Log Interaction
                </button>
              </div>

            </div>
          ))}
          {queueStudents.length === 0 && (
             <div className="col-span-full p-12 text-center text-slate-400"><Users className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="font-bold">No Students Assigned</p></div>
          )}
        </div>
      )}

      {/* --- TAB 3: COMM HISTORY --- */}
      {activeTab === 'history' && isStaff && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-school-navy">{isAdmin ? 'Global Communication Audit' : 'My Communication History'}</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {commHistory.length > 0 ? commHistory.map(log => (
              <div key={log.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      log.log_type === 'Behavioral' ? 'bg-red-100 text-red-700' :
                      log.log_type === 'Ad-Hoc' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.log_type}
                    </span>
                    <h4 className="font-bold text-school-navy">Re: {log.students?.full_name}</h4>
                  </div>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(log.logged_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-600 bg-white border border-slate-100 p-3 rounded-lg mt-2 whitespace-pre-wrap">{log.notes}</p>
                <div className="mt-3 text-xs font-medium text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Logged by {log.profiles?.full_name}
                </div>
              </div>
            )) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400"><History className="w-12 h-12 mb-3 opacity-20" /><p className="font-medium text-sm">No communication logs found.</p></div>
            )}
          </div>
        </div>
      )}

      {/* --- FLOATING MODAL: LOG INTERACTION --- */}
      {showLogModal && activeStudent && (
        <div className="fixed inset-0 bg-school-navy/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-school-navy">Log Interaction</h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleLogSubmit} className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Student</p>
                <p className="text-lg font-bold text-indigo-700">{activeStudent.full_name}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Interaction Type</label>
                <select value={logType} onChange={(e) => setLogType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500">
                  <option value="Routine Call">Routine Monthly Call</option>
                  <option value="Ad-Hoc">Ad-Hoc Check-in</option>
                  <option value="Behavioral">Behavioral / Incident</option>
                  <option value="WhatsApp">WhatsApp Conversation</option>
                  <option value="In-Person">In-Person Meeting</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Discussion Notes</label>
                <textarea required value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows="4" placeholder="Summarize what was discussed..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500"></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}