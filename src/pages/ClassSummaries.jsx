// src/pages/ClassSummaries.jsx
import React, { useState, useEffect } from 'react';
import { Trophy, Users, TrendingUp, AlertTriangle, Medal, ShieldAlert, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ClassSummaries() {
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classData, setClassData] = useState([]);

  useEffect(() => {
    async function initializePage() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Security Checkpoint: Block Parents
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'PARENT') {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // 2. Fetch Available Classes
      const { data: classList } = await supabase
        .from('classes')
        .select('id, class_name')
        .order('class_name');
        
      if (classList) setClasses(classList);
      setIsLoading(false);
    }
    initializePage();
  }, []);

  useEffect(() => {
    async function fetchClassStats() {
      if (!selectedClassId) {
        setClassData([]);
        return;
      }

      setIsLoading(true);

      // 1. Fetch Students in the selected class
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, its_number')
        .eq('class_id', selectedClassId);

      if (!students || students.length === 0) {
        setClassData([]);
        setIsLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      // 2. Fetch Behavior Logs for the whole class
      const { data: logs } = await supabase
        .from('behavior_logs')
        .select('student_id, log_type, points')
        .in('student_id', studentIds);

      // 3. Fetch Attendance Records for the whole class
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .in('student_id', studentIds);

      // 4. Aggregate Data per Student
      const aggregatedData = students.map(student => {
        // Calculate Points
        const studentLogs = logs ? logs.filter(l => l.student_id === student.id) : [];
        let tashjee = 0;
        let tanbeeh = 0;
        studentLogs.forEach(l => {
          if (l.log_type === 'Tashjee') tashjee += l.points;
          if (l.log_type === 'Tanbeeh') tanbeeh += l.points;
        });

        // Calculate Attendance
        const studentAtt = attendance ? attendance.filter(a => a.student_id === student.id) : [];
        const presentDays = studentAtt.filter(a => a.status === 'Present').length;
        const attPct = studentAtt.length > 0 ? Math.round((presentDays / studentAtt.length) * 100) : 100;

        return {
          id: student.id,
          name: student.full_name,
          its: student.its_number,
          tashjee,
          tanbeeh,
          netPoints: tashjee - tanbeeh,
          attPct
        };
      });

      // 5. Sort by Net Points (Highest to Lowest) for Leaderboard
      aggregatedData.sort((a, b) => b.netPoints - a.netPoints);

      setClassData(aggregatedData);
      setIsLoading(false);
    }

    fetchClassStats();
  }, [selectedClassId]);

  if (!isAuthorized) {
    return (
      <div className="max-w-6xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500 mt-2">This module is reserved for faculty and administration.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* 1. Header & Class Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Trophy className="w-6 h-6 text-indigo-500" />
            Class Summaries & Leaderboards
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Select a class to view aggregate performance and behavioral standings.</p>
        </div>
        
        <div className="w-full md:w-64">
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
          >
            <option value="">-- Choose a Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.class_name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && selectedClassId ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : selectedClassId && classData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 2. Top 3 Leaderboard Podium */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-b from-indigo-900 to-school-navy rounded-xl shadow-lg border border-slate-800 p-6 text-white relative overflow-hidden">
              <Star className="w-32 h-32 absolute -right-8 -bottom-8 text-indigo-500 opacity-20" />
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 relative z-10">
                <Medal className="w-5 h-5 text-school-yellow" /> Top Performers
              </h3>
              
              <div className="space-y-4 relative z-10">
                {classData.slice(0, 3).map((student, index) => (
                  <div key={student.id} className="flex items-center gap-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-300 text-orange-900'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{student.name}</p>
                      <p className="text-xs text-indigo-200">{student.netPoints} Net Points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Class Averages Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-school-navy mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" /> Class Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Total Students</span>
                  <span className="font-bold text-school-navy">{classData.length}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Average Attendance</span>
                  <span className="font-bold text-emerald-600">
                    {Math.round(classData.reduce((acc, curr) => acc + curr.attPct, 0) / classData.length)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Complete Class Roster Table */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-school-navy">Complete Roster Standing</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 sticky top-0 shadow-sm z-10">
                    <th className="p-4 font-bold w-12 text-center">Rank</th>
                    <th className="p-4 font-bold">Student Name</th>
                    <th className="p-4 font-bold text-center">Attendance</th>
                    <th className="p-4 font-bold text-center">Appreciative</th>
                    <th className="p-4 font-bold text-center">Behavioral</th>
                    <th className="p-4 font-bold text-right">Net Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classData.map((student, index) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-400 text-center">#{index + 1}</td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-school-navy">{student.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{student.its}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          student.attPct >= 90 ? 'text-emerald-700 bg-emerald-50' : 
                          student.attPct >= 75 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                        }`}>
                          {student.attPct}%
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold text-emerald-600">+{student.tashjee}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold text-red-500">-{student.tanbeeh}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-school-navy">{student.netPoints}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : selectedClassId ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-school-navy">No Students Found</h3>
          <p className="text-slate-500 mt-2">There are currently no students assigned to this class.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
          <Trophy className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Select a Class</h3>
          <p className="text-slate-500 mt-2 max-w-md">Choose a class from the dropdown menu above to generate its leaderboard and performance summary.</p>
        </div>
      )}

    </div>
  );
}