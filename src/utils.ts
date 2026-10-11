import { Guest, AppNote, RoomStatusValue, StaffReminder, RentalPeriod, HotelSettings } from "./types";
import { persistLocalDatabase, getLocalStorageItem } from "./localDb";

export const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

export const saveGuests = (guests: Guest[]) => {
  persistLocalDatabase("hotel-palms-guests", "guests", guests);
};

const defaultGuests: Guest[] = [];

export const loadGuests = (): Guest[] => {
  const data = getLocalStorageItem("hotel-palms-guests");
  if (data) {
    try {
      const parsed = JSON.parse(data) as Guest[];
      const seen = new Set<string>();
      return parsed.filter(g => {
        const id = g.id || '';
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } catch (e) {
      return defaultGuests;
    }
  }
  return defaultGuests;
};

export const saveNotes = (notes: AppNote[]) => {
  persistLocalDatabase("hotel-palms-notes", "notes", notes);
};

export const loadNotes = (): AppNote[] => {
  const data = getLocalStorageItem("hotel-palms-notes");
  if (data) {
    try {
      const parsed = JSON.parse(data) as AppNote[];
      const seen = new Set<string>();
      return parsed.filter(n => {
        const id = n.id || '';
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } catch (e) {
      return [];
    }
  }
  return [];
};

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getAdjustedCheckInDate = (checkInDate: string, checkInTime?: string): string => {
  return checkInDate;
};

export const calculateNights = (
  checkInStr: string,
  checkOutStr?: string,
  isLateCheckout?: boolean,
  hotelSettings?: HotelSettings,
  checkInTime?: string,
  checkoutConfirmed?: boolean
): number => {
  if (!checkInStr) return 0;
  
  const parseLocalDate = (str: string): Date => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
      if (slashParts[0].length === 4) {
        return new Date(parseInt(slashParts[0], 10), parseInt(slashParts[1], 10) - 1, parseInt(slashParts[2], 10));
      } else {
        return new Date(parseInt(slashParts[2], 10), parseInt(slashParts[1], 10) - 1, parseInt(slashParts[0], 10));
      }
    }
    return new Date(str);
  };

  const adjustedCheckInStr = getAdjustedCheckInDate(checkInStr, checkInTime);
  const start = parseLocalDate(adjustedCheckInStr);
  
  // Use current local date, but force correct year-month-day elements
  const end = checkOutStr ? parseLocalDate(checkOutStr) : new Date();
  
  const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  const diffTime = d2.getTime() - d1.getTime();
  const calendarNights = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  
  const settings = hotelSettings || loadHotelSettings();
  
  let extraNightForPastCheckout = 0;
  if (checkoutConfirmed === false) {
    const todayStr = getLocalDateString();
    if (!checkOutStr || checkOutStr <= todayStr) {
      const defaultCheckoutTime = settings?.defaultCheckOutTime || "12:00";
      const [checkoutHour, checkoutMinute] = defaultCheckoutTime.split(':').map(Number);
      const now = new Date();
      const checkoutTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), checkoutHour, checkoutMinute, 0);
      if (now.getTime() > checkoutTimeToday.getTime()) {
        extraNightForPastCheckout = 1;
      }
    }
  }

  let nights = calendarNights + extraNightForPastCheckout;

  // Standard logic
  if (nights === 0) {
    nights = 1;
  }
  if (isLateCheckout) {
    nights += 1;
  }
  
  if (nights <= 0) {
    nights = 1;
  }
  
  return nights;
};

export const saveRoomStatuses = (statuses: Record<string, RoomStatusValue>) => {
  persistLocalDatabase("hotel-palms-room-statuses", "room_statuses", statuses);
};

export const loadRoomStatuses = (): Record<string, RoomStatusValue> => {
  const data = getLocalStorageItem("hotel-palms-room-statuses");
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return {};
};

export const saveStaffReminders = (reminders: StaffReminder[]) => {
  persistLocalDatabase("hotel-palms-staff-reminders", "reminders", reminders);
};

export const loadStaffReminders = (): StaffReminder[] => {
  const data = getLocalStorageItem("hotel-palms-staff-reminders");
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
};

export const defaultHotelSettings: HotelSettings = {
  hotelNameAr: "فندق أجاد",
  hotelNameEn: "HOTEL ADJAD",
  hotelSubtitle: "",
  hotelPhone: "0661770023",
  hotelEmail: "hoteladjad@gmail.com",
  hotelGreeting: "",
  defaultRatePerNight: 7000,
  defaultCheckInTime: "14:00",
  defaultCheckOutTime: "12:00",
  touristTaxRate: 0,
  enableSoundEffects: true,
  enableZelligeBackground: false,
  enableCalculatorAndPackages: false,
  roomsPerRowDesktop: 5,
  customPopularServices: [
    { name: 'فطور الصباح / Breakfast', amount: 500 },
    { name: 'وجبة غداء فاخرة / Lunch', amount: 1200 },
    { name: 'وجبة عشاء كامل ممتد / Dinner', amount: 1500 },
    { name: 'مواقف سيارات محروسة / Protected Parking', amount: 400 },
    { name: 'خدمة غسيل وكي ملابس / Laundry', amount: 600 }
  ],
  quickRatesPresets: [3000, 4000, 5000, 6000, 7500, 10000],
  hotelSecretCode: "5454",
  disableLoginFirewall: false,
  customHotelRooms: [
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
  ],
  floorConfigs: [
    {
      floorId: '1',
      floorName: 'الطابق الأول',
      roomsCount: 19,
      roomType: 'غرفة زوجية',
      startRoomNumber: 1,
      roomTypes: [
        { type: 'غرفة فردية', count: 6 },
        { type: 'غرفة زوجية', count: 11 },
        { type: 'غرفة ممتازة', count: 2 }
      ]
    }
  ],
  globalPricingMode: 'daily',
  enabledPages: ['rooms', 'registry', 'form', 'notes', 'profiles', 'settings'],
  hideCheckoutBtn: false,
  hideTransferBtn: false,
  hideEditGuestBtn: false,
  hideDeleteGuestBtn: false,
  hideQuickRegisterBtn: false,
  hideParliamentLayout: false,
  hideQuickRoomStatusEdit: false,
  hideNotesClearAction: false,
  hideStaffRemindersButton: false,
  hidePrintFormDirectly: false,
  optionalFatherAndMotherName: false,
  defaultPoliceNotesAr: " .............  لا شيئ يذكر",
  defaultReceptionStampTitle: "إمضاء وختم مسؤول الاستقبال",
  defaultPrintSize: 'a4_full_frame',
  enableCalculatedTaxes: false,
  customVatRate: 0,
  customStampDutyRate: 0,
  customStampDutyFixed: false,
  customStampDutyValue: 0,
  enableApprovedRentalCalculation: true,
  hideAccountingAddTransaction: false,
  hideAccountingDeleteTransaction: false,
  hideExtraServicesSelection: false,
  voiceAlertStyle: 'style1',
  voiceAlertGender: 'default',
  enableVoiceAlert: true,
  rentalPeriods: [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ]
};

export const replaceMarqadWithHotel = (settings: HotelSettings): HotelSettings => {
  if (!settings) return settings;
  const updated = { ...settings };
  if (typeof updated.hotelNameAr === 'string') {
    updated.hotelNameAr = updated.hotelNameAr.replace(/مرقد/g, 'فندق');
  }
  if (typeof updated.hotelSubtitle === 'string') {
    updated.hotelSubtitle = updated.hotelSubtitle.replace(/مرقد/g, 'فندق');
  }
  if (typeof updated.hotelGreeting === 'string') {
    updated.hotelGreeting = updated.hotelGreeting.replace(/مرقد/g, 'فندق');
  }
  return updated;
};

export const saveHotelSettings = (settings: HotelSettings) => {
  const cleaned = replaceMarqadWithHotel(settings);
  persistLocalDatabase("hotel-palms-hotel-settings", "hotel_settings", cleaned);
};

export const loadHotelSettings = (): HotelSettings => {
  const data = getLocalStorageItem("hotel-palms-hotel-settings");
  if (data) {
    try {
      const parsed = JSON.parse(data);
      const merged = { ...defaultHotelSettings, ...parsed };
      if (!parsed.hotelNameAr || parsed.hotelNameAr === "فندق" || parsed.hotelNameAr === "فندق النخيل") {
        merged.hotelNameAr = defaultHotelSettings.hotelNameAr;
      }
      if (!parsed.hotelNameEn || parsed.hotelNameEn === "Hotel" || parsed.hotelNameEn === "Hotel Palms" || parsed.hotelNameEn === "HOTEL OR SHRINE") {
        merged.hotelNameEn = defaultHotelSettings.hotelNameEn;
      }
      if (!parsed.hotelSubtitle || parsed.hotelSubtitle === "لوحة الاستقبال والتحكم الذكي" || parsed.hotelSubtitle === "للبهاء والضيافة والتراث الجزائري العظيم") {
        merged.hotelSubtitle = defaultHotelSettings.hotelSubtitle;
      }
      if (!parsed.hotelPhone || parsed.hotelPhone === "0555000000" || parsed.hotelPhone === "0550000000") {
        merged.hotelPhone = defaultHotelSettings.hotelPhone;
      }
      if (!parsed.hotelEmail || parsed.hotelEmail === "info@hotel.com" || parsed.hotelEmail === "info@hotel-or-inn.com") {
        merged.hotelEmail = defaultHotelSettings.hotelEmail;
      }
      if (parsed.defaultPoliceNotesAr === undefined || parsed.defaultPoliceNotesAr === "" || parsed.defaultPoliceNotesAr === null) {
        merged.defaultPoliceNotesAr = defaultHotelSettings.defaultPoliceNotesAr;
      }
      if (!parsed.customHotelRooms || parsed.customHotelRooms.length === 0 || parsed.customHotelRooms.length === 22 || (parsed.customHotelRooms.length === 22 && parsed.customHotelRooms[0]?.id === "101") || parsed.customHotelRooms.some((r: any) => Number(r.id) > 19 || (r.floor && r.floor !== '1'))) {
        merged.customHotelRooms = defaultHotelSettings.customHotelRooms;
      }
      if (!parsed.floorConfigs || parsed.floorConfigs.length === 0 || parsed.floorConfigs[0]?.roomsCount === 22 || (parsed.floorConfigs.length === 3 && parsed.floorConfigs[0]?.startRoomNumber === 101) || parsed.floorConfigs.length > 1 || parsed.floorConfigs.some((f: any) => f.floorId !== '1')) {
        merged.floorConfigs = defaultHotelSettings.floorConfigs;
      }
      if (!parsed.defaultPrintSize || parsed.defaultPrintSize === 'compact') {
        merged.defaultPrintSize = defaultHotelSettings.defaultPrintSize || 'a4_full_frame';
      }
      if (!parsed.defaultReceptionStampTitle || parsed.defaultReceptionStampTitle === "إمضاء وختم مسؤول الاستقبال والأمن") {
        merged.defaultReceptionStampTitle = defaultHotelSettings.defaultReceptionStampTitle;
      }
      return replaceMarqadWithHotel(merged);
    } catch (e) {
      return replaceMarqadWithHotel(defaultHotelSettings);
    }
  }
  return replaceMarqadWithHotel(defaultHotelSettings);
};

/**
 * Formats a date string representation to DD/MM/YYYY format.
 * Extremely safe and works for formats like YYYY-MM-DD or standard ISO strings.
 */
export const formatDateDMY = (dateStr: string | undefined | null): string => {
  if (!dateStr || dateStr.trim() === '') return '---';
  
  const trimmed = dateStr.trim();
  
  // Custom: If it starts with ../../ or is just a 4-digit number, return it directly
  if (trimmed.startsWith('../../') || /^\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  
  // If already in DD/MM/YYYY format, keep as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Pattern: YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  }

  // Try parsing generic ISO string or custom format via Date object
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {
    // Falls back to returning original trimmed value
  }
  
  return trimmed;
};

export const addDaysToDateString = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayPadded = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayPadded}`;
};

/**
 * Calculates the guest's detailed stay cost, taking into account any rate updates with starting dates.
 */
export const calculateGuestTotalCost = (
  guest: Guest,
  hotelSettings?: HotelSettings
): {
  totalCost: number;
  breakdown: Array<{ date: string; rate: number; reason?: string }>;
  totalNights: number;
} => {
  const settings = hotelSettings || loadHotelSettings();
  const pricingMode = settings?.globalPricingMode || guest.pricingMode || 'daily';
  
  let baseStayCost = 0;
  let totalNights = 0;
  const breakdown: Array<{ date: string; rate: number; reason?: string }> = [];

  const activePeriods = getGuestActivePeriods(guest, settings);
  if (Object.values(activePeriods).some(count => count > 0)) {
    const periods = settings?.rentalPeriods || [
      { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
      { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
      { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
    ];

    Object.entries(activePeriods).forEach(([pid, count]) => {
      if (count > 0) {
        const pInfo = periods.find(p => p.id === pid) || { name: `فترة ${pid}`, defaultPrice: 2000 };
        const price = pInfo.defaultPrice;
        baseStayCost += count * price;
        totalNights += count;
        breakdown.push({
          date: `${pInfo.name} (عدد ${count})`,
          rate: count * price,
          reason: `حساب الفترة: ${count} فترات × ${price} د.ج`
        });
      }
    });
  } else if (pricingMode === 'hourly') {
    const totalHours = (guest.stayDurationHours || 3) + (guest.extraPaidHours || 0);
    const hourlyRate = guest.baseRate || settings?.hourlyRate || 500;
    totalNights = totalHours;
    
    if (guest.ratePeriods && guest.ratePeriods.length > 0) {
      const sortedPeriods = [...guest.ratePeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));
      
      for (let h = 0; h < totalHours; h++) {
        let activeRate = hourlyRate;
        let activeReason = "السعر الساعي الأساسي";
        
        const checkInDate = guest.checkInDate || '';
        const parts = checkInDate.split('-');
        let hourDateStr = checkInDate;
        if (parts.length === 3) {
          const checkInTimeStr = guest.checkInTime || '12:00';
          const [checkInH, checkInM] = checkInTimeStr.split(':').map(Number);
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), checkInH || 12, checkInM || 0);
          d.setHours(d.getHours() + h);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          hourDateStr = `${y}-${m}-${day}`;
        }
        
        const period = [...sortedPeriods].reverse().find(p => {
          if (p.startDate.startsWith('hour-')) {
            const hIndex = parseInt(p.startDate.replace('hour-', ''), 10);
            return h >= hIndex;
          }
          return p.startDate <= hourDateStr;
        });
        
        if (period) {
          activeRate = period.rate;
          activeReason = period.reason || "سعر ساعي محدث";
        }
        
        baseStayCost += activeRate;
        breakdown.push({ date: `ساعة ${h + 1} (${hourDateStr})`, rate: activeRate, reason: activeReason });
      }
    } else {
      baseStayCost = totalHours * hourlyRate;
      for (let i = 0; i < totalHours; i++) {
        breakdown.push({
          date: `ساعة ${i + 1}`,
          rate: hourlyRate,
          reason: "السعر الساعي الأساسي"
        });
      }
    }
  } else {
    // Daily mode
    if (guest.checkInDate) {
      const activeCheckOutDate = guest.checkoutConfirmed ? (guest.checkOutDate || guest.checkInDate) : getLocalDateString();
      totalNights = calculateNights(guest.checkInDate, activeCheckOutDate, guest.isLateCheckout, settings, guest.checkInTime);
      if (totalNights < 1) totalNights = 1;
    } else {
      totalNights = 1;
    }
    
    const baseRate = guest.baseRate || settings?.defaultRatePerNight || 7000;
    const sortedPeriods = guest.ratePeriods 
      ? [...guest.ratePeriods].sort((a, b) => a.startDate.localeCompare(b.startDate))
      : [];
      
    for (let i = 0; i < totalNights; i++) {
      const adjustedCheckIn = getAdjustedCheckInDate(guest.checkInDate || '', guest.checkInTime);
      const nightDate = addDaysToDateString(adjustedCheckIn, i);
      
      const activePeriod = [...sortedPeriods].reverse().find(p => p.startDate <= nightDate);
      const activeRate = activePeriod ? activePeriod.rate : baseRate;
      const activeReason = activePeriod ? activePeriod.reason : "السعر الأساسي";
      
      baseStayCost += activeRate;
      breakdown.push({ date: nightDate, rate: activeRate, reason: activeReason });
    }
  }

  // Calculate Extra services cost
  const getServicePrice = (keywords: string[], defaultPrice: number) => {
    if (!settings?.customPopularServices) return defaultPrice;
    const found = settings.customPopularServices.find(s => 
      keywords.some(kw => s.name.toLowerCase().includes(kw.toLowerCase()))
    );
    return found ? found.amount : defaultPrice;
  };

  const breakfastPrice = getServicePrice(['فطور', 'breakfast'], 500);
  const dinnerPrice = getServicePrice(['عشاء', 'dinner'], 1200);
  const parkingPrice = getServicePrice(['موقف', 'parking'], 400);
  const laundryPrice = getServicePrice(['غسيل', 'laundry'], 600);

  let extrasCost = 0;
  const stayCount = pricingMode === 'daily' ? (totalNights || 1) : 1;
  if (guest.extraBreakfast) {
    extrasCost += stayCount * breakfastPrice;
    breakdown.push({ date: "خدمة الفطور الإضافية", rate: stayCount * breakfastPrice, reason: `فطور لـ ${stayCount} ليالي/أيام × ${breakfastPrice} د.ج` });
  }
  if (guest.extraDinner) {
    extrasCost += stayCount * dinnerPrice;
    breakdown.push({ date: "خدمة العشاء الإضافية", rate: stayCount * dinnerPrice, reason: `عشاء لـ ${stayCount} ليالي/أيام × ${dinnerPrice} د.ج` });
  }
  if (guest.extraParking) {
    extrasCost += stayCount * parkingPrice;
    breakdown.push({ date: "موقف السيارات الإضافي", rate: stayCount * parkingPrice, reason: `موقف لـ ${stayCount} ليالي/أيام × ${parkingPrice} د.ج` });
  }
  if (guest.extraLaundry) {
    extrasCost += laundryPrice;
    breakdown.push({ date: "مصبغة وغسيل الملابس", rate: laundryPrice, reason: `تكلفة غسيل مسطحة بقيمة ${laundryPrice} د.ج` });
  }

  const delayPenalty = guest.delayPenaltyPaid || 0;
  if (delayPenalty > 0) {
    breakdown.push({ date: "غرامة تأخير تسجيل المغادرة", rate: delayPenalty, reason: "غرامة مستحقة بسبب تخطي موعد المغادرة" });
  }

  const discountAmount = guest.discountAmount || 0;
  const grossTotal = baseStayCost + extrasCost + delayPenalty;
  const totalCost = Math.max(0, grossTotal - discountAmount);

  if (discountAmount > 0) {
    breakdown.push({ date: "تخفيض ممنوح", rate: -discountAmount, reason: `خصم بقيمة ${discountAmount} د.ج` });
  }

  return { totalCost, breakdown, totalNights };
};

export const getDaysDiff = (dateStr1: string, dateStr2: string): number => {
  if (!dateStr1 || !dateStr2) return 0;
  const parseLocalDate = (str: string): Date => {
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(str);
  };
  const d1 = parseLocalDate(dateStr1);
  const d2 = parseLocalDate(dateStr2);
  const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
};

export const getRequiredPaidNights = (checkInDate: string, hotelSettings?: HotelSettings, checkInTime?: string): number => {
  if (!checkInDate) return 1;
  const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, checkInTime);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  
  const daysPassed = getDaysDiff(adjustedCheckIn, todayStr);
  
  const settings = hotelSettings || loadHotelSettings();
  const [endH, endM] = (settings?.defaultCheckOutTime || "12:00").split(':').map(Number);
  const checkoutHourToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), isNaN(endH) ? 12 : endH, isNaN(endM) ? 0 : endM, 0, 0);
  
  // From the moment of check-in, paying the check-in night's dues is mandatory regardless of check-in time
  if (daysPassed <= 0) {
    return 1;
  }
  
  if (now.getTime() >= checkoutHourToday.getTime()) {
    return daysPassed + 1;
  } else {
    return daysPassed;
  }
};

/**
 * Helper to get the correct chronological end Date of a period, correctly handling cross-midnight periods.
 */
const getPeriodEnd = (current: Date, period: { startTime: string; endTime: string }): Date => {
  const [sh, sm] = period.startTime.split(':').map(Number);
  const [eh, em] = period.endTime.split(':').map(Number);
  
  const pStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), sh, sm, 0, 0);
  const pEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), eh, em, 0, 0);
  
  if (eh < sh || (eh === sh && em < sm)) {
    // Crosses midnight (e.g. 18:00 to 08:00 next day)
    // If the current time is after or equal to the start time, the end is on the next day.
    if (current.getTime() >= pStart.getTime()) {
      pEnd.setDate(pEnd.getDate() + 1);
    }
  } else {
    // Standard period (does not cross midnight, e.g. 08:00 to 12:00)
    // If we somehow moved past the end time or start is tomorrow, handle it correctly.
  }
  return pEnd;
};

/**
 * Predicts checkout date/time and millisecond timestamp based on active chronological period consumption.
 * Supports crossing midnight, customizable periods, and multiple days.
 */
export const calculatePeriodCheckout = (
  checkInDate: string,
  checkInTime: string,
  selectedPeriods: Record<string, number>,
  rentalPeriods?: RentalPeriod[]
): { checkOutDate: string; checkOutTime: string; expectedMillis: number } => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];

  const counts = { ...(selectedPeriods || {}) };
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  
  const defaultInTime = checkInTime || "08:00";
  const [inH, inM] = defaultInTime.split(':').map(Number);
  const parts = checkInDate.split('-');
  const startYear = parts.length === 3 ? parseInt(parts[0], 10) : new Date().getFullYear();
  const startMonth = parts.length === 3 ? parseInt(parts[1], 10) - 1 : new Date().getMonth();
  const startDay = parts.length === 3 ? parseInt(parts[2], 10) : new Date().getDate();

  let currentDate = new Date(startYear, startMonth, startDay, inH, inM, 0, 0);

  if (totalCount === 0) {
    currentDate.setHours(currentDate.getHours() + 4);
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    const t = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;
    return { checkOutDate: `${y}-${m}-${d}`, checkOutTime: t, expectedMillis: currentDate.getTime() };
  }

  let loops = 0;
  const remainingCounts = { ...counts };

  const hasRemaining = () => Object.values(remainingCounts).some(v => v > 0);

  while (hasRemaining() && loops < 100) {
    loops++;
    const hour = currentDate.getHours();
    const minute = currentDate.getMinutes();
    const currentTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    let activePeriod = sortedPeriods.find(p => {
      const start = p.startTime;
      const end = p.endTime;
      if (start < end) {
        return currentTimeStr >= start && currentTimeStr < end;
      } else {
        return currentTimeStr >= start || currentTimeStr < end;
      }
    });

    if (!activePeriod) {
      const nextPeriod = sortedPeriods.find(p => p.startTime > currentTimeStr) || sortedPeriods[0];
      const [sh, sm] = nextPeriod.startTime.split(':').map(Number);
      if (nextPeriod.startTime <= currentTimeStr) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      currentDate.setHours(sh, sm, 0, 0);
      activePeriod = nextPeriod;
    }

    // Advance to the end of the active period, correctly handling crossing midnight
    const periodEnd = getPeriodEnd(currentDate, activePeriod);

    // Safety guard to ensure currentDate always moves forward in time
    if (periodEnd.getTime() <= currentDate.getTime()) {
      periodEnd.setTime(currentDate.getTime() + 60 * 60 * 1000); // force advance by 1 hour
    }

    if (remainingCounts[activePeriod.id] > 0) {
      remainingCounts[activePeriod.id]--;
      currentDate = periodEnd;
    } else {
      currentDate = periodEnd;
      if (!hasRemaining()) {
        break;
      }
    }
  }

  const y = currentDate.getFullYear();
  const m = String(currentDate.getMonth() + 1).padStart(2, '0');
  const d = String(currentDate.getDate()).padStart(2, '0');
  const t = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;

  return {
    checkOutDate: `${y}-${m}-${d}`,
    checkOutTime: t,
    expectedMillis: currentDate.getTime()
  };
};

/**
 * Determines which rental period a check-in time belongs to, with a 1-hour grace margin preceding each period.
 */
export const getStartingPeriod = (
  checkInTimeStr: string,
  rentalPeriods?: RentalPeriod[]
): RentalPeriod => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];
  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const inTime = checkInTimeStr || '08:00';
  
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };
  const inM = timeToMinutes(inTime);

  for (const p of sortedPeriods) {
    const startM = timeToMinutes(p.startTime);
    const endM = timeToMinutes(p.endTime);
    // 1 hour preceding margin
    const precedingStartM = (startM - 60 + 1440) % 1440;

    if (startM < endM) {
      if (precedingStartM > startM) { // wrapped around midnight
        if (inM >= precedingStartM || inM < endM) return p;
      } else {
        if (inM >= precedingStartM && inM < endM) return p;
      }
    } else { // crosses midnight
      if (precedingStartM > startM) {
        if (inM >= precedingStartM || inM < endM) return p;
      } else {
        if (inM >= precedingStartM || inM < endM) return p;
      }
    }
  }

  // Fallback if no margin match
  for (const p of sortedPeriods) {
    const startM = timeToMinutes(p.startTime);
    const endM = timeToMinutes(p.endTime);
    if (startM < endM) {
      if (inM >= startM && inM < endM) return p;
    } else {
      if (inM >= startM || inM < endM) return p;
    }
  }

  return sortedPeriods[0];
};

/**
 * Automatically fills consecutive/intervening rental periods.
 */
export const getFilledPeriods = (
  checkInTime: string,
  selectedPeriods: Record<string, number>,
  rentalPeriods?: RentalPeriod[]
): Record<string, number> => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];

  const targetCounts = { ...(selectedPeriods || {}) };
  const totalTarget = Object.values(targetCounts).reduce((sum, val) => sum + val, 0);
  if (totalTarget === 0) {
    return {};
  }

  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const inTime = checkInTime || '08:00';

  // Use the 1-hour grace margin starting period!
  const startingPeriod = getStartingPeriod(inTime, sortedPeriods);
  let activePeriodIndex = sortedPeriods.findIndex(p => p.id === startingPeriod.id);
  if (activePeriodIndex === -1) activePeriodIndex = 0;

  const filledCounts: Record<string, number> = {};
  periods.forEach(p => {
    filledCounts[p.id] = 0;
  });

  const needed = { ...targetCounts };
  const isSatisfied = () => {
    return Object.keys(needed).every(id => filledCounts[id] >= (targetCounts[id] || 0));
  };

  let currentIndex = activePeriodIndex;
  let loops = 0;
  while (!isSatisfied() && loops < 1000) {
    loops++;
    const period = sortedPeriods[currentIndex];
    filledCounts[period.id]++;
    currentIndex = (currentIndex + 1) % sortedPeriods.length;
  }

  return filledCounts;
};

/**
 * Calculates the current contiguous sequence length N of a guest's stay.
 */
export const getSequentialLength = (
  checkInTime: string,
  selectedPeriods: Record<string, number>,
  rentalPeriods?: RentalPeriod[]
): number => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];
  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  const inTime = checkInTime || '08:00';
  const startPeriod = getStartingPeriod(inTime, sortedPeriods);
  const startIndex = sortedPeriods.findIndex(p => p.id === startPeriod?.id);
  
  const targetCounts = { ...(selectedPeriods || {}) };
  const totalTarget = Object.values(targetCounts).reduce((sum, val) => sum + val, 0);
  if (totalTarget === 0) return 0;
  
  const isSatisfied = (filled: Record<string, number>) => {
    return Object.keys(targetCounts).every(id => filled[id] >= (targetCounts[id] || 0));
  };
  
  let N = 0;
  const filledCounts: Record<string, number> = {};
  periods.forEach(p => { filledCounts[p.id] = 0; });
  
  let currentIndex = startIndex !== -1 ? startIndex : 0;
  while (!isSatisfied(filledCounts) && N < 1000) {
    const period = sortedPeriods[currentIndex];
    filledCounts[period.id]++;
    N++;
    currentIndex = (currentIndex + 1) % sortedPeriods.length;
  }
  return N;
};

/**
 * Calculates the new sequential length N when incrementing a specific period ID.
 */
export const getNextSequentialNForIncrement = (
  checkInTime: string,
  selectedPeriods: Record<string, number>,
  periodId: string,
  rentalPeriods?: RentalPeriod[]
): number => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];
  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const startPeriod = getStartingPeriod(checkInTime, sortedPeriods);
  const startIndex = sortedPeriods.findIndex(p => p.id === startPeriod?.id);
  const startIdx = startIndex !== -1 ? startIndex : 0;

  const currentN = getSequentialLength(checkInTime, selectedPeriods, sortedPeriods);

  // Search forward for the occurrence that would make the count of periodId equal to currentCount + 1
  let N = currentN;
  let loops = 0;
  while (loops < 1000) {
    loops++;
    const idx = (startIdx + N) % sortedPeriods.length;
    const p = sortedPeriods[idx];
    if (p.id === periodId) {
      return N + 1;
    }
    N++;
  }
  return currentN + 1;
};

/**
 * Calculates the new sequential length N when decrementing a specific period ID.
 */
export const getNextSequentialNForDecrement = (
  checkInTime: string,
  selectedPeriods: Record<string, number>,
  periodId: string,
  rentalPeriods?: RentalPeriod[]
): number => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];
  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const startPeriod = getStartingPeriod(checkInTime, sortedPeriods);
  const startIndex = sortedPeriods.findIndex(p => p.id === startPeriod?.id);
  const startIdx = startIndex !== -1 ? startIndex : 0;

  const currentN = getSequentialLength(checkInTime, selectedPeriods, sortedPeriods);
  if (currentN <= 0) return 0;

  // Search backward from the end of the sequence for the last occurrence of periodId
  for (let i = currentN - 1; i >= 0; i--) {
    const idx = (startIdx + i) % sortedPeriods.length;
    const p = sortedPeriods[idx];
    if (p.id === periodId) {
      return i; // setting N to i removes this occurrence
    }
  }
  return Math.max(0, currentN - 1);
};

/**
 * Generates the Record<string, number> representing period counts for a sequence of length N.
 */
export const getCountsForSequentialLength = (
  checkInTime: string,
  N: number,
  rentalPeriods?: RentalPeriod[]
): Record<string, number> => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];
  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const startPeriod = getStartingPeriod(checkInTime, sortedPeriods);
  const startIndex = sortedPeriods.findIndex(p => p.id === startPeriod?.id);
  const startIdx = startIndex !== -1 ? startIndex : 0;

  const counts: Record<string, number> = {};
  periods.forEach(p => { counts[p.id] = 0; });

  for (let i = 0; i < N; i++) {
    const p = sortedPeriods[(startIdx + i) % sortedPeriods.length];
    counts[p.id]++;
  }
  return counts;
};

/**
 * Calculates consumed periods based on elapsed stay duration.
 */
export const getConsumedPeriods = (
  checkInDate: string,
  checkInTime: string,
  endMillis: number,
  rentalPeriods?: RentalPeriod[]
): Record<string, number> => {
  const periods = rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];

  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const inTime = checkInTime || '08:00';
  const [inH, inM] = inTime.split(':').map(Number);
  const parts = checkInDate.split('-');
  const startYear = parts.length === 3 ? parseInt(parts[0], 10) : new Date().getFullYear();
  const startMonth = parts.length === 3 ? parseInt(parts[1], 10) - 1 : new Date().getMonth();
  const startDay = parts.length === 3 ? parseInt(parts[2], 10) : new Date().getDate();

  let currentDate = new Date(startYear, startMonth, startDay, inH, inM, 0, 0);
  const targetTime = endMillis;

  const consumed: Record<string, number> = {};
  periods.forEach(p => {
    consumed[p.id] = 0;
  });

  if (targetTime <= currentDate.getTime()) {
    let activePeriodIndex = sortedPeriods.findIndex(p => {
      const start = p.startTime;
      const end = p.endTime;
      if (start < end) {
        return inTime >= start && inTime < end;
      } else {
        return inTime >= start || inTime < end;
      }
    });
    if (activePeriodIndex === -1) activePeriodIndex = 0;
    consumed[sortedPeriods[activePeriodIndex].id] = 1;
    return consumed;
  }

  let loops = 0;
  while (currentDate.getTime() < targetTime && loops < 1000) {
    loops++;
    const hour = currentDate.getHours();
    const minute = currentDate.getMinutes();
    const currentTimeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    let activePeriod = sortedPeriods.find(p => {
      const start = p.startTime;
      const end = p.endTime;
      if (start < end) {
        return currentTimeStr >= start && currentTimeStr < end;
      } else {
        return currentTimeStr >= start || currentTimeStr < end;
      }
    });

    if (!activePeriod) {
      const nextPeriod = sortedPeriods.find(p => p.startTime > currentTimeStr) || sortedPeriods[0];
      const [sh, sm] = nextPeriod.startTime.split(':').map(Number);
      if (nextPeriod.startTime <= currentTimeStr) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      currentDate.setHours(sh, sm, 0, 0);
      activePeriod = nextPeriod;
    }

    consumed[activePeriod.id]++;

    const periodEnd = getPeriodEnd(currentDate, activePeriod);
    if (periodEnd.getTime() <= currentDate.getTime()) {
      periodEnd.setTime(currentDate.getTime() + 60 * 60 * 1000);
    }
    currentDate = periodEnd;
  }

  return consumed;
};

/**
 * Resolves the final active periods for a guest, combining pre-registered (filled) and actual consumed periods.
 */
export const getGuestActivePeriods = (
  guest: Guest,
  hotelSettings?: HotelSettings
): Record<string, number> => {
  const settings = hotelSettings || loadHotelSettings();
  const periods = settings?.rentalPeriods || [
    { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
    { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
    { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
  ];

  const checkInTime = guest.checkInTime || '08:00';
  const checkInDate = guest.checkInDate || getLocalDateString();
  
  const selectedPeriods = guest.selectedPeriods || {};
  const hasSelected = Object.values(selectedPeriods).some(v => v > 0);
  if (!hasSelected) {
    return {};
  }

  // Calculate filledPreRegistered consecutive periods starting from check-in time
  const filledPreRegistered = getFilledPeriods(checkInTime, selectedPeriods, periods);

  // Calculate when their paid stay ends
  const periodCheckout = calculatePeriodCheckout(checkInDate, checkInTime, filledPreRegistered, periods);
  const expectedCheckOutMillis = periodCheckout.expectedMillis;

  const endMillis = guest.checkoutConfirmed
    ? (guest.actualCheckOutDate ? new Date(guest.actualCheckOutDate).getTime() : Date.now())
    : Date.now();

  const activePeriods = { ...filledPreRegistered };

  // Only calculate extra consumed periods if they stayed past the paid checkout time
  if (endMillis > expectedCheckOutMillis) {
    const extraConsumed = getConsumedPeriods(
      periodCheckout.checkOutDate,
      periodCheckout.checkOutTime,
      endMillis,
      periods
    );
    periods.forEach(p => {
      activePeriods[p.id] = (activePeriods[p.id] || 0) + (extraConsumed[p.id] || 0);
    });
  }

  return activePeriods;
};

/**
 * Formats a phone number for direct WhatsApp links (wa.me / api.whatsapp.com).
 * Automatically handles Algerian mobile numbers (05xx, 06xx, 07xx -> 2135xx, 2136xx, 2137xx)
 * as well as international numbers with + or 00 prefixes.
 */
export const formatWhatsAppNumber = (rawPhone: string | undefined | null): string => {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '213' + cleaned.substring(1);
  } else if ((cleaned.startsWith('5') || cleaned.startsWith('6') || cleaned.startsWith('7')) && cleaned.length === 9) {
    cleaned = '213' + cleaned;
  }
  return cleaned;
};




