import React, { useState } from 'react';
import { Users, UploadCloud, ShieldAlert, CheckCircle2, AlertTriangle, Link, UserPlus, FileText } from 'lucide-react';
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
    parentIts: ''
  });

  const getAdminClient = () => {
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  };

  // Helper to fetch an existing parent or create a new one
  const getOrCreateParent = async (supabaseAdmin, parentIts, fatherName) => {
    // 1. Check if Parent already exists in profiles (Sibling scenario)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('its_number', parentIts)
      .single();

    if (existingProfile) return existingProfile.id;

    // 2. If not, provision new Auth Account
    const proxyEmail = `${parentIts}@msb.local`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: proxyEmail,
      password: '786110', // Default parent password
      email_confirm: true
    });

    if (authError && !authError.message.includes('already exists')) {
      throw authError;
    }

    const targetUserId = authData?.user?.id; // If created successfully
    
    // 3. Inject Profile
    if (targetUserId) {
      await supabaseAdmin.from('profiles').upsert({
        id: targetUserId,
        full_name: `${fatherName} (Parent)`,
        role: 'PARENT',
        its_number: parentIts,
        requires_password_change: true
      });
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
      
      // 1. Ensure the student actually exists first
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('its_number', formData.studentIts)
        .single();
        
      if (!student) throw new Error(`Student with ITS ${formData.studentIts} not found in database.`);

      // 2. Get or Create the Parent Account
      const parentId = await getOrCreateParent(supabaseAdmin, formData.parentIts, formData.fatherName);
      if (!parentId) throw new Error("Failed to resolve Parent Account.");

      // 3. Link them together
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

      setStatus({ type: 'success', msg: `Successfully linked Parent (${formData.parentIts}) to Student (${formData.studentIts}).` });
      setFormData({ studentIts: '', fatherName: '', motherName: '', parentIts: '' });

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
      // Handle commas inside quotes for robust parsing
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/(^"|"$)/g, '').trim()) || line.split(',');
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
    setIsProcessing(true);
    setStatus({ type: '', msg: '' });

    try {
      const text = await file.text();
      const records = parseCSV(text);

      if (records.length > 0 && (!records[0].student_its || !records[0].parent_its)) {
        throw new Error("Missing required columns. Please ensure 'student_its' and 'parent_its' exist.");
      }

      const supabaseAdmin = getAdminClient();
      let successCount = 0;
      let errorCount = 0;

      for (const row of records) {
        try {
          if (!row.student_its || !row.parent_its) continue;

          // Provision/Fetch Parent
          const parentId = await getOrCreateParent(supabaseAdmin, row.parent_its, row.father_name);
          
          if (parentId) {
            // Update Student
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
        msg: `Linked ${successCount} students successfully. ${errorCount > 0 ? `Failed to link ${errorCount} records.` : ''}` 
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
          <Link className="w-6 h-6 text-indigo-500" />
          Parent Linking Engine
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Provision family portal accounts and link them directly to student records.</p>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${
          status.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{status.msg}</p>
        </div>
      )}

      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-fit">
        <button 
          onClick={() => { setActiveTab('single'); setStatus({type: '', msg: ''}); }}
          className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'single' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserPlus className="w-4 h-4" /> Link Single Family
        </button>
        <button 
          onClick={() => { setActiveTab('bulk'); setStatus({type: '', msg: ''}); }}
          className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'bulk' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UploadCloud className="w-4 h-4" /> Bulk CSV Mapper
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
        
        {activeTab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-5 max-w-lg">
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Target Student ITS</label>
               <input 
                 type="text" 
                 required
                 value={formData.studentIts}
                 onChange={(e) => setFormData({...formData, studentIts: e.target.value})}
                 placeholder="e.g. 20123456"
                 className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold text-school-navy"
               />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Father's Name</label>
                <input 
                  type="text" 
                  value={formData.fatherName}
                  onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                  placeholder="e.g. Mustafa Bhai"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold text-school-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mother's Name</label>
                <input 
                  type="text" 
                  value={formData.motherName}
                  onChange={(e) => setFormData({...formData, motherName: e.target.value})}
                  placeholder="e.g. Fatema Ben"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold text-school-navy"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Primary Parent ITS (Portal Login)</label>
              <input 
                type="text" 
                required
                value={formData.parentIts}
                onChange={(e) => setFormData({...formData, parentIts: e.target.value})}
                placeholder="e.g. 40233033"
                className="w-full p-3 border border-indigo-200 bg-indigo-50 rounded-lg focus:outline-none focus:border-indigo-500 text-sm font-bold text-school-navy"
              />
            </div>

            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
            >
              {isProcessing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Linking Records...</>
              ) : (
                <><Link className="w-5 h-5" /> Provision & Link Account</>
              )}
            </button>
          </form>

        ) : (

          <div>
            <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm mb-6 border border-indigo-100">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4" /> Required CSV Headers
              </h4>
              <p className="font-mono bg-white p-2 rounded border border-indigo-200 text-xs">
                student_its, parent_its, father_name, mother_name
              </p>
              <p className="mt-2 text-xs opacity-80">* If multiple siblings share the same parent_its, the system will automatically group them to a single family account.</p>
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
                {file ? `${previewCount} linking records detected` : 'or click to browse your computer'}
              </p>
            </div>

            {file && (
              <button 
                onClick={executeBulkUpload}
                disabled={isProcessing}
                className="w-full mt-6 bg-school-navy hover:bg-slate-800 text-white py-3.5 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isProcessing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Processing Mapping...</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> Execute Bulk Linking</>
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}