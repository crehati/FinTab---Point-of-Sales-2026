// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import type { User, Sale, ReceiptSettingsData, BusinessSettingsData, Withdrawal } from '../types';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import WithdrawalRequestModal from './WithdrawalRequestModal';
import { PlusIcon, WarningIcon, TransactionIcon } from '../constants';

interface InvestorProfileProps {
    currentUser: User;
    users: User[];
    netProfit: number;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
    onRequestWithdrawal: (userId: string, amount: number, source: 'commission' | 'investment') => void;
    onUpdateCurrentUserProfile: (profileData: { name?: string; avatarUrl?: string; phone?: string; initialInvestment?: number; }) => void;
}

const SummaryCard: React.FC<{ 
    title: string; 
    value: string; 
    caption: string; 
    colorClass?: string;
}> = ({ title, value, caption, colorClass = "text-slate-900 dark:text-white" }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full font-sans transition-all hover:shadow-xl group">
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>{value}</p>
        </div>
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-8 uppercase tracking-widest leading-relaxed">{caption}</p>
    </div>
);

const InvestorProfile: React.FC<InvestorProfileProps> = ({ 
    currentUser, users, netProfit, receiptSettings, businessSettings, onRequestWithdrawal, onUpdateCurrentUserProfile
}) => {
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const cs = receiptSettings.currencySymbol || '$';

    const analytics = useMemo(() => {
        const activeParticipants = users.filter(u => (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = activeParticipants.reduce((sum, inv) => sum + (inv.initialInvestment || 0), 0);
        
        const myInvestment = currentUser.initialInvestment || 0;
        const myShare = totalCapital > 0 ? (myInvestment / totalCapital) : 0;
        
        const distRate = (businessSettings.investorDistributionPercentage || 100) / 100;
        const earnedYield = netProfit * myShare * distRate;
        
        const withdrawn = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed' && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);
        
        const reserved = (currentUser.withdrawals || [])
            .filter(w => ['pending', 'approved_by_owner'].includes(w.status) && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);

        return {
            myInvestment,
            myShare: (myShare * 100).toFixed(2),
            earnedYield,
            withdrawn,
            reserved,
            available: Math.max(0, earnedYield - withdrawn - reserved)
        };
    }, [currentUser, users, netProfit, businessSettings]);

    const hasActiveRequest = analytics.reserved > 0;

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
                <div className="relative flex flex-col md:flex-row items-center gap-10">
                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                        <img src={currentUser.avatarUrl} className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white/10 shadow-2xl transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                    </div>
                    <div>
                        <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-8">Verified Partner Node Yield</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <SummaryCard title="Capital Stake" value={`${cs}${formatAbbreviatedNumber(analytics.myInvestment)}`} caption={`${analytics.myShare}% Verified Share`} />
                <SummaryCard title="Lifetime Dividend" value={`${cs}${formatAbbreviatedNumber(analytics.earnedYield)}`} colorClass="text-emerald-600" caption="Distributive Accrual" />
                <SummaryCard title="In Verification" value={`${cs}${formatAbbreviatedNumber(analytics.reserved)}`} colorClass="text-amber-500" caption="Payouts Awaiting Audit" />
                <div className="bg-primary text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between group h-full">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-4">Available Yield</p>
                        <p className="text-3xl font-black tracking-tighter tabular-nums leading-none">{cs}{formatAbbreviatedNumber(analytics.available)}</p>
                    </div>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-8">Authorized Grid Balance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="relative">
                            {hasActiveRequest ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <WarningIcon className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Reservation Active</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Wait for principal authorization of your pending {cs}{analytics.reserved.toFixed(2)} request.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-10">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Liquidation Node</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Initiate Dividend Reserve Payout</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsWithdrawalModalOpen(true)} 
                                        disabled={analytics.available <= 0} 
                                        className="w-full py-6 bg-primary text-white rounded-3xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-primary/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-4"
                                    >
                                        <PlusIcon className="w-6 h-6" />
                                        Request Dividend Authorization
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="bg-slate-50 dark:bg-gray-800/40 p-10 rounded-[3rem] border border-slate-100 dark:border-gray-800 h-full flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-8">
                             <TransactionIcon className="w-5 h-5 text-primary" />
                             <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Equity Ledger</h4>
                        </div>
                        <div className="space-y-6">
                            {(currentUser.withdrawals || []).slice(0, 5).map(w => (
                                <div key={w.id} className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-gray-700 last:border-0">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{new Date(w.date).toLocaleDateString()}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{w.status}</p>
                                    </div>
                                    <p className="text-sm font-black tabular-nums text-rose-500">-{cs}{w.amount.toFixed(2)}</p>
                                </div>
                            ))}
                            {(currentUser.withdrawals || []).length === 0 && (
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-6">Ledger Sequences Null</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <WithdrawalRequestModal 
                isOpen={isWithdrawalModalOpen} 
                onClose={() => setIsWithdrawalModalOpen(false)} 
                onConfirm={(amount, source) => {
                    onRequestWithdrawal(currentUser.id, amount, source);
                    setIsWithdrawalModalOpen(false);
                }} 
                availableBalance={analytics.available} 
                currencySymbol={cs} 
                source="investment" 
            />
        </div>
    );
};

export default InvestorProfile;