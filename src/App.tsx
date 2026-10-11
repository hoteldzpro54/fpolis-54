import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Guest, UserRole, RoomStatusValue, RoomStatus, HotelSettings, AppNotification, NotificationType, UserProfile } from './types';
import { loadGuests, saveGuests, generateId, loadRoomStatuses, saveRoomStatuses, loadHotelSettings, saveHotelSettings, replaceMarqadWithHotel, addDaysToDateString, calculateNights, getRequiredPaidNights, calculatePeriodCheckout, calculateGuestTotalCost, getFilledPeriods, getGuestActivePeriods, getAdjustedCheckInDate, getLocalDateString } from './utils';
import { 
  requestPersistentStorage, 
  getOrRestoreCollection, 
  persistLocalDatabase, 
  getLocalStorageItem,
  enqueueMutation,
  getPendingMutations,
  removeQueuedMutation,
  clearSyncQueue,
  getDatabaseHealth,
  runDatabaseIntegrityCheck,
  DatabaseHealthStatus
} from './localDb';
import GuestForm from './components/GuestForm';
import PrintableForm from './components/PrintableForm';
import SettingsScreen from './components/SettingsScreen';
import { BrandLogo } from './components/BrandLogo';
import { LogOut, Lock, Shield, Eye, EyeOff, Sun, Moon, UserPlus, Edit3, Palette, Sparkles, Sliders, Menu, MoreHorizontal, Bell, ChevronDown, ChevronUp, Check, Users, Database, Printer, ChevronRight, ChevronLeft, Wrench, UserCheck, Settings, Clock, Phone, AlertTriangle, Calendar, DollarSign, Info, RefreshCw, FileText } from 'lucide-react';


// Firebase imports
import { db, auth, OperationType, handleFirestoreError, isPlaceholderConfig, cleanFirestorePayload, testConnection } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, signInAnonymously } from 'firebase/auth';

// Helper to dynamically check for Master Admin status based on lowercase username
const MASTER_USERNAMES = ['admin', 'manager', 'supervisor', 'hotel', 'inn', 'reception', 'staff'];
const isMasterAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const username = lower.split('@')[0];
  return MASTER_USERNAMES.includes(username);
};

// Safe helper to parse local date string avoiding timezone/UTC offset day shift bugs (handles both YYYY-MM-DD and DD/MM/YYYY)
const parseLocalYMD = (dateStr: string | null | undefined): { year: number, month: number, day: number } | null => {
  if (!dateStr) return null;
  const parts = dateStr.split(/[-/]/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  
  // If the last part has 4 digits, it's DD/MM/YYYY format
  if (parts[2] >= 1000) {
    return {
      year: parts[2],
      month: parts[1] - 1, // 0-indexed in JS
      day: parts[0]
    };
  }
  // Otherwise, assume YYYY-MM-DD format
  return {
    year: parts[0],
    month: parts[1] - 1, // 0-indexed in JS
    day: parts[2]
  };
};

// Formats overdue minutes into detailed Arabic text (X days, Y hours, Z minutes)
const formatDelayTime = (minutes: number): string => {
  if (minutes <= 0) return '0 دقيقة';
  const days = Math.floor(minutes / (24 * 60));
  const remainingMinutesAfterDays = minutes % (24 * 60);
  const hours = Math.floor(remainingMinutesAfterDays / 60);
  const finalMinutes = remainingMinutesAfterDays % 60;

  const parts = [];
  if (days > 0) {
    if (days === 1) parts.push('يوم واحد');
    else if (days === 2) parts.push('يومين');
    else if (days >= 3 && days <= 10) parts.push(`${days} أيام`);
    else parts.push(`${days} يوماً`);
  }
  if (hours > 0) {
    if (hours === 1) parts.push('ساعة واحدة');
    else if (hours === 2) parts.push('ساعتين');
    else if (hours >= 3 && hours <= 10) parts.push(`${hours} ساعات`);
    else parts.push(`${hours} ساعة`);
  }
  if (finalMinutes > 0 || parts.length === 0) {
    if (finalMinutes === 1) parts.push('دقيقة واحدة');
    else if (finalMinutes === 2) parts.push('دقيقتين');
    else if (finalMinutes >= 3 && finalMinutes <= 10) parts.push(`${finalMinutes} دقائق`);
    else parts.push(`${finalMinutes} دقيقة`);
  }
  return parts.join(' و ');
};

export default function App() {
  const [role, setRole] = useState<UserRole>('receptionist');
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [globalAlert, setGlobalAlert] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalAlert = window.alert;
    window.alert = (message: string) => {
      const isSuccess = message.includes('بنجاح') || message.includes('تم') || message.includes('نجاح') || message.includes('تأكيد');
      setGlobalAlert({
        message,
        type: isSuccess ? 'success' : 'warning'
      });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    if (!globalAlert) return;
    const timer = setTimeout(() => {
      setGlobalAlert(null);
    }, globalAlert.type === 'success' ? 4500 : 7000);
    return () => clearTimeout(timer);
  }, [globalAlert]);
  const [activeTab, setActiveTab] = useState<'form' | 'settings'>('form'); // Default to guest form
  const [settingsSection, setSettingsSection] = useState<'info' | 'rooms_config'>('info');
  const [receptionistPin, setReceptionistPin] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('receptionistPin') || '1111';
    }
    return '1111';
  });
  const [policePin, setPolicePin] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('policePin') || '2222';
    }
    return '2222';
  });
  
  // Real-time synced memory arrays (bootstrapped with local backup cache first)
  const [guests, setGuests] = useState<Guest[]>(() => loadGuests());
  const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatusValue>>(() => loadRoomStatuses());

  const [hotelSettings, setHotelSettings] = useState<HotelSettings>(() => loadHotelSettings());

  const [isLocalDbOnly, setIsLocalDbOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = getLocalStorageItem('hotel_palms_use_local_db_only');
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return isPlaceholderConfig;
  });

  const subNavRef = useRef<HTMLDivElement>(null);
  const [subNavDrag, setSubNavDrag] = useState({ isDragging: false, startX: 0, scrollLeft: 0 });

  const handleSubNavMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!subNavRef.current) return;
    const scrollContainer = subNavRef.current;
    const startX = e.pageX - scrollContainer.offsetLeft;
    const scrollLeft = scrollContainer.scrollLeft;
    setSubNavDrag({
      isDragging: true,
      startX,
      scrollLeft
    });
  };

  const handleSubNavMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!subNavRef.current || !subNavDrag.isDragging) return;
    e.preventDefault();
    const scrollContainer = subNavRef.current;
    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = (x - subNavDrag.startX) * 1.5;
    scrollContainer.scrollLeft = subNavDrag.scrollLeft - walk;
  };

  const handleSubNavMouseUpOrLeave = () => {
    if (subNavDrag.isDragging) {
      setSubNavDrag(prev => ({ ...prev, isDragging: false }));
    }
  };

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = getLocalStorageItem("hotel-palms-notifications");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem("local_staff_profiles");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  
  // Real-time rental period overdue alerts persistent manager states
  const [dismissedOverdueIds, setDismissedOverdueIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("hotel_palms_dismissed_overdue_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isOverdueHubCollapsed, setIsOverdueHubCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("hotel_palms_overdue_hub_collapsed");
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [isOverdueHubHidden, setIsOverdueHubHidden] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("hotel_palms_overdue_hub_hidden");
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const handleDismissOverdueAlert = (guestId: string) => {
    setDismissedOverdueIds(prev => {
      const next = [...prev, guestId];
      localStorage.setItem("hotel_palms_dismissed_overdue_ids", JSON.stringify(next));
      return next;
    });
  };

  const handleResetDismissedOverdueAlerts = () => {
    setDismissedOverdueIds([]);
    localStorage.removeItem("hotel_palms_dismissed_overdue_ids");
  };

  const handleToggleOverdueHubCollapsed = () => {
    setIsOverdueHubCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("hotel_palms_overdue_hub_collapsed", JSON.stringify(next));
      return next;
    });
  };

  const handleToggleOverdueHubHidden = (hidden: boolean) => {
    setIsOverdueHubHidden(hidden);
    localStorage.setItem("hotel_palms_overdue_hub_hidden", JSON.stringify(hidden));
  };

  const [pageConfigs, setPageConfigs] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined') {
      const saved = getLocalStorageItem('hotel_palms_page_configs');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Fallback on json corrupt
        }
      }
    }
    return {
      rooms: {
        viewMode: 'grid',
        showOccupantNames: true,
        defaultFloor: 'all'
      },
      form: {
        defaultNationality: 'جزائرية',
        defaultIdType: 'بطاقة تعريف وطنية',
        showKeyboardAssistant: false
      },
      registry: {
        registryDensity: 'spacious',
        pageSize: '20',
        policeOnlyFilter: false
      },
      notes: {
        enableAlertAudio: true,
        defaultChannel: 'all'
      }
    };
  });

  const handleSavePageConfigs = (tab: string, updatedConfigs: Record<string, any>) => {
    setPageConfigs(prev => {
      const next = { ...prev, [tab]: updatedConfigs };
      localStorage.setItem('hotel_palms_page_configs', JSON.stringify(next));
      return next;
    });
  };

  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => {
    return {
      uid: 'local_receptionist_secret_admin',
      isAnonymous: false,
      displayName: 'المدير العام (دخول سري آمن)',
      email: 'manager@hotel-or-inn.com',
      emailVerified: true,
    } as unknown as User;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDbRestored, setIsDbRestored] = useState(false);
  const isExplicitSignOutRef = useRef(false);

  // Robust Database Stability and Synchronization Controls
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => {
    const saved = localStorage.getItem("hotel_palms_pending_sync_count");
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const isRealUser = Boolean(
    firebaseUser && 
    !firebaseUser.uid.startsWith('local_receptionist_') && 
    !firebaseUser.uid.startsWith('police_bypass_') &&
    !isLocalDbOnly
  );

  const resilientFirestoreWrite = async (
    collectionName: string,
    docId: string,
    action: 'set' | 'update' | 'delete',
    payload?: any
  ) => {
    if (!isRealUser) return;
    const cleanData = payload ? cleanFirestorePayload(payload) : undefined;
    
    try {
      const docRef = doc(db, collectionName, docId);
      if (action === 'set') {
        await setDoc(docRef, cleanData);
      } else if (action === 'update') {
        await updateDoc(docRef, cleanData);
      } else if (action === 'delete') {
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.warn(`[Resilient DB] Write to ${collectionName}/${docId} issue encountered, queued offline safely:`, error);
      await enqueueMutation({
        collectionName,
        docId,
        action,
        payload: cleanData
      });
      setPendingSyncCount(prev => prev + 1);
    }
  };

  const flushSyncQueue = async () => {
    if (!isRealUser || !navigator.onLine) return;
    try {
      const pending = await getPendingMutations();
      if (pending.length === 0) {
        setPendingSyncCount(0);
        return;
      }
      for (const item of pending) {
        try {
          const docRef = doc(db, item.collectionName, item.docId);
          if (item.action === 'set') {
            await setDoc(docRef, cleanFirestorePayload(item.payload));
          } else if (item.action === 'update') {
            await updateDoc(docRef, cleanFirestorePayload(item.payload));
          } else if (item.action === 'delete') {
            await deleteDoc(docRef);
          }
          await removeQueuedMutation(item.id);
        } catch (e) {
          console.warn(`[Flush Queue] Write for ${item.collectionName}/${item.docId} will retry later:`, e);
          break;
        }
      }
      const remaining = await getPendingMutations();
      setPendingSyncCount(remaining.length);
    } catch (e) {
      console.warn("[Flush Queue] Queue processing notice:", e);
    }
  };

  // Background Sync Queue Processor: auto-flushes queued mutations with exponential retry
  useEffect(() => {
    if (!isRealUser) return;

    let isSyncing = false;
    const processQueue = async () => {
      if (isSyncing || !navigator.onLine) return;
      isSyncing = true;
      try {
        await flushSyncQueue();
      } finally {
        isSyncing = false;
      }
    };

    processQueue();
    const interval = setInterval(processQueue, 15000);
    const handleOnline = () => { processQueue(); };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [isRealUser]);

  // Deep Database Integrity & Self-Healing on application start
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await runDatabaseIntegrityCheck(loadGuests(), (healedGuests) => {
          setGuests(healedGuests);
          saveGuests(healedGuests);
        });
      } catch (err) {
        console.warn("Startup database integrity check warning:", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleSaveProfile = async (profileData: UserProfile) => {
    setProfiles((prev) => {
      const filtered = prev.filter((p) => p.username.toLowerCase() !== profileData.username.toLowerCase());
      const updated = [...filtered, profileData];
      localStorage.setItem("local_staff_profiles", JSON.stringify(updated));
      return updated;
    });

    if (isRealUser) {
      await resilientFirestoreWrite('profiles', profileData.username.toLowerCase(), 'set', profileData);
    }
  };

  const handleDeleteProfile = async (username: string) => {
    setProfiles((prev) => {
      const updated = prev.filter((p) => p.username.toLowerCase() !== username.toLowerCase());
      localStorage.setItem("local_staff_profiles", JSON.stringify(updated));
      return updated;
    });

    if (isRealUser) {
      await resilientFirestoreWrite('profiles', username.toLowerCase(), 'delete');
    }
  };

  const handleUpdateHotelSettings = async (settings: HotelSettings) => {
    const updated = { ...settings, lastModified: Date.now() };
    setHotelSettings(updated);
    saveHotelSettings(updated);
    
    // Sync to Firestore
    if (isRealUser) {
      await resilientFirestoreWrite('settings', 'hotel_info', 'set', updated);
    }
  };

  // Authorized emails list
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>([
    'manager@hotel-or-inn.com',
    'admin@hotel-or-inn.com',
    'receptionist@hotel-or-inn.com'
  ]);
  const [manualUsers, setManualUsers] = useState<{username: string, password: string}[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manualUsers');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const [printingGuest, setPrintingGuest] = useState<Guest | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isEnteringData, setIsEnteringData] = useState(false);
  const [isRoomPanelOpen, setIsRoomPanelOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [selectedRoomGlobal, setSelectedRoomGlobal] = useState<string | null>(null);

  const [collapsedNotificationIds, setCollapsedNotificationIds] = useState<string[]>(() => {
    try {
      const stored = getLocalStorageItem("hotel_palms_collapsed_notifications");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedNotificationCategory, setSelectedNotificationCategory] = useState<string | null>(null);
  const [expandedNotificationGroups, setExpandedNotificationGroups] = useState<Record<string, boolean>>({});

  const toggleCollapseNotification = (id: string) => {
    setCollapsedNotificationIds(prev => {
      const updated = prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id];
      localStorage.setItem("hotel_palms_collapsed_notifications", JSON.stringify(updated));
      return updated;
    });
  };
  const darkMode = false;

  const currentUsername = firebaseUser?.email?.split('@')[0] || (role === 'police' ? 'الشرطة_الوطنية' : 'receptionist');

  const pendingNotifications = notifications.filter(n => {
    const isUnconfirmed = !n.confirmedBy?.includes(currentUsername);
    if (role === 'police') {
      // For police: show coordinator chat, check-ins, and check-outs only
      return isUnconfirmed && (n.type === 'police_message' || n.type === 'new_guest' || n.type === 'guest_checkout');
    }
    return isUnconfirmed;
  });

  // Dynamic overdue guest calculations for real-time notification alerts
  const overdueGuestAlerts = useMemo(() => {
    if (hotelSettings?.enableApprovedRentalCalculation === false) return [];

    const activeGuests = guests.filter(g => !g.checkoutConfirmed);
    const now = Date.now();

    return activeGuests.map(g => {
      let checkInMillis = 0;
      if (g.checkInDate && g.checkInTime) {
        try {
          checkInMillis = new Date(`${g.checkInDate}T${g.checkInTime}`).getTime();
        } catch {
          checkInMillis = 0;
        }
      }
      if (!checkInMillis || isNaN(checkInMillis)) {
        const ts = g.timestamp;
        if (ts) {
          if (typeof ts === 'number') {
            checkInMillis = ts;
          } else if (typeof (ts as any).toDate === 'function') {
            checkInMillis = (ts as any).toDate().getTime();
          } else if (typeof (ts as any).seconds === 'number') {
            checkInMillis = (ts as any).seconds * 1000;
          } else {
            const parsed = new Date(ts as any).getTime();
            checkInMillis = isNaN(parsed) ? now : parsed;
          }
        } else {
          checkInMillis = now;
        }
      }

      let expectedCheckOutMillis = checkInMillis;

      const hourlyRate = g.baseRate || hotelSettings?.hourlyRate || 500;
      const paidAmount = typeof g.paidAmount === 'number' ? g.paidAmount : 0;
      const pricingMode = hotelSettings?.globalPricingMode || g.pricingMode || 'daily';

      if (pricingMode === 'hourly') {
        // Calculate paid hours
        const paidHours = hourlyRate > 0 ? Math.floor(paidAmount / hourlyRate) : g.stayDurationHours || 3;
        const totalHours = Math.max(1, paidHours) + (g.extraPaidHours || 0);
        expectedCheckOutMillis = checkInMillis + (totalHours * 60 * 60 * 1000);
      } else {
        // Daily mode
        const targetDateStr = g.isIndefiniteStay ? g.expectedCheckOutDate : g.checkOutDate;
        const inDate = new Date(checkInMillis);
        const [endH, endM] = (hotelSettings?.defaultCheckOutTime || "12:00").split(':').map(Number);
        
        if (targetDateStr) {
          try {
            const parts = targetDateStr.split('-');
            let outDate: Date;
            if (parts.length === 3) {
              outDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
              outDate = new Date(targetDateStr);
            }
            outDate.setHours(endH, endM, 0, 0);
            expectedCheckOutMillis = outDate.getTime();
          } catch {
            const outDate = new Date(inDate);
            outDate.setDate(inDate.getDate() + 1);
            outDate.setHours(endH, endM, 0, 0);
            expectedCheckOutMillis = outDate.getTime();
          }
        } else {
          const dailyRate = g.baseRate || hotelSettings?.defaultRatePerNight || 7000;
          const paidNights = dailyRate > 0 ? Math.floor(paidAmount / dailyRate) : 1;
          const totalNights = Math.max(1, paidNights);
          
          const outDate = new Date(inDate);
          outDate.setDate(inDate.getDate() + totalNights);
          outDate.setHours(endH, endM, 0, 0);
          expectedCheckOutMillis = outDate.getTime();
        }
      }

      // Check if overdue
      const diffMinutes = Math.floor((now - expectedCheckOutMillis) / (1000 * 60));
      const margin = 30; // 30 minutes grace margin

      if (diffMinutes > margin) {
        const delayHours = Math.ceil(diffMinutes / 60);
        const resolvedBaseRate = g.baseRate || (pricingMode === 'hourly' ? (hotelSettings?.hourlyRate || 500) : (hotelSettings?.defaultRatePerNight || 7000));
        
        // Calculate precise details
        let actualNightsOrHours = 1;
        let totalCostUpToNow = 0;
        if (pricingMode === 'hourly') {
          actualNightsOrHours = Math.max(1, Math.ceil((now - checkInMillis) / (1000 * 60 * 60)));
          totalCostUpToNow = actualNightsOrHours * resolvedBaseRate;
        } else {
          actualNightsOrHours = Math.max(1, Math.ceil((now - checkInMillis) / (1000 * 60 * 60 * 24)));
          totalCostUpToNow = actualNightsOrHours * resolvedBaseRate;
        }
        const remainingRequiredPayment = Math.max(0, totalCostUpToNow - paidAmount);

        const computedPaidNightsCount = pricingMode === 'hourly' 
          ? (hourlyRate > 0 ? Math.floor(paidAmount / hourlyRate) : g.stayDurationHours || 3)
          : (g.paidDays !== undefined && g.paidDays !== null && g.paidDays >= 0 ? g.paidDays : (resolvedBaseRate > 0 ? Math.floor(paidAmount / resolvedBaseRate) : 1));

        return {
          id: g.id,
          guestName: `${g.firstNameAr || ''} ${g.lastNameAr || ''}`.trim() || `نزيل الغرفة ${g.roomNumber}`,
          roomNumber: g.roomNumber,
          delayMinutes: diffMinutes,
          isNewPeriod: diffMinutes > 240, // 4 hours delay is considered a new period
          penaltyFee: delayHours * (hotelSettings?.hourlyRate || 500),
          classificationName: pricingMode === 'hourly' ? 'إيجار ساعي' : 'إيجار يومي',
          isPaid: !!g.isPaid,
          paidDays: g.paidDays ?? 0,
          phoneNumber: g.phoneNumber || 'غير مسجل',
          checkInDate: g.checkInDate,
          checkInTime: g.checkInTime || '12:00',
          checkOutDate: g.isIndefiniteStay ? (g.expectedCheckOutDate || 'مفتوح') : (g.checkOutDate || 'غير محدد'),
          paidAmount: paidAmount,
          baseRate: resolvedBaseRate,
          pricingMode: pricingMode,
          actualDuration: actualNightsOrHours,
          totalCostUpToNow: totalCostUpToNow,
          remainingRequiredPayment: remainingRequiredPayment,
          idType: g.idType || 'بطاقة تعريف وطنية',
          idNumber: g.idNumber || 'غير مسجل',
          paidNightsCount: Math.max(1, computedPaidNightsCount)
        };
      }
      return null;
    }).filter(Boolean) as {
      id: string;
      guestName: string;
      roomNumber: string;
      delayMinutes: number;
      isNewPeriod: boolean;
      penaltyFee: number;
      classificationName: string;
      isPaid: boolean;
      paidDays: number;
      phoneNumber: string;
      checkInDate: string;
      checkInTime: string;
      checkOutDate: string;
      paidAmount: number;
      baseRate: number;
      pricingMode: string;
      actualDuration: number;
      totalCostUpToNow: number;
      remainingRequiredPayment: number;
      idType: string;
      idNumber: string;
      paidNightsCount: number;
    }[];
  }, [guests, hotelSettings]);

  const activeOverdueAlerts = useMemo(() => {
    return overdueGuestAlerts.filter(alert => !dismissedOverdueIds.includes(alert.id));
  }, [overdueGuestAlerts, dismissedOverdueIds]);

  // Page visibility helper and automatic redirect effect
  const isPageEnabled = (pageId: string): boolean => {
    const alwaysEnabled = ['notes', 'profiles'];
    if (alwaysEnabled.includes(pageId)) return true;
    const enabled = hotelSettings?.enabledPages || ['rooms', 'registry', 'form', 'settings', 'notes', 'profiles'];
    return enabled.includes(pageId);
  };

  const handleNavigateGuestHub = () => {
    setEditingGuest(null);
    setActiveTab('form');
  };

  const handleNavigateOperationsHub = () => {
    setEditingGuest(null);
    setActiveTab('settings');
  };

  useEffect(() => {
    if (activeTab !== 'form' && activeTab !== 'settings') {
      setActiveTab('form');
    }
  }, [activeTab]);

  // 1. Firebase Auth state listener with fast verify
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (user.isAnonymous) {
          setFirebaseUser(user);
          setRole('police');
          setActiveTab('form'); // Default view for policing
          setIsAuthLoading(false);
        } else {
          // Authenticated user. Check if authorized in DB or fallbacks
          try {
            const docSnap = await getDocFromServer(doc(db, 'settings', 'authorized_emails'));
            let allowed: string[] = [];
            if (docSnap.exists() && Array.isArray(docSnap.data()?.allowedEmails)) {
              allowed = docSnap.data().allowedEmails;
            }
            const userEmail = user.email?.toLowerCase() || '';
            const isAllowed = isMasterAdminEmail(userEmail) || allowed.map(e => e.toLowerCase()).includes(userEmail) || userEmail.endsWith('@hotel-or-inn.com');
            if (isAllowed) {
              setFirebaseUser(user);
              setRole('receptionist');
              setAuthError(null);
            } else {
              setAuthError(`اسم المستخدم (${user.email?.split('@')[0] || ''}) غير مصرح له بالولوج إلى النظام. لا يمكن لأي حساب عشوائي الدخول بدون تصريح مسبق.`);
              await signOut(auth);
              setFirebaseUser(null);
              setRole(null);
            }
          } catch (err) {
            // offline fallback
            const userEmail = user.email?.toLowerCase() || '';
            const isAllowed = isMasterAdminEmail(userEmail) || userEmail.endsWith('@hotel-or-inn.com');
            if (isAllowed) {
              setFirebaseUser(user);
              setRole('receptionist');
              setAuthError(null);
            } else {
              setAuthError(`عذراً، فشل التحقق من تصاريح هويتك من قاعدة البيانات.`);
              await signOut(auth);
              setFirebaseUser(null);
              setRole(null);
            }
          }
          setIsAuthLoading(false);
        }
      } else {
        setFirebaseUser(prev => {
          if (!isExplicitSignOutRef.current && prev && (prev.uid.startsWith('police_bypass_') || prev.uid.startsWith('local_receptionist_'))) {
            return prev; // Retain local mock police & receptionist user sessions across async triggers
          }
          setRole(null);
          return null;
        });
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 1.5 Secure Hardware-level Local Database Restoration
  useEffect(() => {
    async function initAndRestoreLocalDB() {
      try {
        await requestPersistentStorage();
        await getOrRestoreCollection('hotel-palms-guests', 'guests', guests, setGuests);
        await getOrRestoreCollection('hotel-palms-room-statuses', 'room_statuses', roomStatuses, setRoomStatuses);
        await getOrRestoreCollection('hotel-palms-hotel-settings', 'hotel_settings', hotelSettings, setHotelSettings);
        await getOrRestoreCollection('hotel-palms-notifications', 'notifications', notifications, setNotifications);
        await getOrRestoreCollection('local_staff_profiles', 'profiles', profiles, setProfiles);
      } catch (err) {
        console.error("[Local DB] Init or restore error background bypass:", err);
      } finally {
        setIsDbRestored(true);
      }
    }
    initAndRestoreLocalDB();
  }, []);

  // 1.55 Live Local Database state-watching synchronized background backup
  useEffect(() => {
    if (isDbRestored) {
      persistLocalDatabase('hotel-palms-guests', 'guests', guests).catch(() => {});
    }
  }, [guests, isDbRestored]);

  useEffect(() => {
    if (isDbRestored) {
      persistLocalDatabase('hotel-palms-room-statuses', 'room_statuses', roomStatuses).catch(() => {});
    }
  }, [roomStatuses, isDbRestored]);

  useEffect(() => {
    if (isDbRestored) {
      persistLocalDatabase('hotel-palms-hotel-settings', 'hotel_settings', hotelSettings).catch(() => {});
    }
  }, [hotelSettings, isDbRestored]);

  useEffect(() => {
    if (isDbRestored) {
      persistLocalDatabase('hotel-palms-notifications', 'notifications', notifications).catch(() => {});
    }
  }, [notifications, isDbRestored]);



  useEffect(() => {
    if (isDbRestored) {
      persistLocalDatabase('local_staff_profiles', 'profiles', profiles).catch(() => {});
    }
  }, [profiles, isDbRestored]);

  // Handle immediate update of all React States from the local backup storage
  const handleRefreshAllLocalData = () => {
    try {
      setGuests(loadGuests());
      setRoomStatuses(loadRoomStatuses());
      setHotelSettings(loadHotelSettings());
      
      const savedNotifs = getLocalStorageItem("hotel-palms-notifications");
      if (savedNotifs) {
        setNotifications(JSON.parse(savedNotifs));
      }
      
      const savedProfiles = localStorage.getItem("local_staff_profiles");
      if (savedProfiles) {
        setProfiles(JSON.parse(savedProfiles));
      }

      const savedRecepPin = localStorage.getItem('receptionistPin');
      if (savedRecepPin) {
        setReceptionistPin(savedRecepPin);
      }

      const savedPolicePin = localStorage.getItem('policePin');
      if (savedPolicePin) {
        setPolicePin(savedPolicePin);
      }

      const savedUsersList = localStorage.getItem('manualUsers');
      if (savedUsersList) {
        setManualUsers(JSON.parse(savedUsersList));
      }
      console.log("🔄 React State refreshed successfully from the latest Local Database!");
    } catch (e) {
      console.error("Failed to refresh state variables from Local Database:", e);
    }
  };

  // 2. Validate connection to Firestore on initial boot
  useEffect(() => {
    async function testConnection() {
      if (isPlaceholderConfig) {
        console.log("ℹ️ Default/remixed demo credentials detected. Running in seamless local-first mode.");
        return;
      }
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Firebase test connection indicates that the client is offline. Operating in local backup mode.");
        }
      }
    }
    testConnection();
  }, []);

  // 3. Real-Time Firestore Synced Subscribers (Only attach if authenticated/ready and not in local mode)
  useEffect(() => {
    if (!firebaseUser || isLocalDbOnly) return;

    const isMockUser = firebaseUser.uid.startsWith('police_bypass_') || firebaseUser.uid.startsWith('local_receptionist_');
    if (isMockUser) return;

    // A. Guests collection listener
    const unsubscribeGuests = onSnapshot(
      collection(db, 'guests'),
      (snapshot) => {
        const loaded: Guest[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ ...(doc.data() as Guest), id: doc.id });
        });
        // Sort descending by registration timestamp
        loaded.sort((a, b) => b.timestamp - a.timestamp);
        // Guarantee 100% unique IDs
        const seen = new Set<string>();
        const uniqueLoaded = loaded.filter(g => {
          const identifier = g.id || '';
          if (!identifier || seen.has(identifier)) return false;
          seen.add(identifier);
          return true;
        });
        setGuests(uniqueLoaded);
        saveGuests(uniqueLoaded); // sync backup
      },
      (error) => {
        if (auth.currentUser) {
          handleFirestoreError(error, OperationType.GET, 'guests');
        } else {
          console.warn("Guests snapshot error suppressed due to sign-out or mock session:", error);
        }
      }
    );

    // C. Rooms status collection listener
    const unsubscribeRooms = onSnapshot(
      collection(db, 'rooms'),
      (snapshot) => {
        const records: Record<string, RoomStatusValue> = {};
        snapshot.forEach((doc) => {
          const room = doc.data() as RoomStatus;
          records[room.roomId] = room.status;
        });
        setRoomStatuses(records);
        saveRoomStatuses(records); // sync backup
      },
      (error) => {
        if (auth.currentUser) {
          handleFirestoreError(error, OperationType.GET, 'rooms');
        } else {
          console.warn("Rooms snapshot error suppressed due to sign-out or mock session:", error);
        }
      }
    );

    // D. Hotel settings collection listener
    const unsubscribeHotel = onSnapshot(
      doc(db, 'settings', 'hotel_info'),
      (docSnap) => {
        if (docSnap.exists()) {
          const synced = replaceMarqadWithHotel(docSnap.data() as HotelSettings);
          const currentLocal = loadHotelSettings();
          if (!currentLocal.lastModified || (synced.lastModified && synced.lastModified > currentLocal.lastModified)) {
            setHotelSettings(synced);
            saveHotelSettings(synced);
          } else {
            console.log("[Sync Bypass] Retained newer local hotel settings over older/reverted server snapshot.");
          }
        }
      },
      (error) => {
        console.warn("Hotel settings subscription error suppressed:", error);
      }
    );

    // E. Notifications collection listener
    const unsubscribeNotifications = onSnapshot(
      collection(db, 'notifications'),
      (snapshot) => {
        const loaded: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ ...(docSnap.data() as AppNotification), id: docSnap.id });
        });
        loaded.sort((a, b) => b.timestamp - a.timestamp);
        const seen = new Set<string>();
        const uniqueLoaded = loaded.filter(n => {
          if (!n.id || seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        setNotifications(uniqueLoaded);
        localStorage.setItem("hotel-palms-notifications", JSON.stringify(uniqueLoaded));
      },
      (error) => {
        console.warn("Notifications subscription error suppressed:", error);
      }
    );

    // G. Profiles collection listener
    const unsubscribeProfiles = onSnapshot(
      collection(db, 'profiles'),
      (snapshot) => {
        const loaded: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ ...(docSnap.data() as UserProfile), username: docSnap.id });
        });
        setProfiles(loaded);
        localStorage.setItem("local_staff_profiles", JSON.stringify(loaded));
      },
      (error) => {
        console.warn("Profiles subscription error suppressed:", error);
      }
    );

    return () => {
      unsubscribeGuests();
      unsubscribeRooms();
      unsubscribeHotel();
      unsubscribeNotifications();
      unsubscribeProfiles();
    };
  }, [firebaseUser]);

  // 4. Real-time Synced Subscriber for Settings/Authorized Emails & Manual Users
  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;

    const isMockUser = firebaseUser.uid.startsWith('police_bypass_') || firebaseUser.uid.startsWith('local_receptionist_');
    if (isMockUser) return;

    const unsubscribeEmails = onSnapshot(
      doc(db, 'settings', 'authorized_emails'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.allowedEmails)) {
            const merged = Array.from(new Set([
              'manager@hotel-or-inn.com',
              'admin@hotel-or-inn.com',
              ...data.allowedEmails
            ]));
            setAuthorizedEmails(merged);
          }
        }
      },
      (error) => {
        if (auth.currentUser) {
          console.error("Error loading settings/authorized_emails: ", error);
        } else {
          console.warn("Settings/authorized_emails error suppressed due to sign-out or mock session:", error);
        }
      }
    );

    const unsubscribeManual = onSnapshot(
      doc(db, 'settings', 'manual_users'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.users)) {
            setManualUsers(data.users);
            localStorage.setItem('manualUsers', JSON.stringify(data.users));
          }
        }
      },
      (error) => {
        console.warn("Could not load manual_users from Firestore:", error);
      }
    );

    return () => {
      unsubscribeEmails();
      unsubscribeManual();
    };
  }, [firebaseUser, isLocalDbOnly]);

  // Email & Password authentication handlers
  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      setAuthError(null);

      // Check manually configured credentials first
      const inputUsername = email.split('@')[0].trim().toLowerCase();
      const matchedManual = manualUsers.find(u => u.username.toLowerCase().trim() === inputUsername);
      if (matchedManual) {
        if (matchedManual.password === password) {
          const mockUser = {
            uid: 'local_receptionist_manual_' + inputUsername,
            isAnonymous: false,
            displayName: `الموظف ${matchedManual.username}`,
            email: `${inputUsername}@hotel-or-inn.com`,
            emailVerified: true,
          } as unknown as User;

          // Double check they are represented in authorized state to keep consistency
          const emailToInsert = `${inputUsername}@hotel-or-inn.com`;
          if (!authorizedEmails.map(e => e.toLowerCase()).includes(emailToInsert)) {
            setAuthorizedEmails(prev => [...prev, emailToInsert]);
          }

          setFirebaseUser(mockUser);
          setRole('receptionist');
          setAuthError(null);
          return;
        } else {
          const errorMsg = "الرمز السري أو كلمة المرور غير صحيحة.";
          setAuthError(errorMsg);
          throw new Error(errorMsg);
        }
      }

      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes('auth/operation-not-allowed'))) {
        console.warn("Email/Password auth is not enabled in Firebase Console. Falling back to high-fidelity simulated local session to bypass blocking.");
        const username = email.split('@')[0];
        const mockUser = {
          uid: 'local_receptionist_' + Math.random().toString(36).substring(2, 9),
          isAnonymous: false,
          displayName: `الموظف ${username} (محلي مؤقت)`,
          email: email.includes('@') ? email : `${email}@hotel-or-inn.com`,
          emailVerified: true,
        } as unknown as User;
        setFirebaseUser(mockUser);
        setRole('receptionist');
        setAuthError(null);
        return;
      }
      console.error("Email Sign-In Error: ", error);
      let localizedError = "البريد الإلكتروني أو كلمة المرور المدخلة غير صحيحة.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        localizedError = "البريد الإلكتروني أو كلمة المرور المدخلة غير صحيحة.";
      } else if (error.code === 'auth/invalid-email') {
        localizedError = "يرجى إدخال بريد إلكتروني صحيح كصيغة (example@domain.com).";
      } else if (error.code === 'auth/too-many-requests') {
        localizedError = "تم حظر محاولات الدخول مؤقتاً بسبب تكرار كلمة المرور الخاطئة. يرجى المحاولة لاحقاً.";
      }
      setAuthError(localizedError);
      throw error;
    }
  };

  const handleEmailSignUp = async (email: string, password: string) => {
    try {
      setAuthError(null);
      
      // Enforce the 6-operator limit
      if (authorizedEmails.length >= 6) {
        const errMsg = "تنبيه أمني: لقد تم تجاوز الحد الأقصى المسموح به لمشغلي التطبيق وموظفي الاستقبال (6 مستخدمين كحد أقصى). يرجى مراجعة إدارة الفندق لإلغاء تفعيل حسابات قديمة ثانية.";
        setAuthError(errMsg);
        throw new Error(errMsg);
      }

      await createUserWithEmailAndPassword(auth, email, password);

      // Auto-save this new email to the database-authorized list
      const emailToInsert = email.trim().toLowerCase();
      if (!authorizedEmails.map(e => e.toLowerCase()).includes(emailToInsert)) {
        const newList = [...authorizedEmails, emailToInsert];
        setAuthorizedEmails(newList);
        try {
          const filtered = newList.filter(e => !isMasterAdminEmail(e));
          await setDoc(doc(db, 'settings', 'authorized_emails'), {
            allowedEmails: filtered
          });
        } catch (dbErr) {
          console.warn("Could not save new sign-up directly to settings/authorized_emails:", dbErr);
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes('auth/operation-not-allowed'))) {
        console.warn("Email/Password registration is not enabled in Firebase. Falling back to high-fidelity simulated local session.");
        const username = email.split('@')[0];
        const mockUser = {
          uid: 'local_receptionist_' + Math.random().toString(36).substring(2, 9),
          isAnonymous: false,
          displayName: `الموظف الجديد ${username} (محلي مؤقت)`,
          email: email.includes('@') ? email : `${email}@hotel-or-inn.com`,
          emailVerified: true,
        } as unknown as User;

        // Auto-save mock user to list too
        const emailToInsert = mockUser.email?.toLowerCase() || '';
        if (emailToInsert && !authorizedEmails.map(e => e.toLowerCase()).includes(emailToInsert)) {
          const newList = [...authorizedEmails, emailToInsert];
          setAuthorizedEmails(newList);
        }

        setFirebaseUser(mockUser);
        setRole('receptionist');
        setAuthError(null);
        return;
      }
      console.error("Email Sign-Up Error: ", error);
      let localizedError = error.message || "فشل إنشاء الحساب الجديد في قواعد بيانية الفندق.";
      if (error.code === 'auth/email-already-in-use') {
        localizedError = "هذا البريد الإلكتروني مسجل بالفعل في حساب موظف آخر.";
      } else if (error.code === 'auth/weak-password') {
        localizedError = "كلمة المرور ضعيفة جداً. يرجى كتابة 6 خانات أو أحرف على الأقل.";
      } else if (error.code === 'auth/invalid-email') {
        localizedError = "يرجى إدخال بريد إلكتروني صحيح كصيغة (example@domain.com).";
      }
      setAuthError(localizedError);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      isExplicitSignOutRef.current = true;
      setFirebaseUser(null);
      setRole(null); // automatically lock screen
      await signOut(auth);
    } catch (error) {
      console.error("Sign-Out Error: ", error);
    } finally {
      setTimeout(() => {
        isExplicitSignOutRef.current = false;
      }, 1000);
    }
  };

  const handleReceptionistBypass = async () => {
    // Construct a high-fidelity local Mock User to act as receptionist in offline/disabled auth environments
    const mockRepUser = {
      uid: 'local_receptionist_' + Math.random().toString(36).substring(2, 9),
      isAnonymous: false,
      displayName: 'موظف الاستقبال (المزامنة المحلية)',
      email: 'local_receptionist@hotel-or-inn.com',
      emailVerified: true,
    } as unknown as User;
    
    setFirebaseUser(mockRepUser);
    // Note: Do not pre-set role here, let the user enter their 4-digit PIN '1111' to complete standard sequence
    setIsAuthLoading(false);
  };

  const handleSecretAdminBypass = async () => {
    // Construct a local admin/manager mock details that maps to isMasterAdminEmail
    const adminUser = {
      uid: 'local_receptionist_secret_admin',
      isAnonymous: false,
      displayName: 'المدير العام (دخول سري آمن)',
      email: 'manager@hotel-or-inn.com',
      emailVerified: true,
    } as unknown as User;
    
    setFirebaseUser(adminUser);
    setRole('receptionist');
    setActiveTab('rooms');
    setIsAuthLoading(false);
  };

  const handleAddAuthorizedEmail = async (email: string) => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    
    // Check limit first
    if (authorizedEmails.length >= 6) {
      const errMsg = "تنبيه أمني: لقد تم تجاوز الحد الأقصى المسموح به لمشغلي التطبيق وموظفي الاستقبال (6 مستخدمين كحد أقصى). يرجى مرافقة إدارة الفندق لإلغاء تفعيل حسابات قديمة ثانية.";
      throw new Error(errMsg);
    }

    // Add to authorized emails in state first so fast visual transition is displayed
    const emailToInsert = email.trim().toLowerCase();
    const currentList = authorizedEmails.filter(e => e.toLowerCase() !== emailToInsert);
    const newList = [...currentList, emailToInsert];
    setAuthorizedEmails(newList);

    // Save to Firestore settings document
    try {
      const filtered = newList.filter(e => !isMasterAdminEmail(e));
      await setDoc(doc(db, 'settings', 'authorized_emails'), {
        allowedEmails: filtered
      });
    } catch (error) {
      console.error("Failed to add authorized email to DB: ", error);
      throw error;
    }
  };

  const handleRemoveAuthorizedEmail = async (email: string) => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;

    const emailToRemove = email.trim().toLowerCase();
    const newList = authorizedEmails.filter(e => e.toLowerCase() !== emailToRemove);
    setAuthorizedEmails(newList);

    // Save to Firestore settings document
    try {
      const filtered = newList.filter(e => !isMasterAdminEmail(e));
      await setDoc(doc(db, 'settings', 'authorized_emails'), {
        allowedEmails: filtered
      });
    } catch (error) {
      console.error("Failed to remove authorized email from DB: ", error);
      throw error;
    }
  };

  const handleAddManualUser = async (username: string, password: string) => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;

    // Check limit on combined manual + authorized emails
    const activeManualCount = manualUsers.filter(mu => !authorizedEmails.map(ae => ae.split('@')[0]).includes(mu.username)).length;
    const activeAuthorizedCount = authorizedEmails.filter(email => {
      const lower = email.toLowerCase();
      return !isMasterAdminEmail(email) && !lower.includes('gmail.com');
    }).length;

    if (activeManualCount + activeAuthorizedCount >= 6) {
      const errMsg = "تنبيه أمني: لقد تم تجاوز الحد الأقصى المسموح به لمشغلي التطبيق وموظفي الاستقبال (6 مستخدمين كحد أقصى). يرجى مراجعة إدارة الفندق لإلغاء تفعيل حسابات قديمة ثانية.";
      throw new Error(errMsg);
    }

    const lowerUsername = username.trim().toLowerCase();
    const isAlreadyManual = manualUsers.some(u => u.username.toLowerCase().trim() === lowerUsername);
    if (isAlreadyManual) {
      throw new Error("اسم المستخدم هذا مضاف بالفعل.");
    }

    const newUser = { username: lowerUsername, password: password.trim() };
    const updatedUsers = [...manualUsers.filter(u => u.username.toLowerCase() !== lowerUsername), newUser];
    setManualUsers(updatedUsers);
    localStorage.setItem('manualUsers', JSON.stringify(updatedUsers));

    try {
      await setDoc(doc(db, 'settings', 'manual_users'), {
        users: updatedUsers
      });
    } catch (err) {
      console.warn("Could not save manual user to DB, stored locally:", err);
    }
  };

  const handleRemoveManualUser = async (username: string) => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;

    const lowerUsername = username.trim().toLowerCase();
    const updatedUsers = manualUsers.filter(u => u.username.toLowerCase().trim() !== lowerUsername);
    setManualUsers(updatedUsers);
    localStorage.setItem('manualUsers', JSON.stringify(updatedUsers));

    try {
      await setDoc(doc(db, 'settings', 'manual_users'), {
        users: updatedUsers
      });
    } catch (err) {
      console.warn("Could not remove manual user from DB:", err);
    }
  };

  const handleUpdateManualUsers = async (updatedUsers: { username: string; password: string }[]) => {
    setManualUsers(updatedUsers);
    localStorage.setItem('manualUsers', JSON.stringify(updatedUsers));

    try {
      await setDoc(doc(db, 'settings', 'manual_users'), {
        users: updatedUsers
      });
    } catch (err) {
      console.warn("Could not update manual users list inside DB:", err);
    }
  };

  // Watch and apply dark theme (force light mode)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, []);

  // Smooth scroll to top on tab changes or starting guest edit for seamless fluid UX
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, editingGuest]);

  const [colorTheme, setColorTheme] = useState<'emerald' | 'royal' | 'constantine' | 'oran-blue' | 'tlemcen-gold'>('emerald');

  const [zelligeOpacity, setZelligeOpacity] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zelligeOpacity');
      return saved ? parseInt(saved, 10) : 55;
    }
    return 55;
  });

  const [buttonSize, setButtonSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('buttonSize');
      return saved ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  const [buttonSpacing, setButtonSpacing] = useState<'compact' | 'normal' | 'relaxed'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('buttonSpacing') as 'compact' | 'normal' | 'relaxed') || 'normal';
    }
    return 'normal';
  });

  const [buttonAlignment, setButtonAlignment] = useState<'right' | 'left' | 'justified'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('buttonAlignment') as 'right' | 'left' | 'justified') || 'right';
    }
    return 'right';
  });

  // Watch and apply custom coloring theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-color-theme', colorTheme);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  // Persist sliders values
  useEffect(() => {
    localStorage.setItem('zelligeOpacity', String(zelligeOpacity));
  }, [zelligeOpacity]);

  useEffect(() => {
    localStorage.setItem('buttonSize', String(buttonSize));
  }, [buttonSize]);

  useEffect(() => {
    localStorage.setItem('buttonSpacing', buttonSpacing);
  }, [buttonSpacing]);

  useEffect(() => {
    localStorage.setItem('buttonAlignment', buttonAlignment);
  }, [buttonAlignment]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // Global cursor input focus watcher for immediate hiding of top logo brand
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setIsInputFocused(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || !['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
          setIsInputFocused(false);
        }
      }, 50);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Reset data entry indicator when tab changes
  useEffect(() => {
    if (activeTab !== 'form') {
      setIsEnteringData(false);
    }
  }, [activeTab]);

  // Firestore & local state writing proxies
  const triggerNotification = async (type: NotificationType, title: string, content: string) => {
    const newNotify: AppNotification = {
      id: generateId(),
      type,
      title,
      content,
      timestamp: Date.now(),
      confirmedBy: []
    };
    
    setNotifications(prev => {
      const updated = [newNotify, ...prev];
      localStorage.setItem("hotel-palms-notifications", JSON.stringify(updated));
      return updated;
    });

    if (isRealUser) {
      await resilientFirestoreWrite('notifications', newNotify.id, 'set', newNotify);
    }
  };

  const handleConfirmNotification = async (id: string) => {
    const username = firebaseUser?.email?.split('@')[0] || (role === 'police' ? 'الشرطة_الوطنية' : 'receptionist');
    
    setNotifications(prev => {
      const updated = prev.map(n => {
        if (n.id === id) {
          const confirmedBy = n.confirmedBy.includes(username) ? n.confirmedBy : [...n.confirmedBy, username];
          return { ...n, confirmedBy };
        }
        return n;
      });
      localStorage.setItem("hotel-palms-notifications", JSON.stringify(updated));
      return updated;
    });

    if (isRealUser) {
      const notif = notifications.find(n => n.id === id) || { confirmedBy: [] as string[] };
      const updatedConfirmedBy = notif.confirmedBy.includes(username) ? notif.confirmedBy : [...notif.confirmedBy, username];
      await resilientFirestoreWrite('notifications', id, 'update', {
        confirmedBy: updatedConfirmedBy
      });
    }
  };

  const handleConfirmMultipleNotifications = async (ids: string[]) => {
    const username = firebaseUser?.email?.split('@')[0] || (role === 'police' ? 'الشرطة_الوطنية' : 'receptionist');
    
    setNotifications(prev => {
      const updated = prev.map(n => {
        if (ids.includes(n.id)) {
          const confirmedBy = n.confirmedBy.includes(username) ? n.confirmedBy : [...n.confirmedBy, username];
          return { ...n, confirmedBy };
        }
        return n;
      });
      localStorage.setItem("hotel-palms-notifications", JSON.stringify(updated));
      return updated;
    });

    if (isRealUser) {
      await Promise.all(ids.map(async (id) => {
        const notif = notifications.find(n => n.id === id) || { confirmedBy: [] as string[] };
        const updatedConfirmedBy = notif.confirmedBy.includes(username) ? notif.confirmedBy : [...notif.confirmedBy, username];
        await resilientFirestoreWrite('notifications', id, 'update', {
          confirmedBy: updatedConfirmedBy
        });
      }));
    }
  };

  const handleAddGuest = async (newGuest: Guest) => {
    if (role === 'receptionist') {
      // Ensure paidDays, isPaid, and checkOutDate are fully linked/bound
      const selectedPeriods = newGuest.selectedPeriods;
      const hasPeriods = selectedPeriods && Object.values(selectedPeriods).some(count => count > 0);
      if (hasPeriods) {
        const checkInDate = newGuest.checkInDate || getLocalDateString();
        const checkInTime = newGuest.checkInTime || '08:00';
        const filledPeriods = getFilledPeriods(checkInTime, selectedPeriods, hotelSettings?.rentalPeriods);
        newGuest.selectedPeriods = filledPeriods;
        
        const periodCheckout = calculatePeriodCheckout(checkInDate, checkInTime, filledPeriods, hotelSettings?.rentalPeriods);
        newGuest.checkOutDate = periodCheckout.checkOutDate;
        newGuest.expectedCheckOutDate = periodCheckout.checkOutDate;
        
        const expectedCost = calculateGuestTotalCost(newGuest, hotelSettings).totalCost;
        const paidAmount = newGuest.paidAmount || 0;
        newGuest.isPaid = paidAmount >= expectedCost;
      } else {
        const pricingMode = newGuest.pricingMode || hotelSettings?.globalPricingMode || 'daily';
        if (pricingMode === 'daily') {
          if (newGuest.paidDays !== undefined) {
            newGuest.isPaid = newGuest.paidDays >= 0;
            const checkInDate = newGuest.checkInDate || getLocalDateString();
            const paidNights = newGuest.paidDays;
            const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, newGuest.checkInTime);
            if (newGuest.isIndefiniteStay) {
              newGuest.checkOutDate = paidNights > 0 ? addDaysToDateString(adjustedCheckIn, paidNights) : "";
            } else {
              newGuest.checkOutDate = newGuest.checkOutDate || (paidNights > 0 ? addDaysToDateString(adjustedCheckIn, paidNights) : checkInDate);
            }
          } else if (newGuest.checkOutDate !== undefined && newGuest.checkOutDate !== '') {
            const checkInDate = newGuest.checkInDate || getLocalDateString();
            const checkOutDate = newGuest.checkOutDate;
            const computedNights = calculateNights(checkInDate, checkOutDate, newGuest.isLateCheckout, hotelSettings, newGuest.checkInTime, newGuest.checkoutConfirmed);
            const baseRate = newGuest.baseRate || hotelSettings?.defaultRatePerNight || 7000;
            const paidAmount = typeof newGuest.paidAmount === 'number' ? newGuest.paidAmount : 0;
            const computedPaidDays = baseRate > 0 ? Math.floor(paidAmount / baseRate) : computedNights;
            newGuest.paidDays = Math.min(computedNights, Math.max(0, computedPaidDays));
            newGuest.isPaid = newGuest.paidDays >= 0;
          } else if (newGuest.isPaid !== undefined) {
            const currentPaidDays = newGuest.paidDays ?? 0;
            if (newGuest.isPaid && currentPaidDays < 0) {
              newGuest.paidDays = 0;
              const checkInDate = newGuest.checkInDate || getLocalDateString();
              newGuest.checkOutDate = newGuest.checkOutDate || checkInDate;
            } else if (!newGuest.isPaid && currentPaidDays >= 0) {
              newGuest.paidDays = -1;
              const checkInDate = newGuest.checkInDate || getLocalDateString();
              newGuest.checkOutDate = newGuest.checkOutDate || checkInDate;
            }
          } else {
            newGuest.paidDays = 0;
            newGuest.isPaid = true;
            const checkInDate = newGuest.checkInDate || getLocalDateString();
            newGuest.checkOutDate = newGuest.checkOutDate || checkInDate;
          }
        } else {
          // Hourly mode
          if (newGuest.paidDays !== undefined) {
            newGuest.isPaid = newGuest.paidDays >= 0;
          } else if (newGuest.isPaid !== undefined) {
            const currentPaidDays = newGuest.paidDays ?? 0;
            if (newGuest.isPaid && currentPaidDays < 0) {
              newGuest.paidDays = 0;
            } else if (!newGuest.isPaid && currentPaidDays >= 0) {
              newGuest.paidDays = -1;
            }
          } else {
            newGuest.paidDays = 0;
            newGuest.isPaid = true;
          }
        }
      }

      const isRoomBasis = false;
      let nextGuests: Guest[] = [];

      setGuests(prev => {
        let updated = [...prev, newGuest];

        if (isRoomBasis) {
          const referenceGuest = newGuest;
          const keysToSync: Array<keyof Guest> = [
            'checkInDate', 'checkInTime', 'checkOutDate', 'isLateCheckout',
            'baseRate', 'paidAmount', 'paymentHistory', 'roomRateType',
            'pricingMode', 'discountAmount', 'extraBreakfast', 'extraParking',
            'extraDinner', 'extraLaundry', 'checkoutConfirmed', 'actualCheckOutDate'
          ];
          updated = updated.map(g => {
            if (g.roomNumber === newGuest.roomNumber && !(g.checkOutDate && g.checkoutConfirmed) && g.id !== newGuest.id) {
              const updatedFields: Partial<Guest> = {};
              keysToSync.forEach(key => {
                if (referenceGuest[key] !== undefined) {
                  (updatedFields as any)[key] = referenceGuest[key];
                }
              });
              return { ...g, ...updatedFields };
            }
            return g;
          });
        }

        nextGuests = updated;
        saveGuests(nextGuests);
        return nextGuests;
      });
      
      // Auto transition room status to 'occupied'
      await handleUpdateRoomStatus(newGuest.roomNumber, 'occupied');

      triggerNotification(
        'new_guest',
        'دخول نزيل جديد',
        `تم تسجيل دخول نزيل جديد في الغرفة رقم ${newGuest.roomNumber}: ${newGuest.firstNameAr} ${newGuest.lastNameAr}`
      );

      if (isRealUser) {
        await resilientFirestoreWrite('guests', newGuest.id, 'set', newGuest);
        if (isRoomBasis) {
          const otherActiveRoomGuests = guests.filter(g => g.roomNumber === newGuest.roomNumber && !(g.checkOutDate && g.checkoutConfirmed) && g.id !== newGuest.id);
          for (const og of otherActiveRoomGuests) {
            const keysToSync: Array<keyof Guest> = [
              'checkInDate', 'checkInTime', 'checkOutDate', 'isLateCheckout',
              'baseRate', 'paidAmount', 'paymentHistory', 'roomRateType',
              'pricingMode', 'discountAmount', 'extraBreakfast', 'extraParking',
              'extraDinner', 'extraLaundry', 'checkoutConfirmed', 'actualCheckOutDate'
            ];
            const syncFields: Partial<Guest> = {};
            keysToSync.forEach(key => {
              if (newGuest[key] !== undefined) {
                (syncFields as any)[key] = newGuest[key];
              }
            });
            await resilientFirestoreWrite('guests', og.id, 'set', { ...og, ...syncFields });
          }
        }
      }
    }
  };

  const handleUpdateGuest = async (guestId: string, fieldsToUpdate: Partial<Guest>) => {
    if (role === 'receptionist') {
      const targetGuest = guests.find(g => g.id === guestId);
      const guestName = targetGuest ? `${targetGuest.firstNameAr} ${targetGuest.lastNameAr}` : "نزيل";
      const roomNum = targetGuest ? targetGuest.roomNumber : "";

      // Ensure paidDays, isPaid, and checkOutDate are fully linked/bound
      if (targetGuest) {
        const selectedPeriods = fieldsToUpdate.selectedPeriods !== undefined ? fieldsToUpdate.selectedPeriods : targetGuest.selectedPeriods;
        const hasPeriods = selectedPeriods && Object.values(selectedPeriods).some((count: any) => count > 0);
        
        if (hasPeriods) {
          const checkInDate = fieldsToUpdate.checkInDate || targetGuest.checkInDate || getLocalDateString();
          const checkInTime = fieldsToUpdate.checkInTime || targetGuest.checkInTime || '08:00';
          
          // Use selectedPeriods directly as is without overriding via getFilledPeriods to prevent frozen buttons
          fieldsToUpdate.selectedPeriods = selectedPeriods;
          
          const periodCheckout = calculatePeriodCheckout(checkInDate, checkInTime, selectedPeriods, hotelSettings?.rentalPeriods);
          fieldsToUpdate.checkOutDate = periodCheckout.checkOutDate;
          fieldsToUpdate.expectedCheckOutDate = periodCheckout.checkOutDate;
          
          const expectedCost = calculateGuestTotalCost({ ...targetGuest, ...fieldsToUpdate, selectedPeriods }, hotelSettings).totalCost;
          
          if (fieldsToUpdate.isPaid !== undefined) {
            if (fieldsToUpdate.isPaid) {
              fieldsToUpdate.paidAmount = expectedCost;
            } else {
              fieldsToUpdate.paidAmount = Math.max(0, expectedCost - 1);
            }
          } else {
            const paidAmount = fieldsToUpdate.paidAmount !== undefined ? fieldsToUpdate.paidAmount : (targetGuest.paidAmount || 0);
            fieldsToUpdate.isPaid = paidAmount >= expectedCost;
          }
        } else if (fieldsToUpdate.selectedPeriods !== undefined) {
          // If the periods have been completely cleared (all counts are 0)
          fieldsToUpdate.selectedPeriods = {};
          // Fallback to standard daily/hourly logic
          const pricingMode = fieldsToUpdate.pricingMode || targetGuest.pricingMode || hotelSettings?.globalPricingMode || 'daily';
          if (pricingMode === 'daily') {
            const checkInDate = fieldsToUpdate.checkInDate || targetGuest.checkInDate || getLocalDateString();
            const required = getRequiredPaidNights(checkInDate, hotelSettings, targetGuest.checkInTime);
            const baseRate = fieldsToUpdate.baseRate || targetGuest.baseRate || hotelSettings?.defaultRatePerNight || 7000;
            const paidAmount = typeof fieldsToUpdate.paidAmount === 'number' ? fieldsToUpdate.paidAmount : (typeof targetGuest.paidAmount === 'number' ? targetGuest.paidAmount : 0);
            
            const computedNights = calculateNights(checkInDate, fieldsToUpdate.checkOutDate || targetGuest.checkOutDate || checkInDate, fieldsToUpdate.isLateCheckout !== undefined ? fieldsToUpdate.isLateCheckout : targetGuest.isLateCheckout, hotelSettings, targetGuest.checkInTime, fieldsToUpdate.checkoutConfirmed !== undefined ? fieldsToUpdate.checkoutConfirmed : targetGuest.checkoutConfirmed);
            const computedPaidDays = baseRate > 0 ? Math.floor(paidAmount / baseRate) : computedNights;
            
            fieldsToUpdate.paidDays = Math.min(computedNights, Math.max(0, computedPaidDays));
            const isIndefinite = targetGuest.isIndefiniteStay || fieldsToUpdate.isIndefiniteStay;
            fieldsToUpdate.isPaid = fieldsToUpdate.paidDays >= (isIndefinite ? required : computedNights);
          }
        } else {
          // Standard logic when guest doesn't have periods and is not setting them
          const pricingMode = fieldsToUpdate.pricingMode || targetGuest.pricingMode || hotelSettings?.globalPricingMode || 'daily';
          if (pricingMode === 'daily') {
            const checkInDate = fieldsToUpdate.checkInDate || targetGuest.checkInDate || getLocalDateString();
            const required = getRequiredPaidNights(checkInDate, hotelSettings, targetGuest.checkInTime);

            const isIndefinite = targetGuest.isIndefiniteStay || fieldsToUpdate.isIndefiniteStay;
            const checkOutDate = fieldsToUpdate.checkOutDate || targetGuest.checkOutDate || checkInDate;
            const bookedNights = calculateNights(checkInDate, checkOutDate, fieldsToUpdate.isLateCheckout !== undefined ? fieldsToUpdate.isLateCheckout : targetGuest.isLateCheckout, hotelSettings, targetGuest.checkInTime, fieldsToUpdate.checkoutConfirmed !== undefined ? fieldsToUpdate.checkoutConfirmed : targetGuest.checkoutConfirmed);

            if (fieldsToUpdate.paidDays !== undefined) {
              const paidNights = fieldsToUpdate.paidDays;
              const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, targetGuest.checkInTime);
              if (isIndefinite) {
                fieldsToUpdate.checkOutDate = paidNights > 0 ? addDaysToDateString(adjustedCheckIn, paidNights) : "";
                fieldsToUpdate.isPaid = paidNights >= required;
              } else {
                fieldsToUpdate.checkOutDate = paidNights > 0 ? addDaysToDateString(adjustedCheckIn, paidNights) : checkInDate;
                fieldsToUpdate.isPaid = paidNights >= bookedNights;
              }
            } else if (fieldsToUpdate.checkOutDate !== undefined && fieldsToUpdate.checkOutDate !== '') {
              const baseRate = fieldsToUpdate.baseRate || targetGuest.baseRate || hotelSettings?.defaultRatePerNight || 7000;
              const paidAmount = typeof fieldsToUpdate.paidAmount === 'number' ? fieldsToUpdate.paidAmount : (typeof targetGuest.paidAmount === 'number' ? targetGuest.paidAmount : 0);
              const computedPaidDays = baseRate > 0 ? Math.floor(paidAmount / baseRate) : bookedNights;
              fieldsToUpdate.paidDays = Math.min(bookedNights, Math.max(0, computedPaidDays));
              fieldsToUpdate.isPaid = fieldsToUpdate.paidDays >= (isIndefinite ? required : bookedNights);
            } else if (fieldsToUpdate.isPaid !== undefined) {
              const currentPaidDays = targetGuest.paidDays ?? 0;
              if (fieldsToUpdate.isPaid) {
                const targetNights = isIndefinite ? required : bookedNights;
                const paidNights = Math.max(targetNights, currentPaidDays);
                fieldsToUpdate.paidDays = paidNights;
                const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, targetGuest.checkInTime);
                if (isIndefinite) {
                  fieldsToUpdate.checkOutDate = addDaysToDateString(adjustedCheckIn, paidNights);
                } else {
                  fieldsToUpdate.checkOutDate = checkOutDate;
                }
                const baseRate = targetGuest.baseRate || hotelSettings?.defaultRatePerNight || 7000;
                fieldsToUpdate.paidAmount = paidNights * baseRate;
              } else {
                const targetNights = isIndefinite ? required : bookedNights;
                const paidNights = Math.max(0, targetNights - 1);
                fieldsToUpdate.paidDays = paidNights;
                const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, targetGuest.checkInTime);
                if (isIndefinite) {
                  fieldsToUpdate.checkOutDate = addDaysToDateString(adjustedCheckIn, paidNights);
                } else {
                  fieldsToUpdate.checkOutDate = checkOutDate;
                }
                const baseRate = targetGuest.baseRate || hotelSettings?.defaultRatePerNight || 7000;
                fieldsToUpdate.paidAmount = paidNights * baseRate;
              }
            } else if (fieldsToUpdate.checkInDate !== undefined) {
              const paidNights = targetGuest.paidDays ?? 0;
              if (isIndefinite) {
                fieldsToUpdate.checkOutDate = paidNights > 0 ? addDaysToDateString(checkInDate, paidNights) : "";
                fieldsToUpdate.isPaid = paidNights >= required;
              } else {
                fieldsToUpdate.checkOutDate = checkOutDate;
                fieldsToUpdate.isPaid = paidNights >= bookedNights;
              }
            }
          } else {
            // Hourly mode
            if (fieldsToUpdate.paidDays !== undefined) {
              fieldsToUpdate.isPaid = fieldsToUpdate.paidDays >= 0;
            } else if (fieldsToUpdate.isPaid !== undefined) {
              const currentPaidDays = targetGuest.paidDays ?? 0;
              if (fieldsToUpdate.isPaid && currentPaidDays < 0) {
                fieldsToUpdate.paidDays = 0;
              } else if (!fieldsToUpdate.isPaid && currentPaidDays >= 0) {
                fieldsToUpdate.paidDays = -1;
              }
            }
          }
        }
      }

      if (fieldsToUpdate.checkoutConfirmed === true) {
        triggerNotification(
          'guest_checkout',
          'خروج ومغادرة نزيل',
          `تم تأكيد مغادرة النزيل ${guestName} وإخلاء الغرفة رقم ${roomNum}`
        );

        // Auto transition old room to 'dirty' if there are no more active guests left
        if (roomNum) {
          const remainingGuests = guests.filter(g => 
            g.roomNumber === roomNum && 
            g.id !== guestId && 
            !(g.checkOutDate && g.checkoutConfirmed)
          );
          if (remainingGuests.length === 0) {
            await handleUpdateRoomStatus(roomNum, 'dirty');
          }
        }
      } else {
        triggerNotification(
          'new_guest',
          'تعديل في سجل نزيل',
          `قام موظف الاستقبال بتعديل بيانات النزيل ${guestName} بالغرفة رقم ${roomNum}`
        );
      }

      // Handle room change / movement
      if (fieldsToUpdate.roomNumber && roomNum && fieldsToUpdate.roomNumber !== roomNum) {
        // New room is now occupied
        await handleUpdateRoomStatus(fieldsToUpdate.roomNumber, 'occupied');
        // Old room is marked as 'dirty' if now vacant
        const remainingInOld = guests.filter(g => 
          g.roomNumber === roomNum && 
          g.id !== guestId && 
          !(g.checkOutDate && g.checkoutConfirmed)
        );
        if (remainingInOld.length === 0) {
          await handleUpdateRoomStatus(roomNum, 'dirty');
        }
      }

      // Determine if room rate type is 'room' (unified pricing)
      const isRoomBasis = (fieldsToUpdate.roomRateType || (targetGuest && targetGuest.roomRateType)) === 'room';

      let nextGuests: Guest[] = [];
      setGuests(prev => {
        let updated = prev.map(g => 
          g.id === guestId ? { ...g, ...fieldsToUpdate } : g
        );
        
        if (isRoomBasis && fieldsToUpdate.checkoutConfirmed === undefined) {
          const referenceGuest = updated.find(g => g.id === guestId)!;
          const keysToSync: Array<keyof Guest> = [
            'checkInDate', 'checkInTime', 'checkOutDate', 'isLateCheckout',
            'baseRate', 'paidAmount', 'paymentHistory', 'roomRateType',
            'pricingMode', 'discountAmount', 'extraBreakfast', 'extraParking',
            'extraDinner', 'extraLaundry'
          ];
          updated = updated.map(g => {
            if (g.roomNumber === roomNum && !(g.checkOutDate && g.checkoutConfirmed) && g.id !== guestId) {
              const updatedFields: Partial<Guest> = {};
              keysToSync.forEach(key => {
                if (referenceGuest[key] !== undefined) {
                  (updatedFields as any)[key] = referenceGuest[key];
                }
              });
              return { ...g, ...updatedFields };
            }
            return g;
          });
        }
        
        nextGuests = updated;
        saveGuests(nextGuests);
        return nextGuests;
      });

      if (isRealUser) {
        await resilientFirestoreWrite('guests', guestId, 'update', fieldsToUpdate);
        if (isRoomBasis && fieldsToUpdate.checkoutConfirmed === undefined) {
          const referenceGuest = nextGuests.find(g => g.id === guestId)!;
          const otherActiveRoomGuests = guests.filter(g => g.roomNumber === roomNum && !(g.checkOutDate && g.checkoutConfirmed) && g.id !== guestId);
          for (const og of otherActiveRoomGuests) {
            const keysToSync: Array<keyof Guest> = [
              'checkInDate', 'checkInTime', 'checkOutDate', 'isLateCheckout',
              'baseRate', 'paidAmount', 'paymentHistory', 'roomRateType',
              'pricingMode', 'discountAmount', 'extraBreakfast', 'extraParking',
              'extraDinner', 'extraLaundry'
            ];
            const syncFields: Partial<Guest> = {};
            keysToSync.forEach(key => {
              if (referenceGuest[key] !== undefined) {
                (syncFields as any)[key] = referenceGuest[key];
              }
            });
            await resilientFirestoreWrite('guests', og.id, 'update', syncFields);
          }
        }
      }
    }
  };

  const handleFullUpdateGuest = async (updatedGuest: Guest) => {
    if (role === 'receptionist') {
      // Ensure paidDays, isPaid, and checkOutDate are fully linked/bound
      const pricingMode = updatedGuest.pricingMode || hotelSettings?.globalPricingMode || 'daily';
      if (pricingMode === 'daily') {
        const checkInDate = updatedGuest.checkInDate || getLocalDateString();
        const required = getRequiredPaidNights(checkInDate, hotelSettings, updatedGuest.checkInTime);

        const isIndefinite = !!updatedGuest.isIndefiniteStay;
        const checkOutDate = updatedGuest.checkOutDate || checkInDate;
        const bookedNights = calculateNights(checkInDate, checkOutDate, updatedGuest.isLateCheckout, hotelSettings, updatedGuest.checkInTime, updatedGuest.checkoutConfirmed);

        if (updatedGuest.paidDays !== undefined) {
          const paidNights = updatedGuest.paidDays;
          const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, updatedGuest.checkInTime);
          if (isIndefinite) {
            updatedGuest.checkOutDate = paidNights > 0 ? addDaysToDateString(adjustedCheckIn, paidNights) : "";
            updatedGuest.isPaid = paidNights >= required;
          } else {
            updatedGuest.checkOutDate = paidNights > 0 ? addDaysToDateString(adjustedCheckIn, paidNights) : checkInDate;
            updatedGuest.isPaid = paidNights >= bookedNights;
          }
        } else if (updatedGuest.checkOutDate !== undefined && updatedGuest.checkOutDate !== '') {
          const baseRate = updatedGuest.baseRate || hotelSettings?.defaultRatePerNight || 7000;
          const paidAmount = typeof updatedGuest.paidAmount === 'number' ? updatedGuest.paidAmount : 0;
          const computedPaidDays = baseRate > 0 ? Math.floor(paidAmount / baseRate) : bookedNights;
          updatedGuest.paidDays = Math.min(bookedNights, Math.max(0, computedPaidDays));
          updatedGuest.isPaid = updatedGuest.paidDays >= (isIndefinite ? required : bookedNights);
        } else if (updatedGuest.isPaid !== undefined) {
          const currentPaidDays = updatedGuest.paidDays ?? 0;
          if (updatedGuest.isPaid) {
            const targetNights = isIndefinite ? required : bookedNights;
            const paidNights = Math.max(targetNights, currentPaidDays);
            updatedGuest.paidDays = paidNights;
            const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, updatedGuest.checkInTime);
            if (isIndefinite) {
              updatedGuest.checkOutDate = addDaysToDateString(adjustedCheckIn, paidNights);
            } else {
              updatedGuest.checkOutDate = checkOutDate;
            }
          } else {
            const targetNights = isIndefinite ? required : bookedNights;
            const paidNights = Math.max(0, targetNights - 1);
            updatedGuest.paidDays = paidNights;
            const adjustedCheckIn = getAdjustedCheckInDate(checkInDate, updatedGuest.checkInTime);
            if (isIndefinite) {
              updatedGuest.checkOutDate = addDaysToDateString(adjustedCheckIn, paidNights);
            } else {
              updatedGuest.checkOutDate = checkOutDate;
            }
          }
        }
      } else {
        // Hourly mode
        if (updatedGuest.paidDays !== undefined) {
          updatedGuest.isPaid = updatedGuest.paidDays >= 0;
        } else if (updatedGuest.isPaid !== undefined) {
          const currentPaidDays = updatedGuest.paidDays ?? 0;
          if (updatedGuest.isPaid && currentPaidDays < 0) {
            updatedGuest.paidDays = 0;
          } else if (!updatedGuest.isPaid && currentPaidDays >= 0) {
            updatedGuest.paidDays = -1;
          }
        }
      }

      const targetGuest = guests.find(g => g.id === updatedGuest.id);
      const oldRoomNum = targetGuest ? targetGuest.roomNumber : "";
      const newRoomNum = updatedGuest.roomNumber;

      // Handle room changes
      if (oldRoomNum && newRoomNum && oldRoomNum !== newRoomNum) {
        await handleUpdateRoomStatus(newRoomNum, 'occupied');
        const remainingInOld = guests.filter(g => 
          g.roomNumber === oldRoomNum && 
          g.id !== updatedGuest.id && 
          !(g.checkOutDate && g.checkoutConfirmed)
        );
        if (remainingInOld.length === 0) {
          await handleUpdateRoomStatus(oldRoomNum, 'dirty');
        }
      } else {
        if (updatedGuest.checkOutDate && updatedGuest.checkoutConfirmed) {
          const remaining = guests.filter(g => 
            g.roomNumber === newRoomNum && 
            g.id !== updatedGuest.id && 
            !(g.checkOutDate && g.checkoutConfirmed)
          );
          if (remaining.length === 0) {
            await handleUpdateRoomStatus(newRoomNum, 'dirty');
          }
        } else {
          await handleUpdateRoomStatus(newRoomNum, 'occupied');
        }
      }

      triggerNotification(
        'new_guest',
        'تعديل كامل لسجل نزيل',
        `تم تعديل كافة تفاصيل ملف النزيل ${updatedGuest.firstNameAr} ${updatedGuest.lastNameAr} في الغرفة رقم ${updatedGuest.roomNumber}`
      );

      const isRoomBasis = false;
      let nextGuests: Guest[] = [];

      setGuests(prev => {
        let updated = prev.map(g => 
          g.id === updatedGuest.id ? updatedGuest : g
        );

        if (isRoomBasis) {
          const referenceGuest = updatedGuest;
          const keysToSync: Array<keyof Guest> = [
            'checkInDate', 'checkInTime', 'checkOutDate', 'isLateCheckout',
            'baseRate', 'paidAmount', 'paymentHistory', 'roomRateType',
            'pricingMode', 'discountAmount', 'extraBreakfast', 'extraParking',
            'extraDinner', 'extraLaundry', 'checkoutConfirmed', 'actualCheckOutDate'
          ];
          updated = updated.map(g => {
            if (g.roomNumber === newRoomNum && !(g.checkOutDate && g.checkoutConfirmed) && g.id !== updatedGuest.id) {
              const updatedFields: Partial<Guest> = {};
              keysToSync.forEach(key => {
                if (referenceGuest[key] !== undefined) {
                  (updatedFields as any)[key] = referenceGuest[key];
                }
              });
              return { ...g, ...updatedFields };
            }
            return g;
          });
        }

        nextGuests = updated;
        saveGuests(nextGuests);
        return nextGuests;
      });

      setEditingGuest(null);
      setActiveTab('form');

      if (isRealUser) {
        await resilientFirestoreWrite('guests', updatedGuest.id, 'set', updatedGuest);
        if (isRoomBasis) {
          const otherActiveRoomGuests = guests.filter(g => g.roomNumber === newRoomNum && !(g.checkOutDate && g.checkoutConfirmed) && g.id !== updatedGuest.id);
          for (const og of otherActiveRoomGuests) {
            const keysToSync: Array<keyof Guest> = [
              'checkInDate', 'checkInTime', 'checkOutDate', 'isLateCheckout',
              'baseRate', 'paidAmount', 'paymentHistory', 'roomRateType',
              'pricingMode', 'discountAmount', 'extraBreakfast', 'extraParking',
              'extraDinner', 'extraLaundry', 'checkoutConfirmed', 'actualCheckOutDate'
            ];
            const syncFields: Partial<Guest> = {};
            keysToSync.forEach(key => {
              if (updatedGuest[key] !== undefined) {
                (syncFields as any)[key] = updatedGuest[key];
              }
            });
            await resilientFirestoreWrite('guests', og.id, 'set', { ...og, ...syncFields });
          }
        }
      }
    }
  };

  const handleEditFullGuest = (guest: Guest) => {
    setEditingGuest(guest);
    setActiveTab('form');
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (role === 'receptionist') {
      const targetGuest = guests.find(g => g.id === guestId);
      const roomNum = targetGuest ? targetGuest.roomNumber : "";

      setGuests(prev => {
        const next = prev.filter(g => g.id !== guestId);
        saveGuests(next);
        return next;
      });

      if (roomNum) {
        const remainingGuests = guests.filter(g => 
          g.roomNumber === roomNum && 
          g.id !== guestId && 
          !(g.checkOutDate && g.checkoutConfirmed)
        );
        if (remainingGuests.length === 0) {
          await handleUpdateRoomStatus(roomNum, 'available');
        }
      }

      if (isRealUser) {
        await resilientFirestoreWrite('guests', guestId, 'delete');
      }
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, status: RoomStatusValue) => {
    setRoomStatuses(prev => {
      const updated = { ...prev, [roomId]: status };
      saveRoomStatuses(updated);
      return updated;
    });
    if (isRealUser) {
      const roomUpdate: RoomStatus = {
        roomId,
        status,
        lastUpdated: Date.now()
      };
      await resilientFirestoreWrite('rooms', roomId, 'set', roomUpdate);
    }
  };

  const handleLogout = () => {
    setRole(null);
    setPrintingGuest(null);
    setEditingGuest(null);
    setIsEnteringData(false);
    handleSignOut();
  };


  // If loading Firebase authentication state, render a polished traditional loading indicator
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070d19] flex items-center justify-center">
        <div className="glass-panel p-8 text-center max-w-sm space-y-4">
          <Sparkles className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm font-black text-slate-800 dark:text-white font-sans">تأمين الاتصال بسيرفرات النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-[#070d19] relative flex flex-col items-center w-full overflow-x-hidden"
    >
      {/* 🔮 Soft dark/light responsive glaze overlay for supreme readability above the zellige meshes */}
      <div className="absolute inset-0 bg-slate-50/80 dark:bg-[#050a12]/92 pointer-events-none z-0"></div>
      
      {/* 🌟 Ornate Dynamic Decorative Highlight Bar */}
      <div className="w-full h-1.5 bg-gradient-to-r from-amber-500 via-[#cca43b] to-amber-600 relative z-50 shadow-md"></div>
      {/* Dynamic Touch metrics scale, spacing, and order alignment modifiers with RTL support */}
      <style>{`
        /* Dynamic Button Active Feedback */
        button:active, .btn:active, .glass-btn-primary:active {
          transform: scale(0.98) !important;
        }

        /* Dynamic Button Spacing & Density scale gaps */
        .grid-gap-dynamic, .gap-dynamic {
          gap: ${buttonSpacing === 'compact' ? '0.35rem' : buttonSpacing === 'relaxed' ? '1.25rem' : '0.75rem'} !important;
        }
      `}</style>

      
      {role && (
        <>
          {/* 🏛️ Top Header Bar with Integrated Sidebar Menu Button, Brand Logo & Page Action Buttons */}
          <header className="sticky top-0 z-[85] w-full bg-slate-50/98 dark:bg-slate-900/95 text-slate-900 dark:text-white border-b border-amber-500/20 dark:border-slate-800/90 backdrop-blur-md shadow-md py-1.5 px-3 sm:px-5 transition-all select-none" dir="rtl">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 flex-wrap sm:flex-nowrap">
              {/* Right: Header Brand Logo with Integrated Sidebar Toggle Button */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Sidebar Menu Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="relative shrink-0 p-2 sm:p-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-[#cca43b] text-[#9a7b1e] dark:text-[#cca43b] shadow-sm flex items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer group"
                  title="فتح القائمة الجانبية"
                >
                  <span className="absolute inset-0 rounded-xl border border-[#cca43b] animate-ping opacity-35"></span>
                  <Menu className="w-5 h-5 relative z-10 transition-transform group-hover:rotate-90 duration-300" />
                </button>

                {/* Brand Logo & Hotel Name Header */}
                <div 
                  onClick={() => setIsSidebarOpen(true)}
                  className="cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity"
                  title="فتح القائمة الجانبية"
                >
                  <BrandLogo 
                    variant="full" 
                    hotelNameAr={hotelSettings?.hotelNameAr} 
                    hotelNameEn={hotelSettings?.hotelNameEn} 
                    hotelPhone={hotelSettings?.hotelPhone}
                    hideCountryName={true}
                    hidePhone={true}
                    hideEmail={true}
                    hideSubtitle={true}
                    hideEnglishName={true}
                  />
                </div>

                {/* Active Page Title Badge in Header */}
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 dark:bg-slate-900 border border-[#cca43b]/40 text-[#8a6a11] dark:text-[#cca43b] font-black text-xs sm:text-sm shadow-inner shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    {activeTab === 'settings' ? 'إعدادات الفندق والطباعة' : (editingGuest ? 'تعديل استمارة النزيل' : 'استمارة معلومات وإقامة النزيل')}
                  </span>
                </div>
              </div>

              {/* Center & Left: Page Header Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                {activeTab === 'form' ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Preview and Print Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const printBtn = document.getElementById('btn-preview-print-only');
                        if (printBtn) {
                          printBtn.click();
                        }
                      }}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer border border-amber-400/40"
                      title="معاينة وطباعة الاستمارة"
                    >
                      <Printer className="w-4 h-4 text-slate-950 shrink-0" />
                      <span>معاينة وطباعة الاستمارة</span>
                    </button>

                    {/* 4. New Blank Form Button */}
                    {editingGuest && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGuest(null);
                        }}
                        className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        title="استمارة جديدة فارغة"
                      >
                        <UserPlus className="w-4 h-4 shrink-0" />
                        <span>استمارة جديدة</span>
                      </button>
                    )}

                    {/* 5. Settings button */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-800 dark:text-amber-400 border border-slate-200 dark:border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="إعدادات الفندق والطباعة"
                    >
                      <Settings className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">إعدادات الفندق</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('form')}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer border border-amber-400/40"
                    title="العودة للاستمارة"
                  >
                    <FileText className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>العودة للاستمارة</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* 🚪 Premium Sidebar Navigation Overlay */}
          {isSidebarOpen && (
            <div className="fixed inset-0 z-[100] flex justify-start animate-in fade-in duration-200" dir="rtl">
              {/* Backdrop blur click-away closer */}
              <div 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer transition-opacity"
              />
              
              {/* Sidebar Panel */}
              <div 
                className="relative w-80 max-w-full bg-slate-50 dark:bg-slate-950 border-l border-amber-500/20 dark:border-slate-800/90 h-full flex flex-col justify-between shadow-2xl z-10 font-sans transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
                dir="rtl"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Sidebar Header */}
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-4">
                      <div className="flex items-center gap-2.5">
                        <BrandLogo variant="icon" />
                        <div className="flex flex-col text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{hotelSettings?.hotelNameAr || 'فندق'}</span>
                          <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-bold">استمارة إقامة النزيل</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800/80 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 text-center font-bold"
                        title="إغلاق القائمة"
                      >
                        ×
                      </button>
                    </div>

                    {/* Navigation Items */}
                    <div className="space-y-2.5">
                      <span className="text-[9.5px] font-black text-amber-800 dark:text-slate-400 uppercase tracking-wider block pr-1">
                        القائمة الرئيسية
                      </span>
                      <nav className="space-y-1.5">
                        {/* 1. Guest Form */}
                        <button
                          type="button"
                          onClick={() => { setActiveTab('form'); setIsSidebarOpen(false); }}
                          className={`w-full h-11 px-4 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                            activeTab === 'form' 
                              ? 'text-amber-950 dark:text-white bg-amber-500/15 border border-amber-500/40 font-black shadow-sm' 
                              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <FileText className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-[11px] font-black">استمارة النزيل والطباعة</span>
                        </button>

                        {/* 2. Settings Screen */}
                        <button
                          type="button"
                          onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
                          className={`w-full h-11 px-4 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                            activeTab === 'settings' 
                              ? 'text-amber-950 dark:text-white bg-amber-500/15 border border-[#cca43b]/40 font-black shadow-sm' 
                              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <Settings className="w-4.5 h-4.5 text-amber-600 dark:text-[#cca43b]" />
                          <span className="text-[11px] font-black">إعدادات الفندق والطباعة</span>
                        </button>
                      </nav>
                    </div>
                  </div>

                  {/* Sidebar Footer Controls */}
                  <div className="p-6 border-t border-slate-200 dark:border-slate-800/60 bg-slate-100/80 dark:bg-slate-900/40 text-center">
                    <p className="text-[8px] text-slate-600 dark:text-slate-500 font-bold">كل الحقوق محفوظة © {new Date().getFullYear()}</p>
                  </div>
                </div>
              </div>
            )}
        </>
      )}

      {/* Main Content Layout */}
      <main className="w-full flex-1 relative z-10 mx-auto flex flex-col pb-10 pt-0 px-0 max-w-full">
        {activeTab === 'settings' ? (
          <div className="max-w-7xl w-full mx-auto p-4 sm:p-6">
            <SettingsScreen 
              onClose={() => setActiveTab('form')}
              receptionistPin={receptionistPin}
              policePin={policePin}
              onUpdateReceptionistPin={(newPin) => {
                setReceptionistPin(newPin);
                localStorage.setItem('receptionistPin', newPin);
              }}
              onUpdatePolicePin={(newPin) => {
                setPolicePin(newPin);
                localStorage.setItem('policePin', newPin);
              }}
              authorizedEmails={authorizedEmails}
              onAddAuthorizedEmail={handleAddAuthorizedEmail}
              onRemoveAuthorizedEmail={handleRemoveAuthorizedEmail}
              firebaseUser={firebaseUser}
              colorTheme={colorTheme}
              setColorTheme={setColorTheme}
              zelligeOpacity={zelligeOpacity}
              setZelligeOpacity={setZelligeOpacity}
              buttonSpacing={buttonSpacing}
              setButtonSpacing={setButtonSpacing}
              buttonAlignment={buttonAlignment}
              setButtonAlignment={setButtonAlignment}
              manualUsers={manualUsers}
              onUpdateManualUsers={handleUpdateManualUsers}
              hotelSettings={hotelSettings}
              onUpdateHotelSettings={handleUpdateHotelSettings}
              settingsSection={settingsSection}
              onSettingsSectionChange={setSettingsSection}
              guests={guests}
              onUpdateGuests={setGuests}
              pendingSyncCount={pendingSyncCount}
              onFlushSyncQueue={flushSyncQueue}
            />
          </div>
        ) : (
          <GuestForm 
            initialData={editingGuest}
            guests={guests}
            roomStatuses={roomStatuses}
            onUpdateRoomStatus={handleUpdateRoomStatus}
            onAddGuest={handleAddGuest} 
            onUpdateGuest={handleFullUpdateGuest}
            onNavigateToRegistry={() => setActiveTab('form')}
            onNavigateToRooms={() => setActiveTab('form')}
            onFormActiveStateChange={setIsEnteringData}
            isRoomPanelOpen={isRoomPanelOpen}
            setIsRoomPanelOpen={setIsRoomPanelOpen}
            selectedRoomGlobal={selectedRoomGlobal}
            setSelectedRoomGlobal={setSelectedRoomGlobal}
            onPrintGuest={setPrintingGuest}
            pageConfigs={pageConfigs}
            hotelSettings={hotelSettings}
          />
        )}
      </main>

      {/* DIRECT DARK MODE TOGGLE FOR MOBILE USERS AT TOP RIGHT - DELETED */}


      {/* Global High-Fidelity Alert Dialog or Toast System */}
      {globalAlert && (
        <div className="fixed top-6 left-0 right-0 mx-auto z-[200] px-4 max-w-sm w-full pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200" dir="rtl">
          <div
            className="pointer-events-auto glass-panel p-5 relative border-2 border-amber-500/85 bg-slate-950/98 text-center flex flex-col gap-3 shadow-[0_10px_30px_rgba(204,164,59,0.35)] rounded-2xl"
          >
            <div className="mx-auto w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 border border-[#cca43b]/40 shrink-0 animate-bounce">
              {globalAlert.type === 'success' ? (
                <Check className="w-6 h-6 text-emerald-500" />
              ) : (
                <Bell className="w-6 h-6 text-rose-500" />
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-black text-white text-shiny-gold">تنبيه النظام</h3>
              <p className="text-slate-200 text-xs font-bold leading-relaxed mt-2" style={{ whiteSpace: 'pre-line' }}>
                {globalAlert.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setGlobalAlert(null)}
              className="mt-2 w-full bg-gradient-to-r from-[#cca43b] to-[#dfb145] text-slate-950 py-2.5 px-4 rounded-xl font-black text-xs transition-all duration-300 transform active:scale-97 cursor-pointer hover:brightness-110"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* Guest Security Form Printable Modal Overlay */}
      {printingGuest && (
        <PrintableForm 
          guest={printingGuest} 
          hotelSettings={hotelSettings} 
          onClose={() => setPrintingGuest(null)}
          onEdit={() => setPrintingGuest(null)}
        />
      )}
    </div>
  );
}
