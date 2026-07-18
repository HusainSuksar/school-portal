// src/pages/Login.jsx
import React, { useState } from 'react';
import { BookOpen, Key, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // <-- Import the client we just built

export default function Login() {
  const [itsNumber, setItsNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null); // <-- State to catch login errors
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
    <div className="min-h-screen w-screen bg-school-gray flex items-center justify-center p-4">
      
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Branding & Info */}
        <div className="w-full md:w-5/12 bg-school-navy p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <ShieldCheck className="absolute -bottom-12 -left-12 w-64 h-64 text-slate-800 opacity-50" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-school-yellow rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-school-navy" />
              </div>
              <h1 className="text-2xl font-bold tracking-wide">Portal</h1>
            </div>
            
            <h2 className="text-3xl font-bold leading-snug mb-4">
              Welcome to the <br/>
              <span className="text-school-yellow">Academic Hub</span>
            </h2>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">
              The centralized platform for parents to track student progression, and for faculty to manage academic conduct and daily curriculum.
            </p>
          </div>

          <div className="relative z-10 mt-12 text-xs font-bold text-slate-500 uppercase tracking-widest">
            Secure System Access
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-7/12 p-12 lg:p-16 flex flex-col justify-center bg-slate-50">
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-school-navy">Sign In</h3>
            <p className="text-slate-500 text-sm mt-1">Enter your assigned ITS ID and password to continue.</p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700">{authError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            
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
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
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
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !itsNumber || !password}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-school-navy hover:bg-slate-800 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed group"
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