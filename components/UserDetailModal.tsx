// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import type { User, Sale, PerformanceUser, ReceiptSettingsData, CustomPayment, Withdrawal, Expense } from '../types';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { FINALIZED_SALE_STATUSES } from '../constants';
import ModalShell from './ModalShell';

interface UserDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: PerformanceUser | null;
    sales: Sale[];
    expenses: Expense[];
    receiptSettings: ReceiptSettingsData;
}

const MetricCard: React.FC<{ title: string; value: string; color?: string; subtext?: string }> = ({ title, value, color = 'text-slate-900 dark:text-white', subtext }) => (
    <div className="bg-slate-50 dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-800 flex flex-col justify-center">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</p>
        <p className={`text-2xl font-black ${color} tracking-tighter tabular-nums`}>{value}</p>
        {subtext && <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{subtext}</p>}
    </div>
);

const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, onClose, user, sales, expenses, receiptSettings }) => {
    const [activeTab, setActiveTab] = useState<'audit' | 'ledger'>('audit');
    
    useEffect(() => { if (isOpen) setActiveTab('audit'); }, [isOpen]);

    if (!user) return null;
    
    const cs = receiptSettings.currencySymbol;
    const isInvestor = user.role === 'Investor' || user.role === 'Owner';
    
    const analytics = useMemo(() => {
        const mySales = sales.filter(s => s.userId === user.id && FINALIZED_SALE_STATUSES.includes(s.status));
        const earned = mySales.reduce((sum, s) => sum + (Number(s.commission) || 0), 0);
        const withdrawn = (user.withdrawals || []).filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);
        return { earned, withdrawn, balance: Math.max(0, earned - withdrawn), salesCount: mySales.length };
    }, [user, sales]);

    const footer = (
        <button onClick={onClose} className="btn-base btn-primary w-full py-5">
            Exit Personnel Audit
        </button>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title={user.name} 
            description={`${user.role} Authorization Node`}
            maxWidth="max-w-4xl"
            footer={footer}
        >
            <div className="space-y-10">
                {/* Metric Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title="Accrued Yield" value={`${cs}${formatAbbreviatedNumber(analytics.earned)}`} color="text-emerald-600" subtext={`${analytics.salesCount} Conversions`} />
                    <MetricCard title="Settled Total" value={`${cs}${formatAbbreviatedNumber(analytics.withdrawn)}`} color="text-rose-600" />
                    <MetricCard title="Node Balance" value={`${cs}${formatAbbreviatedNumber(analytics.balance)}`} color="text-primary" />
                    <MetricCard title="Status" value={user.status || 'ACTIVE'} color="text-slate-900 dark:text-white" />
                </div>

                <div className="flex bg-slate-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-slate-100 dark:border-gray-800">
                    <button onClick={() => setActiveTab('audit')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'audit' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-slate-400'}`}>Performance</button>
                    <button onClick={() => setActiveTab('ledger')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'ledger' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-slate-400'}`}>Financial Ledger</button>
                </div>

                <div className="min-h-[300px]">
                    {activeTab === 'audit' ? (
                        <div className="table-wrapper border dark:border-gray-800 rounded-[2.5rem] overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-gray-950 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <tr><th className="p-6">Auth Date</th><th className="p-6">Record Ref</th><th className="p-6 text-right">Commission</th></tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {sales.filter(s => s.userId === user.id).slice(0, 10).map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50">
                                            <td className="p-6 font-bold text-xs text-slate-400 tabular-nums">{new Date(s.date).toLocaleDateString()}</td>
                                            <td className="p-6 font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xs">{s.id.slice(-8).toUpperCase()}</td>
                                            <td className="p-6 text-right font-black text-emerald-600 tabular-nums">{cs}{s.commission?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-20">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Ledger Sequences Null</p>
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default UserDetailModal;