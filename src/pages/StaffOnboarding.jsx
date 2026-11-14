// src/pages/StaffOnboarding.jsx
import React, { useState, useEffect } from 'react';
import { UploadCloud, ShieldAlert, CheckCircle2, AlertTriangle, UserPlus, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ID_LABEL_FULL } from '../config/school';
import { onboardStaff, describeFirstFailure } from '../lib/adminApi';

export default function StaffOnboarding() {
  // Authorization State
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // Bulk Upload State
  const [file, setFile] = useState(null);
  const [previewCount, setPreviewCount] = useState(0);

  // Single Staff Form State
  const [formData, setFormData] = useState({
    fullName: '',
    itsNumber: '',
    role: 'TEACHER'
  });

  useEffect(() => {
    async function verifyAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAuthorized(false);
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile?.role !== 'ADMIN' && profile?.role !== 'HOS') {
          setIsAuthorized(false);
          return;
        }
        setIsAuthorized(true);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthorized(false);
      } finally {
        setIsAuthChecking(false);
      }
    }
    verifyAuth();
  }, []);

  // --- SINGLE STAFF LOGIC ---
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatus({ type: '', msg: '' });

    try {
      // The server creates the login + profile after verifying this user is ADMIN/HOS
      const [result] = await onboardStaff([{
        its_number: formData.itsNumber,
        full_name: formData.fullName,
        role: formData.role
      }]);

      if (!result?.ok) {
        throw new Error(result?.error || 'Failed to add staff member.');
      }

      setStatus({ type: 'success', msg: `${formData.fullName} has been successfully provisioned.` });
      setFormData({ fullName: '', itsNumber: '', role: 'TEACHER' });

    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Failed to add staff member.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BULK CSV LOGIC ---
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = [];
      let inQuotes = false;
      let currentValue = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes; 
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = ''; 
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue); 

      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] ? values[index].replace(/(^"|"$)/g, '').trim() : '';
      });
      return obj;
    });
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setStatus({ type: '', msg: '' });

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = parseCSV(event.target.result);
      setPreviewCount(data.length);
    };
    reader.readAsText(selectedFile);
  };

  const executeBulkUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus({ type: '', msg: '' });

    try {
      const text = await file.text();
      const staffList = parseCSV(text);

      if (staffList.length > 0 && !staffList[0].its_number) {
        throw new Error("Missing critical column: 'its_number'. Please check your CSV headers.");
      }

      const validRoles = ['ADMIN', 'HOS', 'TEACHER', 'CLASS_TR'];

      const rows = staffList
        .filter((staff) => staff.its_number)
        .map((staff) => {
          const rawRole = (staff.role || '').trim().toUpperCase();
          return {
            its_number: staff.its_number,
            full_name: staff.full_name || 'Staff Member',
            role: validRoles.includes(rawRole) ? rawRole : 'TEACHER',
            designation: staff.designation || null,
            phone_number: staff.phone_number || null,
            personal_email: staff.personal_email || null,
            address: staff.address || null
          };
        });

      // The server creates the logins + profiles after verifying this user is ADMIN/HOS
      const results = await onboardStaff(rows);
      const successCount = results.filter((r) => r.ok).length;
      const errorCount = results.length - successCount;

      results.forEach((r, i) => {
        if (!r.ok) console.warn(`Onboarding failed for ${rows[i]?.its_number}:`, r.error);
      });

      setStatus({ 
        type: errorCount === 0 ? 'success' : 'error', 
        msg: `Successfully onboarded ${successCount} faculty members.${errorCount > 0 ? ` Encountered issues with ${errorCount} records.${describeFirstFailure(rows, results, 'its_number')}` : ''}` 
      });
      setFile(null);
      setPreviewCount(0);
      
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Failed to process bulk upload.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
        <p className="text-slate-500 text-sm max-w-md text-center">
          Only School Administrators and Heads of School have permission to access the Staff Onboarding Engine.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-500" />
          Staff Onboarding Engine
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Provision new staff accounts and manage system access.</p>
      </div>

      {/* Global Status Message */}
      {status.msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
          status.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{status.msg}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-fit">
        <button 
          onClick={() => { setActiveTab('single'); setStatus({type: '', msg: ''}); }}
          className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'single' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserPlus className="w-4 h-4" /> Add Single Staff
        </button>
        <button 
          onClick={() => { setActiveTab('bulk'); setStatus({type: '', msg: ''}); }}
          className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'bulk' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UploadCloud className="w-4 h-4" /> Bulk CSV Upload
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
        
        {activeTab === 'single' ? (
          
          /* --- SINGLE STAFF FORM --- */
          <form onSubmit={handleSingleSubmit} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                placeholder="e.g. Jane Doe"
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold text-school-navy"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{ID_LABEL_FULL}</label>
                <input 
                  type="text" 
                  required
                  value={formData.itsNumber}
                  onChange={(e) => setFormData({...formData, itsNumber: e.target.value})}
                  placeholder="e.g. 40233033"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold text-school-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold text-school-navy"
                >
                  <option value="TEACHER">Subject Teacher</option>
                  <option value="CLASS_TR">Class Teacher</option>
                  <option value="HOS">Head of School (HOS)</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
            >
              {isProcessing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Provisioning Account...</>
              ) : (
                <><UserPlus className="w-5 h-5" /> Create Staff Account</>
              )}
            </button>
          </form>

        ) : (

          /* --- BULK CSV DROPZONE --- */
          <div>
            <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm mb-6 border border-indigo-100">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4" /> Required CSV Headers
              </h4>
              <p className="font-mono bg-white p-2 rounded border border-indigo-200 text-xs">
                its_number, full_name, designation, personal_email, phone_number, address, role
              </p>
              <p className="mt-2 text-xs opacity-80">* Role should be 'TEACHER', 'CLASS_TR', 'HOS', or 'ADMIN'. If left blank, it defaults to 'TEACHER'.</p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors relative">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-school-navy mb-1">
                {file ? file.name : 'Drag & Drop your CSV here'}
              </h4>
              <p className="text-sm text-slate-500">
                {file ? `${previewCount} faculty records detected` : 'or click to browse your computer'}
              </p>
            </div>

            {file && (
              <button 
                onClick={executeBulkUpload}
                disabled={isProcessing}
                className="w-full mt-6 bg-school-navy hover:bg-slate-800 text-white py-3.5 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isProcessing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Provisioning Accounts...</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> Execute Bulk Onboarding</>
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
