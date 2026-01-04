import React, { useState, useEffect } from 'react';
import type { User } from '../types';

interface InitiatePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, description: string, targetUserId?: string) => void;
    userName?: string;
    users?: User[];
    currencySymbol: string;
}

const CATEGORIES = [
    "Performance Bonus",
    "Account Adjustment",
    "Special Payout",
    "Investor Service Payment"
];

const InitiatePaymentModal: React.FC<InitiatePaymentModalProps> = ({ isOpen, onClose, onConfirm, userName, users, currencySymbol }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setCategory(CATEGORIES[0]);
            setSelectedUserId('');
            setError('');
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        setAmount(e.target.value);
    };
    
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        setDescription(e.target.value);
    };

    const handleSubmit = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount greater than zero.');
            return;
        }
        if (users && !selectedUserId && !userName) {
            setError('Please select a recipient for this payment.');
            return;
        }
        if (!description.trim()) {
            setError('Please provide a short note for the description.');
            return;
        }
        
        setIsSaving(true);
        const finalDescription = `[${category}] ${description.trim()}`;
        try {
            await onConfirm(numericAmount, finalDescription, selectedUserId || undefined);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in font-sans" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/10 dark:border-white/5">
                <header className="p-xl border-b dark:border-gray-800">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Initiate Remittance</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {userName ? `Recipient: ${userName}` : 'Select a recipient from the roster'}
                    </p>
                </header>
                
                <main className="p-xl space-y-6">
                    {users && !userName && (
                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Search Recipient</label>
                            <select 
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                disabled={isSaving}
                            >
                                <option value="">Select Staff or Investor...</option>
                                <optgroup label="Investors / Equity Partners">
                                    {users.filter(u => u.role === 'Investor').map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Operational Staff">
                                    {users.filter(u => u.role !== 'Investor' && u.role !== 'Owner').map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Financial Category</label>
                        <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            disabled={isSaving}
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Protocol Value ({currencySymbol})</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-bold text-xl">{currencySymbol}</span>
                            </div>
                            <input
                                type="number"
                                value={amount}
                                onChange={handleAmountChange}
                                className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-2xl py-5 pl-12 pr-5 text-2xl font-bold text-slate-900 dark:text-white tabular-nums focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                placeholder="0.00"
                                step="0.01"
                                min="0.01"
                                autoFocus={!!userName}
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Internal Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={handleDescriptionChange}
                            className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            placeholder="e.g., Q4 Service Retainer"
                            disabled={isSaving}
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-2xl border border-rose-100 animate-shake text-center">
                            {error}
                        </div>
                    )}
                </main>

                <footer className="p-xl bg-slate-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={handleSubmit} 
                        className="btn-base btn-primary flex-1"
                        disabled={isSaving}
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        Authorize Remittance
                    </button>
                    <button 
                        onClick={onClose} 
                        className="btn-base btn-secondary"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InitiatePaymentModal;