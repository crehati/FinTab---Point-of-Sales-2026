// @ts-nocheck
import React, { useState } from 'react';
import ModalShell from './ModalShell';
import { WarningIcon } from '../constants';

interface DestructiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmationPhrase: string;
  t: (key: string) => string;
}

const DestructiveConfirmationModal: React.FC<DestructiveConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmationPhrase, t }) => {
  const [inputValue, setInputValue] = useState('');
  const isConfirmed = inputValue === confirmationPhrase;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      onClose();
    }
  };

  const footer = (
    <>
      <button
        type="button"
        className="btn-base flex-1 !py-5 bg-rose-600 text-white hover:bg-rose-700 shadow-xl disabled:bg-slate-200"
        onClick={handleConfirm}
        disabled={!isConfirmed}
      >
        Execute Purge Protocol
      </button>
      <button type="button" className="btn-base btn-secondary px-10" onClick={onClose}>
        Abort
      </button>
    </>
  );

  return (
    <ModalShell 
        isOpen={isOpen} 
        onClose={onClose} 
        title={title} 
        description="Critical Terminal Command"
        maxWidth="max-w-md"
        footer={footer}
    >
        <div className="flex flex-col items-center text-center space-y-8">
            <div className="w-24 h-24 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center shadow-inner animate-pulse">
                <WarningIcon className="w-12 h-12" />
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed px-2">
                {message}
            </p>

            <div className="w-full p-8 bg-slate-50 dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-gray-800">
                <label htmlFor="confirmation-input" className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4">
                    Identity Verification Protocol
                </label>
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-4 tracking-tight">
                    Type <span className="text-rose-600 font-black">"{confirmationPhrase}"</span> to authorize wipe
                </p>
                <input
                    type="text"
                    id="confirmation-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                    className="w-full text-center py-4 bg-white dark:bg-gray-950 border-2 border-rose-100 dark:border-rose-900/30 rounded-2xl text-xl font-black text-rose-600 focus:ring-4 focus:ring-rose-500/10 transition-all outline-none"
                    autoComplete="off"
                    autoFocus
                />
            </div>
        </div>
    </ModalShell>
  );
};

export default DestructiveConfirmationModal;