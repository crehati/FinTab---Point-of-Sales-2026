
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import ModalShell from './ModalShell';

interface DraftPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (targetUserId: string, amount: number, description: string) => void;
    users: User[];
    currencySymbol: string;
}

const DraftPaymentModal: React.FC<DraftPaymentModalProps> = ({ isOpen, onClose, onConfirm, users, currencySymbol }) => {
    const [targetUserId, setTargetUserId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTargetUserId('');
            setAmount('');
            setDescription('');
            setError('');
        }
    }, [isOpen]);

    const eligibleUsers = (users || []).filter(u => u.role !== 'Super Admin');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!targetUserId) {
            setError('Selection of recipient node mandatory.');
            return;
        }
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Authorization value must exceed zero.');
            return;
        }
        if (!description.trim()) {
            setError('Internal context / description required.');
            return;
        }
        onConfirm(targetUserId, numericAmount, description.trim());
    };

    const footer = (
        <>
            <button onClick={handleSubmit} className="btn-base btn-primary flex-1 py-5">
                Commit Remittance
            </button>
            <button onClick={onClose} className="btn-base btn-secondary px-10">
                Abort
            </button>
        </>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Draft Remittance" 
            description="Personnel bonus & adjustment protocol"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Recipient Node</label>
                    <select
                        value={targetUserId}
                        onChange={(e) => { setTargetUserId(e.target.value); setError(''); }}
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                        <option value="" disabled>Select unit identity...</option>
                        {eligibleUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Remittance Value ({currencySymbol})</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-black text-xl">{currencySymbol}</div>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); setError(''); }}
                            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl py-5 pl-12 pr-6 text-3xl font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums"
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                        />
                    </div>
                </div>
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Audit Remark / Context</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); setError(''); }}
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        placeholder="e.g., Performance reward Q4"
                    />
                </div>
                {error && (
                    <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-2xl border border-rose-100 animate-shake text-center">
                        {error}
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default DraftPaymentModal;
