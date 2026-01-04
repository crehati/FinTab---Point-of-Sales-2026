
import React, { useState, useMemo, useEffect } from 'react';
import type { ReceiptSettingsData } from '../types';
import { formatCurrency } from '../lib/utils';
import SafePortal from './SafePortal';

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
        if (!isCashPayment || isNaN(parsedCashReceived) || parsedCashReceived < total) {
            return 0;
        }
        return parsedCashReceived - total;
    }, [parsedCashReceived, total, isCashPayment]);

    useEffect(() => {
        if (isOpen) {
            setCashReceived(total.toFixed(2));
        }
    }, [isOpen, total]);

    if (!isOpen) return null;

    return (
        <SafePortal containerId="modal-root">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
                <div 
                    className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="p-6 border-b dark:border-gray-800 text-center">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter">Confirm Payment</h2>
                    </header>
                    <main className="p-6 space-y-4">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount Due</p>
                            <p className="text-5xl font-black text-primary mt-1 tabular-nums tracking-tighter">{formatCurrency(total, cs)}</p>
                        </div>
                        {isCashPayment && (
                            <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                                <div>
                                    <label htmlFor="cash-received" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash Received</label>
                                    <input
                                        type="number"
                                        id="cash-received"
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value)}
                                        className="w-full text-center py-4 text-3xl font-black bg-slate-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums"
                                        step="0.01"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Change Due:</span>
                                    <span className="text-2xl font-black text-emerald-600 tabular-nums">{formatCurrency(change, cs)}</span>
                                </div>
                            </div>
                        )}
                    </main>
                    <footer className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                        <button type="button" onClick={() => onConfirm(isCashPayment ? { cashReceived: parsedCashReceived, change } : {})} className="btn-base btn-primary flex-1 py-4">Confirm Settlement</button>
                        <button type="button" onClick={onClose} className="btn-base btn-secondary flex-1 py-4">Cancel</button>
                    </footer>
                </div>
            </div>
        </SafePortal>
    );
};

export default PaymentConfirmationModal;
