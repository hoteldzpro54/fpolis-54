import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Guest, RoomStatusValue } from '../types';
import { generateId, calculateNights, formatDateDMY, loadHotelSettings, addDaysToDateString, getRequiredPaidNights, calculatePeriodCheckout, getAdjustedCheckInDate, getLocalDateString } from '../utils';
import { CheckCircle2, UserPlus, Save, LayoutTemplate, Edit, AlertCircle, Info, Sparkles, HelpCircle, Bed, Users, ShieldAlert, BadgeInfo, CheckCircle, Calendar, ChevronLeft, ChevronRight, X, Clock, ChevronDown } from 'lucide-react';

const getInitialRooms = () => {
  try {
    const parsed = loadHotelSettings();
    if (parsed) {
      if (parsed.customHotelRooms && parsed.customHotelRooms.length > 0) {
        const list = [...parsed.customHotelRooms];
        list.sort((a, b) => {
          const floorA = parseInt(a.floor, 10);
          const floorB = parseInt(b.floor, 10);
          if (!isNaN(floorA) && !isNaN(floorB)) {
            if (floorA !== floorB) return floorA - floorB;
          } else {
            const floorComp = a.floor.localeCompare(b.floor, undefined, { numeric: true });
            if (floorComp !== 0) return floorComp;
          }
          const numA = parseInt(a.id, 10);
          const numB = parseInt(b.id, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.id.localeCompare(b.id, undefined, { numeric: true });
        });
        return list;
      }
      if (parsed.floorConfigs && parsed.floorConfigs.length > 0) {
        const list: { id: string; floor: string; floorName: string; type: string }[] = [];
        parsed.floorConfigs.forEach((cfg: any) => {
          const start = Number(cfg.startRoomNumber) || (Number(cfg.floorId) * 100 + 1);
          const customNumbers = Array.isArray(cfg.customNumbers) ? cfg.customNumbers : [];
          let offset = 0;
          if (cfg.roomTypes && Array.isArray(cfg.roomTypes) && cfg.roomTypes.length > 0) {
            cfg.roomTypes.forEach((rt: any) => {
              const count = Number(rt.count) || 0;
              for (let i = 0; i < count; i++) {
                const rId = customNumbers[offset] !== undefined && String(customNumbers[offset]).trim() !== ''
                  ? String(customNumbers[offset]).trim()
                  : String(start + offset);
                list.push({
                  id: rId,
                  floor: String(cfg.floorId),
                  floorName: cfg.floorName || `الطابق ${cfg.floorId}`,
                  type: rt.type || 'غرفة زوجية'
                });
                offset++;
              }
            });
          } else {
            const count = Number(cfg.roomsCount) || 0;
            for (let i = 0; i < count; i++) {
              const rId = customNumbers[i] !== undefined && String(customNumbers[i]).trim() !== ''
                ? String(customNumbers[i]).trim()
                : String(start + i);
              list.push({
                id: rId,
                floor: String(cfg.floorId),
                floorName: cfg.floorName || `الطابق ${cfg.floorId}`,
                type: cfg.roomType || 'غرفة زوجية'
              });
            }
          }
        });
        if (list.length > 0) {
          list.sort((a, b) => {
            const floorA = parseInt(a.floor, 10);
            const floorB = parseInt(b.floor, 10);
            if (!isNaN(floorA) && !isNaN(floorB)) {
              if (floorA !== floorB) return floorA - floorB;
            } else {
              const floorComp = a.floor.localeCompare(b.floor, undefined, { numeric: true });
              if (floorComp !== 0) return floorComp;
            }
            const numA = parseInt(a.id, 10);
            const numB = parseInt(b.id, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.id.localeCompare(b.id, undefined, { numeric: true });
          });
          return list;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load customHotelRooms from localStorage in GuestForm init", e);
  }
  return [
    { id: '1', floor: '1', floorName: 'الطابق الأول', type: 'غرفة فردية' },
    { id: '2', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '3', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '4', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '5', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '6', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '7', floor: '1', floorName: 'الطابق الأول', type: 'غرفة فردية' },
    { id: '8', floor: '1', floorName: 'الطابق الأول', type: 'غرفة فردية' },
    { id: '9', floor: '1', floorName: 'الطابق الأول', type: 'غرفة ممتازة' },
    { id: '10', floor: '1', floorName: 'الطابق الأول', type: 'غرفة ممتازة' },
    { id: '11', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '12', floor: '1', floorName: 'الطابق الأول', type: 'غرفة فردية' },
    { id: '13', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '14', floor: '1', floorName: 'الطابق الأول', type: 'غرفة فردية' },
    { id: '15', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '16', floor: '1', floorName: 'الطابق الأول', type: 'غرفة فردية' },
    { id: '17', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '18', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' },
    { id: '19', floor: '1', floorName: 'الطابق الأول', type: 'غرفة زوجية' }
  ];
};

export const HOTEL_ROOMS = getInitialRooms();

export function getHotelRooms(hotelSettings?: any) {
  if (hotelSettings && hotelSettings.customHotelRooms && hotelSettings.customHotelRooms.length > 0) {
    const list = [...hotelSettings.customHotelRooms];
    list.sort((a, b) => {
      const floorA = parseInt(a.floor, 10);
      const floorB = parseInt(b.floor, 10);
      if (!isNaN(floorA) && !isNaN(floorB)) {
        if (floorA !== floorB) return floorA - floorB;
      } else {
        const floorComp = a.floor.localeCompare(b.floor, undefined, { numeric: true });
        if (floorComp !== 0) return floorComp;
      }
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
    return list;
  }
  if (hotelSettings && hotelSettings.floorConfigs && hotelSettings.floorConfigs.length > 0) {
    const list: { id: string; floor: string; floorName: string; type: string }[] = [];
    hotelSettings.floorConfigs.forEach((cfg: any) => {
      const start = Number(cfg.startRoomNumber) || (Number(cfg.floorId) * 100 + 1);
      const customNumbers = Array.isArray(cfg.customNumbers) ? cfg.customNumbers : [];
      let offset = 0;
      if (cfg.roomTypes && Array.isArray(cfg.roomTypes) && cfg.roomTypes.length > 0) {
        cfg.roomTypes.forEach((rt: any) => {
          const count = Number(rt.count) || 0;
          for (let i = 0; i < count; i++) {
            const rId = customNumbers[offset] !== undefined && String(customNumbers[offset]).trim() !== ''
              ? String(customNumbers[offset]).trim()
              : String(start + offset);
            list.push({
              id: rId,
              floor: String(cfg.floorId),
              floorName: cfg.floorName || `الطابق ${cfg.floorId}`,
              type: rt.type || 'غرفة زوجية'
            });
            offset++;
          }
        });
      } else {
        // Fallback for single roomType config
        const count = Number(cfg.roomsCount) || 0;
        for (let i = 0; i < count; i++) {
          const rId = customNumbers[i] !== undefined && String(customNumbers[i]).trim() !== ''
            ? String(customNumbers[i]).trim()
            : String(start + i);
          list.push({
            id: rId,
            floor: String(cfg.floorId),
            floorName: cfg.floorName || `الطابق ${cfg.floorId}`,
            type: cfg.roomType || 'غرفة زوجية'
          });
        }
      }
    });
    if (list.length > 0) {
      list.sort((a, b) => {
        const floorA = parseInt(a.floor, 10);
        const floorB = parseInt(b.floor, 10);
        if (!isNaN(floorA) && !isNaN(floorB)) {
          if (floorA !== floorB) return floorA - floorB;
        } else {
          const floorComp = a.floor.localeCompare(b.floor, undefined, { numeric: true });
          if (floorComp !== 0) return floorComp;
        }
        const numA = parseInt(a.id, 10);
        const numB = parseInt(b.id, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      });
      return list;
    }
  }
  return getInitialRooms();
}

export const STATUS_CONFIGS: Record<RoomStatusValue, { label: string; icon: any; bg: string; text: string; border: string; cardColor: string; badgeStyle: string; indicatorColor: string }> = {
  available: {
    label: 'متاحة',
    icon: CheckCircle2,
    bg: 'bg-emerald-500/15 dark:bg-emerald-950/35',
    text: 'text-emerald-800 dark:text-emerald-300 font-extrabold',
    border: 'border-emerald-300 dark:border-emerald-500/40',
    cardColor: 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/95 dark:bg-[#062016] hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-100/95 dark:hover:bg-[#093021] text-slate-950 dark:text-emerald-100 shadow-[0_4px_12px_rgba(16,185,129,0.08)] backdrop-blur-[12px]',
    badgeStyle: 'border border-emerald-450 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/50 font-black px-2 py-0.5 rounded-lg shadow-sm',
    indicatorColor: 'bg-emerald-500'
  },
  occupied: {
    label: 'مشغولة',
    icon: Bed,
    bg: 'bg-indigo-500/15 dark:bg-indigo-950/35',
    text: 'text-indigo-800 dark:text-indigo-305 font-extrabold',
    border: 'border-indigo-300 dark:border-indigo-500/40',
    cardColor: 'border-indigo-400 dark:border-indigo-500/50 bg-indigo-50/95 dark:bg-[#0f112e] hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-100/95 dark:hover:bg-[#151942] text-slate-950 dark:text-indigo-100 shadow-[0_4px_12px_rgba(99,102,241,0.08)] backdrop-blur-[12px]',
    badgeStyle: 'border border-indigo-450 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-305 dark:border-indigo-500/50 font-black px-2 py-0.5 rounded-lg shadow-sm',
    indicatorColor: 'bg-indigo-500'
  },
  reserved: {
    label: 'محجوزة',
    icon: Sparkles,
    bg: 'bg-amber-500/15 dark:bg-amber-950/35',
    text: 'text-amber-800 dark:text-amber-400 font-extrabold',
    border: 'border-amber-300 dark:border-amber-500/40',
    cardColor: 'border-amber-400 dark:border-[#cca43b]/60 bg-amber-50/95 dark:bg-[#2e2307] hover:border-[#cca43b] hover:bg-amber-100/95 dark:hover:bg-[#3f300a] text-slate-950 dark:text-amber-100 shadow-[0_4px_12px_rgba(204,164,59,0.08)] backdrop-blur-[12px]',
    badgeStyle: 'border border-amber-450 bg-amber-50 text-amber-800 dark:bg-[#cca43b]/30 dark:text-amber-300 dark:border-[#cca43b]/60 font-black px-2 py-0.5 rounded-lg shadow-sm',
    indicatorColor: 'bg-amber-500'
  },
  out_of_order: {
    label: 'معطلة',
    icon: ShieldAlert,
    bg: 'bg-rose-500/15 dark:bg-rose-950/35',
    text: 'text-rose-800 dark:text-rose-300 font-extrabold',
    border: 'border-rose-300 dark:border-rose-500/40',
    cardColor: 'border-rose-400 dark:border-rose-500/50 bg-rose-50/95 dark:bg-[#330c12] hover:border-rose-500 dark:hover:border-rose-400 hover:bg-rose-100/95 dark:hover:bg-[#4a121b] text-slate-950 dark:text-rose-100 shadow-[0_4px_12px_rgba(239,68,68,0.08)] backdrop-blur-[12px] opacity-95',
    badgeStyle: 'border border-rose-450 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/50 font-black px-2 py-0.5 rounded-lg shadow-sm',
    indicatorColor: 'bg-rose-500'
  },
  dirty: {
    label: 'غير نظيفة',
    icon: BadgeInfo,
    bg: 'bg-orange-500/15 dark:bg-orange-950/35',
    text: 'text-orange-800 dark:text-orange-300 font-extrabold',
    border: 'border-orange-300 dark:border-orange-500/40',
    cardColor: 'border-orange-400 dark:border-orange-500/50 bg-orange-50/95 dark:bg-[#2e1707] hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-100/95 dark:hover:bg-[#3f200a] text-slate-950 dark:text-orange-100 shadow-[0_4px_12px_rgba(249,115,22,0.08)] backdrop-blur-[12px]',
    badgeStyle: 'border border-orange-450 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-500/50 font-black px-2 py-0.5 rounded-lg shadow-sm',
    indicatorColor: 'bg-orange-500'
  }
};

export const getEffectiveRoomStatus = (roomId: string, occupiedCount: number, roomStatuses: Record<string, RoomStatusValue>): RoomStatusValue => {
  return roomStatuses[roomId] || (occupiedCount > 0 ? 'occupied' : 'available');
};

const getClassForCount = (count: number): string => {
  if (count === 1) return 'النزيل الثاني';
  if (count === 2) return 'النزيل الثالث';
  if (count === 3) return 'النزيل الرابع';
  if (count === 4) return 'النزيل الخامس';
  if (count === 5) return 'النزيل السادس';
  if (count === 6) return 'النزيل السابع';
  if (count === 7) return 'النزيل الثامن';
  return 'النزيل الأول';
};

const ALGERIAN_MONTHS = [
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

const parseDateString = (dateStr: string) => {
  if (!dateStr) return { day: '', month: '', year: '', isYearOnly: false };
  if (dateStr.startsWith('../../')) {
    return {
      day: '',
      month: '',
      year: dateStr.replace('../../', ''),
      isYearOnly: true
    };
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return {
      year: parts[0],
      month: parts[1],
      day: parts[2],
      isYearOnly: false
    };
  }
  return { day: '', month: '', year: '', isYearOnly: false };
};

const buildDateString = (day: string, month: string, year: string, isYearOnly?: boolean) => {
  if (isYearOnly) {
    return `../../${year}`;
  }
  if (!day || !month || !year) return '';
  const paddedDay = day.padStart(2, '0');
  const paddedMonth = month.padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

interface SplitDateInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  yearType: 'dob' | 'stay';
  disabled?: boolean;
}

function SplitDateInput({ label, value, onChange, required = false, yearType, disabled = false }: SplitDateInputProps) {
  // Parsing date values robustly (handling both - and / separators, plus year-only formats)
  const parsed = useMemo(() => {
    if (!value) return { day: '', month: '', year: '', isYearOnly: false };
    const cleanValue = value.trim();

    // Check for year only format: ../../YYYY or similar
    if (cleanValue.startsWith('../../') || cleanValue.startsWith('..\\..\\')) {
      const yearPart = cleanValue.replace(/\.\.\\\.\.\\|\.\./g, '').replace(/[\/|\\]/g, '');
      return {
        day: '',
        month: '',
        year: yearPart,
        isYearOnly: true
      };
    }

    const separator = cleanValue.includes('/') ? '/' : '-';
    const parts = cleanValue.split(separator);
    
    if (parts.length === 3) {
      // If it starts with a 4-digit number, assume YYYY-MM-DD
      if (parts[0].length === 4) {
        return {
          year: parts[0],
          month: String(parseInt(parts[1])).padStart(2, '0'),
          day: String(parseInt(parts[2])).padStart(2, '0'),
          isYearOnly: false
        };
      }
      // Otherwise assume DD-MM-YYYY
      return {
        year: parts[2],
        month: String(parseInt(parts[1])).padStart(2, '0'),
        day: String(parseInt(parts[0])).padStart(2, '0'),
        isYearOnly: false
      };
    }
    return { day: '', month: '', year: '', isYearOnly: false };
  }, [value]);

  const [localDay, setLocalDay] = useState(parsed.day || '');
  const [localMonth, setLocalMonth] = useState(parsed.month || '');
  const [localYear, setLocalYear] = useState(parsed.year || '');
  const [isYearOnly, setIsYearOnly] = useState(parsed.isYearOnly || false);

  // Synchronize when parent value changes
  useEffect(() => {
    setLocalDay(parsed.day || '');
    setLocalMonth(parsed.month || '');
    setLocalYear(parsed.year || '');
    setIsYearOnly(parsed.isYearOnly || false);
  }, [parsed]);

  // States for the interactive calendar popup
  const [showCalendar, setShowCalendar] = useState(false);
  const [navMonth, setNavMonth] = useState<number>(() => {
    const m = parseInt(parsed.month);
    return isNaN(m) ? new Date().getMonth() + 1 : m;
  });
  const [navYear, setNavYear] = useState<number>(() => {
    const y = parseInt(parsed.year);
    return isNaN(y) ? new Date().getFullYear() : y;
  });

  // Track calendar navigation state updates
  useEffect(() => {
    const m = parseInt(parsed.month);
    const y = parseInt(parsed.year);
    if (!isNaN(m)) setNavMonth(m);
    if (!isNaN(y)) setNavYear(y);
  }, [parsed.month, parsed.year]);

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const months = useMemo(() => ALGERIAN_MONTHS, []);
  
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (yearType === 'dob') {
      return Array.from({ length: 110 }, (_, i) => String(currentYear - i));
    } else {
      return Array.from({ length: 15 }, (_, i) => String(currentYear - 3 + i));
    }
  }, [yearType]);

  const handlePartChange = (part: 'day' | 'month' | 'year', partVal: string) => {
    const newDay = part === 'day' ? partVal : localDay;
    const newMonth = part === 'month' ? partVal : localMonth;
    const newYear = part === 'year' ? partVal : localYear;

    if (part === 'day') setLocalDay(partVal);
    if (part === 'month') setLocalMonth(partVal);
    if (part === 'year') setLocalYear(partVal);

    if (isYearOnly) {
      if (newYear) {
        onChange(`../../${newYear}`);
      } else {
        onChange('');
      }
    } else {
      if (newDay && newMonth && newYear) {
        const paddedDay = newDay.padStart(2, '0');
        const paddedMonth = newMonth.padStart(2, '0');
        onChange(`${newYear}-${paddedMonth}-${paddedDay}`);
      } else {
        onChange('');
      }
    }
  };

  const handleToggleYearOnly = (checked: boolean) => {
    setIsYearOnly(checked);
    if (checked) {
      if (localYear) {
        onChange(`../../${localYear}`);
      } else {
        onChange('');
      }
    } else {
      if (localDay && localMonth && localYear) {
        onChange(`${localYear}-${localMonth.padStart(2, '0')}-${localDay.padStart(2, '0')}`);
      } else {
        onChange('');
      }
    }
  };

  // Helper calculation for interactive grid
  const daysInMonth = useMemo(() => {
    return new Date(navYear, navMonth, 0).getDate();
  }, [navYear, navMonth]);

  // Sunday = 0, Monday = 1... Saturday = 6
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

  const selectDateFromGrid = (day: number) => {
    const paddedDay = String(day).padStart(2, '0');
    const paddedMonth = String(navMonth).padStart(2, '0');
    setLocalDay(paddedDay);
    setLocalMonth(paddedMonth);
    setLocalYear(String(navYear));
    setIsYearOnly(false);
    onChange(`${navYear}-${paddedMonth}-${paddedDay}`);
    setShowCalendar(false);
  };

  const selectYearOnlyFromModal = (year: string) => {
    setLocalYear(year);
    onChange(`../../${year}`);
    setIsYearOnly(true);
    setShowCalendar(false);
  };

  return (
    <div className={`space-y-1 font-sans relative ${showCalendar ? 'z-[160]' : 'z-10'} ${disabled ? 'opacity-60 select-none pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center gap-1">
        <label className="block text-slate-800 dark:text-slate-200 font-extrabold text-[10px]">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setShowCalendar(true)}
            className="flex items-center gap-1 px-1 py-0.5 text-[8px] font-black rounded bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-all border border-amber-500/30 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="فتح الرزنامة التفاعلية"
          >
            <Calendar className="w-2.5 h-2.5" />
            <span>الرزنامة</span>
          </button>
          {yearType === 'dob' && !disabled && (
            <label className="flex items-center gap-0.5 cursor-pointer text-[8px] text-amber-700 dark:text-amber-400 font-extrabold select-none">
              <input
                type="checkbox"
                checked={isYearOnly}
                onChange={(e) => handleToggleYearOnly(e.target.checked)}
                className="w-3 h-3 accent-[#cca43b] rounded cursor-pointer"
              />
              <span>سنة فقط</span>
            </label>
          )}
        </div>
      </div>

      {isYearOnly ? (
        <div className="relative">
          <select
            required={required && !disabled}
            disabled={disabled}
            value={localYear}
            onChange={(e) => handlePartChange('year', e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-[11px] font-bold appearance-none cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400"
          >
            <option value="">اختر سنة الميلاد فقط</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[8px]">▼</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1" dir="rtl">
          {/* اليوم */}
          <div className="relative">
            <select
              required={required && !disabled}
              disabled={disabled}
              value={localDay}
              onChange={(e) => handlePartChange('day', e.target.value)}
              className="w-full px-1.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-[11px] font-bold appearance-none cursor-pointer text-center disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400"
            >
              <option value="">اليوم</option>
              {days.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 text-[8px]">▼</div>
          </div>

          {/* الشهر */}
          <div className="relative">
            <select
              required={required && !disabled}
              disabled={disabled}
              value={localMonth}
              onChange={(e) => handlePartChange('month', e.target.value)}
              className="w-full px-1.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none transition-all bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-[11px] font-bold appearance-none cursor-pointer text-center disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400"
            >
              <option value="">الشهر</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 text-[8px]">▼</div>
          </div>

          {/* السنة */}
          <div className="relative">
            <select
              required={required && !disabled}
              disabled={disabled}
              value={localYear}
              onChange={(e) => handlePartChange('year', e.target.value)}
              className="w-full px-1.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none transition-all bg-[#ffffff] dark:bg-slate-950 text-slate-900 dark:text-white text-[11px] font-bold appearance-none cursor-pointer text-center disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400"
            >
              <option value="">السنة</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 text-[8px]">▼</div>
          </div>
        </div>
      )}

      {/* Interactive Month/Year Calendar Picker Contextual Popover (Non-blocking & Compact) */}
      {showCalendar && (
        <>
          {/* Transparent full-screen overlay to catch clicks outside of the calendar popover */}
          <div 
            className="fixed inset-0 z-[140] bg-transparent cursor-default" 
            onClick={() => setShowCalendar(false)} 
          />
          <div
            className="absolute right-0 top-full mt-1 z-[150] w-56 sm:w-60 bg-white dark:bg-slate-950 border border-[#cca43b] shadow-2xl rounded-xl text-right cursor-default select-none animate-in fade-in duration-100"
            dir="rtl"
          >
            {/* Popover Header - Ultra Compact */}
            <div className="bg-[#0b3c5d] dark:bg-[#1a1200] p-1.5 text-white border-b border-[#cca43b]/40 flex justify-between items-center select-none">
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[8.5px] font-black text-amber-400">الرزنامة الذكية</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                className="p-0.5 px-1 rounded bg-white/10 hover:bg-rose-600/25 hover:text-rose-400 transition-all text-white text-[8px] font-bold cursor-pointer"
                title="إغلاق"
              >
                ✕ اغلاق
              </button>
            </div>

            <div className="p-1.5 space-y-1.5">
              <div className="grid grid-cols-2 gap-1 text-right">
                {/* Month Dropdown */}
                <div className="col-span-1 space-y-0.5 text-right">
                  <span className="text-[8px] text-slate-400 font-extrabold block">الشهر:</span>
                  <div className="relative">
                    <select
                      value={String(navMonth).padStart(2, '0')}
                      onChange={(e) => setNavMonth(parseInt(e.target.value))}
                      className="w-full px-1 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded font-bold text-[9px] outline-none text-slate-900 dark:text-white appearance-none cursor-pointer"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 text-[8px]">▼</div>
                  </div>
                </div>

                {/* Year Dropdown */}
                <div className="col-span-1 space-y-0.5 text-right">
                  <span className="text-[8px] text-slate-400 font-extrabold block">السنة:</span>
                  <div className="relative">
                    <select
                      value={String(navYear)}
                      onChange={(e) => setNavYear(parseInt(e.target.value))}
                      className="w-full px-1 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded font-bold text-[9px] outline-none text-slate-900 dark:text-white appearance-none cursor-pointer"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 text-[8px]">▼</div>
                  </div>
                </div>
              </div>

              {/* Month navigation header */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-1 rounded border border-[#cca43b]/10">
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-0.5 px-1 text-[8px] font-black rounded bg-white dark:bg-slate-950 border border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-sans flex items-center gap-0.5 cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <ChevronRight className="w-2.5 h-2.5" />
                  <span>التالي</span>
                </button>
                
                <span className="text-[8.5px] font-black text-slate-800 dark:text-slate-200 font-sans">
                  {months.find(m => parseInt(m.value) === navMonth)?.label || navMonth} - {navYear}
                </span>

                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-0.5 px-1 text-[8px] font-black rounded bg-white dark:bg-slate-950 border border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-sans flex items-center gap-0.5 cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <span>السابق</span>
                  <ChevronLeft className="w-2.5 h-2.5 text-slate-700" />
                </button>
              </div>

              {/* Grid or confirm */}
              {isYearOnly ? (
                <div className="p-1 text-center space-y-1">
                  <p className="text-[8px] font-bold text-amber-700 dark:text-amber-400">
                    * مفعل: سنة الميلاد فقط
                  </p>
                  <button
                    type="button"
                    onClick={() => selectYearOnlyFromModal(String(navYear))}
                    className="py-1 px-3 bg-[#cca43b] hover:bg-[#b08b30] text-slate-950 font-black rounded text-[9px] transition-transform cursor-pointer"
                  >
                    تأكيد سنة {navYear} فقط
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-right">
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {weekDays.map(wd => (
                      <span key={wd} className="text-[7.5px] font-extrabold text-slate-400 py-0.5 bg-slate-50 dark:bg-slate-900/30 rounded">
                        {wd}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 text-center font-sans">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-0.5" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const isCurrentSelection = 
                        localDay && 
                        parseInt(localDay) === dayNum && 
                        localMonth && 
                        parseInt(localMonth) === navMonth && 
                        localYear && 
                        parseInt(localYear) === navYear;

                      return (
                        <button
                          key={`day-${dayNum}`}
                          type="button"
                          onClick={() => selectDateFromGrid(dayNum)}
                          className={`w-6 h-6 flex items-center justify-center text-[8.5px] font-extrabold rounded transition-all duration-150 cursor-pointer mx-auto ${
                            isCurrentSelection 
                              ? 'bg-[#cca43b] text-slate-950 font-black shadow-md scale-105'
                              : 'hover:bg-amber-500/20 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface GuestFormProps {
  initialData: Guest | null;
  guests: Guest[];
  roomStatuses: Record<string, RoomStatusValue>;
  onUpdateRoomStatus: (roomId: string, status: RoomStatusValue) => void;
  onAddGuest: (guest: Guest) => void;
  onUpdateGuest: (guest: Guest) => void;
  onNavigateToRegistry: () => void;
  onNavigateToRooms?: () => void;
  onFormActiveStateChange?: (active: boolean) => void;
  isRoomPanelOpen?: boolean;
  setIsRoomPanelOpen?: (open: boolean) => void;
  selectedRoomGlobal?: string | null;
  setSelectedRoomGlobal?: (roomId: string | null) => void;
  onPrintGuest?: (guest: Guest) => void;
  pageConfigs?: any;
  hotelSettings?: any;
}

const COMMON_ALGERIAN_NAMES: Record<string, string> = {
  'محمد': 'MOHAMED',
  'أحمد': 'AHMED',
  'احمد': 'AHMED',
  'علي': 'ALI',
  'مصطفى': 'MUSTAPHA',
  'مصطفي': 'MUSTAPHA',
  'عمر': 'OMAR',
  'سعيد': 'SAID',
  'رشيد': 'RACHID',
  'بن': 'BEN',
  'بلقاسم': 'BELKACEM',
  'عبد': 'ABD',
  'يوسف': 'YOUCEF',
  'إبراهيم': 'IBRAHIM',
  'ابراهيم': 'IBRAHIM',
  'سليمان': 'SLIMANE',
  'بلال': 'BILAL',
  'حمزة': 'HAMZA',
  'خالد': 'KHALED',
  'عبد القادر': 'ABDELKADER',
  'عبدالقادر': 'ABDELKADER',
  'الطيب': 'TAYEB',
  'صلاح': 'SALAH',
  'نور الدين': 'NOUREDINE',
  'نورالدين': 'NOUREDINE',
  'جمال': 'DJAMEL',
  'بشير': 'BACHIR',
  'أمين': 'AMINE',
  'امين': 'AMINE',
  'ياسين': 'YASSINE',
  'سفيان': 'SOFIANE',
  'عبد الله': 'ABDELLAH',
  'عبدالله': 'ABDELLAH',
  'فاروق': 'FAROUK',
  'رياض': 'RIAD',
  'رضوان': 'REDOUANE',
  'طارق': 'TAREK',
  'كريم': 'KARIM',
  'مراد': 'MOURAD',
  'حكيم': 'HAKIM',
  'سامي': 'SAMI',
  'سليم': 'SELIM',
  'عبد الرحمن': 'ABDERRAHMANE',
  'عبدالرحمن': 'ABDERRAHMANE',
  'فارس': 'FARES',
  'منير': 'MOUNIR',
  'عبد الحميد': 'ABDELHAMID',
  'عبدالحميد': 'ABDELHAMID',
  'كمال': 'KAMEL',
  'عادل': 'ADEL',
  'عيسى': 'ISSA',
  'موسى': 'MOUSSA',
  'زينب': 'ZEYNEB',
  'فاطمة': 'FATIMA',
  'عائشة': 'AISHA',
  'مريم': 'MERIEM',
  'خديجة': 'KHADIDJA',
  'سارة': 'SARA',
  'ياسمين': 'YASMINE',
  'ليلى': 'LEYLA',
  'امينة': 'AMINA',
  'أمينة': 'AMINA',
  'أسماء': 'ASMA',
  'اسماء': 'ASMA',
  'إيمان': 'IMENE',
  'ايمان': 'IMENE',
};

const ARABIC_CHAR_MAP: Record<string, string> = {
  'ا': 'A', 'أ': 'A', 'إ': 'I', 'آ': 'A', 'ب': 'B', 'ت': 'T', 'ث': 'TH', 'ج': 'DJ', 'ح': 'H', 'خ': 'KH',
  'د': 'D', 'ذ': 'DH', 'ر': 'R', 'ز': 'Z', 'س': 'S', 'ش': 'CH', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z',
  'ع': 'A', 'غ': 'GH', 'ف': 'F', 'ق': 'K', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H', 'و': 'OU',
  'ي': 'Y', 'ى': 'A', 'ء': 'A', 'ئ': 'Y', 'ؤ': 'OU', 'ة': 'A', ' ': ' '
};

function transliterateArabicToEnglish(arabicText: string): string {
  if (!arabicText) return '';
  const trimmed = arabicText.trim();
  const words = trimmed.split(/\s+/);
  const resultWords = words.map(word => {
    if (COMMON_ALGERIAN_NAMES[word]) {
      return COMMON_ALGERIAN_NAMES[word];
    }
    let transliteratedWord = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const mapped = ARABIC_CHAR_MAP[char];
      if (mapped !== undefined) {
        transliteratedWord += mapped;
      }
    }
    return transliteratedWord || word;
  });
  return resultWords.join(' ').toUpperCase();
}

export default function GuestForm({ 
  initialData, 
  guests, 
  roomStatuses, 
  onUpdateRoomStatus, 
  onAddGuest, 
  onUpdateGuest, 
  onNavigateToRegistry, 
  onNavigateToRooms,
  onFormActiveStateChange,
  isRoomPanelOpen: isRoomPanelOpenProp,
  setIsRoomPanelOpen: setIsRoomPanelOpenProp,
  selectedRoomGlobal,
  setSelectedRoomGlobal,
  onPrintGuest,
  pageConfigs,
  hotelSettings: hotelSettingsProp
}: GuestFormProps) {
  const hotelSettings = hotelSettingsProp || loadHotelSettings();
  
  const isPageEnabled = (pageId: string): boolean => {
    const enabled = hotelSettings?.enabledPages || ['rooms', 'registry', 'form', 'notes', 'profiles', 'settings'];
    return enabled.includes(pageId);
  };
  
  const configNationality = pageConfigs?.form?.defaultNationality || 'جزائرية';
  const configIdType = pageConfigs?.form?.defaultIdType || 'بطاقة تعريف وطنية';
  const configClassification = pageConfigs?.form?.defaultClassification || 'النزيل الأول';

  const [formData, setFormData] = useState<Omit<Guest, 'id' | 'timestamp'>>({
    roomNumber: initialData?.roomNumber || '',
    idType: configIdType,
    idNumber: '',
    firstNameAr: '',
    lastNameAr: '',
    firstNameEn: '',
    lastNameEn: '',
    dob: '',
    pob: '',
    fatherName: '',
    motherFullName: '',
    checkInDate: getLocalDateString(),
    checkOutDate: '',
    notes: hotelSettings?.defaultPoliceNotesAr || '',
    nationality: configNationality,
    roomClassification: configClassification,
    checkoutConfirmed: false,
    phoneNumber: ''
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [shouldPrintOnSubmit, setShouldPrintOnSubmit] = useState(false);
  const shouldPrintRef = useRef(false);

  useEffect(() => {
    if (!formWarning) return;
    const timer = setTimeout(() => setFormWarning(null), 5000);
    return () => clearTimeout(timer);
  }, [formWarning]);
  const [autofilledAlert, setAutofilledAlert] = useState(false);
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'vacant' | 'occupied' | 'full'>('all');
  const [showRoomMap, setShowRoomMap] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('guest_form_show_room_map');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // Room Rental Classification and Hourly/Nap States
  const [checkInTime, setCheckInTime] = useState<string>(() => {
    if (initialData?.checkInTime) return initialData.checkInTime;
    if (initialData?.timestamp) {
      const d = new Date(initialData.timestamp);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  const activeGlobalPricingMode = 'daily';

  const pricingMode = 'daily';

  const [baseRate, setBaseRate] = useState<number>(() => {
    if (initialData?.baseRate !== undefined) return initialData.baseRate;
    return hotelSettings?.defaultRatePerNight || 7000;
  });

  const [extraBreakfast, setExtraBreakfast] = useState<boolean>(false);
  const [extraDinner, setExtraDinner] = useState<boolean>(false);
  const [extraParking, setExtraParking] = useState<boolean>(false);
  const [extraLaundry, setExtraLaundry] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customPaidAmount, setCustomPaidAmount] = useState<number | null>(0);
  const [isIndefiniteStay, setIsIndefiniteStay] = useState<boolean>(false);
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, number>>(() => {
    if (initialData?.selectedPeriods) return initialData.selectedPeriods;
    return {};
  });

  const stayDurationHours = 3;

  const calculatedNights = useMemo(() => {
    if (isIndefiniteStay) {
      const pAmt = customPaidAmount !== null ? customPaidAmount : 0;
      
      const getServicePrice = (keywords: string[], defaultPrice: number) => {
        if (!hotelSettings?.customPopularServices) return defaultPrice;
        const found = hotelSettings.customPopularServices.find(s => 
          keywords.some(kw => s.name.toLowerCase().includes(kw.toLowerCase()))
        );
        return found ? found.amount : defaultPrice;
      };

      const breakfastPrice = getServicePrice(['فطور', 'breakfast'], 500);
      const dinnerPrice = getServicePrice(['عشاء', 'dinner'], 1200);
      const parkingPrice = getServicePrice(['موقف', 'parking'], 400);
      const laundryPrice = getServicePrice(['غسيل', 'laundry'], 600);

      const singleNightRate = baseRate + 
        (extraBreakfast ? breakfastPrice : 0) + 
        (extraDinner ? dinnerPrice : 0) + 
        (extraParking ? parkingPrice : 0);

      const flatExtras = (extraLaundry ? laundryPrice : 0);
      const discount = discountAmount || 0;

      let computedPaidDays = 0;
      if (singleNightRate > 0) {
        computedPaidDays = Math.floor((pAmt - flatExtras + discount) / singleNightRate);
      }
      return Math.max(1, computedPaidDays);
    }
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    return calculateNights(formData.checkInDate, formData.checkOutDate, formData.isLateCheckout, hotelSettings, checkInTime, formData.checkoutConfirmed);
  }, [formData.checkInDate, formData.checkOutDate, formData.isLateCheckout, hotelSettings, isIndefiniteStay, customPaidAmount, baseRate, extraBreakfast, extraDinner, extraParking, extraLaundry, discountAmount, formData.checkoutConfirmed]);

  // Live calculation of Delay and Penalties based on Check-In and Checkout Time
  const delayCalculation = useMemo(() => {
    let expectedCheckOutMillis = Date.now();
    let checkInStart = Date.now();
    if (formData.checkInDate && checkInTime) {
      try {
        checkInStart = new Date(`${formData.checkInDate}T${checkInTime}`).getTime();
        if (isNaN(checkInStart)) {
          checkInStart = initialData?.timestamp || Date.now();
        }
      } catch {
        checkInStart = initialData?.timestamp || Date.now();
      }
    }

    if ((pricingMode as string) === 'hourly') {
      expectedCheckOutMillis = checkInStart + (stayDurationHours * 60 * 60 * 1000);
    } else {
      let checkoutDateStr = isIndefiniteStay 
        ? addDaysToDateString(formData.checkInDate, calculatedNights)
        : (formData.checkOutDate || getLocalDateString());
      
      const todayStr = getLocalDateString();
      if (checkoutDateStr < todayStr) {
        checkoutDateStr = todayStr;
      }

      const endTimeStr = hotelSettings?.defaultCheckOutTime || "12:00";
      try {
        expectedCheckOutMillis = new Date(`${checkoutDateStr}T${endTimeStr}`).getTime();
        if (isNaN(expectedCheckOutMillis)) {
          expectedCheckOutMillis = checkInStart + (24 * 60 * 60 * 1000);
        } else if (expectedCheckOutMillis <= checkInStart) {
          expectedCheckOutMillis += (24 * 60 * 60 * 1000);
        }
      } catch {
        expectedCheckOutMillis = checkInStart + (24 * 60 * 60 * 1000);
      }
    }

    const actualOutMillis = formData.checkoutConfirmed 
      ? (formData.actualCheckOutDate ? new Date(formData.actualCheckOutDate).getTime() : Date.now())
      : Date.now();

    const diffMillis = actualOutMillis - expectedCheckOutMillis;
    const diffMinutes = Math.max(0, Math.floor(diffMillis / (60 * 1000)));

    const margin = 30; // 30 minutes grace margin
    const isLate = diffMinutes > margin;

    let penaltyFee = 0;
    let isNewPeriod = false;
    if (formData.checkoutConfirmed && isLate) {
      const delayHours = Math.ceil(diffMinutes / 60);
      penaltyFee = delayHours * (hotelSettings?.hourlyRate || 500);
    }

    const outD = new Date(expectedCheckOutMillis);
    const outY = outD.getFullYear();
    const outM = String(outD.getMonth() + 1).padStart(2, '0');
    const outDay = String(outD.getDate()).padStart(2, '0');
    const expectedCheckOutDate = `${outY}-${outM}-${outDay}`;

    return {
      expectedCheckOutTime: new Date(expectedCheckOutMillis).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      expectedCheckOutDate,
      actualCheckOutTime: new Date(actualOutMillis).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      delayMinutes: diffMinutes,
      isLate: formData.checkoutConfirmed ? isLate : false,
      penaltyFee,
      isNewPeriod,
    };
  }, [pricingMode, stayDurationHours, initialData, formData.actualCheckOutDate, formData.checkOutDate, formData.checkoutConfirmed, hotelSettings, checkInTime, formData.checkInDate, isIndefiniteStay, calculatedNights]);

  // Synchronize baseRate based on selected room type when roomNumber changes
  useEffect(() => {
    if (formData.roomNumber) {
      const roomsList = hotelSettings?.customHotelRooms || HOTEL_ROOMS;
      const room = roomsList.find(r => r.id === formData.roomNumber);
      if (room) {
        if (room.dailyRate !== undefined && room.dailyRate > 0) {
          setBaseRate(room.dailyRate);
        } else {
          const type = room.type;
          if (type === 'غرفة فردية') {
            setBaseRate(5000);
          } else if (type === 'غرفة ممتازة' || type === 'جناح مميز' || type === 'جناح') {
            setBaseRate(10000);
          } else {
            setBaseRate(hotelSettings?.defaultRatePerNight || 7000);
          }
        }
      } else {
        setBaseRate(hotelSettings?.defaultRatePerNight || 7000);
      }
    }
  }, [formData.roomNumber, hotelSettings]);

  // Synchronize isIndefiniteStay with checkout date presence
  useEffect(() => {
    if (pricingMode === 'daily') {
      if (!formData.checkOutDate) {
        setIsIndefiniteStay(true);
      } else {
        setIsIndefiniteStay(false);
      }
    } else {
      setIsIndefiniteStay(false);
    }
  }, [formData.checkOutDate, pricingMode]);

  // Auto-detect late checkout when checkout date changes
  useEffect(() => {
    if (isIndefiniteStay) {
      setFormData(prev => ({ ...prev, isLateCheckout: false }));
      return;
    }
    if (formData.checkOutDate) {
      try {
        const today = new Date();
        const isToday = formData.checkOutDate === getLocalDateString(today);
        if (isToday) {
          const currentHour = today.getHours();
          const currentMin = today.getMinutes();
          if (currentHour > 12 || (currentHour === 12 && currentMin >= 30)) {
            setFormData(prev => ({ ...prev, isLateCheckout: true }));
            return;
          }
        }
      } catch (e) {
        console.error('Error auto-detecting late checkout in guest form:', e);
      }
    }
    setFormData(prev => ({ ...prev, isLateCheckout: false }));
  }, [formData.checkOutDate, isIndefiniteStay]);



  const stayPricingBreakdown = useMemo(() => {
    let baseStayCost = baseRate;
    const nights = calculatedNights;

    if (selectedPeriods && Object.values(selectedPeriods as Record<string, number>).some((count: number) => count > 0)) {
      let periodSum = 0;
      const periods = hotelSettings?.rentalPeriods || [
        { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
        { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
        { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
      ];
      Object.entries(selectedPeriods as Record<string, number>).forEach(([pid, count]) => {
        const pInfo = periods.find(p => p.id === pid) || { defaultPrice: 2000 };
        periodSum += (count as number) * pInfo.defaultPrice;
      });
      baseStayCost = periodSum;
    } else if (pricingMode === 'daily') {
      baseStayCost = (nights || 1) * baseRate;
    } else {
      baseStayCost = stayDurationHours * baseRate;
    }

    const delayPenalty = delayCalculation.penaltyFee || 0;

    // dynamic lookup of extra rates from settings
    const getServicePrice = (keywords: string[], defaultPrice: number) => {
      if (!hotelSettings?.customPopularServices) return defaultPrice;
      const found = hotelSettings.customPopularServices.find(s => 
        keywords.some(kw => s.name.toLowerCase().includes(kw.toLowerCase()))
      );
      return found ? found.amount : defaultPrice;
    };

    const breakfastPrice = getServicePrice(['فطور', 'breakfast'], 500);
    const dinnerPrice = getServicePrice(['عشاء', 'dinner'], 1200);
    const parkingPrice = getServicePrice(['موقف', 'parking'], 400);
    const laundryPrice = getServicePrice(['غسيل', 'laundry'], 600);

    let extrasCost = 0;
    const stayCount = pricingMode === 'daily' ? (nights || 1) : 1;
    if (extraBreakfast) extrasCost += stayCount * breakfastPrice;
    if (extraDinner) extrasCost += stayCount * dinnerPrice;
    if (extraParking) extrasCost += stayCount * parkingPrice;
    if (extraLaundry) extrasCost += laundryPrice; // flat rate

    const grossTotal = baseStayCost + extrasCost + delayPenalty;
    const netTotal = Math.max(0, grossTotal - discountAmount);

    return {
      nights,
      baseStayCost,
      extrasCost,
      delayPenalty,
      grossTotal,
      netTotal
    };
  }, [calculatedNights, baseRate, pricingMode, stayDurationHours, extraBreakfast, extraParking, extraDinner, extraLaundry, discountAmount, delayCalculation, hotelSettings, selectedPeriods]);
  
  const computedPeriodCheckout = useMemo(() => {
    const hasPeriods = selectedPeriods && Object.values(selectedPeriods as Record<string, number>).some((count: number) => count > 0);
    if (!hasPeriods) return null;
    const checkInDate = formData.checkInDate || getLocalDateString();
    const inTime = checkInTime || '08:00';
    return calculatePeriodCheckout(checkInDate, inTime, selectedPeriods as Record<string, number>, hotelSettings?.rentalPeriods);
  }, [formData.checkInDate, checkInTime, selectedPeriods, hotelSettings]);
  
  const [isRoomPanelOpenLocal, setIsRoomPanelOpenLocal] = useState(false);
  const isRoomPanelOpen = isRoomPanelOpenProp !== undefined ? isRoomPanelOpenProp : isRoomPanelOpenLocal;
  const setIsRoomPanelOpen = setIsRoomPanelOpenProp !== undefined ? setIsRoomPanelOpenProp : setIsRoomPanelOpenLocal;

  // Ensure new guest registrations start with an empty assigned room field
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      if (initialData?.roomNumber) {
        setFormData(prev => ({ ...prev, roomNumber: initialData.roomNumber }));
      }
      return;
    }
    if (selectedRoomGlobal) {
      setFormData(prev => {
        if (prev.roomNumber === selectedRoomGlobal) return prev;
        return { ...prev, roomNumber: selectedRoomGlobal };
      });
    }
  }, [selectedRoomGlobal, initialData]);

  // Sync state back to parent when form room selection changes
  useEffect(() => {
    if (formData.roomNumber && setSelectedRoomGlobal) {
      if (selectedRoomGlobal !== formData.roomNumber) {
        setSelectedRoomGlobal(formData.roomNumber);
      }
    }
  }, [formData.roomNumber, selectedRoomGlobal, setSelectedRoomGlobal]);
  const [statusEditingRoomId, setStatusEditingRoomId] = useState<string | null>(null);

  // Live validation states
  const [validationErrors, setValidationErrors] = useState({
    firstNameAr: '',
    lastNameAr: '',
    firstNameEn: '',
    lastNameEn: ''
  });

  // Arabic regex verification helper (checks if contains non-Arabic characters)
  const isInvalidArabic = (str: string) => {
    if (!str) return false;
    // Allow spaces but check if it has latin letters
    return /[a-zA-Z]/.test(str);
  };

  // English regex verification helper (checks if contains Arabic/other non-english letters)
  const isInvalidEnglish = (str: string) => {
    if (!str) return false;
    // Check if contains Arabic characters
    return /[\u0600-\u06FF]/.test(str);
  };

  // Keep track of the last initialized guest ID to avoid resetting state on unrelated parent renders
  const lastInitializedIdRef = useRef<string | null>(null);
  const hasInitializedNewFormRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialData) {
      if (lastInitializedIdRef.current === initialData.id) {
        return; // Already initialized for this editing session, skip
      }
      lastInitializedIdRef.current = initialData.id || null;
      hasInitializedNewFormRef.current = false;

      setFormData({
        ...initialData,
        nationality: initialData.nationality || configNationality,
        roomClassification: initialData.roomClassification || 'النزيل الأول',
        checkoutConfirmed: initialData.checkoutConfirmed || false,
        isLateCheckout: initialData.isLateCheckout || false,
        phoneNumber: initialData.phoneNumber || ''
      });
      const d = new Date(initialData.timestamp || Date.now());
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setCheckInTime(`${h}:${m}`);
      setBaseRate(initialData.baseRate !== undefined ? initialData.baseRate : (hotelSettings?.defaultRatePerNight || 7000));
      setCustomPaidAmount(initialData.paidAmount !== undefined ? initialData.paidAmount : null);
      setIsIndefiniteStay(!!initialData.isIndefiniteStay);
    } else {
      if (hasInitializedNewFormRef.current) {
        return; // Already initialized for new guest session, skip
      }
      hasInitializedNewFormRef.current = true;
      lastInitializedIdRef.current = null;

      setFormData(prev => ({
        ...prev,
        roomNumber: initialData?.roomNumber || '',
        idType: configIdType,
        idNumber: '',
        firstNameAr: '',
        lastNameAr: '',
        firstNameEn: '',
        lastNameEn: '',
        dob: '',
        pob: '',
        fatherName: '',
        motherFullName: '',
        checkInDate: getLocalDateString(),
        checkOutDate: '',
        notes: hotelSettings?.defaultPoliceNotesAr || '',
        nationality: configNationality,
        roomClassification: 'النزيل الأول',
        checkoutConfirmed: false,
        isLateCheckout: false,
        phoneNumber: ''
      }));
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setCheckInTime(`${h}:${m}`);
      setBaseRate(hotelSettings?.defaultRatePerNight || 7000);
      setCustomPaidAmount(0);
      setIsIndefiniteStay(false);
    }
  }, [initialData, configNationality, configIdType, hotelSettings, activeGlobalPricingMode]);

  // Automatically choose default classification based on active occupant count
  useEffect(() => {
    if (initialData) return;
    const activeOccupants = guests.filter(g => g.roomNumber === formData.roomNumber && !(g.checkOutDate && g.checkoutConfirmed));
    setFormData(prev => ({
      ...prev,
      roomClassification: getClassForCount(activeOccupants.length)
    }));
  }, [formData.roomNumber, guests, initialData]);

  // Check if the user has inputted any significant details
  const hasData = useMemo(() => {
    return !!(
      formData.idNumber.trim() ||
      formData.firstNameAr.trim() ||
      formData.lastNameAr.trim() ||
      formData.firstNameEn.trim() ||
      formData.lastNameEn.trim() ||
      formData.dob.trim() ||
      formData.pob.trim() ||
      formData.fatherName.trim() ||
      formData.motherFullName.trim() ||
      formData.notes.trim()
    );
  }, [
    formData.idNumber,
    formData.firstNameAr,
    formData.lastNameAr,
    formData.firstNameEn,
    formData.lastNameEn,
    formData.dob,
    formData.pob,
    formData.fatherName,
    formData.motherFullName,
    formData.notes
  ]);

  // Track if any field is actively dirty or filled
  useEffect(() => {
    if (onFormActiveStateChange) {
      onFormActiveStateChange(hasData);
    }
  }, [hasData, onFormActiveStateChange]);

  // Scan for automatic matching guest when idType or idNumber changes (autofill feature)
  useEffect(() => {
    if (initialData) return;
    if (pageConfigs?.form?.autoFillLastNames === false) return;
    const num = formData.idNumber.trim();
    const type = formData.idType;
    if (num && type && guests && guests.length > 0) {
      // Find latest registered matching guest
      const match = [...guests]
        .sort((a, b) => b.timestamp - a.timestamp)
        .find(g => g.idType === type && g.idNumber.trim() === num);
        
      if (match) {
        setFormData(prev => ({
          ...prev,
          firstNameAr: match.firstNameAr || '',
          lastNameAr: match.lastNameAr || '',
          firstNameEn: match.firstNameEn || '',
          lastNameEn: match.lastNameEn || '',
          dob: match.dob || '',
          pob: match.pob || '',
          fatherName: match.fatherName || '',
          motherFullName: match.motherFullName || '',
          nationality: match.nationality || 'جزائرية'
        }));
        setAutofilledAlert(true);
        setTimeout(() => setAutofilledAlert(false), 5000);
      }
    }
  }, [formData.idType, formData.idNumber, guests, initialData]);

  // Handle inputs and validate on-the-fly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Real-time error state update
    if (name === 'firstNameAr') {
      setValidationErrors(prev => ({
        ...prev,
        firstNameAr: isInvalidArabic(value) ? 'تنبيه: يجب كتابة الاسم الأول باللغة العربية فقط.' : ''
      }));
    } else if (name === 'lastNameAr') {
      setValidationErrors(prev => ({
        ...prev,
        lastNameAr: isInvalidArabic(value) ? 'تنبيه: يجب كتابة اللقب باللغة العربية فقط.' : ''
      }));
    } else if (name === 'firstNameEn') {
      setValidationErrors(prev => ({
        ...prev,
        firstNameEn: isInvalidEnglish(value) ? 'Warning: First Name must be written in English characters only.' : ''
      }));
    } else if (name === 'lastNameEn') {
      setValidationErrors(prev => ({
        ...prev,
        lastNameEn: isInvalidEnglish(value) ? 'Warning: Last Name must be written in English characters only.' : ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that a room is assigned to the guest
    if (!formData.roomNumber || !formData.roomNumber.trim()) {
      setFormWarning("يرجى تحديد رقم الغرفة المسندة للنزيل لمتابعة التسجيل.");
      return;
    }
    
    // Validate checkout date is not in the past
    const todayStr = getLocalDateString();
    if (!isIndefiniteStay && !formData.checkoutConfirmed && formData.checkOutDate && formData.checkOutDate < todayStr) {
      setFormWarning("الرجاء تصحيح تاريخ المغادرة: لا يمكن أن يكون تاريخ المغادرة أقل من تاريخ اليوم الحاضر.");
      return;
    }

    // Block submission if severe alphabetic mixups occur
    const requireEnglish = pageConfigs?.form?.requireFullEnglishNames !== false;
    if (
      isInvalidArabic(formData.firstNameAr) || 
      isInvalidArabic(formData.lastNameAr) || 
      (requireEnglish && isInvalidEnglish(formData.firstNameEn)) || 
      (requireEnglish && isInvalidEnglish(formData.lastNameEn))
    ) {
      setFormWarning("الرجاء تصحيح الأخطاء اللغوية في حقول الأسماء قبل الحفظ لضمان سلامة السجلات.");
      return;
    }

    let finalTimestamp = Date.now();
    if (formData.checkInDate && checkInTime) {
      try {
        finalTimestamp = new Date(`${formData.checkInDate}T${checkInTime}`).getTime();
        if (isNaN(finalTimestamp)) {
          finalTimestamp = initialData?.timestamp || Date.now();
        }
      } catch {
        finalTimestamp = initialData?.timestamp || Date.now();
      }
    }

    const finalPaidAmount = customPaidAmount !== null ? customPaidAmount : (initialData && typeof initialData.paidAmount === 'number' ? initialData.paidAmount : stayPricingBreakdown.netTotal);

    const finalRate = baseRate || hotelSettings?.defaultRatePerNight || 7000;
    let finalPaidDays = initialData?.paidDays;
    
    const bookedNights = pricingMode === 'daily' && !isIndefiniteStay && formData.checkOutDate
      ? calculateNights(formData.checkInDate, formData.checkOutDate, formData.isLateCheckout, hotelSettings, checkInTime, formData.checkoutConfirmed)
      : 1;

    if (pricingMode === 'daily') {
      const isFullPayment = finalPaidAmount >= stayPricingBreakdown.netTotal || Math.abs(finalPaidAmount - stayPricingBreakdown.netTotal) < 10;
      
      if (isFullPayment) {
        finalPaidDays = bookedNights;
      } else {
        // If it's a partial payment, how many nights does it cover?
        const getServicePrice = (keywords: string[], defaultPrice: number) => {
          if (!hotelSettings?.customPopularServices) return defaultPrice;
          const found = hotelSettings.customPopularServices.find(s => 
            keywords.some(kw => s.name.toLowerCase().includes(kw.toLowerCase()))
          );
          return found ? found.amount : defaultPrice;
        };

        const breakfastPrice = getServicePrice(['فطور', 'breakfast'], 500);
        const dinnerPrice = getServicePrice(['عشاء', 'dinner'], 1200);
        const parkingPrice = getServicePrice(['موقف', 'parking'], 400);
        const laundryPrice = getServicePrice(['غسيل', 'laundry'], 600);

        const singleNightRate = finalRate + 
          (extraBreakfast ? breakfastPrice : 0) + 
          (extraDinner ? dinnerPrice : 0) + 
          (extraParking ? parkingPrice : 0);

        const flatExtras = (extraLaundry ? laundryPrice : 0);
        const discount = discountAmount || 0;

        let computedPaidDays = 0;
        if (singleNightRate > 0) {
          computedPaidDays = Math.floor((finalPaidAmount - flatExtras + discount) / singleNightRate);
        }
        
        finalPaidDays = !isIndefiniteStay ? Math.min(bookedNights, computedPaidDays) : computedPaidDays;
      }

      // Ensure it is at least 0 (or at least 1 if they paid a positive amount)
      if (finalPaidAmount > 0 && finalPaidDays <= 0) {
        finalPaidDays = 1;
      }
    } else {
      finalPaidDays = 0;
    }

    let finalCheckOutDate = formData.checkOutDate || "";
    let finalExpectedCheckOutDate = isIndefiniteStay ? delayCalculation.expectedCheckOutDate : undefined;

    const hasPeriodsSelected = selectedPeriods && Object.values(selectedPeriods as Record<string, number>).some((count: number) => count > 0);

    if (hasPeriodsSelected) {
      const periodCheckout = calculatePeriodCheckout(formData.checkInDate || getLocalDateString(), checkInTime, selectedPeriods as Record<string, number>, hotelSettings?.rentalPeriods);
      finalCheckOutDate = periodCheckout.checkOutDate;
      finalExpectedCheckOutDate = periodCheckout.checkOutDate;
    }

    const calculatedIsPaid = hasPeriodsSelected
      ? finalPaidAmount >= stayPricingBreakdown.netTotal
      : pricingMode === 'daily' 
        ? (finalPaidDays !== undefined ? finalPaidDays >= (isIndefiniteStay ? getRequiredPaidNights(formData.checkInDate, hotelSettings, checkInTime) : bookedNights) : formData.isPaid)
        : formData.isPaid;

    const guestToSave: Guest = initialData
      ? { 
          ...initialData, 
          ...formData,
          selectedPeriods: selectedPeriods as Record<string, number>,
          isPaid: calculatedIsPaid,
          isIndefiniteStay,
          checkOutDate: hasPeriodsSelected ? finalCheckOutDate : (isIndefiniteStay ? "" : (((pricingMode as string) === 'hourly' ? delayCalculation.expectedCheckOutDate : (formData.checkOutDate || "")))),
          expectedCheckOutDate: hasPeriodsSelected ? finalExpectedCheckOutDate : (isIndefiniteStay ? delayCalculation.expectedCheckOutDate : undefined),
          timestamp: finalTimestamp,
          checkInTime,
          pricingMode,
          roomRateType: 'room',
          baseRate,
          stayDurationHours,
          paidAmount: finalPaidAmount,
          paidDays: finalPaidDays,
          calculatedRentalPrice: stayPricingBreakdown.baseStayCost,
          delayDurationMinutes: delayCalculation.delayMinutes,
          delayPenaltyPaid: delayCalculation.penaltyFee,
          actualCheckOutDate: formData.checkoutConfirmed ? new Date().toISOString() : undefined
        }
      : {
          ...formData,
          selectedPeriods: selectedPeriods as Record<string, number>,
          isPaid: calculatedIsPaid,
          isIndefiniteStay,
          checkOutDate: hasPeriodsSelected ? finalCheckOutDate : (isIndefiniteStay ? "" : (((pricingMode as string) === 'hourly' ? delayCalculation.expectedCheckOutDate : (formData.checkOutDate || "")))),
          expectedCheckOutDate: hasPeriodsSelected ? finalExpectedCheckOutDate : (isIndefiniteStay ? delayCalculation.expectedCheckOutDate : undefined),
          pricingMode,
          roomRateType: 'room',
          baseRate,
          stayDurationHours,
          paidAmount: finalPaidAmount,
          paidDays: finalPaidDays,
          paymentHistory: [
            {
              id: generateId(),
              timestamp: Date.now(),
              amount: finalPaidAmount,
              paymentMethod: 'نقدي',
              notes: 'الدفعة الأولى عند التسجيل'
            }
          ],
          calculatedRentalPrice: stayPricingBreakdown.baseStayCost,
          delayDurationMinutes: delayCalculation.delayMinutes,
          delayPenaltyPaid: delayCalculation.penaltyFee,
          actualCheckOutDate: formData.checkoutConfirmed ? new Date().toISOString() : undefined,
          id: generateId(),
          timestamp: finalTimestamp,
          checkInTime
        };

    if (initialData) {
      onUpdateGuest(guestToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      onAddGuest(guestToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      // Keep guest data in formData as requested until the receptionist explicitly refreshes the page
    }

    const printRequested = shouldPrintRef.current || shouldPrintOnSubmit;
    shouldPrintRef.current = false;
    setShouldPrintOnSubmit(false);

    if (printRequested && onPrintGuest) {
      onPrintGuest(guestToSave);
    }
  };

  const HOTEL_ROOMS_DYNAMIC = useMemo(() => {
    return getHotelRooms(hotelSettings);
  }, [hotelSettings]);

  const activeGuestsByRoom = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    HOTEL_ROOMS_DYNAMIC.forEach(r => {
      map[r.id] = [];
    });
    guests.forEach(g => {
      if (g.roomNumber && !(g.checkOutDate && g.checkoutConfirmed)) {
        if (!map[g.roomNumber]) {
          map[g.roomNumber] = [];
        }
        map[g.roomNumber].push(g);
      }
    });
    return map;
  }, [HOTEL_ROOMS_DYNAMIC, guests]);

  const filteredRooms = useMemo(() => {
    return HOTEL_ROOMS_DYNAMIC.filter(r => {
      const count = activeGuestsByRoom[r.id]?.length || 0;
      if (capacityFilter === 'vacant' && count !== 0) return false;
      if (capacityFilter === 'occupied' && (count === 0 || count === 6)) return false;
      if (capacityFilter === 'full' && count !== 6) return false;
      return true;
    });
  }, [HOTEL_ROOMS_DYNAMIC, capacityFilter, activeGuestsByRoom]);

  const vacantRoomsCount = useMemo(() => {
    return HOTEL_ROOMS_DYNAMIC.filter(r => (activeGuestsByRoom[r.id]?.length || 0) === 0).length;
  }, [HOTEL_ROOMS_DYNAMIC, activeGuestsByRoom]);

  const occupiedRoomsCount = useMemo(() => {
    return HOTEL_ROOMS_DYNAMIC.filter(r => {
      const c = activeGuestsByRoom[r.id]?.length || 0;
      return c > 0 && c < 6;
    }).length;
  }, [HOTEL_ROOMS_DYNAMIC, activeGuestsByRoom]);

  const fullRoomsCount = useMemo(() => {
    return HOTEL_ROOMS_DYNAMIC.filter(r => (activeGuestsByRoom[r.id]?.length || 0) === 6).length;
  }, [HOTEL_ROOMS_DYNAMIC, activeGuestsByRoom]);

  const selectedRoomObj = useMemo(() => {
    return HOTEL_ROOMS_DYNAMIC.find(r => r.id === formData.roomNumber);
  }, [HOTEL_ROOMS_DYNAMIC, formData.roomNumber]);

  const guestsInSelectedRoom = useMemo(() => {
    return activeGuestsByRoom[formData.roomNumber] || [];
  }, [formData.roomNumber, activeGuestsByRoom]);

  const classifiedRooms = useMemo(() => {
    const ready: (typeof HOTEL_ROOMS_DYNAMIC[0] & { count: number; status: RoomStatusValue })[] = [];
    const reserved: (typeof HOTEL_ROOMS_DYNAMIC[0] & { count: number; status: RoomStatusValue })[] = [];
    const dirty: (typeof HOTEL_ROOMS_DYNAMIC[0] & { count: number; status: RoomStatusValue })[] = [];
    const outOfOrder: (typeof HOTEL_ROOMS_DYNAMIC[0] & { count: number; status: RoomStatusValue })[] = [];
    const occupied: (typeof HOTEL_ROOMS_DYNAMIC[0] & { count: number; status: RoomStatusValue })[] = [];

    HOTEL_ROOMS_DYNAMIC.forEach(room => {
      const count = activeGuestsByRoom[room.id]?.length || 0;
      const status = getEffectiveRoomStatus(room.id, count, roomStatuses);

      const rWithMeta = { ...room, count, status };

      if (status === 'out_of_order') {
        outOfOrder.push(rWithMeta);
      } else if (status === 'dirty') {
        dirty.push(rWithMeta);
      } else if (status === 'reserved') {
        reserved.push(rWithMeta);
      } else if (count > 0) {
        occupied.push(rWithMeta);
      } else {
        ready.push(rWithMeta);
      }
    });

    return { ready, reserved, dirty, outOfOrder, occupied };
  }, [activeGuestsByRoom, roomStatuses]);

  const roomsByFloor = useMemo(() => {
    const map: Record<string, (typeof HOTEL_ROOMS_DYNAMIC[0] & { count: number; status: RoomStatusValue })[]> = {};
    HOTEL_ROOMS_DYNAMIC.forEach(room => {
      const fName = room.floorName || `الطابق ${room.floor || '1'}`;
      if (!map[fName]) {
        map[fName] = [];
      }
      const count = activeGuestsByRoom[room.id]?.length || 0;
      const status = getEffectiveRoomStatus(room.id, count, roomStatuses);
      map[fName].push({ ...room, count, status });
    });
    return map;
  }, [HOTEL_ROOMS_DYNAMIC, activeGuestsByRoom, roomStatuses]);

  const currentRoomStatusInfo = useMemo(() => {
    if (!formData.roomNumber) return null;
    const count = activeGuestsByRoom[formData.roomNumber]?.length || 0;
    const status = getEffectiveRoomStatus(formData.roomNumber, count, roomStatuses);
    
    let colorClass = 'bg-slate-400';
    let text = 'غير معروف';
    let emoji = '';
    
    if (status === 'out_of_order') {
      colorClass = 'bg-rose-500';
      text = 'معطلة / خارج الخدمة';
      emoji = '';
    } else if (status === 'dirty') {
      colorClass = 'bg-orange-500';
      text = 'غير نظيفة / صيانة';
      emoji = '';
    } else if (status === 'reserved') {
      colorClass = 'bg-purple-500';
      text = 'محجوزة مسبقاً';
      emoji = '';
    } else if (count > 1) {
      colorClass = 'bg-blue-500';
      text = `إقامة مشتركة (${count} نزلاء)`;
      emoji = '';
    } else if (count === 1) {
      colorClass = 'bg-amber-500';
      text = 'إقامة فردية (نزيل واحد)';
      emoji = '';
    } else {
      colorClass = 'bg-emerald-500';
      text = 'جاهزة وشاغرة';
      emoji = '';
    }
    
    return { colorClass, text, emoji };
  }, [formData.roomNumber, activeGuestsByRoom, roomStatuses]);

  return (
    <div className="max-w-[1500px] mx-auto w-full flex flex-col lg:h-[calc(100vh-40px)] lg:max-h-[calc(100vh-40px)] lg:overflow-hidden items-stretch relative z-10 animate-in fade-in duration-500" dir="rtl">
      
      {/* Hidden button for triggering preview and print from top header bar */}
      {onPrintGuest && (
        <button 
          id="btn-preview-print-only"
          type="button"
          className="hidden"
          onClick={() => {
            const finalRate = baseRate || hotelSettings?.defaultRatePerNight || 7000;
            const printingObj: Guest = {
              id: initialData?.id || 'temp-print-id',
              timestamp: initialData?.timestamp || Date.now(),
              ...formData,
              checkInTime,
              pricingMode,
              baseRate: finalRate,
              selectedPeriods: selectedPeriods as Record<string, number>,
              paidAmount: customPaidAmount !== null ? customPaidAmount : (initialData?.paidAmount ?? stayPricingBreakdown.netTotal),
              calculatedRentalPrice: stayPricingBreakdown.baseStayCost,
              paidDays: initialData?.paidDays,
              isIndefiniteStay,
            };
            onPrintGuest(printingObj);
          }}
        />
      )}

      {/* Main Stacked scrollable area matching computer height */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 lg:p-3.5 space-y-3">
        
        {/* Form Container */}
        <div className="w-full glass-panel border border-slate-200/80 dark:border-slate-800 shadow-lg rounded-xl overflow-visible shrink-0">
          <form id="guest-registration-form" onSubmit={handleSubmit} className="p-3 space-y-3" autoComplete="off">
            {formWarning && (
              <div className="bg-amber-500/10 border border-amber-500/40 text-amber-950 dark:text-amber-200 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{formWarning}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormWarning(null)}
                  className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            {/* Section 1: Compact Room & ID Details */}
            <div className="bg-[#0b3c5d]/5 dark:bg-[#cca43b]/5 p-2.5 rounded-xl border border-[#cca43b]/20 space-y-2">
              
              {/* Selected Room Details Panel */}
              {selectedRoomObj && (
                <div className="bg-[#0b3c5d]/5 dark:bg-slate-950/20 border border-[#0B3C5D]/15 dark:border-[#cca43b]/15 p-2 rounded-lg animate-in fade-in duration-300 text-[11px]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="bg-gradient-to-br from-[#0B3C5D] to-[#024d38] text-white p-1 rounded border border-[#cca43b]/30 shadow shrink-0">
                        <Bed className="w-3 h-3 text-amber-400" />
                      </div>
                      <div>
                        <span className="font-black text-[#0B3C5D] dark:text-amber-400">
                          الغرفة المعينة: رقم {selectedRoomObj.id}
                        </span>
                        <span className="mx-1.5 text-slate-350 text-[10px]">|</span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold">السعة القصوى للغرفة: 6 أشخاص بالغين</span>
                      </div>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-900/40 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-black">الإشغال الأمني الفعلى:</span>
                      <span className="font-extrabold text-[#0B3C5D] dark:text-amber-400">{guestsInSelectedRoom.length} / 6 بالغين مقيمين</span>
                    </div>
                  </div>

                  {guestsInSelectedRoom.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#cca43b]/10 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-amber-900 dark:text-amber-400 font-bold">النزلاء الحاليين:</span>
                      {guestsInSelectedRoom.map((occupant, idx) => (
                        <span key={`${occupant.id || idx}-${idx}`} className="bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px] font-black flex items-center gap-1 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 text-[8px] font-bold">سرير {idx + 1}</span>
                          <span>{occupant.firstNameAr} {occupant.lastNameAr}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Standard inputs for room selection */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-0.5 font-sans">
                <div className="space-y-1.5">
                  <div className="flex flex-col gap-1">
                    <label className={`block border-2 rounded-lg py-1.5 px-3 text-center font-black text-[11px] transition-all ${
                      !(formData.roomNumber || '').trim() 
                        ? 'animate-frame-blink' 
                        : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40'
                    }`}>
                      رقم الغرفة المسندة
                    </label>
                    {currentRoomStatusInfo && (
                      <span className="inline-flex items-center justify-center gap-1 text-[8px] font-black shrink-0 bg-white/50 dark:bg-slate-900/40 px-1 py-0.2 rounded border border-slate-200/50 dark:border-slate-800/50 self-center">
                        <span className={`w-1.5 h-1.5 rounded-full ${currentRoomStatusInfo.colorClass} ${['bg-blue-500'].includes(currentRoomStatusInfo.colorClass) ? 'animate-pulse' : ''}`} />
                        <span className="text-slate-500 dark:text-slate-450">{currentRoomStatusInfo.text}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <select 
                      required
                      name="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleInputChange}
                      className={`w-full px-2 py-1.5 border rounded-lg focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white dark:bg-slate-950 font-bold text-xs cursor-pointer text-slate-800 dark:text-slate-200 appearance-none pl-6 text-right ${
                        !(formData.roomNumber || '').trim() 
                          ? 'animate-input-warning border-rose-500 text-rose-700 dark:text-rose-300' 
                          : 'border-indigo-100 dark:border-slate-800'
                      }`}
                    >
                      <option value="" disabled className="text-slate-400 font-bold bg-white dark:bg-slate-950">
                        -- حدد رقم الغرفة للنزيل --
                      </option>
                      {classifiedRooms.ready.length === 0 && classifiedRooms.occupied.length === 0 && (
                        <option value="">لا توجد غرف متاحة</option>
                      )}
                      {classifiedRooms.ready.map(r => (
                        <option key={`opt-ready-${r.id}`} value={r.id} className="bg-emerald-500/10 text-emerald-950 font-black dark:bg-[#0C1424]">
                          غرفة جاهزة {r.id} ({r.type})
                        </option>
                      ))}
                      {classifiedRooms.occupied.map(r => {
                        if (r.count === 1) {
                          return (
                            <option key={`opt-occ-${r.id}`} value={r.id} className="bg-amber-400/10 text-amber-950 font-medium dark:bg-[#0C1424]">
                              إقامة فردية {r.id} ({r.type}) - نزيل واحد مقيم
                            </option>
                          );
                        } else {
                          return (
                            <option key={`opt-occ-${r.id}`} value={r.id} className="bg-blue-400/10 text-blue-950 font-medium dark:bg-[#0C1424]">
                              إقامة مشتركة {r.id} ({r.type}) - {r.count} نزلاء مقيمين
                            </option>
                          );
                        }
                      })}
                      {classifiedRooms.reserved.map(r => (
                        <option key={`opt-res-${r.id}`} value={r.id} className="bg-blue-400/10 text-blue-950 font-medium dark:bg-[#0C1424]">
                          محجوزة مسبقاً {r.id} ({r.type})
                        </option>
                      ))}
                      {classifiedRooms.dirty.map(r => (
                        <option key={`opt-dirty-${r.id}`} value={r.id} className="bg-amber-600/10 text-slate-855 dark:bg-[#0C1424]">
                          غرفة غير نظيفة {r.id} ({r.type})
                        </option>
                      ))}
                      {classifiedRooms.outOfOrder.map(r => (
                        <option key={`opt-ooo-${r.id}`} value={r.id} className="bg-slate-600/10 text-slate-500 dark:bg-[#0C1424]">
                          معطلة / صيانة {r.id} ({r.type})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-500/70 dark:text-indigo-400/70 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="block text-slate-800 dark:text-slate-200 font-extrabold text-[10px]">
                    تصنيف النزيل بالغرفة
                  </label>
                  <div className="relative">
                    <select 
                      required
                      name="roomClassification"
                      value={formData.roomClassification || 'النزيل الأول'}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-indigo-100 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white dark:bg-slate-950 font-bold text-xs cursor-pointer text-slate-800 dark:text-slate-200 appearance-none pl-6 text-center"
                    >
                      <option value="النزيل الأول">النزيل الأول</option>
                      <option value="النزيل الثاني">النزيل الثاني</option>
                      <option value="النزيل الثالث">النزيل الثالث</option>
                      <option value="النزيل الرابع">النزيل الرابع</option>
                      <option value="النزيل الخامس">النزيل الخامس</option>
                      <option value="النزيل السادس">النزيل السادس</option>
                      <option value="النزيل السابع">النزيل السابع</option>
                      <option value="النزيل الثامن">النزيل الثامن</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-500/70 dark:text-indigo-400/70 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`block border-2 rounded-lg py-1.5 px-3 text-center font-black text-[11px] transition-all ${
                    !(formData.idNumber || '').trim() 
                      ? 'animate-frame-blink' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40'
                  }`}>
                    نوع وثيقة التعريف
                  </label>
                  <div className="relative">
                    <select 
                      required
                      name="idType"
                      value={formData.idType}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-indigo-100 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white dark:bg-slate-950 font-bold text-xs cursor-pointer text-slate-800 dark:text-slate-200 appearance-none pl-6 text-center"
                    >
                      <option value="بطاقة تعريف وطنية">بطاقة تعريف وطنية</option>
                      <option value="جواز سفر">جواز سفر</option>
                      <option value="رخصة سياقة">رخصة سياقة</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-500/70 dark:text-indigo-400/70 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={`block border-2 rounded-lg py-1.5 px-3 text-center font-black text-[11px] transition-all ${
                    !(formData.idNumber || '').trim() 
                      ? 'animate-frame-blink' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40'
                  }`}>
                    رقم وثيقة الهوية
                  </label>
                  <input 
                    required
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1 border rounded-lg focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white dark:bg-slate-950 font-mono text-center text-xs font-bold ${!(formData.idNumber || '').trim() ? 'animate-input-warning text-rose-700 dark:text-rose-300' : 'border-indigo-100 dark:border-slate-800 text-slate-900 dark:text-slate-100'}`}
                    placeholder="رقم الوثيقة وبيانات الهوية"
                    autoComplete="new-password"
                  />
                </div>

                <div className="col-span-2 md:col-span-1 space-y-0.5">
                  <label className="block text-slate-800 dark:text-slate-200 font-extrabold text-[10px]">
                    رقم الهاتف {pageConfigs?.form?.requirePhoneNumber ? '' : '(اختياري)'}
                  </label>
                  <input 
                    required={!!pageConfigs?.form?.requirePhoneNumber}
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1 border border-indigo-100 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white dark:bg-slate-950 font-mono text-center text-xs font-bold text-slate-900 dark:text-slate-100"
                    placeholder="رقم الهاتف"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {autofilledAlert && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-955 dark:text-emerald-100 border border-emerald-200/50 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 leading-none select-none">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-extrabold text-emerald-900">ملء تلقائي:</span>
                    <span> تم العثور على سجلات مطابقة لهذا النزيل وتم توفير باقي وثائقه بنجاح.</span>
                  </div>
                </div>
              )}
            </div>



          {/* Section 2: Personal Info */}
          <div className="space-y-2">
            
            <div className={pageConfigs?.form?.requireFullEnglishNames !== false ? "grid grid-cols-1 md:grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
              {/* Arabic Info Panel */}
              <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5 font-sans">
                    <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px]">اللقب (بالعربية)</label>
                    <input 
                      required
                      name="lastNameAr"
                      value={formData.lastNameAr}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs"
                      placeholder="اللقب العربي"
                      dir="rtl"
                      autoComplete="new-password"
                    />
                    {validationErrors.lastNameAr && (
                      <p className="text-[9px] text-red-650 dark:text-red-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        {validationErrors.lastNameAr}
                      </p>
                    )}
                  </div>

                  <div className="space-y-0.5 font-sans">
                    <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px]">الاسم (بالعربية)</label>
                    <input 
                      required
                      name="firstNameAr"
                      value={formData.firstNameAr}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs"
                      placeholder="الاسم العربي"
                      dir="rtl"
                      autoComplete="new-password"
                    />
                    {validationErrors.firstNameAr && (
                      <p className="text-[9px] text-red-650 dark:text-red-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        {validationErrors.firstNameAr}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* English Info Panel */}
              {pageConfigs?.form?.requireFullEnglishNames !== false && (
              <div className="bg-slate-50/50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 font-sans">
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px] text-right" dir="rtl">اللقب (بالإنجليزي)</label>
                    <input 
                      required={pageConfigs?.form?.requireFullEnglishNames !== false}
                      name="lastNameEn"
                      value={formData.lastNameEn}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/15 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs text-left uppercase"
                      placeholder="اللقب بالإنجليزي"
                      dir="ltr"
                      autoComplete="new-password"
                    />
                    {validationErrors.lastNameEn && (
                      <p className="text-[9px] text-red-650 dark:text-red-400 font-bold flex items-center gap-1 text-right" dir="rtl">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                        {validationErrors.lastNameEn}
                      </p>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px] text-right" dir="rtl">الاسم (بالإنجليزي)</label>
                    <input 
                      required={pageConfigs?.form?.requireFullEnglishNames !== false}
                      name="firstNameEn"
                      value={formData.firstNameEn}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/15 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs text-left uppercase"
                      placeholder="الاسم بالإنجليزي"
                      dir="ltr"
                      autoComplete="new-password"
                    />
                    {validationErrors.firstNameEn && (
                      <p className="text-[9px] text-red-650 dark:text-red-400 font-bold flex items-center gap-1 text-right" dir="rtl">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                        {validationErrors.firstNameEn}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Birth Details & Parents */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-slate-50/55 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-sans">
              <SplitDateInput
                label="تاريخ الميلاد"
                value={formData.dob}
                onChange={(val) => setFormData(prev => ({ ...prev, dob: val }))}
                required
                yearType="dob"
              />
              
              <div className="space-y-0.5 col-span-1">
                <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px]">مكان الميلاد</label>
                <input 
                  required
                  type="text"
                  name="pob"
                  value={formData.pob}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                  placeholder="بلدية / ولاية الميلاد"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-0.5 col-span-1">
                <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px] flex justify-between items-center">
                  <span>جنسية النزيل</span>
                  {formData.nationality && formData.nationality.trim() !== 'جزائرية' && (
                    <span className="text-[8px] font-black text-[#cca43b] bg-amber-505/10 px-1 py-0.5 rounded leading-none select-none">
                      أجنبي
                    </span>
                  )}
                </label>
                <input 
                  required
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className={`w-full px-2 py-1 border rounded-lg focus:ring-1 outline-none text-xs font-bold ${
                    formData.nationality && formData.nationality.trim() !== 'جزائرية'
                      ? 'border-amber-400 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white'
                  }`}
                  placeholder="جنسية النزيل"
                  autoComplete="new-password"
                />
              </div>

              {!hotelSettings?.optionalFatherAndMotherName && (
                <>
                  <div className="space-y-0.5 col-span-1">
                    <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px]">
                      اسم الأب
                    </label>
                    <input 
                      required
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                      placeholder="اسم الأب"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-0.5 col-span-1 md:col-span-1 lg:col-span-2">
                    <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px]">
                      اسم ولقب الأم الكامل
                    </label>
                    <input 
                      required
                      type="text"
                      name="motherFullName"
                      value={formData.motherFullName}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-[#cca43b]/15 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold"
                      placeholder="الاسم الكامل للأم ونسبها"
                      autoComplete="new-password"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 3: Check in/out & Notes */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <SplitDateInput
                label="تاريخ الدخول الجاري"
                value={formData.checkInDate}
                onChange={(val) => setFormData(prev => ({ ...prev, checkInDate: val }))}
                required
                yearType="stay"
              />

              <div className="space-y-0.5 col-span-1">
                <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px]">
                  ساعة الدخول الجاري
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                />
              </div>
              
              <div className="space-y-0.5">
                <SplitDateInput
                  label="تاريخ الخروج (اختياري)"
                  value={isIndefiniteStay ? '' : formData.checkOutDate}
                  onChange={(val) => {
                    const todayStr = getLocalDateString();
                    let finalVal = val;
                    if (val && val < todayStr) {
                      setFormWarning("تنبيه: لا يمكن تعيين تاريخ مغادرة في الماضي. تم ضبط التاريخ إلى اليوم.");
                      finalVal = todayStr;
                    }
                    setFormData(prev => ({ ...prev, checkOutDate: finalVal }));
                    if (finalVal) setIsIndefiniteStay(false);
                  }}
                  yearType="stay"
                  disabled={false}
                />
                




                {formData.checkOutDate && !isIndefiniteStay && (
                  <div className="pt-1 flex flex-col gap-1.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox"
                        id="isLateCheckout"
                        name="isLateCheckout"
                        checked={!!formData.isLateCheckout}
                        onChange={(e) => setFormData(prev => ({ ...prev, isLateCheckout: e.target.checked }))}
                        className="w-3.5 h-3.5 text-rose-600 border-slate-300 rounded cursor-pointer accent-rose-650 focus:ring-rose-500"
                      />
                      <label htmlFor="isLateCheckout" className="text-[10px] text-rose-700 dark:text-rose-400 font-black cursor-pointer select-none">
                        ⏳ تأخر في الخروج بعد الساعة 12:30 مساءً (+1 يوم إضافي)
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox"
                        id="checkoutConfirmed"
                        name="checkoutConfirmed"
                        checked={!!formData.checkoutConfirmed}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkoutConfirmed: e.target.checked }))}
                        className="w-3.5 h-3.5 text-emerald-600 dark:text-[#cca43b]/80 border-slate-300 rounded cursor-pointer"
                      />
                      <label htmlFor="checkoutConfirmed" className="text-[10px] text-[#024d38] dark:text-amber-450 font-black cursor-pointer select-none">
                        تأكيد مغادرة النزيل يدوياً (الخروج الفعلي)
                      </label>
                    </div>
                  </div>
                )}
              </div>


            </div>



            {pageConfigs?.form?.showNotesField !== false && (
              <div className="space-y-0.5">
                <label className="block text-slate-850 dark:text-slate-200 font-extrabold text-[10px] flex justify-between items-center">
                  <span>ملاحظات إرشادية وتدابير أمنية خاصة بالـشرطة</span>
                  <span className="text-[8px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/5 px-1.5 py-0.5 rounded border border-[#cca43b]/20">سري ومحمي</span>
                </label>
                <textarea 
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-amber-500/10 focus:border-[#cca43b] outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium"
                  placeholder="ملاحظات تفصيلية..."
                />
              </div>
            )}
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 text-slate-900 dark:text-amber-100 bg-[#024d38]/10 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20 animate-in fade-in py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-[10px]">
                <span className="font-extrabold block">تم خزن النزيل فندقياً بنجاح!</span>
              </div>
            </div>
          )}
        </form>
      </div>

    </div>
    </div>
  );
}
