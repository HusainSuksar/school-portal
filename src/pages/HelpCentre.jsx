// src/pages/HelpCentre.jsx
import React, { useState, useEffect } from 'react';
import { LifeBuoy, Send, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function HelpCentre() {
  const [myTickets, setMyTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Fetch the user's tickets on load
  const fetchMyTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (data) setMyTickets(data);
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !description) return;
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('support_tickets')
        .insert([{ 
          subject, 
          description,
          created_by: user.id
        }]);

      if (error) throw error;

      setStatusMsg({ type: 'success', text: 'Support ticket submitted successfully. Administration will review it shortly.' });
      setSubject('');
      setDescription('');
      fetchMyTickets(); // Refresh the list
      
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);

    } catch (error) {
      console.error("Error submitting ticket:", error);
      setStatusMsg({ type: 'error', text: 'Failed to submit ticket. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-indigo-500" />
          Help Centre
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Submit a request to the school administration.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Create Ticket Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy">Create New Ticket</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
              <input 
                type="text" 
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Description</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide as much detail as possible..."
                rows={5}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md flex justify-center items-center gap-2 disabled:bg-slate-300"
            >
              {isSubmitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Ticket</>}
            </button>
          </form>
        </div>

        {/* Ticket History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[500px] flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy">My Ticket History</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {myTickets.length > 0 ? (
              myTickets.map(ticket => (
                <div key={ticket.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-school-navy">{ticket.subject}</h4>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                      ticket.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{ticket.description}</p>
                  <p className="text-xs text-slate-400 font-medium mt-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-slate-400">
                <LifeBuoy className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">You have no previous support tickets.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}