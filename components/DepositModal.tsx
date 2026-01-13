// @ts-nocheck
import React, { useState, useEffect } from 'react';
import ModalShell from './ModalShell';
import type { BankAccount } from '../types';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRequestDeposit: (amount: number, description: string, bankAccountId?: string) => void;
    maxAmount: number;
    currencySymbol: string;
    bankAccounts: BankAccount[];
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onRequestDeposit, maxAmount, currencySymbol, bankAccounts = [] }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedBankId, setSelectedBankId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setSelectedBankId('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Amount must exceed zero.');
            return;
        }
        if (!description.trim()) {
            setError('Audit description mandatory.');
            return;
        }

        onRequestDeposit(numericAmount, description.trim(), selectedBankId || undefined);
        onClose();
    };

    const footer = (
        <>
            <button onClick={handleSubmit} className="btn-base btn-primary flex-1 py-5">Confirm Request</button>
            <button onClick={onClose} className="btn-base btn-secondary px-10">Abort</button>
        </>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Request Deposit"
            description="Liquidity Transfer Protocol"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-8">
                <div className="p-8 bg-slate-50 dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 text-center shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Verified Cash On Hand</p>
                    <p className="text-4xl font-black text-primary tabular-nums tracking-tighter">{currencySymbol}{maxAmount.toFixed(2)}</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Deposit Value ({currencySymbol})</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); setError(''); }}
                            placeholder="0.00"
                            step="0.01"
                            className="!text-3xl !py-6 text-center tabular-nums"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Destination Node</label>
                        <select
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                        >
                            <option value="">Manual Physical Treasury</option>
                            {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Internal Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); setError(''); }}
                            rows={2}
                            placeholder="Purpose of deposit..."
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-2xl border border-rose-100 animate-shake text-center">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default DepositModal;