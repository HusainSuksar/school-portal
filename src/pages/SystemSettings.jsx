// src/pages/SystemSettings.jsx
import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Save, Server, BookOpen, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
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

  useEffect(() => {
    async function fetchSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Security Checkpoint: strictly ADMIN only
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'ADMIN') {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // 2. Fetch the single settings row
      const { data, error } = await supabase.from('system_settings').select('*').limit(1).single();
      
      if (data) {
        setSettingsId(data.id);
        setSchoolName(data.school_name);
        setAcademicYear(data.academic_year);
        setCurrentTerm(data.current_term);
        setGradingThreshold(data.grading_threshold);
        setMaintenanceMode(data.maintenance_mode);
      }
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
      console.error("Save error:", error);
      setStatusMsg({ type: 'error', text: 'Failed to update system settings.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Master configurations updated successfully.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
    
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
            <Settings className="w-6 h-6 text-indigo-500" />
            System Configuration
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage global variables and operational rules for the entire portal.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-school-navy hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> 
          {isSaving ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
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
              <input 
                type="text" 
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Active Academic Year</label>
              <select 
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="2025-2026">2025 - 2026</option>
                <option value="2026-2027">2026 - 2027</option>
                <option value="2027-2028">2027 - 2028</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Current Term</label>
              <select 
                value={currentTerm}
                onChange={(e) => setCurrentTerm(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
        </div>

        {/* Academic Rules */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-school-navy">Academic Logic & Rules</h3>
          </div>
          <div className="p-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Grading System Split Threshold</label>
            <p className="text-sm text-slate-500 mb-4">
              Configure the class level where the evaluation methodology switches. Classes below this threshold will utilize letter grading, while this class and above will transition strictly to numeric marks.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">Letter Grades (A-F)</span>
              <div className="flex-1 max-w-[200px]">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-indigo-500">Class</span>
                  <input 
                    type="number" 
                    min="1"
                    max="12"
                    value={gradingThreshold}
                    onChange={(e) => setGradingThreshold(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 bg-white border-2 border-indigo-200 rounded-lg text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">Numeric Marks (0-100)</span>
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
            <button 
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`p-2 rounded-full transition-colors ${maintenanceMode ? 'text-red-500' : 'text-slate-300 hover:text-slate-400'}`}
            >
              {maintenanceMode ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}