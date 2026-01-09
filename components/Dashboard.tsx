
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Product, Customer, User, ReceiptSettingsData, Sale, Deposit, CustomPayment, OwnerSettings, BusinessSettingsData, Expense, AppPermissions, BusinessProfile, PerformanceUser, ExpenseRequest, AnomalyAlert, WorkflowRoleKey } from '../types';
import Card from './Card';
import { CustomersIcon, InventoryIcon, StaffIcon, InvestorIcon, WarningIcon, CloseIcon, AIIcon, LinkIcon, FINALIZED_SALE_STATUSES, StorefrontIcon, ReportsIcon, ExpensesIcon, LightBulbIcon, CounterIcon, PlusIcon, SearchIcon } from '../constants';
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
    const [auditUser, setAuditUser] = useState<PerformanceUser | null>(null);
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

    const staffLeaderboard = useMemo(() => {
        if (isSafeMode) return [];
        return (users || [])
            .filter(u => u && u.role !== 'Investor' && (u.role !== 'Owner' || (ownerSettings && ownerSettings.showOnLeaderboard)))
            .map(member => {
                const memberSales = (sales || []).filter(s => s && s.userId === member.id && FINALIZED_SALE_STATUSES.includes(s.status));
                return { ...member, salesCount: memberSales.length, totalSalesValue: memberSales.reduce((sum, s) => sum + s.total, 0) };
            })
            .sort((a, b) => b.totalSalesValue - a.totalSalesValue).slice(0, 5);
    }, [users, sales, ownerSettings, isSafeMode]);

    // Investor-specific calculations
    const investorEquity = useMemo(() => {
        if (!isInvestor || !currentUser) return null;
        
        const activeInvestors = (users || []).filter(u => u && (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = activeInvestors.reduce((sum, inv) => sum + (inv.initialInvestment || 0), 0);
        const myInvestment = currentUser.initialInvestment || 0;
        const myShare = totalCapital > 0 ? (myInvestment / totalCapital) : 0;
        
        const distRate = (businessSettings?.investorDistributionPercentage || 100) / 100;
        const totalProfitShare = stats.netProfit * myShare * distRate;
        
        const withdrawn = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed' && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);
        const reserved = (currentUser.withdrawals || [])
            .filter(w => ['pending', 'approved_by_owner'].includes(w.status) && w.source === 'investment')
            .reduce((sum, w) => sum + w.amount, 0);
            
        return {
            investment: myInvestment,
            share: (myShare * 100).toFixed(2),
            earned: totalProfitShare,
            withdrawn,
            available: Math.max(0, totalProfitShare - withdrawn - reserved)
        };
    }, [isInvestor, users, stats.netProfit, currentUser?.initialInvestment, currentUser?.withdrawals, businessSettings?.investorDistributionPercentage]);

    const assignedTasks = useMemo(() => {
        const tasks = [];
        const workflow = businessSettings?.workflowRoles || {};
        Object.entries(workflow).forEach(([roleKey, assignments]) => {
            if (Array.isArray(assignments) && assignments.some(a => a.userId === currentUser?.id)) {
                tasks.push(roleKey as WorkflowRoleKey);
            }
        });
        return tasks;
    }, [businessSettings?.workflowRoles, currentUser?.id]);

    const todaysSalesSummary = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todays = (sales || []).filter(s => s && s.date && s.date.startsWith(todayStr) && FINALIZED_SALE_STATUSES.includes(s.status));
        return { count: todays.length, revenue: todays.reduce((s, x) => s + x.total, 0) };
    }, [sales]);

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* Header / Identity Hub */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                            <AIIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{t('authNode')}: {currentUser?.name?.split(' ')[0]}</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">{currentUser?.role} {t('nodeOperational')}</p>
                        </div>
                    </div>
                    {(isOwner || isInvestor) && (
                        <div className="bg-white/5 backdrop-blur-md p-2 rounded-[2.5rem] border border-white/10 flex">
                            <div className="px-8 py-5 text-center border-r border-white/5" title={formatCurrency(currentUser?.initialInvestment || 0, cs)}>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('capitalStake')}</p>
                                <p className="text-2xl font-black text-primary tabular-nums tracking-tight">
                                    {isOwner ? ownerEquity?.share : investorEquity?.share}%
                                </p>
                            </div>
                            <div className="px-8 py-5 text-center" title={formatCurrency(isOwner ? ownerEquity?.available : investorEquity?.available, cs)}>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('availableYield')}</p>
                                <p className="text-2xl font-black text-emerald-500 tabular-nums tracking-tight">
                                    {cs}{formatAbbreviatedNumber(isOwner ? ownerEquity?.available : investorEquity?.available)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Privileged Logic Grid (Treasury & Health) */}
            {isPrivileged && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPIMetric title={t('platformRevenue')} value={stats.totalRevenue} cs={cs} caption="Verified Realized Inflow" />
                    <KPIMetric title={t('grossProfit')} value={stats.lifetimeGrossProfit} cs={cs} colorClass="text-emerald-600" caption="Yield After COGS Deductions" />
                    <KPIMetric title={t('debitExposure')} value={stats.totalExpVal} cs={cs} colorClass="text-rose-600" caption={`${expenses?.length || 0} Authorized Entries`} />
                    <div 
                        className="bg-primary text-white p-8 rounded-[3rem] shadow-2xl shadow-primary/30 flex flex-col justify-between cursor-help group transition-all hover:-translate-y-1"
                        title={formatCurrency(stats.netProfit, cs)}
                    >
                        <div>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-4">{t('netTreasury')}</p>
                            <p className="text-4xl font-black tabular-nums tracking-tighter">{cs}{formatAbbreviatedNumber(stats.netProfit)}</p>
                        </div>
                        <NavLink to="/reports" className="text-[9px] font-black text-white uppercase tracking-[0.3em] hover:underline mt-8 opacity-60 group-hover:opacity-100 transition-opacity">{t('reports')} →</NavLink>
                    </div>
                </div>
            )}

            {/* Staff-Specific Action Hub */}
            {isStaff && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-fade-in">
                    <div className="lg:col-span-3">
                        <NavLink to="/counter" className="relative h-full min-h-[280px] p-12 bg-slate-900 text-white rounded-[3.5rem] shadow-2xl flex flex-col justify-center group hover:scale-[1.01] transition-all border border-white/5 overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="bg-primary p-6 rounded-[2rem] shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                        <PlusIcon className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-5xl font-black uppercase tracking-tighter leading-none">{t('newSale')}</h3>
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] ml-1">{t('launchTerminal')}</p>
                            </div>
                            <div className="absolute bottom-12 right-12 opacity-10 group-hover:opacity-100 transition-opacity">
                                <CounterIcon className="w-24 h-24 text-white" />
                            </div>
                        </NavLink>
                    </div>
                </div>
            )}

            {/* Action Center (Approvals & Tasks) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden h-full">
                         <header className="px-10 py-8 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/30 dark:bg-gray-800/30">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">{t('verificationHub')}</h3>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('activeOps')}</span>
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
                    {(isPrivileged || isInvestor) && (
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
                    )}
                </div>
            </div>

            {/* Global Operational Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col md:flex-row items-center md:items-center group hover:shadow-xl transition-all text-center md:text-left gap-6">
                    <div className="p-5 bg-slate-50 dark:bg-gray-800 text-primary rounded-3xl transition-colors group-hover:bg-primary group-hover:text-white"><CustomersIcon className="w-7 h-7" /></div>
                    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('identityLedger')}</p><p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums mt-1 leading-none">{customers?.length || 0}</p></div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col md:flex-row items-center md:items-center group hover:shadow-xl transition-all text-center md:text-left gap-6">
                    <div className="p-5 bg-slate-50 dark:bg-gray-800 text-primary rounded-3xl transition-colors group-hover:bg-primary group-hover:text-white"><StaffIcon className="w-7 h-7" /></div>
                    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('personnelUnits')}</p><p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums mt-1 leading-none">{users?.length || 0}</p></div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col md:flex-row items-center md:items-center group hover:shadow-xl transition-all text-center md:text-left gap-6" title={formatCurrency(todaysSalesSummary.revenue, cs)}>
                    <div className="p-5 bg-slate-50 dark:bg-gray-800 text-emerald-500 rounded-3xl transition-colors group-hover:bg-emerald-500 group-hover:text-white"><ReportsIcon className="w-7 h-7" /></div>
                    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('dailySyncs')}</p><p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums mt-1 leading-none">{todaysSalesSummary.count}</p></div>
                </div>
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col md:flex-row items-center md:items-center group hover:shadow-xl transition-all text-center md:text-left gap-6">
                    <div className="p-5 bg-slate-50 dark:bg-gray-800 text-amber-500 rounded-3xl transition-colors group-hover:bg-amber-500 group-hover:text-white"><InventoryIcon className="w-7 h-7" /></div>
                    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('globalQuantum')}</p><p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums mt-1 leading-none">{products?.reduce((s, p) => s + (p?.stock || 0), 0) || 0}</p></div>
                </div>
            </div>

            {/* Business Intelligence Hub (Owners/Admins) */}
            {isPrivileged && (
                <div className="space-y-12 pt-16 border-t-2 border-slate-50 dark:border-gray-800 animate-fade-in">
                    <div className="flex items-center gap-6 px-4">
                        <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-xl"><ReportsIcon className="w-10 h-10" /></div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('corpIntel')}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">{t('analyticalMatrix')}</p>
                        </div>
                    </div>

                    <WidgetErrorBoundary>
                        <AISuggestions stats={stats} t={t} />
                    </WidgetErrorBoundary>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
