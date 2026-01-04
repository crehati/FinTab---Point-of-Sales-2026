
import React, { useState } from 'react';
import { formatCurrency } from '../lib/utils';
import SafePortal from './SafePortal';
import type { BankAccount } from '../types';

interface BankDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (details: { bankReceiptNumber: string; bankName: string; bankAccountId: string }) => void;
    total: number;
    currencySymbol: string;
    bankAccounts: BankAccount[];
}

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({ isOpen, onClose, onConfirm, total, currencySymbol, bankAccounts = [] }) => {
    const [bankReceiptNumber, setBankReceiptNumber] = useState('');
    const [selectedBankId, setSelectedBankId] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedBankId) {
            setError('Protocol Error: Please select an authorized Bank Account.');
            return;
        }

        if (!bankReceiptNumber.trim()) {
            setError('Protocol Error: Bank Receipt Number is mandatory.');
            return;
        }

        const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
        if (!selectedBank) {
            setError('Protocol Error: Invalid Bank Account selected.');
            return;
        }

        setIsSaving(true);
        try {
            await onConfirm({ 
                bankReceiptNumber: bankReceiptNumber.trim(), 
                bankName: selectedBank.bankName,
                bankAccountId: selectedBank.id
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <SafePortal containerId="modal-root">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans" role="dialog" aria-modal="true" onClick={onClose}>
                <div 
                    className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/10 dark:border-white/5 animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="p-8 border-b dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Bank Verification</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending verification protocol required</p>
                    </header>
                    
                    <form onSubmit={handleSubmit}>
                        <main className="p-8 space-y-6">
                            <div className="text-center p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Due for Verification</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatCurrency(total, currencySymbol)}</p>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Destination Account *</label>
                                <select
                                    required
                                    value={selectedBankId}
                                    onChange={(e) => { setSelectedBankId(e.target.value); setError(''); }}
                                    className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    disabled={isSaving}
                                >
                                    <option value="">Select Destination Account...</option>
                                    {bankAccounts.map(b => (
                                        <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                                    ))}
                                </select>
                                {bankAccounts.length === 0 && (
                                    <p className="text-[8px] text-rose-500 font-bold uppercase mt-2 px-1">Warning: No bank accounts enrolled in system registry.</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Bank Receipt Number *</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={bankReceiptNumber}
                                    onChange={(e) => { setBankReceiptNumber(e.target.value); setError(''); }}
                                    placeholder="Enter identifier from receipt..."
                                    className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    disabled={isSaving}
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-2xl border border-rose-100 animate-shake text-center">
                                    {error}
                                </div>
                            )}
                        </main>

                        <footer className="p-8 bg-slate-50/50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                            <button 
                                type="submit"
                                className="btn-base btn-primary flex-1 py-4"
                                disabled={isSaving || bankAccounts.length === 0}
                            >
                                {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                Initiate Protocol
                            </button>
                            <button 
                                type="button"
                                onClick={onClose} 
                                className="btn-base btn-secondary flex-1 py-4"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                        </footer>
                    </form>
                </div>
            </div>
        </SafePortal>
    );
};

export default BankDetailsModal;
