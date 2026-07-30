// src/pages/RequestStudentLeave.jsx
import React, { useState, useEffect } from 'react';
import { CalendarClock, Send, Clock, CheckCircle2, AlertCircle, FileText, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function RequestStudentLeave() {
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  
  const [selectedChildId, setSelectedChildId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Sick Leave');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const fetchParentData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: kids } = await supabase
      .from('students')
      .select('id, full_name, classes(class_name)')
      .eq('parent_id', user.id);
      
    if (kids && kids.length > 0) {
      setChildren(kids);
      setSelectedChildId(kids[0].id); 
    }

    const { data: history } = await supabase
      .from('student_leaves')
      .select('*, students(full_name)')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (history) setLeaveHistory(history);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchParentData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChildId || !startDate || !endDate || !reason) return;
    
    setIsSubmitting(true);
    setStatusMsg({ type: '', text: '' });
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('student_leaves')
      .insert([{
        parent_id: user.id,
        student_id: selectedChildId,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        reason: reason
      }]);

    if (error) {
      setStatusMsg({ type: 'error', text: 'Failed to submit request. Please try again.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Leave request submitted successfully to the administration.' });
      
      // --- 🚀 NEW TARGETED NOTIFICATION TRIGGER (Parent Submits Leave) ---
      const { data: admins } = await supabase.from('profiles').select('id').in('role', ['ADMIN', 'HOS']);
      if (admins && admins.length > 0) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: admins.map(a => a.id),
            title: 'New Student Leave Request',
            message: `A new student leave request is pending approval.`,
            url: '/leave-approvals'
          })
        }).catch(console.error);
      }

      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveType('Sick Leave');
      fetchParentData(); 
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-indigo-500" />
          Request Student Leave
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Submit an official absence notification to your child's class teacher.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> New Request
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {children.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Select Student</label>
                <select required value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500">
                  {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Type of Leave</label>
              <select required value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500">
                <option value="Sick Leave">Sick Leave (Medical)</option>
                <option value="Family Emergency">Family Emergency</option>
                <option value="Pre-Planned Travel">Pre-Planned Travel</option>
                <option value="Other">Other / General Absence</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Start Date</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">End Date</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Reason</label>
              <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows="3" placeholder="Please provide brief details..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500"></textarea>
            </div>

            <button type="submit" disabled={isSubmitting || children.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300 flex items-center justify-center gap-2">
              {isSubmitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Request</>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy">My Request History</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {leaveHistory.length > 0 ? leaveHistory.map(req => (
              <div key={req.id} className="p-5 border border-slate-200 rounded-xl hover:shadow-md transition-shadow relative">
                
                <div className="absolute top-5 right-5">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                    req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                    {req.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                    {req.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                    {req.status}
                  </span>
                </div>

                <div className="pr-24">
                  <h4 className="font-bold text-lg text-school-navy">{req.students?.full_name}</h4>
                  <p className="text-sm font-bold text-indigo-600 mt-0.5">{req.leave_type}</p>
                  <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-slate-400" /> 
                    {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-700">{req.reason}</p>
                </div>
                
                <p className="text-xs text-slate-400 font-bold mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Submitted on {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <CalendarClock className="w-16 h-16 mb-3 opacity-20" />
                <p className="font-bold text-school-navy text-lg">No Previous Requests</p>
                <p className="font-medium text-sm mt-1 max-w-sm text-center">You have not submitted any leave requests for your children yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}