// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { Key, User, ArrowRight, AlertCircle, ScanFace, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [itsNumber, setItsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const [gregorianDate, setGregorianDate] = useState('');
  const [hijriDate, setHijriDate] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    // Generate live dates for the academic briefing panel
    const now = new Date();
    setGregorianDate(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    
    try {
      setHijriDate(new Intl.DateTimeFormat('en-TN-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(now));
    } catch (e) {
      setHijriDate(''); // Fallback if browser doesn't support Islamic calendar formats
    }
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

    // Route based on access level[cite: 17]
    if (profile?.role === 'ADMIN' || profile?.role === 'HOS') {
      navigate('/admin');
    } else if (profile?.role === 'TEACHER' || profile?.role === 'CLASS_TR') {
      navigate('/teacher');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-slate-900">
      
      {/* 1. Background Image Container */}
      <div className="absolute inset-0 z-0">
         <img 
            src="/MSB.jpeg" 
            alt="MSB Indore Campus" 
            className="w-full h-full object-cover object-center" 
         />
         {/* Subtle gradient overlay to ensure text legibility on the left, while keeping the photo clear */}
         <div className="absolute inset-0 bg-gradient-to-r from-school-navy/90 via-school-navy/40 to-transparent lg:w-2/3"></div>
      </div>

      {/* 2. Left Side: The "Campus Window" Academic Briefing */}
      <div className="hidden lg:flex flex-col justify-end p-16 w-2/3 relative z-10 text-white">
         <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Quote className="w-12 h-12 text-school-yellow/80 mb-6 rotate-180" />
            
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 tracking-tight">
               وَقُل رَّبِّ زِدْنِي عِلْمًا
            </h1>
            <p className="text-xl text-indigo-100 font-medium mb-12 italic">
               "And say: My Lord, increase me in knowledge."
            </p>
            
            <div className="flex items-center gap-6 pt-8 border-t border-white/20">
               <div>
                  <p className="text-xs font-bold text-school-yellow uppercase tracking-widest mb-1">Gregorian</p>
                  <p className="text-sm font-medium text-slate-200">{gregorianDate}</p>
               </div>
               {hijriDate && (
                  <>
                     <div className="w-px h-8 bg-white/20"></div>
                     <div>
                        <p className="text-xs font-bold text-school-yellow uppercase tracking-widest mb-1">Hijri</p>
                        <p className="text-sm font-medium text-slate-200">{hijriDate}</p>
                     </div>
                  </>
               )}
            </div>
         </div>
      </div>

      {/* 3. Right Side: Frosted Glass Login Panel */}
      <div className="w-full lg:w-1/3 lg:min-w-[480px] bg-white/95 backdrop-blur-2xl relative z-20 flex flex-col justify-center px-8 sm:px-12 py-12 shadow-[-20px_0_40px_rgba(0,0,0,0.3)] overflow-y-auto">
        
        <div className="mb-8 text-center lg:text-left">
          <h2 className="text-2xl font-bold text-school-navy tracking-tight">Digital Lobby</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">MSB Indore Academic Portal</p>
        </div>

        {/* The "Digital Smart ID" Interaction */}
        <div className="w-full h-48 bg-school-navy rounded-2xl shadow-inner relative overflow-hidden text-white p-6 flex flex-col justify-between mb-8 border border-slate-700">
           {/* ID Background Pattern */}
           <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay"></div>
           
           <div className="relative z-10 flex justify-between items-start">
              <div>
                 <p className="text-[9px] tracking-widest text-school-yellow uppercase font-bold mb-0.5">Secure Access ID</p>
                 <p className="text-xs font-medium text-slate-300">Faculty & Parent Pass</p>
              </div>
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <img src="/MSB%20INDORE%20logo.jpeg" alt="MSB Logo" className="w-10 h-10 object-contain" />
              </div>
           </div>
           
           <div className="relative z-10 flex items-end gap-5">
              <div className="w-14 h-16 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center shadow-inner">
                 <User className="w-7 h-7 text-slate-500" />
              </div>
              <div className="flex-1 pb-1">
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5">ITS Number</p>
                 <p className={`text-2xl font-mono tracking-widest transition-all ${itsNumber ? 'text-white' : 'text-slate-600'}`}>
                    {itsNumber || '--------'}
                 </p>
              </div>
              <ScanFace className="w-8 h-8 text-school-yellow/40 mb-1" />
           </div>
        </div>

        {/* Standard Login Form[cite: 17] */}
        <div>
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
                  placeholder="Scan or type ID..."
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-school-navy focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access PIN</label>
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
              className="w-full mt-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-600/20 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Authenticate <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. 1986 • MSB Educational Institute</p>
          </div>
        </div>
        
      </div>
    </div>
  );
}