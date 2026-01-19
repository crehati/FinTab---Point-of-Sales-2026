// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { User, Sale, ReceiptSettingsData, CustomPayment, BusinessSettingsData, Expense } from '../types';
import Card from './Card';
import StaffPaymentManager from './StaffPaymentManager';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { CrownIcon, ShieldCheckIcon, TransactionIcon, ReportsIcon } from '../constants';

interface OwnerProfileProps {
    currentUser: User;
    users: User[];
    sales: Sale[];
    expenses: Expense[];
    netProfit: number;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
    handleInitiateCustomPayment: (targetUserId: string, amount: number, description: string) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status']) => void;
    onSwitchUser: (user: User) => void;
    onUpdateCurrentUserProfile: (data: any) => void;
}

const SummaryMetric: React.FC<{ title: string; value: string; caption: string; colorClass?: string }> = ({ title, value, caption, colorClass = "text-slate-900 dark:text-white" }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full font-sans transition-all hover:shadow-xl group">
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>{value}</p>
        </div>
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-8 uppercase tracking-widest leading-relaxed">{caption}</p>
    </div>
);

const OwnerProfile: React.FC<OwnerProfileProps> = ({ 
    currentUser, users, sales, expenses, netProfit, receiptSettings, businessSettings,
    handleInitiateCustomPayment, handleUpdateCustomPaymentStatus, onSwitchUser, onUpdateCurrentUserProfile
}) => {
    const [activeTab, setActiveTab] = useState<'governance' | 'analytics' | 'staff_ledger'>('governance');
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const cs = receiptSettings.currencySymbol || '$';

    const analyticsData = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const daySales = (sales || []).filter(s => s.date.startsWith(dateStr) && (s.status === 'completed' || s.status === 'approved_by_owner')).reduce((sum, s) => sum + s.total, 0);
            const dayExpenses = (expenses || []).filter(e => e.date.startsWith(dateStr) && e.status !== 'deleted').reduce((sum, e) => sum + e.amount, 0);
            data.push({
                name: d.toLocaleDateString(undefined, { weekday: 'short' }),
                revenue: daySales,
                profit: daySales - dayExpenses
            });
        }
        return data;
    }, [sales, expenses]);

    const equityAnalytics = useMemo(() => {
        const myInvestmentVal = currentUser.initialInvestment || 0;
        const participants = (users || []).filter(u => u && (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = participants.reduce((sum, p) => sum + (p.initialInvestment || 0), 0);
        const isParticipant = businessSettings.includeOwnerInProfitSharing;
        const sharePercent = (isParticipant && totalCapital > 0) ? (myInvestmentVal / totalCapital) : 0;
        const distRate = (businessSettings.investorDistributionPercentage || 100) / 100;
        const earnedTotal = netProfit * sharePercent * distRate;
        const withdrawnTotal = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed' && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);

        return {
            myInvestmentVal,
            sharePercent: (sharePercent * 100).toFixed(1),
            earnedTotal,
            withdrawnTotal,
            available: Math.max(0, earnedTotal - withdrawnTotal)
        };
    }, [currentUser, users, netProfit, businessSettings]);

    const handleAvatarClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdateCurrentUserProfile({ avatarUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <img src={currentUser.avatarUrl} className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-white/10 shadow-2xl transition-transform group-hover:scale-105" />
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full border-4 border-slate-900 flex items-center justify-center z-10">
                                <CrownIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                        </div>
                        <div>
                            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                            <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
                                <span className="px-5 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">Principal Owner</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Auth Node</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <SummaryMetric title="Principal Stake" value={`${cs}${formatAbbreviatedNumber(equityAnalytics.myInvestmentVal)}`} caption={`${equityAnalytics.sharePercent}% Verified Ownership`} />
                <SummaryMetric title="Net Yield" value={`${cs}${formatAbbreviatedNumber(equityAnalytics.earnedTotal)}`} colorClass="text-emerald-600" caption="Lifetime Accrued Dividend" />
                <SummaryMetric title="Realized Yield" value={`${cs}${formatAbbreviatedNumber(equityAnalytics.withdrawnTotal)}`} colorClass="text-rose-600" caption="Disbursed To Personal Node" />
                <div className="bg-primary text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between group h-full">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-4">Available Yield</p>
                        <p className="text-3xl font-black tabular-nums tracking-tighter">{cs}{formatAbbreviatedNumber(equityAnalytics.available)}</p>
                    </div>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-8">Liquid Equity Protocol</p>
                </div>
            </div>

            <div className="flex gap-10 px-8 border-b dark:border-gray-800">
                <button onClick={() => setActiveTab('governance')} className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${activeTab === 'governance' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Governance Hub</button>
                <button onClick={() => setActiveTab('analytics')} className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Enterprise Insights</button>
                <button onClick={() => setActiveTab('staff_ledger')} className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${activeTab === 'staff_ledger' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Personnel Remittance</button>
            </div>

            <main className="animate-fade-in">
                {activeTab === 'governance' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-6">
                            <Card title="Ownership Audit Ledger">
                                <div className="table-wrapper border-none rounded-none -mx-6 px-6">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">Auth Code</th>
                                                <th className="px-6 py-4">Protocol Date</th>
                                                <th className="px-6 py-4 text-right">Yield Shift</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {(currentUser.withdrawals || []).slice(0, 10).map(w => (
                                                <tr key={w.id}>
                                                    <td className="px-6 py-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">{w.id.slice(-8).toUpperCase()}</td>
                                                    <td className="px-6 py-5 font-bold text-slate-900 dark:text-white uppercase">{new Date(w.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-5 text-right font-black text-rose-600 tabular-nums">-{cs}{w.amount.toFixed(2)}</td>
                                                    <td className="px-6 py-5 text-center"><span className="status-badge status-approved !text-[8px]">{w.status}</span></td>
                                                </tr>
                                            ))}
                                            {(currentUser.withdrawals || []).length === 0 && (
                                                <tr><td colSpan={4} className="py-20 text-center opacity-20 font-black uppercase tracking-[0.4em] text-[10px]">Audit Log Empty</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                             <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 h-full">
                                <div className="flex items-center gap-4 mb-8">
                                    <ShieldCheckIcon className="w-5 h-5 text-primary" />
                                    <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.4em]">Protocol Node Rules</h3>
                                </div>
                                <div className="space-y-6">
                                    {[
                                        "Identity stake is used for automated distributive yield calculations.",
                                        "Owner payouts are deducted from net treasury liquidity.",
                                        "Governance overrides allow manual ledger reconciliation."
                                    ].map((rule, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 flex-shrink-0"></div>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-relaxed">{rule}</p>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-10">
                        <Card title="Revenue vs. Profit Protocol (7D Trend)">
                            <div className="h-[400px] w-full mt-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analyticsData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#2563EB" fillOpacity={1} fill="url(#colorRev)" />
                                        <Area type="monotone" dataKey="profit" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'staff_ledger' && (
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <TransactionIcon className="w-6 h-6 text-primary" />
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Personnel Yield Remittance</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage secondary payouts and performance bonuses</p>
                                </div>
                            </div>
                        </div>
                        <StaffPaymentManager 
                            users={users} 
                            receiptSettings={receiptSettings} 
                            handleInitiateCustomPayment={handleInitiateCustomPayment} 
                            handleUpdateCustomPaymentStatus={handleUpdateCustomPaymentStatus} 
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default OwnerProfile;