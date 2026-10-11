import React, { useEffect, useState } from 'react';
import { Guest, HotelSettings } from '../types';
import { 
  Printer, 
  Award, 
  Shield, 
  Sparkles, 
  Edit3, 
  MessageCircle, 
  Check, 
  AlertCircle, 
  X 
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { BrandLogo } from './BrandLogo';
import { formatDateDMY, loadHotelSettings } from '../utils';

interface PrintableFormProps {
  guest: Guest;
  onClose: () => void;
  onEdit?: () => void;
  hotelSettings?: HotelSettings;
}

interface PrintContentWrapperProps {
  printSize: string;
  children: React.ReactNode;
}

function PrintContentWrapper({ printSize, children }: PrintContentWrapperProps) {
  if (printSize === 'a4_full_frame') {
    return (
      <div className="h-full min-h-full flex flex-col justify-between w-full shrink-0 relative">
        {children}
      </div>
    );
  }
  return <>{children}</>;
}

function A4WatermarkSpacer({ printSize, hotelSettings }: { printSize: string; hotelSettings: HotelSettings }) {
  if (printSize !== 'a4_full_frame') return null;

  const nameAr = hotelSettings?.hotelNameAr || 'فندق أجاد';
  const nameEn = hotelSettings?.hotelNameEn || 'HOTEL ADJAD';

  const opacity = 0.85;
  const colorAr = '#374151';
  const colorEn = '#52525b';
  const density = 12;
  const fontSize = 12;

  // determine grid layout dynamically based on watermark density to keep clean spacing
  let gridColsClass = 'grid-cols-3 gap-y-7';
  if (density <= 6) {
    gridColsClass = 'grid-cols-2 gap-y-12';
  } else if (density <= 15) {
    gridColsClass = 'grid-cols-3 gap-y-7';
  } else if (density <= 30) {
    gridColsClass = 'grid-cols-4 gap-y-4';
  } else if (density <= 50) {
    gridColsClass = 'grid-cols-5 gap-y-2.5 gap-x-1';
  } else if (density <= 75) {
    gridColsClass = 'grid-cols-6 gap-y-2 gap-x-1';
  } else {
    gridColsClass = 'grid-cols-8 gap-y-1 gap-x-1';
  }

  return (
    <div className="flex-grow w-full border border-dashed border-neutral-400 rounded-xl my-4 min-h-[160px] flex flex-col justify-center items-center relative overflow-hidden print:my-3 print:min-h-[145px] bg-white">
      {/* 
        A highly robust, customizable responsive grid of real text elements rotated by -15 degrees.
        Designed for maximum printing ink reliability using the user's custom gray-scale settings.
      */}
      <div 
        className={`absolute inset-0 grid ${gridColsClass} gap-x-2 justify-items-center items-center pointer-events-none select-none py-4 px-2 overflow-hidden`}
        style={{ opacity }}
      >
        {Array.from({ length: density }).map((_, idx) => (
          <div 
            key={idx} 
            className="transform -rotate-[15deg] flex flex-col items-center justify-center text-center leading-tight select-none"
          >
            <span 
              className="font-black tracking-wide whitespace-nowrap animate-none"
              style={{ 
                fontFamily: "Cairo, Tajawal, 'Segoe UI', system-ui, sans-serif",
                color: colorAr,
                fontSize: `${fontSize}px`
              }}
            >
              {nameAr}
            </span>
            <span 
              className="font-black tracking-widest uppercase whitespace-nowrap mt-0.5 animate-none"
              style={{ 
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                color: colorEn,
                fontSize: `${Math.max(7, Math.round(fontSize * 0.71))}px`
              }}
            >
              {nameEn}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintableForm({ guest, onClose, onEdit, hotelSettings: propHotelSettings }: PrintableFormProps) {
  // Load hotel settings from local storage or props
  const hotelSettings = propHotelSettings || loadHotelSettings();

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).id === "print-form-outer-wrapper") {
      onClose();
    }
  };

  const [printSize, setPrintSize] = useState<'compact' | 'a5' | 'a4_full_frame'>(
    hotelSettings.defaultPrintSize || 'a4_full_frame'
  );
  const [activeTheme, setActiveTheme] = useState<
    | 'classic'
    | 'elegant-minimal'
    | 'zellige-framing'
    | 'modern-tech'
    | 'vintage-gold'
    | 'sleek-dark'
  >('classic');

  const [printStatus, setPrintStatus] = useState<'preparing' | 'ready'>('preparing');
  const [autoPrintOnThemeChange, setAutoPrintOnThemeChange] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  // WhatsApp Direct High-Resolution Sharing State
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  /**
   * Generates ultra-crisp, high-definition PNG image directly from #print-area
   * Guarantees 100% visual match with currently selected preview theme, fonts, borders and details
   * Uses native SVG foreignObject drawing (html-to-image) to fully support modern CSS / oklch colors natively
   */
  const generateHighResFormImage = async (): Promise<{ blob: Blob; file: File; dataUrl: string; fileName: string }> => {
    const printArea = document.getElementById('print-area');
    if (!printArea) {
      throw new Error('لم يتم العثور على منطقة استمارة الطباعة.');
    }

    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (fontErr) {
        console.warn('Font ready check warning:', fontErr);
      }
    }

    let dataUrl: string;
    try {
      // Primary high-res capture with full web fonts to guarantee 100% preview match
      dataUrl = await toPng(printArea, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: false,
        style: {
          margin: '0 auto',
          boxShadow: 'none',
          transform: 'none',
        },
      });
    } catch (toPngErr) {
      console.warn('Primary toPng render with fonts failed, retrying with fallback:', toPngErr);
      dataUrl = await toPng(printArea, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        style: {
          margin: '0 auto',
          boxShadow: 'none',
        },
      });
    }

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const cleanGuestName = `${guest.firstNameAr || 'نزيل'}_${guest.lastNameAr || ''}`.trim().replace(/\s+/g, '_');
    const fileName = `استمارة_${cleanGuestName}_غرفة_${guest.roomNumber || '00'}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    return { blob, file, dataUrl, fileName };
  };

  /**
   * Direct 1-click WhatsApp dispatch:
   * 1. Downloads the ultra-high resolution image of the form to user's device first.
   * 2. Copies the image directly to system clipboard (ready for Ctrl+V paste into WhatsApp).
   * 3. On mobile/supported platforms: uses native Share API with file attached directly into WhatsApp.
   * 4. On desktop: launches WhatsApp application/Web cleanly without text overriding the image.
   */
  const handleSendViaWhatsAppDirect = async () => {
    if (isSendingWhatsApp) return;
    setIsSendingWhatsApp(true);

    try {
      const { blob, file, dataUrl, fileName } = await generateHighResFormImage();

      // Step 1: Download the high-res image directly to user's device
      try {
        const downloadLink = document.createElement('a');
        downloadLink.href = dataUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } catch (dlErr) {
        console.warn('Auto download notice:', dlErr);
      }

      // Step 2: Copy image BLOB directly to clipboard for instant pasting (Ctrl + V)
      let copiedToClipboard = false;
      try {
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          copiedToClipboard = true;
        }
      } catch (clipErr) {
        console.warn('Clipboard image write notice:', clipErr);
      }

      // Step 3: Check native Web Share API Level 2 (Direct file sharing on mobile / modern OS)
      const guestFullName = `${guest.firstNameAr || ''} ${guest.lastNameAr || ''}`.trim() || 'النزيل';
      let sharedDirectly = false;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `استمارة إقامة النزيل - ${guestFullName}`,
          });
          sharedDirectly = true;
          setShareToast('تم إرسال صورة الاستمارة بنجاح 📸');
          setTimeout(() => setShareToast(null), 4000);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            // User cancelled share sheet
            return;
          }
          console.warn('Native share fallback notice:', shareErr);
        }
      }

      // Step 4: For Desktop or when Web Share is not available:
      // Launch WhatsApp without URL text parameter so WhatsApp doesn't replace the image with text
      const waAppProtocol = 'whatsapp://';
      const waWebUrl = 'https://web.whatsapp.com';

      // 1. Launch installed WhatsApp application protocol
      try {
        const appLink = document.createElement('a');
        appLink.href = waAppProtocol;
        document.body.appendChild(appLink);
        appLink.click();
        document.body.removeChild(appLink);
      } catch (appErr) {
        console.warn('WhatsApp direct protocol notice:', appErr);
      }

      // 2. Also open WhatsApp Web in new tab
      try {
        const webLink = document.createElement('a');
        webLink.href = waWebUrl;
        webLink.target = '_blank';
        webLink.rel = 'noopener noreferrer';
        document.body.appendChild(webLink);
        webLink.click();
        document.body.removeChild(webLink);
      } catch {
        window.open(waWebUrl, '_blank');
      }

      // Show toast guidance
      setShareToast(
        copiedToClipboard
          ? 'تم حفظ صورة الاستمارة في جهازك ونسخها إلى الحافظة! في محادثة واتساب اضغط (Ctrl + V / لصق) لإرسال الصورة مباشرة 📸'
          : 'تم تنزيل صورة الاستمارة إلى جهازك! يمكنك إرفاقها مباشرة في محادثة واتساب 📸'
      );
      setTimeout(() => setShareToast(null), 6000);

    } catch (err: any) {
      console.error('WhatsApp direct dispatch error:', err);
      setShareToast('حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى.');
      setTimeout(() => setShareToast(null), 4000);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIframe(window.self !== window.top);
    }
  }, []);

  const defaultNotesAr = hotelSettings.defaultPrintNotesAr || '';
  const defaultPoliceNotesAr = hotelSettings.defaultPoliceNotesAr || '';
  const receptionStampTitle = hotelSettings.defaultReceptionStampTitle || 'إمضاء وختم مسؤول الاستقبال';
  
  // Determine displayed check-out date based on payments and indefinite stay status
  const getCheckoutDateDisplay = () => {
    const isBeforeFirstPayment = typeof guest.paidDays !== 'number' || guest.paidDays <= 0;
    const isIndefiniteOrEmpty = !!guest.isIndefiniteStay || !guest.checkOutDate || guest.checkOutDate === guest.checkInDate;
    
    if (isBeforeFirstPayment && isIndefiniteOrEmpty) {
      return 'غير محدد';
    }
    return guest.checkOutDate ? formatDateDMY(guest.checkOutDate) : 'إقامة مفتوحة';
  };
  
  // Auto-trigger print dialog slightly after template renders, allowing fonts/images to settle nicely
  useEffect(() => {
    document.body.classList.add('is-printing-form');
    setPrintStatus('preparing');
    
    const timer = setTimeout(() => {
      setPrintStatus('ready');
      if (autoPrintOnThemeChange) {
        window.print();
      }
    }, 1200); // 1.2s is the professional industry standard to ensure paint completes before triggering print preview

    return () => {
      clearTimeout(timer);
    };
  }, [activeTheme, autoPrintOnThemeChange]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('is-printing-form');
    };
  }, []);

  const widthMm = printSize === 'compact' ? 95 : 190;
  const heightMm = printSize === 'compact' ? 132 : (printSize === 'a5' ? 120 : 264);
  const paddingCss = printSize === 'compact' ? '2mm 4mm' : '4mm 6mm';
  const printTopMargin = printSize === 'compact' ? '4mm' : (printSize === 'a5' ? '4mm' : '6mm');

  // Screen and print layouts are handled via CSS rules below

  return (
    <div 
      id="print-form-outer-wrapper" 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-start p-3 sm:p-5 md:p-8 overflow-y-auto print:block print:p-0 print:bg-transparent print:backdrop-blur-none print:w-full print:h-auto" 
      dir="rtl"
    >
      {/* Floating high-contrast close button on screen */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[110] bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white py-2 px-3.5 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 print:hidden border border-slate-700 text-xs font-bold"
        title="إغلاق المعاينة"
      >
        <span>إغلاق المعاينة</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Dynamic Toast Feedback for WhatsApp / Copy Actions */}
      {shareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-lg w-[92%] bg-slate-900 border-2 border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 text-center justify-center font-bold text-xs sm:text-sm pointer-events-none">
          <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* 🌟 Floating Rounded Modal Box optimized to maximize viewport space and prevent spillages on laptops */}
      <div className="print-modal-inner relative bg-slate-900 border border-slate-800/80 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col lg:flex-row w-full max-w-6xl h-[95vh] lg:h-[92vh] print:h-auto overflow-hidden mt-2 lg:mt-3 print:mt-0 print:border-none print:shadow-none print:rounded-none select-text print:bg-transparent print:p-0 print:m-0 print:w-full print:max-w-none">
      
      {/* Scope-specific CSS styling for screen and print dynamics */}
      <style>{`
        /* High contrast, tactile-friendly elegant amber scrollbars specifically for the preview panel */
        .always-scrollbar::-webkit-scrollbar {
          width: 9px !important;
          height: 9px !important;
        }
        .always-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.9) !important;
          border-radius: 9px !important;
        }
        .always-scrollbar::-webkit-scrollbar-thumb {
          background: #cca43b !important;
          border-radius: 9px !important;
          border: 2px solid rgba(15, 23, 42, 0.9) !important;
        }
        .always-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e4c46a !important;
        }
        .always-scrollbar {
          scrollbar-width: thin !important;
          scrollbar-color: #cca43b rgba(15, 23, 42, 0.9) !important;
        }

        /* Screen preview styling matches paper measurements exactly to prevent layout shifts */
        @media screen {
          #print-area {
            width: 100% !important;
            max-width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            min-height: ${heightMm}mm !important;
            max-height: ${heightMm}mm !important;
            box-sizing: border-box !important;
            padding: ${paddingCss} !important;
            box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.7) !important;
            margin: 0 auto !important;
            border-radius: 8px !important;
            /* Theme-specific borders handled at end of style tag */
            background-color: #ffffff !important;
            overflow: hidden !important;
            position: relative;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        }

        /* Strict Print Rules: Centered Top Half of A4 Portrait page */
        @media print {
          /* Setup page size and margins for portrait */
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm !important;
          }

          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body.is-printing-form * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Flatten layout hierarchy specifically during guest form prints.
             By scoping with 'body.is-printing-form', we guarantee that standard positioning is untouched elsewhere. */
          body.is-printing-form #root {
            visibility: hidden !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
          }

          body.is-printing-form #root > div,
          body.is-printing-form #print-form-outer-wrapper,
          body.is-printing-form .print-modal-inner,
          body.is-printing-form .print-preview-container,
          body.is-printing-form .print-preview-container > div {
            visibility: visible !important;
            position: static !important;
            display: block !important;
            width: 100% !important;
            min-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0px !important;
            outline: none !important;
          }

          body.is-printing-form #print-area,
          body.is-printing-form #print-area * {
            visibility: visible !important;
          }

          body.is-printing-form #root > div > *:not(#print-form-outer-wrapper) {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide ALL screen elements, toolbars, buttons, headers */
          .print\\:hidden, [class*="print:hidden"], button, header, footer, .on-screen-header, .theme-switcher-ui {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Primary portrait centered in top half of A4 portrait */
          #print-area {
            position: relative !important;
            margin: 0 auto !important;
            width: ${widthMm}mm !important;
            max-width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            max-height: ${heightMm}mm !important;
            padding: ${paddingCss} !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            /* Theme-specific borders & radius applied globally */
            overflow: hidden !important; /* Block spill! */
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            z-index: 999999 !important;
          }


        }

        /* -------------------------------------------------------------
           DYNAMIC SCALING MACROS (SUPPORT DICTATED BY printSize VARIABLE)
           ------------------------------------------------------------- */
        #print-area {
          font-family: 'Cairo', sans-serif !important;
          color: #000000 !important;
          background-color: #ffffff !important;
          line-height: 1.15 !important;

          /* Default CSS Custom Properties (Optimized for Small/A6 Compact) */
          --f-title: 12px;
          --f-heading: 9.5px;
          --f-base: 8.5px;
          --f-small: 7.5px;
          --f-micro: 6.5px;
          
          --p-large: 3.5px;
          --p-medium: 2.5px;
          --p-small: 1.5px;
          
          --px-large: 3.5px;
          --py-large: 2px;
          
          --gap-sz: 2.5px;
          --seal-sz: 28px;
          --seal-sz-lg: 38px;
          
          --row-hg: 11px;
          --sig-hg: 48px;
        }

        #print-area.size-a5 {
          /* Expanded spacing metrics and legibility scales optimized specifically for A5 page footprint (shorter 120mm height) */
          --f-title: 13.5px;
          --f-heading: 10.5px;
          --f-base: 9.5px;
          --f-small: 8.5px;
          --f-micro: 7px;
          
          --p-large: 4px;
          --p-medium: 3px;
          --p-small: 2px;
          
          --px-large: 5px;
          --py-large: 3px;
          
          --gap-sz: 3px;
          --seal-sz: 32px;
          --seal-sz-lg: 44px;
          
          --row-hg: 12px;
          --sig-hg: 38px;
        }

        #print-area.size-a4_full_frame {
          /* Premium spacious metrics optimized specifically for full A4 page frame to be larger, clearer and gorgeous */
          --f-title: 18.5px;
          --f-heading: 14.5px;
          --f-base: 13.5px;
          --f-small: 11.5px;
          --f-micro: 9.5px;
          
          --p-large: 9px;
          --p-medium: 6.5px;
          --p-small: 4.5px;
          
          --px-large: 11px;
          --py-large: 6.5px;
          
          --gap-sz: 6px;
          --seal-sz: 48px;
          --seal-sz-lg: 68px;
          
          --row-hg: 18px;
          --sig-hg: 64px;
        }

        #print-area * {
          box-shadow: none !important;
          text-shadow: none !important;
          line-height: 1.15 !important;
        }

        /* Core Typography Scale-Down */
        #print-area .text-3xl, 
        #print-area .text-2xl {
          font-size: var(--f-title) !important;
          line-height: 1.15 !important;
          font-weight: 700 !important;
        }
        #print-area .text-xl, 
        #print-area .text-lg {
          font-size: var(--f-heading) !important;
          line-height: 1.15 !important;
          font-weight: 600 !important;
        }
        #print-area .text-base, 
        #print-area .text-sm {
          font-size: var(--f-base) !important;
          line-height: 1.15 !important;
          font-weight: 500 !important;
        }
        #print-area .text-xs, 
        #print-area .text-\[11px\], 
        #print-area .text-\[10px\] {
          font-size: var(--f-small) !important;
          line-height: 1.1 !important;
        }
        #print-area .text-\[9px\], 
        #print-area .text-\[8px\], 
        #print-area .text-\[5px\] {
          font-size: var(--f-micro) !important;
          line-height: 1.1 !important;
        }

        /* Uniform Margin & Padding Interception */
        #print-area .p-10, 
        #print-area .p-8, 
        #print-area .p-6, 
        #print-area .p-5, 
        #print-area .p-4 {
          padding: var(--p-large) !important;
        }
        #print-area .p-3, 
        #print-area .p-2.5, 
        #print-area .p-2, 
        #print-area .p-1.5 {
          padding: var(--p-medium) !important;
        }
        #print-area .p-1 {
          padding: var(--p-small) !important;
        }

        #print-area .px-10, 
        #print-area .px-8, 
        #print-area .px-6, 
        #print-area .px-5, 
        #print-area .px-4, 
        #print-area .px-3, 
        #print-area .px-2.5 {
          padding-left: var(--px-large) !important;
          padding-right: var(--px-large) !important;
        }
        #print-area .py-10, 
        #print-area .py-8, 
        #print-area .py-6, 
        #print-area .py-5, 
        #print-area .py-4, 
        #print-area .py-3, 
        #print-area .py-2, 
        #print-area .py-1.5 {
          padding-top: var(--py-large) !important;
          padding-bottom: var(--py-large) !important;
        }
        #print-area .pb-10, 
        #print-area .pb-8, 
        #print-area .pb-6, 
        #print-area .pb-5, 
        #print-area .pb-4, 
        #print-area .pb-3, 
        #print-area .pb-2.5, 
        #print-area .pb-2, 
        #print-area .pb-1.5, 
        #print-area .pb-1 {
          padding-bottom: var(--py-large) !important;
        }
        #print-area .pt-10, 
        #print-area .pt-8, 
        #print-area .pt-6, 
        #print-area .pt-5, 
        #print-area .pt-4, 
        #print-area .pt-3, 
        #print-area .pt-2.5, 
        #print-area .pt-2, 
        #print-area .pt-1.5, 
        #print-area .pt-1 {
          padding-top: var(--py-large) !important;
        }

        #print-area .m-4, 
        #print-area .margin-4, 
        #print-area .my-3, 
        #print-area .mt-4, 
        #print-area .mt-3, 
        #print-area .mt-2 {
          margin-top: var(--p-small) !important;
          margin-bottom: var(--p-small) !important;
        }
        #print-area .mb-4, 
        #print-area .mb-3, 
        #print-area .mb-2, 
        #print-area .mb-1.5, 
        #print-area .mb-1, 
        #print-area .mb-0.5 {
          margin-bottom: var(--p-small) !important;
        }
        #print-area .mt-1 {
          margin-top: var(--p-small) !important;
        }

        #print-area .gap-x-6, 
        #print-area .gap-x-4, 
        #print-area .gap-y-3, 
        #print-area .gap-4, 
        #print-area .gap-3, 
        #print-area .gap-2 {
          gap: var(--gap-sz) !important;
        }

        #print-area .space-y-4 > * + *,
        #print-area .space-y-3 > * + *,
        #print-area .space-y-2.5 > * + *,
        #print-area .space-y-2 > * + *,
        #print-area .space-y-1.5 > * + *,
        #print-area .space-y-1 > * + * {
          margin-top: var(--p-small) !important;
        }

        /* Structural Content Refitting */
        #print-area h1 {
          font-size: calc(var(--f-title) + 1px) !important;
          font-weight: 700 !important;
        }
        #print-area h3 {
          font-size: var(--f-heading) !important;
          border-bottom-width: 1px !important;
          font-weight: 600 !important;
        }
        #print-area strong, 
        #print-area .font-black, 
        #print-area .font-extrabold {
          font-weight: 600 !important;
        }

        #print-area .header-container {
          border-bottom-width: 1px !important;
          padding-bottom: var(--p-small) !important;
          margin-bottom: calc(var(--p-small) * 1.5) !important;
        }
        #print-area .form-title-tag {
          font-size: var(--f-heading) !important;
          padding: var(--p-small) var(--px-large) !important;
          max-width: 280px !important;
          margin: 1px auto 0 !important;
          border-width: 1px !important;
        }
        #print-area .form-title-tag div {
          font-size: var(--f-micro) !important;
          margin-top: 0px !important;
        }
        #print-area .stay-title, 
        #print-area .personal-title {
          font-size: var(--f-heading) !important;
          border-b-width: 1px !important;
        }
        #print-area .room-id-box {
          border-width: 1px !important;
          padding: var(--p-medium) var(--px-large) !important;
        }
        #print-area .room-id-box div {
          font-size: var(--f-small) !important;
        }
        #print-area .room-num-text {
          font-size: calc(var(--f-title) + 1px) !important;
        }
        #print-area .stay-dates-box {
          border-width: 1px !important;
          padding: var(--p-medium) var(--px-large) !important;
        }
        #print-area .stay-dates-box div {
          font-size: var(--f-micro) !important;
        }
        #print-area .stay-dates-box .font-mono {
          font-size: var(--f-small) !important;
        }
        #print-area .info-box-table {
          border-width: 1px !important;
        }
        #print-area .info-row {
          padding: var(--p-small) var(--px-large) !important;
          border-bottom-width: 1px !important;
        }
        #print-area .info-label {
          font-size: var(--f-small) !important;
        }
        #print-area .info-val {
          font-size: var(--f-base) !important;
        }
        #print-area .parents-row-block {
          border-width: 1px !important;
          padding: var(--p-small) var(--px-large) !important;
          gap: 1px !important;
        }
        #print-area .parents-row-block .info-label {
          font-size: var(--f-small) !important;
        }
        #print-area .parents-row-block .info-val {
          font-size: var(--f-base) !important;
        }
        #print-area .notes-container {
          margin-top: 1px !important;
        }
        #print-area .notes-text {
          font-size: var(--f-small) !important;
          padding: 1px !important;
        }
        #print-area .signatures-block {
          margin-top: auto !important; /* Pull up to fill any available space */
          padding-top: var(--p-medium) !important;
          border-top-width: 1.2px !important;
        }
        #print-area .sig-underlines {
          font-size: var(--f-base) !important;
          margin-bottom: var(--p-small) !important;
        }
        #print-area .sig-label-text {
          font-size: var(--f-micro) !important;
        }
        #print-area .watermark-footer {
          font-size: var(--f-micro) !important;
        }
        #print-area .w-12, 
        #print-area .h-12, 
        #print-area .w-9, 
        #print-area .h-9, 
        #print-area .w-8, 
        #print-area .h-8 {
          width: var(--seal-sz) !important;
          height: var(--seal-sz) !important;
        }
        #print-area .h-6, 
        #print-area .h-5, 
        #print-area .h-4 {
          height: var(--row-hg) !important;
        }
        #print-area .signatures-block .h-4,
        #print-area .signatures-block .h-6 {
          height: var(--sig-hg) !important; /* Generous height raised up dynamically */
        }
        #print-area .signatures-block .h-12,
        #print-area .signatures-block .w-12 {
          height: var(--seal-sz-lg) !important; /* Expanded official royal stamp seal */
          width: var(--seal-sz-lg) !important;
        }

        /* -------------------------------------------------------------
           THEME & SIZE-SPECIFIC SURROUNDING BORDERS FOR GUEST FORMS (#print-area)
           ------------------------------------------------------------- */
        /* 1. Classic Theme Border */
        #print-area.theme-classic {
          border: 1.5px solid #111827 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background-clip: padding-box !important;
        }
        #print-area.theme-classic.size-compact {
          border-width: 1px !important;
        }
        #print-area.theme-classic.size-a5 {
          border-width: 1.2px !important;
        }

        /* 2. Elegant Minimal Border */
        #print-area.theme-elegant-minimal {
          border: 1px solid #cbd5e1 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background-clip: padding-box !important;
        }
        #print-area.theme-elegant-minimal.size-compact {
          border-width: 0.7px !important;
        }

        /* 3. Zellige Framing Border */
        #print-area.theme-zellige-framing {
          border: 1.8px solid #064e3b !important;
          outline: 1px solid #cca43b !important;
          outline-offset: -3px !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background-clip: padding-box !important;
        }
        #print-area.theme-zellige-framing.size-compact {
          border-width: 1.2px !important;
          outline-width: 0.75px !important;
          outline-offset: -2px !important;
        }
        #print-area.theme-zellige-framing.size-a5 {
          border-width: 1.5px !important;
          outline-width: 1px !important;
          outline-offset: -2.5px !important;
        }

        /* 4. Modern Tech Border */
        #print-area.theme-modern-tech {
          border: 1.8px solid #0f172a !important;
          outline: 1px dashed #475569 !important;
          outline-offset: -3px !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background-clip: padding-box !important;
        }
        #print-area.theme-modern-tech.size-compact {
          border-width: 1.2px !important;
          outline-width: 0.75px !important;
          outline-offset: -2px !important;
        }
        #print-area.theme-modern-tech.size-a5 {
          border-width: 1.5px !important;
          outline-width: 1px !important;
          outline-offset: -2.5px !important;
        }

        /* 5. Vintage Gold Border */
        #print-area.theme-vintage-gold {
          border: 3.5px double #78350f !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background-clip: padding-box !important;
        }
        #print-area.theme-vintage-gold.size-compact {
          border-width: 2px double !important;
        }
        #print-area.theme-vintage-gold.size-a5 {
          border-width: 2.5px double !important;
        }

        /* 6. Sleek Dark Border */
        #print-area.theme-sleek-dark {
          border: 1.5px solid #292524 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background-clip: padding-box !important;
        }
        #print-area.theme-sleek-dark.size-compact {
          border-width: 1px !important;
        }
        #print-area.theme-sleek-dark.size-a5 {
          border-width: 1.2px !important;
        }
      `}</style>

      {/* On-Screen beautiful Sticky Controls Sidebar (Hidden on print) */}
      <div className="w-full lg:w-[400px] bg-slate-900 border-b lg:border-b-0 lg:border-l border-white/10 p-5 flex flex-col justify-between print:hidden shrink-0 h-auto lg:h-full overflow-y-auto z-50">
        <div>
          {/* Main Logo & Header */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/10 shadow-inner">
              <Printer className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-right">
              <span className="font-extrabold text-[#cca43b] text-sm md:text-base block leading-tight">مستند التحقق الأمني والضيافة</span>
            </div>
          </div>

          {/* Quick info about current active guest */}
          <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 text-xs text-right space-y-1 mb-5">
            <div className="text-slate-400 text-[10px] font-bold">ملف النزيل النشط:</div>
            <div className="font-black text-white text-sm">{guest.firstNameAr} {guest.lastNameAr}</div>
            <div className="text-[#cca43b] font-bold">الغرفة {guest.roomNumber} | تاريخ الدخول {formatDateDMY(guest.checkInDate)}</div>
          </div>

          {/* Print/Download Urgent Actions */}
          <div className="space-y-3 mb-6">
            <button 
              type="button"
              onClick={() => window.print()}
              className="w-full bg-[#cca43b] hover:bg-[#b08b30] text-slate-950 py-3.5 px-4 rounded-xl font-black transition-all shadow-md cursor-pointer text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95 border border-yellow-350/20"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>طباعة الاستمارة الفورية</span>
            </button>

            {/* Return to Edit Guest Data Button */}
            <button 
              type="button"
              onClick={onEdit || onClose}
              className="w-full bg-slate-800 hover:bg-slate-700/80 text-amber-300 hover:text-amber-200 py-3.5 px-4 rounded-xl font-black transition-all border border-amber-400/40 cursor-pointer text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              title="العودة لتعديل بيانات النزيل قبل الطباعة"
            >
              <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>العودة لتعديل بيانات النزيل</span>
            </button>

            {/* WhatsApp Send Image Button */}
            <button 
              type="button"
              onClick={handleSendViaWhatsAppDirect}
              disabled={isSendingWhatsApp}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 px-4 rounded-xl font-black transition-all shadow-md cursor-pointer text-xs md:text-sm flex items-center justify-center gap-2 active:scale-95 border border-emerald-400/30 disabled:opacity-75 disabled:cursor-not-allowed"
              title="إرسال مباشر لصورة الاستمارة فائقة الدقة عبر الواتساب"
            >
              <MessageCircle className="w-4 h-4 text-white shrink-0" />
              <span>إرسال الاستمارة عبر الواتساب</span>
            </button>

            {isIframe && (
              <button 
                type="button"
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full bg-slate-800 hover:bg-slate-700/80 text-white py-3 px-4 rounded-xl font-bold transition-all border border-slate-700/50 cursor-pointer text-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>فتح بكامل الشاشة (للتغلب على مشاكل الطباعة في الإطار) ↗</span>
              </button>
            )}
          </div>

          {/* Print Size Selection */}
          <div className="border-t border-white/5 pt-4 mb-4">
            <h3 className="text-[#cca43b] text-[10.5px] font-black uppercase tracking-wider mb-2.5">حجم طباعة الاستمارة (حجم ورقة الطباعة):</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPrintSize('compact')}
                className={`py-2.5 px-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 min-h-[56px] ${
                  printSize === 'compact'
                    ? 'bg-[#cca43b]/10 border-[#cca43b] text-[#cca43b] shadow-inner font-bold'
                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <span className="font-extrabold text-[11.5px]">صغيرة مدمجة (A6)</span>
                <span className="text-[8.5px] text-slate-400 block leading-none">توفير رائع في الورق والطباعة</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintSize('a5')}
                className={`py-2.5 px-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 min-h-[56px] ${
                  printSize === 'a5'
                    ? 'bg-[#cca43b]/10 border-[#cca43b] text-[#cca43b] shadow-inner font-bold'
                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <span className="font-extrabold text-[11.5px]">نصف صفحة عريضة (A5)</span>
                <span className="text-[8.5px] text-slate-400 block leading-none">تعبأ النصف العلوي فقط مع الحجم العريض الممتاز</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintSize('a4_full_frame')}
                className={`py-2.5 px-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 min-h-[56px] ${
                  printSize === 'a4_full_frame'
                    ? 'bg-[#cca43b]/10 border-[#cca43b] text-[#cca43b] shadow-inner font-bold'
                    : 'bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <span className="font-extrabold text-[11.5px]">كامل الصفحة (A4)</span>
                <span className="text-[8.5px] text-slate-400 block leading-none">تعبأ كامل الصفحة لتبدو استمارة رسمية فاخرة وواضحة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Close option */}
        <div className="pt-4 border-t border-white/10 mt-6">
          <button 
            type="button"
            onClick={onClose}
            className="w-full bg-white/10 hover:bg-white/15 text-white py-2.5 px-4 rounded-xl font-bold transition-all text-xs cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1"
          >
            <span>إغلاق المعاينة والرجوع</span>
          </button>
        </div>
      </div>

      {/* On-Screen Scrollable Document preview area (Independent scroll) */}
      <div className="flex-1 flex flex-col bg-slate-950/70 print:bg-transparent print:p-0 h-full w-full z-10 print-preview-container overflow-hidden print:overflow-visible print:border-none print:shadow-none">
        
        {/* Scrollable Document container equipped with high-contrast customizable scrollbars */}
        <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 flex items-start justify-center always-scrollbar print:p-0 print:m-0 print:bg-transparent print:block print:overflow-visible">
        
        {/* The Printable Page format (A4 proportions relative, forced height: 148.5mm for print) */}
        <div 
          className={`max-w-4xl mx-auto bg-white p-6 md:p-10 font-sans text-slate-900 transition-all theme-${activeTheme} size-${printSize}`}
          dir="rtl" 
          id="print-area"
        >
        
        {/* Render Design 1: Classic Standard Style */}
        {activeTheme === 'classic' && (
          <div className="flex flex-col justify-between h-full w-full bg-white text-black print:text-black">
            <PrintContentWrapper printSize={printSize}>
              {/* Header Section */}
            <div className="text-center border-b-2 border-black pb-3 mb-3 relative header-container flex flex-col items-center">
              <BrandLogo 
                variant="full" 
                hotelNameAr={hotelSettings.hotelNameAr}
                hotelNameEn={hotelSettings.hotelNameEn}
                hotelSubtitle=""
                hotelPhone={hotelSettings.hotelPhone}
                hotelEmail={hotelSettings.hotelEmail}
                className="justify-center mt-1 relative z-10 scale-95 grayscale [&_*]:text-black print:[&_*]:text-black" 
              />
              
              <div className="mt-3 text-lg font-black text-black uppercase tracking-widest border-2 border-black py-1.5 rounded-lg bg-gray-50 shadow-sm mx-auto max-w-sm relative z-10 form-title-tag w-full">
                الاستمارة الأمنية للنزيل
                <div className="text-[9px] tracking-normal mt-0.5 text-black uppercase font-mono font-bold">GUEST SECURITY REGISTRATION FORM</div>
              </div>
            </div>

            {/* Content Segment */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 layout-grid text-black">
              <div className="col-span-2">
                <h3 className="text-black font-extrabold text-sm mb-0.5 border-b-2 border-black pb-0.5 inline-block stay-title font-sans">معلومات الإقامة والنزول الفندقي <span className="text-xs font-normal text-gray-700">- Residence Stay Info</span></h3>
              </div>
              
              <div className="border-2 border-black p-2 rounded-lg bg-gray-100 flex flex-col justify-center items-center text-center room-id-box">
                <div>
                  <div className="text-[10px] text-black font-bold">رقم الغرفة المعينة / Room Number</div>
                  <div className="text-lg font-black text-black font-mono room-num-text">
                    الغرفة {guest.roomNumber}
                  </div>
                </div>
              </div>
              
              <div className="border-2 border-black p-2 rounded-lg grid grid-cols-2 gap-2 bg-white stay-dates-box text-right">
                <div className="border-l border-black pl-2">
                  <div className="text-[10px] text-gray-700 mb-0.5 font-bold">تاريخ الدخول</div>
                  <div className="font-extrabold text-xs font-mono text-black" dir="ltr">{formatDateDMY(guest.checkInDate)}</div>
                </div>
                <div className="pr-1">
                  <div className="text-[10px] text-gray-700 mb-0.5 font-bold">تاريخ الخروج</div>
                  <div className="font-extrabold text-xs font-mono text-black" dir="ltr">{getCheckoutDateDisplay()}</div>
                </div>
              </div>

              <div className="col-span-2 mt-1">
                <h3 className="text-black font-extrabold text-sm mb-0.5 border-b-2 border-black pb-0.5 inline-block personal-title font-sans font-black">البيانات الأمنية والشخصية الكاملة للنزيل <span className="text-xs font-normal text-gray-700">- Guest Details</span></h3>
              </div>

              <div className="col-span-1 border-2 border-black rounded-lg overflow-hidden info-box-table text-right bg-white">
                <div className="flex border-b border-black p-1.5 bg-gray-50 info-row">
                  <span className="w-1/3 text-black text-xs font-bold info-label">الاسم:</span>
                  <span className="w-2/3 font-black text-xs text-black info-val">{guest.firstNameAr}</span>
                </div>
                <div className="flex border-b border-black p-1.5 info-row">
                  <span className="w-1/3 text-black text-xs font-bold info-label">اللقب:</span>
                  <span className="w-2/3 font-black text-xs text-black info-val">{guest.lastNameAr}</span>
                </div>
                <div className="flex border-b border-black p-1.5 bg-gray-50 info-row" dir="ltr">
                  <span className="w-1/3 text-black text-xs font-bold info-label text-left" dir="ltr">First Name:</span>
                  <span className="w-2/3 font-black text-xs uppercase text-left info-val text-black" dir="ltr">{guest.firstNameEn}</span>
                </div>
                <div className="flex p-1.5 info-row" dir="ltr">
                  <span className="w-1/3 text-black text-xs font-bold info-label text-left" dir="ltr">Last Name:</span>
                  <span className="w-2/3 font-black text-xs uppercase text-left info-val text-black" dir="ltr">{guest.lastNameEn}</span>
                </div>
              </div>

              <div className="col-span-1 border-2 border-black rounded-lg overflow-hidden info-box-table text-right bg-white">
                <div className="flex border-b border-black p-1.5 bg-gray-50 info-row">
                  <span className="w-1/3 text-black text-xs font-bold info-label">نوع الوثيقة:</span>
                  <span className="w-2/3 font-extrabold text-xs text-black info-val">{guest.idType}</span>
                </div>
                <div className="flex border-b border-black p-1.5 info-row">
                  <span className="w-1/3 text-black text-xs font-bold info-label">رقم الوثيقة:</span>
                  <span className="w-2/3 font-black text-xs tracking-wider font-mono text-black info-val">{guest.idNumber}</span>
                </div>
                <div className="flex border-b border-black p-1.5 bg-gray-50 info-row">
                  <span className="w-1/3 text-black text-xs font-bold info-label">تاريخ الميلاد:</span>
                  <span className="w-2/3 font-extrabold text-xs font-mono text-black info-val" dir="ltr">{formatDateDMY(guest.dob)}</span>
                </div>
                <div className="flex border-b border-black p-1.5 info-row">
                  <span className="w-1/3 text-black text-xs font-bold info-label">مكان الميلاد:</span>
                  <span className="w-2/3 font-extrabold text-xs text-black info-val">{guest.pob}</span>
                </div>
                <div className="flex p-1.5 bg-gray-50 info-row">
                  <span className="w-1/3 text-black text-xs font-bold info-label">الجنسية:</span>
                  <span className="w-2/3 font-black text-xs text-black info-val">{guest.nationality || 'جزائرية'}</span>
                </div>
              </div>
              
              <div className="col-span-2 border-2 border-black rounded-lg overflow-hidden grid grid-cols-2 text-right bg-white">
                <div className="flex p-1.5 bg-gray-50 items-center border-l border-b border-black">
                  <span className="w-1/3 text-black text-xs font-bold info-label">اسم الأب:</span>
                  <span className="w-2/3 font-black text-xs text-black info-val">{guest.fatherName}</span>
                </div>
                <div className="flex p-1.5 bg-gray-50 items-center border-b border-black">
                  <span className="w-1/3 text-black text-xs font-bold info-label">اسم ولقب الأم:</span>
                  <span className="w-2/3 font-black text-xs text-black info-val">{guest.motherFullName}</span>
                </div>
                <div className="flex p-1.5 bg-gray-50 items-center border-l border-black">
                  <span className="w-1/3 text-black text-xs font-bold info-label">صفة الإشغال:</span>
                  <span className="w-2/3 font-black text-xs text-black info-val">{guest.roomClassification || 'النزيل الأول'}</span>
                </div>
                <div className="flex p-1.5 bg-gray-50 items-center">
                  <span className="w-1/3 text-black text-xs font-bold info-label">رقم الهاتف:</span>
                  <span className="w-2/3 font-black text-xs text-black info-val font-mono">{guest.phoneNumber || 'غير مسجل'}</span>
                </div>
              </div>

              <div className="col-span-2 mt-0.5 notes-container text-right">
                <h4 className="text-[10px] font-black text-black mb-0.5 border-b border-black inline-block pb-0.5">ملاحظات مسؤول الاستقبال والأمن:</h4>
                <p className="border border-black p-1 rounded bg-gray-50/20 text-black font-semibold leading-tight text-[9.5px] notes-text min-h-[22px] flex items-center">
                  {guest.notes || defaultPoliceNotesAr || defaultNotesAr || <span className="text-gray-400 font-normal">...............................................................................................................................................</span>}
                </p>
              </div>
            </div>

            {/* A4 Watermark Spacer */}
            <A4WatermarkSpacer printSize={printSize} hotelSettings={hotelSettings} />

            {/* Solid Compact Footer Signatures Block */}
            <div className={`mt-4 grid ${printSize === 'compact' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 text-black border-t-2 border-black pt-3 signatures-block`}>
              <div className={`relative ${printSize === 'compact' ? 'flex flex-col items-end w-full' : 'flex flex-col items-center'}`}>
                <p className={`font-black text-black tracking-wide text-xs sig-underlines ${printSize === 'compact' ? 'mb-0 text-right pr-2 w-full pb-1' : 'mb-1 text-center'}`}>{receptionStampTitle}</p>
                <div className={`${printSize === 'a4_full_frame' ? 'h-16' : 'h-10'} w-full`}></div>
                <div className={`${printSize === 'compact' ? 'w-full flex justify-end pr-2' : 'w-full text-center'}`}>
                  <p className={`border-t border-black border-dashed ${printSize === 'compact' ? 'w-36 text-center' : 'inline-block px-4'} inline-block pt-0.5 text-[9px] text-gray-800 font-bold uppercase tracking-wider sig-label-text`}>Reception Sign</p>
                </div>
              </div>
              {printSize !== 'compact' && (
                <div className="text-center">
                  <p className="font-black mb-1 text-black tracking-wide text-xs sig-underlines">إمضاء وتوقيع النزيل الوافد</p>
                  <div className={`${printSize === 'a4_full_frame' ? 'h-16' : 'h-10'} w-full`}></div>
                  <p className="border-t border-black border-dashed inline-block px-4 pt-0.5 text-[9px] text-gray-800 font-bold uppercase tracking-wider sig-label-text">Guest Signature</p>
                </div>
              )}
            </div>
            </PrintContentWrapper>
          </div>
        )}



        {/* Render Design 3: Elegant Minimalist Layout */}
        {activeTheme === 'elegant-minimal' && (
          <div className="flex flex-col justify-between h-full w-full font-sans bg-white text-black print:text-black">
            <PrintContentWrapper printSize={printSize}>
              {/* Header section with fine horizontal bars */}
            <div className="text-right border-y border-neutral-400 py-3 mb-2 flex justify-between items-center header-container">
              <div>
                <h1 className="text-xl font-black text-black tracking-tight">الاستمارة الأمنية للنزيل</h1>
                <p className="text-[9.5px] uppercase tracking-wider text-black font-mono">GUEST SECURITY REGISTRATION SHEET (MODEL 2)</p>
                {(hotelSettings.hotelPhone || hotelSettings.hotelNameEn) && (
                  <p className="text-[8.5px] text-neutral-800 font-mono mt-0.5 font-bold" dir="ltr">
                    {hotelSettings.hotelPhone ? `Tel: ${hotelSettings.hotelPhone} ` : ''}
                    {hotelSettings.hotelPhone && hotelSettings.hotelNameEn ? '• ' : ''}
                    {hotelSettings.hotelNameEn}
                  </p>
                )}
                {hotelSettings.hotelEmail && (
                  <p className="text-[8.5px] text-neutral-800 font-mono mt-0.5 font-bold" dir="ltr">
                    Email: {hotelSettings.hotelEmail}
                  </p>
                )}
              </div>
              <div className="text-left font-mono text-[9px] text-neutral-800">
                <div>ROOM: <strong>{guest.roomNumber}</strong></div>
                <div>CHECK-IN: {formatDateDMY(guest.checkInDate)}</div>
              </div>
            </div>

            {/* Clean Minimalist Data list */}
            <div className="space-y-2 text-right text-black">
              <div className="border-b border-neutral-300 pb-2.5">
                <span className="text-[10px] text-black uppercase tracking-widest font-mono block font-black">إسم النزيل المستفيد / Full Name</span>
                <div className="flex gap-4 items-baseline mt-0.5">
                  <span className="text-base font-black text-black">{guest.firstNameAr} {guest.lastNameAr}</span>
                  <span className="text-xs text-neutral-600 font-mono tracking-wide uppercase font-bold">({guest.firstNameEn} {guest.lastNameEn})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 layout-grid text-black">
                <div>
                  <span className="text-[10px] text-neutral-700 block font-bold">تاريخ الدخول والرمز:</span>
                  <span className="text-xs font-mono font-black text-black">{formatDateDMY(guest.checkInDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-700 block font-bold">تاريخ الخروج والاستلام:</span>
                  <span className="text-xs font-mono font-black text-black">{getCheckoutDateDisplay()}</span>
                </div>

                <div className="col-span-2 border-t border-neutral-300 pt-2 grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-neutral-700 block font-bold">سند التعريف المدعوم:</span>
                    <span className="text-xs font-black text-black">{guest.idType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-700 block font-bold">رقم وثيقة الهوية:</span>
                    <span className="text-xs font-mono font-black text-black">{guest.idNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-700 block font-bold">الجنسية والوطن الأصلي:</span>
                    <span className="text-xs font-black text-black">{guest.nationality || 'جزائرية'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-700 block font-bold">صفة الإشغال للغرفة:</span>
                    <span className="text-xs font-black text-black">{guest.roomClassification || 'النزيل الأول'}</span>
                  </div>
                </div>

                <div className="col-span-2 border-t border-neutral-300 pt-2 grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-neutral-700 block font-bold">مكان وتاريخ الولادة:</span>
                    <span className="text-xs font-extrabold text-black">{guest.pob} - {formatDateDMY(guest.dob)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-700 block font-bold">الوالدان بالأكمل:</span>
                    <span className="text-xs font-extrabold text-black">{guest.fatherName} • {guest.motherFullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-700 block font-bold">رقم الهاتف المحمول:</span>
                    <span className="text-xs font-mono font-black text-black">{guest.phoneNumber || 'غير مسجل'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-1 border border-neutral-300 p-1.5 rounded bg-neutral-50/30 text-[10px] text-black">
                <span className="font-black text-black">ملاحظات مسؤول الاستقبال والأمن:</span>{' '}
                <span className={(guest.notes || defaultPoliceNotesAr || defaultNotesAr) ? 'font-medium' : 'text-neutral-400'}>
                  {guest.notes || defaultPoliceNotesAr || defaultNotesAr || '........................................................................................................................'}
                </span>
              </div>
            </div>

            {/* A4 Watermark Spacer */}
            <A4WatermarkSpacer printSize={printSize} hotelSettings={hotelSettings} />

            {/* Simple Signature Lines */}
            <div className={`mt-4 border-t border-neutral-300 pt-2 flex ${printSize === 'compact' ? 'flex-col items-end' : 'justify-between items-end'} text-xs text-black font-bold signatures-block w-full`}>
              <div className={`relative ${printSize === 'compact' ? 'flex flex-col items-end w-full pr-2' : 'flex flex-col items-center'}`}>
                <span className={printSize === 'compact' ? 'text-right w-full mb-1' : 'mb-1 text-center'}>{receptionStampTitle}</span>
                <div className={`${printSize === 'a4_full_frame' ? 'h-16' : 'h-10'} w-full`}></div>
                <div className={`border-t border-neutral-300 ${printSize === 'compact' ? 'w-36 text-center' : 'w-28 text-center'} pt-0.5 text-[7.5px] text-neutral-600`}>Reception Agent</div>
              </div>
              {printSize !== 'compact' && (
                <div className="text-center text-[9px] text-neutral-500 tracking-wider">
                  {hotelSettings.hotelNameAr}
                </div>
              )}
              {printSize !== 'compact' && (
                <div className="text-left">
                  <span>توقيع النزيل</span>
                  <div className={`${printSize === 'a4_full_frame' ? 'h-16' : 'h-10'} w-full`}></div>
                  <div className="border-t border-neutral-300 w-24 text-center pt-0.5 text-[7.5px] text-neutral-600">Guest Signature</div>
                </div>
              )}
            </div>
            </PrintContentWrapper>
          </div>
        )}

        {/* Render Design 4: Zellige Framing Traditional Style */}
        {activeTheme === 'zellige-framing' && (
          <div className="flex flex-col justify-between h-full w-full font-sans border-2 border-black p-1 bg-white text-black print:text-black">
            <div className="border border-dashed border-black p-2.5 h-full flex flex-col justify-between relative overflow-hidden">
              <PrintContentWrapper printSize={printSize}>
                {/* Header with Zellige touch */}
              <div className="text-center border-b-2 border-black pb-2 mb-2 header-container flex flex-col items-center">
                <span className="text-[8.5px] font-black text-black select-none block tracking-widest">الجمهورية الجزائرية الديمقراطية الشعبية</span>
                <h1 className="text-lg font-black text-black mt-0.5 tracking-tight">الاستمارة الأمنية للنزيل</h1>
                <p className="text-[8px] font-mono tracking-widest uppercase text-black">GUEST SECURITY REGISTRATION FORM (MODEL 3)</p>
                {(hotelSettings.hotelPhone || hotelSettings.hotelNameEn) && (
                  <p className="text-[8px] font-mono text-black mt-0.5 font-bold" dir="ltr">
                    {hotelSettings.hotelPhone ? `Tel: ${hotelSettings.hotelPhone} ` : ''}
                    {hotelSettings.hotelPhone && hotelSettings.hotelNameEn ? '• ' : ''}
                    {hotelSettings.hotelNameEn}
                  </p>
                )}
                {hotelSettings.hotelEmail && (
                  <p className="text-[8px] font-mono text-black mt-0.5 font-bold" dir="ltr">
                    Email: {hotelSettings.hotelEmail}
                  </p>
                )}
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-12 gap-2 text-right text-xs layout-grid text-black">
                <div className="col-span-12 border border-black p-1.5 bg-gray-100 rounded flex justify-between items-center text-[11px]">
                  <span>رقم الغرفة المخصصة: <strong className="font-sans text-xs">غرفة {guest.roomNumber}</strong></span>
                  <span>صفة الإشغال للغرفة: <strong>{guest.roomClassification || 'النزيل الأول'}</strong></span>
                  <span className="font-mono">من: {formatDateDMY(guest.checkInDate)} • إلى: {getCheckoutDateDisplay()}</span>
                </div>

                <div className="col-span-12 border border-black p-2 rounded bg-white text-right">
                  <div className="text-[9.5px] text-black font-black border-b border-black pb-0.5 mb-1.5">البيانات الشخصية وتفاصيل الاتصال</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">الاسم واللقب بالعربية:</span>
                      <strong className="text-black">{guest.firstNameAr} {guest.lastNameAr}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">الاسم واللقب باللاتينية:</span>
                      <strong className="text-black font-mono text-[10px]">{guest.firstNameEn} {guest.lastNameEn}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">الجنسية والبلد:</span>
                      <strong className="text-black">{guest.nationality || 'جزائرية'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-bold">رقم الهاتف:</span>
                      <strong className="text-black font-mono">{guest.phoneNumber || 'غير مسجل'}</strong>
                    </div>
                  </div>
                </div>

                <div className="col-span-6 border border-black p-2 rounded bg-white">
                  <span className="text-[9.5px] text-black font-bold block">مستند إثبات الهوية المدقق:</span>
                  <div className="mt-1 space-y-1 text-black">
                    <div>نوع المستند: <strong className="font-bold">{guest.idType}</strong></div>
                    <div>رقم وثيقة الهوية: <strong className="font-mono select-all tracking-wider">{guest.idNumber}</strong></div>
                  </div>
                </div>

                <div className="col-span-6 border border-black p-2 rounded bg-white">
                  <span className="text-[9.5px] text-black font-bold block">معلومات الميلاد والنسب:</span>
                  <div className="mt-1 space-y-0.5 text-black">
                    <div>تاريخ ومكان الميلاد: <strong className="font-sans">{formatDateDMY(guest.dob)} {guest.pob ? `في ${guest.pob}` : ''}</strong></div>
                    <div>اسم الأب: <strong>{guest.fatherName}</strong> • اسم كامل للأم: <strong>{guest.motherFullName}</strong></div>
                  </div>
                </div>

                <div className="col-span-12 border border-black bg-gray-50/20 p-1 rounded text-[9.5px] text-black">
                  <span className="font-black">ملاحظات مسؤول الاستقبال والأمن:</span>{' '}
                  <span className={(guest.notes || defaultPoliceNotesAr || defaultNotesAr) ? 'font-semibold' : 'text-neutral-400'}>
                    {guest.notes || defaultPoliceNotesAr || defaultNotesAr || '........................................................................................................................'}
                  </span>
                </div>
              </div>

              {/* A4 Watermark Spacer */}
              <A4WatermarkSpacer printSize={printSize} hotelSettings={hotelSettings} />

              {/* Footer */}
              <div className="mt-4 border-t border-black pt-2.5 flex justify-between items-center text-xs font-bold leading-tight signatures-block text-black">
                <div className="text-right">
                  <span>إمضاء وتوقيع الاستقبال:</span>
                  <div className="h-6"></div>
                  <div className="border-t border-black w-24 text-center pt-0.5 text-[8px] text-black">RECEPTION</div>
                </div>
                {printSize !== 'compact' && (
                  <div className="text-left text-black">
                    <span>إمضاء النزيل:</span>
                    <div className="h-6"></div>
                    <div className="border-t border-black w-20 text-center pt-0.5 text-[8px] text-black">SIGN</div>
                  </div>
                )}
              </div>
              </PrintContentWrapper>

            </div>
          </div>
        )}

        {/* Render Design 6: Modern Tech Grid */}
        {activeTheme === 'modern-tech' && (
          <div className="flex flex-col justify-between h-full w-full font-mono border-2 border-black p-2 bg-white text-black print:text-black">
            <div className="border border-black p-3 h-full flex flex-col justify-between relative">
              {/* Tech background watermark effect on print */}
              <div className="absolute top-2 left-2 text-[8px] text-neutral-400 font-mono tracking-widest select-none">SECURITY_RECORD_PASS_MODEL_4</div>
              
              <PrintContentWrapper printSize={printSize}>
                {/* Tech Header */}
              <div className="text-right border-b border-black pb-2 mb-3 header-container flex justify-between items-end">
                <div>
                  <span className="text-[8px] text-black font-bold block mb-0.5">SYSTEM GENERATED SECURITY PASS</span>
                  <h1 className="text-base font-black text-black leading-tight">الاستمارة الأمنية للنزيل</h1>
                  <span className="text-[10px] text-neutral-500 block font-sans">HOTEL SECURITY PROTOCOL • ALGERIA (MODEL 4)</span>
                  {(hotelSettings.hotelPhone || hotelSettings.hotelNameEn) && (
                    <span className="text-[8.5px] text-neutral-700 font-mono block mt-0.5 font-bold" dir="ltr">
                      {hotelSettings.hotelPhone ? `Tel: ${hotelSettings.hotelPhone} ` : ''}
                      {hotelSettings.hotelPhone && hotelSettings.hotelNameEn ? '• ' : ''}
                      {hotelSettings.hotelNameEn}
                    </span>
                  )}
                  {hotelSettings.hotelEmail && (
                    <span className="text-[8.5px] text-neutral-700 font-mono block mt-0.5 font-bold" dir="ltr">
                      Email: {hotelSettings.hotelEmail}
                    </span>
                  )}
                </div>
                <div className="text-left font-mono text-[9px] text-black">
                  <div>SYS-ID: <strong>HTL-{guest.roomNumber}</strong></div>
                  <div>DEVICE: WIN-HOTEL-PC</div>
                  <div>HASH: {(guest.idNumber || '0000').slice(-4)}-{guest.roomNumber}</div>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-12 gap-2 text-right text-xs layout-grid text-black">
                <div className="col-span-12 border border-black p-2 bg-gray-100 flex justify-between items-center text-[11px] font-bold text-black">
                  <span>ALLOC_ROOM: <strong className="font-sans font-black text-xs text-black">غرفة {guest.roomNumber}</strong></span>
                  <span>STATUS_CLASS: <strong>{guest.roomClassification || 'النزيل الأول'}</strong></span>
                  <span>CHECKIN_TIMESTAMP: {formatDateDMY(guest.checkInDate)}</span>
                </div>

                <div className="col-span-8 border border-black p-2.5 bg-white space-y-1">
                  <span className="text-[9px] text-neutral-600 font-black block border-b border-neutral-250 pb-0.5">{guest.roomClassification || 'النزيل الأول'} / GUEST_RECORD</span>
                  <div className="text-sm font-black text-black tracking-tight font-sans">{guest.firstNameAr} {guest.lastNameAr}</div>
                  <div className="text-[10px] text-neutral-600 font-mono uppercase font-bold">Full Name: {guest.firstNameEn} {guest.lastNameEn}</div>
                  <div className="text-[11px] text-black flex justify-between">
                    <span>الجنسية: {guest.nationality || 'جزائرية'}</span>
                    <span className="font-mono font-bold">TEL: {guest.phoneNumber || 'N/A'}</span>
                  </div>
                </div>

                <div className="col-span-4 border border-black p-2.5 bg-white space-y-1">
                  <span className="text-[9px] text-neutral-600 font-black block border-b border-neutral-250 pb-0.5">تاريخ ومكان الميلاد</span>
                  <div className="text-[11px] font-bold">{formatDateDMY(guest.dob)}</div>
                  <div className="text-[11px] font-sans truncate">{guest.pob}</div>
                  <div className="text-[8.5px] text-neutral-600 font-sans">الأب: {guest.fatherName}</div>
                  <div className="text-[8.5px] text-neutral-600 font-sans">الأم: {guest.motherFullName}</div>
                </div>

                <div className="col-span-12 border border-black p-2.5 bg-white grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-neutral-550 block">وثيقة الهوية / IDENTIFICATION</span>
                    <strong className="text-black font-sans text-xs">{guest.idType}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-550 block">رقم وثيقة الهوية / ID_NUMBER</span>
                    <strong className="font-mono text-black text-xs tracking-wider select-all">{guest.idNumber}</strong>
                  </div>
                </div>

                <div className="col-span-12 border border-black bg-gray-50/20 p-1 text-[9px] text-black">
                  <span className="font-black text-black">SYS_LOG_NOTES_SECURITY:</span>{' '}
                  <span className={(guest.notes || defaultPoliceNotesAr || defaultNotesAr) ? '' : 'text-neutral-400 font-normal'}>
                    {guest.notes || defaultPoliceNotesAr || defaultNotesAr || '........................................................................................................................'}
                  </span>
                </div>
              </div>

              {/* A4 Watermark Spacer */}
              <A4WatermarkSpacer printSize={printSize} hotelSettings={hotelSettings} />

              {/* Tech Barcode Simulation and Signatures */}
              <div className="mt-4 border-t border-black pt-2 flex justify-between items-end text-xs font-bold signatures-block text-black">
                <div className="flex items-end gap-3">
                  <div>
                    <span className="text-[9px] text-neutral-600 block mb-1">SYSTEM_BARCODE_VERIFIER</span>
                    {/* Digital barcode strip using thin black lines */}
                    <div className="flex items-center gap-0.5 h-6 opacity-80 select-none">
                      <div className="w-1.5 h-full bg-black" />
                      <div className="w-[1px] h-full bg-black" />
                      <div className="w-2 h-full bg-black" />
                      <div className="w-[1px] h-full bg-black" />
                      <div className="w-3 h-full bg-black" />
                      <div className="w-1 h-full bg-black" />
                      <div className="w-[2px] h-full bg-black" />
                      <div className="w-2.5 h-full bg-black" />
                    </div>
                  </div>
                </div>
                {printSize !== 'compact' && (
                  <div className="text-left font-sans text-black">
                    <span>إمضاء النزيل المستفيد:</span>
                    <div className="h-4"></div>
                    <div className="border-t border-black w-24 text-center pt-0.5 text-[8px] text-neutral-600 font-mono">SYS_VERIFIED_SIGN</div>
                  </div>
                )}
              </div>
              </PrintContentWrapper>
            </div>
          </div>
        )}

        {/* Render Design 8: Vintage Gold Ornate */}
        {activeTheme === 'vintage-gold' && (
          <div className="flex flex-col justify-between h-full w-full font-serif border-4 border-black p-2 bg-white text-black print:text-black">
            <div className="border border-double border-black p-4 h-full flex flex-col justify-between">
              <PrintContentWrapper printSize={printSize}>
                <div className="text-center border-b-2 border-black pb-2 mb-3 text-black">
                <span className="text-[9px] uppercase tracking-widest block font-sans">الجمهورية الجزائرية الديمقراطية الشعبية</span>
                <h1 className="text-base font-black mt-1 text-black leading-tight">الاستمارة الأمنية للنزيل</h1>
                <p className="text-[9px] text-neutral-600 block font-sans">VINTAGE SECURITY REGISTRATION (MODEL 5)</p>
                {(hotelSettings.hotelPhone || hotelSettings.hotelNameEn) && (
                  <p className="text-[8px] font-mono text-neutral-700 mt-0.5 font-bold" dir="ltr">
                    {hotelSettings.hotelPhone ? `Tel: ${hotelSettings.hotelPhone} ` : ''}
                    {hotelSettings.hotelPhone && hotelSettings.hotelNameEn ? '• ' : ''}
                    {hotelSettings.hotelNameEn}
                  </p>
                )}
                {hotelSettings.hotelEmail && (
                  <p className="text-[8px] font-mono text-neutral-700 mt-0.5 font-bold" dir="ltr">
                    Email: {hotelSettings.hotelEmail}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2 text-right text-xs text-black">
                <div className="col-span-12 border border-black p-2.5 bg-gray-100 flex justify-between items-center text-[11px] font-bold">
                  <span>الغرفة المخصصة: <strong className="font-sans text-xs text-black font-extrabold">غرفة {guest.roomNumber}</strong></span>
                  <span>صفة الإشغال للغرفة: <strong>{guest.roomClassification || 'النزيل الأول'}</strong></span>
                  <span>النزول الفعلي: {formatDateDMY(guest.checkInDate)} • الخروج: {getCheckoutDateDisplay()}</span>
                </div>

                <div className="col-span-8 p-3 bg-white border border-black space-y-1">
                  <span className="text-[8.5px] text-neutral-500 block">الاسم والكنية في الهوية:</span>
                  <div className="text-sm font-black text-black">{guest.firstNameAr} {guest.lastNameAr}</div>
                  <span className="text-[9.5px] text-neutral-600 font-mono block">EN: {guest.firstNameEn} {guest.lastNameEn}</span>
                </div>

                <div className="col-span-4 p-3 bg-white border border-black space-y-1">
                  <span className="text-[8.5px] text-neutral-500 block">الجنسية والاتصال:</span>
                  <div className="text-xs font-bold text-black">{guest.nationality || 'جزائرية'}</div>
                  <span className="text-[9.5px] text-neutral-600 font-sans block">{guest.phoneNumber || 'بلا هاتف'}</span>
                </div>

                <div className="col-span-12 p-3 bg-white border border-black grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[8.5px] text-neutral-550 block">تاريخ ومكان الميلاد:</span>
                    <strong className="text-[10.5px]">{formatDateDMY(guest.dob)} | {guest.pob}</strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-neutral-550 block">الوالدين بالأكمل:</span>
                    <strong className="text-[10.5px] font-sans block">أب: {guest.fatherName || 'غير مسجل'}</strong>
                    <strong className="text-[9.5px] font-sans block text-neutral-600">أم: {guest.motherFullName || 'غير مسجل'}</strong>
                  </div>
                  <div>
                    <span className="text-[8.5px] text-neutral-550 block">إثبات الهوية والتحقق:</span>
                    <strong className="text-[10.5px] font-mono block">{guest.idType}</strong>
                    <strong className="text-[10.5px] font-mono block select-all bg-gray-100 px-1 mt-0.5">{guest.idNumber}</strong>
                  </div>
                </div>

                <div className="col-span-12 p-1.5 border border-black rounded text-[9px] bg-gray-50/20 text-black">
                  <strong>البيانات والملاحظات الأمنية الإضافية للمسؤول:</strong>{' '}
                  <span className={(guest.notes || defaultPoliceNotesAr || defaultNotesAr) ? '' : 'text-neutral-400'}>
                    {guest.notes || defaultPoliceNotesAr || defaultNotesAr || '........................................................................................................................'}
                  </span>
                </div>
              </div>

              {/* A4 Watermark Spacer */}
              <A4WatermarkSpacer printSize={printSize} hotelSettings={hotelSettings} />

              <div className="mt-4 pt-2 border-t border-black flex justify-between items-end text-xs font-bold text-black">
                <div className="flex items-center gap-3">
                  <div className="text-right text-[8.5px] text-neutral-600 font-sans">
                    <span>تم الفحص والتحقق الأمني الرقمي لبيانات النزيل ✓</span>
                    <div className="text-[8px]">{hotelSettings.hotelNameAr} — هاتف: {hotelSettings.hotelPhone}{hotelSettings.hotelEmail ? ` — بريد: ${hotelSettings.hotelEmail}` : ''}</div>
                  </div>
                </div>
                {printSize !== 'compact' && (
                  <div className="text-left">
                    <span className="text-[10px] block mb-1">إمضاء وبصمة النزيل:</span>
                    <div className="h-4"></div>
                    <div className="border-t border-black w-24 text-center text-[7.5px] text-neutral-500 font-mono pt-0.5">GOLDEN_SIGN</div>
                  </div>
                )}
              </div>
              </PrintContentWrapper>
            </div>
          </div>
        )}

        {/* Render Design 9: Sleek Charcoal Dark */}
        {activeTheme === 'sleek-dark' && (
          <div className="flex flex-col justify-between h-full w-full font-sans border-2 border-black p-2.5 bg-white text-black print:text-black">
            <div className="border border-black p-3 h-full flex flex-col justify-between">
              <PrintContentWrapper printSize={printSize}>
                <div className="flex justify-between items-start border-b border-black pb-2 mb-3">
                <div className="text-right">
                  <span className="text-[8px] text-neutral-500 font-bold block mb-0.5">CONFIDENTIAL SAFETY SHEET</span>
                  <h1 className="text-sm font-black tracking-widest text-black">الاستمارة الأمنية للنزيل</h1>
                  <span className="text-[8.5px] text-neutral-600 block font-mono">CHARCOAL COMPACT SECURE (MODEL 6)</span>
                  {(hotelSettings.hotelPhone || hotelSettings.hotelNameEn) && (
                    <span className="text-[8px] text-neutral-700 font-mono block mt-0.5 font-bold" dir="ltr">
                      {hotelSettings.hotelPhone ? `Tel: ${hotelSettings.hotelPhone} ` : ''}
                      {hotelSettings.hotelPhone && hotelSettings.hotelNameEn ? '• ' : ''}
                      {hotelSettings.hotelNameEn}
                    </span>
                  )}
                  {hotelSettings.hotelEmail && (
                    <span className="text-[8px] text-neutral-700 font-mono block mt-0.5 font-bold" dir="ltr">
                      Email: {hotelSettings.hotelEmail}
                    </span>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-black font-black text-xs border border-black px-2.5 py-0.5 rounded">غرفة {guest.roomNumber}</span>
                  <span className="text-[8.5px] text-neutral-600 mt-0.5">{guest.roomClassification || 'النزيل الأول'}</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 text-right text-xs text-black">
                <div className="col-span-8 p-3 bg-gray-100 border border-black space-y-0.5">
                  <span className="text-[8px] text-neutral-500 block">الاسم والكنية بالكامل / CLIENT NAME</span>
                  <div className="text-sm font-black text-black">{guest.firstNameAr} {guest.lastNameAr}</div>
                  <div className="text-[9.5px] text-neutral-600 font-mono">{guest.firstNameEn} {guest.lastNameEn}</div>
                </div>

                <div className="col-span-4 p-3 bg-gray-100 border border-black space-y-0.5 text-center">
                  <span className="text-[8px] text-neutral-500 block">تاريخ الدخول والحلول</span>
                  <div className="text-xs font-mono font-black pt-1 block">{formatDateDMY(guest.checkInDate)}</div>
                  <span className="text-[9px] text-neutral-600 block uppercase font-bold">APPROVED ✓</span>
                </div>

                <div className="col-span-12 p-3 bg-white border border-black grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[8px] text-neutral-500 block">الجنسية والدولة:</span>
                    <strong className="text-black text-xs">{guest.nationality || 'جزائرية'}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-neutral-500 block">رقم الهاتف:</span>
                    <strong className="text-black font-mono text-xs">{guest.phoneNumber || 'N/A'}</strong>
                  </div>
                  
                  <div className="col-span-2 pt-1.5 border-t border-dashed border-black grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[8px] text-neutral-500 block">تاريخ ومكان الولادة:</span>
                      <strong className="text-black font-sans text-xs">{formatDateDMY(guest.dob)} {guest.pob ? `بـ ${guest.pob}` : ''}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-neutral-500 block">الوالدين بالأكمل:</span>
                      <strong className="text-black font-sans text-xs">{guest.fatherName || 'لم يسجل'} • {guest.motherFullName || 'لم يسجل'}</strong>
                    </div>
                  </div>

                  <div className="col-span-2 pt-1.5 border-t border-black">
                    <span className="text-[8px] text-neutral-500 block">وثيقة الهوية والرقم المسجل:</span>
                    <strong className="text-xs font-mono text-black">{guest.idType} - {guest.idNumber}</strong>
                  </div>
                </div>

                <div className="col-span-12 p-1.5 border border-black rounded text-[9.5px] bg-gray-50/20 text-black">
                  <strong>البيانات والملاحظات الأمنية الإضافية:</strong>{' '}
                  <span className={(guest.notes || defaultPoliceNotesAr || defaultNotesAr) ? '' : 'text-neutral-400'}>
                    {guest.notes || defaultPoliceNotesAr || defaultNotesAr || '........................................................................................................................'}
                  </span>
                </div>
              </div>

              {/* A4 Watermark Spacer */}
              <A4WatermarkSpacer printSize={printSize} hotelSettings={hotelSettings} />

              <div className="mt-4 pt-2 border-t border-black flex justify-between items-end text-xs font-bold text-black">
                <div className="flex items-center gap-3">
                  <div className="text-right text-[8.5px] text-neutral-600 font-sans">
                    <span>المؤسسة: {hotelSettings.hotelNameAr}</span>
                  </div>
                </div>
                {printSize !== 'compact' && (
                  <div className="text-left font-mono">
                    <span className="text-[9px] block mb-2 text-black">بصمة وإمضاء النزيل:</span>
                    <div className="border-t border-black w-24 text-center text-[7.5px] text-neutral-400 pt-0.5 font-mono">SLEEK SIGN</div>
                  </div>
                )}
              </div>
              </PrintContentWrapper>
            </div>
          </div>
        )}

        </div>
        </div>
      </div>

    </div>
  </div>
);
}
