// src/pages/SupportInbox.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Inbox, CheckCircle2, Clock, AlertTriangle, User, MessageSquare, Phone, Send, ChevronRight, Archive, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SupportInbox() {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const chatEndRef = useRef(null);

  // 1. Fetch All Tickets
  const fetchTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles(full_name, phone_number, role)')
      .order('status', { ascending: true }) // Sorts alphabetically (Closed, In Progress, Open, Resolved) - we will custom sort in JS
      .order('created_at', { ascending: false });

    if (data) {
      // Custom Sort: Open -> In Progress -> Resolved -> Closed
      const statusWeight = { 'Open': 1, 'In Progress': 2, 'Resolved': 3, 'Closed': 4 };
      data.sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
      setTickets(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // 2. Fetch Replies when a ticket is selected
  useEffect(() => {
    if (!activeTicket) return;
    
    const fetchReplies = async () => {
      const { data } = await supabase
        .from('ticket_replies')
        .select('*, profiles(full_name, role)')
        .eq('ticket_id', activeTicket.id)
        .order('created_at', { ascending: true });
        
      if (data) setReplies(data);
      scrollToBottom();
    };
    
    fetchReplies();
  }, [activeTicket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 3. Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Closed': return 'bg-slate-200 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // 4. Update Ticket Status
  const updateStatus = async (newStatus) => {
    if (!activeTicket) return;
    
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', activeTicket.id);

    if (!error) {
      setActiveTicket({ ...activeTicket, status: newStatus });
      setTickets(tickets.map(t => t.id === activeTicket.id ? { ...t, status: newStatus } : t));
    }
  };

  // 5. Send a Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket || !currentUser) return;
    
    setIsSending(true);
    
    // Insert Reply
    const { data: replyData, error } = await supabase
      .from('ticket_replies')
      .insert([{
        ticket_id: activeTicket.id,
        user_id: currentUser.id,
        message: replyText.trim()
      }])
      .select('*, profiles(full_name, role)')
      .single();

    if (!error && replyData) {
      setReplies([...replies, replyData]);
      setReplyText('');
      
      // Auto-move ticket to "In Progress" if it was "Open" and an admin replied
      if (activeTicket.status === 'Open') {
        updateStatus('In Progress');
      }
      scrollToBottom();
    }
    setIsSending(false);
  };

  if (isLoading) return <div className="max-w-6xl mx-auto h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;

  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 h-[calc(100vh-6rem)] flex flex-col">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-500" /> Support Helpdesk
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Triage, manage, and resolve requests from parents and faculty.</p>
        </div>
        <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-bold text-red-800">{openTickets} Actionable Tickets</span>
        </div>
      </div>

      {/* HELPDESK LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* LEFT PANE: TICKET QUEUE */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy flex items-center gap-2"><Inbox className="w-4 h-4 text-slate-400"/> Master Queue</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {tickets.length > 0 ? tickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => setActiveTicket(ticket)}
                className={`p-4 cursor-pointer transition-all border-l-4 ${
                  activeTicket?.id === ticket.id ? 'bg-indigo-50 border-l-indigo-500' : 'hover:bg-slate-50 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadge(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-school-navy text-sm line-clamp-1">{ticket.subject}</h4>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><User className="w-3 h-3"/> {ticket.profiles?.full_name}</p>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" /><p className="font-bold">Inbox Zero</p></div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: TICKET DETAILS & CHAT */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          {activeTicket ? (
            <>
              {/* Ticket Header & Controls */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-start justify-between gap-4 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-school-navy mb-2">{activeTicket.subject}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"><User className="w-4 h-4 text-indigo-500" /> {activeTicket.profiles?.full_name} ({activeTicket.profiles?.role})</span>
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"><Clock className="w-4 h-4 text-slate-400" /> {new Date(activeTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Quick Dial Button */}
                  {activeTicket.profiles?.phone_number && (
                    <a href={`tel:${activeTicket.profiles.phone_number.replace(/\D/g,'')}`} className="p-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors border border-indigo-200" title="Call User">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                  {/* Status Dropdown */}
                  <select 
                    value={activeTicket.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    className={`p-2.5 rounded-lg text-sm font-bold border focus:outline-none cursor-pointer ${getStatusBadge(activeTicket.status)}`}
                  >
                    <option value="Open">Status: Open</option>
                    <option value="In Progress">Status: In Progress</option>
                    <option value="Resolved">Status: Resolved</option>
                    <option value="Closed">Status: Closed</option>
                  </select>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
                
                {/* Original Request (First Message) */}
                <div className="flex flex-col items-start max-w-[85%]">
                  <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase tracking-wider">{activeTicket.profiles?.full_name} • Original Request</span>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{activeTicket.description}</p>
                  </div>
                </div>

                {/* Replies */}
                {replies.map(reply => {
                  const isAdminReply = reply.profiles?.role === 'ADMIN' || reply.profiles?.role === 'HOS';
                  return (
                    <div key={reply.id} className={`flex flex-col ${isAdminReply ? 'items-end' : 'items-start'}`}>
                      <span className={`text-[10px] font-bold text-slate-400 mb-1 mx-1 uppercase tracking-wider`}>
                        {reply.profiles?.full_name} {isAdminReply ? '(Support)' : ''} • {new Date(reply.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm ${
                        isAdminReply 
                          ? 'bg-indigo-600 text-white rounded-tr-sm' 
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Footer */}
              {activeTicket.status !== 'Closed' ? (
                <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex items-end gap-3 shrink-0">
                  <div className="flex-1 relative">
                    <textarea 
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      rows="2"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <button type="submit" disabled={isSending || !replyText.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 shrink-0">
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-sm font-bold text-slate-400 flex justify-center items-center gap-2 shrink-0">
                  <Archive className="w-4 h-4" /> This ticket has been closed. Change status to reopen.
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-bold text-school-navy">No Ticket Selected</h3>
              <p className="text-sm mt-2 max-w-sm text-center">Select a request from the queue to view details, update its status, and reply to the user.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}