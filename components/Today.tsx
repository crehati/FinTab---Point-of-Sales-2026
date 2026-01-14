
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
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-xl transition-all">
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">{title}</p>
            <p className={`text-4xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {value}
            </p>
        </div>
        {trend && (
            <div className="mt-8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{trend}</p>
            </div>
        )}
    </div>
);

const Today: React.FC<TodayProps> = ({ sales, customers, expenses, products, t, receiptSettings }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];
    const cs = receiptSettings.currencySymbol;

    const todaysSales = useMemo(() => 
        (sales || []).filter(sale => 
            sale && sale.date && sale.date.startsWith(todayString) && FINALIZED_SALE_STATUSES.includes(sale.status)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [sales, todayString]);

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

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">{t('today')}</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-8">Operational Node Telemetry Active</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-inner">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Live Sync Protocol</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                <KPIMetric title="Verified Inflow" value={`${cs}${formatAbbreviatedNumber(todaysRevenue)}`} cs={cs} colorClass="text-emerald-500" trend="Gross Settlement" />
                <KPIMetric title="Node Net Yield" value={`${cs}${formatAbbreviatedNumber(todaysGrossProfit)}`} cs={cs} colorClass="text-primary" trend="Post-COGS Delta" />
                <KPIMetric title="Debit Exposure" value={`${cs}${formatAbbreviatedNumber(todaysExpenses)}`} cs={cs} colorClass="text-rose-500" trend="Daily Spend" />
                <div className="bg-primary text-white p-8 rounded-[3rem] shadow-2xl shadow-primary/30 flex flex-col justify-between group transition-all hover:-translate-y-1">
                    <div>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em] mb-6">Inflow Volume</p>
                        <p className="text-4xl font-black tabular-nums tracking-tighter leading-none">{todaysSales.length}</p>
                    </div>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-8">Sequences Processed Today</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden h-full">
                        <header className="px-10 py-10 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/30 dark:bg-gray-800/30">
                            <div className="flex items-center gap-6">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_12px_rgba(37,99,235,0.5)]"></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Transaction Pipeline</h3>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{todaysSales.length} Active Events</span>
                        </header>
                        
                        <div className="min-h-[400px]">
                            {todaysSales.length > 0 ? (
                                <div className="table-wrapper border-none rounded-none">
                                    <div className="table-container max-h-[600px]">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                <tr>
                                                    <th className="px-10 py-6">Timestamp</th>
                                                    <th className="px-10 py-6">Client Identity</th>
                                                    <th className="px-10 py-6 text-right">Settlement Val</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                                {todaysSales.map(sale => {
                                                    const customer = (customers || []).find(c => c.id === sale.customerId);
                                                    return (
                                                        <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                                            <td className="px-10 py-8 text-slate-400 tabular-nums font-bold">
                                                                {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td className="px-10 py-8 font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base">
                                                                {customer?.name || 'Guest Identity'}
                                                            </td>
                                                            <td className="px-10 py-8 text-right tabular-nums">
                                                                <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(sale.total, cs)}</span>
                                                                <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Verified Node</span>
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

                <div className="lg:col-span-4 space-y-10">
                    <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] p-12 shadow-xl border border-slate-50 dark:border-gray-800">
                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Asset Velocity</h3>
                        </div>
                        
                        {topTodaysProducts.length > 0 ? (
                            <div className="space-y-10">
                                {topTodaysProducts.map((p, i) => (
                                    <div key={p.name} className="group">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate pr-6">{p.name}</p>
                                            <p className="text-lg font-black text-primary tabular-nums">{p.quantity} Units</p>
                                        </div>
                                        <div className="h-2 w-full bg-slate-50 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className="h-full bg-primary transition-all duration-1000 group-hover:bg-blue-400" 
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
                </div>
            </div>
        </div>
    );
};

export default Today;
