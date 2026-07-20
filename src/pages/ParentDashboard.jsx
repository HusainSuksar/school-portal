import React, { useState, useEffect } from 'react';
import { Users, Calendar, Award, BookOpen, Clock, ChevronDown, Activity, CheckCircle2, AlertCircle, Shield, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

const getRankBadge = (netPoints) => {
  let badge = { title: 'Unranked', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: 'text-slate-400' };
  
  if (netPoints >= 500) badge = { title: 'Platinum Star', color: 'bg-slate-200 text-slate-800 border-slate-400', icon: 'text-slate-600' };
  else if (netPoints >= 250) badge = { title: 'Gold Star', color: 'bg-yellow-100 text-yellow-800 border-yellow-400', icon: 'text-yellow-600' };
  else if (netPoints >= 100) badge = { title: 'Silver Star', color: 'bg-slate-100 text-slate-600 border-slate-300', icon: 'text-slate-400' };
  else if (netPoints >= 50) badge = { title: 'Bronze Star', color: 'bg-orange-100 text-orange-800 border-orange-400', icon: 'text-orange-600' };
  
  return { ...badge, netPoints };
};

export default function ParentDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState('');
  
  const [attendanceStats, setAttendanceStats] = useState({ percentage: 0, recent: [] });
  const [grades, setGrades] = useState([]);
  const [behaviorRank, setBehaviorRank] = useState(null);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  useEffect(() => {
    if (activeChildId) {
      fetchChildMetrics(activeChildId);
    }
  }, [activeChildId]);

  const fetchFamilyData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: linkedStudents } = await supabase.from('students').select('id, full_name, its_number, father_name, mother_name, class_id, classes (class_name)').eq('parent_id', user.id).order('full_name');
    if (linkedStudents && linkedStudents.length > 0) {
      setChildren(linkedStudents);
      setActiveChildId(linkedStudents[0].id);
    }
    setIsLoading(false);
  };

  const fetchChildMetrics = async (childId) => {
    // 1. Fetch Attendance Data
    const { data: attendanceData } = await supabase.from('attendance').select('date, status').eq('student_id', childId).order('date', { ascending: false });
    if (attendanceData) {
      const attendedDays = attendanceData.filter(a => a.status === 'Present' || a.status === 'Late').length;
      setAttendanceStats({
        percentage: attendanceData.length > 0 ? Math.round((attendedDays / attendanceData.length) * 100) : 0,
        recent: attendanceData.slice(0, 5)
      });
    }

    // 2. Fetch Grades Data (Wrapped in Try/Catch to prevent crashes)
    try {
      const { data: gradesData, error } = await supabase.from('grades').select('term, numeric_mark, letter_grade, subjects(name)').eq('student_id', childId).order('term', { ascending: false });
      if (error) console.warn("Grades fetch error (likely no grades exist):", error);
      if (gradesData) setGrades(gradesData);
    } catch (err) {
      console.warn("Could not fetch grades.");
    }

    // 3. Calculate Behavior Ranks for the Badge
    const { data: logsData } = await supabase.from('behavior_logs').select('log_type, points').eq('student_id', childId);
    let tPts = 0; let bPts = 0;
    if (logsData) {
      logsData.forEach(l => {
        if (l.log_type === 'Tashjee') tPts += l.points;
        else bPts += l.points;
      });
    }
    setBehaviorRank(getRankBadge(tPts - bPts));
  };

  const activeChild = children.find(c => c.id === activeChildId);

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (children.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center">
          <Shield className="w-16 h-16 text-slate-200 mb-4" />
          <h2 className="text-2xl font-bold text-school-navy">No Students Linked</h2>
          <p className="text-slate-500 mt-2 max-w-md">Your parent account is active, but no students are currently linked. Please contact administration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" /> Family Dashboard
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Real-time academic and conduct metrics.</p>
        </div>
        {children.length > 1 && (
          <div className="relative group">
            <select value={activeChildId} onChange={(e) => setActiveChildId(e.target.value)} className="appearance-none bg-school-navy text-white font-bold py-2.5 pl-4 pr-10 rounded-lg shadow-md cursor-pointer hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {children.map(child => <option key={child.id} value={child.id}>{child.full_name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-white absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="h-16 bg-indigo-600/10 border-b border-indigo-600/10"></div>
            <div className="px-6 pb-6 pt-0 relative">
              
              {/* Flex Container to perfectly space Avatar and Rank Badge */}
              <div className="flex justify-between items-start pt-2">
                <div className="w-20 h-20 bg-white rounded-full p-1.5 -mt-10 shadow-sm border border-slate-100 relative z-10 shrink-0">
                  <div className="w-full h-full bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    {activeChild?.full_name.charAt(0)}
                  </div>
                </div>
                
                {/* Cleanly aligned Rank Badge & Points Pill */}
                {behaviorRank && (
                  <div className="flex flex-col items-end mt-3">
                    <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 shadow-sm ${behaviorRank.color}`}>
                      <Star className={`w-4 h-4 ${behaviorRank.icon} fill-current`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{behaviorRank.title}</span>
                    </div>
                    <span className="text-xs font-bold text-school-navy mt-1.5 bg-slate-50 px-2 py-0.5 rounded shadow-sm border border-slate-200">
                      {behaviorRank.netPoints} Net Points
                    </span>
                  </div>
                )}
              </div>
              
              <div className="pt-4">
                <h3 className="text-xl font-bold text-school-navy leading-tight">{activeChild?.full_name}</h3>
                <p className="text-sm text-indigo-600 font-bold mt-0.5">ITS: {activeChild?.its_number}</p>
                
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Class</p>
                    <p className="text-sm font-bold text-slate-700">{activeChild?.classes?.class_name || 'Unassigned'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg"><Activity className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-school-navy">Attendance Health</h3>
                <p className="text-xs font-medium text-slate-500">Current Academic Year</p>
              </div>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-4xl font-black ${attendanceStats.percentage >= 90 ? 'text-emerald-500' : attendanceStats.percentage >= 75 ? 'text-amber-500' : 'text-red-500'}`}>
                {attendanceStats.percentage}%
              </span>
              <span className="text-sm font-bold text-slate-400 mb-1">Present</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
              <div className={`h-full rounded-full transition-all duration-1000 ${attendanceStats.percentage >= 90 ? 'bg-emerald-500' : attendanceStats.percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${attendanceStats.percentage}%` }}></div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Activity</p>
              {attendanceStats.recent.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No attendance records found yet.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceStats.recent.map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-sm font-bold text-slate-600">{new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : record.status === 'Late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg"><Award className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-school-navy">Academic Report Card</h3>
                  <p className="text-xs font-medium text-slate-500">Live term grades and marks</p>
                </div>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {grades.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <BookOpen className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="font-bold text-slate-500">No Grades Published</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">Teachers have not yet published term grades for this student.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {['Term 1', 'Term 2', 'Term 3'].map(term => {
                    const termGrades = grades.filter(g => g.term === term);
                    if (termGrades.length === 0) return null;
                    return (
                      <div key={term}>
                        <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> {term}</h4>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Grade / Mark</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {termGrades.map((grade, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3 text-sm font-bold text-school-navy">{grade.subjects.name}</td>
                                  <td className="p-3 text-sm font-bold text-slate-700 text-right">
                                    {grade.letter_grade ? <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">{grade.letter_grade}</span> : <span className="text-lg">{grade.numeric_mark}%</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}