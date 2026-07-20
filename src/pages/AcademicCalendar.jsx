// src/pages/AcademicCalendar.jsx
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Sun, Moon, Briefcase, Tent } from 'lucide-react';
import HijriDate from '../lib/HijriDate';

// Dummy events for demonstration (In production, fetch these from Supabase)
const academicEvents = [
  { date: '2026-07-24', title: 'Chehlum (Holiday)', isHoliday: true },
  { date: '2026-08-15', title: 'Independence Day', isHoliday: true },
  { date: '2026-08-20', title: 'Term 1 Examinations Begin', isHoliday: false }
];

export default function AcademicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [calendarGrid, setCalendarGrid] = useState([]);
  
  // Dashboard Counters
  const [counters, setCounters] = useState({ total: 0, working: 0, holidays: 0 });

  useEffect(() => {
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  const generateCalendar = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const grid = [];
    let working = 0;
    let holidays = 0;

    // Pad empty days at the start of the month
    for (let i = 0; i < firstDay; i++) {
      grid.push(null);
    }

    // Generate actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const gDate = new Date(year, month, day);
      
      // Calculate Hijri Date using your provided utility
      const hDate = HijriDate.fromGregorian(gDate);
      const hDay = hDate.getDate();
      const hMonthShort = HijriDate.getShortMonthName(hDate.getMonth());
      const hYear = hDate.getYear();

      // Format YYYY-MM-DD for event matching
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvent = academicEvents.find(e => e.date === dateString);
      
      // Determine if it's a weekend (Sunday = 0, Saturday = 6)
      const isWeekend = gDate.getDay() === 0 || gDate.getDay() === 6;
      const isHoliday = isWeekend || (dayEvent && dayEvent.isHoliday);

      if (isHoliday) holidays++; else working++;

      grid.push({
        day,
        dateString,
        gDate,
        hDay,
        hMonthShort,
        hYear,
        isWeekend,
        event: dayEvent
      });
    }

    setCalendarGrid(grid);
    setCounters({ total: daysInMonth, working, holidays });
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. Page Header & View Toggles */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-school-navy flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-500" />
            Dual Academic Calendar
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Track Gregorian and Hijri dates, alongside academic milestones.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <CalendarIcon className="w-4 h-4" /> Grid
          </button>
          <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-school-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <List className="w-4 h-4" /> List
          </button>
        </div>
      </div>

      {/* 2. Top Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-b-4 border-b-indigo-500">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><CalendarIcon className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Days in Month</p>
            <p className="text-2xl font-black text-school-navy">{counters.total}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-b-4 border-b-emerald-500">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Briefcase className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Working Days</p>
            <p className="text-2xl font-black text-emerald-700">{counters.working}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-b-4 border-b-amber-500">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Tent className="w-5 h-5" /></div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Holidays & Weekends</p>
            <p className="text-2xl font-black text-amber-700">{counters.holidays}</p>
          </div>
        </div>
      </div>

      {/* 3. Calendar Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Month Navigation */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <button onClick={goToday} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">Today</button>
          
          <div className="flex items-center gap-6">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"><ChevronLeft className="w-6 h-6" /></button>
            <h3 className="text-xl font-black text-school-navy w-48 text-center">{currentMonthName} {currentYear}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"><ChevronRight className="w-6 h-6" /></button>
          </div>
          
          <div className="w-[72px]"></div> {/* Spacer for centering */}
        </div>

        {/* View Renders */}
        {viewMode === 'grid' ? (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-4 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-black uppercase text-slate-400">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {calendarGrid.map((dayObj, index) => {
                if (!dayObj) return <div key={`empty-${index}`} className="min-h-[100px] bg-slate-50/50 rounded-xl border border-transparent"></div>;
                
                const isToday = new Date().toDateString() === dayObj.gDate.toDateString();
                
                return (
                  <div key={dayObj.dateString} className={`min-h-[100px] p-2 md:p-3 rounded-xl border flex flex-col relative transition-shadow hover:shadow-md ${
                    isToday ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 
                    dayObj.isWeekend ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'
                  }`}>
                    
                    {/* Top Row: Dates */}
                    <div className="flex justify-between items-start">
                      <div className={`text-xl font-bold ${isToday ? 'text-indigo-700' : dayObj.isWeekend ? 'text-slate-400' : 'text-school-navy'}`}>
                        {dayObj.day}
                      </div>
                      
                      {/* Hijri Date Box */}
                      <div className="flex flex-col items-end text-right">
                        <span className="text-sm font-bold text-amber-600">{dayObj.hDay}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 hidden md:block leading-tight">{dayObj.hMonthShort}</span>
                      </div>
                    </div>

                    {/* Events Row */}
                    <div className="mt-auto pt-2">
                      {dayObj.event && (
                        <div className={`text-[10px] font-bold p-1.5 rounded line-clamp-2 leading-tight ${
                          dayObj.event.isHoliday ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {dayObj.event.title}
                        </div>
                      )}
                    </div>
                    
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-slate-100">
            {calendarGrid.filter(d => d !== null).map((dayObj) => (
              <div key={dayObj.dateString} className={`p-4 flex items-center gap-6 hover:bg-slate-50 transition-colors ${dayObj.isWeekend ? 'opacity-70' : ''}`}>
                <div className="flex-shrink-0 text-center w-16">
                  <p className="text-xs font-bold text-slate-400 uppercase">{dayObj.gDate.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className="text-2xl font-black text-school-navy">{dayObj.day}</p>
                </div>
                
                <div className="flex-shrink-0 w-32 border-l border-slate-200 pl-6">
                  <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1"><Moon className="w-3 h-3"/> Hijri Date</p>
                  <p className="text-sm font-bold text-slate-700">{dayObj.hDay} {dayObj.hMonthShort}</p>
                  <p className="text-xs text-slate-400">{dayObj.hYear}H</p>
                </div>

                <div className="flex-1 border-l border-slate-200 pl-6">
                  {dayObj.event ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      dayObj.event.isHoliday ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {dayObj.event.isHoliday ? <Tent className="w-3.5 h-3.5"/> : <Briefcase className="w-3.5 h-3.5"/>}
                      {dayObj.event.title}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-slate-400 italic">No events scheduled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}