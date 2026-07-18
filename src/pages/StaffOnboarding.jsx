// src/pages/StaffOnboarding.jsx
import React, { useState } from 'react';
import { Users, UploadCloud, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export default function StaffOnboarding() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [previewCount, setPreviewCount] = useState(0);

  // Simple CSV Parser
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] ? values[index].trim() : '';
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
  setIsUploading(true);
  setStatus({ type: '', msg: '' });

  try {
    const text = await file.text();
    const staffList = parseCSV(text);

    if (staffList.length > 0 && !staffList[0].its_number) {
      throw new Error("Missing critical column: 'its_number'. Please check your CSV headers.");
    }

    // 1. Initialize the powerful Admin Client
    const supabaseAdmin = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let successCount = 0;

    // 2. Process faculty members one by one securely
    for (const staff of staffList) {
      const proxyEmail = `${staff.its_number}@msb.local`;

      // Step A: Officially create the user in the Auth engine
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: proxyEmail,
        password: '786110',
        email_confirm: true
      });

      if (authError) {
        console.warn(`Skipping ${staff.its_number}:`, authError.message);
        continue; // Skip this user and move to the next if they already exist
      }

      // Step B: THE FIX - Use supabaseAdmin here to bypass RLS security blocks
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        full_name: staff.full_name,
        role: staff.role || 'TEACHER',
        its_number: staff.its_number,
        designation: staff.designation,
        phone_number: staff.phone_number,
        personal_email: staff.personal_email,
        address: staff.address,
        requires_password_change: true
      });

      if (profileError) {
        console.error(`Failed to inject profile for ${staff.its_number}:`, profileError);
      }

      successCount++;
    }

    setStatus({ type: 'success', msg: `Successfully onboarded ${successCount} faculty members via official API.` });
    setFile(null);
    setPreviewCount(0);
    
  } catch (err) {
    console.error(err);
    setStatus({ type: 'error', msg: err.message || 'Failed to process bulk upload.' });
  } finally {
    setIsUploading(false);
  }
};

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" />
          Bulk Staff Onboarding
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Automatically provision authenticated accounts and profiles from a CSV file.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-school-navy">Import Faculty Data</h3>
        </div>
        
        <div className="p-8">
          
          {/* Instructions */}
          <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm mb-8 border border-indigo-100">
            <h4 className="font-bold flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4" /> Required CSV Headers
            </h4>
            <p className="font-mono bg-white p-2 rounded border border-indigo-200 text-xs">
              its_number, full_name, designation, personal_email, phone_number, address, role
            </p>
            <p className="mt-2 text-xs opacity-80">* Role should be 'TEACHER', 'CLASS_TR', or 'HOS'. If left blank, it defaults to 'TEACHER'.</p>
          </div>

          {/* Upload Zone */}
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

          {status.msg && (
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
              status.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              <p className="text-sm font-bold">{status.msg}</p>
            </div>
          )}

          {file && (
            <button 
              onClick={executeBulkUpload}
              disabled={isUploading}
              className="w-full mt-6 bg-school-navy hover:bg-slate-800 text-white py-3.5 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isUploading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Provisioning Accounts...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Execute Bulk Onboarding</>
              )}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}