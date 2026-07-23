// src/pages/ParentOnboarding.jsx
import React, { useState } from 'react';
import { Users, UploadCloud, ShieldAlert, CheckCircle2, AlertTriangle, Link, UserPlus, FileText, Mail, Phone } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export default function ParentOnboarding() {
  const [activeTab, setActiveTab] = useState('single');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const [file, setFile] = useState(null);
  const [previewCount, setPreviewCount] = useState(0);

  const [formData, setFormData] = useState({
    studentIts: '',
    fatherName: '',
    motherName: '',
    parentIts: '',
    parentEmail: '',
    parentPhone: ''
  });

  const getAdminClient = () => {
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  };

  const getOrCreateParent = async (supabaseAdmin, parentIts, fatherName, parentEmail, parentPhone) => {
    const cleanFullName = fatherName ? `${fatherName}` : `Parent ${parentIts}`;
    const cleanPhone = parentPhone ? String(parentPhone).trim() : null;
    const cleanEmail = parentEmail ? String(parentEmail).trim() : null;

    // 1. Check if Parent already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('its_number', parentIts)
      .maybeSingle();

    if (existingProfile) {
      // Update existing parent profile with fresh details
      await supabaseAdmin.from('profiles').update({
        full_name: cleanFullName,
        phone_number: cleanPhone,
        personal_email: cleanEmail
      }).eq('id', existingProfile.id);
      
      return existingProfile.id;
    }

    // 2. Provision new Auth Account using proxy email format
    const proxyEmail = `${parentIts}@msb.local`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: proxyEmail,
      password: '786110', // Default parent password
      email_confirm: true
    });

    if (authError && !authError.message.includes('already registered') && !authError.message.includes('already exists')) {
      throw authError;
    }

    let targetUserId = authData?.user?.id;

    if (!targetUserId) {
      // Fallback lookup if auth user already existed
      const { data: fallbackUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('its_number', parentIts)
        .maybeSingle();
      if (fallbackUser) return fallbackUser.id;
      return null;
    }

    // 3. Inject Profile into 'profiles' table using EXACT schema column names
    if (targetUserId) {
      const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
        id: targetUserId,
        full_name: cleanFullName,
        role: 'PARENT',
        its_number: parentIts,
        personal_email: cleanEmail,
        phone_number: cleanPhone,
        requires_password_change: true
      });

      if (upsertError) {
        console.warn("Profile upsert warning:", upsertError.message);
      }
      return targetUserId;
    }

    return null;
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatus({ type: '', msg: '' });

    try {
      const supabaseAdmin = getAdminClient();
      
      // Verify target student
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('its_number', formData.studentIts)
        .single();
        
      if (!student) throw new Error(`Student with ITS ${formData.studentIts} not found in database.`);

      // Provision/Fetch Parent
      const parentId = await getOrCreateParent(
        supabaseAdmin, 
        formData.parentIts, 
        formData.fatherName, 
        formData.parentEmail, 
        formData.parentPhone
      );
      if (!parentId) throw new Error("Failed to resolve Parent Account.");

      // Link Student to Parent
      const { error: updateError } = await supabaseAdmin
        .from('students')
        .update({
          parent_id: parentId,
          father_name: formData.fatherName,
          mother_name: formData.motherName,
          primary_parent_its: formData.parentIts
        })
        .eq('its_number', formData.studentIts);

      if (updateError) throw updateError;

      setStatus({ type: 'success', msg: `Successfully linked Parent to Student (${formData.studentIts}).` });
      setFormData({ studentIts: '', fatherName: '', motherName: '', parentIts: '', parentEmail: '', parentPhone: '' });

    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Failed to link parent and student.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      // Safely parse CSV while respecting spaces and ignoring commas inside quotes
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
        // Strip quotes and trim extra spaces before saving
        obj[header] = values[index] ? values[index].replace(/(^"|"$)/g, '').trim() : null;
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
      const records = parseCSV(text);

      if (records.length > 0 && (!records[0].student_its || !records[0].parent_its)) {
        throw new Error("Missing required columns: 'student_its' and 'parent_its'.");
      }

      const supabaseAdmin = getAdminClient();
      let successCount = 0;
      let errorCount = 0;

      for (const row of records) {
        try {
          if (!row.student_its || !row.parent_its) continue;

          const parentId = await getOrCreateParent(
            supabaseAdmin, 
            row.parent_its, 
            row.father_name,
            row.parent_email,
            row.parent_phone
          );
          
          if (parentId) {
            const { error } = await supabaseAdmin
              .from('students')
              .update({
                parent_id: parentId,
                father_name: row.father_name,
                mother_name: row.mother_name,
                primary_parent_its: row.parent_its
              })
              .eq('its_number', row.student_its);
              
            if (!error) successCount++;
            else errorCount++;
          }
        } catch (rowErr) {
          console.error(`Failed on row student ${row.student_its}:`, rowErr);
          errorCount++;
        }
      }

      setStatus({ 
        type: errorCount === 0 ? 'success' : 'error', 
        msg: `Processed ${successCount} records successfully. ${errorCount > 0 ? `Failed: ${errorCount}` : ''}` 
      });
      
      setFile(null);
      setPreviewCount(0);
      
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Failed to process bulk linking.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Link className="w-6 h-6 text-indigo-500" /> Parent Linking Engine
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Provision family portal accounts and link them directly to student records.</p>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          status.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{status.msg}</p>
        </div>
      )}

      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-fit">
        <button onClick={() => setActiveTab('single')} className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'single' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500'}`}>
          <UserPlus className="w-4 h-4" /> Link Single Family
        </button>
        <button onClick={() => setActiveTab('bulk')} className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'bulk' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500'}`}>
          <UploadCloud className="w-4 h-4" /> Bulk CSV Mapper
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
        {activeTab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-5 max-w-lg">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Student ITS</label>
               <input type="text" required value={formData.studentIts} onChange={(e) => setFormData({...formData, studentIts: e.target.value})} placeholder="e.g. 20123456" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold text-school-navy" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Father's Name</label>
                <input type="text" value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} placeholder="e.g. Saifuddin bhai" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold text-school-navy" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mother's Name</label>
                <input type="text" value={formData.motherName} onChange={(e) => setFormData({...formData, motherName: e.target.value})} placeholder="e.g. Tasneem bai" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold text-school-navy" />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Primary Parent ITS (Portal Login)</label>
              <input type="text" required value={formData.parentIts} onChange={(e) => setFormData({...formData, parentIts: e.target.value})} placeholder="e.g. 30458220" className="w-full p-3 border border-indigo-200 bg-indigo-50 rounded-lg text-sm font-bold text-school-navy mb-4" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Mail className="w-3.5 h-3.5"/> Email Address</label>
                  <input type="email" value={formData.parentEmail} onChange={(e) => setFormData({...formData, parentEmail: e.target.value})} placeholder="parent@example.com" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold text-school-navy" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> Phone Number</label>
                  <input type="text" value={formData.parentPhone} onChange={(e) => setFormData({...formData, parentPhone: e.target.value})} placeholder="9313450916" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold text-school-navy" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
              {isProcessing ? 'Linking Records...' : <><Link className="w-5 h-5" /> Provision & Link Account</>}
            </button>
          </form>
        ) : (
          <div>
            <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm mb-6 border border-indigo-100">
              <h4 className="font-bold flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4" /> Required CSV Headers</h4>
              <p className="font-mono bg-white p-2 rounded border border-indigo-200 text-xs break-all">student_its, parent_its, father_name, mother_name, parent_email, parent_phone</p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors relative">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-school-navy mb-1">{file ? file.name : 'Drag & Drop your CSV here'}</h4>
              <p className="text-sm text-slate-500">{file ? `${previewCount} records detected` : 'or click to browse'}</p>
            </div>

            {file && (
              <button onClick={executeBulkUpload} disabled={isProcessing} className="w-full mt-6 bg-school-navy hover:bg-slate-800 text-white py-3.5 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70">
                {isProcessing ? 'Processing Mapping...' : <><CheckCircle2 className="w-5 h-5" /> Execute Bulk Linking</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}