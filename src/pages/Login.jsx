// src/pages/Login.jsx
import React, { useState } from 'react';
import { Key, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
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

    // 1. Authenticate the user
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
      return; 
    }

    // 2. Fetch their database profile to verify their role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    setIsLoading(false);

    // 3. Smart Redirection based on access level
    if (profile?.role === 'ADMIN' || profile?.role === 'HOS') {
      navigate('/admin');
    } else if (profile?.role === 'TEACHER' || profile?.role === 'CLASS_TR') {
      navigate('/teacher');
    } else {
      navigate('/'); // Default to Parent Portal
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-100 flex items-center justify-center p-4">
      
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200/60">
        
        {/* Left Side: Academic Branding */}
        <div className="w-full md:w-5/12 bg-school-navy p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle Background Elements for a modern touch */}
          <ShieldCheck className="absolute -bottom-16 -left-16 w-80 h-80 text-indigo-900 opacity-40 transform -rotate-12 pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left h-full justify-center md:justify-start">
            
            {/* The MSB Crest Container */}
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl mb-8 inline-block border border-white/20">
              <img 
                src="/MSB INDORE logo.jpeg" 
                alt="MSB Indore Educational Institute" 
                className="w-24 h-24 md:w-28 md:h-28 object-contain"
              />
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-bold leading-snug mb-4 tracking-tight">
              MSB Indore <br/>
              <span className="text-school-yellow font-black tracking-wide text-2xl lg:text-3xl uppercase">Academic Portal</span>
            </h2>
            
            <p className="text-indigo-200 font-medium text-sm leading-relaxed max-w-sm mt-2">
              The centralized administrative and academic platform for parents, faculty, and school leadership.
            </p>
          </div>

          <div className="relative z-10 mt-12 text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em] text-center md:text-left flex items-center justify-center md:justify-start gap-2">
            <span>Est. 1986</span>
            <span className="w-1 h-1 bg-indigo-400/80 rounded-full"></span>
            <span>Secure System Access</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-7/12 p-10 lg:p-14 flex flex-col justify-center bg-white relative">
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-school-navy">Account Sign In</h3>
            <p className="text-slate-500 text-sm mt-1.5 font-medium">Enter your assigned ITS ID and PIN to securely access the portal.</p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-700 leading-tight">{authError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ITS ID Number</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={itsNumber}
                  onChange={(e) => setItsNumber(e.target.value)}
                  placeholder="e.g. 50410001"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-school-navy focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password / PIN</label>
                <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot PIN?</a>
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
              className="w-full mt-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-600/20 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed group"
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

        </div>
      </div>
    </div>
  );
}