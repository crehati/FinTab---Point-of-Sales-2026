
// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '../types';
import { BellIcon } from '../constants';
import EmptyState from './EmptyState';

interface NotificationCenterProps {
    notifications: AppNotification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClear: (id: string) => void;
}

interface LocalErrorBoundaryProps {
    children?: React.ReactNode;
}

interface LocalErrorBoundaryState {
    hasError: boolean;
}

class LocalErrorBoundary extends React.Component<LocalErrorBoundaryProps, LocalErrorBoundaryState> {
    constructor(props: LocalErrorBoundaryProps) { 
        super(props); 
        this.state = { hasError: false }; 
    }
    public static getDerivedStateFromError() { return { hasError: true }; }
    public render() {
        if (this.state.hasError) return (
            <div className="p-8 text-center bg-rose-50/30 rounded-[2rem] border border-dashed border-rose-100 m-4">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">Alert System Interrupted. Identity verified but component state unreachable.</p>
            </div>
        );
        return this.props.children;
    }
}

const TypeIcon: React.FC<{ type: AppNotification['type'] }> = ({ type }) => {
    switch (type) {
        case 'success':
            return (
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
            );
        case 'error':
            return (
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
            );
        case 'warning':
        case 'action_required':
            return (
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
            );
        default:
            return (
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            );
    }
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications = [], onMarkAsRead, onMarkAllAsRead, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const unreadCount = Array.isArray(notifications) ? notifications.filter(n => n && !n.isRead).length : 0;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: AppNotification) => {
        if (!notification) return;
        onMarkAsRead(notification.id);
        if (notification.link) navigate(notification.link);
        setIsOpen(false);
    };

    return (
        <div className="relative font-sans" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2.5 rounded-2xl transition-all relative group ${isOpen ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary'}`}
                aria-label="Notification Center"
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 badge-standard bg-rose-600 scale-90 border-2 border-white dark:border-gray-900 animate-pulse font-black min-w-[20px] h-[20px] flex items-center justify-center text-[9px] z-[60] shadow-lg">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-[320px] sm:w-[420px] bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 z-[100] animate-fade-in-up origin-top-right overflow-hidden">
                    <header className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-800/50">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Terminal Alerts</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                {unreadCount === 0 ? 'Protocol clear' : `${unreadCount} unread events`}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={onMarkAllAsRead}
                                className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </header>

                    <main className="max-h-[480px] overflow-y-auto custom-scrollbar">
                        <LocalErrorBoundary>
                            {Array.isArray(notifications) && notifications.length > 0 ? (
                                <div className="divide-y divide-slate-50 dark:divide-gray-800">
                                    {notifications.map(notification => {
                                        if (!notification) return null;
                                        return (
                                            <div 
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-6 flex gap-4 cursor-pointer transition-all relative group ${notification.isRead ? 'opacity-60' : 'bg-primary/[0.02]'}`}
                                            >
                                                {!notification.isRead && <div className="absolute left-0 top-6 bottom-6 w-1 bg-primary rounded-r-full shadow-sm"></div>}
                                                <TypeIcon type={notification.type} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <p className={`text-xs font-black uppercase tracking-tighter truncate ${notification.isRead ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                            {notification.title}
                                                        </p>
                                                        <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase whitespace-nowrap pt-0.5 tabular-nums">
                                                            {notification.timestamp ? new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">{notification.message}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState 
                                    icon={<BellIcon />} 
                                    title="No alerts right now." 
                                    description="Operational protocols are within safe thresholds."
                                    compact
                                />
                            )}
                        </LocalErrorBoundary>
                    </main>

                    <footer className="p-6 border-t dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50">
                        <button onClick={() => { navigate('/profile'); setIsOpen(false); }} className="w-full py-4 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:border-primary/20 transition-all shadow-sm">Review Complete History</button>
                    </footer>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
