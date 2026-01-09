// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import type { User, Sale, Expense, ReceiptSettingsData, Product, Withdrawal, CustomPayment, BusinessSettingsData, BusinessProfile } from '../types';
import Card from './Card';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { FINALIZED_SALE_STATUSES } from '../constants';

interface InvestorProfileProps {
    currentUser: User;
    users: User[];
    netProfit: number;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
}

const SummaryCard: React.FC<{ 
    title: string; 
    value: string; 
    caption: string; 
    colorClass?: string;
}> = ({ title, value, caption, colorClass = "text-slate-900 dark:text-white" }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col justify-between h-full font-sans">
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>{value}</p>
        </div>
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-8 uppercase tracking-widest leading-relaxed">{caption}</p>
    </div>
);

const InvestorProfile: React.FC<InvestorProfileProps> = ({ 
    currentUser, 
    users, 
    netProfit,
    receiptSettings, 
    businessSettings
}) => {
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

        return {
            myInvestment,
            myShare: (myShare * 100).toFixed(2),
            earnedYield,
            withdrawn,
            available: Math.max(0, earnedYield - withdrawn)
        };
    }, [currentUser, users, netProfit, businessSettings.investorDistributionPercentage]);

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative">
                    <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-8">Verified Partner Node Yield</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <SummaryCard title="Capital Stake" value={`${cs}${formatAbbreviatedNumber(analytics.myInvestment)}`} caption={`${analytics.myShare}% Verified Share`} />
                <SummaryCard title="Lifetime Dividend" value={`${cs}${formatAbbreviatedNumber(analytics.earnedYield)}`} colorClass="text-emerald-600" caption="Distributive Accrual" />
                <SummaryCard title="Realized Yield" value={`${cs}${formatAbbreviatedNumber(analytics.withdrawn)}`} colorClass="text-rose-600" caption="Settled Disbursements" />
                <SummaryCard title="Available Balance" value={`${cs}${formatAbbreviatedNumber(analytics.available)}`} colorClass="text-primary" caption="Unsettled Yield Liquidity" />
            </div>
        </div>
    );
};

export default InvestorProfile;