import React, { useMemo, useState, useEffect } from 'react';
import type { User, Sale, AttendanceRecord, PerformanceUser, ReceiptSettingsData, CustomPayment, Customer, Withdrawal, BusinessProfile, BusinessSettingsData, Expense } from '../types';
import { formatCurrency, formatAbbreviatedNumber, getStoredItem } from '../lib/utils';
import { FINALIZED_SALE_STATUSES } from '../constants';
import WithdrawalReceiptModal from './WithdrawalReceiptModal';
import PaymentReceiptModal from './PaymentReceiptModal';
import Card from './Card';

interface UserDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: PerformanceUser | null;
    sales: Sale[];
    expenses: Expense[];
    customers: Customer[];
    onClockInOut: (userId: string) => void;
    currentUser: User | null;
    receiptSettings: ReceiptSettingsData;
    businessProfile: BusinessProfile | null;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const MetricCard: React.FC<{ title: string; value: string; fullValue?: string; color?: string; subtext?: string }> = ({ title, value, fullValue, color = 'text-slate-900 dark:text-white', subtext }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col justify-center font-sans" title={String(fullValue || '')}>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">{String(title)}</p>
        <p className={`text-2xl font-bold ${color} tracking-tight tabular-nums`}>{String(value)}</p>
        {subtext && <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-widest">{String(subtext)}</p>}
    </div>
);

const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, onClose, user, sales, expenses, customers, onClockInOut, currentUser, receiptSettings, businessProfile }) => {
    const [activeTab, setActiveTab] = useState<'audit' | 'attendance' | 'transactions'>('audit');
    const [withdrawalReceiptToShow, setWithdrawalReceiptToShow] = useState<Withdrawal | null>(null);
    const [paymentReceiptToShow, setPaymentReceiptToShow] = useState<CustomPayment | null>(null);
    
    useEffect(() => {
        if (isOpen) setActiveTab('audit');
    }, [isOpen, user]);

    if (!isOpen || !user) return null;
    
    const cs = String(receiptSettings.currencySymbol || '$');
    const isHourly = user.type === 'hourly';
    const isInvestor = user.role === 'Investor' || user.role === 'Owner';
    
    const financialSummary = useMemo(() => {
        if (isInvestor) {
            const bizId = localStorage.getItem('fintab_active_business_id');
            const bizSettings = getStoredItem<any>(`fintab_${bizId}_settings`, { investorDistributionPercentage: 100 });
            const distRate = (bizSettings.investorDistributionPercentage || 100) / 100;

            const allInvestors = getStoredItem<User[]>(`fintab_${bizId}_users`, []).filter(u => (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
            const totalCapital = allInvestors.reduce((sum, inv) => sum + (inv.initialInvestment || 0), 0);
            const stake = user.initialInvestment || 0;
            const sharePercent = totalCapital > 0 ? (stake / totalCapital) : 0;

            const realizedSales = sales.filter(s => FINALIZED_SALE_STATUSES.includes(s.status));
            const lifetimeGrossProfit = realizedSales.reduce((total, sale) => {
                const cogs = sale.items.reduce((sum, item) => sum + ((item.product?.costPrice || 0) * item.quantity), 0);
                return total + (sale.subtotal - sale.discount - cogs);
            }, 0);
            
            const totalExpenses = (expenses || []).reduce((s, e) => s + e.amount, 0);
            const lifetimeNetProfit = Math.max(0, lifetimeGrossProfit - totalExpenses);

            const earned = lifetimeNetProfit * sharePercent * distRate;
            const withdrawn = (user.withdrawals || [])
                .filter(w => w.status === 'completed' && w.source === 'investment')
                .reduce((sum, w) => sum + w.amount, 0);

            return {
                earnedCommissions: 0,
                customTotal: 0,
                totalEarnings: earned,
                withdrawnTotal: withdrawn,
                availableBalance: Math.max(0, earned - withdrawn)
            };
        }

        const mySales = sales.filter(s => s.userId === user.id && s.status === 'completed');
        const earnedCommissions = mySales.reduce((sum, s) => sum + (Number(s.commission) || 0), 0);
        const customTotal = (user.customPayments || [])
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);
        const withdrawnTotal = (user.withdrawals || [])
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0);
            
        const totalEarnings = earnedCommissions + customTotal;
        return {
            earnedCommissions,
            withdrawnTotal,
            customTotal,
            totalEarnings,
            availableBalance: Math.max(0, totalEarnings - withdrawnTotal)
        };
    }, [user, sales, expenses, isInvestor]);

    const transactionHistory = useMemo(() => {
        const wds = (user.withdrawals || []).map(w => ({ ...w, txType: 'Withdrawal', displayType: w.source === 'investment' ? 'Dividend Payout' : 'Commission Payout' }));
        const pms = (user.customPayments || []).map(p => ({ ...p, date: p.dateInitiated, txType: 'Payment', displayType: 'Remittance' }));
        return [...wds, ...pms].sort((a, b) => new Date(b.date || (b as any).dateInitiated).getTime() - new Date(a.date || (a as any).dateInitiated).getTime());
    }, [user]);

    const recentSales = sales
        .filter(sale => sale.userId === user.id && sale.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);

    const roleName = user.role === 'Custom' && user.customRoleName ? String(user.customRoleName) : String(user.role);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in font-sans" role="dialog" aria-modal="true">
            <div className="bg-[#F8FAFC] dark:bg-gray-950 rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-white/10">
                {/* Modal Header */}
                <header className="p-8 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <img src={String(user.avatarUrl)} alt={String(user.name)} className="w-20 h-20 rounded-[2.5rem] object-cover shadow-xl border-4 border-slate-50 dark:border-gray-800" />
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900 ${String(user.status) === 'Active' ? 'bg-success' : 'bg-warning'}`}></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{String(user.name)}</h2>
                                <span className="px-4 py-1.5 bg-primary text-white text-[9px] font-bold rounded-full uppercase tracking-widest">{String(roleName)}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-3 uppercase tracking-widest">{String(user.email)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 rounded-3xl text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all">
                        <CloseIcon />
                    </button>
                </header>
                
                {/* Local Navigation */}
                <div className="px-8 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
                    <nav className="flex gap-10">
                        {['audit', 'attendance', 'transactions'].map((tab) => (
                            (tab !== 'attendance' || isHourly) && (
                                <button 
                                    key={String(tab)}
                                    onClick={() => setActiveTab(tab as any)} 
                                    className={`py-5 text-[10px] font-bold uppercase tracking-[0.25em] transition-all border-b-4 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    {String(tab === 'audit' ? 'Performance Audit' : tab === 'transactions' ? 'Financial Ledger' : tab)}
                                </button>
                            )
                        ))}
                    </nav>
                </div>

                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                    {activeTab === 'audit' && (
                        <div className="space-y-10">
                            {/* Performance Overview */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                                <MetricCard 
                                    title={isInvestor ? "Lifetime Earned" : "Lifetime Gross"} 
                                    value={`${cs}${formatAbbreviatedNumber(financialSummary.totalEarnings)}`} 
                                    color="text-emerald-600" 
                                    subtext={isInvestor ? `${(user.initialInvestment || 0).toLocaleString()} capital stake` : (isHourly ? `${Number(user.totalHours).toFixed(1)} hrs accrued` : `${Number(user.salesCount)} conversions`)} 
                                />
                                <MetricCard 
                                    title="Total Payouts" 
                                    value={`${cs}${formatAbbreviatedNumber(financialSummary.withdrawnTotal)}`} 
                                    color="text-rose-600" 
                                    subtext="Disbursed earnings"
                                />
                                <MetricCard 
                                    title="Terminal Balance" 
                                    value={`${cs}${formatAbbreviatedNumber(financialSummary.availableBalance)}`} 
                                    color="text-primary" 
                                    subtext="Funds awaiting liquidation"
                                />
                                <MetricCard 
                                    title={isInvestor ? "Equity Yield" : "Avg Unit Value"} 
                                    value={isInvestor ? `${financialSummary.totalEarnings > 0 ? ((financialSummary.totalEarnings / (user.initialInvestment || 1)) * 100).toFixed(1) : 0}%` : `${cs}${formatAbbreviatedNumber(user.salesCount > 0 ? Number(user.totalSalesValue) / Number(user.salesCount) : 0)}`} 
                                    subtext={isInvestor ? "Return on investment" : "Yield KPI"}
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Activity Log (Only for Staff) */}
                                {!isInvestor && (
                                    <section className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-2">Recent Sales Yield</h4>
                                        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-sm">
                                            {recentSales.length > 0 ? (
                                                <div className="divide-y dark:divide-gray-800">
                                                    {recentSales.map(sale => (
                                                        <div key={String(sale.id)} className="p-5 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{new Date(sale.date).toLocaleDateString()}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sale Ref: {String(sale.id).slice(-8).toUpperCase()}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-primary uppercase tabular-nums">{cs}{Number(sale.total).toFixed(2)}</p>
                                                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Comm: {cs}{Number(sale.commission || 0).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div className="p-20 text-center text-slate-300 uppercase tracking-widest font-bold text-[10px]">No sales recorded</div>}
                                        </div>
                                    </section>
                                )}

                                {/* Transaction Log Snippet */}
                                <section className={`${isInvestor ? 'col-span-2' : ''} space-y-4`}>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-2">Liquidation Records</h4>
                                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-sm">
                                        {transactionHistory.length > 0 ? (
                                            <div className="divide-y dark:divide-gray-800">
                                                {transactionHistory.map((item, idx) => (
                                                    <div key={String(item.id || idx)} className="p-5 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{new Date(item.date || (item as any).dateInitiated).toLocaleDateString()}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${String(item.status) === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                    {String(item.displayType || 'N/A')}: {String(item.status || 'N/A').replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className={`font-bold uppercase tabular-nums ${String(item.txType) === 'Withdrawal' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {String(item.txType) === 'Withdrawal' ? '-' : '+'}{cs}{Number(item.amount || 0).toFixed(2)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="p-20 text-center text-slate-300 uppercase tracking-widest font-bold text-[10px]">Empty Ledger</div>}
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="space-y-8">
                             <h3 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Full Financial Ledger</h3>
                             <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border dark:border-gray-800 overflow-hidden shadow-xl">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                        <tr>
                                            <th className="px-6 py-6">Transaction Type</th>
                                            <th className="px-6 py-6">Authorization Date</th>
                                            <th className="px-6 py-6 text-right">Unit Value</th>
                                            <th className="px-6 py-6 text-center">Protocol Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-800">
                                        {transactionHistory.map((item, idx) => (
                                            <tr key={String(item.id || idx)} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold ${String(item.txType) === 'Withdrawal' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {String(item.txType) === 'Withdrawal' ? 'W' : 'R'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{String(item.displayType || 'N/A')}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                                                {String((item as any).description || (item as any).notes || (item as any).note || 'Account Balance Liquidation')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8">
                                                    <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">{new Date(item.date || (item as any).dateInitiated).toLocaleDateString()}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{new Date(item.date || (item as any).dateInitiated).toLocaleTimeString()}</p>
                                                </td>
                                                <td className="px-6 py-8 text-right font-bold text-lg tabular-nums">
                                                    <span className={String(item.txType) === 'Withdrawal' ? 'text-rose-600' : 'text-emerald-600'}>
                                                        {String(item.txType) === 'Withdrawal' ? '-' : '+'}{cs}{Number(item.amount || 0).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-8 text-center">
                                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-gray-800 px-4 py-2 rounded-xl border border-transparent">
                                                        {String(item.status || 'N/A').replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {transactionHistory.length === 0 && (
                                    <div className="py-32 text-center">
                                        <p className="text-slate-300 font-bold uppercase tracking-[0.4em] text-[10px]">Digital Ledger Empty</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </main>
                
                <footer className="p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex justify-end flex-shrink-0">
                    <button onClick={onClose} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:opacity-90 active:scale-95 transition-all">
                        Exit Audit View
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default UserDetailModal;