
import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import type { AnomalyAlert, ReceiptSettingsData, User } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import { WarningIcon, CloseIcon, LightBulbIcon, SearchIcon } from '../constants';
import SearchInput from './SearchInput';

interface AlertsPageProps {
    anomalyAlerts: AnomalyAlert[];
    onDismiss: (id: string, reason?: string) => void;
    onMarkRead: (id: string) => void;
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
}

const AlertsPage: React.FC<AlertsPageProps> = ({ anomalyAlerts, onDismiss, onMarkRead, receiptSettings, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'dismissed'>('active');

    const filteredAlerts = useMemo(() => {
        return anomalyAlerts.filter(a => {
            const matchesFilter = filter === 'all' || 
                                (filter === 'active' && !a.isDismissed) || 
                                (filter === 'dismissed' && a.isDismissed);
            const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 a.message.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [anomalyAlerts, filter, searchTerm]);

    const getSeverityStyles = (severity: AnomalyAlert['severity']) => {
        switch (severity) {
            case 'error': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'info': return 'bg-blue-50 text-blue-600 border-blue-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    return (
        <div className="space-y-10 pb-20 font-sans animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Security Center</h1>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-3">Algorithmic risk detection logs</p>
                </div>
                <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700">
                    {[
                        { id: 'active', label: 'Active Alerts' },
                        { id: 'dismissed', label: 'Audit Archive' },
                        { id: 'all', label: 'Full Log' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id as any)}
                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === t.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <Card title="Alert Ledger">
                    <div className="mb-8">
                        <SearchInput 
                            placeholder="Search protocol violations or record IDs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4 min-h-[400px]">
                        {filteredAlerts.length > 0 ? (
                            filteredAlerts.map(alert => (
                                <div key={alert.id} className={`bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-sm relative group transition-all ${!alert.isRead && !alert.isDismissed ? 'border-primary/20 bg-primary/[0.01]' : ''}`}>
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getSeverityStyles(alert.severity)}`}>
                                                    {alert.severity === 'error' ? 'High Risk' : `${alert.severity} level`}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alert.type.replace('_', ' ')} protocol</span>
                                                <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 tabular-nums uppercase">{new Date(alert.timestamp).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{alert.title}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">{alert.message}</p>
                                            </div>
                                            <div className="p-5 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-700 flex items-start gap-4">
                                                <LightBulbIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Recommended Response</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{alert.recommendation}</p>
                                                </div>
                                            </div>
                                            {alert.dismissalReason && (
                                                <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 italic">
                                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Audit Resolution Note</p>
                                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">"{alert.dismissalReason}"</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[200px]">
                                            <NavLink 
                                                to={`/${alert.type === 'cash' ? 'cash-count' : alert.type === 'costing' ? 'goods-costing' : 'goods-receiving'}`}
                                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-xl hover:opacity-90 active:scale-95 transition-all"
                                                onClick={() => onMarkRead(alert.id)}
                                            >
                                                Inspect Ledger
                                            </NavLink>
                                            {!alert.isDismissed ? (
                                                <button 
                                                    onClick={() => {
                                                        const r = prompt("Context for dismissal audit:");
                                                        onDismiss(alert.id, r || undefined);
                                                    }}
                                                    className="px-8 py-4 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center hover:text-rose-500 hover:border-rose-100 transition-all"
                                                >
                                                    Dismiss Alert
                                                </button>
                                            ) : (
                                                <div className="px-8 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-emerald-100">
                                                    Resolved
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState 
                                icon={<WarningIcon />} 
                                title="Ledger Clean" 
                                description={`Zero ${filter === 'active' ? 'active' : ''} alerts found in the current audit period.`}
                            />
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AlertsPage;
