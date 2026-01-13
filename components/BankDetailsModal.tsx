// @ts-nocheck
import React, { useState } from 'react';
import { formatCurrency } from '../lib/utils';
import ModalShell from './ModalShell';
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
        if (!selectedBankId) { setError('Destination account mandatory.'); return; }
        if (!bankReceiptNumber.trim()) { setError('Receipt ID required.'); return; }

        const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
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

    const footer = (
        <>
            <button onClick={handleSubmit} className="btn-base btn-primary flex-1 py-5" disabled={isSaving}>
                {isSaving ? 'Processing...' : 'Authorize Bank Entry'}
            </button>
            <button onClick={onClose} className="btn-base btn-secondary px-10">Abort</button>
        </>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Bank Transfer"
            description="Verified Remittance Protocol"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-10">
                <div className="text-center p-10 bg-primary/5 rounded-[3rem] border border-primary/10 shadow-inner">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Amount for Transfer</p>
                    <p className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatCurrency(total, currencySymbol)}</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Destination Node</label>
                        <select
                            value={selectedBankId}
                            onChange={(e) => { setSelectedBankId(e.target.value); setError(''); }}
                        >
                            <option value="">Select Account...</option>
                            {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Bank Receipt # / Auth Code</label>
                        <input
                            type="text"
                            value={bankReceiptNumber}
                            onChange={(e) => { setBankReceiptNumber(e.target.value); setError(''); }}
                            placeholder="Identifier from receipt..."
                            className="!text-xl text-center"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-rose-100 text-center animate-shake">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default BankDetailsModal;