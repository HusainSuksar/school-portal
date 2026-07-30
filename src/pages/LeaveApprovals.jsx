// src/pages/LeaveApprovals.jsx
import React, { useState, useEffect } from 'react';
import { CalendarClock, CheckCircle2, XCircle, Clock, Send, ShieldAlert, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LeaveApprovals() {
  const [userRole, setUserRole] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for Teachers requesting their own leave
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaveData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile) setUserRole(profile.role);

    const isAdminOrHOS = profile?.role === 'ADMIN' || profile?.role === 'HOS';

    let staffQuery = supabase.from('leave_requests').select('*, profiles(full_name)');
    if (!isAdminOrHOS) {
      staffQuery = staffQuery.eq('teacher_id', user.id);
    }
    const { data: staffLeaves } = await staffQuery;

    let studentLeaves = [];
    if (isAdminOrHOS) {
      const { data } = await supabase.from('student_leaves').select('*, students(full_name)');
      if (data) studentLeaves = data;
    }

    const unifiedQueue = [];

    if (staffLeaves) {
      staffLeaves.forEach(req => unifiedQueue.push({
        ...req,
        display_name: req.profiles?.full_name || 'Staff Member',
        request_type: 'Staff Leave',
        table_name: 'leave_requests'
      }));
    }

    if (studentLeaves) {
      studentLeaves.forEach(req => unifiedQueue.push({
        ...req,
        display_name: req.students?.full_name || 'Student',
        request_type: req.leave_type || 'Student Leave',
        table_name: 'student_leaves'
      }));
    }

    unifiedQueue.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setRequests(unifiedQueue);
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
      
      // --- 🚀 NEW TARGETED NOTIFICATION TRIGGER (Staff Request) ---
      const { data: admins } = await supabase.from('profiles').select('id').in('role', ['ADMIN', 'HOS']);
      if (admins && admins.length > 0) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: admins.map(a => a.id),
            title: 'Staff Leave Request',
            message: `A new leave request is pending approval.`,
            url: '/leave-approvals'
          })
        }).catch(console.error);
      }
      
      fetchLeaveData(); 
    }
    setIsSubmitting(false);
  };

  const updateStatus = async (id, tableName, newStatus) => {
    const { data: updatedRecord, error } = await supabase
      .from(tableName)
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      // --- 🚀 NEW TARGETED NOTIFICATION TRIGGER (Admin Action) ---
      // Determine who to notify based on the table
      const targetUserId = tableName === 'student_leaves' ? updatedRecord.parent_id : updatedRecord.teacher_id;
      
      if (targetUserId) {
         fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: [targetUserId],
            title: `Leave Request ${newStatus}`,
            message: `Your leave request has been ${newStatus.toLowerCase()}.`,
            url: tableName === 'student_leaves' ? '/request-leave' : '/leave-approvals'
          })
        }).catch(console.error);
      }

      fetchLeaveData(); 
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (userRole === 'PARENT') {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Staff Portal Only</h2>
        <p className="text-slate-500">This module is reserved for faculty and administration.</p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'HOS';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-indigo-500" />
          Leave & Absence Management
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">
          {isAdmin ? 'Review and manage all student and faculty absence requests.' : 'Submit and track your time-off requests.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
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

        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] ${isAdmin ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy">{isAdmin ? 'Master Approval Queue' : 'My Request History'}</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {requests.length > 0 ? requests.map(req => (
              <div key={`${req.table_name}_${req.id}`} className={`p-4 border border-slate-200 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${req.table_name === 'student_leaves' ? 'bg-indigo-50/30' : 'bg-white'}`}>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${req.table_name === 'student_leaves' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {req.table_name === 'student_leaves' ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {req.request_type}
                    </span>
                  </div>

                  {isAdmin && <p className="font-bold text-school-navy text-lg">{req.display_name}</p>}
                  
                  <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1">
                    <CalendarClock className="w-4 h-4 text-slate-400" />
                    {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">{req.reason}</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                    req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {req.status === 'Pending' && <Clock className="inline w-3 h-3 mr-1" />}
                    {req.status}
                  </span>

                  {isAdmin && req.status === 'Pending' && (
                    <div className="flex gap-2 md:border-l border-slate-200 md:pl-3 w-full md:w-auto justify-end">
                      <button onClick={() => updateStatus(req.id, req.table_name, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-emerald-200" title="Approve Request">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => updateStatus(req.id, req.table_name, 'Rejected')} className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-200" title="Reject Request">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <CalendarClock className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No leave requests found in the queue.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}