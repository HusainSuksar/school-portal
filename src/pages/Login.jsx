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

        {/* Minimalist Smart ID Visual */}
        <div className="w-full bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex items-center gap-4 mb-8 shadow-sm">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Assigned ITS</p>
            <p className={`font-mono text-xl tracking-[0.2em] font-bold ${itsNumber ? 'text-school-navy' : 'text-slate-300'}`}>
              {itsNumber || '••••••••'}
            </p>
          </div>
        </div>

        {authError && (
          <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-700 leading-tight">{authError}</p>
          </div>
        )}

        {/* Elegant Form */}
        <form onSubmit={handleLogin} className="space-y-5 w-full">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ITS Number</label>
            <div className="relative group">
              <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-school-yellow transition-colors" />
              <input 
                type="text" 
                required
                value={itsNumber}
                onChange={(e) => setItsNumber(e.target.value)}
                placeholder="Enter 8-digit ID"
                autoComplete="username"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-school-navy focus:outline-none focus:border-school-yellow focus:ring-4 focus:ring-school-yellow/10 transition-all shadow-sm placeholder:text-slate-300 placeholder:font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passcode</label>
            </div>
            <div className="relative group">
              <Key className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-school-yellow transition-colors" />
              <input 
                required 
                placeholder="••••••••" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-school-navy focus:outline-none focus:border-school-yellow focus:ring-4 focus:ring-school-yellow/10 transition-all shadow-sm placeholder:text-slate-300" 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading || !itsNumber || !password}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-school-navy hover:bg-slate-800 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          
        </form>

        <div className="mt-8 text-center w-full">
          <a href="#" className="text-[11px] font-bold text-slate-400 hover:text-school-navy transition-colors">Forgot your passcode?</a>
        </div>
        
      </div>
    </div>
  );
}