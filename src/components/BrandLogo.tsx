import React from 'react';
import { loadHotelSettings } from '../utils';

export function BrandLogo({ 
  className = '', 
  variant = 'full', 
  hotelNameAr, 
  hotelNameEn, 
  hotelSubtitle, 
  hotelPhone,
  hotelEmail,
  hideCountryName = false,
  hidePhone = false,
  hideEmail = false,
  hideSubtitle = false,
  hideEnglishName = false
}: { 
  className?: string, 
  variant?: 'full' | 'icon', 
  hotelNameAr?: string, 
  hotelNameEn?: string, 
  hotelSubtitle?: string, 
  hotelPhone?: string,
  hotelEmail?: string,
  hideCountryName?: boolean,
  hidePhone?: boolean,
  hideEmail?: boolean,
  hideSubtitle?: boolean,
  hideEnglishName?: boolean
}) {
  const currentSettings = loadHotelSettings();
  const arName = hotelNameAr || currentSettings.hotelNameAr || "فندق أجاد";
  const enName = hotelNameEn || currentSettings.hotelNameEn || "HOTEL ADJAD";
  const subtitle = hotelSubtitle !== undefined ? hotelSubtitle : (currentSettings.hotelSubtitle || '');
  const phone = hotelPhone !== undefined ? hotelPhone : (currentSettings.hotelPhone || '0661770023');
  const email = hotelEmail !== undefined ? hotelEmail : (currentSettings.hotelEmail || 'hoteladjad@gmail.com');

  return (
    <div className={`flex items-center gap-3.5 ${className} select-none group`}>
      {/* Official Government Seal */}
      <div className="relative shrink-0 flex items-center justify-center w-12 h-12">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="govGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="govGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <linearGradient id="govDarkBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          
          <g transform="translate(50, 50)">
            {/* Outer Circular State Crest Border */}
            <circle cx="0" cy="0" r="46" fill="url(#govDarkBlue)" stroke="url(#govGold)" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="41" fill="none" stroke="url(#govGold)" strokeWidth="1" strokeDasharray="3 3" />
            
            {/* Inner background circle */}
            <circle cx="0" cy="0" r="37" fill="url(#govGreen)" stroke="url(#govGold)" strokeWidth="1.2" />

            {/* Glowing arch backdrop in background */}
            <path d="M -28, -5 A 30,30 0 0,1 28,-5" fill="none" stroke="rgba(253, 224, 71, 0.2)" strokeWidth="3" strokeLinecap="round" />

            {/* Building Ground Base */}
            <rect x="-28" y="20" width="56" height="4" rx="1.5" fill="url(#govGold)" />
            <rect x="-24" y="16" width="48" height="4" rx="1" fill="url(#govGold)" opacity="0.9" />

            {/* Hotel Building Left Wing */}
            <rect x="-23" y="-6" width="7" height="22" fill="url(#govDarkBlue)" stroke="url(#govGold)" strokeWidth="0.8" rx="1" />
            {/* Left Wing Windows */}
            <rect x="-21" y="-3" width="3" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="-21" y="3" width="3" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="-21" y="9" width="3" height="4" rx="0.5" fill="url(#govGold)" />

            {/* Hotel Building Right Wing */}
            <rect x="16" y="-6" width="7" height="22" fill="url(#govDarkBlue)" stroke="url(#govGold)" strokeWidth="0.8" rx="1" />
            {/* Right Wing Windows */}
            <rect x="18" y="-3" width="3" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="18" y="3" width="3" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="18" y="9" width="3" height="4" rx="0.5" fill="url(#govGold)" />

            {/* Main Central Hotel Building (Multi-Story Tower) */}
            <path d="M -13,16 L -13,-18 L 13,-18 L 13,16 Z" fill="url(#govDarkBlue)" stroke="url(#govGold)" strokeWidth="1" />
            
            {/* Elegant Islamic / Modern Architectural Roof Crown / Dome */}
            <path d="M -9,-18 C -9,-25 9,-25 9,-18 Z" fill="url(#govGold)" stroke="url(#govGold)" strokeWidth="0.5" />
            <circle cx="0" cy="-25" r="1.5" fill="url(#govGold)" />

            {/* Rows of Hotel Windows */}
            {/* Row 4 (Top) */}
            <rect x="-9" y="-14" width="4" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="-3" y="-14" width="2" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="1" y="-14" width="2" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="5" y="-14" width="4" height="4" rx="0.5" fill="url(#govGold)" />

            {/* Row 3 */}
            <rect x="-9" y="-8" width="4" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="-3" y="-8" width="2" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="1" y="-8" width="2" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="5" y="-8" width="4" height="4" rx="0.5" fill="url(#govGold)" />

            {/* Row 2 */}
            <rect x="-9" y="-2" width="4" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="-3" y="-2" width="2" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="1" y="-2" width="2" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="5" y="-2" width="4" height="4" rx="0.5" fill="url(#govGold)" />

            {/* Row 1 */}
            <rect x="-9" y="4" width="4" height="4" rx="0.5" fill="url(#govGold)" />
            <rect x="5" y="4" width="4" height="4" rx="0.5" fill="url(#govGold)" />

            {/* Grand Entrance Canopy (Hotel Awning) */}
            <path d="M -6,16 L -6,10 L 6,10 L 6,16 Z" fill="url(#govDarkBlue)" stroke="url(#govGold)" strokeWidth="1" />
            <rect x="-8" y="8" width="16" height="3" rx="0.5" fill="url(#govGold)" />
            {/* Warmly Lit Entrance Doorway */}
            <path d="M -3.5,16 L -3.5,11 L 3.5,11 L 3.5,16 Z" fill="url(#govGold)" />
            <line x1="0" y1="11" x2="0" y2="16" stroke="url(#govDarkBlue)" strokeWidth="0.6" />

            {/* Five Stars Rating on top of the hotel */}
            <g fill="url(#govGold)" transform="translate(0, -29)">
              <polygon points="0,-2 0.6,-0.4 2.2,-0.4 1,-0.1 1.4,1.5 0,0.5 -1.4,1.5 -1,-0.1 -2.2,-0.4 -0.6,-0.4" transform="translate(-14, 0) scale(0.9)" />
              <polygon points="0,-2 0.6,-0.4 2.2,-0.4 1,-0.1 1.4,1.5 0,0.5 -1.4,1.5 -1,-0.1 -2.2,-0.4 -0.6,-0.4" transform="translate(-7, -2) scale(0.9)" />
              <polygon points="0,-2 0.6,-0.4 2.2,-0.4 1,-0.1 1.4,1.5 0,0.5 -1.4,1.5 -1,-0.1 -2.2,-0.4 -0.6,-0.4" transform="translate(0, -3) scale(1.1)" />
              <polygon points="0,-2 0.6,-0.4 2.2,-0.4 1,-0.1 1.4,1.5 0,0.5 -1.4,1.5 -1,-0.1 -2.2,-0.4 -0.6,-0.4" transform="translate(7, -2) scale(0.9)" />
              <polygon points="0,-2 0.6,-0.4 2.2,-0.4 1,-0.1 1.4,1.5 0,0.5 -1.4,1.5 -1,-0.1 -2.2,-0.4 -0.6,-0.4" transform="translate(14, 0) scale(0.9)" />
            </g>
          </g>
        </svg>
      </div>

      {/* Typography with State Heading Formatting */}
      {variant !== 'icon' && (
        <div className="flex flex-col text-right">
          {!hideCountryName && (
            <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 tracking-tight leading-none mb-0.5">
              الجمهورية الجزائرية الديمقراطية الشعبية
            </span>
          )}
          <h1 className="text-[13px] sm:text-[14px] font-black tracking-wide font-sans text-slate-900 dark:text-white mb-0 leading-tight">
            {arName}
          </h1>
          {(!hidePhone || !hideEnglishName) && (phone || enName) && (
            <p className="text-[8.5px] font-extrabold tracking-tight font-mono mt-0.5 text-slate-600 dark:text-slate-300 leading-tight" dir="ltr">
              {!hidePhone && phone && <span>Tel: {phone}</span>}
              {!hidePhone && phone && !hideEnglishName && enName && <span className="mx-1.5 opacity-60">•</span>}
              {!hideEnglishName && enName && <span className="uppercase tracking-wide">{enName}</span>}
            </p>
          )}
          {!hideEmail && email && (
            <p className="text-[8.5px] font-extrabold tracking-tight font-mono mt-0.5 text-slate-600 dark:text-slate-300 leading-tight" dir="ltr">
              <span>Email: {email}</span>
            </p>
          )}
          {!hideSubtitle && subtitle && (
            <p className="text-[8px] font-semibold tracking-tight font-mono mt-0.5 text-slate-500 dark:text-slate-400 leading-tight" dir="ltr">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
