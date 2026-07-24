// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Lock, Camera, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // Passwords
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    }
    setIsLoading(false);
  };

const handleEnablePush = async () => {
  if (!('Notification' in window)) {
    alert('This browser does not support web notifications.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    alert('Notifications enabled successfully!');
  } else if (permission === 'denied') {
    alert('Notification permission was blocked. Please enable it in browser settings.');
  }
};

// ✅ RESTORED FUNCTION HEADER
const handleUpdateContact = async (e) => {
  e.preventDefault();
  setIsSaving(true);
  setStatus({ type: '', msg: '' });

  const { error } = await supabase.from('profiles').update({
    phone_number: profile.phone_number,
    personal_email: profile.personal_email,
    address: profile.address
  }).eq('id', user.id);

  if (!error) {
    setStatus({ type: 'success', msg: 'Contact information updated successfully.' });
    setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
  } else {
    setStatus({ type: 'error', msg: 'Failed to update contact info.' });
  }
  setIsSaving(false);
};

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setStatus({ type: 'error', msg: 'New passwords do not match!' });
    }
    setIsSaving(true);
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (!error) {
      setStatus({ type: 'success', msg: 'Password updated safely.' });
      setNewPassword(''); setConfirmPassword('');
      // Mark requires_password_change as false if they just reset it
      await supabase.from('profiles').update({ requires_password_change: false }).eq('id', user.id);
    } else {
      setStatus({ type: 'error', msg: error.message });
    }
    setIsSaving(false);
  };

  const uploadAvatar = async (event) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      setIsSaving(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;

      // Upload to Storage
      let { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL and save to Profile
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: urlData.publicUrl });
      setStatus({ type: 'success', msg: 'Profile photo updated!' });
      setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
    } catch (error) {
      alert('Error uploading avatar!');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2"><User className="w-6 h-6 text-indigo-500" /> My Profile</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage your identity, contact information, and security.</p>
        </div>
        {status.msg && (
          <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 animate-in fade-in ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <CheckCircle2 className="w-4 h-4" /> {status.msg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Role */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center relative">
            <div className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover border-4 border-slate-50 shadow-sm" />
              ) : (
                <div className="w-full h-full rounded-full bg-indigo-50 flex items-center justify-center border-4 border-white shadow-sm"><User className="w-12 h-12 text-indigo-300" /></div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-school-navy/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-8 h-8 text-white" />
                <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" disabled={isSaving} />
              </label>
            </div>
            <h3 className="text-lg font-black text-school-navy">{profile.full_name}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{profile.role}</p>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit mx-auto text-slate-600">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> ITS: {profile.its_number}
            </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Contact Details */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-school-navy">Contact Information</h3></div>
            <form onSubmit={handleUpdateContact} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Phone Number</label>
                  <input type="text" value={profile.phone_number || ''} onChange={e => setProfile({...profile, phone_number: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Personal Email</label>
                  <input type="email" value={profile.personal_email || ''} onChange={e => setProfile({...profile, personal_email: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Home Address</label>
                <textarea rows="3" value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none font-medium" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50">Save Changes</button>
              </div>
            </form>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
    <h3 className="font-bold text-school-navy flex items-center gap-2">Device Notifications</h3>
  </div>
  <div className="p-6 flex items-center justify-between">
    <div>
      <p className="text-sm font-bold text-slate-700">Receive Urgent Alerts</p>
      <p className="text-xs text-slate-500 mt-1">Get notified on this device when important school announcements are broadcasted.</p>
    </div>
    <button 
      type="button" 
      onClick={handleEnablePush} 
      className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-indigo-200"
    >
      Enable Alerts
    </button>
  </div>
</div>

          {/* Password Security */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-school-navy flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400"/> Change Password</h3></div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">New Password</label>
                  <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Confirm Password</label>
                  <input type="password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={isSaving || !newPassword} className="bg-school-navy hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50">Update Security</button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );  
}
