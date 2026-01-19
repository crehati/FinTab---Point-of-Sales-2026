
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import type { Product, ReceiptSettingsData, User, Customer, AppPermissions, OwnerSettings, Sale } from '../types';
import Card from './Card';
import { hasAccess } from '../lib/permissions';
import { formatCurrency, formatAbbreviatedNumber, exportToCsv, isRateLimited } from '../lib/utils';
import { ReportsIcon, WarningIcon, DownloadJpgIcon, TodayIcon, InventoryIcon, CustomersIcon, TransactionIcon, AIIcon, LightBulbIcon, ChevronDownIcon, CreditCardIcon } from '../constants';
import ReportFilterModal from './ReportFilterModal';
import ModalShell from './ModalShell';

interface ReportsProps {
    sales: Sale[];
    products: Product[];
    expenses: any[];
    customers: Customer[];
    users: User[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
    permissions: AppPermissions;
    ownerSettings: OwnerSettings;
    ledgerEntries: any[];
}

const PAYMENT_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

const KPIMetric: React.FC<{ title: string; value: number | string; cs: string; colorClass?: string; caption?: string; onClick?: () => void }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", caption, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-xl transition-all cursor-pointer ${onClick ? 'active:scale-95' : ''}`}
    >
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">{title}</p>
            <p className={`text-4xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {typeof value === 'number' ? `${cs}${formatAbbreviatedNumber(value)}` : value}
            </p>
        </div>
        {caption && (<div className="mt-8 flex justify-between items-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{caption}</p>
            {onClick && <span className="text-[8px] font-bold text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Details →</span>}
        </div>)}
    </div>
);

const Reports: React.FC<ReportsProps> = ({ sales = [], products = [], expenses = [], customers = [], users = [], t, receiptSettings, currentUser, permissions, ownerSettings, ledgerEntries = [] }) => {
    const cs = receiptSettings.currencySymbol;
    const canViewPage = hasAccess(currentUser, 'REPORTS', 'view_sales_reports', permissions);
    
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState<'financial' | 'products' | 'customers' | 'inventory' | 'forecasting' | 'receipts' | 'exceptions'>('financial');
    const [drillDownData, setDrillDownData] = useState<any>(null);

    const filteredSales = useMemo(() => {
        let result = (sales || []).filter(s => s.status !== 'proforma');
        if (startDate) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            result = result.filter(s => new Date(s.date).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(`${endDate}T23:59:59`).getTime();
            result = result.filter(s => new Date(s.date).getTime() <= end);
        }
        return result;
    }, [sales, startDate, endDate]);

    const filteredLedger = useMemo(() => {
        let result = (ledgerEntries || []);
        if (startDate) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            result = result.filter(l => new Date(l.created_at || l.date).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(`${endDate}T23:59:59`).getTime();
            result = result.filter(l => new Date(l.created_at || l.date).getTime() <= end);
        }
        return result;
    }, [ledgerEntries, startDate, endDate]);

    // Comprehensive Analytical Computations
    const analytics = useMemo(() => {
        const rev = filteredLedger.filter(l => l.type === 'SALE').reduce((s, l) => s + l.amount, 0);
        const exp = filteredLedger.filter(l => l.type === 'EXPENSE').reduce((s, l) => s + Math.abs(l.amount), 0);
        
        // Product Performance
        const prodMap = new Map();
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const existing = prodMap.get(item.product.id) || { name: item.product.name, qty: 0, revenue: 0, cost: 0, category: item.product.category };
                const prod = products.find(p => p.id === item.product.id);
                existing.qty += item.quantity;
                existing.revenue += (item.variant?.price || item.product.price) * item.quantity;
                existing.cost += (item.variant?.costPrice || item.product.costPrice || 0) * item.quantity;
                prodMap.set(item.product.id, existing);
            });
        });
        const productStats = Array.from(prodMap.values()).map(p => ({
            ...p,
            profit: p.revenue - p.cost,
            margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
        })).sort((a, b) => b.revenue - a.revenue);

        // Best & Low Sellers
        const bestSellers = [...productStats].sort((a,b) => b.qty - a.qty).slice(0, 5);
        const lowSellers = [...productStats].sort((a,b) => a.qty - b.qty).slice(0, 5);

        // Payment Method Breakdown
        const payMap = new Map();
        filteredSales.forEach(sale => {
            const method = sale.paymentMethod || 'Unspecified';
            payMap.set(method, (payMap.get(method) || 0) + sale.total);
        });
        const paymentBreakdown = Array.from(payMap.entries()).map(([name, value]) => ({ name, value }));

        // Customer Insights
        const customerValueMap = new Map();
        const returningCustIds = new Set();
        const allCustIds = new Set();
        
        filteredSales.forEach(s => {
            if (allCustIds.has(s.customerId)) returningCustIds.add(s.customerId);
            allCustIds.add(s.customerId);
            customerValueMap.set(s.customerId, (customerValueMap.get(s.customerId) || 0) + s.total);
        });

        const newCustCount = allCustIds.size - returningCustIds.size;
        const avgCLV = allCustIds.size > 0 ? Array.from(customerValueMap.values()).reduce((a,b)=>a+b, 0) / allCustIds.size : 0;
        
        // Inventory Report
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10);
        const outOfStock = products.filter(p => p.stock <= 0);
        
        // Shrinkage Simulation (Calculated from stock history where reason contains 'Correction' or 'Missing')
        let totalShrinkageVal = 0;
        products.forEach(p => {
            const shrinkageLogs = (p.stockHistory || []).filter(h => h.type === 'remove' && (h.reason.toLowerCase().includes('correction') || h.reason.toLowerCase().includes('missing') || h.reason.toLowerCase().includes('lost')));
            shrinkageLogs.forEach(h => {
                totalShrinkageVal += h.quantity * (p.costPrice || 0);
            });
        });

        // Receipt Analytics
        const totalItemsInSales = filteredSales.reduce((s, x) => s + x.items.length, 0);
        const avgItems = filteredSales.length > 0 ? totalItemsInSales / filteredSales.length : 0;
        const upsellCount = filteredSales.filter(s => s.items.length > 1).length;
        const upsellRate = filteredSales.length > 0 ? (upsellCount / filteredSales.length) * 100 : 0;
        
        // Combination Analytics (Simplified: top 3 most common items)
        const itemFreq = new Map();
        filteredSales.forEach(s => s.items.forEach(i => itemFreq.set(i.product.name, (itemFreq.get(i.product.name) || 0) + 1)));
        const topCombinations = Array.from(itemFreq.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 3);

        // Exceptions
        const highDiscounts = filteredSales.filter(s => s.discount > (s.subtotal * 0.2));
        const voidRecords = (ledgerEntries || []).filter(l => l.status === 'deleted');
        
        // Discrepancy Detection (From Ledger metadata)
        const discrepancies = (ledgerEntries || []).filter(l => l.metadata?.difference && l.metadata.difference !== 0);

        // Forecasting (Simple Moving Average Projection)
        const dailyRev = filteredLedger.filter(l => l.type === 'SALE').reduce((acc, l) => {
            const day = (l.created_at || l.date).split('T')[0];
            acc[day] = (acc[day] || 0) + l.amount;
            return acc;
        }, {});
        const days = Object.keys(dailyRev).length || 1;
        const avgDailyRev = rev / days;
        const forecastedRev = avgDailyRev * 7;
        const inventoryNeeds = productStats.filter(p => p.qty > (products.find(pr=>pr.name === p.name)?.stock || 0)).slice(0, 5);

        const grossProfit = Math.max(0, rev - productStats.reduce((s, p) => s + p.cost, 0));

        return { 
            rev, exp, 
            grossProfit,
            netProfit: grossProfit - exp,
            productStats,
            bestSellers,
            lowSellers,
            paymentBreakdown,
            lowStock,
            outOfStock,
            newCustCount,
            returningCustCount: returningCustIds.size,
            avgCLV,
            totalShrinkageVal,
            avgItems,
            upsellRate,
            topCombinations,
            highDiscounts,
            voidRecords,
            discrepancies,
            forecastedRev,
            inventoryNeeds
        };
    }, [filteredLedger, filteredSales, products]);

    const handleExportSpecific = (data: any[], name: string) => {
        if (isRateLimited('export-report', 5000)) return;
        exportToCsv(`FinTab_${name}_Report_${new Date().toISOString()}.csv`, data);
    };

    if (!canViewPage) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="text-center space-y-6">
                    <WarningIcon className="w-20 h-20 text-rose-500 mx-auto" />
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Authorization Failure</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Access clearance for Analytics required.</p>
                </div>
            </div>
        );
    }

    const tabs = useMemo(() => [
        { id: 'financial', label: 'Financial Matrix', icon: <TransactionIcon />, access: 'view_sales_reports' },
        { id: 'products', label: 'Asset Velocity', icon: <InventoryIcon />, access: 'view_product_performance' },
        { id: 'customers', label: 'Client Intelligence', icon: <CustomersIcon />, access: 'view_customer_insights' },
        { id: 'inventory', label: 'Quantum Audit', icon: <WarningIcon />, access: 'view_inventory_reports' },
        { id: 'forecasting', label: 'Predictive Engine', icon: <AIIcon />, access: 'view_forecasting' },
        { id: 'receipts', label: 'Transaction Logic', icon: <TodayIcon />, access: 'view_receipt_analytics' },
        { id: 'exceptions', label: 'Integrity Guard', icon: <WarningIcon className="text-rose-500" />, access: 'view_exception_reports' }
    ].filter(tab => hasAccess(currentUser, 'REPORTS', tab.access, permissions)), [currentUser, permissions]);

    useEffect(() => {
        if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [tabs, activeTab]);

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-fade-in font-sans">
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-12">
                    <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner">
                            <ReportsIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Enterprise Matrix</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-6">Global Node Analysis & Predictive Intelligence</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                         <button 
                            onClick={() => setIsFilterModalOpen(true)}
                            className="px-10 py-5 bg-white/5 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-4 border border-white/10 backdrop-blur-md"
                         >
                             <TodayIcon className="w-5 h-5" /> {startDate || endDate ? `${startDate || '...'} - ${endDate || '...'}` : 'Filter Protocol'}
                         </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-4 px-2 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-shrink-0 flex items-center gap-3 px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border transition-all ${
                            activeTab === tab.id 
                            ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105' 
                            : 'bg-white dark:bg-gray-900 text-slate-500 border-slate-100 dark:border-gray-800 hover:border-primary/20'
                        }`}
                    >
                        {React.cloneElement(tab.icon as React.ReactElement, { className: 'w-4 h-4' })}
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className="animate-fade-in space-y-12">
                {activeTab === 'financial' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                            <KPIMetric title="Revenue" value={analytics.rev} cs={cs} colorClass="text-emerald-500" caption="Gross Terminal Inflow" onClick={() => setDrillDownData({ title: 'Revenue Node Detail', data: filteredLedger.filter(l => l.type === 'SALE') })} />
                            <KPIMetric title="Gross Profit" value={analytics.grossProfit} cs={cs} colorClass="text-emerald-500" caption="Pre-Operating Yield" />
                            <KPIMetric title="Expenses" value={analytics.exp} cs={cs} colorClass="text-rose-500" caption="Authorized Ledger Outflow" onClick={() => setDrillDownData({ title: 'Expenditure Audit', data: filteredLedger.filter(l => l.type === 'EXPENSE') })} />
                            <KPIMetric title="Net Profit" value={analytics.netProfit} cs={cs} colorClass={analytics.netProfit >= 0 ? "text-primary" : "text-rose-600"} caption="Bottom-Line Residual" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden p-8 h-full">
                                    <div className="flex justify-between items-center mb-10 px-4">
                                        <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Detailed Audit Trail</h3>
                                        <div className="flex gap-4">
                                            <button onClick={() => window.print()} className="text-[10px] font-black uppercase text-slate-400 hover:text-primary tracking-widest">Print PDF</button>
                                            <button onClick={() => handleExportSpecific(filteredLedger, 'Ledger')} className="text-[10px] font-black uppercase text-primary hover:underline tracking-widest">Export CSV</button>
                                        </div>
                                    </div>
                                    <div className="table-wrapper border-none">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <tr><th className="p-6">Date</th><th className="p-6">Class</th><th className="p-6">ID</th><th className="p-6 text-right">Value</th></tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-gray-800">
                                                {filteredLedger.slice(0, 15).map(l => (
                                                    <tr key={l.id} className="hover:bg-slate-50/50">
                                                        <td className="p-6 text-slate-500 tabular-nums text-xs">{new Date(l.created_at || l.date).toLocaleDateString()}</td>
                                                        <td className="p-6"><span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${l.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{l.type}</span></td>
                                                        <td className="p-6 font-bold text-xs uppercase text-slate-900 dark:text-white">{l.audit_link_id}</td>
                                                        <td className={`p-6 text-right font-black tabular-nums ${l.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{cs}{Math.abs(l.amount).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <div className="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 h-full flex flex-col">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="p-3 bg-primary/10 rounded-2xl text-primary"><CreditCardIcon className="w-6 h-6" /></div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white leading-none">Settlement Protocols</h3>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">Payment Method Volume</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analytics.paymentBreakdown}
                                                    cx="50%" cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                >
                                                    {analytics.paymentBreakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', background: '#0F172A', color: '#fff', fontSize: '10px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-8 space-y-3">
                                        {analytics.paymentBreakdown.map((item, index) => (
                                            <div key={item.name} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }}></div>
                                                    <span className="text-slate-500">{item.name}</span>
                                                </div>
                                                <span className="text-slate-900 dark:text-white tabular-nums">{cs}{item.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800">
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] mb-10 text-slate-900 dark:text-white">Velocity Ranking (Top Unit Volume)</h3>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.bestSellers} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                            <XAxis type="number" axisLine={false} tickLine={false} hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'black', textTransform: 'uppercase'}} width={120} />
                                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '15px', border: 'none', background: '#0F172A', color: '#fff' }} />
                                            <Bar dataKey="qty" fill="#2563EB" radius={[0, 20, 20, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800">
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] mb-10 text-slate-900 dark:text-white">Yield & Margin Audit</h3>
                                <div className="space-y-4">
                                    {analytics.bestSellers.slice(0, 4).map(p => (
                                        <div key={p.name} className="p-6 bg-slate-50 dark:bg-gray-800 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:bg-primary transition-all cursor-default">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 group-hover:text-white/60 uppercase tracking-widest mb-1">{p.category}</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-white uppercase tracking-tighter">{p.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-emerald-600 group-hover:text-white tabular-nums">{p.margin.toFixed(1)}%</p>
                                                <p className="text-[8px] font-bold text-slate-400 group-hover:text-white/60 uppercase tracking-widest">Protocol Margin</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-slate-50 overflow-hidden">
                             <div className="flex justify-between items-center mb-10">
                                <h3 className="text-sm font-black uppercase tracking-[0.4em]">Global Asset Performance Ledger</h3>
                                <button onClick={() => handleExportSpecific(analytics.productStats, 'ProductPerformance')} className="text-[10px] font-black uppercase text-primary hover:underline tracking-widest">Full Audit CSV</button>
                             </div>
                             <div className="table-wrapper border-none">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <tr><th className="p-6">Asset Name</th><th className="p-6 text-center">Unit Sales</th><th className="p-6 text-right">Yield (Gross)</th><th className="p-6 text-right">Margin (%)</th></tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-800">
                                        {analytics.productStats.map(p => (
                                            <tr key={p.name} className="hover:bg-slate-50/50">
                                                <td className="p-6 font-bold text-xs uppercase text-slate-900 dark:text-white">{p.name}</td>
                                                <td className="p-6 text-center font-black tabular-nums">{p.qty}</td>
                                                <td className="p-6 text-right font-black tabular-nums">{cs}{p.revenue.toFixed(2)}</td>
                                                <td className={`p-6 text-right font-black tabular-nums ${p.margin > 30 ? 'text-emerald-500' : 'text-amber-500'}`}>{p.margin.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'customers' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                             <KPIMetric title="LTV Benchmark" value={analytics.avgCLV} cs={cs} colorClass="text-primary" caption="Avg Node Lifetime Value" />
                             <KPIMetric title="Retention Rate" value={`${((analytics.returningCustCount / (analytics.returningCustCount + analytics.newCustCount || 1)) * 100).toFixed(1)}%`} cs="" colorClass="text-emerald-500" caption="Returning vs New Nodes" />
                             <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center items-center">
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={[{ name: 'Returning', value: analytics.returningCustCount }, { name: 'New', value: analytics.newCustCount }]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                                                <Cell fill="#2563EB" /><Cell fill="#10B981" />
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', background: '#0F172A', color: '#fff' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4">Node Acquisition Split</p>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             <div className="bg-rose-50 dark:bg-rose-950/20 p-8 rounded-[2.5rem] border border-rose-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <WarningIcon className="w-6 h-6 text-rose-500" />
                                    <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Null Quantum Identified</h4>
                                </div>
                                <p className="text-4xl font-black text-rose-600 tabular-nums">{analytics.outOfStock.length}</p>
                                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-2">Critical Out-of-Stock Nodes</p>
                             </div>
                             <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[2.5rem] border border-amber-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <LightBulbIcon className="w-6 h-6 text-amber-500" />
                                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Low Stock Alerts</h4>
                                </div>
                                <p className="text-4xl font-black text-amber-600 tabular-nums">{analytics.lowStock.length}</p>
                                <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mt-2">Nodes Below Protocol Threshold</p>
                             </div>
                             <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="relative">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Shrinkage Audit</h4>
                                    <p className="text-4xl font-black text-rose-400 tabular-nums">{cs}{analytics.totalShrinkageVal.toFixed(2)}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Cumulative Valuation Loss</p>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'forecasting' && (
                    <div className="space-y-12">
                         <div className="bg-slate-900 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group border border-primary/20">
                            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -ml-32 -mt-32"></div>
                            <div className="relative flex flex-col md:flex-row justify-between items-center gap-12">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">AI Neural Node: Predictive Analytics</span>
                                    </div>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4">Inflow Projection (7D)</h2>
                                    <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-tight leading-relaxed">Algorithmic forecast based on historical transaction velocity and current node stability.</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 text-center min-w-[280px]">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Forecasted Yield</p>
                                    <p className="text-6xl font-black text-white tabular-nums tracking-tighter">{cs}{formatAbbreviatedNumber(analytics.forecastedRev)}</p>
                                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-center gap-4">
                                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Confidence: 91.4%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-slate-50">
                             <h3 className="text-sm font-black uppercase tracking-[0.4em] mb-10">Inventory Replenishment Engine</h3>
                             <div className="space-y-4">
                                 {analytics.inventoryNeeds.length > 0 ? analytics.inventoryNeeds.map(item => (
                                     <div key={item.name} className="flex justify-between items-center p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100">
                                         <div>
                                            <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{item.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acquisition Priority: HIGH</p>
                                         </div>
                                         <div className="text-right">
                                             <p className="text-lg font-black text-primary tabular-nums">+{item.qty * 1.5 | 0} units</p>
                                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Suggested Restock Quantum</p>
                                         </div>
                                     </div>
                                 )) : <p className="text-center py-20 text-[10px] font-black uppercase text-slate-300 tracking-widest">Replacement Protocol Silent</p>}
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'receipts' && (
                    <div className="space-y-12">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
                             <KPIMetric title="Basket Density" value={analytics.avgItems.toFixed(1)} cs="" colorClass="text-primary" caption="Avg Items Per Settlement" />
                             <KPIMetric title="Upsell Logic Rate" value={`${analytics.upsellRate.toFixed(1)}%`} cs="" colorClass="text-emerald-600" caption="Multi-Unit Conversion Success" />
                             <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Common Pairings</p>
                                <div className="space-y-3">
                                    {analytics.topCombinations.map(([name, freq]) => (
                                        <div key={name} className="flex justify-between items-center text-[10px] font-black uppercase">
                                            <span className="text-slate-500 truncate pr-4">{name}</span>
                                            <span className="text-slate-900 dark:text-white whitespace-nowrap">{freq} occurrences</span>
                                        </div>
                                    ))}
                                </div>
                             </div>
                         </div>
                    </div>
                )}

                {activeTab === 'exceptions' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                             <div className="bg-rose-50 dark:bg-rose-950/20 p-10 rounded-[3rem] border border-rose-100">
                                <div className="flex items-center gap-4 mb-8">
                                    <WarningIcon className="w-8 h-8 text-rose-500" />
                                    <h3 className="text-xl font-black text-rose-600 uppercase tracking-tighter">Excessive Discounts Flagged</h3>
                                </div>
                                <div className="space-y-4">
                                    {analytics.highDiscounts.map(s => (
                                        <div key={s.id} className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-rose-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-rose-300 transition-all" onClick={() => setDrillDownData({ title: 'Extreme Discount Audit', data: [s] })}>
                                            <div>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Protocol Deviation: 20%+</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase mt-1">Ref: {s.id.slice(-8).toUpperCase()}</p>
                                            </div>
                                            <p className="text-lg font-black text-rose-500 tabular-nums">{cs}{s.discount.toFixed(2)}</p>
                                        </div>
                                    ))}
                                    {analytics.highDiscounts.length === 0 && <p className="text-center py-10 text-[9px] font-black uppercase text-slate-400">Discount protocols nominal</p>}
                                </div>
                             </div>
                             <div className="bg-slate-50 dark:bg-gray-900 p-10 rounded-[3rem] border border-slate-100">
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] mb-10">Suspicious Node Activity</h3>
                                <div className="space-y-6">
                                     <div className="p-8 bg-white dark:bg-gray-950 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                                         <div>
                                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Voids</p>
                                             <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{analytics.voidRecords.length}</p>
                                         </div>
                                         <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase ${analytics.voidRecords.length > 5 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                             {analytics.voidRecords.length > 5 ? 'High Audit Risk' : 'Secure Threshold'}
                                         </span>
                                     </div>
                                     <div className="p-8 bg-white dark:bg-gray-950 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                                         <div>
                                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash Discrepancies</p>
                                             <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{analytics.discrepancies.length}</p>
                                         </div>
                                         <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase ${analytics.discrepancies.length > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                             {analytics.discrepancies.length > 0 ? 'Action Required' : 'Ledger Verified'}
                                         </span>
                                     </div>
                                </div>
                             </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Drill Down Modal */}
            <ModalShell 
                isOpen={!!drillDownData} 
                onClose={() => setDrillDownData(null)} 
                title={drillDownData?.title || 'Data Audit'}
                description="Granular protocol inspection"
                maxWidth="max-w-4xl"
            >
                <div className="space-y-6">
                    <div className="table-wrapper border-none rounded-none">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <tr><th className="p-4">Date</th><th className="p-4">Ref</th><th className="p-4 text-right">Value</th></tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {(drillDownData?.data || []).map((row: any) => (
                                    <tr key={row.id}>
                                        <td className="p-4 text-slate-500 tabular-nums text-xs">{new Date(row.created_at || row.date).toLocaleString()}</td>
                                        <td className="p-4 font-bold uppercase text-xs">{row.audit_link_id || row.id.slice(-8).toUpperCase()}</td>
                                        <td className="p-4 text-right font-black tabular-nums">{cs}{(row.amount || row.total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={() => handleExportSpecific(drillDownData?.data || [], 'DrillDown')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all">Export Selection CSV</button>
                </div>
            </ModalShell>

            <ReportFilterModal 
                isOpen={isFilterModalOpen} 
                onClose={() => setIsFilterModalOpen(false)} 
                onApply={(s, e) => { setStartDate(s); setEndDate(e); }}
                initialStart={startDate}
                initialEnd={endDate}
            />
        </div>
    );
};

export default Reports;
