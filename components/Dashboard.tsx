
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Product, Customer, User, ReceiptSettingsData, Sale, Deposit, CustomPayment, OwnerSettings, BusinessSettingsData, Expense, AppPermissions, BusinessProfile, PerformanceUser, ExpenseRequest, AnomalyAlert, WorkflowRoleKey } from '../types';
import Card from './Card';
import { CustomersIcon, InventoryIcon, StaffIcon, InvestorIcon, WarningIcon, CloseIcon, AIIcon, LinkIcon, FINALIZED_SALE_STATUSES, StorefrontIcon, ReportsIcon, ExpensesIcon, LightBulbIcon, CounterIcon, PlusIcon, SearchIcon, CrownIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber, getStoredItem } from '../lib/utils';
import RequestsDashboard from './RequestsDashboard';
import UserDetailModal from './UserDetailModal';
import { hasAccess } from '../lib/permissions';
import AlertsWidget from './AlertsWidget';

class WidgetErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 bg-rose-50 dark:bg-rose-950/20 border-2 border-dashed border-rose-100 dark:border-rose-900/30 rounded-[3rem] text-center font-sans">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Module Component Failure</p>
                    <p className="text-[9px] text-rose-400 font-bold mt-2 uppercase tracking-widest leading-relaxed">Safety protocol engaged: Analytics node suspended to prevent terminal instability.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const AISuggestions: React.FC<{ stats: any; t: any }> = ({ stats, t }) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1400);
        return () => clearTimeout(timer);
    }, []);

    const suggestions = useMemo(() => {
        if (!stats) return [];
        const items = [];
        const now = new Date();

        if (stats.missingCostCount > 0) {
            items.push({
                icon: <InventoryIcon />,
                text: `${stats.missingCostCount} products are missing cost price; add costs to improve profit accuracy.`,
                link: '/inventory',
                type: 'Accounting'
            });
        }

        const highlyStagnant = stats.leastSellers?.filter(p => {
            if (!p.lastSold) return true;
            const daysSince = Math.floor((now.getTime() - new Date(p.lastSold).getTime()) / (1000 * 60 * 60 * 24));
            return daysSince > 30;
        }) || [];
        
        if (highlyStagnant.length > 0) {
            const sample = highlyStagnant[0];
            const days = sample.lastSold ? Math.floor((now.getTime() - new Date(sample.lastSold).getTime()) / (1000 * 60 * 60 * 24)) : 'many';
            items.push({
                icon: <StorefrontIcon />,
                text: `These least-selling items haven’t sold in ${days} days; consider discounting or bundling to free up capital.`,
                link: '/inventory',
                type: 'Strategy'
            });
        }

        return items.slice(0, 3); 
    }, [stats]);

    if (isLoading) return <div className="animate-pulse h-48 bg-slate-50 dark:bg-gray-800/50 rounded-[3rem]"></div>;

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            <div className="flex items-center gap-4 px-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Actionable Intelligence Feed</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {suggestions.map((item, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 shadow-sm flex flex-col justify-between hover:border-primary/40 hover:shadow-xl transition-all group">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-slate-50 dark:bg-gray-800 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                                    {React.cloneElement(item.icon as React.ReactElement, { className: 'w-5 h-5' })}
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-gray-800 px-3 py-1 rounded-full border dark:border-gray-700">{item.type}</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 leading-relaxed uppercase tracking-tight">{item.text}</p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-gray-800 flex justify-end">
                            <NavLink to={item.link} className="text-[9px] font-black text-primary uppercase tracking-[0.3em] hover:underline">Execute Protocol →</NavLink>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const KPIMetric: React.FC<{ title: string; value: number | string; cs: string; colorClass?: string; caption?: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", caption }) => (
    <div 
        className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-xl transition-all cursor-help"
        title={typeof value === 'number' ? formatCurrency(value, cs) : value}
    >
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {typeof value === 'number' ? `${cs}${formatAbbreviatedNumber(value)}` : value}
            </p>
        </div>
        {caption && (
            <div className="mt-6">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{caption}</p>
            </div>
        )}
    </div>
);

interface DashboardProps {
    products: Product[];
    customers: Customer[];
    users: User[];
    sales: Sale[];
    expenses: Expense[];
    deposits: Deposit[];
    expenseRequests: ExpenseRequest[];
    anomalyAlerts: AnomalyAlert[];
    currentUser: User;
    businessProfile: BusinessProfile | null;
    businessSettings: BusinessSettingsData;
    ownerSettings: OwnerSettings;
    receiptSettings: ReceiptSettingsData;
    permissions: AppPermissions;
    t: (key: string) => string;
    lowStockThreshold: number;
    isSafeMode: boolean;
    onApproveClientOrder: (saleId: string) => void;
    onRejectClientOrder: (saleId: string) => void;
    onUpdateWithdrawalStatus: (userId: string, withdrawalId: string, status: Withdrawal['status'], note?: string) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status'], note?: string) => void;
    onUpdateExpenseRequestStatus: (requestId: string, status: 'approved' | 'rejected', reason?: string) => void;
    onUpdateDepositStatus: (depositId: string, status: 'approved' | 'rejected') => void;
    onApproveBankSale: (saleId: string) => void;
    onRejectBankSale: (saleId: string, reason: string) => void;
    onDismissAnomaly: (id: string, reason?: string) => void;
    onMarkAnomalyRead: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
    const { 
        products, customers, users, t, receiptSettings, lowStockThreshold,
        sales, expenses, deposits, currentUser, permissions, onUpdateWithdrawalStatus,
        onApproveClientOrder, onRejectClientOrder, handleUpdateCustomPaymentStatus, 
        onUpdateExpenseRequestStatus, onUpdateDepositStatus, onApproveBankSale, onRejectBankSale, 
        onDismissAnomaly, onMarkAnomalyRead, businessSettings, businessProfile, ownerSettings, expenseRequests, isSafeMode, anomalyAlerts
    } = props;
    
    const cs = receiptSettings.currencySymbol;
    const navigate = useNavigate();

    // Identity Checks
    const isOwner = currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin';
    const isPrivileged = isOwner || currentUser?.role === 'Manager';
    const isStaff = currentUser?.role === 'Staff' || currentUser?.role === 'Cashier';
    const isInvestor = currentUser?.role === 'Investor';

    // Global Stats
    const stats = useMemo(() => {
        const safeSales = sales || [];
        const safeProducts = products || [];
        const safeExpenses = expenses || [];

        const finalizedSales = safeSales.filter(s => s && s.status && FINALIZED_SALE_STATUSES.includes(s.status));
        const totalRevenue = finalizedSales.reduce((sum, s) => sum + (s.total || 0), 0);
        
        const lifetimeGrossProfit = finalizedSales.reduce((total, sale) => {
            const cogs = (sale.items || []).reduce((sum, item) => {
                const prod = safeProducts.find(p => p.id === item.product.id);
                return sum + ((prod?.costPrice || 0) * item.quantity);
            }, 0);
            return total + (sale.subtotal - sale.discount - cogs);
        }, 0);

        const activeExpenses = safeExpenses.filter(e => e.status !== 'deleted');
        const totalExpVal = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = Math.max(0, lifetimeGrossProfit - totalExpVal);

        const stockCost = safeProducts.reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
        const stockValue = safeProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);

        const productStats = safeProducts.map(p => {
            const sold = finalizedSales.reduce((sum, s) => {
                const item = (s.items || []).find(i => i.product.id === p.id);
                return sum + (item ? item.quantity : 0);
            }, 0);
            return { ...p, unitsSold: sold };
        });

        const bestSellers = [...productStats].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10);
        const leastSellers = [...productStats].sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 10);

        return { 
            totalRevenue, lifetimeGrossProfit, totalExpVal, netProfit, 
            stockCost, stockValue, bestSellers, leastSellers,
            missingCostCount: safeProducts.filter(p => !p.costPrice || p.costPrice === 0).length
        };
    }, [sales, products, expenses]);

    // Owner Equity Logic
    const ownerEquity = useMemo(() => {
        if (!isOwner || !currentUser) return null;
        const participants = (users || []).filter(u => u && (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = participants.reduce((sum, p) => sum + (p.initialInvestment || 0), 0);
        const myInvestment = currentUser.initialInvestment || 0;
        const share = totalCapital > 0 ? (myInvestment / totalCapital) : 0;
        
        const distRate = (businessSettings?.investorDistributionPercentage || 100) / 100;
        const earned = stats.netProfit * share * distRate;
        
        const withdrawn = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed' && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);
            
        return { share: (share * 100).toFixed(1), earned, withdrawn, available: Math.max(0, earned - withdrawn) };
    }, [isOwner, users, currentUser, stats.netProfit, businessSettings?.investorDistributionPercentage]);

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* Command Center (Owner/Admin View) */}
            {isPrivileged ? (
                <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5 animate-fade-in">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                    <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="flex items-center gap-10">
                            <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                                <CrownIcon className="w-10 h-10 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Command Center</h2>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Principal Identity: {currentUser?.name?.split(' ')[0]}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-2 rounded-[2.5rem] border border-white/10 flex">
                            <div className="px-8 py-5 text-center border-r border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Equity Share</p>
                                <p className="text-2xl font-black text-primary tabular-nums tracking-tight">{ownerEquity?.share || '0.0'}%</p>
                            </div>
                            <div className="px-8 py-5 text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Available Yield</p>
                                <p className="text-2xl font-black text-emerald-500 tabular-nums tracking-tight">{cs}{formatAbbreviatedNumber(ownerEquity?.available || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5 animate-fade-in">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                    <div className="relative flex items-center gap-10">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                            <StaffIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Operational Node</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Auth Identity: {currentUser?.name}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Grid (Only for Privileged) */}
            {isPrivileged && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPIMetric title="Platform Revenue" value={stats.totalRevenue} cs={cs} caption="Verified Realized Inflow" />
                    <KPIMetric title="Gross Profit" value={stats.lifetimeGrossProfit} cs={cs} colorClass="text-emerald-600" caption="Yield After COGS Deductions" />
                    <KPIMetric title="Debit Exposure" value={stats.totalExpVal} cs={cs} colorClass="text-rose-600" caption={`${expenses?.length || 0} Authorized Entries`} />
                    <div className="bg-primary text-white p-8 rounded-[3rem] shadow-2xl shadow-primary/30 flex flex-col justify-between group transition-all hover:-translate-y-1">
                        <div>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">Net Treasury</p>
                            <p className="text-4xl font-black tabular-nums tracking-tighter">{cs}{formatAbbreviatedNumber(stats.netProfit)}</p>
                        </div>
                        <NavLink to="/reports" className="text-[9px] font-black text-white uppercase tracking-[0.3em] hover:underline mt-8 opacity-60 group-hover:opacity-100 transition-opacity">Full Intelligence Matrix →</NavLink>
                    </div>
                </div>
            )}

            {/* Operational Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden h-full">
                         <header className="px-10 py-8 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/30 dark:bg-gray-800/30">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Authorizations & Requests</h3>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Ops</span>
                        </header>
                        <div className="p-4 md:p-8">
                            <RequestsDashboard 
                                users={users || []} sales={sales || []} deposits={deposits || []} expenseRequests={expenseRequests || []}
                                receiptSettings={receiptSettings} onUpdateWithdrawalStatus={onUpdateWithdrawalStatus}
                                onUpdateDepositStatus={onUpdateDepositStatus}
                                onApproveBankSale={onApproveBankSale} onRejectBankSale={onRejectBankSale}
                                onUpdateExpenseRequestStatus={onUpdateExpenseRequestStatus}
                                handleUpdateCustomPaymentStatus={handleUpdateCustomPaymentStatus}
                                onApproveClientOrder={onApproveClientOrder} onRejectClientOrder={onRejectClientOrder}
                                customers={customers || []} t={t} currentUser={currentUser} permissions={permissions}
                            />
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-10">
                    <WidgetErrorBoundary>
                        <AlertsWidget 
                            alerts={anomalyAlerts || []} 
                            onDismiss={onDismissAnomaly} 
                            onMarkRead={onMarkAnomalyRead}
                            receiptSettings={receiptSettings} 
                            currentUser={currentUser}
                            businessSettings={businessSettings}
                        />
                    </WidgetErrorBoundary>
                </div>
            </div>

            {/* Primary Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <NavLink to="/counter" className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.02] transition-all overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform"></div>
                    <div className="p-5 bg-primary/10 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-inner"><PlusIcon className="w-8 h-8" /></div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Issue Sale</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Terminal Checkout</p>
                    </div>
                </NavLink>
                {isPrivileged && (
                    <NavLink to="/inventory" className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.02] transition-all overflow-hidden">
                        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-inner"><InventoryIcon className="w-8 h-8" /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Manage Ledger</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Asset Control</p>
                        </div>
                    </NavLink>
                )}
                {isOwner && (
                    <NavLink to="/settings" className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.02] transition-all overflow-hidden">
                        <div className="p-5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-inner"><ReportsIcon className="w-8 h-8" /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Configure Node</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Settings</p>
                        </div>
                    </NavLink>
                )}
            </div>

            {/* AI Intelligence Block */}
            {isPrivileged && (
                <div className="pt-16 border-t-2 border-slate-50 dark:border-gray-800">
                    <WidgetErrorBoundary>
                        <AISuggestions stats={stats} t={t} />
                    </WidgetErrorBoundary>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
