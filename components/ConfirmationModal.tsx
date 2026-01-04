
import React from 'react';
import ModalShell from './ModalShell';
import { WarningIcon } from '../constants';

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
    confirmLabel = 'Confirm Action'
}) => {
  const isDanger = variant === 'danger';

  const footer = (
    <>
      <button
        type="button"
        className={`btn-base w-full sm:w-auto px-10 py-5 text-sm ${isDanger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'}`}
        onClick={onConfirm}
        disabled={isProcessing}
      >
        {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>}
        {confirmLabel}
      </button>
      <button
        type="button"
        className="btn-base btn-secondary w-full sm:w-auto px-10 py-5 text-sm"
        onClick={onClose}
        disabled={isProcessing}
      >
        Abort Protocol
      </button>
    </>
  );

  return (
    <ModalShell 
        isOpen={isOpen} 
        onClose={onClose} 
        title={title} 
        maxWidth="max-w-md"
        footer={footer}
    >
        <div className="flex flex-col items-center text-center">
            {/* Icon Section */}
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${
                isDanger ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 'bg-primary/10 text-primary dark:bg-primary/20'
            }`}>
                {isDanger ? <WarningIcon className="w-10 h-10" /> : (
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            
            {/* Value Section */}
            {amount !== undefined && (
                <div className="mb-6 p-6 bg-slate-50 dark:bg-gray-800 rounded-[2rem] border border-slate-100 dark:border-gray-700 w-full shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Verified Valuation</p>
                    <p className={`text-4xl font-black tabular-nums tracking-tighter ${isDanger ? 'text-rose-600' : 'text-primary'}`}>
                        {typeof amount === 'number' ? `${currencySymbol}${amount.toFixed(2)}` : amount}
                    </p>
                </div>
            )}

            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">
                {message}
            </p>

            {isIrreversible && (
                <div className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                    isDanger 
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50' 
                    : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                }`}>
                    <WarningIcon className="w-4 h-4" />
                    Protocol Lock: Irreversible
                </div>
            )}
        </div>
    </ModalShell>
  );
};

export default ConfirmationModal;
