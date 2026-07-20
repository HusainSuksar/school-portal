// src/pages/SystemSettings.jsx
import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Save, Server, BookOpen, AlertTriangle, ToggleLeft, ToggleRight, PlusCircle, Trash2, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SystemSettings() {
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // Settings State
  const [settingsId, setSettingsId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const [gradingThreshold, setGradingThreshold] = useState(5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Dynamic Point Rules State
  const [pointRules, setPointRules] = useState([]);
  const [newRuleType, setNewRuleType] = useState('Tashjee');
  const [newRuleReason, setNewRuleReason] = useState('');
  const [newRulePoints, setNewRulePoints] = useState(1);
  const [isAddingRule, setIsAddingRule] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'ADMIN') {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Fetch System Variables
      const { data } = await supabase.from('system_settings').select('*').limit(1).single();
      if (data) {
        setSettingsId(data.id);
        setSchoolName(data.school_name);
        setAcademicYear(data.academic_year);
        setCurrentTerm(data.current_term);
        setGradingThreshold(data.grading_threshold);
        setMaintenanceMode(data.maintenance_mode);
      }

      // Fetch Dynamic Point Rules
      const { data: rulesData } = await supabase.from('point_rules').select('*').order('type').order('points', { ascending: false });
      if (rulesData) setPointRules(rulesData);

      setIsLoading(false);
    }
    
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });

    const { error } = await supabase
      .from('system_settings')
      .update({
        school_name: schoolName,
        academic_year: academicYear,
        current_term: currentTerm,
        grading_threshold: parseInt(gradingThreshold),
        maintenance_mode: maintenanceMode,
        updated_at: new Date().toISOString()
      })
      .eq('id', settingsId);

    if (error) {
      setStatusMsg({ type: 'error', text: 'Failed to update system settings.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Master configurations updated successfully.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
    setIsSaving(false);
  };

  // --- Dynamic Gamification Logic ---
  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newRuleReason || newRulePoints < 1) return;
    setIsAddingRule(true);

    const { data, error } = await supabase.from('point_rules').insert([{
      type: newRuleType,
      reason: newRuleReason,
      points: parseInt(newRulePoints)
    }]).select().single();

    if (!error && data) {
      setPointRules([...pointRules, data]);
      setNewRuleReason('');
      setNewRulePoints(1);
    }
    setIsAddingRule(false);
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete this rule from the system? Teachers will no longer be able to select it.")) return;
    await supabase.from('point_rules').delete().eq('id', id);
    setPointRules(pointRules.filter(r => r.id !== id));
  };

  if (isLoading) return <div className="max-w-4xl mx-auto h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500 mt-2">Global system configuration is restricted to Master Administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-500" /> System Configuration
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage global variables and operational rules for the entire portal.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="bg-school-navy hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" /> {isSaving ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <Server className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        
        {/* Global Identity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-school-navy">Institutional Parameters</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Platform Name</label>
              <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Active Academic Year</label>
              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer">
                <option value="2025-2026">2025 - 2026</option>
                <option value="2026-2027">2026 - 2027</option>
                <option value="2027-2028">2027 - 2028</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Current Term</label>
              <select value={currentTerm} onChange={(e) => setCurrentTerm(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Point Rules Engine */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-school-navy">Gamification & Point Rules</h3>
          </div>
          
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Add Rule Form */}
            <form onSubmit={handleAddRule} className="lg:col-span-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Rule Type</label>
                <select value={newRuleType} onChange={(e) => setNewRuleType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500">
                  <option value="Tashjee">Tashjee (Positive)</option>
                  <option value="Tanbeeh">Tanbeeh (Negative)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Reason</label>
                <input type="text" required value={newRuleReason} onChange={(e) => setNewRuleReason(e.target.value)} placeholder="e.g. Excellent adab" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Points Awarded/Deducted</label>
                <input type="number" min="1" required value={newRulePoints} onChange={(e) => setNewRulePoints(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" disabled={isAddingRule} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                <PlusCircle className="w-4 h-4" /> {isAddingRule ? 'Adding...' : 'Add Rule'}
              </button>
            </form>

            {/* Right: Active Rules Table */}
            <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Type</th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Reason</th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase text-center">Pts</th>
                    <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pointRules.map(rule => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${rule.type === 'Tashjee' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {rule.type}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-bold text-school-navy">{rule.reason}</td>
                      <td className="p-3 text-sm font-bold text-slate-700 text-center">{rule.points}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="p-4 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-900">Danger Zone</h3>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-school-navy text-lg">Maintenance Mode</h4>
              <p className="text-sm text-slate-500 mt-1">If activated, all non-admin users will be locked out of the portal until disabled.</p>
            </div>
            <button onClick={() => setMaintenanceMode(!maintenanceMode)} className={`p-2 rounded-full transition-colors ${maintenanceMode ? 'text-red-500' : 'text-slate-300 hover:text-slate-400'}`}>
              {maintenanceMode ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}