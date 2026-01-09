// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { Sale, Product, Expense, ReceiptSettingsData, User, Customer, AppPermissions, OwnerSettings } from '../types';
import Card from './Card';
import { hasAccess } from '../lib/permissions';
import { formatCurrency, formatAbbreviatedNumber, exportToCsv, isRateLimited } from '../lib/utils';
import { FINALIZED_SALE_STATUSES, ReportsIcon, WarningIcon, CloseIcon, DownloadJpgIcon } from '../constants';

interface ReportsProps {
    sales: any[];
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

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const KPIMetric: React.FC<{ title: string; value: number | string; cs: string; colorClass?: string; caption?: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", caption }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-xl transition-all cursor-help" title={typeof value === 'number' ? formatCurrency(value, cs) : value}>
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {typeof value === 'number' ? `${cs}${formatAbbreviatedNumber(value)}` : value}
            </p>
        </div>
        {caption && (<div className="mt-6"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{caption}</p></div>)}
    </div>
);

const Reports: React.FC<ReportsProps> = ({ sales, products, expenses, customers, users, t, receiptSettings, currentUser, permissions, ownerSettings, ledgerEntries = [] }) => {
    const [startDateStr, setStartDateStr] = useState<string>('');
    const [endDateStr, setEndDateStr] = useState<string>('');
    const cs = receiptSettings.currencySymbol;

    const isPrivileged = hasAccess(currentUser, 'REPORTS', 'view_profit_reports', permissions);

    const filteredLedger = useMemo(() => {
        const start = startDateStr ? new Date(startDateStr) : null;
        const end = endDateStr ? new Date(endDateStr) : null;
        if (!start && !end) return ledgerEntries;
        return ledgerEntries.filter(l => {
            const d = new Date(l.created_at || l.date);
            if (start && d < start) return false;
            if (end) { const adj = new Date(end); adj.setHours(23,59,59,999); if (d > adj) return false; }
            return true;
        });
    }, [ledgerEntries, startDateStr, endDateStr]);

    const metrics = useMemo(() => {
        const rev = filteredLedger.filter(l => l.type === 'SALE').reduce((s, l) => s + l.amount, 0);
        const exp = filteredLedger.filter(l => l.type === 'EXPENSE').reduce((s, l) => s + Math.abs(l.amount), 0);
        const payouts = filteredLedger.filter(l => l.type === 'PAYOUT').reduce((s, l) => s + Math.abs(l.amount), 0);
        const net = rev - exp - payouts;
        return { rev, exp, payouts, net };
    }, [filteredLedger]);

    const handleExportLedger = () => {
        if (isRateLimited('export-ledger', 10000)) return;
        const data = filteredLedger.map(l => ({ timestamp: l.created_at || l.date, type: l.type, amount: l.amount, ref_id: l.audit_link_id, actor_id: l.actor_id }));
        exportToCsv(`FinTab_Ledger_${new Date().toISOString()}.csv`, data);
    };

    // --- B2) Automated Monthly Statement Simulation ---
    const handleGenerateMonthlyStatement = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthData = ledgerEntries.filter(l => new Date(l.created_at || l.date) >= firstDay);
        
        const summary = [
            { NODE: 'Node Presence', VALUE: receiptSettings.businessName },
            { NODE: 'Statement Cycle', VALUE: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}` },
            { NODE: 'Consolidated Inflow', VALUE: monthData.filter(l => l.type === 'SALE').reduce((s, l) => s + l.amount, 0) },
            { NODE: 'Operating Debit', VALUE: monthData.filter(l => l.type === 'EXPENSE').reduce((s, l) => s + Math.abs(l.amount), 0) },
            { NODE: 'Yield Distribution', VALUE: monthData.filter(l => l.type === 'PAYOUT').reduce((s, l) => s + Math.abs(l.amount), 0) }
        ];
        
        exportToCsv(`FinTab_Statement_${now.getFullYear()}_${now.getMonth() + 1}.csv`, summary);
    };

    if (!isPrivileged && currentUser.role !== 'Owner') {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="text-center space-y-4">
                    <WarningIcon className="w-16 h-16 text-rose-500 mx-auto" />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Identity Insufficient</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Protocol clearance for Profit Analytics required.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
             <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                            <ReportsIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Terminal Ledger</h1>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-4">Multi-Dimension Financial Audit</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <button onClick={handleGenerateMonthlyStatement} className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-xl">
                             Monthly Statement
                         </button>
                         <button onClick={handleExportLedger} className="px-8 py-4 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2">
                             <DownloadJpgIcon className="w-4 h-4" /> Export Ledger
                         </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPIMetric title="Gross Revenue" value={metrics.rev} cs={cs} colorClass="text-emerald-600" caption="Verified Inflow" />
                <KPIMetric title="Operating Debt" value={metrics.exp} cs={cs} colorClass="text-rose-600" caption="Expenses" />
                <KPIMetric title="Liquid Payouts" value={metrics.payouts} cs={cs} colorClass="text-amber-600" caption="Partner Dividends" />
                <div className="bg-primary text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-4">Net Terminal Liquidity</p>
                        <p className="text-4xl font-black tabular-nums tracking-tighter leading-none">{cs}{formatAbbreviatedNumber(metrics.net)}</p>
                    </div>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-6">Authoritative Grid Balance</p>
                </div>
            </div>

            <Card title="Global P&L Distribution">
                <div className="h-96 w-full mt-10">
                    <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={[{ name: 'Revenue', value: metrics.rev }, { name: 'Expenses', value: metrics.exp }, { name: 'Payouts', value: metrics.payouts }, { name: 'Net', value: metrics.net }]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" fill="#2563EB" stroke="#2563EB" />
                         </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter mb-8">Audited Ledger Sequences</h3>
                <div className="table-wrapper">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-gray-900">
                            <tr><th>Timestamp</th><th>Protocol Type</th><th>Audit Identifier</th><th className="text-right">Value Delta</th></tr>
                        </thead>
                        <tbody>
                            {filteredLedger.slice(0, 50).map(l => (
                                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="text-[10px] font-bold text-slate-400 tabular-nums">{new Date(l.created_at || l.date).toLocaleString()}</td>
                                    <td><span className={`status-badge !text-[8px] ${l.type === 'SALE' ? 'status-approved' : 'status-rejected'}`}>{l.type}</span></td>
                                    <td className="text-[10px] font-black uppercase text-slate-400">{l.audit_link_id}</td>
                                    <td className={`text-right font-black tabular-nums ${l.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{cs}{l.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;