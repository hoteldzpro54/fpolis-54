import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, X, CalendarDays } from 'lucide-react';

export const ALGERIAN_MONTHS = [
  { value: '01', label: '01 - جانفي' },
  { value: '02', label: '02 - فيفري' },
  { value: '03', label: '03 - مارس' },
  { value: '04', label: '04 - أفريل' },
  { value: '05', label: '05 - ماي' },
  { value: '06', label: '06 - جوان' },
  { value: '07', label: '07 - جويلية' },
  { value: '08', label: '08 - أوت' },
  { value: '09', label: '09 - سبتمبر' },
  { value: '10', label: '10 - أكتوبر' },
  { value: '11', label: '11 - نوفمبر' },
  { value: '12', label: '12 - ديسمبر' }
];

interface InlineCalendarDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onCancel?: () => void;
  showSaveButton?: boolean;
}

export default function InlineCalendarDatePicker({
  value,
  onChange,
  onCancel,
  showSaveButton = true
}: InlineCalendarDatePickerProps) {
  // Parse date robustly
  const parseDate = (dateStr: string) => {
    const parts = dateStr ? dateStr.split('-') : [];
    const today = new Date();
    const y = parts[0] || String(today.getFullYear());
    const m = parts[1] || String(today.getMonth() + 1).padStart(2, '0');
    const d = parts[2] || String(today.getDate()).padStart(2, '0');
    return { y, m, d };
  };

  const initial = parseDate(value);
  const [day, setDay] = useState(initial.d);
  const [month, setMonth] = useState(initial.m);
  const [year, setYear] = useState(initial.y);

  const [showCalendar, setShowCalendar] = useState(false);
  const [navMonth, setNavMonth] = useState<number>(parseInt(initial.m) || new Date().getMonth() + 1);
  const [navYear, setNavYear] = useState<number>(parseInt(initial.y) || new Date().getFullYear());

  // Keep internal select state synced with external value
  useEffect(() => {
    const current = parseDate(value);
    setDay(current.d);
    setMonth(current.m);
    setYear(current.y);
  }, [value]);

  // Keep navigation calendar synced with selected date when opened
  useEffect(() => {
    if (showCalendar) {
      const current = parseDate(value);
      setNavMonth(parseInt(current.m) || new Date().getMonth() + 1);
      setNavYear(parseInt(current.y) || new Date().getFullYear());
    }
  }, [showCalendar, value]);

  const daysList = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const currentYear = new Date().getFullYear();
  const yearsList = useMemo(() => Array.from({ length: 15 }, (_, i) => String(currentYear - 3 + i)), [currentYear]);

  // Trigger date change automatically when dropdown elements are selected
  const handlePartChange = (part: 'day' | 'month' | 'year', partVal: string) => {
    const newDay = part === 'day' ? partVal : day;
    const newMonth = part === 'month' ? partVal : month;
    const newYear = part === 'year' ? partVal : year;

    if (part === 'day') setDay(partVal);
    if (part === 'month') setMonth(partVal);
    if (part === 'year') setYear(partVal);

    if (newDay && newMonth && newYear) {
      const formattedDate = `${newYear}-${newMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`;
      onChange(formattedDate);
    }
  };

  const handleSave = () => {
    if (day && month && year) {
      onChange(`${year}-${month}-${day}`);
    }
    if (onCancel) onCancel();
  };

  // Calendar math
  const daysInMonth = useMemo(() => {
    return new Date(navYear, navMonth, 0).getDate();
  }, [navYear, navMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(navYear, navMonth - 1, 1).getDay();
  }, [navYear, navMonth]);

  const weekDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const handlePrevMonth = () => {
    if (navMonth === 1) {
      setNavMonth(12);
      setNavYear(prev => prev - 1);
    } else {
      setNavMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 12) {
      setNavMonth(1);
      setNavYear(prev => prev + 1);
    } else {
      setNavMonth(prev => prev + 1);
    }
  };

  const selectDateFromGrid = (dayNum: number) => {
    const paddedDay = String(dayNum).padStart(2, '0');
    const paddedMonth = String(navMonth).padStart(2, '0');
    setDay(paddedDay);
    setMonth(paddedMonth);
    setYear(String(navYear));
    onChange(`${navYear}-${paddedMonth}-${paddedDay}`);
    setShowCalendar(false);
  };

  return (
    <div className="w-full flex flex-col gap-2 text-right" dir="rtl">
      {/* Input row selectors */}
      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full justify-between sm:justify-start">
        <div className="flex items-center gap-1">
          {/* Day Select */}
          <select
            value={day}
            onChange={(e) => handlePartChange('day', e.target.value)}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-[11px] font-bold outline-none cursor-pointer hover:border-amber-500/40 focus:border-amber-500 transition-colors"
            title="اليوم"
          >
            {daysList.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <span className="text-xs font-bold text-slate-400">/</span>

          {/* Month Select */}
          <select
            value={month}
            onChange={(e) => handlePartChange('month', e.target.value)}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-[11px] font-bold outline-none cursor-pointer max-w-[95px] hover:border-amber-500/40 focus:border-amber-500 transition-colors"
            title="الشهر"
          >
            {ALGERIAN_MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <span className="text-xs font-bold text-slate-400">/</span>

          {/* Year Select */}
          <select
            value={year}
            onChange={(e) => handlePartChange('year', e.target.value)}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg text-[11px] font-bold outline-none cursor-pointer hover:border-amber-500/40 focus:border-amber-500 transition-colors"
            title="السنة"
          >
            {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Calendar Trigger Button */}
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
              showCalendar
                ? 'bg-amber-500/20 text-amber-600 border-amber-500/40 scale-105'
                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
            title="تحديد من الرزنامة التفاعلية"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#cca43b]" />
            <span className="text-[9px] font-black hidden sm:inline">الرزنامة</span>
          </button>

          {/* Confirm / Cancel Buttons */}
          {showSaveButton && (
            <button
              type="button"
              onClick={handleSave}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <Check className="w-3 h-3" />
              <span>تأكيد</span>
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />
              <span>إلغاء</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Calendar Inline Panel */}
      {showCalendar && (
        <div
          className="w-full bg-white dark:bg-slate-950 border border-amber-500/25 dark:border-[#cca43b]/30 shadow-xl rounded-2xl p-3 overflow-hidden select-none mt-2 animate-in fade-in duration-150"
        >
          {/* Calendar Header with Controls */}
            <div className="flex justify-between items-center bg-[#0b3c5d] dark:bg-[#1a1200] p-2 rounded-xl text-white mb-2.5 border border-amber-500/10">
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                title="الشهر التالي"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs font-black font-sans text-amber-400">
                {ALGERIAN_MONTHS.find(m => parseInt(m.value) === navMonth)?.label || navMonth} - {navYear}
              </span>

              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                title="الشهر السابق"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Month & Year Fast selectors */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5">
              <select
                value={String(navMonth).padStart(2, '0')}
                onChange={(e) => setNavMonth(parseInt(e.target.value))}
                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] font-bold outline-none text-slate-800 dark:text-white cursor-pointer hover:border-amber-500/35 transition-colors"
              >
                {ALGERIAN_MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select
                value={String(navYear)}
                onChange={(e) => setNavYear(parseInt(e.target.value))}
                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] font-bold outline-none text-slate-800 dark:text-white cursor-pointer hover:border-amber-500/35 transition-colors"
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-0.5 text-center mb-1.5 bg-slate-50 dark:bg-slate-900/30 py-1.5 rounded-xl">
              {weekDays.map(wd => (
                <span key={wd} className="text-[9px] font-black text-slate-400">
                  {wd}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center font-sans">
              {/* Empty spaces before month start */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="p-0.5" />
              ))}

              {/* Days of Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dNum = i + 1;
                const isCurrentSelection =
                  day &&
                  parseInt(day) === dNum &&
                  month &&
                  parseInt(month) === navMonth &&
                  year &&
                  parseInt(year) === navYear;

                return (
                  <button
                    key={`day-${dNum}`}
                    type="button"
                    onClick={() => selectDateFromGrid(dNum)}
                    className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-lg transition-all mx-auto cursor-pointer ${
                      isCurrentSelection
                        ? 'bg-[#cca43b] text-slate-950 font-black shadow-md scale-105 border border-amber-600'
                        : 'hover:bg-[#cca43b]/10 bg-slate-50 dark:bg-slate-900/50 text-slate-850 dark:text-slate-200 border border-transparent'
                    }`}
                  >
                    {dNum}
                  </button>
                );
              })}
            </div>

            {/* Quick Today selector & Close panel button */}
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-900/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const tDay = String(today.getDate()).padStart(2, '0');
                  const tMonth = String(today.getMonth() + 1).padStart(2, '0');
                  const tYear = String(today.getFullYear());
                  setDay(tDay);
                  setMonth(tMonth);
                  setYear(tYear);
                  onChange(`${tYear}-${tMonth}-${tDay}`);
                  setShowCalendar(false);
                }}
                className="px-2.5 py-1 bg-[#cca43b]/15 hover:bg-[#cca43b]/30 text-amber-700 dark:text-[#cca43b] text-[9px] font-black rounded-lg transition-colors cursor-pointer"
              >
                اليوم (تحديث تلقائي)
              </button>

              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                إغلاق الرزنامة
              </button>
            </div>
        </div>
      )}
    </div>
  );
}
