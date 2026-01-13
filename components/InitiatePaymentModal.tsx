// @ts-nocheck
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import ModalShell from './ModalShell';

interface InitiatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, description: string, targetUserId?: string) => void;
    userName?: string;
    users?: User[];
    currencySymbol: string;
}

const InitiatePaymentModal: React.FC<InitiatePaymentModalProps> = ({ isOpen, onClose, onConfirm, userName, users, currencySymbol }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setSelectedUserId('');
            setError('');
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) { setError('Value must exceed zero.'); return; }
        if (users && !selectedUserId && !userName) { setError('Select a recipient.'); return; }
        if (!description.trim()) { setError('Audit note required.'); return; }
        
        setIsSaving(true);
        try {
            await onConfirm(numericAmount, description.trim(), selectedUserId || undefined);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <>
            <button onClick={handleSubmit} className="btn-base btn-primary flex-1 py-5" disabled={isSaving}>
                Authorize Remittance
            </button>
            <button onClick={onClose} className="btn-base btn-secondary px-10">Abort</button>
        </>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Initiate Remittance" 
            description={userName ? `Target: ${userName}` : "Identity Ledger"}
            footer={footer}
        >
            <div className="space-y-8">
                {users && !userName && (
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Recipient Identity</label>
                        <select 
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="">Select Personnel...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Protocol Value ({currencySymbol})</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="!text-5xl !py-8 text-center tabular-nums"
                        placeholder="0.00"
                        step="0.01"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Internal Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Purpose of remittance..."
                        rows={2}
                    />
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-xl text-center">
                        {error}
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default InitiatePaymentModal;