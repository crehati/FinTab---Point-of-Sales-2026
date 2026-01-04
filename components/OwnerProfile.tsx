
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
    currentUser, users, sales, expenses, products, receiptSettings, businessProfile, businessSettings, t,
    onUpdateWithdrawalStatus, handleUpdateCustomPaymentStatus, handleInitiateCustomPayment, onRequestWithdrawal, onSwitchUser, onConfirmWithdrawalReceived, onUpdateCurrentUserProfile
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'Staff' | 'Investor' | 'Owner'>('all');
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [reviewNote, setReviewNote] = useState('');
    const [pendingAction, setPendingAction] = useState<any | null>(null);
    const [receiptToShow, setReceiptToShow] = useState<any | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cs = receiptSettings.currencySymbol || '$';

    const equityAnalytics = useMemo(() => {
        const myInvestmentVal = currentUser.initialInvestment || 0;
        const activeInvestors = users.filter(u => u.role === 'Investor' && u.status === 'Active');
        const activeOwners = users.filter(u => u.role === 'Owner' && u.status === 'Active');
        const participants = businessSettings.includeOwnerInProfitSharing 
            ? [...activeOwners, ...activeInvestors] 
            : activeInvestors;
        const totalCapital = participants.reduce((sum, p) => sum + (p.initialInvestment || 0), 0);
        const isParticipant = businessSettings.includeOwnerInProfitSharing;
        const sharePercent = (isParticipant && totalCapital > 0) ? (myInvestmentVal / totalCapital) : 0;
        const distRate = (businessSettings.investorDistributionPercentage || 100) / 100;
        const realizedSales = sales.filter(s => FINALIZED_SALE_STATUSES.includes(s.status));
        const lifetimeGrossProfit = realizedSales.reduce((total, sale) => {
            const cogs = sale.items.reduce((sum, item) => {
                const p = products.find(prod => prod.id === item.product.id);
                return sum + ((p?.costPrice || 0) * item.quantity);
            }, 0);
            return total + (sale.subtotal - sale.discount - cogs);
        }, 0);
        const totalExpensesSum = (expenses || []).reduce((sum, e) => sum + e.amount, 0);
        const lifetimeNetProfit = Math.max(0, lifetimeGrossProfit - totalExpensesSum);
        const earnedTotal = lifetimeNetProfit * sharePercent * distRate;
        const withdrawnTotal = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed' && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);
        const reservedTotal = (currentUser.withdrawals || [])
            .filter(w => ['pending', 'approved_by_owner'].includes(w.status) && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);

        const totalStockCost = products.reduce((sum, p) => sum + (p.stock * (p.costPrice || 0)), 0);
        const totalStockValue = products.reduce((sum, p) => sum + (p.stock * (p.price || 0)), 0);

        return {
            myInvestmentVal,
            sharePercent: (sharePercent * 100).toFixed(1),
            earnedTotal,
            withdrawnTotal,
            available: Math.max(0, earnedTotal - withdrawnTotal - reservedTotal),
            isNotSet: myInvestmentVal <= 0,
            isPoolParticipant: isParticipant,
            totalStockCost,
            totalStockValue
        };
    }, [currentUser, users, sales, expenses, products, businessSettings.investorDistributionPercentage, businessSettings.includeOwnerInProfitSharing]);

    const allRequests = useMemo(() => {
        const list: any[] = [];
        users.forEach(u => {
            (u.withdrawals || []).forEach(w => list.push({ 
                ...w, 
                user: u, 
                requestType: w.source === 'compensation' ? 'Settlement' : w.source === 'commission' ? 'Commission' : 'Dividend', 
                origin: 'withdrawal' 
            }));
            (u.customPayments || []).forEach(p => {
                let displayType = 'Remittance';
                const match = p.description.match(/\[(.*?)\]/);
                if (match) displayType = match[1];
                list.push({ ...p, user: u, requestType: displayType, origin: 'remittance', date: p.dateInitiated, cleanDescription: p.description.replace(/\[.*?\]\s*/, '') });
            });
        });
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [users]);

    const kpis = useMemo(() => {
        const filterBy = (statuses: string[]) => {
            const items = allRequests.filter(r => statuses.includes(r.status));
            return { count: items.length, total: items.reduce((sum, r) => sum + r.amount, 0) };
        };
        return {
            pending: filterBy(['pending', 'pending_owner_approval']),
            awaiting: filterBy(['approved_by_owner']),
            completed: filterBy(['completed'])
        };
    }, [allRequests]);

    const filteredQueue = useMemo(() => {
        return allRequests.filter(r => {
            const matchesTab = (activeTab === 'pending' && ['pending', 'pending_owner_approval'].includes(r.status)) ||
                              (activeTab === 'awaiting' && r.status === 'approved_by_owner') ||
                              (activeTab === 'completed' && r.status === 'completed') ||
                              (activeTab === 'rejected' && ['rejected', 'rejected_by_owner', 'cancelled_by_user'].includes(r.status));
            const matchesRole = roleFilter === 'all' || r.user.role === roleFilter;
            const matchesSearch = r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.requestType.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesTab && matchesRole && matchesSearch;
        });
    }, [allRequests, activeTab, roleFilter, searchTerm]);

    const handleInitiateMyPayout = (source: 'investment' | 'compensation') => {
        const amt = prompt(`Enter ${source} withdrawal amount:`);
        if (amt && !isNaN(parseFloat(amt))) {
            const numericAmt = parseFloat(amt);
            if (source === 'investment' && numericAmt > equityAnalytics.available) {
                alert(`Insufficient liquidity. Max available: ${cs}${equityAnalytics.available.toFixed(2)}`);
                return;
            }
            try {
                onRequestWithdrawal(currentUser.id, numericAmt, source);
                alert("Reservation Protocol Initialized.");
            } catch (e: any) {
                alert(e.message);
            }
        }
    };

    const handleActionExecute = () => {
        if (!pendingAction || !selectedRequest) return;
        const { status } = pendingAction;
        const req = selectedRequest;
        
        if (req.origin === 'withdrawal') {
            onUpdateWithdrawalStatus(req.user.id, req.id, status, reviewNote);
        } else {
            handleUpdateCustomPaymentStatus(req.user.id, req.id, status, reviewNote);
        }

        setPendingAction(null);
        setSelectedRequest(null);
        setReviewNote('');
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
            {/* Owner Header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-10 text-center md:text-left">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <img src={currentUser.avatarUrl} className="w-32 h-32 rounded-[3rem] object-cover border-4 border-white/10 shadow-2xl group-hover:opacity-75 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md rounded-[3rem]">
                                <span className="bg-white text-slate-900 text-[9px] font-black uppercase px-6 py-2.5 rounded-xl">Edit Identity</span>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                                <span className="inline-block px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-[0.4em] border border-white/10">Principal Owner</span>
                            </div>
                            <div className="flex items-center gap-4 mt-8">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Authorized System Administrator Node</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => setIsSwapModalOpen(true)} className="px-10 py-6 bg-white/10 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-white/20 transition-all flex items-center justify-center active:scale-95 border border-white/10">
                             Swap Profile
                        </button>
                        <button onClick={() => setIsPaymentModalOpen(true)} className="px-12 py-6 bg-primary text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all flex items-center justify-center active:scale-95">
                            <PlusIcon className="w-6 h-6 mr-3" /> Remittance
                        </button>
                    </div>
                </div>
            </div>

            {/* Valuation Module */}
            <div className="space-y-8">
                <div className="flex justify-between items-end px-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{t('owner.valuation.title')}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Real-time ledger projection based on global inventory quantum</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TreasuryCard 
                        title="Inventory Acquisition Cost" 
                        amount={equityAnalytics.totalStockCost} 
                        cs={cs} color="text-amber-600" type="Principal Burn" 
                        actionLabel="Verify Stock Node" onAction={() => navigate('/inventory')}
                    />
                    <TreasuryCard 
                        title="Aggregated Market Value" 
                        amount={equityAnalytics.totalStockValue} 
                        cs={cs} color="text-emerald-600" type="Market Yield" 
                        actionLabel="Audit Price Matrix" onAction={() => navigate('/items')}
                    />
                </div>
            </div>

            {/* Equity Node */}
            <div className="space-y-8">
                <div className="flex justify-between items-end px-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{t('owner.stake.title')}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Personal equity performance and verified liquid dividends</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    <TreasuryCard 
                        title="Initial Capital" 
                        amount={equityAnalytics.isNotSet ? 'Null' : equityAnalytics.myInvestmentVal} 
                        cs={cs} color="text-slate-900 dark:text-white" type="Base Stake" 
                        isCurrency={!equityAnalytics.isNotSet}
                        errorState={equityAnalytics.isNotSet}
                        actionLabel={equityAnalytics.isNotSet ? "Enroll Stake →" : "Manage Capital"} 
                        onAction={() => navigate('/settings/business')}
                    />
                    <TreasuryCard 
                        title="Equity Portion" 
                        amount={equityAnalytics.isPoolParticipant ? `${equityAnalytics.sharePercent}%` : '0%'} 
                        cs="" color="text-primary" type="Pro-Rata" 
                        isCurrency={false}
                        actionLabel="Partner Roster" onAction={() => navigate('/users')}
                    />
                    <TreasuryCard 
                        title="Lifetime Earned" 
                        amount={equityAnalytics.isPoolParticipant ? equityAnalytics.earnedTotal : 0} 
                        cs={cs} color="text-emerald-600" type="Yield Accrued" 
                        actionLabel="Revenue Ledger" onAction={() => navigate('/reports')}
                    />
                    <TreasuryCard 
                        title="Total Liquidated" 
                        amount={equityAnalytics.withdrawnTotal} 
                        cs={cs} color="text-rose-600" type="Disbursed" 
                        actionLabel="Withdrawal History" onAction={() => setActiveTab('completed')}
                    />
                    <div className="h-full relative overflow-hidden bg-primary p-8 rounded-[3rem] shadow-2xl shadow-primary/30 flex flex-col justify-between group cursor-help" title={formatCurrency(equityAnalytics.available, cs)}>
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-4">Available Now</p>
                            <p className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">{cs}{formatAbbreviatedNumber(equityAnalytics.available)}</p>
                         </div>
                         <button onClick={() => handleInitiateMyPayout('investment')} className="mt-8 w-full py-4 bg-white text-primary rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Liquidation Protocol</button>
                    </div>
                </div>
            </div>

            {/* Action Center - Refined Table */}
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden font-sans">
                <header className="px-10 py-10 border-b dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-50/30 dark:bg-gray-800/30">
                    <div className="flex items-center gap-6">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Verification Queue</h2>
                    </div>
                    <nav className="flex gap-10 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'pending', label: 'Pending Review', count: kpis.pending.count },
                            { id: 'awaiting', label: 'Awaiting Payout', count: kpis.awaiting.count },
                            { id: 'completed', label: 'Finalized', count: kpis.completed.count },
                            { id: 'rejected', label: 'Archive', count: null }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 relative whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab.label}
                                {tab.count !== null && tab.count > 0 && <span className="absolute -top-3 -right-5 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">{tab.count}</span>}
                            </button>
                        ))}
                    </nav>
                </header>

                <div className="min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-900/50 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                <tr>
                                    <th className="px-10 py-8">Ledger Date</th>
                                    <th className="px-10 py-8">Authorized Identity</th>
                                    <th className="hidden lg:table-cell px-10 py-8">Protocol Class</th>
                                    <th className="px-10 py-8 text-right">Value</th>
                                    <th className="px-10 py-8 text-center">Lifecycle</th>
                                    <th className="px-10 py-8 text-right">Protocol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {filteredQueue.map((req) => (
                                    <tr key={req.id} className="group hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-10 py-10 whitespace-nowrap">
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{new Date(req.date).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tabular-nums">LOG: {req.id.slice(-8).toUpperCase()}</p>
                                        </td>
                                        <td className="px-10 py-10">
                                            <div className="flex items-center gap-5">
                                                <img src={req.user.avatarUrl} className="w-12 h-12 rounded-[1.25rem] object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate text-sm">{req.user.name}</p>
                                                    <p className={`text-[9px] font-black uppercase tracking-widest ${req.user.role === 'Owner' ? 'text-primary' : 'text-slate-400'}`}>{req.user.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell px-10 py-10">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-transparent">{req.requestType}</span>
                                        </td>
                                        <td className="px-10 py-10 text-right font-black text-lg tabular-nums">
                                            <span className={req.origin === 'withdrawal' ? 'text-rose-600' : 'text-primary'}>{cs}{req.amount.toFixed(2)}</span>
                                        </td>
                                        <td className="px-10 py-10 text-center">
                                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                                req.status.includes('pending') ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm animate-pulse-subtle' :
                                                req.status.includes('approved') ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm' :
                                                req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {req.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-10 py-10 text-right">
                                            <button onClick={() => setSelectedRequest(req)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Audit Review</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredQueue.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-40 text-center opacity-30">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                                <SearchIcon className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Zero Ledger Sequences Found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Preserved Modal Shells with new styling */}
            <ModalShell isOpen={isSwapModalOpen} onClose={() => setIsSwapModalOpen(false)} title="Identity Matrix" description="Simulate terminal access via different personnel nodes." maxWidth="max-w-md">
                <div className="space-y-3">
                    {users.map(u => (
                        <button 
                            key={u.id} 
                            onClick={() => { onSwitchUser(u); setIsSwapModalOpen(false); }}
                            className={`w-full flex items-center gap-5 p-6 rounded-[2rem] border transition-all ${u.id === currentUser.id ? 'bg-primary/5 border-primary shadow-inner' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 hover:border-primary/40'}`}
                        >
                            <img src={u.avatarUrl} className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                            <div className="text-left flex-1 min-w-0">
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate text-sm">{u.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{u.role}</p>
                            </div>
                            {u.id === currentUser.id && <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">Active Node</span>}
                        </button>
                    ))}
                </div>
            </ModalShell>

            <ModalShell isOpen={!!selectedRequest} onClose={() => { setSelectedRequest(null); setReviewNote(''); }} title="Protocol Audit" description="Transaction verification & final authorization" maxWidth="max-w-lg">
                {selectedRequest && (
                    <div className="space-y-10 font-sans">
                        <div className="bg-slate-50 dark:bg-gray-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                             <div className="flex items-center gap-5 mb-8">
                                <img src={selectedRequest.user.avatarUrl} className="w-16 h-16 rounded-3xl object-cover border-2 border-white dark:border-gray-700 shadow-xl" />
                                <div>
                                    <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{selectedRequest.user.name}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedRequest.user.role} Unit</p>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="p-6 bg-white dark:bg-gray-950 rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm">
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Requested Value</p>
                                     <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">{cs}{selectedRequest.amount.toFixed(2)}</p>
                                 </div>
                                 <div className="p-6 bg-white dark:bg-gray-950 rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm">
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Current Lifecycle</p>
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{selectedRequest.status.replace(/_/g, ' ')}</span>
                                 </div>
                             </div>
                             <div className="mt-4 p-6 bg-white dark:bg-gray-950 rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Audit Description</p>
                                 <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight leading-relaxed">{selectedRequest.requestType}</p>
                                 {selectedRequest.cleanDescription && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 italic leading-relaxed">"{selectedRequest.cleanDescription}"</p>}
                             </div>
                        </div>

                        {selectedRequest.status === 'completed' ? (
                            <div className="space-y-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2">Verified Blockchain Trace</h4>
                                <div className="space-y-3">
                                    {(selectedRequest.auditLog || []).map((log: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{log.status.replace(/_/g, ' ')}</p>
                                                <p className="text-[8px] text-slate-400 uppercase font-bold mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary px-3 py-1.5 bg-white dark:bg-gray-800 rounded-xl border border-primary/10">AUTH: {log.actorName?.split(' ')[0] || 'System'}</span>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setReceiptToShow(selectedRequest)}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all"
                                >
                                    Export Authenticated Voucher
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-slate-50 dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1 mb-3 block">Final Audit Rationale</label>
                                    <textarea 
                                        value={reviewNote} 
                                        onChange={(e) => setReviewNote(e.target.value)} 
                                        placeholder="Specify final rationale for authorization node..." 
                                        rows={3} 
                                        className="w-full bg-white dark:bg-gray-950 border-none rounded-2xl p-5 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all outline-none leading-relaxed resize-none shadow-sm" 
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setPendingAction({ status: activeTab === 'pending' ? 'approved_by_owner' : 'completed', variant: 'primary' })}
                                        className="flex-1 py-5 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all hover:bg-blue-700"
                                    >
                                        Authorize Change
                                    </button>
                                    <button 
                                        onClick={() => setPendingAction({ status: 'rejected_by_owner', variant: 'danger' })}
                                        className="px-10 py-5 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-800 text-slate-400 hover:text-rose-600 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ModalShell>

            <ConfirmationModal 
                isOpen={!!pendingAction}
                onClose={() => setPendingAction(null)}
                onConfirm={handleActionExecute}
                title="Protocol Sync Confirmation"
                message={`Verify the status modification to "${pendingAction?.status.replace(/_/g, ' ')}" for this ledger entry. Identifier: ${currentUser.name}`}
                amount={pendingAction?.amount}
                currencySymbol={cs}
                variant={pendingAction?.variant}
                isIrreversible={pendingAction?.variant === 'danger'}
            />

            <InitiatePaymentModal 
                isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} 
                onConfirm={(amt, desc, target) => {
                    handleInitiateCustomPayment(target || currentUser.id, amt, desc);
                    setIsPaymentModalOpen(false);
                }} 
                users={users} currencySymbol={cs} 
            />

            {receiptToShow && receiptToShow.origin === 'withdrawal' && (
                <WithdrawalReceiptModal
                    isOpen={!!receiptToShow}
                    onClose={() => setReceiptToShow(null)}
                    withdrawal={receiptToShow}
                    user={receiptToShow.user}
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}

            {receiptToShow && receiptToShow.origin === 'remittance' && (
                <PaymentReceiptModal
                    isOpen={!!receiptToShow}
                    onClose={() => setReceiptToShow(null)}
                    payment={receiptToShow}
                    user={receiptToShow.user}
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}
        </div>
    );
};

export default OwnerProfile;
