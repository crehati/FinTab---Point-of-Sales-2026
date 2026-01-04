
import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import type { AnomalyAlert, ReceiptSettingsData, User, BusinessSettingsData } from '../types';
import { WarningIcon, CloseIcon, LightBulbIcon } from '../constants';

interface AlertsWidgetProps {
    alerts: AnomalyAlert[];
    onDismiss: (id: string, reason?: string) => void;
    onMarkRead: (id: string) => void;
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
    businessSettings: BusinessSettingsData;
}

const AlertsWidget: React.FC<AlertsWidgetProps> = ({ alerts, onDismiss, onMarkRead, receiptSettings, currentUser, businessSettings }) => {
    const isOwner = currentUser.role === 'Owner' || currentUser.role === 'Super Admin';
    const workflow = businessSettings?.workflowRoles || {};

    const activeAlerts = useMemo(() => {
        const filtered = alerts.filter(a => !a.isDismissed);
        if (isOwner) return filtered;

        // Staff-specific filtering: Only show alerts relevant to their assigned roles
        return filtered.filter(alert => {
            if (alert.type === 'cash' && (workflow.cashCounter?.some(u => u.userId === currentUser.id) || workflow.cashVerifier?.some(u => u.userId === currentUser.id))) return true;
            if (alert.type === 'receiving' && (workflow.receivingClerk?.some(u => u.userId === currentUser.id) || workflow.receivingVerifier?.some(u => u.userId === currentUser.id))) return true;
            if (alert.type === 'costing' && workflow.costingManager?.some(u => u.userId === currentUser.id)) return true;
            return false;
        });
    }, [alerts, isOwner, workflow, currentUser.id]);

    const unreadCount = activeAlerts.filter(a => !a.isRead).length;
    const displayAlerts = activeAlerts.slice(0, 5);

    const getSeverityStyles = (severity: AnomalyAlert['severity']) => {
        switch (severity) {
            case 'error': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'info': return 'bg-blue-50 text-blue-600 border-blue-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const getTypeLabel = (type: AnomalyAlert['type']) => {
        switch (type) {
            case 'cash': return 'Cash Count';
            case 'costing': return 'Goods Costing';
            case 'receiving': return 'Goods Receiving';
            default: return 'Finance';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-gray-700 flex flex-col font-sans overflow-hidden">
            <header className="px-8 py-6 border-b dark:border-gray-700 flex justify-between items-center bg-slate-50/30 dark:bg-gray-900/30">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Alerts</h3>
                    {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm animate-pulse-subtle">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <NavLink to="/alerts" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All →</NavLink>
            </header>

            <main className="flex-1 min-h-[320px]">
                {activeAlerts.length > 0 ? (
                    <div className="divide-y dark:divide-gray-700">
                        {displayAlerts.map((alert) => (
                            <div 
                                key={alert.id} 
                                className={`p-6 hover:bg-slate-50/50 dark:hover:bg-gray-900/50 transition-all group relative ${!alert.isRead ? 'bg-primary/[0.01]' : ''}`}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getSeverityStyles(alert.severity)}`}>
                                                {alert.severity === 'error' ? 'High' : alert.severity}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getTypeLabel(alert.type)}</span>
                                            <span className="text-[8px] font-medium text-slate-300 dark:text-slate-600 tabular-nums">
                                                {new Date(alert.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        <p className={`text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 truncate ${!alert.isRead ? 'font-black' : ''}`}>
                                            {alert.title}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-4 leading-relaxed font-medium">
                                            {alert.message}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <NavLink 
                                                to={`/${alert.type === 'cash' ? 'cash-count' : alert.type === 'costing' ? 'goods-costing' : 'goods-receiving'}`}
                                                className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                                                onClick={() => onMarkRead(alert.id)}
                                            >
                                                Inspect Record
                                            </NavLink>
                                            {!alert.isRead && (
                                                <button 
                                                    onClick={() => onMarkRead(alert.id)}
                                                    className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button 
                                            onClick={() => {
                                                const reason = prompt("Dismissal context (optional):");
                                                onDismiss(alert.id, reason || undefined);
                                            }}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <CloseIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-gray-900 rounded-[2rem] flex items-center justify-center mb-6 opacity-40">
                             <WarningIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">No alerts right now.</p>
                        <p className="mt-3 text-slate-400 text-xs font-medium max-w-[200px] leading-relaxed">
                            Operational protocols are within safe thresholds.
                        </p>
                    </div>
                )}
            </main>

            {activeAlerts.length > 5 && (
                <footer className="p-6 border-t dark:border-gray-700 bg-slate-50/20">
                     <NavLink to="/alerts" className="block w-full py-4 text-center bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all">
                        View {activeAlerts.length - 5} More Active Alerts
                    </NavLink>
                </footer>
            )}
        </div>
    );
};

export default AlertsWidget;
