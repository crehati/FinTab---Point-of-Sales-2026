// @ts-nocheck
import React from 'react';
import type { Customer, ReceiptSettingsData } from '../types';
import { formatCurrency } from '../lib/utils';
import ModalShell from './ModalShell';

interface CustomerDetailModalProps {
    customer: Customer | null;
    onClose: () => void;
    receiptSettings: ReceiptSettingsData;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose, receiptSettings }) => {
    if (!customer) return null;

    const cs = receiptSettings.currencySymbol;
    const getTotalSpent = (c: Customer) => c.purchaseHistory.reduce((sum, sale) => sum + sale.total, 0);
    const sortedHistory = [...customer.purchaseHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const footer = (
        <button type="button" onClick={onClose} className="btn-base btn-primary w-full py-5">
            Exit Identity Audit
        </button>
    );

    return (
        <ModalShell 
            isOpen={!!customer} 
            onClose={onClose} 
            title={customer.name} 
            description="Client Identity Registry"
            maxWidth="max-w-2xl"
            footer={footer}
        >
            <div className="space-y-10">
                {/* Contact Logic */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 dark:bg-gray-900 rounded-[2rem] border border-slate-100 dark:border-gray-800">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Communication Node</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate">{customer.email || 'No email registered'}</p>
                        <p className="text-sm font-black text-primary mt-1">{customer.phone}</p>
                    </div>
                    <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Lifetime Inflow</p>
                        <p className="text-2xl font-black text-emerald-600 tabular-nums">{formatCurrency(getTotalSpent(customer), cs)}</p>
                        <p className="text-[8px] font-bold text-emerald-500 uppercase mt-1">Enrollment: {new Date(customer.joinDate).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Event Ledger */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Transaction History ({sortedHistory.length} Cycles)</h3>
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 overflow-hidden shadow-sm">
                        {sortedHistory.length > 0 ? (
                            <div className="divide-y divide-slate-50 dark:divide-gray-800">
                                {sortedHistory.map(sale => (
                                    <div key={sale.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-xs">{new Date(sale.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Ref: {sale.id.slice(-8).toUpperCase()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-primary tabular-nums">{formatCurrency(sale.total, cs)}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{sale.items.length} units</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-[10px]">Registry Empty</div>
                        )}
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};

export default CustomerDetailModal;