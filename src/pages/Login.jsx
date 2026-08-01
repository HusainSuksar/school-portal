// src/pages/Login.jsx
import React, { useState } from 'react';
import { Key, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [itsNumber, setItsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    
    const formattedEmail = `${itsNumber}@msb.local`;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
      return; 
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    setIsLoading(false);

    if (profile?.role === 'ADMIN' || profile?.role === 'HOS') {
      navigate('/admin');
    } else if (profile?.role === 'TEACHER' || profile?.role === 'CLASS_TR') {
      navigate('/teacher');
    } else {
      navigate('/');
    }
  };

  return (
    <div 
      className="min-h-screen w-screen flex items-center justify-center p-4 relative"
      style={{
        // Replaced spaces with %20 so the browser can accurately locate the image file
        backgroundImage: 'url("/MSB.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Professional dark overlay to allow the background photo to show through without distracting from the form */}
      <div className="absolute inset-0 bg-school-navy/75 backdrop-blur-sm z-0"></div>
      
      {/* Sleek, single-column vertical card */}
      <div className="relative z-10 w-full max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-white/20">
        
        {/* Header Section */}
        <div className="pt-10 pb-6 px-8 flex flex-col items-center text-center border-b border-slate-100 bg-slate-50/50">
          
          <h2 className="text-2xl font-bold text-school-navy tracking-tight">MSB Indore</h2>
          <p className="text-[11px] font-black text-school-yellow uppercase tracking-[0.25em] mb-6">Academic Portal</p>
          
          <div className="w-28 h-28 p-2 bg-white rounded-2xl shadow-sm border border-slate-100">
            {/* Replaced spaces with %20 for the logo URL as well */}
            <img 
              src="/MSB%20INDORE%20logo.jpeg" 
              alt="MSB Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          
        </div>

        {/* Form Section */}
        <div className="px-8 py-8 bg-white">
          {authError && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-700 leading-tight">{authError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">ITS ID Number</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={itsNumber}
                  onChange={(e) => setItsNumber(e.target.value)}
                  placeholder="e.g. 50410001"
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-school-navy focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password / PIN</label>
                <a href="#" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot PIN?</a>
              </div>
              <div className="relative">
                <Key className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  placeholder="••••••••" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-school-navy focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !itsNumber || !password}
              className="w-full mt-8 flex items-center justify-center gap-2 bg-school-navy hover:bg-slate-800 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-md disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Secure Login <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MSB Educational Institute</p>
          </div>
        </div>
        
      </div>
    </div>
  );
}