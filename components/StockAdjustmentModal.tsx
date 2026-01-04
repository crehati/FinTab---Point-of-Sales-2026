
import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import ModalShell from './ModalShell';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (adjustment: { type: 'add' | 'remove'; quantity: number; reason: string }) => void;
    product: Product | null;
}

const adjustmentReasons = [
    "Stock Count Correction",
    "Damaged Goods",
    "Returned Item",
    "Lost / Stolen",
    "New Shipment Received",
    "Other"
];

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, onSave, product }) => {
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
    const [quantity, setQuantity] = useState<string | number>(0);
    const [reason, setReason] = useState(adjustmentReasons[0]);
    const [otherReason, setOtherReason] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setAdjustmentType('add');
            setQuantity(0);
            setReason(adjustmentReasons[0]);
            setOtherReason('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericQuantity = Number(quantity) || 0;
        if (numericQuantity <= 0) {
            alert("Protocol Violation: Quantity must exceed zero.");
            return;
        }
        if (adjustmentType === 'remove' && product && numericQuantity > product.stock) {
            alert("Protocol Violation: Short-sell unauthorized. Available stock exceeded.");
            return;
        }
        const finalReason = reason === 'Other' ? otherReason.trim() : reason;
        if (!finalReason) {
            alert("Audit Error: Identification of adjustment reason mandatory.");
            return;
        }
        onSave({ type: adjustmentType, quantity: numericQuantity, reason: finalReason });
    };

    const footer = (
        <button onClick={handleSubmit} className="btn-base btn-primary w-full py-5 text-sm uppercase tracking-widest font-black shadow-xl shadow-primary/20">
            Authorize Stock Shift
        </button>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Stock Adjustment" 
            description={product ? `Identity: ${product.name}` : 'Unit Inventory Audit'}
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-8">
                <div className="p-6 bg-slate-900 rounded-[2rem] text-center shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Terminal Quantum</p>
                    <p className="text-4xl font-black text-white tabular-nums tracking-tighter">{product?.stock || 0} Units</p>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Shift Protocol</label>
                    <div className="grid grid-cols-2 gap-4">
                        <label className={`flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 ${adjustmentType === 'add' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-inner' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-400'}`}>
                            <input type="radio" value="add" checked={adjustmentType === 'add'} onChange={() => setAdjustmentType('add')} className="sr-only" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Inflow (+)</span>
                        </label>
                        <label className={`flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 ${adjustmentType === 'remove' ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-inner' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-400'}`}>
                            <input type="radio" value="remove" checked={adjustmentType === 'remove'} onChange={() => setAdjustmentType('remove')} className="sr-only" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Outflow (-)</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <label htmlFor="quantity" className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Quantum Value</label>
                    <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-6 text-3xl font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums"
                        placeholder="0"
                        min="1"
                    />
                </div>

                <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                    <label htmlFor="reason" className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Audit Remark / Context</label>
                    <select
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                        {adjustmentReasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {reason === 'Other' && (
                        <input
                            type="text"
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                            required
                            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none animate-fade-in"
                            placeholder="Specify protocol context..."
                        />
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default StockAdjustmentModal;
