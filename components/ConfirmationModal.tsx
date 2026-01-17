
// @ts-nocheck
import React from 'react';
import { SafePortal } from './SafePortal';
import { CloseIcon, WarningIcon } from '../constants';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  amount?: number | string;
  currencySymbol?: string;
  variant?: 'primary' | 'danger';
  isIrreversible?: boolean;
  isProcessing?: boolean;
  confirmLabel?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    amount, 
    currencySymbol = '$',
    variant = 'primary',
    isIrreversible = false,
    isProcessing = false,
    confirmLabel = 'Confirm'
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger' || title.toLowerCase().includes('logout');

  return (
    <SafePortal containerId="modal-root">
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden">
            {/* Backdrop with heavy blur for focus */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" 
                onClick={onClose}
                aria-hidden="true"
            />
            
            <div 
                className="relative w-full max-w-[420px] bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-scale-in border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modern "Security" Header */}
                <header className="p-8 bg-[#0F172A] flex flex-col items-start relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-all active:scale-90"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                    
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">
                        Security Verification
                    </p>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                        {title}
                    </h2>
                </header>

                <main className="p-10 pt-12 flex flex-col items-center text-center">
                    {/* Centered Icon Node */}
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 ${
                        isDanger ? 'bg-rose-50 text-rose-500' : 'bg-primary/5 text-primary'
                    } shadow-inner`}>
                        {isDanger ? (
                            <WarningIcon className="w-12 h-12" />
                        ) : (
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>

                    {/* Value Context Section (e.g. for Payouts/Remittance) */}
                    {amount !== undefined && (
                        <div className="mb-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 w-full shadow-inner">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Value Shift</p>
                            <p className="text-4xl font-black tabular-nums tracking-tighter text-slate-900">
                                {typeof amount === 'number' ? `${currencySymbol}${amount.toFixed(2)}` : amount}
                            </p>
                        </div>
                    )}

                    <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight mb-2 leading-tight">
                        {message}
                    </h3>
                    
                    {isIrreversible && (
                        <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">
                            Protocol State: Irreversible
                        </p>
                    )}
                </main>

                <footer className="px-10 pb-12 flex flex-col sm:flex-row items-center gap-6">
                    <button
                        type="button"
                        className="text-[11px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.2em] transition-all py-2"
                        onClick={onClose}
                        disabled={isProcessing}
                    >
                        Abort
                    </button>
                    <button
                        type="button"
                        className={`w-full py-5 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            isDanger 
                            ? 'bg-[#E11D48] text-white shadow-rose-500/30 hover:bg-[#BE123C]' 
                            : 'bg-primary text-white shadow-primary/30 hover:bg-blue-700'
                        }`}
                        onClick={onConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {confirmLabel}
                    </button>
                </footer>
            </div>
        </div>
    </SafePortal>
  );
};

export default ConfirmationModal;
