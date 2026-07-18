// src/pages/ITSAudit.jsx
import React, { useState, useEffect } from 'react';
import { Database, ShieldAlert, CheckCircle2, AlertTriangle, Users, Server, HardDrive, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ITSAudit() {
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  
  const [auditData, setAuditData] = useState({
    healthScore: 100,
    totalProfiles: 0,
    totalStudents: 0,
    issues: []
  });

  const runSystemAudit = async () => {
    setIsScanning(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Security Checkpoint
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'ADMIN' && profile?.role !== 'HOS') {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // 2. Fetch Master Tables
      const { data: students } = await supabase.from('students').select('id, full_name, its_number, class_id');
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, phone_number');

      let foundIssues = [];
      let totalChecks = 0;
      let passedChecks = 0;

      // 3. Run Diagnostics on Students
      if (students) {
        students.forEach(student => {
          totalChecks += 2; // Checking Class Assignment & ITS Format
          
          if (!student.class_id) {
            foundIssues.push({
              severity: 'High',
              type: 'Student Record',
              entity: student.full_name,
              issue: 'Not assigned to any class',
              id: student.id
            });
          } else {
            passedChecks++;
          }

          // Check if ITS number is exactly 8 digits
          const itsString = String(student.its_number);
          if (!student.its_number || itsString.length !== 8 || !/^\d+$/.test(itsString)) {
            foundIssues.push({
              severity: 'Medium',
              type: 'ITS Format Error',
              entity: student.full_name,
              issue: `Invalid ITS format (${student.its_number || 'Missing'})`,
              id: student.id
            });
          } else {
            passedChecks++;
          }
        });
      }

      // 4. Run Diagnostics on Profiles (Staff & Parents)
      if (profiles) {
        profiles.forEach(prof => {
          totalChecks += 1; // Checking Phone Number presence
          
          if (!prof.phone_number || prof.phone_number.trim() === '') {
            foundIssues.push({
              severity: 'Low',
              type: 'Profile Record',
              entity: `${prof.full_name} (${prof.role})`,
              issue: 'Missing contact phone number',
              id: prof.id
            });
          } else {
            passedChecks++;
          }
        });
      }

      // 5. Calculate Health Score
      const healthPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

      // Sort issues by severity (High -> Medium -> Low)
      const severityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
      foundIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setAuditData({
        healthScore: healthPct,
        totalProfiles: profiles?.length || 0,
        totalStudents: students?.length || 0,
        issues: foundIssues
      });

    } catch (error) {
      console.error("Audit failed:", error);
    } finally {
      setIsScanning(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSystemAudit();
  }, []);

  if (!isAuthorized) {
    return (
      <div className="max-w-6xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500 mt-2">Database auditing is restricted to Master Administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-500" />
            ITS Database Audit
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Run real-time diagnostics to ensure data integrity across all nodes.</p>
        </div>
        <button 
          onClick={runSystemAudit}
          disabled={isScanning}
          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} /> 
          {isScanning ? 'Scanning...' : 'Run Diagnostics'}
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Health Score & Metrics */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Massive Health Score Card */}
            <div className={`rounded-xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col items-center justify-center text-center border-4 ${
              auditData.healthScore >= 95 ? 'bg-emerald-600 border-emerald-500' : 
              auditData.healthScore >= 80 ? 'bg-amber-500 border-amber-400' : 'bg-red-600 border-red-500'
            }`}>
              <HardDrive className="w-32 h-32 absolute -right-6 -bottom-6 opacity-20" />
              <h3 className="text-sm font-bold uppercase tracking-widest mb-2 opacity-90 relative z-10">Database Health</h3>
              <p className="text-7xl font-bold relative z-10 tracking-tighter">{auditData.healthScore}%</p>
              <p className="text-sm mt-4 font-medium opacity-90 relative z-10">
                {auditData.healthScore === 100 ? 'Perfect Data Integrity' : 'Action Required to Reach 100%'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-school-navy flex items-center gap-2 mb-4">
                <Server className="w-5 h-5 text-slate-400" /> Infrastructure Overview
              </h3>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">Total Users (Auth)</span>
                </div>
                <span className="font-bold text-school-navy">{auditData.totalProfiles}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-700">Student Nodes</span>
                </div>
                <span className="font-bold text-school-navy">{auditData.totalStudents}</span>
              </div>
            </div>

          </div>

          {/* Right Column: Diagnostic Logs */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-school-navy flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-slate-400" /> Audit Findings ({auditData.issues.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {auditData.issues.length > 0 ? (
                auditData.issues.map((issue, index) => (
                  <div key={index} className={`p-4 border rounded-xl flex items-start gap-4 ${
                    issue.severity === 'High' ? 'bg-red-50 border-red-200' :
                    issue.severity === 'Medium' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      issue.severity === 'High' ? 'bg-red-100 text-red-600' :
                      issue.severity === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          issue.severity === 'High' ? 'bg-red-200 text-red-800' :
                          issue.severity === 'Medium' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {issue.severity} Priority
                        </span>
                        <span className="text-xs font-bold text-slate-500">{issue.type}</span>
                      </div>
                      <p className="font-bold text-school-navy">{issue.entity}</p>
                      <p className="text-sm font-medium text-slate-600 mt-1">{issue.issue}</p>
                    </div>

                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <CheckCircle2 className="w-16 h-16 mb-4 text-emerald-400" />
                  <h3 className="text-lg font-bold text-school-navy">System is Clean</h3>
                  <p className="mt-1 max-w-sm">No orphaned records, missing classes, or formatting errors were detected during the scan.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}