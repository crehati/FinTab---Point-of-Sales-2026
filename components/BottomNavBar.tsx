
import React, { memo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { TodayIcon, StorefrontIcon, CounterIcon, DirectoryIcon, BriefcaseIcon, CloseIcon, InventoryIcon } from '../constants';
import type { CartItem, User, AppPermissions, ModuleKey } from '../types';
import { hasAccess } from '../lib/permissions';

interface BottomNavBarProps {
    t: (key: string) => string;
    cart: CartItem[];
    currentUser: User;
    permissions: AppPermissions;
}

interface TypedNavItem {
    to: string;
    text: string;
    icon?: React.ReactNode;
    module?: ModuleKey;
    action?: string;
    badge?: number;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ t, cart, currentUser, permissions }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Primary Tabs: Removed Reports to create more horizontal space for larger icons/text
    const navItems: TypedNavItem[] = [
        { to: '/today', text: t('bottomNav.today'), icon: <TodayIcon />, module: 'REPORTS', action: 'view_sales_reports' },
        { to: '/items', text: t('bottomNav.items'), icon: <InventoryIcon />, module: 'SALES', action: 'view_counter' },
        { to: '/counter', text: t('bottomNav.counter'), icon: <CounterIcon />, badge: cartItemCount, module: 'SALES', action: 'view_counter' },
    ];
    
    const filteredNavItems = navItems.filter(item => {
        if (!item.module || !item.action) return true;
        return hasAccess(currentUser, item.module, item.action, permissions);
    });

    const rawFinanceItems: TypedNavItem[] = [
        { to: '/reports', text: 'Financial Reports', module: 'REPORTS', action: 'view_sales_reports' },
        { to: '/cash-count', text: 'Cash Count', module: 'FINANCE', action: 'cash_count_enter' },
        { to: '/goods-costing', text: 'Goods Costing', module: 'FINANCE', action: 'goods_costing_view' },
        { to: '/goods-receiving', text: 'Goods Receiving', module: 'FINANCE', action: 'goods_receiving_enter' },
    ];

    const financeItems = rawFinanceItems.filter(item => {
        if (!item.module || !item.action) return true;
        return hasAccess(currentUser, item.module, item.action, permissions);
    });

    return (
        <>
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-6 animate-fade-in font-sans">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in">
                        <header className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1">Terminal Nodes</p>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Extended Controls</h3>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-slate-50 dark:bg-gray-800 rounded-full text-slate-400 focus:outline-none"><CloseIcon className="w-5 h-5" /></button>
                        </header>
                        <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
                            {financeItems.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={({ isActive }) => 
                                        `flex items-center justify-between p-5 rounded-2xl transition-all ${
                                            isActive 
                                            ? 'bg-primary text-white font-bold' 
                                            : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                        }`
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon && <div className="opacity-50">{item.icon}</div>}
                                        <span className="text-[11px] font-black uppercase tracking-widest">{item.text}</span>
                                    </div>
                                    <svg className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <footer className="md:hidden w-full h-[80px] bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 flex z-40 fixed bottom-0 left-0 right-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)] px-1 overflow-visible">
                <div className="flex items-center justify-between w-full overflow-visible px-2">
                    {filteredNavItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => 
                                `flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 gap-1.5 relative overflow-visible ${
                                    isActive 
                                    ? 'text-primary' 
                                    : 'text-slate-400 dark:text-slate-500'
                                }`
                            }
                        >
                            <div className="relative overflow-visible flex items-center justify-center scale-110">
                                {item.icon}
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1.5 badge-standard bg-rose-500 min-w-[16px] h-[16px] !text-[8px] border-2 border-white dark:border-gray-900">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center px-1 uppercase">
                                {item.text}
                            </span>
                        </NavLink>
                    ))}
                    
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 gap-1.5 relative overflow-visible ${
                            isMenuOpen ? 'text-primary' : 'text-slate-400 dark:text-slate-500'
                        }`}
                    >
                        <div className="relative overflow-visible flex items-center justify-center scale-110">
                            <BriefcaseIcon className="w-6 h-6" />
                            {financeItems.length > 0 && (
                                <span className="absolute top-0 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse"></span>
                            )}
                        </div>
                        <span className="text-[11px] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center px-1 uppercase">
                            {t('bottomNav.more')}
                        </span>
                    </button>
                </div>
            </footer>
        </>
    );
};

export default memo(BottomNavBar);
