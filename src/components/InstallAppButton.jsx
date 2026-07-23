// src/components/InstallAppButton.jsx
import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Check if app is already installed/running in standalone mode
    const isAppStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isAppStandalone);

    // 2. Check if device is iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Listen for Android native install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevent automatic prompt
      setDeferredPrompt(e); // Save event to trigger later on button click
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // If already installed, hide the button completely
  if (isStandalone) return null;

  // If not iOS and no install prompt is ready yet, hide button (e.g. desktop browsers that don't support it)
  if (!isIOS && !deferredPrompt) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      // Trigger Custom Apple Instructions
      setShowIOSModal(true);
    } else if (deferredPrompt) {
      // Trigger Native Android Prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <>
      {/* The Navbar/Header Button */}
      <button 
        onClick={handleInstallClick}
        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-indigo-200"
      >
        <Download className="w-4 h-4" /> Install App
      </button>

      {/* Custom iOS Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 sm:p-0 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-school-navy flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-500" /> Install on iPhone
              </h3>
              <button onClick={() => setShowIOSModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-slate-600 font-medium">Install this portal on your home screen for quick and easy access without opening Safari.</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-500 shrink-0 border border-slate-200">
                    <Share className="w-5 h-5 mb-1" /> 
                  </div>
                  <p className="text-sm font-bold text-school-navy">1. Tap the <span className="text-blue-500">Share</span> icon at the bottom of your screen.</p>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-700 shrink-0 border border-slate-200">
                    <PlusSquare className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-school-navy">2. Scroll down and tap <br/><span className="text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded uppercase text-[10px] tracking-wider">Add to Home Screen</span></p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setShowIOSModal(false)} className="w-full py-3 bg-school-navy hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition-colors">
                Got it, thanks!
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}