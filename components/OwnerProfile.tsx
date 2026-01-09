// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { User, Sale, ReceiptSettingsData, Withdrawal, CustomPayment, BusinessProfile, Expense, Customer, PerformanceUser, AuditEntry, BusinessSettingsData, Product } from '../types';
import Card from './Card';
import SafePortal from './SafePortal';
import InitiatePaymentModal from './InitiatePaymentModal';
import WithdrawalReceiptModal from './WithdrawalReceiptModal';
import PaymentReceiptModal from './PaymentReceiptModal';
import ConfirmationModal from './ConfirmationModal';
import ModalShell from './ModalShell';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { WarningIcon, AIIcon, MoreVertIcon, SearchIcon, CloseIcon, PrintIcon, DownloadJpgIcon, PlusIcon, FINALIZED_SALE_STATUSES, InventoryIcon } from '../constants';

interface OwnerProfileProps {
    currentUser: User;
    users: User[];
    sales: Sale[];
    expenses: Expense[];
    netProfit: number;
    products: Product[];
    receiptSettings: ReceiptSettingsData;
    businessProfile: BusinessProfile | null;
    businessSettings: BusinessSettingsData;
    t: (key: string) => string;
    onUpdateWithdrawalStatus: (userId: string, withdrawalId: string, status: Withdrawal['status'], note?: string) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status'], note?: string) => void;
    handleInitiateCustomPayment: (targetUserId: string, amount: number, description: string) => void;
    onRequestWithdrawal: (userId: string, amount: number, source: 'commission' | 'investment' | 'compensation') => void;
    onSwitchUser: (user: User) => void;
    onConfirmWithdrawalReceived: (userId: string, withdrawalId: string) => void;
    onUpdateCurrentUserProfile: (profileData: { name?: string; avatarUrl?: string; phone?: string; initialInvestment?: number; }) => void;
}

const TreasuryCard: React.FC<{ 
    title: string; 
    amount: number | string; 
    cs: string; 
    color: string; 
    type: string; 
    onAction: () => void;
    actionLabel: string;
    isCurrency?: boolean;
    errorState?: boolean;
}> = ({ title, amount, cs, color, type, onAction, actionLabel, isCurrency = true, errorState = false }) => (
    <div 
        className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col justify-between transition-all hover:shadow-xl group h-full relative font-sans cursor-help"
        title={typeof amount === 'number' ? formatCurrency(amount, cs) : amount}
    >
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${errorState ? 'text-rose-500' : color} tracking-tighter tabular-nums leading-none`}>
                    {!errorState && isCurrency && typeof amount === 'number' ? cs : ''}
                    {typeof amount === 'number' ? formatAbbreviatedNumber(amount) : amount}
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{type}</span>
            </div>
        </div>
        <button 
            onClick={onAction}
            className={`mt-8 w-full py-4 ${errorState ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-white hover:bg-primary hover:text-white'} rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-98 shadow-sm`}
        >
            {actionLabel}
        </button>
    </div>
);

const OwnerProfile: React.FC<OwnerProfileProps> = ({ 
    currentUser, users, sales, expenses, netProfit, products, receiptSettings, businessProfile, businessSettings, t,
    onUpdateWithdrawalStatus, handleUpdateCustomPaymentStatus, handleInitiateCustomPayment, onRequestWithdrawal, onSwitchUser, onConfirmWithdrawalReceived, onUpdateCurrentUserProfile
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    
    const cs = receiptSettings.currencySymbol || '$';

    const equityAnalytics = useMemo(() => {
        const myInvestmentVal = currentUser.initialInvestment || 0;
        const participants = users.filter(u => u && (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
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
            available: Math.max(0, earnedTotal - withdrawnTotal),
            isNotSet: myInvestmentVal <= 0,
            isPoolParticipant: isParticipant
        };
    }, [currentUser, users, netProfit, businessSettings]);

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
             <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-10 text-center md:text-left">
                        <img src={currentUser.avatarUrl} className="w-32 h-32 rounded-[3rem] object-cover border-4 border-white/10 shadow-2xl" />
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                                <span className="inline-block px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-[0.4em] border border-white/10">Principal Owner</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <TreasuryCard 
                    title="Principal Stake" 
                    amount={equityAnalytics.isNotSet ? 'Null' : equityAnalytics.myInvestmentVal} 
                    cs={cs} color="text-slate-900 dark:text-white" type="Initial" 
                    isCurrency={!equityAnalytics.isNotSet}
                    errorState={equityAnalytics.isNotSet}
                    actionLabel="Manage Capital" 
                    onAction={() => navigate('/settings')}
                />
                <TreasuryCard 
                    title="Equity Share" 
                    amount={`${equityAnalytics.sharePercent}%`} 
                    cs="" color="text-primary" type="Pro-Rata" 
                    isCurrency={false}
                    actionLabel="View Roster" onAction={() => navigate('/users')}
                />
                <TreasuryCard 
                    title="Net Yield" 
                    amount={equityAnalytics.earnedTotal} 
                    cs={cs} color="text-emerald-600" type="Earned" 
                    actionLabel="Audit Ledger" onAction={() => {}}
                />
                <div className="h-full relative overflow-hidden bg-primary p-8 rounded-[3rem] shadow-2xl flex flex-col justify-between group cursor-help">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-4">Liquid Balance</p>
                    <p className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">{cs}{formatAbbreviatedNumber(equityAnalytics.available)}</p>
                    <button className="mt-8 w-full py-4 bg-white text-primary rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl">Authorized Read-Only</button>
                </div>
            </div>
        </div>
    );
};

export default OwnerProfile;