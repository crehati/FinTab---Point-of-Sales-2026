
// @ts-nocheck
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Sale, Customer, ReceiptSettingsData, Expense, Product, ExpenseRequest, AnomalyAlert } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { 
    FINALIZED_SALE_STATUSES, 
    StorefrontIcon, 
    InventoryIcon, 
    TodayIcon, 
    PlusIcon, 
    CustomersIcon, 
    ReportsIcon, 
    WarningIcon, 
    CalculatorIcon,
    TransactionIcon,
    ChevronDownIcon
} from '../constants';

interface TodayProps {
    sales: Sale[];
    customers: Customer[];
    expenses: Expense[];
    products: Product[];
    expenseRequests?: ExpenseRequest[];
    anomalyAlerts?: AnomalyAlert[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
}

const NavButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; color?: string }> = ({ icon, label, onClick, color = "bg-white dark:bg-gray-900" }) => (
    <button 
        onClick={onClick}
        className={`${color} flex items-center gap-3 px-6 py-4 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all active:scale-95 group flex-1 min-w-[140px]`}
    >
        <div className="text-primary group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{label}</span>
    </button>
);

const AlertItem: React.FC<{ label: string; count: number; onClick: () => void; type?: 'danger' | 'warning' | 'info' }> = ({ label, count, onClick, type = 'info' }) => {
    if (count === 0) return null;
    const colors = {
        danger: 'bg-rose-50 text-rose-600 border-rose-100',
        warning: 'bg-amber-50 text-amber-600 border-amber-100',
        info: 'bg-blue-50 text-blue-600 border-blue-100'
    };
    return (
        <div className={`flex items-center justify-between p-4 rounded-2xl border ${colors[type]} group animate-fade-in`}>
            <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
            </div>
            <div className="flex items-center gap-3">
                <span className="font-black text-sm tabular-nums">{count}</span>
                <button onClick={onClick} className="px-3 py-1 bg-white/40 hover:bg-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">Action</button>
            </div>
        </div>
    );
};

const SnapshotMetric: React.FC<{ label: string; value: string | number; subValue?: string }> = ({ label, value, subValue }) => (
    <div className="p-6 bg-slate-50/50 dark:bg-gray-800/30 rounded-3xl border border-slate-100 dark:border-gray-800">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter leading-none">{value}</p>
        {subValue && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">{subValue}</p>}
    </div>
);

const Today: React.FC<TodayProps> = ({ sales, customers, expenses, products, expenseRequests = [], anomalyAlerts = [], t, receiptSettings }) => {
    const navigate = useNavigate();
    const todayString = new Date().toLocaleDateString('en-CA');
    const cs = receiptSettings.currencySymbol;

    const todaysSales = useMemo(() => 
        (sales || []).filter(sale => 
            sale && sale.date && sale.date.startsWith(todayString) && FINALIZED_SALE_STATUSES.includes(sale.status)
        ), 
    [sales, todayString]);

    const metrics = useMemo(() => {
        const revenue = todaysSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const count = todaysSales.length;
        const avg = count > 0 ? revenue / count : 0;

        const productQtyMap = todaysSales.reduce((acc, s) => {
            s.items.forEach(i => {
                acc[i.product.name] = (acc[i.product.name] || 0) + i.quantity;
            });
            return acc;
        }, {} as Record<string, number>);

        const topItem = Object.entries(productQtyMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '---';

        return { revenue, count, avg, topItem };
    }, [todaysSales]);

    const alerts = useMemo(() => {
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
        const outOfStock = products.filter(p => p.stock <= 0).length;
        const unpaid = (sales || []).filter(s => s.status === 'proforma').length;
        
        // REAL DATA: Map client orders to Pickup Queue
        const pickup = (sales || []).filter(s => s.status === 'client_order').length;
        
        // REAL DATA: Map pending expense requests with "Refund" in category or description to Refunds alert
        const refunds = expenseRequests.filter(r => 
            r.status === 'pending' && 
            (r.category.toLowerCase().includes('refund') || r.description.toLowerCase().includes('refund'))
        ).length;

        // Placeholder for items expiring - requires schema update for expiry_date in products
        const expiring = 0;

        return { lowStock, outOfStock, unpaid, pickup, expiring, refunds };
    }, [products, sales, expenseRequests]);

    const inventoryTasks = useMemo(() => {
        const needRestock = products.filter(p => p.stock <= 10).length;
        const arrivedToday = products.filter(p => 
            (p.stockHistory || []).some(h => h.date.startsWith(todayString) && h.type === 'add')
        ).length;

        return { needRestock, arrivedToday };
    }, [products, todayString]);

    const cashDrawer = useMemo(() => {
        const cashSalesToday = todaysSales.filter(s => s.paymentMethod === 'Cash').reduce((s, x) => s + x.total, 0);
        const cashExpensesToday = (expenses || []).filter(e => e.date.startsWith(todayString) && e.paymentSource === 'cash').reduce((s, x) => s + x.amount, 0);
        
        // Solidify opening balance by finding the first cash transaction of the day or previous closing state
        // For now, calculating day's net activity
        const opening = 0; 
        const current = opening + cashSalesToday - cashExpensesToday;
        const discrepancies = anomalyAlerts.filter(a => a.type === 'cash' && !a.isDismissed).length;

        return { opening, current, expected: current, actual: current, discrepancies };
    }, [todaysSales, expenses, todayString, anomalyAlerts]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-fade-in font-sans">
            {/* Header Block */}
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Operational Pulse</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-4">Node Active • {new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                    </div>
                </div>
            </div>

            {/* One-Tap Navigation */}
            <div className="flex flex-wrap gap-4 px-2">
                <NavButton icon={<PlusIcon className="w-5 h-5"/>} label="New Sale" onClick={() => navigate('/counter')} color="bg-primary !text-white shadow-primary/20" />
                <NavButton icon={<PlusIcon className="w-5 h-5"/>} label="Add Customer" onClick={() => navigate('/customers')} />
                <NavButton icon={<PlusIcon className="w-5 h-5"/>} label="Inventory" onClick={() => navigate('/inventory')} />
                <NavButton icon={<ReportsIcon className="w-5 h-5"/>} label="Reports" onClick={() => navigate('/reports')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Snapshot & Drawer */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Today’s Sales Snapshot */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-xl border border-slate-100 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Sales Snapshot</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <SnapshotMetric label="Gross Total" value={formatCurrency(metrics.revenue, cs)} subValue="Revenue Inflow" />
                            <SnapshotMetric label="Transactions" value={metrics.count} subValue="Volume Count" />
                            <SnapshotMetric label="Avg Ticket" value={formatCurrency(metrics.avg, cs)} subValue="Order Value" />
                            <SnapshotMetric label="Top Performer" value={metrics.topItem} subValue="Best Seller" />
                        </div>
                    </div>

                    {/* Cash Drawer Status */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-xl border border-slate-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Drawer Registry</h3>
                            </div>
                            {cashDrawer.discrepancies > 0 && (
                                <span className="bg-rose-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full animate-pulse">Alert: Discrepancy detected</span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                            <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-4">Current Balance</p>
                                <p className="text-5xl font-black tabular-nums tracking-tighter">{formatCurrency(cashDrawer.current, cs)}</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-tight px-2">
                                    <span>Opening Point</span>
                                    <span className="tabular-nums">{formatCurrency(cashDrawer.opening, cs)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-tight px-2">
                                    <span>Expected Net</span>
                                    <span className="tabular-nums">{formatCurrency(cashDrawer.expected, cs)}</span>
                                </div>
                                <div className="pt-4 border-t dark:border-gray-800">
                                    <button onClick={() => navigate('/cash-count')} className="w-full py-4 bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 dark:border-gray-700">Initialize Recount Protocol</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Alerts & Tasks */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Action Alerts (High Priority) */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-8 px-2">
                            <WarningIcon className="w-4 h-4 text-rose-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Critical Alerts</h3>
                        </div>
                        <div className="space-y-3">
                            <AlertItem label="Low Stock Nodes" count={alerts.lowStock} type="warning" onClick={() => navigate('/inventory')} />
                            <AlertItem label="Null Stock (OOS)" count={alerts.outOfStock} type="danger" onClick={() => navigate('/inventory')} />
                            <AlertItem label="Unpaid Quotes" count={alerts.unpaid} type="info" onClick={() => navigate('/proforma')} />
                            <AlertItem label="Pending Refunds" count={alerts.refunds} type="warning" onClick={() => navigate('/expense-requests')} />
                            <AlertItem label="Pickup Queue" count={alerts.pickup} type="info" onClick={() => navigate('/receipts')} />
                            <AlertItem label="Expiring Assets" count={alerts.expiring} type="danger" onClick={() => {}} />
                            {Object.values(alerts).every(v => v === 0) && (
                                <p className="text-center py-10 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Protocol Nominal • No Alerts</p>
                            )}
                        </div>
                    </div>

                    {/* Inventory Tasks for Today */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-8 px-2">
                            <CalculatorIcon className="w-4 h-4 text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Task Registry</h3>
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => navigate('/inventory')} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-gray-800 rounded-2xl group hover:bg-primary transition-all">
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-white">Restock Protocol</span>
                                    {inventoryTasks.needRestock > 0 && <span className="text-[8px] font-bold text-rose-500 group-hover:text-white/80 uppercase mt-1">{inventoryTasks.needRestock} SKU Needs Unit Injection</span>}
                                </div>
                                <PlusIcon className="w-4 h-4 text-slate-400 group-hover:text-white" />
                            </button>
                            <button onClick={() => navigate('/goods-receiving')} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-gray-800 rounded-2xl group hover:bg-primary transition-all">
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-white">Arrival Registry</span>
                                    {inventoryTasks.arrivedToday > 0 && <span className="text-[8px] font-bold text-emerald-500 group-hover:text-white/80 uppercase mt-1">{inventoryTasks.arrivedToday} POs Received Today</span>}
                                </div>
                                <PlusIcon className="w-4 h-4 text-slate-400 group-hover:text-white" />
                            </button>
                            <button onClick={() => navigate('/commission')} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-gray-800 rounded-2xl group hover:bg-primary transition-all">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-white">Price Adjustments</span>
                                <PlusIcon className="w-4 h-4 text-slate-400 group-hover:text-white" />
                            </button>
                            <button onClick={() => navigate('/cash-count')} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-gray-800 rounded-2xl group hover:bg-primary transition-all">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-white">Unit Recount</span>
                                <PlusIcon className="w-4 h-4 text-slate-400 group-hover:text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Today;
