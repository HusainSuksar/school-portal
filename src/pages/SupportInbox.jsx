// src/pages/SupportInbox.jsx
import React, { useState, useEffect } from 'react';
import { Inbox, CheckCircle2, Clock, AlertTriangle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SupportInbox() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    // Because of RLS, Admins will automatically fetch ALL tickets
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles(full_name, phone_number)')
      .order('status', { ascending: false }) // 'Open' comes before 'Resolved'
      .order('created_at', { ascending: false });

    if (data) setTickets(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const markResolved = async (ticketId) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'Resolved' })
      .eq('id', ticketId);

    if (!error) {
      // Optimistically update the UI without reloading everything
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'Resolved' } : t));
    } else {
      console.error("Error resolving ticket:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === 'Open').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-500" />
            Support Inbox
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage and resolve requests from parents and faculty.</p>
        </div>
        <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-bold text-red-800">{openTickets} Actionable Tickets</span>
        </div>
      </div>

      <div className="space-y-4">
        {tickets.length > 0 ? (
          tickets.map(ticket => (
            <div key={ticket.id} className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start ${
              ticket.status === 'Open' ? 'border-amber-200 shadow-amber-100/50' : 'border-slate-200 opacity-75'
            }`}>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    ticket.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {ticket.status}
                  </span>
                  <h3 className="font-bold text-lg text-school-navy">{ticket.subject}</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">{ticket.description}</p>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1"><User className="w-4 h-4" /> {ticket.profiles?.full_name}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(ticket.created_at).toLocaleString()}</span>
                </div>
              </div>

              {ticket.status === 'Open' && (
                <button 
                  onClick={() => markResolved(ticket.id)}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-school-navy">Inbox Zero</h3>
            <p className="text-slate-500 mt-2">There are currently no support tickets in the system.</p>
          </div>
        )}
      </div>

    </div>
  );
}