// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Product, Customer, User, ReceiptSettingsData, Sale, Deposit, CustomPayment, OwnerSettings, BusinessSettingsData, Expense, AppPermissions, BusinessProfile, PerformanceUser, ExpenseRequest, AnomalyAlert, WorkflowRoleKey } from '../types';
import Card from './Card';
import { 
    CustomersIcon, InventoryIcon, StaffIcon, InvestorIcon, WarningIcon, 
    CloseIcon, LinkIcon, FINALIZED_SALE_STATUSES, StorefrontIcon, 
    ReportsIcon, ExpensesIcon, LightBulbIcon, CounterIcon, PlusIcon, 
    SearchIcon, CrownIcon, ShieldCheckIcon, TransactionIcon, UsersGroupIcon,
    PhoneIcon, CreditCardIcon, BankIcon, CalculatorIcon, TodayIcon
} from '../constants';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import RequestsDashboard from './RequestsDashboard';
import UserDetailModal from './UserDetailModal';
import { hasAccess } from '../lib/permissions';
import AlertsWidget from './AlertsWidget';

const SummaryMetricCard: React.FC<{ label: string; value: string | number; colorClass: string }> = ({ label, value, colorClass }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col items-center justify-center text-center min-h-[160px] flex-1 group hover:shadow-xl transition-all">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">{label}</p>
        <p className={`text-4xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>{value}</p>
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

    const isOwner = currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin';
    const isPrivileged = isOwner || currentUser?.role === 'Manager';

    // Robust Local-Time Financial Metrics
    const dashboardStats = useMemo(() => {
        // Use local ISO-date for filtering to match user input regardless of UTC offset
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        const todaySales = (sales || []).filter(s => s && s.date?.startsWith(todayStr) && FINALIZED_SALE_STATUSES.includes(s.status));
        const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
        const todayDiscounts = todaySales.reduce((sum, s) => sum + (s.discount || 0), 0);
        
        const todayCOGS = todaySales.reduce((sum, s) => {
            return sum + (s.items || []).reduce((itemSum, item) => {
                const prod = (products || []).find(p => p.id === item.product.id);
                // Fallback to 0 if product cost isn't set, ensuring Profit stays synced with Revenue
                return itemSum + ((prod?.costPrice || 0) * item.quantity);
            }, 0);
        }, 0);

        // Gross Profit = Revenue (Net of discounts) - COGS
        const todayGrossProfit = todayRevenue - todayCOGS; 
        
        const todayExpenses = (expenses || []).filter(e => e && e.date?.startsWith(todayStr) && e.status !== 'deleted').reduce((sum, e) => sum + e.amount, 0);
        const todayNewCustomers = (customers || []).filter(c => c && c.joinDate?.startsWith(todayStr)).length;

        return {
            revenue: todayRevenue,
            grossProfit: Math.max(0, todayGrossProfit),
            expenses: todayExpenses,
            newCustomers: todayNewCustomers,
            discounts: todayDiscounts
        };
    }, [sales, products, expenses, customers]);

    const pendingCounts = useMemo(() => ({
        clientOrders: (sales || []).filter(s => s.status === 'client_order').length,
        cashDeposits: (deposits || []).filter(d => d.status === 'pending').length,
        pendingPayouts: (users || []).flatMap(u => u.withdrawals || []).filter(w => ['pending', 'approved_by_owner'].includes(w.status)).length,
        staffPayments: (users || []).flatMap(u => u.customPayments || []).filter(p => p.status === 'pending_owner_approval').length,
        bankVerif: (sales || []).filter(s => s.status === 'pending_bank_verification').length,
        expenseVerif: (expenseRequests || []).filter(r => r.status === 'pending').length,
    }), [sales, deposits, users, expenseRequests]);

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* GREETING HEADER: Restored for Node Context */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                        <div className="relative">
                            <img src={currentUser.avatarUrl} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white/10 shadow-2xl" />
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                {businessProfile?.businessName || 'Welcome Node'}, {currentUser.name.split(' ')[0]}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-6">
                                Protocol Status: Operational • {new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREFERRED SUMMARY BAR: Terminology and Color from Screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <SummaryMetricCard label="Revenue" value={`${cs}${formatAbbreviatedNumber(dashboardStats.revenue)}`} colorClass="text-emerald-500" />
                <SummaryMetricCard label="Gross Profit" value={`${cs}${formatAbbreviatedNumber(dashboardStats.grossProfit)}`} colorClass="text-emerald-500" />
                <SummaryMetricCard label="Expenses" value={`${cs}${formatAbbreviatedNumber(dashboardStats.expenses)}`} colorClass="text-rose-500" />
                <SummaryMetricCard label="New Customers" value={dashboardStats.newCustomers} colorClass="text-primary" />
                <SummaryMetricCard label="Discounts" value={`${cs}${formatAbbreviatedNumber(dashboardStats.discounts)}`} colorClass="text-warning" />
            </div>

            {/* Management Action Center */}
            {isPrivileged && (
                <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 shadow-sm border border-slate-100 dark:border-gray-800">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Verification Control Hub</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ActionCard icon={<PhoneIcon />} label="Client Orders" count={pendingCounts.clientOrders} link="/transactions" />
                        <ActionCard icon={<CalculatorIcon />} label="Cash Deposits" count={pendingCounts.cashDeposits} link="/transactions" />
                        <ActionCard icon={<TransactionIcon />} label="Pending Payouts" count={pendingCounts.pendingPayouts} link="/profile" />
                        <ActionCard icon={<UsersGroupIcon />} label="Staff Payments" count={pendingCounts.staffPayments} link="/profile" />
                        <ActionCard icon={<BankIcon />} label="Bank Verification" count={pendingCounts.bankVerif} link="/receipts" />
                        <ActionCard icon={<CalculatorIcon />} label="Expense Verification" count={pendingCounts.expenseVerif} link="/expense-requests" />
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
                    <AlertsWidget 
                        alerts={anomalyAlerts || []} 
                        onDismiss={() => {}} 
                        onMarkRead={() => {}}
                        receiptSettings={receiptSettings} 
                        currentUser={currentUser}
                        businessSettings={businessSettings}
                    />
                </div>
            </div>

            {/* Terminal Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <button onClick={() => navigate('/counter')} className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.03] transition-all overflow-hidden text-left">
                    <div className="p-6 bg-primary/10 rounded-3xl text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-inner"><PlusIcon className="w-8 h-8" /></div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Issue Sale</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Open Checkout Interface</p>
                    </div>
                </button>
                {isPrivileged && (
                    <button onClick={() => navigate('/inventory')} className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.03] transition-all overflow-hidden text-left">
                        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-inner"><InventoryIcon className="w-8 h-8" /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Audit Inventory</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Manage Asset Registry</p>
                        </div>
                    </button>
                )}
                {isOwner && (
                    <button onClick={() => navigate('/settings')} className="relative group p-10 bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 flex items-center gap-8 hover:scale-[1.03] transition-all overflow-hidden text-left">
                        <div className="p-6 bg-amber-50 dark:bg-amber-950/30 rounded-3xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-inner"><ReportsIcon className="w-8 h-8" /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Node Settings</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configure Global Protocol</p>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
};

export default Dashboard;