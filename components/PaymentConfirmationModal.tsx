// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { ReceiptSettingsData } from '../types';
import { formatCurrency } from '../lib/utils';
import ModalShell from './ModalShell';

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentDetails: { cashReceived?: number; change?: number }) => void;
    total: number;
    paymentMethod: string | null;
    receiptSettings: ReceiptSettingsData;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({ isOpen, onClose, onConfirm, total, paymentMethod, receiptSettings }) => {
    const [cashReceived, setCashReceived] = useState<string>('');
    const cs = receiptSettings.currencySymbol;
    const parsedCashReceived = useMemo(() => parseFloat(cashReceived), [cashReceived]);
    const isCashPayment = paymentMethod === 'Cash';

    const change = useMemo(() => {
        if (!isCashPayment || isNaN(parsedCashReceived) || parsedCashReceived < total) return 0;
        return parsedCashReceived - total;
    }, [parsedCashReceived, total, isCashPayment]);

    useEffect(() => {
        if (isOpen) setCashReceived(total.toFixed(2));
    }, [isOpen, total]);

    const footer = (
        <>
            <button type="button" onClick={() => onConfirm(isCashPayment ? { cashReceived: parsedCashReceived, change } : {})} className="btn-base btn-primary flex-1 py-5">
                Confirm Settlement
            </button>
            <button type="button" onClick={onClose} className="btn-base btn-secondary px-10">
                Cancel
            </button>
        </>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Final Verification" 
            description={`Settlement Protocol: ${paymentMethod}`}
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-10">
                <div className="text-center p-10 bg-primary/5 rounded-[3rem] border border-primary/10 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Total Amount Due</p>
                    <p className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatCurrency(total, cs)}</p>
                </div>

                {isCashPayment && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label htmlFor="cash-received" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Verification: Cash Received</label>
                            <input
                                type="number"
                                id="cash-received"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                                className="w-full text-center py-6 text-4xl font-black bg-slate-50 dark:bg-gray-900 border-none rounded-3xl focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums"
                                step="0.01"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30">
                            <div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Return Delta</span>
                                <span className="text-3xl font-black text-emerald-600 tabular-nums">{formatCurrency(change, cs)}</span>
                            </div>
                            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default PaymentConfirmationModal;