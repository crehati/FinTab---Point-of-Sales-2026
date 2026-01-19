
// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Product, ReceiptSettingsData, User, Customer, AppPermissions, OwnerSettings } from '../types';
import Card from './Card';
import { hasAccess } from '../lib/permissions';
import { formatCurrency, formatAbbreviatedNumber, exportToCsv, isRateLimited } from '../lib/utils';
import { ReportsIcon, WarningIcon, DownloadJpgIcon, TodayIcon } from '../constants';
import ReportFilterModal from './ReportFilterModal';

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

const KPIMetric: React.FC<{ title: string; value: number | string; cs: string; colorClass?: string; caption?: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", caption }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between h-full group hover:shadow-xl transition-all cursor-help" title={typeof value === 'number' ? formatCurrency(value, cs) : value}>
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">{title}</p>
            <p className={`text-4xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {typeof value === 'number' ? `${cs}${formatAbbreviatedNumber(value)}` : value}
            </p>
        </div>
        {caption && (<div className="mt-8"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{caption}</p></div>)}
    </div>
);

const Reports: React.FC<ReportsProps> = ({ sales, products, expenses, customers, users, t, receiptSettings, currentUser, permissions, ownerSettings, ledgerEntries = [] }) => {
    const cs = receiptSettings.currencySymbol;
    const isPrivileged = hasAccess(currentUser, 'REPORTS', 'view_profit_reports', permissions);
    
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    const metrics = useMemo(() => {
        const rev = filteredLedger.filter(l => l.type === 'SALE').reduce((s, l) => s + l.amount, 0);
        const exp = filteredLedger.filter(l => l.type === 'EXPENSE').reduce((s, l) => s + Math.abs(l.amount), 0);
        
        const cogs = filteredLedger.filter(l => l.type === 'SALE').reduce((sum, l) => {
            const sale = (sales || []).find(s => s.id === l.id);
            if (!sale) return sum;
            return sum + (sale.items || []).reduce((itemSum, item) => {
                const p = (products || []).find(prod => prod.id === item.product.id);
                return itemSum + ((p?.costPrice || 0) * item.quantity);
            }, 0);
        }, 0);

        return { rev, exp, grossProfit: Math.max(0, rev - cogs) };
    }, [filteredLedger, sales, products]);

    const handleExportLedger = () => {
        if (isRateLimited('export-ledger', 10000)) return;
        const data = filteredLedger.map(l => ({ timestamp: l.created_at || l.date, type: l.type, amount: l.amount, ref_id: l.audit_link_id, actor_id: l.actor_id }));
        exportToCsv(`FinTab_Ledger_${new Date().toISOString()}.csv`, data);
    };

    if (!isPrivileged && currentUser.role !== 'Owner') {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="text-center space-y-6">
                    <WarningIcon className="w-20 h-20 text-rose-500 mx-auto" />
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Authorization Failure</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Access clearance for Profit Analytics required.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
             <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-12">
                    <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner">
                            <ReportsIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Financial Ledger</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-6">Enterprise Yield & Governance Audit</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                         <button 
                            onClick={() => setIsFilterModalOpen(true)}
                            className="px-12 py-5 bg-white/5 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-4 border border-white/10 backdrop-blur-md"
                         >
                             <TodayIcon className="w-5 h-5" /> {startDate || endDate ? `${startDate || '...'} - ${endDate || '...'}` : 'Filter Protocol'}
                         </button>
                         <button onClick={handleExportLedger} className="px-12 py-5 bg-white/5 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-4 border border-white/10 backdrop-blur-md">
                             <DownloadJpgIcon className="w-5 h-5" /> Export Protocol CSV
                         </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                <KPIMetric title="Revenue" value={metrics.rev} cs={cs} colorClass="text-emerald-500" caption="Gross Terminal Inflow" />
                <KPIMetric title="Gross Profit" value={metrics.grossProfit} cs={cs} colorClass="text-emerald-500" caption="Pre-Operating Yield" />
                <KPIMetric title="Expenses" value={metrics.exp} cs={cs} colorClass="text-rose-500" caption="Authorized Ledger Outflow" />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden">
                <header className="px-10 py-10 border-b dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                        <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Detailed Audit Trail</h3>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredLedger.length} Sequence(s)</span>
                </header>
                <div className="table-wrapper border-none rounded-none">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <tr>
                                <th className="px-10 py-8">Timestamp</th>
                                <th className="px-10 py-8">Protocol Class</th>
                                <th className="px-10 py-8">Audit ID</th>
                                <th className="px-10 py-8 text-right">Value Shift</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                            {filteredLedger.slice(0, 50).map(l => (
                                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-8 text-[11px] font-black text-slate-400 tabular-nums uppercase">{new Date(l.created_at || l.date).toLocaleString()}</td>
                                    <td className="px-10 py-8">
                                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${l.type === 'SALE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {l.type}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-tighter">{l.audit_link_id}</td>
                                    <td className={`px-10 py-8 text-right font-black tabular-nums text-xl ${l.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {l.amount > 0 ? '+' : ''}{cs}{Math.abs(l.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
