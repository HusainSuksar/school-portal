// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Key, User, ArrowRight, AlertCircle, Calendar as CalendarIcon, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [itsNumber, setItsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [dates, setDates] = useState({ gregorian: '', hijri: '' });
  const navigate = useNavigate();

  // Generate live localized dates
  useEffect(() => {
    const today = new Date();
    const gregorian = today.toLocaleDateString('en-GB', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    
    // Using standard browser Intl formatter for Islamic Calendar
    let hijri = '';
    try {
      const hijriFormatter = new Intl.DateTimeFormat('en-SA-u-ca-islamic', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      hijri = hijriFormatter.format(today);
    } catch (e) {
      hijri = 'Islamic Calendar'; // Fallback if browser doesn't support it
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
    <div className="relative min-h-[100dvh] w-screen flex flex-col md:flex-row font-sans overflow-x-hidden bg-school-navy">
      
      {/* 1. Full-Screen Background Image Layer */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/MSB.jpeg" 
          alt="MSB Indore Campus" 
          className="w-full h-full object-cover object-center scale-105 animate-in fade-in duration-1000"
        />
        {/* Gradient overlays to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-school-navy/80 via-school-navy/50 to-transparent md:bg-school-navy/40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-school-navy/90 md:from-transparent to-transparent"></div>
      </div>

      {/* 2. Left Pane: The Academic Lobby (Visible prominently on desktop, stacked on mobile) */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-6 md:p-12 lg:p-20 text-white min-h-[40vh] md:min-h-screen pb-12 md:pb-20">
        
        {/* Top: Branding & Title */}
        <div className="animate-in slide-in-from-top-8 duration-700 fade-in">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-lg mb-2">MSB Indore</h1>
          <div className="flex items-center gap-3">
            <div className="h-0.5 w-8 bg-school-yellow"></div>
            <p className="text-lg md:text-xl lg:text-2xl text-school-yellow font-bold uppercase tracking-widest drop-shadow-md">Academic Portal</p>
          </div>
        </div>

        {/* Bottom: Quote & Date Display */}
        <div className="max-w-2xl mt-auto pt-8 md:pt-0 animate-in slide-in-from-left-8 duration-1000 fade-in delay-300">
          <Quote className="w-8 h-8 md:w-12 md:h-12 text-white/30 mb-4" />
          <p className="text-2xl md:text-4xl lg:text-5xl font-serif italic leading-snug mb-4 md:mb-6 drop-shadow-xl text-white/95">
            "And say: My Lord, increase me in knowledge."
          </p>
          <p className="text-sm md:text-base text-school-yellow font-bold tracking-widest uppercase drop-shadow-md">
            — Quran 20:114
          </p>
          
          {/* Live Academic Dates */}
          <div className="mt-8 md:mt-12 flex flex-col sm:flex-row gap-3 md:gap-5 text-sm md:text-base bg-school-navy/40 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-white/10 w-fit shadow-2xl">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-indigo-300" />
              <span className="font-medium text-indigo-50">{dates.gregorian}</span>
            </div>
            <div className="hidden sm:block w-px h-auto bg-white/20"></div>
            <div className="flex items-center gap-3 text-school-yellow font-bold">
              <span>{dates.hijri}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Pane: Frosted Glass Sidebar & Login Form */}
      <div className="relative z-20 w-full md:w-[420px] lg:w-[480px] flex-shrink-0 bg-white/10 md:bg-school-navy/80 backdrop-blur-2xl border-l border-white/10 flex flex-col justify-center rounded-t-[2.5rem] md:rounded-none shadow-[0_-20px_50px_rgba(0,0,0,0.3)] md:shadow-2xl overflow-y-auto">
        
        <div className="p-8 md:p-10 lg:p-12 h-full flex flex-col justify-center">
          
          {/* THE DIGITAL SMART ID INTERACTION */}
          <div className="w-full aspect-[1.58] bg-gradient-to-br from-slate-50 to-slate-200 rounded-2xl shadow-xl border border-white p-5 flex flex-col justify-between mb-8 transform transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
            {/* Glass glare effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/50 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <img src="/MSB%20INDORE%20logo.jpeg" alt="MSB Logo" className="w-10 h-10 object-contain" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-school-navy uppercase tracking-[0.2em]">Digital ID</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">MSB Educational Institute</p>
              </div>
            </div>

            <div className="flex items-end gap-4 relative z-10">
              <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="flex-1 pb-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">ITS Number</p>
                <p className={`font-mono text-xl tracking-[0.25em] font-bold transition-colors ${itsNumber ? 'text-school-navy' : 'text-slate-300'}`}>
                  {itsNumber || '••••••••'}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-bold text-white">System Access</h3>
            <p className="text-indigo-200 text-sm mt-1.5 font-medium">Please authenticate to continue.</p>
          </div>

          {authError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-200 leading-tight">{authError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider ml-1">ITS ID Number</label>
              <div className="relative group">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  required
                  value={itsNumber}
                  onChange={(e) => setItsNumber(e.target.value)}
                  placeholder="e.g. 50410001"
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/90 focus:bg-white border-2 border-transparent rounded-xl text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Password / PIN</label>
                <a href="#" className="text-[11px] font-bold text-school-yellow hover:text-yellow-300 transition-colors">Forgot PIN?</a>
              </div>
              <div className="relative group">
                <Key className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  required 
                  placeholder="••••••••" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/90 focus:bg-white border-2 border-transparent rounded-xl text-sm font-bold text-school-navy focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !itsNumber || !password}
              className="w-full mt-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:bg-slate-600 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Secure Login <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}