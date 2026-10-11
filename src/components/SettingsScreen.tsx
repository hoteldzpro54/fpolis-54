import React, { useState, useEffect } from 'react';
import { 
  Shield, Key, Lock, CheckCircle, Smartphone, AlertOctagon, RefreshCw, 
  Eye, EyeOff, Trash2, Plus, Sliders, LogOut, Info, Settings, 
  Users, UserPlus, Edit3, Download, Upload, Palette, ToggleLeft, Clock,
  Sparkles, Percent, Printer, Bell, LayoutTemplate
} from 'lucide-react';
import { User } from 'firebase/auth';
import { HotelSettings, RentalPeriod, Guest } from '../types';
import { getLocalStorageItem } from '../localDb';
import { SettingsTogglesTab } from './SettingsTogglesTab';

// Reusable toggle option card for clean and organized settings
const ToggleOptionCard = ({
  icon: Icon,
  title,
  description,
  value,
  onChange,
  activeLabel = "تفعيل",
  inactiveLabel = "تعطيل",
  activeColor = "bg-emerald-500 text-slate-950 font-black",
  inactiveColor = "bg-rose-500 text-white font-black"
}: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
  activeColor?: string;
  inactiveColor?: string;
}) => (
  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-right shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start gap-3">
      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg text-[#cca43b] shrink-0 border border-slate-200 dark:border-slate-700">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-0.5">
        <h5 className="text-[11.5px] font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>{title}</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
            value ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-450'
          }`}>
            {value ? 'نشط' : 'معطل'}
          </span>
        </h5>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold max-w-xl leading-normal">{description}</p>
      </div>
    </div>
    <div className="flex gap-1.5 shrink-0 self-start sm:self-auto">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
          value
            ? `${activeColor} shadow-sm font-extrabold scale-103`
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        {activeLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
          !value
            ? `${inactiveColor} shadow-sm font-extrabold scale-103`
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        {inactiveLabel}
      </button>
    </div>
  </div>
);

interface SettingsScreenProps {
  onClose?: () => void;
  receptionistPin: string;
  policePin: string;
  onUpdateReceptionistPin: (newPin: string) => void;
  onUpdatePolicePin: (newPin: string) => void;
  authorizedEmails: string[];
  onAddAuthorizedEmail: (email: string) => Promise<void>;
  onRemoveAuthorizedEmail: (email: string) => Promise<void>;
  firebaseUser: User | null;
  colorTheme: 'emerald' | 'royal' | 'constantine' | 'oran-blue' | 'tlemcen-gold';
  setColorTheme: (theme: 'emerald' | 'royal' | 'constantine' | 'oran-blue' | 'tlemcen-gold') => void;
  zelligeOpacity: number;
  setZelligeOpacity: (opacity: number) => void;
  buttonSpacing: 'compact' | 'normal' | 'relaxed';
  setButtonSpacing: (spacing: 'compact' | 'normal' | 'relaxed') => void;
  buttonAlignment: 'right' | 'left' | 'justified';
  setButtonAlignment: (alignment: 'right' | 'left' | 'justified') => void;
  manualUsers: { username: string; password: string }[];
  onUpdateManualUsers: (users: { username: string; password: string }[]) => Promise<void>;
  hotelSettings: HotelSettings;
  onUpdateHotelSettings: (settings: HotelSettings) => void;
  settingsSection?: 'info' | 'rooms_config';
  onSettingsSectionChange?: (section: 'info' | 'rooms_config') => void;
  guests?: Guest[];
  onUpdateGuests?: (guests: Guest[]) => void;
  pendingSyncCount?: number;
  onFlushSyncQueue?: () => Promise<void>;
}

const getFloorIdFromName = (floorName: string, roomId: string): string => {
  const trimmed = floorName.trim();
  const digitMatch = trimmed.match(/\d+/);
  if (digitMatch) return digitMatch[0];
  
  if (trimmed.includes('الأول') || trimmed.includes('1')) return '1';
  if (trimmed.includes('الثاني') || trimmed.includes('2')) return '2';
  if (trimmed.includes('الثالث') || trimmed.includes('3')) return '3';
  if (trimmed.includes('الرابع') || trimmed.includes('4')) return '4';
  if (trimmed.includes('الخامس') || trimmed.includes('5')) return '5';
  if (trimmed.includes('السادس') || trimmed.includes('6')) return '6';
  if (trimmed.includes('السابع') || trimmed.includes('7')) return '7';
  if (trimmed.includes('الثامن') || trimmed.includes('8')) return '8';
  if (trimmed.includes('التاسع') || trimmed.includes('9')) return '9';
  if (trimmed.includes('العاشر') || trimmed.includes('10')) return '10';
  
  // fallback to first character of room ID if it starts with a number
  const firstChar = roomId.trim()[0];
  if (firstChar && /\d/.test(firstChar)) return firstChar;
  
  return '1';
};

export default function SettingsScreen({
  onClose,
  receptionistPin,
  policePin,
  onUpdateReceptionistPin,
  onUpdatePolicePin,
  authorizedEmails,
  onAddAuthorizedEmail,
  onRemoveAuthorizedEmail,
  firebaseUser,
  colorTheme,
  setColorTheme,
  zelligeOpacity,
  setZelligeOpacity,
  buttonSpacing,
  setButtonSpacing,
  buttonAlignment,
  setButtonAlignment,
  manualUsers,
  onUpdateManualUsers,
  hotelSettings,
  onUpdateHotelSettings,
  settingsSection: propSettingsSection,
  onSettingsSectionChange,
  guests = [],
  onUpdateGuests,
  pendingSyncCount = 0,
  onFlushSyncQueue
}: SettingsScreenProps) {
  const [newRecep, setNewRecep] = useState('');
  const [confirmRecep, setConfirmRecep] = useState('');
  const [newPolice, setNewPolice] = useState('');
  const [confirmPolice, setConfirmPolice] = useState('');

  const [recepSuccess, setRecepSuccess] = useState(false);
  const [policeSuccess, setPoliceSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [showRecepPin, setShowRecepPin] = useState(false);
  const [showPolicePin, setShowPolicePin] = useState(false);

  // Email Authorizations State variables
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isAddingEmail, setIsAddingEmail] = useState(false);

  // Unsecure layout success states
  const [hotelSettingsSuccess, setHotelSettingsSuccess] = useState(false);
  const [pageToggleSuccess, setPageToggleSuccess] = useState(false);
  
  const [newManualUsername, setNewManualUsername] = useState('');
  const [newManualPassword, setNewManualPassword] = useState('');
  const [manualUserError, setManualUserError] = useState('');
  const [manualUserSuccess, setManualUserSuccess] = useState('');
  
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editingPasswordVal, setEditingPasswordVal] = useState('');

  const [showWipeChallenge, setShowWipeChallenge] = useState(false);
  const [wipePasscode, setWipePasscode] = useState('');
  const [wipeError, setWipeError] = useState('');

  const handleWipeDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setWipeError('');
    
    try {
      localStorage.clear();
      indexedDB.deleteDatabase("adjad_hotel_local_db");
      const req = indexedDB.deleteDatabase("hotel_palms_local_db");
      req.onsuccess = () => {
        alert("تم تهيئة وتفريغ مساحة قاعدة البيانات المادية والافتراضية بالكامل. سيتم إعادة تشغيل البرمجية الآن.");
        window.location.reload();
      };
      req.onerror = () => {
        alert("تم تفريغ الذاكرة المؤقتة بنجاح. جاري الاستعادة الآن.");
        window.location.reload();
      };
    } catch (err) {
      window.location.reload();
    }
  };

  const [inputHotelNameAr, setInputHotelNameAr] = useState(hotelSettings.hotelNameAr);
  const [inputHotelNameEn, setInputHotelNameEn] = useState(hotelSettings.hotelNameEn);
  const [inputHotelPhone, setInputHotelPhone] = useState(hotelSettings.hotelPhone);
  const [inputHotelEmail, setInputHotelEmail] = useState(hotelSettings.hotelEmail);
  const [inputHotelGreeting, setInputHotelGreeting] = useState(hotelSettings.hotelGreeting);
  const [inputHotelSecretCode, setInputHotelSecretCode] = useState(hotelSettings.hotelSecretCode || '5454');

  const [inputEnableSoundEffects, setInputEnableSoundEffects] = useState(hotelSettings.enableSoundEffects !== false);
  const [inputRoomsPerRowDesktop, setInputRoomsPerRowDesktop] = useState<number>(hotelSettings.roomsPerRowDesktop || 5);
  
  // Custom Invoice Taxes & Fees states
  const [inputEnableCalculatedTaxes, setInputEnableCalculatedTaxes] = useState<boolean>(!!hotelSettings.enableCalculatedTaxes);
  const [inputCustomVatRate, setInputCustomVatRate] = useState<number>(hotelSettings.customVatRate !== undefined ? hotelSettings.customVatRate : 0);
  const [inputCustomStampDutyRate, setInputCustomStampDutyRate] = useState<number>(hotelSettings.customStampDutyRate !== undefined ? hotelSettings.customStampDutyRate : 0);
  const [inputCustomStampDutyFixed, setInputCustomStampDutyFixed] = useState<boolean>(!!hotelSettings.customStampDutyFixed);
  const [inputCustomStampDutyValue, setInputCustomStampDutyValue] = useState<number>(hotelSettings.customStampDutyValue || 0);
  
  // print default states
  const [inputDefaultPrintSize, setInputDefaultPrintSize] = useState<'compact' | 'a5' | 'a4_full_frame'>(
    hotelSettings.defaultPrintSize || 'a4_full_frame'
  );
  const [inputDefaultReceptionStampTitle, setInputDefaultReceptionStampTitle] = useState<string>(hotelSettings.defaultReceptionStampTitle || 'إمضاء وختم مسؤول الاستقبال');
  const [inputOptionalFatherAndMotherName, setInputOptionalFatherAndMotherName] = useState<boolean>(!!hotelSettings.optionalFatherAndMotherName);
  const [inputDefaultPoliceNotesAr, setInputDefaultPoliceNotesAr] = useState<string>(hotelSettings.defaultPoliceNotesAr || '');
  const [inputGlobalPricingMode, setInputGlobalPricingMode] = useState<'daily' | 'hourly'>('daily');
  const [inputDefaultRentalPricingBasis, setInputDefaultRentalPricingBasis] = useState<'room' | 'person'>(hotelSettings.defaultRentalPricingBasis || 'room');

  // Time periods management states
  const [inputRentalPeriods, setInputRentalPeriods] = useState<RentalPeriod[]>(() => {
    return hotelSettings.rentalPeriods || [
      { id: 'morning', name: 'فترة صباحية', startTime: '08:00', endTime: '12:00', defaultPrice: 2000 },
      { id: 'nap', name: 'فترة القيلولة', startTime: '12:00', endTime: '18:00', defaultPrice: 2500 },
      { id: 'night', name: 'فترة الليل', startTime: '18:00', endTime: '08:00', defaultPrice: 4000 }
    ];
  });

  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('08:00');
  const [newPeriodEnd, setNewPeriodEnd] = useState('12:00');
  const [newPeriodPrice, setNewPeriodPrice] = useState(2000);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  const handleAddOrUpdatePeriod = () => {
    if (!newPeriodName.trim()) {
      alert('يرجى إدخال اسم الفترة');
      return;
    }
    if (editingPeriodId) {
      setInputRentalPeriods(prev => prev.map(p => p.id === editingPeriodId ? {
        ...p,
        name: newPeriodName.trim(),
        startTime: newPeriodStart,
        endTime: newPeriodEnd,
        defaultPrice: Number(newPeriodPrice) || 0
      } : p));
      setEditingPeriodId(null);
    }
    setNewPeriodName('');
    setNewPeriodStart('08:00');
    setNewPeriodEnd('12:00');
    setNewPeriodPrice(2000);
  };

  const handleStartEditPeriod = (p: RentalPeriod) => {
    setEditingPeriodId(p.id);
    setNewPeriodName(p.name);
    setNewPeriodStart(p.startTime);
    setNewPeriodEnd(p.endTime);
    setNewPeriodPrice(p.defaultPrice);
  };

  const handleDeletePeriod = (id: string) => {
    // Deletion is disabled as requested by the user
    console.log("Deletion of rental periods is disabled.", id);
  };

  // Unified feature control state variables
  const [inputEnableApprovedRentalCalculation, setInputEnableApprovedRentalCalculation] = useState<boolean>(hotelSettings.enableApprovedRentalCalculation !== false);
  const [inputHideCheckoutBtn, setInputHideCheckoutBtn] = useState<boolean>(!!hotelSettings.hideCheckoutBtn);
  const [inputHideTransferBtn, setInputHideTransferBtn] = useState<boolean>(!!hotelSettings.hideTransferBtn);
  const [inputHideEditGuestBtn, setInputHideEditGuestBtn] = useState<boolean>(!!hotelSettings.hideEditGuestBtn);
  const [inputHideDeleteGuestBtn, setInputHideDeleteGuestBtn] = useState<boolean>(!!hotelSettings.hideDeleteGuestBtn);
  const [inputHideStaffRemindersButton, setInputHideStaffRemindersButton] = useState<boolean>(!!hotelSettings.hideStaffRemindersButton);
  const [inputHidePrintFormDirectly, setInputHidePrintFormDirectly] = useState<boolean>(!!hotelSettings.hidePrintFormDirectly);
  const [inputHideQuickRegisterBtn, setInputHideQuickRegisterBtn] = useState<boolean>(!!hotelSettings.hideQuickRegisterBtn);
  const [inputHideParliamentLayout, setInputHideParliamentLayout] = useState<boolean>(!!hotelSettings.hideParliamentLayout);
  const [inputHideQuickRoomStatusEdit, setInputHideQuickRoomStatusEdit] = useState<boolean>(!!hotelSettings.hideQuickRoomStatusEdit);
  const [inputHideNotesClearAction, setInputHideNotesClearAction] = useState<boolean>(!!hotelSettings.hideNotesClearAction);
  const [inputHideAccountingAddTransaction, setInputHideAccountingAddTransaction] = useState<boolean>(!!hotelSettings.hideAccountingAddTransaction);
  const [inputHideAccountingDeleteTransaction, setInputHideAccountingDeleteTransaction] = useState<boolean>(!!hotelSettings.hideAccountingDeleteTransaction);
  const [inputHideExtraServicesSelection, setInputHideExtraServicesSelection] = useState<boolean>(!!hotelSettings.hideExtraServicesSelection);
  const [inputVoiceAlertStyle, setInputVoiceAlertStyle] = useState<'style1' | 'style2' | 'style3'>(hotelSettings.voiceAlertStyle || 'style1');
  const [inputVoiceAlertGender, setInputVoiceAlertGender] = useState<'male' | 'female' | 'default'>(hotelSettings.voiceAlertGender || 'default');
  const [inputEnableVoiceAlert, setInputEnableVoiceAlert] = useState<boolean>(hotelSettings.enableVoiceAlert !== false);
  
  const [internalSettingsSection, setInternalSettingsSection] = useState<'info' | 'rooms_config'>('info');
  const settingsSection = propSettingsSection ?? internalSettingsSection;
  const setSettingsSection = (sec: 'info' | 'rooms_config') => {
    setInternalSettingsSection(sec);
    if (onSettingsSectionChange) {
      onSettingsSectionChange(sec);
    }
  };


  const [inputQuickRatesList, setInputQuickRatesList] = useState<number[]>(hotelSettings.quickRatesPresets || [3000, 4000, 5000, 6000, 7500, 10000]);

  const [inputPopularServices, setInputPopularServices] = useState<{name: string, amount: number}[]>(hotelSettings.customPopularServices || [
    { name: 'فطور الصباح / Breakfast', amount: 500 },
    { name: 'وجبة غداء فاخرة / Lunch', amount: 1200 },
    { name: 'وجبة عشاء كامل ممتد / Dinner', amount: 1500 },
    { name: 'مواقف سيارات محروسة / Protected Parking', amount: 400 },
    { name: 'خدمة غسيل وكي ملابس / Laundry', amount: 600 }
  ]);
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvAmount, setNewSrvAmount] = useState<string>('');

  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [editingRoomValue, setEditingRoomValue] = useState<string>('');

  const [inputHotelRooms, setInputHotelRooms] = useState<{ id: string; floor: string; floorName: string; type: string }[]>(() => hotelSettings.customHotelRooms || []);
  const [inputFloorConfigs, setInputFloorConfigs] = useState<{
    floorId: string;
    floorName: string;
    roomsCount: number;
    roomType: string;
    startRoomNumber: number;
    customNumbers?: string[];
    roomTypes?: {
      type: string;
      count: number;
    }[];
  }[]>(() => {
    let list = hotelSettings.floorConfigs;
    if (!list || list.length === 0) {
      list = [
        { floorId: '1', floorName: 'الطابق الأول', roomsCount: 14, roomType: 'غرفة زوجية', startRoomNumber: 101, roomTypes: [{ type: 'غرفة زوجية', count: 14 }] },
        { floorId: '2', floorName: 'الطابق الثاني', roomsCount: 6, roomType: 'غرفة فردية', startRoomNumber: 201, roomTypes: [{ type: 'غرفة فردية', count: 6 }] },
        { floorId: '3', floorName: 'الطابق الثالث', roomsCount: 2, roomType: 'غرفة ممتازة', startRoomNumber: 301, roomTypes: [{ type: 'غرفة ممتازة', count: 2 }] }
      ];
    }
    return list.map(cfg => {
      const roomTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
        ? cfg.roomTypes 
        : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
      const totalCount = roomTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0);
      return {
        ...cfg,
        roomsCount: totalCount,
        roomType: roomTypes[0]?.type || 'غرفة زوجية',
        roomTypes
      };
    });
  });

  const handleUpdateFloorConfigs = (newConfigs: typeof inputFloorConfigs) => {
    // Generate static nested configs and sync roomsCount
    const syncedConfigs = newConfigs.map(cfg => {
      const roomTypes = cfg.roomTypes && cfg.roomTypes.length > 0
        ? cfg.roomTypes
        : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
      const totalCount = roomTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0);
      return {
        ...cfg,
        roomsCount: totalCount,
        roomType: roomTypes[0]?.type || 'غرفة زوجية',
        roomTypes
      };
    });

    setInputFloorConfigs(syncedConfigs);
    
    // Generate rooms dynamically with support for custom room IDs per floor
    const generated: { id: string; floor: string; floorName: string; type: string }[] = [];
    syncedConfigs.forEach((cfg) => {
      const start = Number(cfg.startRoomNumber) || (Number(cfg.floorId) * 100 + 1);
      const customNumbers = Array.isArray(cfg.customNumbers) ? cfg.customNumbers : [];
      let offset = 0;
      if (cfg.roomTypes && cfg.roomTypes.length > 0) {
        cfg.roomTypes.forEach((rt) => {
          const count = Number(rt.count) || 0;
          for (let i = 0; i < count; i++) {
            const rId = customNumbers[offset] !== undefined && String(customNumbers[offset]).trim() !== ''
              ? String(customNumbers[offset]).trim()
              : String(start + offset);
            generated.push({
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
          generated.push({
            id: rId,
            floor: String(cfg.floorId),
            floorName: cfg.floorName || `الطابق ${cfg.floorId}`,
            type: cfg.roomType || 'غرفة زوجية'
          });
        }
      }
    });

    // Natural/alphanumeric sort generated rooms to ensure proper coordination throughout app
    generated.sort((a, b) => {
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
    
    setInputHotelRooms(generated);
    
    onUpdateHotelSettings({
      ...hotelSettings,
      floorConfigs: syncedConfigs,
      customHotelRooms: generated
    });
  };

  const handleSaveRoom = (floorIdx: number, rmIdx: number, newValue: string) => {
    const currentFloor = inputFloorConfigs[floorIdx];
    const start = Number(currentFloor.startRoomNumber) || (Number(currentFloor.floorId) * 100 + 1);
    
    // Compute current room IDs before modifying
    const demoNums = Array.isArray(currentFloor.customNumbers) 
      ? [...currentFloor.customNumbers] 
      : (() => {
          const rTypes = currentFloor.roomTypes && currentFloor.roomTypes.length > 0 
            ? currentFloor.roomTypes 
            : [{ type: currentFloor.roomType || 'غرفة زوجية', count: currentFloor.roomsCount || 0 }];
          const res: string[] = [];
          let offset = 0;
          rTypes.forEach((rt) => {
            const count = Number(rt.count) || 0;
            for (let i = 0; i < count; i++) {
              res.push(String(start + offset));
              offset++;
            }
          });
          return res;
        })();

    demoNums[rmIdx] = newValue.trim() || String(start + rmIdx);
    
    const updated = [...inputFloorConfigs];
    updated[floorIdx] = {
      ...currentFloor,
      customNumbers: demoNums
    };
    handleUpdateFloorConfigs(updated);
    setEditingFloorId(null);
    setEditingRoomIndex(null);
    setEditingRoomValue('');
  };

  const handleDeleteRoom = (floorIdx: number, rmIdx: number, roomNum: string) => {
    if (!confirm(`هل أنت متأكد من حذف الغرفة رقم (${roomNum}) تماماً من هذا الطابق وتغيير تقسيم الفندق الهندسي؟`)) {
      return;
    }

    const currentFloor = inputFloorConfigs[floorIdx];
    const rTypes = currentFloor.roomTypes && currentFloor.roomTypes.length > 0 
      ? [...currentFloor.roomTypes] 
      : [{ type: currentFloor.roomType || 'غرفة زوجية', count: currentFloor.roomsCount || 0 }];
    
    let tempIndex = 0;
    let targetCategoryIdx = -1;
    for (let c = 0; c < rTypes.length; c++) {
      const categoryCount = Number(rTypes[c].count) || 0;
      if (rmIdx >= tempIndex && rmIdx < tempIndex + categoryCount) {
        targetCategoryIdx = c;
        break;
      }
      tempIndex += categoryCount;
    }

    if (targetCategoryIdx !== -1) {
      rTypes[targetCategoryIdx] = {
        ...rTypes[targetCategoryIdx],
        count: Math.max(0, (rTypes[targetCategoryIdx].count || 0) - 1)
      };
    }

    const start = Number(currentFloor.startRoomNumber) || (Number(currentFloor.floorId) * 100 + 1);
    const demoNums = Array.isArray(currentFloor.customNumbers)
      ? [...currentFloor.customNumbers]
      : (() => {
          const res: string[] = [];
          let offset = 0;
          rTypes.forEach((rt) => {
            const count = Number(rt.count) || 0;
            for (let i = 0; i < count; i++) {
              res.push(String(start + offset));
              offset++;
            }
          });
          return res;
        })();
    
    demoNums.splice(rmIdx, 1);

    const updated = [...inputFloorConfigs];
    updated[floorIdx] = {
      ...currentFloor,
      roomTypes: rTypes.filter(rt => rt.count > 0 || rTypes.length === 1), // keep at least one
      roomsCount: rTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0),
      customNumbers: demoNums.length > 0 ? demoNums : undefined
    };

    handleUpdateFloorConfigs(updated);
  };

  const handleAddRoomToFloor = (floorIdx: number) => {
    const currentFloor = inputFloorConfigs[floorIdx];
    const rTypes = currentFloor.roomTypes && currentFloor.roomTypes.length > 0 
      ? [...currentFloor.roomTypes] 
      : [{ type: currentFloor.roomType || 'غرفة زوجية', count: currentFloor.roomsCount || 0 }];
    
    if (rTypes.length === 0) {
      rTypes.push({ type: 'غرفة زوجية', count: 1 });
    } else {
      rTypes[0] = {
        ...rTypes[0],
        count: (Number(rTypes[0].count) || 0) + 1
      };
    }

    const start = Number(currentFloor.startRoomNumber) || (Number(currentFloor.floorId) * 100 + 1);
    const demoNums = Array.isArray(currentFloor.customNumbers)
      ? [...currentFloor.customNumbers]
      : (() => {
          const res: string[] = [];
          let offset = 0;
          rTypes.forEach((rt) => {
            const count = Number(rt.count) || 0;
            for (let i = 0; i < count; i++) {
              res.push(String(start + offset));
              offset++;
            }
          });
          return res;
        })();

    const nextNum = String(start + demoNums.length);
    demoNums.push(nextNum);

    const updated = [...inputFloorConfigs];
    updated[floorIdx] = {
      ...currentFloor,
      roomTypes: rTypes,
      roomsCount: rTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0),
      customNumbers: demoNums
    };

    handleUpdateFloorConfigs(updated);
  };

  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomType, setNewRoomType] = useState('غرفة زوجية');
  const [newRoomFloorName, setNewRoomFloorName] = useState('الطابق الأول والوحيد');
  const [roomSettingsSearch, setRoomSettingsSearch] = useState('');
  const [selectedRoomIdsForReclassification, setSelectedRoomIdsForReclassification] = useState<string[]>([]);
  const [bulkTargetType, setBulkTargetType] = useState<string>('غرفة زوجية');

  // Batch Rooms Generator states
  const [batchCount, setBatchCount] = useState('19');
  const [batchType, setBatchType] = useState('غرفة زوجية');
  const [batchFloor, setBatchFloor] = useState('1');
  const [batchFloorName, setBatchFloorName] = useState('الطابق الأول');
  const [batchStartId, setBatchStartId] = useState('1');

  // Quick Auto setup states
  const [quickTotalRooms, setQuickTotalRooms] = useState('19');
  const [quickFloorsCount, setQuickFloorsCount] = useState('1');
  const [quickDefaultType, setQuickDefaultType] = useState('غرفة زوجية');

  const handleQuickAutoGenerate = () => {
    const roomsCount = Number(quickTotalRooms) || 19;
    const floorsCount = Number(quickFloorsCount) || 1;
    if (roomsCount <= 0 || floorsCount <= 0) {
      alert('الرجاء إدخال قيم صحيحة أكبر من الصفر.');
      return;
    }
    
    const roomsPerFloor = Math.ceil(roomsCount / floorsCount);
    const generated: { id: string; floor: string; floorName: string; type: string }[] = [];
    const arFloorNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];

    for (let f = 1; f <= floorsCount; f++) {
      const floorLabel = `الطابق ${arFloorNames[f - 1] || f}`;
      const startNum = f * 100;
      
      for (let r = 1; r <= roomsPerFloor; r++) {
        if (generated.length >= roomsCount) break;
        const roomId = String(startNum + r);
        generated.push({
          id: roomId,
          floor: String(f),
          floorName: floorLabel,
          type: quickDefaultType
        });
      }
    }

    if (generated.length > 0) {
      setInputHotelRooms(generated);
      alert(`تمت هيكلية الفندق بنجاح! تم توليد وترميز ${generated.length} غرفة بنجاح وتوزيعها على ${floorsCount} طوابق.\nملاحظة: لحفظ هذه التغييرات بالتأكيد وجعلها تظهر فورياً في مخطط الغرف وباقي صفحات التطبيق، اضغط على زر "حفظ كافة معلومات وبيانات الفندق والغرف" في أسفل الشاشة.`);
    }
  };



  React.useEffect(() => {
    setInputHotelNameAr(hotelSettings.hotelNameAr);
    setInputHotelNameEn(hotelSettings.hotelNameEn);
    setInputHotelPhone(hotelSettings.hotelPhone);
    setInputHotelEmail(hotelSettings.hotelEmail);
    setInputHotelGreeting(hotelSettings.hotelGreeting);
    setInputHotelSecretCode(hotelSettings.hotelSecretCode || '5454');
    setInputEnableSoundEffects(hotelSettings.enableSoundEffects !== false);
    setInputRoomsPerRowDesktop(hotelSettings.roomsPerRowDesktop || 5);
    setInputEnableCalculatedTaxes(!!hotelSettings.enableCalculatedTaxes);
    setInputCustomVatRate(hotelSettings.customVatRate !== undefined ? hotelSettings.customVatRate : 0);
    setInputCustomStampDutyRate(hotelSettings.customStampDutyRate !== undefined ? hotelSettings.customStampDutyRate : 0);
    setInputCustomStampDutyFixed(!!hotelSettings.customStampDutyFixed);
    setInputCustomStampDutyValue(hotelSettings.customStampDutyValue || 0);
    setInputDefaultPrintSize(
      hotelSettings.defaultPrintSize || 'a4_full_frame'
    );
    setInputDefaultReceptionStampTitle(hotelSettings.defaultReceptionStampTitle || 'إمضاء وختم مسؤول الاستقبال');
    setInputOptionalFatherAndMotherName(!!hotelSettings.optionalFatherAndMotherName);
    setInputDefaultPoliceNotesAr(hotelSettings.defaultPoliceNotesAr || '');
    setInputEnableApprovedRentalCalculation(hotelSettings.enableApprovedRentalCalculation !== false);
    setInputHideCheckoutBtn(!!hotelSettings.hideCheckoutBtn);
    setInputHideTransferBtn(!!hotelSettings.hideTransferBtn);
    setInputHideEditGuestBtn(!!hotelSettings.hideEditGuestBtn);
    setInputHideDeleteGuestBtn(!!hotelSettings.hideDeleteGuestBtn);
    setInputHideStaffRemindersButton(!!hotelSettings.hideStaffRemindersButton);
    setInputHidePrintFormDirectly(!!hotelSettings.hidePrintFormDirectly);
    setInputHideQuickRegisterBtn(!!hotelSettings.hideQuickRegisterBtn);
    setInputHideParliamentLayout(!!hotelSettings.hideParliamentLayout);
    setInputHideQuickRoomStatusEdit(!!hotelSettings.hideQuickRoomStatusEdit);
    setInputHideNotesClearAction(!!hotelSettings.hideNotesClearAction);
    setInputHideAccountingAddTransaction(!!hotelSettings.hideAccountingAddTransaction);
    setInputHideAccountingDeleteTransaction(!!hotelSettings.hideAccountingDeleteTransaction);
    setInputHideExtraServicesSelection(!!hotelSettings.hideExtraServicesSelection);
    setInputVoiceAlertStyle(hotelSettings.voiceAlertStyle || 'style1');
    setInputVoiceAlertGender(hotelSettings.voiceAlertGender || 'default');
    setInputEnableVoiceAlert(hotelSettings.enableVoiceAlert !== false);
    setInputGlobalPricingMode('daily');
    setInputDefaultRentalPricingBasis(hotelSettings.defaultRentalPricingBasis || 'room');
    setInputQuickRatesList(hotelSettings.quickRatesPresets || [3000, 4000, 5000, 6000, 7500, 10000]);
    setInputPopularServices(hotelSettings.customPopularServices || [
      { name: 'فطور الصباح / Breakfast', amount: 500 },
      { name: 'وجبة غداء فاخرة / Lunch', amount: 1200 },
      { name: 'وجبة عشاء كامل ممتد / Dinner', amount: 1500 },
      { name: 'مواقف سيارات محروسة / Protected Parking', amount: 400 },
      { name: 'خدمة غسيل وكي ملابس / Laundry', amount: 600 }
    ]);
    setInputHotelRooms(hotelSettings.customHotelRooms || []);
    if (hotelSettings.floorConfigs && hotelSettings.floorConfigs.length > 0) {
      const parsed = hotelSettings.floorConfigs.map((cfg: any) => {
        const roomTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
          ? cfg.roomTypes 
          : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
        const totalCount = roomTypes.reduce((sum: number, rt: any) => sum + (Number(rt.count) || 0), 0);
        return {
          ...cfg,
          roomsCount: totalCount,
          roomType: roomTypes[0]?.type || 'غرفة زوجية',
          roomTypes
        };
      });
      setInputFloorConfigs(parsed);
    }
  }, [hotelSettings]);

  const handleSaveHotelSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHotelSettingsSuccess(false);

    const sortedRooms = [...inputHotelRooms].sort((a, b) => {
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

    onUpdateHotelSettings({
      hotelNameAr: inputHotelNameAr.trim(),
      hotelNameEn: inputHotelNameEn.trim(),
      hotelSubtitle: '',
      hotelPhone: inputHotelPhone.trim(),
      hotelEmail: inputHotelEmail.trim(),
      hotelGreeting: inputHotelGreeting.trim(),
      defaultRatePerNight: hotelSettings.defaultRatePerNight || 7000,
      defaultRatePerPerson: hotelSettings.defaultRatePerPerson || 3500,
      defaultCheckInTime: hotelSettings.defaultCheckInTime || '14:00',
      defaultCheckOutTime: hotelSettings.defaultCheckOutTime || '12:00',
      touristTaxRate: hotelSettings.touristTaxRate || 0,
      touristTaxCalculationBasis: hotelSettings.touristTaxCalculationBasis || 'guest',
      enableSoundEffects: inputEnableSoundEffects,
      enableZelligeBackground: false,
      enableCalculatorAndPackages: false,
      hourlyRate: 0,
      roomsPerRowDesktop: Number(inputRoomsPerRowDesktop) || 5,
      enableCalculatedTaxes: inputEnableCalculatedTaxes,
      customVatRate: Number(inputCustomVatRate),
      customStampDutyRate: Number(inputCustomStampDutyRate),
      customStampDutyFixed: inputCustomStampDutyFixed,
      customStampDutyValue: Number(inputCustomStampDutyValue),
      customPopularServices: inputPopularServices,
      quickRatesPresets: inputQuickRatesList.map(v => Number(v) || 0),
      hotelSecretCode: inputHotelSecretCode.trim(),
      customHotelRooms: sortedRooms,
      floorConfigs: inputFloorConfigs,
      defaultPrintSize: inputDefaultPrintSize,
      defaultPrintNotesAr: '',
      defaultPrintNotesEn: '',
      defaultReceptionStampTitle: inputDefaultReceptionStampTitle.trim(),
      optionalFatherAndMotherName: inputOptionalFatherAndMotherName,
      defaultPoliceNotesAr: inputDefaultPoliceNotesAr.trim(),
      enableApprovedRentalCalculation: inputEnableApprovedRentalCalculation,
      hideCheckoutBtn: inputHideCheckoutBtn,
      hideTransferBtn: inputHideTransferBtn,
      hideEditGuestBtn: inputHideEditGuestBtn,
      hideDeleteGuestBtn: inputHideDeleteGuestBtn,
      hideStaffRemindersButton: inputHideStaffRemindersButton,
      hidePrintFormDirectly: inputHidePrintFormDirectly,
      hideQuickRegisterBtn: inputHideQuickRegisterBtn,
      hideParliamentLayout: inputHideParliamentLayout,
      hideQuickRoomStatusEdit: inputHideQuickRoomStatusEdit,
      hideNotesClearAction: inputHideNotesClearAction,
      hideAccountingAddTransaction: inputHideAccountingAddTransaction,
      hideAccountingDeleteTransaction: inputHideAccountingDeleteTransaction,
      hideExtraServicesSelection: inputHideExtraServicesSelection,
      voiceAlertStyle: inputVoiceAlertStyle,
      voiceAlertGender: inputVoiceAlertGender,
      enableVoiceAlert: inputEnableVoiceAlert,
      globalPricingMode: inputGlobalPricingMode,
      defaultRentalPricingBasis: inputDefaultRentalPricingBasis,
      rentalPeriods: inputRentalPeriods,
    });

    setHotelSettingsSuccess(true);
    setTimeout(() => setHotelSettingsSuccess(false), 3000);
  };

  const handleTogglePageVisibility = (pageId: string) => {
    const currentEnabled = hotelSettings.enabledPages || ['rooms', 'registry', 'form', 'settings'];
    let nextEnabled: string[];
    
    if (currentEnabled.includes(pageId)) {
      if (pageId === 'settings') return;
      nextEnabled = currentEnabled.filter(id => id !== pageId);
    } else {
      nextEnabled = [...currentEnabled, pageId];
    }
    
    onUpdateHotelSettings({
      ...hotelSettings,
      enabledPages: nextEnabled
    });

    setPageToggleSuccess(true);
    setTimeout(() => setPageToggleSuccess(false), 2000);
  };

  const handleToggleFeatureFlag = (flagKey: string) => {
    onUpdateHotelSettings({
      ...hotelSettings,
      [flagKey]: !hotelSettings[flagKey as keyof HotelSettings]
    });

    setPageToggleSuccess(true);
    setTimeout(() => setPageToggleSuccess(false), 2000);
  };

  const handleAddManualUserLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualUserError('');
    setManualUserSuccess('');
    
    const normalizedUsername = newManualUsername.trim().toLowerCase();
    if (!normalizedUsername || !newManualPassword.trim()) {
      setManualUserError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (manualUsers.some(u => u.username.toLowerCase() === normalizedUsername)) {
      setManualUserError('اسم المستخدم هذا مضاف بالفعل في جدول الموظفين المعينين.');
      return;
    }

    const updated = [...manualUsers, { username: normalizedUsername, password: newManualPassword.trim() }];
    try {
      await onUpdateManualUsers(updated);
      setNewManualUsername('');
      setNewManualPassword('');
      setManualUserSuccess('تم إضافة الموظف الجديد بنجاح في قاعدة البيانات.');
    } catch (err: any) {
      setManualUserError(err.message || 'فشلت عملية الإضافة الداخلية للموظف.');
    }
  };

  const handleDeleteManualUserLocal = async (username: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف حساب الموظف "${username}" نهائياً من النظام؟`)) {
      return;
    }
    const updated = manualUsers.filter(u => u.username !== username);
    try {
      await onUpdateManualUsers(updated);
      setManualUserSuccess('تم حذف الحساب المحدد بنجاح.');
    } catch (err: any) {
      setManualUserError('فشلت عملية حذف الموظف.');
    }
  };

  const handleStartEditingUser = (username: string, currentPass: string) => {
    setEditingUsername(username);
    setEditingPasswordVal(currentPass);
  };

  const handleSaveEditedUserLocal = async (username: string) => {
    if (!editingPasswordVal.trim()) {
      setManualUserError('كلمة السر لا يمكن أن تكون فارغة.');
      return;
    }
    const updated = manualUsers.map(u => {
      if (u.username === username) {
        return { username: u.username, password: editingPasswordVal.trim() };
      }
      return u;
    });
    try {
      await onUpdateManualUsers(updated);
      setEditingUsername(null);
      setEditingPasswordVal('');
      setManualUserSuccess('تم تعديل كلمة مرور الموظف بنجاح.');
    } catch (err: any) {
      setManualUserError('فشل تعديل كلمة السر.');
    }
  };

  const handleSaveRecep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setRecepSuccess(false);

    if (newRecep.length < 4) {
      setErrorMessage('يجب أن يتكون رمز موظف الاستقبال من 4 أرقام على الأقل.');
      return;
    }
    if (newRecep !== confirmRecep) {
      setErrorMessage('تأكيد رمز موظف الاستقبال لا يتطابق.');
      return;
    }

    onUpdateReceptionistPin(newRecep);
    setRecepSuccess(true);
    setNewRecep('');
    setConfirmRecep('');
    setTimeout(() => setRecepSuccess(false), 3000);
  };

  const handleSavePolice = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPoliceSuccess(false);

    if (newPolice.length < 4) {
      setErrorMessage('يجب أن يتكون رمز الأمن والشرطة من 4 أرقام على الأقل.');
      return;
    }
    if (newPolice !== confirmPolice) {
      setErrorMessage('تأكيد رمز الأمن والشرطة لا يتطابق.');
      return;
    }

    onUpdatePolicePin(newPolice);
    setPoliceSuccess(true);
    setNewPolice('');
    setConfirmPolice('');
    setTimeout(() => setPoliceSuccess(false), 3000);
  };

  const handleAddEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;

    if (trimmed.includes(' ')) {
      setEmailError('اسم المستخدم يجب ألا يحتوي على مسافات.');
      return;
    }

    setIsAddingEmail(true);
    try {
      await onAddAuthorizedEmail(trimmed);
      setEmailSuccess(`تم إضافة الترخيص السحابي لـ "${trimmed}" بنجاح!`);
      setEmailInput('');
    } catch (err: any) {
      setEmailError(err.message || 'فشلت إضافة ترخيص اسم المستخدم.');
    } finally {
      setIsAddingEmail(false);
    }
  };

  const handleRemoveEmailClick = async (email: string) => {
    const display = email.split('@')[0];
    if (!confirm(`هل تريد سحب ترخيص ومصادقة الحساب "${display}" نهائيا من قاعدة البيانات السحابية؟`)) {
      return;
    }
    try {
      setEmailError('');
      setEmailSuccess('');
      await onRemoveAuthorizedEmail(email);
      setEmailSuccess('تم إبطال وسحب تصريح المستخدم بنجاح.');
    } catch (err: any) {
      setEmailError('فشل سحب وإلغاء ترخيص الحساب.');
    }
  };

  const filteredRoomsListInSettings = inputHotelRooms.filter(r => {
    const s = roomSettingsSearch.trim();
    if (!s) return true;
    return r.id.includes(s) || r.type.includes(s) || r.floorName.includes(s);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in" dir="rtl">
      <div className="space-y-6 animate-in fade-in-30">
          <form onSubmit={(e) => { e.preventDefault(); handleSaveHotelSettings(); }} className="space-y-6">
            {settingsSection === 'info' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Hotel Info Panel */}
                <div className="glass-panel p-6 sm:p-8 space-y-6 text-right relative">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span>تفاصيل وبيانات الفندق الأساسية واللوائح الفندقية</span>
                  </h3>

                  {/* Hotel info fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">اسم الفندق باللغة العربية:</label>
                      <input
                        type="text"
                        value={inputHotelNameAr}
                        onChange={(e) => setInputHotelNameAr(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-905 dark:text-white font-bold text-sm text-right"
                        placeholder="فندق أجاد"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">اسم الفندق باللغة الإنجليزية:</label>
                      <input
                        type="text"
                        value={inputHotelNameEn}
                        onChange={(e) => setInputHotelNameEn(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white text-left"
                        placeholder="HOTEL ADJAD"
                        required
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">رقم الهاتف المعتمد للفندق:</label>
                      <input
                        type="text"
                        value={inputHotelPhone}
                        onChange={(e) => setInputHotelPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white text-right"
                        placeholder="0661770023"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 text-right md:col-span-2">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">البريد الإلكتروني للنزلاء والاستفسارات (Email):</label>
                      <input
                        type="email"
                        value={inputHotelEmail}
                        onChange={(e) => setInputHotelEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white text-left"
                        placeholder="hoteladjad@gmail.com"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Custom Taxes & Fees Configuration Section */}
                  {inputEnableCalculatedTaxes && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 mt-3 space-y-4">
                      <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-[#cca43b]" />
                        <span>إعدادات الضرائب والرسوم المالية</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-right mt-4 p-4 rounded-xl bg-orange-50/20 dark:bg-amber-955/5 border border-amber-100/50 dark:border-amber-900/10">
                        <div className="space-y-1.5">
                          <label className="text-[10.5px] font-black text-slate-500">نسبة ضريبة القيمة المضافة (TVA %):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={inputCustomVatRate}
                            onChange={(e) => setInputCustomVatRate(Number(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white text-xs text-center"
                            required
                          />
                          <span className="text-[9px] text-slate-400 block font-bold">الافتراضي في الجزائر: 9%</span>
                        </div>

                        <div className="space-y-1.5 flex flex-col justify-center">
                          <span className="text-[10px] text-slate-500 font-bold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-center">
                            ملاحظة: تُطبّق الرسوم والضرائب أعلاه على الحسابات تلقائياً.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. System Features and Control Panel (تفعيل ميزات النظام والتحكم) */}
                <div className="glass-panel p-6 sm:p-8 space-y-6 text-right relative">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span>تفعيل ميزات النظام والتحكم في الواجهات والخيارات</span>
                  </h3>
                  <SettingsTogglesTab
                    inputEnableCalculatedTaxes={inputEnableCalculatedTaxes}
                    setInputEnableCalculatedTaxes={setInputEnableCalculatedTaxes}
                    inputOptionalFatherAndMotherName={inputOptionalFatherAndMotherName}
                    setInputOptionalFatherAndMotherName={setInputOptionalFatherAndMotherName}
                    inputEnableSoundEffects={inputEnableSoundEffects}
                    setInputEnableSoundEffects={setInputEnableSoundEffects}
                    inputEnableApprovedRentalCalculation={inputEnableApprovedRentalCalculation}
                    setInputEnableApprovedRentalCalculation={setInputEnableApprovedRentalCalculation}
                    inputHideCheckoutBtn={inputHideCheckoutBtn}
                    setInputHideCheckoutBtn={setInputHideCheckoutBtn}
                    inputHideTransferBtn={inputHideTransferBtn}
                    setInputHideTransferBtn={setInputHideTransferBtn}
                    inputHideEditGuestBtn={inputHideEditGuestBtn}
                    setInputHideEditGuestBtn={setInputHideEditGuestBtn}
                    inputHideDeleteGuestBtn={inputHideDeleteGuestBtn}
                    setInputHideDeleteGuestBtn={setInputHideDeleteGuestBtn}
                    inputHideStaffRemindersButton={inputHideStaffRemindersButton}
                    setInputHideStaffRemindersButton={setInputHideStaffRemindersButton}
                    inputHidePrintFormDirectly={inputHidePrintFormDirectly}
                    setInputHidePrintFormDirectly={setInputHidePrintFormDirectly}
                    inputHideQuickRegisterBtn={inputHideQuickRegisterBtn}
                    setInputHideQuickRegisterBtn={setInputHideQuickRegisterBtn}
                    inputHideParliamentLayout={inputHideParliamentLayout}
                    setInputHideParliamentLayout={setInputHideParliamentLayout}
                    inputHideQuickRoomStatusEdit={inputHideQuickRoomStatusEdit}
                    setInputHideQuickRoomStatusEdit={setInputHideQuickRoomStatusEdit}
                    inputHideNotesClearAction={inputHideNotesClearAction}
                    setInputHideNotesClearAction={setInputHideNotesClearAction}
                    inputHideAccountingAddTransaction={inputHideAccountingAddTransaction}
                    setInputHideAccountingAddTransaction={setInputHideAccountingAddTransaction}
                    inputHideAccountingDeleteTransaction={inputHideAccountingDeleteTransaction}
                    setInputHideAccountingDeleteTransaction={setInputHideAccountingDeleteTransaction}
                    inputHideExtraServicesSelection={inputHideExtraServicesSelection}
                    setInputHideExtraServicesSelection={setInputHideExtraServicesSelection}
                    inputVoiceAlertStyle={inputVoiceAlertStyle}
                    setInputVoiceAlertStyle={setInputVoiceAlertStyle}
                    inputVoiceAlertGender={inputVoiceAlertGender}
                    setInputVoiceAlertGender={setInputVoiceAlertGender}
                    inputEnableVoiceAlert={inputEnableVoiceAlert}
                    setInputEnableVoiceAlert={setInputEnableVoiceAlert}
                  />
                </div>

                {/* 3. Printing and Watermarks Panel (الطباعة والعلامات المائية) */}
                <div className="glass-panel p-6 sm:p-8 space-y-6 text-right relative">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-3 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span>الطباعة والعلامات المائية وإعدادات النماذج الفندقية</span>
                  </h3>
                  
                  <div className="space-y-4 font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
                      <div className="space-y-1.5">
                        <label className="text-[10.5px] font-black text-slate-500">حجم ورقة الطباعة الافتراضية:</label>
                        <select
                          value={inputDefaultPrintSize}
                          onChange={(e) => setInputDefaultPrintSize(e.target.value as 'compact' | 'a5' | 'a4_full_frame')}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white text-xs cursor-pointer"
                        >
                          <option value="compact">حجم مصغر A6 (استمارة واحدة لليمين)</option>
                          <option value="a5">حجم وسط A5 (استمارة مقتصة للنصف العلوي)</option>
                          <option value="a4_full_frame">كامل الصفحة A4 (استمارة ممتدة بالكامل)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10.5px] font-black text-slate-500">عنوان توقيع وختم الاستقبال الافتراضي:</label>
                        <input
                          type="text"
                          value={inputDefaultReceptionStampTitle}
                          onChange={(e) => setInputDefaultReceptionStampTitle(e.target.value)}
                          placeholder="مثال: إمضاء وختم مسؤول الاستقبال"
                          className="w-full px-4 py-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 text-right border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-3">
                      <div className="space-y-1.5">
                        <label className="text-[10.5px] font-black text-slate-500">ملاحظات إرشادية وتدابير أمنية خاصة بالـشرطة (الافتراضية):</label>
                        <textarea
                          rows={2}
                          value={inputDefaultPoliceNotesAr}
                          onChange={(e) => setInputDefaultPoliceNotesAr(e.target.value)}
                          placeholder=" .............  لا شيئ يذكر"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsSection === 'rooms_config' && (
              <div className="glass-panel p-6 sm:p-8 space-y-6 text-right relative">
              {/* Custom Rooms Plan List Configurator */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 mt-4 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                   <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 font-sans">إدارة وهيكلة خطة الغرف الفندقية (Room Plan Configurator)</h4>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                  <span className="text-[10.5px] font-black text-[#cca43b] font-mono">{inputHotelRooms.length} غرف كلياً</span>
                </div>
              </div>
              
              {/* Detailed dynamic statistics overlay for all 9 classifications */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-[10px] text-right font-bold animate-fadeIn">
                <div className="bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10">
                  <span className="text-indigo-650 dark:text-indigo-400 block">فردية</span>
                  <span className="font-sans font-black text-xs text-indigo-600 dark:text-indigo-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'غرفة فردية').length} غرف
                  </span>
                </div>
                <div className="bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                  <span className="text-emerald-655 dark:text-emerald-400 block">زوجية</span>
                  <span className="font-sans font-black text-xs text-emerald-600 dark:text-indigo-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'غرفة زوجية').length} غرف
                  </span>
                </div>
                <div className="bg-teal-500/5 p-2 rounded-xl border border-teal-500/10">
                  <span className="text-teal-655 dark:text-teal-400 block">ثلاثية</span>
                  <span className="font-sans font-black text-xs text-teal-600 dark:text-teal-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'غرفة ثلاثية').length} غرف
                  </span>
                </div>
                <div className="bg-sky-500/5 p-2 rounded-xl border border-sky-500/10">
                  <span className="text-sky-655 dark:text-sky-400 block">رباعية</span>
                  <span className="font-sans font-black text-xs text-sky-600 dark:text-sky-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'غرفة رباعية').length} غرف
                  </span>
                </div>
                <div className="bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
                  <span className="text-rose-655 dark:text-rose-400 block">عائلية</span>
                  <span className="font-sans font-black text-xs text-rose-600 dark:text-rose-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'غرفة عائلية').length} غرف
                  </span>
                </div>
                <div className="bg-purple-500/5 p-2 rounded-xl border border-purple-500/10">
                  <span className="text-purple-655 dark:text-purple-400 block">خماسية</span>
                  <span className="font-sans font-black text-xs text-purple-600 dark:text-purple-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'غرفة خماسية').length} غرف
                  </span>
                </div>
                <div className="bg-pink-500/5 p-2 rounded-xl border border-pink-500/10">
                  <span className="text-pink-655 dark:text-pink-400 block">سداسية</span>
                  <span className="font-sans font-black text-xs text-pink-600 dark:text-pink-300 block font-mono">
                    {inputFloorConfigs.reduce((total, floor) => {
                      const mine = floor.roomTypes?.find(rt => rt.type === 'غرفة سداسية')?.count || 0;
                      return total + mine;
                    }, 0) || inputHotelRooms.filter(r => r.type === 'غرفة سداسية').length} غرف
                  </span>
                </div>
                <div className="bg-orange-500/5 p-2 rounded-xl border border-orange-500/10">
                  <span className="text-orange-655 dark:text-orange-400 block">ممتازة</span>
                  <span className="font-sans font-black text-xs text-orange-605 dark:text-orange-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'غرفة ممتازة').length} غرف
                  </span>
                </div>
                <div className="bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                  <span className="text-amber-655 dark:text-amber-400 block">جناح</span>
                  <span className="font-sans font-black text-xs text-amber-505 dark:text-amber-300 block font-mono">
                    {inputHotelRooms.filter(r => r.type === 'جناح').length} أجنحة
                  </span>
                </div>
              </div>
            </div>
          {/* Simplified Floors & Rooms Configuration Panel - Dynamic, Interactive and Instant */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-[#cca43b]/5 to-indigo-500/5 dark:from-emerald-950/15 dark:to-slate-900/30 p-5 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2.5 border-b border-emerald-500/10 pb-3">
                  <Palette className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <div>
                    <h5 className="text-[12px] font-black text-emerald-850 dark:text-emerald-400">الإعداد الدقيق وتوزيع الغرف بالطوابق (توزيع متعدد الأصناف للفندق)</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      بإمكانك تخصيص وحساب غرف كل طابق على حدة. الآن، يدعم الطابق الواحد تعدد أصناف وتصانيف الغرف (على سبيل المثال: طابق يحتوي على غرف فردية، غرف زوجية وأجنحة معاً) مع إمكانية تعديلها وحسابها ديناميكياً.
                    </p>
                  </div>
                </div>


                {/* Floors Grid Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-2">
                  {inputFloorConfigs.map((cfg, index) => {
                    return (
                      <div key={cfg.floorId} className="p-4 bg-white/70 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-[#cca43b]/40 transition-all duration-305">
                        <div className="absolute top-0 right-0 h-[3px] w-full bg-gradient-to-r from-[#cca43b] to-indigo-505 rounded-t-xl"></div>
                        
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-xs font-black text-indigo-900 dark:text-amber-440">{cfg.floorName || `الطابق ${cfg.floorId}`}</span>
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-md font-mono">طابق {cfg.floorId}</span>
                        </div>

                        <div className="space-y-2.5 text-right text-xs">
                          {/* Floor Name */}
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 font-extrabold block">مسمى واجهة الطابق:</label>
                            {(() => {
                              const defaultFloors = [
                                "الطابق الأرضي",
                                "الطابق الأول",
                                "الطابق الثاني",
                                "الطابق الثالث",
                                "الطابق الرابع",
                                "الطابق الخامس",
                                "الطابق السادس",
                                "الطابق السابع",
                                "الملحق / البنهاوس"
                              ];
                              const isDefault = defaultFloors.includes(cfg.floorName || '');
                              const selectValue = isDefault ? (cfg.floorName || '') : ((cfg.floorName && cfg.floorName !== '') ? 'custom' : '');

                              return (
                                <div className="space-y-1.5">
                                  <select
                                    value={selectValue}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const updated = [...inputFloorConfigs];
                                      if (val === 'custom') {
                                        updated[index] = { ...cfg, floorName: '' };
                                      } else {
                                        updated[index] = { ...cfg, floorName: val };
                                      }
                                      handleUpdateFloorConfigs(updated);
                                    }}
                                    className="w-full text-xs px-2.5 py-1.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-955 rounded-lg font-bold text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#cca43b]/40 cursor-pointer"
                                  >
                                    <option value="" disabled>-- اختر اسم الطابق --</option>
                                    {defaultFloors.map(f => (
                                      <option key={f} value={f}>{f}</option>
                                    ))}
                                    <option value="custom">كتابة يدوية / اسم مخصص...</option>
                                  </select>
                                  {(!isDefault || selectValue === 'custom') && (
                                    <input
                                      type="text"
                                      value={cfg.floorName || ''}
                                      onChange={(e) => {
                                        const updated = [...inputFloorConfigs];
                                        updated[index] = { ...cfg, floorName: e.target.value };
                                        handleUpdateFloorConfigs(updated);
                                      }}
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-205 dark:border-slate-800 bg-white/80 dark:bg-slate-955/80 rounded-lg font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#cca43b]/40 animate-in slide-in-from-top-1"
                                      placeholder="اكتب اسم الطابق يدويًا هنا..."
                                    />
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Start Number & Total Rooms Indicator */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-500 font-extrabold block">بداية الترقيم:</label>
                              <input
                                type="number"
                                min="1"
                                value={cfg.startRoomNumber}
                                onChange={(e) => {
                                  const updated = [...inputFloorConfigs];
                                  updated[index] = { ...cfg, startRoomNumber: Math.max(1, Number(e.target.value) || 1) };
                                  handleUpdateFloorConfigs(updated);
                                }}
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-955 rounded-lg font-bold font-mono text-center text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-[#cca43b]/40"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-indigo-555 font-extrabold block">إجمالي غرف الطابق:</label>
                              <div className="w-full text-xs px-2.5 py-1.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-lg font-black font-mono text-center text-indigo-650 dark:text-indigo-300">
                                {cfg.roomTypes?.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0) || cfg.roomsCount || 0} غرف
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Multiple Room Types list for this floor */}
                          <div className="space-y-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800/60">
                            <div className="flex justify-between items-center">
                              <span className="text-[9.5px] font-extrabold text-[#cca43b]">أصناف الغرف وتوزيعها:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...inputFloorConfigs];
                                  const rTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
                                    ? [...cfg.roomTypes] 
                                    : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 1 }];
                                  
                                  rTypes.push({ type: 'غرفة زوجية', count: 1 });
                                  
                                  updated[index] = {
                                    ...cfg,
                                    roomTypes: rTypes,
                                    roomsCount: rTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0)
                                  };
                                  handleUpdateFloorConfigs(updated);
                                }}
                                className="text-[9px] bg-[#cca43b]/10 hover:bg-[#cca43b]/20 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                إضافة صنف غرف
                              </button>
                            </div>

                            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                              {((cfg.roomTypes && cfg.roomTypes.length > 0) ? cfg.roomTypes : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }]).map((rt, rtIdx) => {
                                return (
                                  <div key={rtIdx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-205 dark:border-slate-800/40">
                                    <select
                                      value={rt.type || 'غرفة زوجية'}
                                      onChange={(e) => {
                                        const updated = [...inputFloorConfigs];
                                        const rTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
                                          ? [...cfg.roomTypes] 
                                          : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
                                        
                                        rTypes[rtIdx] = { ...rTypes[rtIdx], type: e.target.value };
                                        
                                        updated[index] = {
                                          ...cfg,
                                          roomTypes: rTypes
                                        };
                                        handleUpdateFloorConfigs(updated);
                                      }}
                                      className="text-xs py-1 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-slate-100 flex-1 focus:outline-none"
                                    >
                                      <option value="غرفة فردية">غرفة فردية</option>
                                      <option value="غرفة زوجية">غرفة زوجية</option>
                                      <option value="غرفة ثلاثية">غرفة ثلاثية</option>
                                      <option value="غرفة رباعية">غرفة رباعية</option>
                                      <option value="غرفة خماسية">غرفة خماسية</option>
                                      <option value="غرفة سداسية">غرفة سداسية</option>
                                      <option value="غرفة عائلية">غرفة عائلية</option>
                                      <option value="غرفة ممتازة">غرفة ممتازة</option>
                                      <option value="جناح">جناح فاخر</option>
                                    </select>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...inputFloorConfigs];
                                          const rTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
                                            ? [...cfg.roomTypes] 
                                            : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
                                          
                                          const currentCount = Number(rTypes[rtIdx].count) || 0;
                                          if (currentCount <= 0) return;
                                          rTypes[rtIdx] = { ...rTypes[rtIdx], count: currentCount - 1 };
                                          
                                          updated[index] = {
                                            ...cfg,
                                            roomTypes: rTypes,
                                            roomsCount: rTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0)
                                          };
                                          handleUpdateFloorConfigs(updated);
                                        }}
                                        className="w-9 h-9 bg-rose-500/10 hover:bg-rose-505/20 text-rose-600 rounded-xl flex items-center justify-center font-bold text-base cursor-pointer border border-rose-200/20 transition-all active:scale-90 shrink-0"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        value={rt.count || 0}
                                        onChange={(e) => {
                                          const val = Math.max(0, Number(e.target.value) || 0);
                                          const updated = [...inputFloorConfigs];
                                          const rTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
                                            ? [...cfg.roomTypes] 
                                            : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
                                          
                                          rTypes[rtIdx] = { ...rTypes[rtIdx], count: val };
                                          
                                          updated[index] = {
                                            ...cfg,
                                            roomTypes: rTypes,
                                            roomsCount: rTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0)
                                          };
                                          handleUpdateFloorConfigs(updated);
                                        }}
                                        className="w-16 h-9 text-center text-sm font-bold font-mono bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#cca43b]/40 shrink-0"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...inputFloorConfigs];
                                          const rTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
                                            ? [...cfg.roomTypes] 
                                            : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
                                          
                                          const currentCount = Number(rTypes[rtIdx].count) || 0;
                                          rTypes[rtIdx] = { ...rTypes[rtIdx], count: currentCount + 1 };
                                          
                                          updated[index] = {
                                            ...cfg,
                                            roomTypes: rTypes,
                                            roomsCount: rTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0)
                                          };
                                          handleUpdateFloorConfigs(updated);
                                        }}
                                        className="w-9 h-9 bg-emerald-500/10 hover:bg-emerald-505/20 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-base cursor-pointer border border-emerald-200/20 transition-all active:scale-90 shrink-0"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...inputFloorConfigs];
                                        const rTypes = cfg.roomTypes && cfg.roomTypes.length > 0 
                                          ? [...cfg.roomTypes] 
                                          : [{ type: cfg.roomType || 'غرفة زوجية', count: Number(cfg.roomsCount) || 0 }];
                                        
                                        if (rTypes.length <= 1) {
                                          alert('يجب أن يحتوي الطابق على تصنيف واحد من الغرف على الأقل!');
                                          return;
                                        }

                                        rTypes.splice(rtIdx, 1);
                                        updated[index] = {
                                          ...cfg,
                                          roomTypes: rTypes,
                                          roomsCount: rTypes.reduce((sum, rt) => sum + (Number(rt.count) || 0), 0)
                                        };
                                        handleUpdateFloorConfigs(updated);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                                      title="حذف هذا التصنيف"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Instant Update Signal */}
                <div className="flex items-center gap-1.5 bg-[#cca43b]/10 text-[#cca43b] p-2.5 rounded-xl border border-[#cca43b]/20 text-[10px] font-bold mt-4">
                  <span className="animate-ping inline-block w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                  <span>تحديث نشط وتلقائي: سيتم ترحيل وحفظ كافة تصنيفات هيكلة الغرف والطوابق وتحديث المخططات ومشاركة التغييرات مع النظام بنجاح وفوراً.</span>
                </div>
              </div>

              {/* Add Single Room Line Form */}
              <div className="bg-slate-100/40 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-205 dark:border-slate-850 space-y-3">
                <span className="text-[10.5px] font-black text-slate-750 dark:text-slate-305 block">إضافة منفردة لغرفة جديدة (إضافة يدوية):</span>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-right">
                  <input
                    type="text"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value.replace(/\D/g, ''))}
                    placeholder="رقم الغرفة (مثال: 104)"
                    className="w-full text-xs px-3 py-2 border border-slate-350 bg-white dark:bg-slate-900 rounded-xl font-bold dark:text-white"
                  />
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-350 bg-white dark:bg-slate-900 rounded-xl font-bold dark:text-white cursor-pointer"
                  >
                    <option value="غرفة فردية">غرفة فردية</option>
                    <option value="غرفة زوجية">غرفة زوجية</option>
                    <option value="غرفة ثلاثية">غرفة ثلاثية</option>
                    <option value="غرفة رباعية">غرفة رباعية</option>
                    <option value="غرفة خماسية">غرفة خماسية</option>
                    <option value="غرفة سداسية">غرفة سداسية</option>
                    <option value="غرفة عائلية">غرفة عائلية</option>
                    <option value="غرفة ممتازة">غرفة ممتازة</option>
                    <option value="جناح">جناح فاخر</option>
                  </select>
                  {(() => {
                    const defaultFloors = [
                      "الطابق الأرضي",
                      "الطابق الأول",
                      "الطابق الثاني",
                      "الطابق الثالث",
                      "الطابق الرابع",
                      "الطابق الخامس",
                      "الطابق السادس",
                      "الطابق السابع",
                      "الملحق / البنهاوس"
                    ];
                    const isDefault = defaultFloors.includes(newRoomFloorName);
                    const selectValue = isDefault ? newRoomFloorName : ((newRoomFloorName && newRoomFloorName !== '') ? 'custom' : '');

                    return (
                      <div className="space-y-1.5 w-full">
                        <select
                          value={selectValue || "الطابق الأول"}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setNewRoomFloorName('');
                            } else {
                              setNewRoomFloorName(val);
                            }
                          }}
                          className="w-full text-xs px-3 py-2 border border-slate-350 bg-white dark:bg-slate-900 rounded-xl font-bold dark:text-white cursor-pointer"
                        >
                          <option value="" disabled>-- اختر اسم الطابق --</option>
                          {defaultFloors.map(f => (
                            <option key={f} value={f}>{f}</option>
                            ))}
                          <option value="custom">كتابة يدوية / اسم مخصص...</option>
                        </select>
                        {(!isDefault || selectValue === 'custom') && (
                          <input
                            type="text"
                            value={newRoomFloorName}
                            onChange={(e) => setNewRoomFloorName(e.target.value)}
                            placeholder="اكتب اسم الطابق يدويًا هنا..."
                            className="w-full text-xs px-3 py-2 border border-slate-350 bg-white dark:bg-slate-900 rounded-xl font-bold dark:text-white animate-in slide-in-from-top-1"
                          />
                        )}
                      </div>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => {
                      const trimmedId = newRoomId.trim();
                      if (!trimmedId) return;
                      if (inputHotelRooms.some(r => r.id === trimmedId)) {
                        alert('عذراً! رقم الغرفة هذا مسجل مسبقاً في خطة الفندق.');
                        return;
                      }
                      setInputHotelRooms(prev => [
                        ...prev, 
                        { 
                          id: trimmedId, 
                          floor: trimmedId[0] || '1', 
                          floorName: newRoomFloorName.trim() || 'الطابق الأول والوحيد', 
                          type: newRoomType
                        }
                      ]);
                      setNewRoomId('');
                    }}
                    className="bg-[#0b3c5d] hover:bg-slate-800 text-white font-black text-xs py-2 px-4 rounded-xl cursor-pointer"
                  >
                    إضافة للغرف
                  </button>
                </div>
              </div>

              {/* Rooms list table filter within settings */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={roomSettingsSearch}
                  onChange={(e) => setRoomSettingsSearch(e.target.value)}
                  placeholder="اكتب رقم الغرفة للبحث والتعديل الفوري..."
                  className="w-full text-xs px-4 py-2.5 border border-slate-300 bg-white dark:bg-slate-900 rounded-xl font-bold dark:text-white"
                />

                <div className="max-h-[220px] overflow-y-auto border border-slate-200 dark:border-slate-800/80 rounded-2xl">
                  <table className="w-full text-right text-[11px] font-bold bg-white dark:bg-slate-900/40">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500">
                      <tr>
                        <th className="p-2">رقم الغرفة</th>
                        <th className="p-2">النوع / الفئة فندقياً</th>
                        <th className="p-2">اسم الطابق المخصص (يمكن تعديله)</th>
                        <th className="p-2 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredRoomsListInSettings.map((room) => {
                        const overallIndex = inputHotelRooms.indexOf(room);
                        return (
                          <tr key={room.id} className="hover:bg-slate-55 dark:hover:bg-slate-950/20">
                            <td className="p-2">
                              <input
                                type="text"
                                value={room.id}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  setInputHotelRooms(prev => {
                                    const copy = [...prev];
                                    if (overallIndex !== -1) {
                                      copy[overallIndex] = { 
                                        ...copy[overallIndex], 
                                        id: val,
                                        floor: getFloorIdFromName(copy[overallIndex].floorName || 'الطابق الأول', val)
                                      };
                                    }
                                    return copy;
                                  });
                                }}
                                className="bg-transparent font-mono font-bold border-b border-dashed border-slate-250 dark:border-slate-800 focus:ring-0 text-slate-800 dark:text-slate-200 text-[11px] w-20 text-center"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={room.type}
                                onChange={(e) => {
                                  setInputHotelRooms(prev => {
                                    const copy = [...prev];
                                    if (overallIndex !== -1) {
                                      copy[overallIndex] = { ...copy[overallIndex], type: e.target.value };
                                    }
                                    return copy;
                                  });
                                }}
                                className="bg-transparent font-medium border-b border-dashed border-slate-250 dark:border-slate-800/60 p-0.5 focus:ring-0 text-slate-805 dark:text-slate-105 cursor-pointer text-[11px]"
                              >
                                <option value="غرفة فردية">غرفة فردية</option>
                                <option value="غرفة زوجية">غرفة زوجية</option>
                                <option value="غرفة ثلاثية">غرفة ثلاثية</option>
                                <option value="غرفة رباعية">غرفة رباعية</option>
                                <option value="غرفة خماسية">غرفة خماسية</option>
                                <option value="غرفة سداسية">غرفة سداسية</option>
                                <option value="غرفة عائلية">غرفة عائلية</option>
                                <option value="غرفة ممتازة">غرفة ممتازة</option>
                                <option value="جناح">جناح</option>
                              </select>
                            </td>
                            <td className="p-2">
                              {(() => {
                                const defaultFloors = [
                                  "الطابق الأرضي",
                                  "الطابق الأول",
                                  "الطابق الثاني",
                                  "الطابق الثالث",
                                  "الطابق الرابع",
                                  "الطابق الخامس",
                                  "الطابق السادس",
                                  "الطابق السابع",
                                  "الملحق / البنهاوس"
                                ];
                                const isDefault = defaultFloors.includes(room.floorName);
                                const selectValue = isDefault ? room.floorName : ((room.floorName && room.floorName !== '') ? 'custom' : '');

                                return (
                                  <div className="space-y-1">
                                    <select
                                      value={selectValue || "الطابق الأول"}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInputHotelRooms(prev => {
                                          const copy = [...prev];
                                          if (overallIndex !== -1) {
                                            const finalFloorName = val === 'custom' ? '' : val;
                                            copy[overallIndex] = { 
                                              ...copy[overallIndex], 
                                              floorName: finalFloorName,
                                              floor: getFloorIdFromName(finalFloorName, copy[overallIndex].id)
                                            };
                                          }
                                          return copy;
                                        });
                                      }}
                                      className="bg-transparent font-bold border-b border-dashed border-slate-250 dark:border-slate-800 focus:ring-0 text-slate-800 dark:text-slate-200 text-[11px] w-full max-w-[140px] cursor-pointer"
                                    >
                                      <option value="" disabled>-- اختر الطابق --</option>
                                      {defaultFloors.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                      ))}
                                      <option value="custom">مخصص...</option>
                                    </select>
                                    {(!isDefault || selectValue === 'custom') && (
                                      <input
                                        type="text"
                                        value={room.floorName}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setInputHotelRooms(prev => {
                                            const copy = [...prev];
                                            if (overallIndex !== -1) {
                                              copy[overallIndex] = { 
                                                ...copy[overallIndex], 
                                                floorName: val,
                                                floor: getFloorIdFromName(val, copy[overallIndex].id)
                                              };
                                            }
                                            return copy;
                                          });
                                        }}
                                        className="bg-transparent font-bold border-b border-dashed border-slate-250 dark:border-slate-800 focus:ring-0 text-slate-850 dark:text-slate-100 text-[11px] w-full"
                                        placeholder="اكتبه يدويًا..."
                                      />
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف الغرفة ${room.id} تماماً من تقسيم الفندق الهندسي؟`)) {
                                    setInputHotelRooms(prev => prev.filter(r => r.id !== room.id));
                                  }
                                }}
                                className="text-rose-600 hover:text-red-700 bg-red-500/5 hover:bg-red-500/10 p-1 px-2 rounded font-black text-[9.5px]"
                              >
                                حذف
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            {/* Rooms Per Row Config */}
            <div className="bg-slate-50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn mt-6">
              <div className="flex items-center gap-2.5">
                <div>
                  <h5 className="text-[12px] font-black text-[#cca43b] dark:text-amber-400 font-bold">عدد بطاقات الغرف في السَّطر الواحد لمستخدمي الحاسوب (Desktop)</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    قم باختيار أو تحديد عدد بطاقات الغرف التي ترغب بظهورها متجاورة في السطر الواحد لتلائم شاشتك المكتبية أو شاشة الحاسب المحمول بدقة متناهية وتضمن لك الرؤية المثالية والتحكم الأفضل للغرف والاستقبال.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                {[3, 4, 5, 6, 7, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setInputRoomsPerRowDesktop(num)}
                    className={`py-2 px-3 rounded-xl text-center text-xs font-black cursor-pointer transition-all border ${
                      inputRoomsPerRowDesktop === num
                        ? 'bg-amber-500 text-slate-900 border-[#cca43b] font-extrabold shadow-md scale-102'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800'
                    }`}
                  >
                    {num} غرف / سطر
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Unified Sticky-like Bottom Save Button Bar */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6 flex flex-col sm:flex-row justify-end items-center gap-4">
            <button
              type="submit"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black px-8 py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 select-none"
            >
              <CheckCircle className="w-4 h-4" />
              <span>حفظ وتطبيق إعدادات النظام الموحدة</span>
            </button>
          </div>

          {hotelSettingsSuccess && (
            <div className="fixed bottom-6 right-6 bg-emerald-600 border border-emerald-500 p-4.5 rounded-2xl text-white font-extrabold text-xs flex items-center gap-2 shadow-2xl animate-bounce z-[100]">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>تم تحديث وحفظ كافة البيانات الفندقية والتخطيط بنجاح! تم التزامن.</span>
            </div>
          )}
        </form>
      </div>


    </div>
  );
}
