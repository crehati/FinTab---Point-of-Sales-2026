
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Product, Customer, User, ReceiptSettingsData, Sale, Deposit, CustomPayment, OwnerSettings, BusinessSettingsData, Expense, AppPermissions, BusinessProfile, PerformanceUser, ExpenseRequest, AnomalyAlert, WorkflowRoleKey } from '../types';
import Card from './Card';
import { 
    CustomersIcon, InventoryIcon, StaffIcon, InvestorIcon, WarningIcon, 
    CloseIcon, AIIcon, LinkIcon, FINALIZED_SALE_STATUSES, StorefrontIcon, 
    ReportsIcon, ExpensesIcon, LightBulbIcon, CounterIcon, PlusIcon, 
    SearchIcon, CrownIcon, ShieldCheckIcon, TransactionIcon 
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

    if (isLoading) return <div className="animate-pulse h-48 bg-slate-50 dark:bg-gray-800/50 rounded-[3.5rem]"></div>;

    return (
        <div className="space-y-8 animate-fade-in font-sans">
            <div className="flex items-center gap-4 px-6">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Actionable Intelligence Feed</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {suggestions.map((item, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col justify-between hover:border-primary/40 hover:shadow-2xl transition-all group">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="p-4 bg-slate-50 dark:bg-gray-800 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                                    {React.cloneElement(item.icon as React.ReactElement, { className: 'w-6 h-6' })}
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-gray-800 px-4 py-1.5 rounded-full border dark:border-gray-700">{item.type}</span>
                            </div>
                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 leading-relaxed uppercase tracking-tight">{item.text}</p>
                        </div>
                        <div className="mt-8 pt-8 border-t border-slate-50 dark:border-gray-800 flex justify-end">
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

        const staffPerformance = (users || []).map(u => {
            const uSales = finalizedSales.filter(s => s.userId === u.id);
            return {
                id: u.id,
                name: u.name,
                avatar: u.avatarUrl,
                count: uSales.length,
                value: uSales.reduce((s, x) => s + x.total, 0)
            };
        }).sort((a, b) => b.value - a.value).slice(0, 5);

        return { 
            totalRevenue, lifetimeGrossProfit, totalExpVal, netProfit, 
            todayRevenue, staffPerformance,
            missingCostCount: safeProducts.filter(p => !p.costPrice || p.costPrice === 0).length,
            leastSellers: safeProducts.slice(0, 5) // Mock for AI logic
        };
    }, [sales, products, expenses, users]);

    // Daily Goal Calculation
    const goalPercentage = Math.min(100, (stats.todayRevenue / 5000) * 100); // 5000 is a mock target

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
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grid Status: Healthy</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Goal Tracker Widget */}
                    <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 flex items-center gap-8 shadow-2xl">
                        <div className="relative w-20 h-20">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (226 * goalPercentage) / 100} className="text-emerald-500 transition-all duration-1000" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-black text-sm tabular-nums">
                                {Math.round(goalPercentage)}%
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Protocol</p>
                            <p className="text-2xl font-black tabular-nums">{cs}{formatAbbreviatedNumber(stats.todayRevenue)}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Target Delta: -{cs}2,450</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <KPIMetric title="Gross Revenue" value={stats.totalRevenue} cs={cs} caption="Verified Ledger Inflow" />
                <KPIMetric title="Net Yield" value={stats.netProfit} cs={cs} colorClass="text-emerald-600" caption="Yield Post-Expenditure" />
                <KPIMetric title="Debit exposure" value={stats.totalExpVal} cs={cs} colorClass="text-rose-600" caption="Authorized Ledger Outflow" />
                <div className="bg-primary text-white p-10 rounded-[3rem] shadow-2xl shadow-primary/30 flex flex-col justify-between group hover:-translate-y-2 transition-all">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-6">Quantum Velocity</p>
                        <p className="text-4xl font-black tabular-nums tracking-tighter leading-none">{sales.length}</p>
                    </div>
                    <NavLink to="/reports" className="text-[9px] font-black text-white uppercase tracking-[0.4em] hover:underline mt-10 flex items-center gap-2 group-hover:gap-4 transition-all">
                        Full Matrix Intelligence <TransactionIcon className="w-3 h-3" />
                    </NavLink>
                </div>
            </div>

            {/* Governance & Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden h-full flex flex-col">
                         <header className="px-10 py-10 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/30 dark:bg-gray-800/30">
                            <div className="flex items-center gap-6">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_12px_rgba(37,99,235,0.5)]"></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Authorization Pipeline</h3>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actionable Events</span>
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
                <div className="lg:col-span-1 space-y-10">
                    <WidgetErrorBoundary>
                        <AlertsWidget 
                            alerts={anomalyAlerts || []} 
                            onDismiss={() => {}} // Integration logic usually in App.tsx
                            onMarkRead={() => {}}
                            receiptSettings={receiptSettings} 
                            currentUser={currentUser}
                            businessSettings={businessSettings}
                        />
                    </WidgetErrorBoundary>
                    
                    {/* Performance Leaderboard Mini-Widget */}
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 flex justify-between items-center">
                            Personnel Yield
                            <span className="text-emerald-500">Active</span>
                        </h4>
                        <div className="space-y-6">
                            {stats.staffPerformance.map((u, i) => (
                                <div key={u.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img src={u.avatar} className="w-10 h-10 rounded-xl object-cover border-2 border-white/10 group-hover:scale-110 transition-transform" />
                                            {i === 0 && <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 p-1 rounded-md"><CrownIcon className="w-2 h-2" /></div>}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-tight truncate w-24">{u.name}</p>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{u.count} sales</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-black tabular-nums">{cs}{formatAbbreviatedNumber(u.value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
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

            {/* AI Intelligence Block */}
            {isPrivileged && (
                <div className="pt-20 border-t-2 border-slate-100 dark:border-gray-800">
                    <WidgetErrorBoundary>
                        <AISuggestions stats={stats} t={t} />
                    </WidgetErrorBoundary>
                </div>
            )}
            
            {/* System Health Footer */}
            <div className="flex justify-center pt-8 opacity-40">
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-6 py-2 rounded-full border border-slate-100 dark:border-gray-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Node Hub: Synchronized & Authorized • v1.4.5</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
