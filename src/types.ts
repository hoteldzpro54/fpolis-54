export type RoomStatusValue = 'available' | 'occupied' | 'reserved' | 'out_of_order' | 'dirty';

export interface RoomStatus {
  roomId: string;
  status: RoomStatusValue;
  lastUpdated: number;
}

export interface RentalPeriod {
  id: string;
  name: string;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "12:00"
  defaultPrice: number;
}

export interface Guest {
  id: string;
  roomNumber: string;
  idType: string;
  idNumber: string;
  firstNameAr: string;
  lastNameAr: string;
  firstNameEn: string;
  lastNameEn: string;
  dob: string;
  pob: string;
  fatherName: string;
  motherFullName: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  notes: string;
  nationality?: string;
  roomClassification?: string;
  checkoutConfirmed?: boolean;
  phoneNumber?: string;
  isPaid?: boolean;
  paidDays?: number;
  isLateCheckout?: boolean;
  timestamp: number;
  rentalClassificationId?: string; // Links to the Room Rental Classification
  extraPaidHours?: number; // Additional paid hours on top of the base classification
  actualCheckOutDate?: string; // Date-time of actual check-out
  calculatedRentalPrice?: number; // Total calculated rental price (base + delay penalty)
  delayDurationMinutes?: number; // Calculated delay duration in minutes
  delayPenaltyPaid?: number; // Paid delay penalty tax
  paidAmount?: number; // Total amount paid so far
  paymentStatus?: 'paid' | 'partial' | 'unpaid'; // Overall payment status
  paymentHistory?: Array<{ id: string; timestamp: number; amount: number; paymentMethod: string; notes?: string }>; // Payment transactions
  pricingMode?: 'daily' | 'hourly'; // Calculation pricing mode
  roomRateType?: 'room' | 'person'; // Sub-mode for daily pricing
  baseRate?: number; // Custom rate per night/hour
  stayDurationHours?: number; // Stay duration in hours (for hourly mode)
  roomChanges?: Array<{ fromRoom: string; toRoom: string; timestamp: number; reason?: string }>; // History of room transfers
  periodHistory?: Array<{ fromPeriodId: string; toPeriodId: string; timestamp: number; price?: number }>; // History of period extensions/changes
  ratePeriods?: Array<{ id: string; startDate: string; rate: number; reason?: string }>; // History of pricing rate updates/splits
  discountAmount?: number;
  extraBreakfast?: number;
  extraParking?: number;
  extraDinner?: number;
  extraLaundry?: number;
  isIndefiniteStay?: boolean;
  expectedCheckOutDate?: string;
  selectedPeriods?: Record<string, number>; // Mapping period ID -> count of periods
}

export type UserRole = 'receptionist' | 'police' | null;

export type NotePriority = 'normal' | 'important' | 'danger';

export interface AppNote {
  id: string;
  content: string;
  priority: NotePriority;
  senderRole: 'receptionist';
  timestamp: number;
  readBy: any[];
  senderUsername?: string;
  channel?: 'all' | 'internal';
}

export interface InvoiceRoomItem {
  id: string; // for React keys
  roomNumber: string;
  roomType: string;
  ratePerNight: number;
  roomsCount: number; // number of rooms of this type
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'individual' | 'group' | 'service_only';
  guestNames: string[];
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  ratePerNight: number;
  touristTax: number;
  touristTaxBasis?: 'guest' | 'room';
  extraServices: { name: string; amount: number; quantity?: number }[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  currency: 'DZD' | 'USD' | 'EUR';
  notes: string;
  timestamp: number;
  paymentMethod?: string;
  receptionistName?: string;
  guestIdNumber?: string;
  payerType?: 'individual' | 'company';
  companyName?: string;
  companyTaxId?: string;
  vatRate?: number; // e.g. 0, 9, 19
  vatAmount?: number;
  stampDuty?: number;
  paymentLogs?: { id: string; timestamp: number; amount: number; paymentMethod: string; receptionistName?: string; notes?: string }[];
  groupRooms?: InvoiceRoomItem[];
  isLateCheckout?: boolean;
}

export interface StaffReminder {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  alertAt?: string; // ISO format string, e.g. "2026-06-04T12:00"
  isTriggered: boolean;
  createdBy: string;
}

export interface HotelSettings {
  hotelNameAr: string;
  hotelNameEn: string;
  hotelSubtitle: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelGreeting: string;
  defaultRatePerNight?: number;
  defaultRatePerPerson?: number;
  defaultCheckInTime?: string;
  defaultCheckOutTime?: string;
  touristTaxRate?: number;
  touristTaxCalculationBasis?: 'guest' | 'room';
  enableSoundEffects?: boolean;
  enableZelligeBackground?: boolean;
  enableCalculatorAndPackages?: boolean;
  customPopularServices?: { name: string; amount: number }[];
  quickRatesPresets?: number[];
  hotelSecretCode?: string;
  disableLoginFirewall?: boolean;
  customHotelRooms?: { id: string; floor: string; floorName: string; type: string; dailyRate?: number; hourlyRate?: number }[];
  floorConfigs?: {
    floorId: string;
    floorName: string;
    roomsCount: number;
    roomType: string;
    startRoomNumber: number;
    roomTypes?: {
      type: string;
      count: number;
    }[];
  }[];
  globalPricingMode?: 'daily' | 'hourly'; // Global billing mode: daily or hourly only
  enabledPages?: string[];
  hideCheckoutBtn?: boolean;
  hideTransferBtn?: boolean;
  hideEditGuestBtn?: boolean;
  hideDeleteGuestBtn?: boolean;
  hideQuickRegisterBtn?: boolean;
  hideParliamentLayout?: boolean;
  hideQuickRoomStatusEdit?: boolean;
  hideNotesClearAction?: boolean;
  hideStaffRemindersButton?: boolean;
  hidePrintFormDirectly?: boolean;
  defaultPrintSize?: 'compact' | 'a5' | 'a4_full_frame';
  defaultPrintNotesAr?: string;
  defaultPrintNotesEn?: string;
  defaultReceptionStampTitle?: string;
  roomsPerRowDesktop?: number;
  optionalFatherAndMotherName?: boolean;
  defaultPoliceNotesAr?: string;
  enableCalculatedTaxes?: boolean;
  customVatRate?: number;
  customStampDutyRate?: number;
  customStampDutyFixed?: boolean;
  customStampDutyValue?: number;
  hourlyRate?: number; // Hourly rate for stay calculation
  enableApprovedRentalCalculation?: boolean; // toggle to enable/disable calculation of the approved rental period classification
  defaultRentalPricingBasis?: 'room' | 'person'; // basis of rental price: per room or per person
  hideAccountingAddTransaction?: boolean; // toggle to hide adding financial transactions
  hideAccountingDeleteTransaction?: boolean; // toggle to hide deleting financial transactions
  hideExtraServicesSelection?: boolean; // toggle to hide extra services in registration form
  voiceAlertStyle?: 'style1' | 'style2' | 'style3';
  voiceAlertGender?: 'male' | 'female' | 'default';
  enableVoiceAlert?: boolean;
  lastModified?: number;
  rentalPeriods?: RentalPeriod[];
}

export type NotificationType = 'new_guest' | 'guest_checkout' | 'new_note' | 'reminder_alert';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: number;
  confirmedBy: string[]; // List of usernames who acknowledged/read this notification
}

export interface UserProfile {
  username: string;
  fullName: string;
  phoneNumber: string;
  whatsAppNumber: string;
  customNotes?: string;
  updatedAt: number;
}

export interface FinanceTransaction {
  id: string;
  type: 'income' | 'expense' | 'spending'; // income = مداخيل, expense = مصاريف, spending = إنفاق
  category: string; // تصنيف: نظافة، صيانة، رخص، خدمات، إلخ
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
  recordedBy: string;
  timestamp: number;
}




