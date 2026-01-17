
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Product, Customer, User, ReceiptSettingsData, Sale, Deposit, CustomPayment, OwnerSettings, BusinessSettingsData, Expense, AppPermissions, BusinessProfile, PerformanceUser, ExpenseRequest, AnomalyAlert, WorkflowRoleKey } from '../types';
import Card from './Card';
import { 
    CustomersIcon, InventoryIcon, StaffIcon, InvestorIcon, WarningIcon, 
    CloseIcon, AIIcon, LinkIcon, FINALIZED_SALE_STATUSES, StorefrontIcon, 
    ReportsIcon, ExpensesIcon, LightBulbIcon, CounterIcon, PlusIcon, 
    SearchIcon, CrownIcon, ShieldCheckIcon, TransactionIcon, UsersGroupIcon,
    PhoneIcon, CreditCardIcon, BankIcon, CalculatorIcon, TodayIcon
} from '../constants';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
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
                <div className="p-10 bg-rose-50 dark:bg-rose-950/20 border-2 border-dashed border-rose-100 dark:border-rose-900/30 rounded-[3.5rem] text-center font-sans">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Module Component Failure</p>
                    <p className="text-[9px] text-rose-400 font-bold mt-2 uppercase tracking-widest leading-relaxed">Safety protocol engaged: Analytics node suspended to prevent terminal instability.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string }> = ({ icon, label, value }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 flex items-center gap-6 group hover:shadow-xl transition-all">
        <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        </div>
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{value}</p>
        </div>
    </div>
);

const ActionCard: React.FC<{ icon: React.ReactNode; label: string; count: number; link: string }> = ({ icon, label, count, link }) => (
    <NavLink to={link} className="bg-slate-50/50 dark:bg-gray-800/40 p-8 rounded-[2rem] border border-slate-100 dark:border-gray-700 flex flex-col items-center text-center group hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-lg relative">
        <div className="p-3 bg-white dark:bg-gray-900 rounded-xl text-slate-400 group-hover:text-primary transition-colors shadow-sm mb-4">
            {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{count}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Pending</span>
        </div>
        {count > 0 && <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full animate-pulse"></div>}
    </NavLink>
);

const KPIMetric: React.FC<{ title: string; value: number | string; cs: string; colorClass?: string; caption?: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", caption }) => (
    <div 
        className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-2xl transition-all cursor-help"
        title={typeof value === 'number' ? formatCurrency(value, cs) : value}
    >
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">{title}</p>
            <p className={`text-4xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {typeof value === 'number' ? `${cs}${formatAbbreviatedNumber(value)}` : value}
            </p>
        </div>
        {caption && (
            <div className="mt-8">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{caption}</p>
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
    advanceWorkflow: (id: string, status: string, note?: string) => Promise<boolean>;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
    const { 
        products, customers, users, t, receiptSettings,
        sales, expenses, deposits, currentUser, permissions,
        businessSettings, businessProfile, ownerSettings, expenseRequests, anomalyAlerts, advanceWorkflow
    } = props;
    
    const cs = receiptSettings.currencySymbol;
    const navigate = useNavigate();

    // Identity Checks
    const isOwner = currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin';
    const isPrivileged = isOwner || currentUser?.role === 'Manager';

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

        const todayStr = new Date().toISOString().split('T')[0];
        const todaySales = finalizedSales.filter(s => s.date.startsWith(todayStr));
        const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

        // RESTORED: Performance Insights Data
        const productVelocity = safeProducts.map(p => {
            const soldCount = finalizedSales.reduce((acc, s) => {
                const item = s.items.find(i => i.product.id === p.id);
                return acc + (item ? item.quantity : 0);
            }, 0);
            return { ...p, soldCount, holdingCost: p.stock * (p.costPrice || 0) };
        });

        const topSelling = [...productVelocity]
            .sort((a, b) => b.soldCount - a.soldCount)
            .slice(0, 3);

        const riskUnits = [...productVelocity]
            .filter(p => p.soldCount === 0 || p.stock > 100)
            .sort((a, b) => b.holdingCost - a.holdingCost)
            .slice(0, 3);

        return { 
            totalRevenue, lifetimeGrossProfit, totalExpVal, netProfit, 
            todayRevenue,
            todaySalesCount: todaySales.length,
            inventoryUnits: safeProducts.reduce((sum, p) => sum + p.stock, 0),
            topSelling,
            riskUnits
        };
    }, [sales, products, expenses, users]);

    // Equity and Withdrawal calculations for the Pill
    const analytics = useMemo(() => {
        const participants = users.filter(u => (u.role === 'Owner' || u.role === 'Investor' || u.role === 'Super Admin') && u.status === 'Active');
        const totalCapital = participants.reduce((sum, u) => sum + (u.initialInvestment || 0), 0);
        const myInv = currentUser?.initialInvestment || 0;
        const myShareRaw = totalCapital > 0 ? (myInv / totalCapital) : 0;
        
        const distRate = (businessSettings.investorDistributionPercentage || 100) / 100;
        const earnedTotal = stats.netProfit * myShareRaw * distRate;
        const withdrawnTotal = (currentUser?.withdrawals || [])
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0);
        
        return {
            myShare: (myShareRaw * 100).toFixed(1),
            available: Math.max(0, earnedTotal - withdrawnTotal)
        };
    }, [users, currentUser, stats.netProfit, businessSettings]);

    const pendingCounts = useMemo(() => ({
        clientOrders: (sales || []).filter(s => s.status === 'client_order').length,
        payouts: (expenseRequests || []).filter(r => r.status === 'pending').length, 
        staffPayments: (users || []).flatMap(u => u.customPayments || []).filter(p => p.status === 'pending_owner_approval').length,
        bankVerif: (sales || []).filter(s => s.status === 'pending_bank_verification').length,
        expenseVerif: (anomalyAlerts || []).filter(a => !a.isDismissed).length,
        aiAssistant: hasAccess(currentUser, 'AI', 'view_assistant', permissions) ? 1 : 0
    }), [sales, expenseRequests, users, anomalyAlerts, currentUser, permissions]);

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* Executive Hero Block */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5 group">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px] group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="relative flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="flex items-center gap-10">
                        <div className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner">
                            {isPrivileged ? <CrownIcon className="w-12 h-12 text-primary" /> : <StaffIcon className="w-12 h-12 text-primary" />}
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{isPrivileged ? 'Command Center' : 'Operational Node'}</h2>
                            <div className="flex items-center gap-4 mt-6">
                                <span className="px-5 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">Principal: {currentUser?.name}</span>
                                {pendingCounts.aiAssistant > 0 && (
                                    <button 
                                        onClick={() => navigate('/chat-help')}
                                        className="px-5 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all flex items-center gap-2"
                                    >
                                        <AIIcon className="w-3.5 h-3.5" />
                                        Consult AI Node
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* RESTORED INVESTMENT PILL */}
                    <div className="bg-white dark:bg-gray-900 rounded-full border border-slate-100 dark:border-gray-800 p-2 flex items-center gap-1 shadow-sm">
                        <div className="px-8 py-4 border-r border-slate-100 dark:border-gray-800 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">My Investment</p>
                            <p className="text-2xl font-black text-primary tabular-nums">{analytics.myShare}%</p>
                        </div>
                        <div className="px-8 py-4 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due To Me</p>
                            <p className="text-2xl font-black text-emerald-500 tabular-nums">{cs}{formatAbbreviatedNumber(analytics.available)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* RESTORED CORE STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <StatCard icon={<UsersGroupIcon />} label="Total Clients" value={customers.length} />
                <StatCard icon={<StaffIcon />} label="Total Staff" value={users.length} />
                <StatCard icon={<ReportsIcon />} label="Today's Sales" value={stats.todaySalesCount} />
                <StatCard icon={<InventoryIcon />} label="Inventory Units" value={stats.inventoryUnits} />
            </div>

            {/* RESTORED: BUSINESS OVERVIEW SECTION */}
            <div className="space-y-6">
                <div className="flex items-center gap-5 px-4">
                    <div className="w-12 h-12 bg-slate-900 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <TodayIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Business Overview</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Platform Performance Hub</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* TOP SELLING UNITS */}
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-gray-800 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Top Selling Units</h4>
                        <div className="bg-slate-50/50 dark:bg-gray-800/40 rounded-[2.5rem] border border-slate-50 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 dark:bg-gray-800/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-8 py-5">Unit Name</th>
                                        <th className="px-8 py-5 text-center text-primary">Sales</th>
                                        <th className="px-8 py-5 text-right">In Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {stats.topSelling.length > 0 ? stats.topSelling.map((p, i) => (
                                        <tr key={i} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                            <td className="px-8 py-6 text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[200px]">{p.name}</td>
                                            <td className="px-8 py-6 text-center font-black text-primary text-sm tabular-nums">{p.soldCount}</td>
                                            <td className="px-8 py-6 text-right font-bold text-slate-400 text-[10px] uppercase tracking-widest">{p.stock} Units</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="px-8 py-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]">Zero Activity Registered</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* LOW SELLING / RISK UNITS */}
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-gray-800 overflow-hidden relative">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Low Selling / Risk Units</h4>
                        <div className="bg-slate-50/50 dark:bg-gray-800/40 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 dark:bg-gray-800/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-8 py-5">Unit Name</th>
                                        <th className="px-8 py-5 text-center text-rose-500">Sales</th>
                                        <th className="px-8 py-5 text-right">Holding Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {stats.riskUnits.length > 0 ? stats.riskUnits.map((p, i) => (
                                        <tr key={i} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                            <td className="px-8 py-6 text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[200px]">{p.name}</td>
                                            <td className="px-8 py-6 text-center font-black text-rose-500 text-sm tabular-nums">{p.soldCount}</td>
                                            <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white text-sm tabular-nums">{cs}{formatAbbreviatedNumber(p.holdingCost)}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="px-8 py-20 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]">Grid Clean</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* RESTORED MANAGEMENT ACTION CENTER */}
            {isPrivileged && (
                <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 shadow-sm border border-slate-100 dark:border-gray-800">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Management Action Center</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        <ActionCard icon={<PhoneIcon />} label="Client Orders" count={pendingCounts.clientOrders} link="/transactions" />
                        <ActionCard icon={<CreditCardIcon />} label="Pending Payouts" count={pendingCounts.payouts} link="/expense-requests" />
                        <ActionCard icon={<UsersGroupIcon />} label="Staff Payments" count={pendingCounts.staffPayments} link="/profile" />
                        <ActionCard icon={<BankIcon />} label="Bank Verification" count={pendingCounts.bankVerif} link="/receipts" />
                        <ActionCard icon={<AIIcon />} label="AI Intelligence" count={pendingCounts.aiAssistant} link="/chat-help" />
                    </div>
                </div>
            )}

            {/* Authorization & Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden h-full flex flex-col">
                         <header className="px-10 py-10 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/30 dark:bg-gray-800/30">
                            <div className="flex items-center gap-6">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_12px_rgba(37,99,235,0.5)]"></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Authorization Pipeline</h3>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Events</span>
                        </header>
                        <div className="p-4 md:p-8 flex-1 bg-white dark:bg-gray-900">
                            <RequestsDashboard 
                                users={users} sales={sales} deposits={deposits} expenseRequests={expenseRequests}
                                receiptSettings={receiptSettings} advanceWorkflow={advanceWorkflow}
                                customers={customers} t={t} currentUser={currentUser} permissions={permissions}
                            />
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <WidgetErrorBoundary>
                        <AlertsWidget 
                            alerts={anomalyAlerts || []} 
                            onDismiss={() => {}} 
                            onMarkRead={() => {}}
                            receiptSettings={receiptSettings} 
                            currentUser={currentUser}
                            businessSettings={businessSettings}
                        />
                    </WidgetErrorBoundary>
                </div>
            </div>

            {/* Interactive Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <button onClick={() => navigate('/counter')} className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.03] transition-all overflow-hidden text-left">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform"></div>
                    <div className="p-6 bg-primary/10 rounded-3xl text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-inner"><PlusIcon className="w-8 h-8" /></div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Issue Sale</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Initialize Terminal Checkout</p>
                    </div>
                </button>
                {isPrivileged && (
                    <button onClick={() => navigate('/inventory')} className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.03] transition-all overflow-hidden text-left">
                        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-inner"><InventoryIcon className="w-8 h-8" /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Audit Inventory</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Verified Asset Control</p>
                        </div>
                    </button>
                )}
                {isOwner && (
                    <button onClick={() => navigate('/settings')} className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.03] transition-all overflow-hidden text-left">
                        <div className="p-6 bg-amber-50 dark:bg-amber-950/30 rounded-3xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-inner"><ReportsIcon className="w-8 h-8" /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Manage Node</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Global System Tuning</p>
                        </div>
                    </button>
                )}
            </div>
            
            {/* System Health Footer */}
            <div className="flex justify-center pt-8 opacity-40">
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-6 py-2 rounded-full border border-slate-100 dark:border-gray-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Node Hub: Synchronized & Authorized • v1.4.6</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
