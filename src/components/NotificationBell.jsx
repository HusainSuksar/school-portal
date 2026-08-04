// src/components/NotificationBell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Circle, Clock, SmartphoneNfc } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Helper function to convert VAPID base64 string
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState('default'); // 'default', 'granted', or 'denied'
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // Check current push notification permission status safely
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }

    // Close dropdown if clicked outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // REAL-TIME LISTENER: Watch for new notifications instantly
    let channel;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const uniqueChannelId = `in_app_notifs_${user.id}_${Math.random().toString(36).substring(7)}`;

      channel = supabase
        .channel(uniqueChannelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'in_app_notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read in database if it isn't already
    if (!notif.is_read) {
      await supabase.from('in_app_notifications').update({ is_read: true }).eq('id', notif.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    
    setIsOpen(false);
    
    // Redirect user to the relevant page
    if (notif.redirect_url) {
      navigate(notif.redirect_url);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('in_app_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  // --- NEW: Inline Push Notification Enabler ---
  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported on this browser/device.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission); // Update UI immediately
      
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const PUBLIC_VAPID_KEY = "BNlMSjHRveSNG46-s1f5lJt66IDt0Nyj171cxykcdgfxdX9CLFOKyhZ7PvFWFsPKjqg6D384pl9zq7TmtyT5vZo";

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        role: profile?.role || 'PARENT',
        subscription: subscription.toJSON()
      }, { onConflict: 'user_id' });

    } catch (err) {
      console.error('Subscription error:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BELL ICON BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-school-navy flex items-center gap-2">
              Notifications
              {unreadCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{unreadCount} new</span>}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                Mark all read
              </button>
            )}
          </div>
          
          {/* SMART PROMPT: Only shows if they haven't granted permission yet */}
          {pushStatus === 'default' && (
            <div className="bg-indigo-600 p-4 shrink-0 flex items-start gap-3 text-white">
              <SmartphoneNfc className="w-6 h-6 text-indigo-200 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Stay Updated</p>
                <p className="text-xs text-indigo-200 mt-0.5 leading-relaxed">Turn on push notifications to get instant alerts directly on your device screen.</p>
                <button 
                  onClick={handleEnablePush}
                  className="mt-3 bg-white text-indigo-700 text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors"
                >
                  Enable Device Alerts
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {notifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${!notif.is_read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="mt-1 shrink-0">
                      {!notif.is_read ? (
                        <Circle className="w-3 h-3 fill-indigo-600 text-indigo-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm ${!notif.is_read ? 'font-bold text-school-navy' : 'font-medium text-slate-600'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                <Bell className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium text-sm">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}