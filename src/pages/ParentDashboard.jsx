// src/pages/ParentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, X, AlertCircle, GraduationCap, BarChart, Shield, Clock, Trophy, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ParentDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [parentName, setParentName] = useState('Parent');
  const [children, setChildren] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  
  const [metrics, setMetrics] = useState({
    attendancePercentage: 0,
    netPoints: 0,
    tashjee: 0,
    tanbeeh: 0,
    rankName: 'Unranked',
    rankColor: 'text-slate-500 bg-slate-100'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  
  // Gradebook State
  const [termGrades, setTermGrades] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');

  // Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Regular'); 
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  useEffect(() => {
    async function fetchParentData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // SECURITY CHECK 1: Verify Role
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
          
        if (profile?.role !== 'PARENT') {
          setIsAuthorized(false);
          setIsLoading(false);
          return; // Stop execution to prevent data leaks
        }

        setParentName(profile.full_name);

        // SECURITY CHECK 2: Strict Parent ID Filtering (The Data Leak Fix)
        const { data: kids } = await supabase
          .from('students')
          .select('id, full_name, its_number, classes(class_name)')
          .eq('parent_id', user.id); // <--- THIS PREVENTS SEEING RANDOM STUDENTS

        if (kids && kids.length > 0) {
          setChildren(kids);
          setActiveChild(kids[0]);
        }
      } catch (error) {
        console.error("Error fetching parent data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchParentData();
  }, []);

  useEffect(() => {
    if (!activeChild) return;

    async function fetchChildData() {
      // 1. Fetch Analytics (Attendance & Behavior)
      const { data: attendance } = await supabase.from('attendance_records').select('status').eq('student_id', activeChild.id);
      let attPct = 100;
      if (attendance && attendance.length > 0) {
        const present = attendance.filter(r => r.status === 'Present').length;
        attPct = Math.round((present / attendance.length) * 100);
      }

      const { data: logs } = await supabase.from('behavior_logs').select('log_type, points, reason, logged_at, profiles(full_name)').eq('student_id', activeChild.id).order('logged_at', { ascending: false });
      let tPoints = 0, bPoints = 0;
      if (logs) {
        logs.forEach(log => {
          if (log.log_type === 'Tashjee') tPoints += log.points;
          if (log.log_type === 'Tanbeeh') bPoints += log.points;
        });
        setRecentActivity(logs.slice(0, 5));
      }
      const net = tPoints - bPoints;
      
      let rank = 'Unranked', color = 'text-slate-500 bg-slate-100';
      if (net >= 200) { rank = 'Platinum Star'; color = 'text-purple-700 bg-purple-100'; }
      else if (net >= 100) { rank = 'Gold Star'; color = 'text-yellow-700 bg-yellow-100'; }
      else if (net >= 50) { rank = 'Silver Star'; color = 'text-slate-700 bg-slate-200'; }
      else if (net >= 20) { rank = 'Bronze Star'; color = 'text-orange-700 bg-orange-100'; }

      setMetrics({ attendancePercentage: attPct, tashjee: tPoints, tanbeeh: bPoints, netPoints: net, rankName: rank, rankColor: color });

      // 2. Fetch Leave History
      const { data: leaves } = await supabase.from('student_leaves').select('*').eq('student_id', activeChild.id).order('created_at', { ascending: false });
      if (leaves) setLeaveHistory(leaves);

      // 3. Fetch Grades for selected term
      const { data: grades } = await supabase.from('grades').select('*').eq('student_id', activeChild.id).eq('term', selectedTerm);
      if (grades) setTermGrades(grades);
    }

    fetchChildData();
  }, [activeChild, isLeaveModalOpen, selectedTerm]); 

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingLeave(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('student_leaves').insert([{
      student_id: activeChild.id,
      parent_id: user.id,
      leave_type: leaveType,
      start_date: leaveStart,
      end_date: leaveEnd,
      reason: leaveReason
    }]);

    if (!error) {
      setIsLeaveModalOpen(false);
      setLeaveStart(''); setLeaveEnd(''); setLeaveReason(''); setLeaveType('Regular');
    } else {
      alert("Failed to submit leave request.");
    }
    setIsSubmittingLeave(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // THE SHIELD: Blocks Teachers and Admins from seeing the Parent Portal
  if (!isAuthorized) {
    return (
      <div className="max-w-6xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500 mt-2">This module is restricted to Parent accounts only.</p>
      </div>
    );
  }

  // Determine Grading Logic Based on Class Level
  const classLevel = activeChild ? parseInt(activeChild.classes?.class_name.replace(/\D/g, '')) || 0 : 0;
  const usesLetterGrades = classLevel >= 1 && classLevel <= 4;
  const usesNumericMarks = classLevel >= 5;

  // Calculate Term Average for Numeric Grades
  const termAverage = usesNumericMarks && termGrades.length > 0
    ? Math.round(termGrades.reduce((acc, curr) => acc + (curr.numeric_mark || 0), 0) / termGrades.length)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy">Salaam, {parentName}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Here is your student's live academic progress.</p>
        </div>
        
        {children.length > 1 && (
          <div className="relative">
            <select 
              className="appearance-none bg-white border border-slate-200 text-school-navy font-bold py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
              onChange={(e) => setActiveChild(children.find(c => c.id === e.target.value))}
              value={activeChild?.id || ''}
            >
              {children.map(child => <option key={child.id} value={child.id}>{child.full_name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {activeChild ? (
        <>
          {/* Identity Card */}
          <div className="bg-school-navy rounded-2xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700">
                <span className="text-2xl font-bold text-slate-300">{activeChild.full_name.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold">{activeChild.full_name}</h2>
                <p className="text-slate-300 font-medium mt-1">{activeChild.classes?.class_name} • ITS: {activeChild.its_number}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsLeaveModalOpen(true)}
              className="relative z-10 bg-white text-school-navy px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" /> Apply for Leave
            </button>
            <BookOpen className="w-48 h-48 absolute -right-10 -bottom-10 text-slate-800 opacity-50" />
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-indigo-500">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Attendance</h3>
              <p className="text-3xl font-bold text-school-navy">{metrics.attendancePercentage}%</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-emerald-500">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Points</h3>
              <p className="text-3xl font-bold text-school-navy">{metrics.netPoints}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col border-b-4 border-b-school-yellow relative overflow-hidden">
              <Trophy className="w-16 h-16 absolute -right-2 -bottom-2 text-slate-50 opacity-50" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 relative z-10">Current Rank</h3>
              <p className="text-xl font-bold text-school-navy relative z-10">{metrics.rankName}</p>
            </div>
          </div>

          {/* NEW: Term Report Card Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-bold text-school-navy flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-500" /> Academic Report Card
              </h3>
              
              {/* Term Selector */}
              <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                {['Term 1', 'Term 2', 'Term 3'].map(term => (
                  <button 
                    key={term}
                    onClick={() => setSelectedTerm(term)}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                      selectedTerm === term ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {termGrades.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left: The Grades List */}
                  <div className="space-y-4">
                    {termGrades.map(grade => (
                      <div key={grade.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="font-bold text-school-navy">{grade.subject}</span>
                        
                        {usesLetterGrades ? (
                          <span className={`px-3 py-1 rounded text-sm font-bold border ${
                            ['A+', 'A'].includes(grade.letter_grade) ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            ['B'].includes(grade.letter_grade) ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            ['C'].includes(grade.letter_grade) ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {grade.letter_grade || 'N/A'}
                          </span>
                        ) : (
                          <span className={`text-sm font-bold ${
                            grade.numeric_mark >= 80 ? 'text-emerald-600' :
                            grade.numeric_mark >= 60 ? 'text-indigo-600' :
                            grade.numeric_mark >= 40 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {grade.numeric_mark || 0}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right: Summary / Term Average (Only for Numeric Classes) */}
                  {usesNumericMarks && (
                    <div className="bg-gradient-to-br from-indigo-900 to-school-navy rounded-xl p-6 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
                      <BarChart className="w-32 h-32 absolute -right-6 -bottom-6 opacity-20 text-indigo-400" />
                      <h4 className="text-indigo-200 font-bold uppercase tracking-widest text-xs mb-2 relative z-10">Overall Term Average</h4>
                      <div className="text-6xl font-bold relative z-10">{termAverage}%</div>
                      <p className="text-sm text-indigo-100 mt-4 relative z-10">
                        {termAverage >= 80 ? 'Excellent performance this term.' :
                         termAverage >= 60 ? 'Solid understanding of core concepts.' : 'Additional support may be needed.'}
                      </p>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GraduationCap className="w-12 h-12 text-slate-200 mb-3" />
                  <p className="text-lg font-bold text-slate-500">No Grades Posted</p>
                  <p className="text-sm text-slate-400">Report cards for {selectedTerm} have not been finalized yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Layout Grid for Recent Activity & Leave History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Activity Log */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-96">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-school-navy flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" /> Recent Activity</h3>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
                {recentActivity.map((log, i) => (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${log.log_type === 'Tashjee' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {log.log_type === 'Tashjee' ? '+' : '-'}{log.points}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-school-navy">{log.reason}</p>
                      <p className="text-[10px] text-slate-400">{new Date(log.logged_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leave History Box */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-96">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-school-navy flex items-center gap-2"><Calendar className="w-5 h-5 text-slate-400" /> Leave Requests</h3>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
                {leaveHistory.length > 0 ? leaveHistory.map((leave, i) => (
                  <div key={i} className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        leave.leave_type === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {leave.leave_type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        leave.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-school-navy mt-2">{new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{leave.reason}</p>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <Calendar className="w-8 h-8 opacity-20 mb-2" />
                    No leave requests found.
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      ) : (
        <div className="bg-white p-12 rounded-xl text-center">No Students Linked.</div>
      )}

      {/* --- LEAVE APPLICATION MODAL --- */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-school-navy text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" /> Apply for Leave
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400"><X className="w-5 h-5"/></button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-6 space-y-5">
              
              {/* Regular / Emergency Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  type="button"
                  onClick={() => setLeaveType('Regular')}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    leaveType === 'Regular' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Regular
                </button>
                <button 
                  type="button"
                  onClick={() => setLeaveType('Emergency')}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                    leaveType === 'Emergency' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-slate-500 hover:text-red-500'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" /> Emergency
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                  <input type="date" required value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg text-sm bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                  <input type="date" required value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} min={leaveStart || new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg text-sm bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Reason for Leave</label>
                <textarea required rows="3" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Please explain the reason..." className="w-full p-3 border rounded-lg text-sm resize-none bg-slate-50"></textarea>
              </div>

              <button type="submit" disabled={isSubmittingLeave} className={`w-full py-3 rounded-lg text-sm font-bold text-white transition-all shadow-md ${
                leaveType === 'Emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}>
                {isSubmittingLeave ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}