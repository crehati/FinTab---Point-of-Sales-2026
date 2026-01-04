
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
    
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setError('');
        setAmount(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount greater than zero.');
            return;
        }
        if (numericAmount > maxAmount) {
            setError(`Amount cannot exceed available cash of ${currencySymbol}${maxAmount.toFixed(2)}.`);
            return;
        }
        if (!description.trim()) {
            setError('Please provide a brief description for the deposit.');
            return;
        }

        onRequestDeposit(numericAmount, description.trim(), selectedBankId || undefined);
        onClose();
    };

    const footer = (
        <>
            <button onClick={handleSubmit} className="btn-base btn-primary flex-1 py-4">
                Confirm Request
            </button>
            <button onClick={onClose} className="btn-base btn-secondary px-8 py-4">
                Abort
            </button>
        </>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Request Deposit"
            description="Transfer liquid funds to central treasury or bank"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800 text-center shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Cash on Hand</p>
                    <p className="text-3xl font-black text-primary tabular-nums">{currencySymbol}{maxAmount.toFixed(2)}</p>
                </div>

                <div>
                    <label htmlFor="deposit-amount" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Deposit Amount ({currencySymbol})</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-black text-xl">{currencySymbol}</div>
                        <input
                            type="number"
                            id="deposit-amount"
                            value={amount}
                            onChange={handleAmountChange}
                            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl py-6 pl-12 pr-6 text-3xl font-black text-slate-900 dark:text-white tabular-nums focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            placeholder="0.00"
                            step="0.01"
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="bank-account" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Target Bank Account (Optional)</label>
                    <select
                        id="bank-account"
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                        <option value="">No Bank (Physical Treasury Only)</option>
                        {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="description" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Audit Note</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        placeholder="e.g. End of shift deposit"
                    />
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-rose-100 animate-shake text-center">
                        {error}
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default DepositModal;
