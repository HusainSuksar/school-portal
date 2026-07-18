// src/pages/AcademicCalendar.jsx
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, PlusCircle, Trash2, BookOpen, AlertCircle, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AcademicCalendar() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Form State (Admin Only)
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('General');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCalendarData = async () => {
    setIsLoading(true);
    
    // 1. Get Current User Role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile) setUserRole(profile.role);
    }

    // 2. Fetch Events (Ordered by upcoming dates)
    const { data } = await supabase
      .from('academic_calendar')
      .select('*')
      .order('event_date', { ascending: true });

    if (data) setEvents(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventName || !eventDate) return;
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('academic_calendar')
      .insert([{
        event_name: eventName,
        event_date: eventDate,
        event_type: eventType,
        created_by: user.id
      }]);

    if (!error) {
      setEventName('');
      setEventDate('');
      setEventType('General');
      fetchCalendarData(); // Refresh the feed
    } else {
      console.error("Error adding event:", error);
      alert("Failed to add event to the calendar.");
    }
    
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    const { error } = await supabase.from('academic_calendar').delete().eq('id', id);
    if (!error) fetchCalendarData();
  };

  const canEdit = userRole === 'ADMIN' || userRole === 'HOS';
  const today = new Date().toISOString().split('T')[0];

  // Helper to color-code event badges
  const getEventBadge = (type) => {
    switch (type) {
      case 'Holiday': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Exam': return 'bg-red-100 text-red-700 border-red-200';
      case 'Term': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-indigo-500" />
          Academic Calendar
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Key dates, term schedules, and school holidays.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Admin Entry Form (Conditional) */}
        {canEdit && (
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-school-navy flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-500" /> Add New Event
              </h3>
            </div>
            
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Event Title</label>
                <input 
                  type="text" 
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Mid-Term Exams Begin"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Date</label>
                <input 
                  type="date" 
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Event Type</label>
                <select 
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="General">General Event</option>
                  <option value="Term">Term Start / End</option>
                  <option value="Exam">Examination</option>
                  <option value="Holiday">School Holiday</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-school-navy hover:bg-slate-800 text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md disabled:bg-slate-300"
              >
                {isSubmitting ? 'Saving...' : 'Add to Calendar'}
              </button>
            </form>
          </div>
        )}

        {/* Right Column: The Master Timeline */}
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px] ${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-school-navy">Upcoming Schedule</h3>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {events.map((event) => {
                  const isPast = event.event_date < today;
                  
                  return (
                    <div key={event.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group ${isPast ? 'opacity-60 grayscale-[50%]' : ''}`}>
                      
                      {/* Timeline Dot */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                        {event.event_type === 'Holiday' ? <MapPin className="w-4 h-4 text-emerald-500" /> :
                         event.event_type === 'Exam' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                         event.event_type === 'Term' ? <BookOpen className="w-4 h-4 text-indigo-500" /> : 
                         <Clock className="w-4 h-4" />}
                      </div>
                      
                      {/* Event Card */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${getEventBadge(event.event_type)}`}>
                            {event.event_type}
                          </span>
                          
                          {canEdit && (
                            <button 
                              onClick={() => handleDelete(event.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <h4 className="font-bold text-school-navy text-lg">{event.event_name}</h4>
                        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4" />
                          {new Date(event.event_date).toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                      </div>

                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-school-navy">No Events Scheduled</h3>
                <p className="mt-1 max-w-sm">The academic calendar is currently empty.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}