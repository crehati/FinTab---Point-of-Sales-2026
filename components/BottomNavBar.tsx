
import React, { memo, useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    TodayIcon, 
    CartIcon, 
    BriefcaseIcon, 
    CloseIcon, 
    InventoryIcon,
    DashboardIcon,
    ReportsIcon,
    CalculatorIcon,
    TruckIcon,
    BankIcon,
    WeeklyCheckIcon
} from '../constants';
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
    icon: React.ReactNode;
    module?: ModuleKey;
    action?: string;
    badge?: number;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ t, cart, currentUser, permissions }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const cartItemCount = useMemo(() => 
        (cart || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
    , [cart]);

    const navItems: TypedNavItem[] = [
        { to: '/dashboard', text: t('dashboard'), icon: <DashboardIcon /> },
        { to: '/today', text: t('today'), icon: <TodayIcon />, module: 'REPORTS', action: 'view_sales_reports' },
        { to: '/items', text: t('internalItems'), icon: <InventoryIcon />, module: 'SALES', action: 'view_counter' },
        { to: '/counter', text: t('counter') || 'Counter', icon: <CartIcon />, badge: cartItemCount, module: 'SALES', action: 'view_counter' },
    ];
    
    const filteredNavItems = navItems.filter(item => {
        if (!item.module || !item.action) return true;
        return hasAccess(currentUser, item.module, item.action, permissions);
    });

    const rawFinanceItems: TypedNavItem[] = [
        { to: '/reports', text: t('reports'), icon: <ReportsIcon />, module: 'REPORTS', action: 'view_sales_reports' },
        { to: '/cash-count', text: t('cashVerify'), icon: <CalculatorIcon />, module: 'FINANCE', action: 'cash_count_enter' },
        { to: '/goods-costing', text: t('valuation'), icon: <CalculatorIcon />, module: 'FINANCE', action: 'goods_costing_view' },
        { to: '/goods-receiving', text: t('inventory'), icon: <TruckIcon />, module: 'FINANCE', action: 'goods_receiving_enter' },
        { to: '/bank-accounts', text: t('currency'), icon: <BankIcon />, module: 'FINANCE', action: 'cash_count_enter' },
        { to: '/weekly-inventory-check', text: t('weeklyCheck'), icon: <WeeklyCheckIcon />, module: 'FINANCE', action: 'weekly_inventory_check_enter' },
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
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in origin-bottom">
                        <header className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-800/50">
                            <div>
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1">Extended Hub</p>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Tools & Finance</h3>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-white dark:bg-gray-800 rounded-full text-slate-400 shadow-sm focus:outline-none active:scale-90 transition-transform">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </header>
                        <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-gray-900">
                            {financeItems.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={({ isActive }) => 
                                        `flex items-center justify-between p-5 rounded-2xl transition-all ${
                                            isActive 
                                            ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20 scale-[1.02]' 
                                            : 'bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                                        }`
                                    }
                                >
                                    <span className="text-[11px] font-black uppercase tracking-widest">{item.text}</span>
                                    <svg className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <footer className="md:hidden w-full h-[84px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-gray-800 flex z-40 fixed bottom-0 left-0 right-0 shadow-[0_-4px_30px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)] px-2 overflow-visible">
                <div className="flex items-center justify-between w-full overflow-visible px-2 max-w-2xl mx-auto">
                    {filteredNavItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => 
                                `flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 gap-1.5 relative overflow-visible active:scale-95 ${
                                    isActive 
                                    ? 'text-primary' 
                                    : 'text-slate-400 dark:text-slate-600'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative overflow-visible flex items-center justify-center">
                                        {React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-6 h-6' }) : item.icon}
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <span className="absolute -top-2 -right-2 badge-standard bg-rose-500 min-w-[18px] h-[18px] !text-[8px] border-2 border-white dark:border-gray-900 flex items-center justify-center font-black animate-scale-in shadow-sm">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                        {isActive && <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(37,99,235,0.4)] animate-fade-in" />}
                                    </div>
                                    <span className="text-[9px] font-black tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center px-1 uppercase">
                                        {item.text}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                    
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 gap-1.5 relative overflow-visible active:scale-95 ${
                            isMenuOpen ? 'text-primary' : 'text-slate-400 dark:text-slate-600'
                        }`}
                    >
                        <div className="relative overflow-visible flex items-center justify-center">
                            <BriefcaseIcon className="w-6 h-6" />
                            {financeItems.length > 0 && (
                                <span className="absolute top-0 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse-subtle shadow-sm"></span>
                            )}
                        </div>
                        <span className="text-[9px] font-black tracking-tight whitespace-nowrap overflow-hidden text-ellipsis w-full text-center px-1 uppercase">
                            {t('more') || 'More'}
                        </span>
                    </button>
                </div>
            </footer>
        </>
    );
};

export default memo(BottomNavBar);
