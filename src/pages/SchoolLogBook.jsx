// src/pages/SchoolLogBook.jsx
import React, { useState, useEffect } from 'react';
import { Book, Search, Filter, TrendingUp, AlertTriangle, Clock, User, Award, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SchoolLogBook() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    setIsAdmin(profile?.role === 'ADMIN' || profile?.role === 'HOS');

    const { data } = await supabase
      .from('behavior_logs')
      .select('id, log_type, points, reason, logged_at, students(full_name, its_number, classes(class_name)), profiles(full_name)')
      .order('logged_at', { ascending: false }).limit(100);

    if (data) setLogs(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Permanently delete this behavior log? This will affect the student's net score.")) return;
    const { error } = await supabase.from('behavior_logs').delete().eq('id', id);
    if (!error) setLogs(logs.filter(log => log.id !== id));
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.students?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || log.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || log.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'All' || log.log_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2"><Book className="w-6 h-6 text-indigo-500" /> Master Log Book</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Real-time audit trail of all academic and behavioral points awarded.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search student, teacher, or reason..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full md:w-auto">
          <button onClick={() => setFilterType('All')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filterType === 'All' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500'}`}>All Logs</button>
          <button onClick={() => setFilterType('Tashjee')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1 ${filterType === 'Tashjee' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4" /> Tashjee</button>
          <button onClick={() => setFilterType('Tanbeeh')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-1 ${filterType === 'Tanbeeh' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500'}`}><AlertTriangle className="w-4 h-4" /> Tanbeeh</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          {isLoading ? (
            <div className="h-full min-h-[400px] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Student Name</th>
                  <th className="p-4 font-bold">Class</th>
                  <th className="p-4 font-bold">Points & Reason</th>
                  <th className="p-4 font-bold">Logged By</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full ${log.log_type === 'Tashjee' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {log.log_type === 'Tashjee' ? <TrendingUp className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </span>
                    </td>
                    <td className="p-4"><p className="text-sm font-bold text-school-navy">{log.students?.full_name}</p><p className="text-xs text-slate-500 font-mono">{log.students?.its_number}</p></td>
                    <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{log.students?.classes?.class_name || 'N/A'}</span></td>
                    <td className="p-4 max-w-xs"><p className="text-sm font-bold text-slate-700"><span className={log.log_type === 'Tashjee' ? 'text-emerald-600' : 'text-red-600'}>{log.log_type === 'Tashjee' ? '+' : '-'}{log.points} Pts</span></p><p className="text-xs text-slate-500 truncate mt-0.5">{log.reason}</p></td>
                    <td className="p-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><User className="w-3 h-3" /></div><span className="text-sm font-medium text-slate-600">{log.profiles?.full_name}</span></div></td>
                    <td className="p-4 text-right flex flex-col items-end justify-center">
                      <p className="text-sm font-bold text-slate-600">{new Date(log.logged_at).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5"><Clock className="w-3 h-3" /> {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      {isAdmin && (
                        <button onClick={() => handleDeleteLog(log.id)} className="mt-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" title="Delete Audit Log">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="p-12 text-center text-slate-400"><Award className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-sm font-bold text-slate-500">No logs found.</p></td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}