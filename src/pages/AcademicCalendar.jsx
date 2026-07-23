// src/pages/AcademicCalendar.jsx
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Sun, Briefcase, Tent, Plus, Trash2 } from 'lucide-react';
import HijriDate from '../lib/HijriDate';
import { supabase } from '../lib/supabase';

export default function AcademicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('grid');
  const [calendarGrid, setCalendarGrid] = useState([]);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [dbEvents, setDbEvents] = useState([]);
  const [counters, setCounters] = useState({ total: 0, working: 0, holidays: 0 });

  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newIsHoliday, setNewIsHoliday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkRoleAndFetchEvents();
  }, []);

  useEffect(() => {
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth(), dbEvents);
  }, [currentDate, dbEvents]);

  const checkRoleAndFetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setIsAdmin(profile?.role === 'ADMIN' || profile?.role === 'HOS');
    }
    
    const { data: events } = await supabase.from('academic_calendar').select('*');
    if (events) setDbEvents(events);
  };

  const generateCalendar = (year, month, eventsArr) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const grid = [];
    let working = 0;
    let holidays = 0;

    for (let i = 0; i < firstDay; i++) grid.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const gDate = new Date(year, month, day);
      
      const hDate = HijriDate.fromGregorian(gDate);
      const hDay = hDate.getDate();
      const hMonthShort = HijriDate.getShortMonthName(hDate.getMonth());
      const hYear = hDate.getYear();

      const offset = gDate.getTimezoneOffset();
      const localDate = new Date(gDate.getTime() - (offset * 60 * 1000));
      const dateString = localDate.toISOString().split('T')[0];

      const dbEvent = eventsArr.find(e => e.date === dateString);
      
      const isWeekend = gDate.getDay() === 0 || gDate.getDay() === 6;
      let isHoliday = isWeekend;

      if (dbEvent) isHoliday = dbEvent.is_holiday; 

      if (isHoliday) holidays++; else working++;

      grid.push({ day, dateString, gDate, hDay, hMonthShort, hYear, isWeekend, event: dbEvent });
    }

    setCalendarGrid(grid);
    setCounters({ total: daysInMonth, working, holidays });
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventDate || !newEventTitle) return;
    setIsSubmitting(true);

    const { data, error } = await supabase.from('academic_calendar').insert([{
      date: newEventDate,
      title: newEventTitle,
      is_holiday: newIsHoliday
    }]).select();

    if (!error && data && data.length > 0) {
      setDbEvents([...dbEvents, data[0]]);
      setNewEventDate('');
      setNewEventTitle('');
      setNewIsHoliday(false);
    } else {
      if (error?.code === '23505') alert("An event already exists on this specific date.");
      else alert("Failed to add event. Please ensure you are an Admin.");
    }
    setIsSubmitting(false);
  };

  const handleDeleteEvent = async (id) => {
    const { error } = await supabase.from('academic_calendar').delete().eq('id', id);
    if (!error) setDbEvents(dbEvents.filter(e => e.id !== id));
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const listEvents = calendarGrid.filter(d => d && d.event);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2"><CalendarIcon className="w-6 h-6 text-indigo-500" /> Dual Academic Calendar</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Gregorian and Hijri milestones synced with dynamic working day calculations.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500'}`}><CalendarIcon className="w-4 h-4" /> Grid</button>
          <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500'}`}><List className="w-4 h-4" /> List</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-b-4 border-b-indigo-500">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><CalendarIcon className="w-5 h-5" /></div>
          <div><p className="text-xs font-bold text-slate-500 uppercase">Days in Month</p><p className="text-2xl font-black text-school-navy">{counters.total}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-b-4 border-b-emerald-500">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Briefcase className="w-5 h-5" /></div>
          <div><p className="text-xs font-bold text-slate-500 uppercase">Working Days</p><p className="text-2xl font-black text-emerald-700">{counters.working}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-b-4 border-b-amber-500">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Tent className="w-5 h-5" /></div>
          <div><p className="text-xs font-bold text-slate-500 uppercase">Holidays & Weekends</p><p className="text-2xl font-black text-amber-700">{counters.holidays}</p></div>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-school-navy">Admin Event Manager</h3></div>
          <form onSubmit={handleAddEvent} className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Date</label><input type="date" required value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
            <div className="flex-1 w-full"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Event Title</label><input type="text" required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="e.g. Independence Day" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" /></div>
            <div className="flex items-center gap-2 mb-3 px-2">
              <input type="checkbox" id="isHoliday" checked={newIsHoliday} onChange={e => setNewIsHoliday(e.target.checked)} className="w-4 h-4 cursor-pointer" />
              <label htmlFor="isHoliday" className="text-sm font-bold text-amber-700 cursor-pointer">Mark as Holiday</label>
            </div>
            <button type="submit" disabled={isSubmitting} className="bg-school-navy hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> {isSubmitting ? 'Adding...' : 'Add Event'}</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">Today</button>
          <div className="flex items-center gap-6">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
            <h3 className="text-xl font-black text-school-navy w-48 text-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-full"><ChevronRight className="w-6 h-6" /></button>
          </div>
          <div className="w-[72px]"></div>
        </div>

        {viewMode === 'grid' ? (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-4 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-xs font-black uppercase text-slate-400">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {calendarGrid.map((dayObj, i) => {
                if (!dayObj) return <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 rounded-xl border border-transparent"></div>;
                const isToday = new Date().toDateString() === dayObj.gDate.toDateString();
                
                return (
                  <div key={dayObj.dateString} className={`min-h-[100px] p-2 md:p-3 rounded-xl border flex flex-col group relative ${isToday ? 'bg-indigo-50 border-indigo-300' : dayObj.isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`text-xl font-bold ${isToday ? 'text-indigo-700' : dayObj.isWeekend ? 'text-slate-400' : 'text-school-navy'}`}>{dayObj.day}</div>
                      <div className="flex flex-col items-end text-right">
                        <span className="text-sm font-bold text-amber-600">{dayObj.hDay}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 hidden md:block">{dayObj.hMonthShort}</span>
                      </div>
                    </div>
                    <div className="mt-auto pt-2">
                      {dayObj.event && (
                        <div className={`text-[10px] font-bold p-1.5 rounded line-clamp-2 leading-tight flex justify-between items-center ${dayObj.event.is_holiday ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}`}>
                          <span>{dayObj.event.title}</span>
                          {isAdmin && <button onClick={() => handleDeleteEvent(dayObj.event.id)} className="text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listEvents.length > 0 ? (
              listEvents.map((dayObj) => (
                <div key={dayObj.dateString} className="p-4 flex items-center gap-6">
                  <div className="w-16 text-center"><p className="text-xs font-bold text-slate-400 uppercase">{dayObj.gDate.toLocaleDateString('en-US', { weekday: 'short' })}</p><p className="text-2xl font-black text-school-navy">{dayObj.day}</p></div>
                  <div className="flex-1 pl-6 border-l border-slate-200 flex justify-between items-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase ${dayObj.event.is_holiday ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {dayObj.event.title}
                    </span>
                    {isAdmin && <button onClick={() => handleDeleteEvent(dayObj.event.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                <h3 className="text-lg font-bold text-school-navy">No Events Scheduled</h3>
                <p className="text-sm">There are no academic events or holidays saved for this month.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}