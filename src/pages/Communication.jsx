// src/pages/Communication.jsx
import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Trash2, Users, CheckCircle2, Clock, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Communication() {
  const [announcements, setAnnouncements] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    
    // 1. Check who is viewing the page
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setCurrentUserRole(profile.role);
    }

    // 2. Fetch Announcements (RLS will automatically filter out ones they shouldn't see!)
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (data) setAnnouncements(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('announcements')
      .insert([{ 
        title, 
        message, 
        target_audience: targetAudience,
        created_by: user.id 
      }]);

    if (!error) {
      setTitle('');
      setMessage('');
      setTargetAudience('ALL');
      fetchAnnouncements(); // Refresh the feed
    } else {
      console.error("Broadcast error:", error);
      alert("Failed to send broadcast.");
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) fetchAnnouncements();
  };

  const canBroadcast = currentUserRole === 'ADMIN' || currentUserRole === 'HOS';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-500" />
          School Announcements
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Official communications and updates from the administration.</p>
      </div>

      {/* Admin Broadcast Panel (Only visible to ADMIN or HOS) */}
      {canBroadcast && (
        <div className="bg-school-navy rounded-xl shadow-lg border border-slate-800 overflow-hidden text-white relative">
          <Globe className="w-32 h-32 absolute -right-4 -top-4 text-slate-800 opacity-50" />
          
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 relative z-10">
            <h3 className="font-bold flex items-center gap-2">
              <Send className="w-4 h-4 text-school-yellow" /> Broadcast New Message
            </h3>
          </div>
          
          <form onSubmit={handleBroadcast} className="p-6 space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Subject Header</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Campus closed tomorrow..."
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Target Audience</label>
                <select 
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Entire School (Parents & Staff)</option>
                  <option value="PARENTS">Parents Only</option>
                  <option value="STAFF">Staff & Faculty Only</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Message Body</label>
              <textarea 
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your official announcement here..."
                rows={3}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-600 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Transmitting...' : 'Broadcast Message'}
            </button>
          </form>
        </div>
      )}

      {/* The Live Newsfeed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : announcements.length > 0 ? (
          announcements.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group overflow-hidden">
              
              {/* Audience Badge */}
              <div className="absolute top-0 right-0">
                <span className={`text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg flex items-center gap-1 ${
                  item.target_audience === 'ALL' ? 'bg-emerald-100 text-emerald-700' :
                  item.target_audience === 'PARENTS' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <Users className="w-3 h-3" /> {item.target_audience}
                </span>
              </div>

              <h3 className="font-bold text-lg text-school-navy pr-24">{item.title}</h3>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{item.message}</p>
              
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Authorized by {item.profiles?.full_name}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(item.created_at).toLocaleString()}</span>
                </div>

                {/* Delete Button (Only Admins/HOS see this) */}
                {canBroadcast && (
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-school-navy">No Announcements</h3>
            <p className="text-slate-500 mt-2">There are currently no active broadcasts from the administration.</p>
          </div>
        )}
      </div>

    </div>
  );
}