
import React, { useMemo } from 'react';
import type { Sale, Customer, ReceiptSettingsData, Expense, Product } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { FINALIZED_SALE_STATUSES, StorefrontIcon, InventoryIcon, TodayIcon } from '../constants';

interface TodayProps {
    sales: Sale[];
    customers: Customer[];
    expenses: Expense[];
    products: Product[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
}

const KPIMetric: React.FC<{ title: string; value: string; cs: string; colorClass?: string; trend?: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", trend }) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-md transition-all">
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {value}
            </p>
        </div>
        {trend && (
            <div className="mt-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{trend}</p>
            </div>
        )}
    </div>
);

const Today: React.FC<TodayProps> = ({ sales, customers, expenses, products, t, receiptSettings }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];
    const cs = receiptSettings.currencySymbol;

    // PRESERVED LOGIC: Filter today's finalized sales
    const todaysSales = useMemo(() => 
        (sales || []).filter(sale => 
            sale && sale.date && sale.date.startsWith(todayString) && FINALIZED_SALE_STATUSES.includes(sale.status)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [sales, todayString]);

    // PRESERVED LOGIC: Financial totals
    const todaysRevenue = useMemo(() => 
        todaysSales.reduce((sum, sale) => sum + (sale.total || 0), 0),
    [todaysSales]);
    
    const todaysGrossProfit = useMemo(() => {
        return todaysSales.reduce((totalProfit: number, sale): number => {
            const saleRevenue = (sale.subtotal as number || 0) - (sale.discount as number || 0);
            const costOfGoodsSold = (sale.items || []).reduce((cogs: number, item): number => {
                const product = (products || []).find(p => p.id === item.product.id);
                const costPrice = product ? product.costPrice : 0;
                return cogs + (costPrice * item.quantity);
            }, 0);
            return totalProfit + (saleRevenue - costOfGoodsSold);
        }, 0);
    }, [todaysSales, products]);

    const todaysExpenses = useMemo(() =>
        (expenses || [])
            .filter(expense => expense && expense.status !== 'deleted' && expense.date && expense.date.startsWith(todayString))
            .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses, todayString]);

    const todaysNewCustomers = useMemo(() => 
        (customers || []).filter(c => c && c.joinDate && c.joinDate.startsWith(todayString)).length,
    [customers, todayString]);
    
    const todaysDiscounts = useMemo(() =>
        todaysSales.reduce((sum, sale) => sum + (sale.discount || 0), 0),
    [todaysSales]);

    // PRESERVED LOGIC: Velocity calculation
    const topTodaysProducts = useMemo(() => {
        const productQuantities = todaysSales.reduce((acc: Record<string, number>, sale) => {
            (sale.items || []).forEach(item => {
                const prev = acc[item.product.id] || 0;
                acc[item.product.id] = prev + Number(item.quantity);
            });
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(productQuantities)
            .sort(([, qtyA], [, qtyB]) => (qtyB as number) - (qtyA as number))
            .slice(0, 5)
            .map(([productId, quantity]) => {
                const product = (products || []).find(p => p.id === productId);
                return {
                    name: product ? product.name : 'Unknown Asset',
                    quantity: quantity as number,
                };
            });
    }, [todaysSales, products]);

    // PRESERVED LOGIC: Category calculation
    const topTodaysCategory = useMemo(() => {
        if (todaysSales.length === 0) return null;
        const categoryQuantities = todaysSales.reduce((acc: Record<string, number>, sale) => {
            (sale.items || []).forEach(item => {
                const product = (products || []).find(p => p.id === item.product.id);
                if (product) {
                    const category = product.category || 'Uncategorized';
                    const prev = acc[category] || 0;
                    acc[category] = prev + item.quantity;
                }
            });
            return acc;
        }, {} as Record<string, number>);

        const topCategoryEntry = Object.entries(categoryQuantities).sort(([, qtyA], [, qtyB]) => (qtyB as number) - (qtyA as number))[0];
        return topCategoryEntry ? { name: topCategoryEntry[0], quantity: topCategoryEntry[1] as number } : null;
    }, [todaysSales, products]);

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* Real-time Telemetry Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{t('today.title')}</h1>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-4">Operational Telemetry Node</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-100 dark:bg-gray-800 p-2 rounded-2xl border border-slate-200 dark:border-gray-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 pr-3">Live Feed Status: Sync</span>
                </div>
            </div>

            {/* Main KPI Matrix */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 px-2">
                <KPIMetric title="Revenue" value={`${cs}${formatAbbreviatedNumber(todaysRevenue)}`} cs={cs} colorClass="text-emerald-600" trend="Real-time Inflow" />
                <KPIMetric title="Net Yield" value={`${cs}${formatAbbreviatedNumber(todaysGrossProfit)}`} cs={cs} colorClass="text-primary" trend="After COGS Logic" />
                <KPIMetric title="Debits" value={`${cs}${formatAbbreviatedNumber(todaysExpenses)}`} cs={cs} colorClass="text-rose-600" trend="Authorized Spend" />
                <KPIMetric title="Expansion" value={todaysNewCustomers.toString()} cs="" trend="New Identites" />
                <KPIMetric title="Rebates" value={`${cs}${formatAbbreviatedNumber(todaysDiscounts)}`} cs={cs} colorClass="text-amber-500" trend="Discounts Issued" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Real-time Pipeline Table */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden h-full">
                        <header className="px-10 py-8 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Transaction Pipeline</h3>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{todaysSales.length} Active Events</span>
                        </header>
                        
                        <div className="min-h-[400px]">
                            {todaysSales.length > 0 ? (
                                <div className="table-wrapper border-none rounded-none">
                                    <div className="table-container max-h-[500px]">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-gray-900 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                <tr>
                                                    <th className="px-10 py-6">Timestamp</th>
                                                    <th className="px-10 py-6">Identity</th>
                                                    <th className="px-10 py-6 text-right">Settlement</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                                {todaysSales.map(sale => {
                                                    const customer = (customers || []).find(c => c.id === sale.customerId);
                                                    return (
                                                        <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                            <td className="px-10 py-6 text-slate-400 tabular-nums font-bold">
                                                                {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td className="px-10 py-6 font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-xs">
                                                                {customer?.name || 'Guest Identity'}
                                                            </td>
                                                            <td className="px-10 py-6 text-right tabular-nums">
                                                                <span className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(sale.total, cs)}</span>
                                                                <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Authorized</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState 
                                    icon={<TodayIcon />} 
                                    title="Pipeline Empty" 
                                    description="Zero transactions have reached the terminal today."
                                    action={{ label: "Launch Counter", onClick: () => window.location.hash = "/counter" }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Performance Side-Nodes */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Velocity Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Product Velocity</h3>
                        </div>
                        
                        {topTodaysProducts.length > 0 ? (
                            <div className="space-y-8">
                                {topTodaysProducts.map((p, i) => (
                                    <div key={p.name} className="group">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate pr-4">{p.name}</p>
                                            <p className="text-sm font-black text-primary tabular-nums">{p.quantity} Units</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-50 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary transition-all duration-1000" 
                                                style={{ width: `${Math.min(100, (p.quantity / topTodaysProducts[0].quantity) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState 
                                icon={<InventoryIcon />} 
                                title="Zero Velocity" 
                                description="No inventory movement detected."
                                compact
                            />
                        )}
                    </div>

                    {/* Dominance Card */}
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-12">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Market Dominance</h3>
                            </div>
                            
                            {topTodaysCategory ? (
                                <div className="text-center py-6">
                                    <p className="text-4xl font-black tracking-tighter uppercase leading-none">{topTodaysCategory.name}</p>
                                    <div className="mt-8 pt-8 border-t border-white/10">
                                        <p className="text-[32px] font-black text-emerald-500 tabular-nums leading-none">{topTodaysCategory.quantity}</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-3">Global Units Processed</p>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState 
                                    icon={<StorefrontIcon />} 
                                    title="Hierarchy Balanced" 
                                    description="No class dominance detected."
                                    compact
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Today;
