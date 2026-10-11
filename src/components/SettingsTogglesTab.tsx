import React from 'react';
import { 
  Sliders, User
} from 'lucide-react';

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
  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-right shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start gap-3">
      <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-[#cca43b] shrink-0 border border-slate-200 dark:border-slate-700">
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
    <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
          value
            ? `${activeColor} shadow-sm font-extrabold scale-103`
            : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700'
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
            : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
      >
        {inactiveLabel}
      </button>
    </div>
  </div>
);

interface SettingsTogglesTabProps {
  inputEnableCalculatedTaxes?: boolean;
  setInputEnableCalculatedTaxes?: (val: boolean) => void;
  inputOptionalFatherAndMotherName: boolean;
  setInputOptionalFatherAndMotherName: (val: boolean) => void;
  inputEnableSoundEffects?: boolean;
  setInputEnableSoundEffects?: (val: boolean) => void;
  
  // New Rental Period Price Toggle
  inputEnableApprovedRentalCalculation?: boolean;
  setInputEnableApprovedRentalCalculation?: (val: boolean) => void;

  // Hiding toggles
  inputHideCheckoutBtn: boolean;
  setInputHideCheckoutBtn: (val: boolean) => void;
  inputHideTransferBtn: boolean;
  setInputHideTransferBtn: (val: boolean) => void;
  inputHideEditGuestBtn: boolean;
  setInputHideEditGuestBtn: (val: boolean) => void;
  inputHideDeleteGuestBtn: boolean;
  setInputHideDeleteGuestBtn: (val: boolean) => void;
  inputHideStaffRemindersButton: boolean;
  setInputHideStaffRemindersButton: (val: boolean) => void;
  inputHidePrintFormDirectly: boolean;
  setInputHidePrintFormDirectly: (val: boolean) => void;

  // Additional fully-flexible visibility toggles
  inputHideQuickRegisterBtn: boolean;
  setInputHideQuickRegisterBtn: (val: boolean) => void;
  inputHideParliamentLayout: boolean;
  setInputHideParliamentLayout: (val: boolean) => void;
  inputHideQuickRoomStatusEdit: boolean;
  setInputHideQuickRoomStatusEdit: (val: boolean) => void;
  inputHideNotesClearAction: boolean;
  setInputHideNotesClearAction: (val: boolean) => void;
  inputHideAccountingAddTransaction: boolean;
  setInputHideAccountingAddTransaction: (val: boolean) => void;
  inputHideAccountingDeleteTransaction: boolean;
  setInputHideAccountingDeleteTransaction: (val: boolean) => void;
  inputHideExtraServicesSelection?: boolean;
  setInputHideExtraServicesSelection?: (val: boolean) => void;
}

export const SettingsTogglesTab: React.FC<SettingsTogglesTabProps> = (props) => {
  const {
    inputOptionalFatherAndMotherName, setInputOptionalFatherAndMotherName,
  } = props;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-right">
      
      {/* SECTION 1: CORE SYSTEM FEATURES */}
      <div className="glass-panel p-6 sm:p-8 space-y-4 font-sans">
        <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-500" />
          <span>ميزات النظام الأساسية وسياسات التسلّم</span>
        </h3>
        <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
          تخصيص وظائف وميزات البرنامج العامة لتناسب احتياجات ومخططات العمل الفندقية.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          
          <ToggleOptionCard 
            icon={User}
            title="إلغاء إلزامية وإخفاء حقول الأب والأم"
            description="عند التفعيل، سيتم إخفاء حقول اسم الأب واسم ولقب الأم تماماً لتسريع تسجيل النزلاء الجدد."
            value={inputOptionalFatherAndMotherName}
            onChange={setInputOptionalFatherAndMotherName}
          />

        </div>
      </div>

    </div>
  );
};
