
import React, { useState, useEffect } from 'react';
import ModalShell from './ModalShell';

interface WithdrawalRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, source: 'commission' | 'investment' | 'compensation') => void;
    availableBalance: number;
    currencySymbol: string;
    source: 'commission' | 'investment' | 'compensation';
    isProcessing?: boolean;
}

const WithdrawalRequestModal: React.FC<WithdrawalRequestModalProps> = ({ isOpen, onClose, onConfirm, availableBalance, currencySymbol, source, isProcessing = false }) => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setError('');
        }
    }, [isOpen]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setError('');
        setAmount(value);
    };

    const handleSubmit = () => {
        if (isProcessing) return;

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount greater than zero.');
            return;
        }
        
        if (numericAmount > availableBalance) {
            setError(`Protocol Error: Insufficient liquidity. Available: ${currencySymbol}${availableBalance.toFixed(2)}.`);
            return;
        }
        
        onConfirm(numericAmount, source);
    };

    const sourceLabel = source === 'commission' ? 'Staff Commission' : source === 'investment' ? 'Partner Dividends' : 'Owner Compensation';

    const footer = (
        <>
            <button 
                onClick={handleSubmit}
                className="btn-base btn-primary flex-1 py-5"
                disabled={isProcessing || !amount}
            >
                {isProcessing && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>}
                Confirm Reservation
            </button>
            <button 
                onClick={onClose}
                className="btn-base btn-secondary px-10 py-5"
                disabled={isProcessing}
            >
                Cancel
            </button>
        </>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title="Initialize Payout"
            description={`Wallet Source: ${sourceLabel}`}
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-8">
                <div className="flex justify-between items-center px-6 py-5 bg-slate-50 dark:bg-gray-800/50 rounded-[1.5rem] border border-slate-100 dark:border-gray-700">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-xs">Verified Available</span>
                    <span className="text-xl font-black text-primary tabular-nums">{currencySymbol}{availableBalance.toFixed(2)}</span>
                </div>

                <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-xs block">Payout Value ({currencySymbol})</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-bold text-xl">{currencySymbol}</span>
                        </div>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={handleAmountChange}
                            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl py-6 pl-12 pr-6 text-3xl font-black text-slate-900 dark:text-white tabular-nums focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                            placeholder="0.00"
                            step="0.01"
                            autoFocus
                            disabled={isProcessing}
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

export default WithdrawalRequestModal;
