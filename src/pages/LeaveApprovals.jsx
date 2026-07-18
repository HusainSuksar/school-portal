// src/pages/LeaveApprovals.jsx
import React, { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle2, XCircle, Clock, Send, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LeaveApprovals() {
  const [userRole, setUserRole] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for Teachers
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaveData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get Role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile) setUserRole(profile.role);

    // Fetch Requests (RLS will handle filtering automatically!)
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (leaves) setRequests(leaves);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('leave_requests')
      .insert([{ teacher_id: user.id, start_date: startDate, end_date: endDate, reason }]);

    if (!error) {
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchLeaveData(); // Refresh list
    }
    setIsSubmitting(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) fetchLeaveData(); // Refresh UI
  };

  if (isLoading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // 🔴 Prevent Parents from viewing this page entirely
  if (userRole === 'PARENT') {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Staff Portal Only</h2>
        <p className="text-slate-500">This module is reserved for faculty and administration.</p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-indigo-500" />
          Leave & Absence Management
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isAdmin ? 'Review and manage faculty absence requests.' : 'Submit and track your time-off requests.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Submission Form (Hidden from Admins unless they also want to take leave) */}
        {!isAdmin && (
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-school-navy">Request Leave</h3>
            </div>
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Reason</label>
                <textarea required rows="3" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-2 border rounded-lg text-sm resize-none"></textarea>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Submit Request
              </button>
            </form>
          </div>
        )}

        {/* Right Column: The Request Queue */}
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${isAdmin ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy">{isAdmin ? 'Master Approval Queue' : 'My Request History'}</h3>
          </div>
          
          <div className="p-4 space-y-4">
            {requests.length > 0 ? requests.map(req => (
              <div key={req.id} className="p-4 border border-slate-200 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  {isAdmin && <p className="font-bold text-school-navy text-lg">{req.profiles?.full_name}</p>}
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{req.reason}</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3">
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {req.status === 'Pending' && <Clock className="inline w-3 h-3 mr-1" />}
                    {req.status}
                  </span>

                  {/* Admin Actions */}
                  {isAdmin && req.status === 'Pending' && (
                    <div className="flex gap-2 border-l border-slate-200 pl-3">
                      <button onClick={() => updateStatus(req.id, 'Approved')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle2 className="w-5 h-5" /></button>
                      <button onClick={() => updateStatus(req.id, 'Rejected')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="w-5 h-5" /></button>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400">No leave requests found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}