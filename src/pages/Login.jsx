// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Key, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [itsNumber, setItsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [dates, setDates] = useState({ gregorian: '', hijri: '' });
  const navigate = useNavigate();

  // Generate localized academic dates
  useEffect(() => {
    const today = new Date();
    const gregorian = today.toLocaleDateString('en-GB', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });
    
    let hijri = '';
    try {
      const hijriFormatter = new Intl.DateTimeFormat('en-SA-u-ca-islamic', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      hijri = hijriFormatter.format(today);
    } catch (e) {
      hijri = 'Islamic Calendar'; 
    }

    setDates({ gregorian, hijri });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    
    const formattedEmail = `${itsNumber.trim()}@msb.local`;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
      return; 
    }

    let role = null;
    if (authData?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle();
      role = profile?.role;
    }

    setIsLoading(false);

    if (role === 'ADMIN' || role === 'HOS') {
      navigate('/admin');
    } else if (role === 'TEACHER' || role === 'CLASS_TR') {
      navigate('/teacher');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[100dvh] w-screen flex items-center justify-center p-4 md:p-8 relative font-sans overflow-hidden">
      
      {/* 1. Warm & Light Background Layer */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/MSB.jpeg" 
          alt="MSB Indore Campus" 
          className="w-full h-full object-cover object-center scale-105 animate-in fade-in duration-1000"
        />
        {/* Warm ivory frosted glass overlay instead of dark navy */}
        <div className="absolute inset-0 bg-amber-50/85 backdrop-blur-[4px]"></div>
      </div>

      {/* 2. Elegant, Centered Ivory Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white flex flex-col p-8 md:p-10 animate-in zoom-in-95 fade-in duration-500">
        
        {/* Header: Official Letterhead Styling */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/MSB%20INDORE%20logo.jpeg" 
            alt="MSB Logo" 
            className="w-24 h-24 object-contain mix-blend-multiply mb-4" 
          />
          <h1 className="text-2xl font-bold text-school-navy tracking-tight text-center">MSB Indore</h1>
          <p className="text-2xl font-bold text-school-navy tracking-tight text-center">Academic Portal</p>
          
          <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span>{dates.gregorian}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-amber-600/80">{dates.hijri}</span>
          </div>
        </div>

        {/* Dynamic Auth Error Callout */}
        {authError && (
          <div className="mb-6 p-4 bg-red-50/80 border border-red-200/80 rounded-2xl flex items-center gap-3 text-red-700 animate-in shake duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <p className="text-xs font-bold leading-relaxed">{authError}</p>
          </div>
        )}

        {/* 3. Streamlined Form Controls */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">ITS ID</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                required 
                value={itsNumber} 
                onChange={(e) => setItsNumber(e.target.value)} 
                placeholder="Enter 8-digit ITS" 
                className="w-full pl-11 pr-4 py-3 bg-amber-50/40 border border-amber-900/10 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-school-navy focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Key className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full pl-11 pr-4 py-3 bg-amber-50/40 border border-amber-900/10 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-school-navy focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-school-navy hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-lg shadow-school-navy/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Signing In...
              </span>
            ) : (
              <>
                Sign In to Dashboard
                <ArrowRight className="w-4 h-4 text-school-yellow" />
              </>
            )}
          </button>
        </form>

        {/* 4. Elegant Footer Note */}
        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
            Need credentials or facing issues? <br />
            Please contact the <span className="font-bold text-slate-600">MSB Administration Office</span>.
          </p>
        </div>

      </div>

    </div>
  );
}
