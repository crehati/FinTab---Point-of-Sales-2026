import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import type { Sale, Product, Expense, ReceiptSettingsData, User, Customer, AppPermissions, OwnerSettings } from '../types';
import Card from './Card';
import { hasAccess } from '../lib/permissions';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { FINALIZED_SALE_STATUSES, ReportsIcon, WarningIcon, CloseIcon } from '../constants';

interface ReportsProps {
    sales: Sale[];
    products: Product[];
    expenses: Expense[];
    customers: Customer[];
    users: User[];
    t: (key: string) => string;
    lowStockThreshold: number;
    setLowStockThreshold: (value: number) => void;
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
    permissions: AppPermissions;
    ownerSettings: OwnerSettings;
}

const KPIMetric: React.FC<{ title: string; value: number | string; cs: string; colorClass?: string; caption?: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", caption }) => (
    <div 
        className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-xl transition-all cursor-help"
        title={typeof value === 'number' ? formatCurrency(value, cs) : value}
    >
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-4xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
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

const LeaderboardRow: React.FC<{ primary: string; secondary: string; secondaryTitle?: string; index: number }> = ({ primary, secondary, secondaryTitle, index }) => (
    <div className="flex items-center justify-between py-4 group">
        <div className="flex items-center gap-4 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-primary group-hover:text-white transition-all flex-shrink-0">
                {(index + 1).toString().padStart(2, '0')}
            </span>
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{primary}</p>
        </div>
        <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums ml-4" title={secondaryTitle}>{secondary}</p>
    </div>
);

const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
};

const Reports: React.FC<ReportsProps> = ({ sales, products, expenses, customers, users, t, receiptSettings, currentUser, permissions }) => {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const cs = receiptSettings.currencySymbol;

    const completedSales = useMemo(() => (sales || []).filter(s => s && s.status && FINALIZED_SALE_STATUSES.includes(s.status)), [sales]);

    // PRESERVED DATE FILTERING LOGIC
    const filteredSales = useMemo(() => {
        if (!startDate || !endDate) return completedSales;
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);
        return completedSales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startDate && saleDate <= adjustedEndDate;
        });
    }, [completedSales, startDate, endDate]);

    const filteredExpenses = useMemo(() => {
        const activeExpenses = (expenses || []).filter(e => e && e.status !== 'deleted');
        if (!startDate || !endDate) return activeExpenses;
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);
        return activeExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate && expenseDate <= adjustedEndDate;
        });
    }, [expenses, startDate, endDate]);
    
    const handleSetDateRange = (start: Date, end: Date, preset: string) => {
        setStartDate(start);
        setEndDate(end);
        setActivePreset(preset);
    };

    // PRESERVED PRESETS
    const handleDatePreset = (preset: string) => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch(preset) {
            case 'today': break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
                break;
            case 'this_week':
                start.setDate(start.getDate() - start.getDay());
                end.setDate(start.getDate() + 6);
                break;
            case 'last_week':
                start.setDate(start.getDate() - start.getDay() - 7);
                end.setDate(start.getDate() + 6);
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'last_year':
                 start = new Date(now.getFullYear() - 1, 0, 1);
                 end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                 break;
        }
        handleSetDateRange(start, end, preset);
    };

    const clearFilter = () => {
        setStartDate(null);
        setEndDate(null);
        setActivePreset(null);
    };

    // PRESERVED FINANCIAL CALCULATIONS
    const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.total, 0), [filteredSales]);
    const totalReceipts = useMemo(() => filteredSales.length, [filteredSales]);
    const totalDiscounts = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.discount, 0), [filteredSales]);
    const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0), [filteredExpenses]);
    
    const grossProfit = useMemo(() => {
        const totalRevenueFromItems = filteredSales.reduce((sum, sale) => sum + sale.subtotal, 0);
        const totalCOGS = filteredSales.reduce((sum, sale) => {
            const saleCOGS = sale.items.reduce((cogs, item) => cogs + (item.product.costPrice * item.quantity), 0);
            return sum + saleCOGS;
        }, 0);
        return totalRevenueFromItems - totalDiscounts - totalCOGS;
    }, [filteredSales, totalDiscounts]);
    
    const netProfit = useMemo(() => grossProfit - totalExpenses, [grossProfit, totalExpenses]);

    // PRESERVED CHART DATA LOGIC
    const salesOverTime = useMemo(() => {
        const salesByDate: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            const date = new Date(sale.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            salesByDate[date] = (salesByDate[date] || 0) + sale.total;
        });
        return Object.entries(salesByDate)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    }, [filteredSales]);

    const salesByPaymentMethod = useMemo(() => {
        if (filteredSales.length === 0) return [];
        const methods = filteredSales.reduce((acc: Record<string, { count: number; revenue: number }>, sale) => {
            const method = sale.paymentMethod || 'Other';
            const current = acc[method] || { count: 0, revenue: 0 };
            acc[method] = {
                count: current.count + 1,
                revenue: current.revenue + sale.total
            };
            return acc;
        }, {} as Record<string, { count: number; revenue: number }>);
    
        return Object.entries(methods)
            // Fix: Explicitly type 'data' as { count: number; revenue: number } to resolve property access on 'unknown' error
            .map(([name, data]: [string, { count: number; revenue: number }]) => ({ name, count: data.count, revenue: data.revenue }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales]);

    const topCategories = useMemo(() => {
        const categorySales = filteredSales.reduce((acc: Record<string, number>, sale) => {
            sale.items.forEach(item => {
                const category = item.product.category || 'Uncategorized';
                acc[category] = (acc[category] || 0) + Number(item.quantity);
            });
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(categorySales)
            // Fix: Explicitly type 'a' and 'b' as [string, number] to resolve arithmetic operation error on 'unknown'
            .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
            .slice(0, 5);
    }, [filteredSales]);

    const topCustomers = useMemo(() => {
        const customerSpending: Record<string, { name: string; total: number }> = filteredSales.reduce((acc, sale) => {
            const customer = customers.find(c => c.id === sale.customerId);
            const id = sale.customerId;
            const current = acc[id] || { name: customer ? customer.name : 'Guest Identity', total: 0 };
            acc[id] = { ...current, total: current.total + sale.total };
            return acc;
        }, {} as Record<string, { name: string; total: number }>);

        return Object.values(customerSpending)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [filteredSales, customers]);

    const presetLabels = [
        { label: 'Today', value: 'today' },
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'Week', value: 'this_week' },
        { label: 'Last Week', value: 'last_week' },
        { label: 'Month', value: 'this_month' },
        { label: 'Last Month', value: 'last_month' },
        { label: 'Year', value: 'this_year' },
        { label: 'Last Year', value: 'last_year' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* Command Header Block */}
            <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                            <ReportsIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{t('reports.title')}</h1>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-4">Operational Analytics Ledger</p>
                        </div>
                    </div>
                    
                    {/* Integrated Control Node */}
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/10 flex flex-col lg:flex-row items-center gap-6">
                        <div className="flex flex-wrap justify-center gap-2">
                            {presetLabels.map(p => (
                                <button 
                                    key={p.value} 
                                    onClick={() => handleDatePreset(p.value)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activePreset === p.value ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                            {(startDate || endDate) && (
                                <button onClick={clearFilter} className="p-2 text-rose-400 hover:text-rose-500 transition-colors"><CloseIcon className="w-4 h-4" /></button>
                            )}
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden lg:block"></div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Horizon Start</label>
                                <input 
                                    type="date" 
                                    value={formatDateForInput(startDate)} 
                                    onChange={e => { setStartDate(new Date(e.target.value)); setActivePreset(null); }}
                                    className="bg-transparent border-none text-[11px] font-black uppercase text-primary outline-none cursor-pointer"
                                />
                            </div>
                            <span className="text-slate-600 font-bold mt-3">→</span>
                            <div className="flex flex-col">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Horizon Limit</label>
                                <input 
                                    type="date" 
                                    value={formatDateForInput(endDate)} 
                                    onChange={e => { setEndDate(new Date(e.target.value)); setActivePreset(null); }}
                                    className="bg-transparent border-none text-[11px] font-black uppercase text-primary outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Summary Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                <KPIMetric title="Gross Revenue" value={totalRevenue} cs={cs} caption="Realized Inflow" />
                <KPIMetric title="Volume" value={totalReceipts} cs="" caption="Auth Certificates" />
                <KPIMetric title="COGS Deductions" value={totalDiscounts} cs={cs} colorClass="text-rose-400" caption="Rebates Issued" />
                <KPIMetric title="Gross Profit" value={grossProfit} cs={cs} colorClass="text-emerald-600" caption="After Asset Cost" />
                <KPIMetric title="Debit Total" value={totalExpenses} cs={cs} colorClass="text-rose-600" caption="Operational Outflow" />
                {hasAccess(currentUser, 'REPORTS', 'view_profit_reports', permissions) && (
                    <KPIMetric title="Net Node Yield" value={netProfit} cs={cs} colorClass="text-primary" caption="Verified Surplus" />
                )}
            </div>

            {/* Primary Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Time-Series Analytics */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800 h-full">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Transaction Velocity</h3>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filteredSales.length} Units Analyzed</span>
                        </div>
                        
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesOverTime}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} tickFormatter={(val) => `${cs}${formatAbbreviatedNumber(val)}`} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 20px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                        labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: '800' }}
                                        formatter={(val: number) => [formatCurrency(val, cs), 'Revenue']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Classification Hierarchy */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800 h-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Protocol Hierarchy</h3>
                        </div>
                        <div className="divide-y dark:divide-gray-800">
                            {topCategories.length > 0 ? topCategories.map((cat, i) => (
                                <LeaderboardRow key={cat[0]} index={i} primary={cat[0]} secondary={`${cat[1]} Units`} />
                            )) : (
                                <p className="text-[10px] text-slate-400 font-bold uppercase py-20 text-center tracking-widest italic opacity-50">Null Sequence</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Method Breakdown */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800 h-full">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Settlement Distribution</h3>
                        </div>
                        
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesByPaymentMethod} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8', fontWeight: 800}} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}}
                                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 20px' }}
                                        formatter={(val: number) => [formatCurrency(val, cs), 'Volume']}
                                    />
                                    <Bar dataKey="revenue" fill="#2563EB" radius={[0, 12, 12, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* High Value Entities */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800 h-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">High Value Entities</h3>
                        </div>
                        <div className="divide-y dark:divide-gray-800">
                            {topCustomers.length > 0 ? topCustomers.map((cust, i) => (
                                <LeaderboardRow 
                                    key={i} 
                                    index={i} 
                                    primary={cust.name} 
                                    secondary={`${cs}${formatAbbreviatedNumber(cust.total)}`} 
                                    secondaryTitle={formatCurrency(cust.total, cs)}
                                />
                            )) : (
                                <p className="text-[10px] text-slate-400 font-bold uppercase py-20 text-center tracking-widest italic opacity-50">Zero Entity Ledger</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification Footer */}
            <div className="p-10 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[3rem] flex items-center gap-8 max-w-4xl mx-auto">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                    <WarningIcon className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-xs font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest mb-1">Accounting Synchronization Policy</p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase leading-relaxed tracking-tight">
                        Analytics are derived from verified POS settlements and authorized ledger debits. Real-time data includes all nodes within the current fiscal identity.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Reports;