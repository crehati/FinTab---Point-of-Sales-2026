
import React, { memo, useMemo, useEffect, useState, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
    AIIcon, DashboardIcon, StorefrontIcon, InventoryIcon, CustomersIcon, StaffIcon, ReceiptsIcon, ProformaIcon, 
    ExpensesIcon, ExpenseRequestIcon, SettingsIcon, ChatHelpIcon, LogoutIcon, TodayIcon, ReportsIcon, CloseIcon, 
    CommissionIcon, InvestorIcon, ProfileIcon, TransactionIcon, CalculatorIcon, TruckIcon, BriefcaseIcon, 
    ChevronDownIcon, WeeklyCheckIcon, BankIcon 
} from '../constants';
import type { CartItem, User, AppPermissions, BusinessProfile, OwnerSettings, ModuleKey } from '../types';
import { hasAccess } from '../lib/permissions';
import ConfirmationModal from './ConfirmationModal';

interface SidebarProps {
    t: (key: string) => string;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    cart: CartItem[];
    currentUser: User;
    onLogout: () => void;
    permissions: AppPermissions;
    businessProfile: BusinessProfile | null;
    ownerSettings: OwnerSettings;
    systemLogo: string;
    isSafeMode?: boolean;
}

interface NavItem {
    to: string;
    text: string;
    icon: React.ReactNode;
    module?: ModuleKey;
    action?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ t, isOpen, setIsOpen, cart, currentUser, onLogout, permissions, businessProfile, ownerSettings, systemLogo, isSafeMode = false }) => {
    const location = useLocation();
    const navContainerRef = useRef<HTMLElement>(null);
    const [isFinanceOpen, setIsFinanceOpen] = useState(true);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    // Explicitly type the object to ensure ModuleKey compatibility
    const allNavItems: Record<string, NavItem[]> = useMemo(() => ({
        main: [
            { to: '/dashboard', text: t('dashboard'), icon: <DashboardIcon /> },
            { to: '/today', text: t('today'), icon: <TodayIcon />, module: 'REPORTS', action: 'view_sales_reports' },
            { to: '/reports', text: t('reports'), icon: <ReportsIcon />, module: 'REPORTS', action: 'view_sales_reports' },
            { to: '/items', text: t('internalItems'), icon: <InventoryIcon />, module: 'SALES', action: 'view_counter' },
        ],
        finance: [
            { to: '/cash-count', text: t('cashVerify'), icon: <CalculatorIcon />, module: 'FINANCE', action: 'cash_count_enter' },
            { to: '/bank-accounts', text: t('currency'), icon: <BankIcon />, module: 'FINANCE', action: 'cash_count_enter' },
            { to: '/goods-costing', text: t('valuation'), icon: <CalculatorIcon />, module: 'FINANCE', action: 'goods_costing_view' },
            { to: '/goods-receiving', text: t('inventory'), icon: <TruckIcon />, module: 'FINANCE', action: 'goods_receiving_enter' },
            { to: '/weekly-inventory-check', text: t('weeklyCheck'), icon: <WeeklyCheckIcon />, module: 'FINANCE', action: 'weekly_inventory_check_enter' },
        ],
        management: [
            { to: '/inventory', text: t('inventory'), icon: <InventoryIcon />, module: 'INVENTORY', action: 'view_inventory' },
            { to: '/receipts', text: t('receipts'), icon: <ReceiptsIcon />, module: 'RECEIPTS', action: 'view_receipts' },
            { to: '/proforma', text: t('proforma'), icon: <ProformaIcon />, module: 'RECEIPTS', action: 'view_proforma' },
            { to: '/transactions', text: t('pipeline'), icon: <TransactionIcon />, module: 'SALES', action: 'view_transactions' },
            { to: '/commission', text: t('commissions'), icon: <CommissionIcon />, module: 'COMMISSIONS', action: 'view_all_commissions' },
            { to: '/expenses', text: t('expenses'), icon: <ExpensesIcon />, module: 'EXPENSES', action: 'view_expenses' },
            { to: '/expense-requests', text: t('expenseRequests'), icon: <ExpenseRequestIcon />, module: 'EXPENSE_REQUESTS', action: 'view_expense_requests' },
            { to: '/customers', text: t('customers'), icon: <CustomersIcon />, module: 'CUSTOMERS', action: 'view_customers' },
            { to: '/users', text: t('personnel'), icon: <StaffIcon />, module: 'SETTINGS', action: 'manage_permissions' },
            { to: '/investors', text: t('investors'), icon: <InvestorIcon />, module: 'INVESTORS', action: 'view_all_investors' },
        ],
        app: [
            { to: '/profile', text: t('identity'), icon: <ProfileIcon /> },
            { to: '/settings', text: t('settings'), icon: <SettingsIcon />, module: 'SETTINGS', action: 'view_settings' },
        ]
    }), [t]);

    const filterNavItems = (items: NavItem[]) => items.filter(item => {
        if (!item.module || !item.action) return true;
        return hasAccess(currentUser, item.module, item.action, permissions, isSafeMode);
    });

    const mainNavItems = filterNavItems(allNavItems.main);
    const financeNavItems = filterNavItems(allNavItems.finance);
    const managementNavItems = filterNavItems(allNavItems.management);
    const appNavItems = filterNavItems(allNavItems.app);

    const NavSection: React.FC<{title?: string, items: NavItem[]}> = ({ title, items }) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-6">
                {title && <h3 className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>}
                <div className="space-y-1">
                    {items.map(item => (
                        <NavLink key={item.to} to={item.to} onClick={() => setIsOpen(false)} className={({ isActive }) => `flex items-center px-4 py-3 rounded-2xl transition-all group ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-gray-800'}`}>
                            <div className="flex-shrink-0 transition-transform group-hover:scale-110">{item.icon}</div>
                            <span className="ml-4 font-bold text-sm tracking-tight">{item.text}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden transition-opacity"/>}
            <aside className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 flex flex-col z-[60] lg:z-40 border-r border-slate-100 dark:border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-20 flex items-center justify-center px-6 flex-shrink-0 bg-[#101F3E] relative"><h2 className="text-white text-2xl font-bold tracking-[0.3em] select-none pl-[0.3em]">FinTab</h2></div>
                <nav ref={navContainerRef} className="flex-1 px-4 py-8 overflow-y-auto custom-scrollbar flex flex-col">
                    <NavSection items={mainNavItems} />
                    <div className="mb-6">
                        <button onClick={() => setIsFinanceOpen(!isFinanceOpen)} className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-gray-800 transition-all group mb-1">
                            <div className="flex items-center"><div className="flex-shrink-0 transition-transform group-hover:scale-110"><BriefcaseIcon /></div><span className="ml-4 font-bold text-sm tracking-tight">{t('financeHeader')}</span></div>
                            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isFinanceOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isFinanceOpen && <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-gray-800 pl-2 animate-fade-in">{financeNavItems.map(item => (<NavLink key={item.to} to={item.to} onClick={() => setIsOpen(false)} className={({ isActive }) => `flex items-center px-4 py-2 rounded-xl transition-all group ${isActive ? 'text-primary font-black' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}><span className="text-[11px] font-bold uppercase tracking-widest">{item.text}</span></NavLink>))}</div>}
                    </div>
                    <NavSection title={t('orgHeader')} items={managementNavItems} />
                    <NavSection title={t('terminalHeader')} items={appNavItems} />
                    <div className="mt-auto pt-8 border-t border-slate-50 dark:border-gray-800">
                        <button onClick={() => setIsLogoutConfirmOpen(true)} className="w-full py-4 bg-slate-50 dark:bg-gray-800/40 text-slate-400 hover:text-rose-500 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-3"><LogoutIcon className="w-4 h-4" />{t('logout')}</button>
                    </div>
                </nav>
            </aside>
            <ConfirmationModal isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} onConfirm={onLogout} title={t('logout')} message="End session?" confirmLabel={t('logout')} variant="danger" />
        </>
    );
};

export default memo(Sidebar);
