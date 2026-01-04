
// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import type { User, Sale, Expense, ReceiptSettingsData, Product, Withdrawal, CustomPayment, BusinessSettingsData, BusinessProfile } from '../types';
import Card from './Card';
import WithdrawalRequestModal from './WithdrawalRequestModal';
import WithdrawalReceiptModal from './WithdrawalReceiptModal';
import PaymentReceiptModal from './PaymentReceiptModal';
import ModalShell from './ModalShell';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { WarningIcon, PlusIcon, FINALIZED_SALE_STATUSES } from '../constants';

interface InvestorProfileProps {
    currentUser: User;
    users: User[];
    sales: Sale[];
    expenses: Expense[];
    products: Product[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
    businessProfile: BusinessProfile | null;
    onRequestWithdrawal: (userId: string, amount: number, source: 'commission' | 'investment') => void;
    onUpdateWithdrawalStatus: (userId: string, withdrawalId: string, status: Withdrawal['status']) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status']) => void;
    onConfirmWithdrawalReceived: (userId: string, withdrawalId: string) => void;
    onSwitchUser: (user: User) => void;
    onUpdateCurrentUserProfile: (profileData: { name?: string; avatarUrl?: string; phone?: string; initialInvestment?: number; }) => void;
}

const SummaryCard: React.FC<{ 
    title: string; 
    value: string; 
    fullValue: string;
    caption: string; 
    colorClass?: string;
    isMtd?: boolean;
    onToggleMtd?: () => void;
    cs: string;
}> = ({ title, value, fullValue, caption, colorClass = "text-slate-900 dark:text-white", isMtd, onToggleMtd, cs }) => (
    <div 
        className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col justify-between transition-all hover:shadow-xl h-full relative group cursor-help font-sans"
        title={fullValue}
    >
        <div className="flex justify-between items-start">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            {onToggleMtd && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleMtd(); }}
                    className={`text-[8px] font-black px-3 py-1 rounded-xl border transition-all ${isMtd ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-gray-800 dark:border-gray-700'}`}
                >
                    {isMtd ? 'Cycle: MTD' : 'Horizon: Lifetime'}
                </button>
            )}
        </div>
        <div>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>{value}</p>
        </div>
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-8 uppercase tracking-widest leading-relaxed">{caption}</p>
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; type: 'approved' | 'pending' | 'rejected' | 'draft' }> = {
        'pending': { label: 'Audit Review', type: 'pending' },
        'pending_owner_approval': { label: 'Reviewing', type: 'pending' },
        'approved_by_owner': { label: 'Final Verification', type: 'pending' },
        'completed': { label: 'Settled', type: 'approved' },
        'rejected': { label: 'Archived', type: 'rejected' },
        'rejected_by_owner': { label: 'Denied', type: 'rejected' },
        'cancelled_by_user': { label: 'Voided', type: 'draft' },
    };
    const item = config[status] || { label: status.replace(/_/g, ' '), type: 'draft' };
    
    let statusClass = 'status-draft';
    if (item.type === 'approved') statusClass = 'status-approved';
    if (item.type === 'pending') statusClass = 'status-pending';
    if (item.type === 'rejected') statusClass = 'status-rejected';

    return (
        <span className={`status-badge ${statusClass} !text-[8px] !px-3 !py-1`}>
            {item.label}
        </span>
    );
};

const InvestorProfile: React.FC<InvestorProfileProps> = ({ 
    currentUser, 
    users, 
    sales, 
    expenses, 
    products, 
    receiptSettings, 
    businessSettings, 
    businessProfile, 
    onRequestWithdrawal, 
    onUpdateWithdrawalStatus,
    handleUpdateCustomPaymentStatus,
    onConfirmWithdrawalReceived,
    onSwitchUser,
    onUpdateCurrentUserProfile
}) => {
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [withdrawalReceiptToShow, setWithdrawalReceiptToShow] = useState<Withdrawal | null>(null);
    const [paymentReceiptToShow, setPaymentReceiptToShow] = useState<CustomPayment | null>(null);
    const [successBanner, setSuccessBanner] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [mtdFilter, setMtdFilter] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const cs = receiptSettings.currencySymbol || '$';

    const analytics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const activeInvestors = users.filter(u => (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = activeInvestors.reduce((sum, inv) => sum + (inv.initialInvestment || 0), 0);
        
        const processSales = (sList: Sale[]) => sList.filter(s => FINALIZED_SALE_STATUSES.includes(s.status)).reduce((total, sale) => {
            const cogs = sale.items.reduce((sum, item) => {
                const prod = products.find(p => p.id === item.product.id);
                return sum + ((prod?.costPrice || 0) * item.quantity);
            }, 0);
            return total + (sale.subtotal - sale.discount - cogs);
        }, 0);

        const totalGrossProfit = processSales(sales);
        const mtdGrossProfit = processSales(sales.filter(s => new Date(s.date) >= startOfMonth));

        const totalExpensesValue = expenses.reduce((sum, e) => sum + e.amount, 0);
        const mtdExpensesValue = expenses.filter(e => new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);

        const totalNetProfit = Math.max(0, totalGrossProfit - totalExpensesValue);
        const mtdNetProfit = Math.max(0, mtdGrossProfit - mtdExpensesValue);

        const myInvestmentValue = currentUser.initialInvestment || 0;
        const myInvestmentPercent = totalCapital > 0 ? (myInvestmentValue / totalCapital) : 0;
        
        const distRate = (businessSettings.investorDistributionPercentage || 100) / 100;
        const lifetimeProfitEarned = totalNetProfit * myInvestmentPercent * distRate;
        const mtdProfitEarned = mtdNetProfit * myInvestmentPercent * distRate;
        
        const myWithdrawals = (currentUser.withdrawals || []).filter(w => w.source === 'investment');
        const myRemittances = (currentUser.customPayments || []);

        const withdrawnCompleted = myWithdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0);
        const remittancesCompleted = myRemittances.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
        
        const reservedFunds = myWithdrawals.filter(w => ['pending', 'approved_by_owner'].includes(w.status)).reduce((sum, w) => sum + w.amount, 0);
        const pendingRemittances = myRemittances.filter(p => ['pending_owner_approval', 'approved_by_owner'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0);
        
        const availableLiquid = Math.max(0, lifetimeProfitEarned - withdrawnCompleted - reservedFunds);

        const mtdWithdrawn = myWithdrawals.filter(w => w.status === 'completed' && new Date(w.date) >= startOfMonth).reduce((sum, w) => sum + w.amount, 0);
        const mtdRemittances = myRemittances.filter(p => p.status === 'completed' && new Date(p.dateInitiated) >= startOfMonth).reduce((sum, p) => sum + p.amount, 0);

        const hasActiveRequest = myWithdrawals.some(w => ['pending', 'approved_by_owner'].includes(w.status));

        const lastPayout = [...myWithdrawals, ...myRemittances].filter(i => i.status === 'completed').sort((a, b) => new Date(b.date || b.dateInitiated).getTime() - new Date(a.date || a.dateInitiated).getTime())[0];

        return {
            totalCapital,
            netProfit: mtdFilter ? mtdNetProfit : totalNetProfit,
            myInvestmentValue,
            myInvestmentPercent: (myInvestmentPercent * 100).toFixed(2),
            myProfitEarned: mtdFilter ? mtdProfitEarned : lifetimeProfitEarned,
            withdrawnCompleted: mtdFilter ? (mtdWithdrawn + mtdRemittances) : (withdrawnCompleted + remittancesCompleted),
            reservedFunds: reservedFunds + pendingRemittances,
            availableLiquid,
            hasActiveRequest,
            lastPayout,
            lastUpdated: new Date().toLocaleString()
        };
    }, [currentUser, users, sales, expenses, products, mtdFilter, businessSettings.investorDistributionPercentage]);

    const transactionHistory = useMemo(() => {
        const wds = (currentUser.withdrawals || []).filter(w => w.source === 'investment').map(w => ({ ...w, txClass: 'Withdrawal', displayType: 'Dividend Distribution' }));
        const pms = (currentUser.customPayments || []).map(p => ({ ...p, date: p.dateInitiated, txClass: 'Remittance', displayType: 'Special Remittance' }));
        return [...wds, ...pms].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [currentUser.withdrawals, currentUser.customPayments]);

    const handleRequestFunds = async (amount: number) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setErrorMessage(null);
        try {
            await onRequestWithdrawal(currentUser.id, amount, 'investment');
            setIsWithdrawalModalOpen(false);
            setSuccessBanner("Capital reservation initialized. Review pending.");
            setTimeout(() => setSuccessBanner(null), 5000);
        } catch (e: any) {
            setErrorMessage(e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptPayout = async (item: any) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (item.txClass === 'Withdrawal') {
                await onConfirmWithdrawalReceived(currentUser.id, item.id);
                const updated = (currentUser.withdrawals || []).map(w => w.id === item.id ? { ...w, status: 'completed' } : w);
                onUpdateCurrentUserProfile({ withdrawals: updated });
            } else {
                await handleUpdateCustomPaymentStatus(currentUser.id, item.id, 'completed', 'Verified identity receipt.');
                const updated = (currentUser.customPayments || []).map(p => p.id === item.id ? { ...p, status: 'completed' } : p);
                onUpdateCurrentUserProfile({ customPayments: updated });
            }
            setSuccessBanner("Settlement finalized.");
            setTimeout(() => setSuccessBanner(null), 5000);
        } catch (e: any) {
            setErrorMessage("Sync failure.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeclinePayout = async (item: any) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (item.txClass === 'Withdrawal') {
                await onUpdateWithdrawalStatus(currentUser.id, item.id, 'cancelled_by_user');
                const updated = (currentUser.withdrawals || []).map(w => w.id === item.id ? { ...w, status: 'cancelled_by_user' } : w);
                onUpdateCurrentUserProfile({ withdrawals: updated });
            } else {
                await handleUpdateCustomPaymentStatus(currentUser.id, item.id, 'cancelled_by_user', 'Declined by recipient.');
                const updated = (currentUser.customPayments || []).map(p => p.id === item.id ? { ...p, status: 'cancelled_by_user' } : p);
                onUpdateCurrentUserProfile({ customPayments: updated });
            }
            setSuccessBanner("Transaction voided.");
            setTimeout(() => setSuccessBanner(null), 5000);
        } catch (e: any) {
            setErrorMessage("Sync failure.");
        } finally {
            setIsProcessing(false);
        }
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
            {/* Private Banking Header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-10 text-center md:text-left">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <img src={currentUser.avatarUrl} className="w-32 h-32 rounded-[3rem] object-cover border-4 border-white/10 shadow-2xl group-hover:opacity-75 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md rounded-[3rem]">
                                <span className="bg-white text-slate-900 text-[9px] font-black uppercase px-6 py-2.5 rounded-xl">Update Node</span>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                                <span className="inline-block px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-[0.4em] border border-white/10">Equity Partner</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-8">Secure Node Authorization Active</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                         <button onClick={() => setIsSwapModalOpen(true)} className="px-10 py-6 bg-white/10 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-white/20 transition-all active:scale-95 border border-white/10 backdrop-blur-md">
                            Swap Profile
                        </button>
                        {analytics.hasActiveRequest ? (
                            <div className="px-12 py-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] text-center">
                                <p className="text-amber-500 font-black uppercase text-[10px] tracking-[0.4em]">Audit Pending</p>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsWithdrawalModalOpen(true)} 
                                disabled={analytics.availableLiquid <= 0 || isProcessing}
                                className="px-14 py-6 bg-primary text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-primary/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-4"
                            >
                                {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlusIcon className="w-6 h-6" />}
                                Request Dividend
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {successBanner && (
                <div className="bg-emerald-500 text-white p-8 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl shadow-emerald-200 flex items-center justify-center gap-6 animate-bounce-in">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M5 13l4 4L19 7" /></svg>
                    {successBanner}
                </div>
            )}

            {/* Performance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 px-2">
                <SummaryCard 
                    title="Capital Injection" 
                    value={`${cs}${formatAbbreviatedNumber(analytics.myInvestmentValue)}`} 
                    fullValue={formatCurrency(analytics.myInvestmentValue, cs)}
                    caption={`${analytics.myInvestmentPercent}% Verified Share`} 
                    cs={cs}
                />
                <SummaryCard 
                    title="Requested Funds" 
                    value={`${cs}${formatAbbreviatedNumber(analytics.reservedFunds)}`} 
                    fullValue={formatCurrency(analytics.reservedFunds, cs)}
                    caption="Reservation Audit Active" 
                    colorClass="text-amber-500"
                    cs={cs}
                />
                <SummaryCard 
                    title="Net Dividend" 
                    value={`${cs}${formatAbbreviatedNumber(analytics.myProfitEarned)}`} 
                    fullValue={formatCurrency(analytics.myProfitEarned, cs)}
                    caption={`${mtdFilter ? 'MTD' : 'Lifetime'} Accrued`} 
                    colorClass="text-emerald-600"
                    onToggleMtd={() => setMtdFilter(!mtdFilter)}
                    isMtd={mtdFilter}
                    cs={cs}
                />
                <SummaryCard 
                    title="Realized Yield" 
                    value={`${cs}${formatAbbreviatedNumber(analytics.withdrawnCompleted)}`} 
                    fullValue={formatCurrency(analytics.withdrawnCompleted, cs)}
                    caption="Settled Disbursements" 
                    colorClass="text-rose-600" 
                    cs={cs}
                />
                <SummaryCard 
                    title="Available Liquid" 
                    value={`${cs}${formatAbbreviatedNumber(analytics.availableLiquid)}`} 
                    fullValue={formatCurrency(analytics.availableLiquid, cs)}
                    caption="Authorized Dividend Balance" 
                    colorClass="text-primary" 
                    cs={cs}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-10">
                    <Card title="Stake Governance">
                        <div className="space-y-8">
                            <div className="p-8 bg-slate-50 dark:bg-gray-900 rounded-[3rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payout Protocol</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">Pro-Rata Performance Ledger</p>
                                <p className="text-[11px] text-slate-500 font-bold mt-6 leading-relaxed uppercase tracking-wider">
                                    Current synchronization allocates <span className="text-primary font-black">{businessSettings.investorDistributionPercentage}%</span> of total net profit across verified nodes.
                                </p>
                            </div>

                            <div className="p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[3rem] border border-blue-100 dark:border-blue-900/50">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Last Verified Settlement</p>
                                {analytics.lastPayout ? (
                                    <>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{cs}{analytics.lastPayout.amount.toFixed(2)}</p>
                                        <p className="text-[10px] text-blue-600 font-black uppercase mt-4 tracking-widest">{new Date(analytics.lastPayout.date || analytics.lastPayout.dateInitiated).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-blue-400 font-black uppercase tracking-[0.2em] italic text-center py-6">Ledger clear</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card title="Liquidation Ledger">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-gray-900/50 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b dark:border-gray-800">
                                    <tr>
                                        <th className="px-10 py-8">Ledger Date</th>
                                        <th className="px-10 py-8">Protocol</th>
                                        <th className="px-10 py-8 text-right">Debit Val</th>
                                        <th className="px-10 py-8 text-center">Lifecycle</th>
                                        <th className="px-10 py-8 text-right">Certificate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                    {transactionHistory.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-10 py-10 whitespace-nowrap">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm">{new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tabular-nums">LOG: {item.id.slice(-8).toUpperCase()}</p>
                                            </td>
                                            <td className="px-10 py-10 whitespace-nowrap">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.displayType}</p>
                                            </td>
                                            <td className="px-10 py-10 text-right font-black text-lg text-rose-600 tabular-nums">
                                                -{cs}{item.amount.toFixed(2)}
                                            </td>
                                            <td className="px-10 py-10 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <StatusBadge status={item.status} />
                                                    {item.status === 'approved_by_owner' && (
                                                        <div className="flex gap-2 animate-fade-in">
                                                            <button 
                                                                onClick={() => handleAcceptPayout(item)}
                                                                disabled={isProcessing}
                                                                className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 active:scale-95 transition-all"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeclinePayout(item)} 
                                                                disabled={isProcessing}
                                                                className="px-6 py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                                                            >
                                                                Void
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-10 py-10 text-right">
                                                {item.status === 'completed' ? (
                                                    <button 
                                                        onClick={() => item.txClass === 'Withdrawal' ? setWithdrawalReceiptToShow(item) : setPaymentReceiptToShow(item)} 
                                                        className="p-4 bg-primary/5 text-primary hover:bg-primary/10 rounded-2xl transition-all active:scale-90"
                                                    >
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    </button>
                                                ) : <span className="text-[10px] text-slate-300 font-black uppercase italic tracking-widest">Pending Sync</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactionHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-40 text-center opacity-30">
                                                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Zero Ledger Sequences</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Preservation of existing Modals */}
            <WithdrawalRequestModal 
                isOpen={isWithdrawalModalOpen} 
                onClose={() => setIsWithdrawalModalOpen(false)} 
                onConfirm={handleRequestFunds} 
                availableBalance={analytics.availableLiquid} 
                currencySymbol={cs} 
                source="investment" 
                isProcessing={isProcessing}
            />

            <ModalShell isOpen={isSwapModalOpen} onClose={() => setIsSwapModalOpen(false)} title="Identity Matrix" description="Simulate terminal access via different personnel nodes." maxWidth="max-w-md">
                <div className="space-y-3">
                    {users.map(u => (
                        <button 
                            key={u.id} 
                            onClick={() => { onSwitchUser(u); setIsSwapModalOpen(false); }}
                            className={`w-full flex items-center gap-5 p-6 rounded-[2rem] border transition-all ${u.id === currentUser.id ? 'bg-primary/5 border-primary shadow-inner' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 hover:border-primary/40'}`}
                        >
                            <img src={u.avatarUrl} className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                            <div className="text-left flex-1 min-w-0">
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate text-sm">{u.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{u.role}</p>
                            </div>
                            {u.id === currentUser.id && <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">Authorized Node</span>}
                        </button>
                    ))}
                </div>
            </ModalShell>

            {withdrawalReceiptToShow && (
                <WithdrawalReceiptModal
                    isOpen={!!withdrawalReceiptToShow}
                    onClose={() => setWithdrawalReceiptToShow(null)}
                    withdrawal={withdrawalReceiptToShow}
                    user={currentUser}
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}

            {paymentReceiptToShow && (
                <PaymentReceiptModal
                    isOpen={!!paymentReceiptToShow}
                    onClose={() => setPaymentReceiptToShow(null)}
                    payment={paymentReceiptToShow}
                    user={currentUser}
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}
        </div>
    );
};

export default InvestorProfile;
