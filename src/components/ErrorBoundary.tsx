import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as any) {
  state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white text-center" 
          dir="rtl"
        >
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white font-sans">
              حدث خطأ غير متوقع
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              تم حماية بياناتك بأمان. يمكنك إعادة تحميل الصفحة للرجوع إلى النظام دون فقدان السجلات المحفوظة.
            </p>

            {this.state.error?.message && (
              <div className="p-2.5 bg-slate-950/80 rounded-lg text-[11px] font-mono text-amber-300/80 text-left border border-white/5 overflow-x-auto max-h-24 custom-scrollbar" dir="ltr">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>إعادة تحميل الصفحة</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="bg-white/10 hover:bg-white/15 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>محاولة المتابعة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
