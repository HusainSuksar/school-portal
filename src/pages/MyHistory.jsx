// src/pages/MyHistory.jsx
import React, { useState, useEffect } from 'react';
import { History, Award, LifeBuoy, CalendarClock, Calendar, Clock, ArrowDownToLine } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MyHistory() {
  const [historyFeed, setHistoryFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPersonalHistory() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // Fetch from 4 different tables concurrently!
        const [
          { data: behaviors },
          { data: tickets },
          { data: staffLeaves },
          { data: studentLeaves }
        ] = await Promise.all([
          supabase.from('behavior_logs').select('id, log_type, points, reason, logged_at, students(full_name)').eq('teacher_id', user.id).order('logged_at', { ascending: false }).limit(20),
          supabase.from('support_tickets').select('id, subject, description, status, created_at').eq('created_by', user.id).order('created_at', { ascending: false }).limit(20),
          supabase.from('leave_requests').select('id, start_date, end_date, reason, status, created_at').eq('teacher_id', user.id).order('created_at', { ascending: false }).limit(20),
          supabase.from('student_leaves').select('id, start_date, end_date, leave_type, status, created_at, students(full_name)').eq('parent_id', user.id).order('created_at', { ascending: false }).limit(20)
        ]);

        // Standardize the data structures into a single timeline format
        const combinedFeed = [];

        if (behaviors) {
          behaviors.forEach(item => combinedFeed.push({
            id: `beh_${item.id}`,
            type: 'behavior',
            title: `Awarded ${item.log_type} (${item.log_type === 'Tashjee' ? '+' : '-'}${item.points} pts)`,
            description: `To ${item.students?.full_name} for: ${item.reason}`,
            date: item.logged_at,
            status: 'Completed'
          }));
        }

        if (tickets) {
          tickets.forEach(item => combinedFeed.push({
            id: `tic_${item.id}`,
            type: 'ticket',
            title: `Support Ticket: ${item.subject}`,
            description: item.description,
            date: item.created_at,
            status: item.status
          }));
        }

        if (staffLeaves) {
          staffLeaves.forEach(item => combinedFeed.push({
            id: `s_leave_${item.id}`,
            type: 'staff_leave',
            title: 'Personal Leave Request',
            description: `Requested from ${new Date(item.start_date).toLocaleDateString()} to ${new Date(item.end_date).toLocaleDateString()}. Reason: ${item.reason}`,
            date: item.created_at,
            status: item.status
          }));
        }

        if (studentLeaves) {
          studentLeaves.forEach(item => combinedFeed.push({
            id: `k_leave_${item.id}`,
            type: 'student_leave',
            title: `${item.leave_type} Leave for ${item.students?.full_name}`,
            description: `Requested from ${new Date(item.start_date).toLocaleDateString()} to ${new Date(item.end_date).toLocaleDateString()}.`,
            date: item.created_at,
            status: item.status
          }));
        }

        // Sort all combined records by Date (Newest First)
        combinedFeed.sort((a, b) => new Date(b.date) - new Date(a.date));

        setHistoryFeed(combinedFeed);
      } catch (error) {
        console.error("Error fetching history feed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPersonalHistory();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'behavior': return <Award className="w-5 h-5 text-emerald-500" />;
      case 'ticket': return <LifeBuoy className="w-5 h-5 text-indigo-500" />;
      case 'staff_leave': return <CalendarClock className="w-5 h-5 text-amber-500" />;
      case 'student_leave': return <Calendar className="w-5 h-5 text-blue-500" />;
      default: return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'Resolved':
      case 'Completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pending':
      case 'Open':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <History className="w-6 h-6 text-indigo-500" />
          My Unified History
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">A chronological timeline of your interactions, requests, and logs.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-school-navy flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" /> Recent Activity Log
          </h3>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : historyFeed.length > 0 ? (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
              {historyFeed.map((item, index) => (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  
                  {/* Timeline Dot */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-50 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                    {getIcon(item.type)}
                  </div>
                  
                  {/* Event Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-school-navy text-base">{item.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-slate-600 mt-2 line-clamp-3">
                      {item.description}
                    </p>
                    
                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.date).toLocaleString()}
                    </div>
                  </div>

                </div>
              ))}
              
              {/* Timeline Cap */}
              <div className="relative flex items-center justify-center pt-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 relative z-10 border-4 border-white">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
              </div>

            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
              <History className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-school-navy">No Activity Found</h3>
              <p className="mt-1 max-w-sm">Your personal history feed is currently empty.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}