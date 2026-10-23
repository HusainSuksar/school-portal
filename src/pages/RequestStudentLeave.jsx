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
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: kids } = await supabase
      .from('students')
      .select('id, full_name, class_id, classes(class_name, class_teacher_id)')
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
    if (!user) {
      setIsSubmitting(false);
      return;
    }

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
      console.error("Leave Request Submission Error:", error);
      setStatusMsg({ type: 'error', text: 'Failed to submit request. Please try again.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Leave request submitted successfully to the administration.' });
      
      // Target student's class teacher + admins/HOS
      const targetStudent = children.find(c => c.id === selectedChildId);
      const recipientIds = new Set();
      
      const { data: admins } = await supabase.from('profiles').select('id').in('role', ['ADMIN', 'HOS']);
      admins?.forEach(a => recipientIds.add(a.id));
      if (targetStudent?.classes?.class_teacher_id) {
        recipientIds.add(targetStudent.classes.class_teacher_id);
      }

      if (recipientIds.size > 0) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIds: Array.from(recipientIds),
            title: 'New Student Leave Request',
            message: `Leave request for ${targetStudent?.full_name || 'a student'} is pending approval.`,
            redirect_url: '/leave-approvals',
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Leave Category</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500">
                <option value="Sick Leave">Sick Leave</option>
                <option value="Family Function">Family Function / Event</option>
                <option value="Travel / Ziyarat">Travel / Ziyarat</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">From Date</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-school-navy focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">To Date</label>
                <input type="date" required value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-school-navy focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Detailed Reason</label>
              <textarea required rows="4" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Please elaborate on the reason for absence..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500 font-medium"></textarea>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" /> {isSubmitting ? 'Transmitting...' : 'Submit Leave Notification'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[650px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-school-navy">Past Requests & Status</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {leaveHistory.length > 0 ? leaveHistory.map(req => (
              <div key={req.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-school-navy">{req.students?.full_name}</h4>
                    <p className="text-xs font-bold text-indigo-600 mt-0.5">{req.leave_type}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                    req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                    {req.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                    {req.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                    {req.status}
                  </span>
                </div>
                
                <p className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 p-2.5 rounded-lg mb-2">{req.reason}</p>
                
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                  <span>{new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}</span>
                  <span>Submitted {new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <CalendarClock className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium text-sm">No leave requests found.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
