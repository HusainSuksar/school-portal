// src/pages/ManageTeachers.jsx
import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ManageTeachers() {
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isAuthorized, setIsAuthorized] = useState(true);
  
  const fetchProfiles = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // THE CRITICAL FIX: Stop execution immediately if there is no active session
    if (!user) {
      setIsLoading(false);
      return; 
    }
    
    // Security Checkpoint: Verify they are an ADMIN
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserProfile?.role !== 'ADMIN') {
      setIsAuthorized(false);
      setIsLoading(false);
      return; // Stop execution right here
    }

    // If authorized, fetch the directory
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    if (data) setProfiles(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleRoleChange = async (userId, newRole, userName) => {
    setUpdatingId(userId);
    setStatusMsg({ type: '', text: '' });

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    setUpdatingId(null);

    if (error) {
      console.error("Error updating role:", error);
      setStatusMsg({ type: 'error', text: `Failed to update role for ${userName}.` });
    } else {
      setStatusMsg({ type: 'success', text: `${userName} has been successfully updated to ${newRole}.` });
      // Update local state to reflect the change immediately
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to render role badges with specific colors
  const renderRoleBadge = (role) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'HOS': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CLASS_TR': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'TEACHER': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200'; // PARENT
    }
  };

  // -------------------------------------------------------------
  // ACCESS RESTRICTED SCREEN
  // -------------------------------------------------------------
  if (!isAuthorized) {
    return (
      <div className="max-w-6xl mx-auto h-[60vh] flex flex-col items-center justify-center text-center">
        <Shield className="w-16 h-16 text-red-500 mb-4 opacity-50" />
        <h2 className="text-3xl font-bold text-school-navy">Access Restricted</h2>
        <p className="text-slate-500 mt-2">You do not have the required Administrator clearance to view this module.</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN DASHBOARD (Only renders if authorized)
  // -------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-500" />
          Staff & Role Management
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage system access levels and assign faculty roles.</p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{statusMsg.text}</p>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-school-navy flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" /> System Directory ({profiles.length})
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 sticky top-0 shadow-sm">
                  <th className="p-4 font-bold">User Name</th>
                  <th className="p-4 font-bold">Current Access Level</th>
                  <th className="p-4 font-bold">Phone Number</th>
                  <th className="p-4 font-bold text-right">Modify Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map(profile => (
                    <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-bold text-school-navy flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {profile.full_name.charAt(0)}
                        </div>
                        {profile.full_name}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider border ${renderRoleBadge(profile.role)}`}>
                          {profile.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 font-medium">
                        {profile.phone_number || 'Not provided'}
                      </td>
                      <td className="p-4 text-right">
                        <select
                          disabled={updatingId === profile.id}
                          value={profile.role}
                          onChange={(e) => handleRoleChange(profile.id, e.target.value, profile.full_name)}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <option value="PARENT">Parent</option>
                          <option value="TEACHER">Subject Teacher</option>
                          <option value="CLASS_TR">Class Teacher</option>
                          <option value="HOS">Head of School</option>
                          <option value="ADMIN">Master Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 text-sm">
                      No users found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}