// src/pages/HelpCentre.jsx
import React, { useState, useEffect, useRef } from 'react';
import { LifeBuoy, PlusCircle, MessageSquare, Send, Clock, User, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function HelpCentre() {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  useEffect(() => {
    if (activeTicket) fetchReplies();
  }, [activeTicket]);

  const fetchMyTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // Get user role to determine what they can see
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    let query = supabase.from('support_tickets').select('*, profiles!created_by(full_name, role)').order('created_at', { ascending: false });

    if (profile?.role === 'PARENT') {
      // Parents only see tickets they created
      query = query.eq('created_by', user.id);
    } else if (profile?.role === 'TEACHER' || profile?.role === 'CLASS_TR') {
      // Teachers see tickets assigned to them OR created by them
      query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
    } 
    // ADMIN and HOS see ALL tickets (no filter applied)

    const { data } = await query;
    if (data) setTickets(data);
    setIsLoading(false);
  };

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('ticket_replies')
      .select('*, profiles(full_name, role)')
      .eq('ticket_id', activeTicket.id)
      .order('created_at', { ascending: true });
      
    if (data) setReplies(data);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsSending(true);
    
    let assignedTeacherId = null;

    try {
      // 1. Find the parent's child to get their class
      const { data: student } = await supabase
        .from('students')
        .select('classes(class_name)')
        .eq('parent_id', currentUser.id)
        .limit(1)
        .single();

      let sectionId = 'PRE_PRIMARY'; // Default fallback

      if (student?.classes?.class_name) {
        const className = student.classes.class_name.toLowerCase();
        
        // Regex to extract numbers from class name (e.g., "Std 4 A" -> 4)
        const match = className.match(/\d+/);
        
        if (className.includes('nursery') || className.includes('lkg') || className.includes('prefirst')) {
          sectionId = 'PRE_PRIMARY';
        } else if (match) {
          const num = parseInt(match[0]);
          if (num >= 1 && num <= 4) sectionId = 'PRIMARY';
          else if (num >= 5 && num <= 8) sectionId = 'MIDDLE';
          else if (num >= 9 && num <= 12) sectionId = 'HIGH';
        }
      }

      // 2. Fetch the assigned teacher for this section from our new table
      const { data: assignment } = await supabase
        .from('ticket_assignments')
        .select('teacher_id')
        .eq('section_id', sectionId)
        .single();

      if (assignment?.teacher_id) {
        assignedTeacherId = assignment.teacher_id;
      }
    } catch (err) {
      console.warn("Auto-routing skipped. User may not be linked to a student.", err);
    }
    
    // 3. Create the ticket with the assigned_to field populated
    const { data, error } = await supabase.from('support_tickets').insert([{
      created_by: currentUser.id,
      subject: newSubject,
      description: newDescription,
      status: 'Open',
      assigned_to: assignedTeacherId // Automatically routed!
    }]).select('*, profiles!created_by(full_name, role)').single();

    if (!error && data) {
      setTickets([data, ...tickets]);
      setIsCreating(false);
      setActiveTicket(data);
      setNewSubject('');
      setNewDescription('');
    }
    setIsSending(false);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    setIsSending(true);
    
    const { data, error } = await supabase.from('ticket_replies').insert([{
      ticket_id: activeTicket.id,
      user_id: currentUser.id,
      message: replyText.trim()
    }]).select('*, profiles(full_name, role)').single();

    if (!error && data) {
      setReplies([...replies, data]);
      setReplyText('');
      scrollToBottom();
    } else {
      // Unmask the error!
      console.error("Reply Error:", error);
      alert(`Failed to send reply: ${error.message || 'Permission denied'}`);
    }
    setIsSending(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Closed': return 'bg-slate-200 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (isLoading) return <div className="max-w-5xl mx-auto h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2"><LifeBuoy className="w-6 h-6 text-indigo-500" /> Help Centre</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Submit requests to the administration and track their progress.</p>
        </div>
        <button onClick={() => { setIsCreating(true); setActiveTicket(null); }} className="bg-school-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> New Support Ticket
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* LEFT: Ticket History */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-school-navy flex items-center gap-2">My Requests</h3></div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {tickets.length > 0 ? tickets.map(ticket => (
              <div key={ticket.id} onClick={() => { setActiveTicket(ticket); setIsCreating(false); }} className={`p-4 cursor-pointer transition-all border-l-4 ${activeTicket?.id === ticket.id ? 'bg-indigo-50 border-l-indigo-500' : 'hover:bg-slate-50 border-l-transparent'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(ticket.status)}`}>{ticket.status}</span>
                  <span className="text-xs font-medium text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-school-navy text-sm line-clamp-1">{ticket.subject}</h4>
              </div>
            )) : <div className="p-8 text-center text-slate-400"><CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" /><p className="font-bold text-sm">No tickets submitted.</p></div>}
          </div>
        </div>

        {/* RIGHT: Chat Thread or Creation Form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          {isCreating ? (
            <form onSubmit={handleCreateTicket} className="p-6 flex flex-col h-full overflow-y-auto">
              <h3 className="text-xl font-bold text-school-navy mb-6">Create New Ticket</h3>
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
                  <input type="text" required value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Brief summary of your request" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Details</label>
                  <textarea required value={newDescription} onChange={e => setNewDescription(e.target.value)} rows="8" placeholder="Provide as much detail as possible..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none" />
                </div>
              </div>
              <div className="pt-4 mt-auto">
                <button type="submit" disabled={isSending} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl shadow-md transition-all font-bold disabled:opacity-50">
                  {isSending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          ) : activeTicket ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="text-xl font-bold text-school-navy mb-2">{activeTicket.subject}</h3>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(activeTicket.status)}`}>{activeTicket.status}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(activeTicket.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
                <div className="flex flex-col items-start max-w-[85%]">
                  <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase tracking-wider">Original Request</span>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm"><p className="text-sm text-slate-700 whitespace-pre-wrap">{activeTicket.description}</p></div>
                </div>

                {replies.map(reply => {
                  const isMine = reply.user_id === currentUser?.id;
                  return (
                    <div key={reply.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] font-bold text-slate-400 mb-1 mx-1 uppercase tracking-wider">{isMine ? 'You' : reply.profiles?.full_name + ' (Admin)'} • {new Date(reply.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm ${isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {activeTicket.status !== 'Closed' && activeTicket.status !== 'Resolved' ? (
                <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex items-end gap-3 shrink-0">
                  <div className="flex-1 relative">
                    <textarea required value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type a reply..." rows="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none" />
                  </div>
                  <button type="submit" disabled={isSending || !replyText.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 shrink-0">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-sm font-bold text-slate-400">
                  This ticket has been marked as {activeTicket.status}.
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-bold text-school-navy">Help Centre</h3>
              <p className="text-sm mt-2 max-w-sm text-center">Select an existing ticket or create a new one to get support.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}