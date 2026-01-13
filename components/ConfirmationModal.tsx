// @ts-nocheck
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
        className={`btn-base flex-1 !py-6 ${isDanger ? 'bg-rose-600 text-white shadow-[0_10px_25px_-5px_rgba(225,29,72,0.4)] hover:bg-rose-700' : 'btn-primary'}`}
        onClick={onConfirm}
        disabled={isProcessing}
      >
        {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>}
        {confirmLabel}
      </button>
      <button
        type="button"
        className="btn-base btn-secondary !px-12"
        onClick={onClose}
        disabled={isProcessing}
      >
        Abort
      </button>
    </>
  );

  return (
    <ModalShell 
        isOpen={isOpen} 
        onClose={onClose} 
        title={title} 
        description={isIrreversible ? "Critical Authorization Protocol" : "Security Verification"}
        maxWidth="max-w-md"
        footer={footer}
    >
        <div className="flex flex-col items-center text-center">
            {/* Visual Indicator */}
            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-8 ${
                isDanger ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 shadow-inner' : 'bg-primary/5 text-primary dark:bg-primary/20 shadow-inner'
            }`}>
                {isDanger ? <WarningIcon className="w-12 h-12" /> : (
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            
            {/* Value Context Section */}
            {amount !== undefined && (
                <div className="mb-8 p-8 bg-slate-50 dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 w-full shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Transaction Value</p>
                    <p className={`text-5xl font-black tabular-nums tracking-tighter ${isDanger ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {typeof amount === 'number' ? `${currencySymbol}${amount.toFixed(2)}` : amount}
                    </p>
                </div>
            )}

            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-8 px-2">
                {message}
            </p>

            {isIrreversible && (
                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest border animate-pulse ${
                    isDanger 
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-200 dark:border-rose-900/50' 
                    : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-900/50'
                }`}>
                    <WarningIcon className="w-4 h-4" />
                    Ledger Lock: IRREVERSIBLE
                </div>
            )}
        </div>
    </ModalShell>
  );
};

export default ConfirmationModal;