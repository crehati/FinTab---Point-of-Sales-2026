
import React, { memo, useMemo, useEffect, useState, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
    AIIcon, 
    DashboardIcon,
    StorefrontIcon, 
    InventoryIcon, 
    CustomersIcon, 
    StaffIcon, 
    ReceiptsIcon,
    ProformaIcon,
    ExpensesIcon, 
    ExpenseRequestIcon,
    SettingsIcon, 
    ChatHelpIcon, 
    LogoutIcon,
    TodayIcon,
    ReportsIcon,
    CloseIcon,
    CommissionIcon,
    InvestorIcon,
    ProfileIcon,
    TransactionIcon,
    DirectoryIcon,
    CalculatorIcon,
    TruckIcon,
    BriefcaseIcon,
    ChevronDownIcon,
    WeeklyCheckIcon,
    BankIcon
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

    // Dynamic Navigation items
    const allNavItems = useMemo(() => {
        return {
            main: [
                { to: '/dashboard', text: t('sidebar.dashboard'), icon: <DashboardIcon /> },
                { to: '/assistant', text: t('sidebar.aiAssistant'), icon: <AIIcon />, module: 'AI', action: 'view_assistant' },
                { to: '/today', text: t('today.title'), icon: <TodayIcon />, module: 'REPORTS', action: 'view_sales_reports' },
                { to: '/reports', text: t('reports.title'), icon: <ReportsIcon />, module: 'REPORTS', action: 'view_sales_reports' },
                { to: '/items', text: 'Internal Items', icon: <InventoryIcon />, module: 'SALES', action: 'view_counter' },
            ] as NavItem[],
            finance: [
                { to: '/cash-count', text: 'Cash Count', icon: <CalculatorIcon />, module: 'FINANCE', action: 'cash_count_enter' },
                { to: '/bank-accounts', text: 'Bank Accounts', icon: <BankIcon />, module: 'FINANCE', action: 'cash_count_enter' },
                { to: '/goods-costing', text: 'Goods Costing', icon: <CalculatorIcon />, module: 'FINANCE', action: 'goods_costing_view' },
                { to: '/goods-receiving', text: 'Goods Receiving', icon: <TruckIcon />, module: 'FINANCE', action: 'goods_receiving_enter' },
                { to: '/weekly-inventory-check', text: 'Weekly Inventory', icon: <WeeklyCheckIcon />, module: 'FINANCE', action: 'weekly_inventory_check_enter' },
            ] as NavItem[],
            management: [
                { to: '/inventory', text: t('sidebar.inventory'), icon: <InventoryIcon />, module: 'INVENTORY', action: 'view_inventory' },
                { to: '/receipts', text: t('sidebar.receipts'), icon: <ReceiptsIcon />, module: 'RECEIPTS', action: 'view_receipts' },
                { to: '/proforma', text: t('sidebar.proforma'), icon: <ProformaIcon />, module: 'RECEIPTS', action: 'view_proforma' },
                { to: '/transactions', text: t('transactions.title'), icon: <TransactionIcon />, module: 'SALES', action: 'view_transactions' },
                { to: '/commission', text: t('sidebar.commission'), icon: <CommissionIcon />, module: 'COMMISSIONS', action: 'view_all_commissions' },
                { to: '/expenses', text: t('sidebar.expenses'), icon: <ExpensesIcon />, module: 'EXPENSES', action: 'view_expenses' },
                { to: '/expense-requests', text: 'Expense Requests', icon: <ExpenseRequestIcon />, module: 'EXPENSE_REQUESTS', action: 'view_expense_requests' },
                { to: '/customers', text: t('sidebar.customerManagement'), icon: <CustomersIcon />, module: 'CUSTOMERS', action: 'view_customers' },
                { to: '/users', text: t('sidebar.staffManagement'), icon: <StaffIcon />, module: 'SETTINGS', action: 'manage_permissions' },
                { to: '/investors', text: t('sidebar.investors'), icon: <InvestorIcon />, module: 'INVESTORS', action: 'view_all_investors' },
            ] as NavItem[],
            app: [
                { to: '/profile', text: 'My Profile', icon: <ProfileIcon /> },
                { to: '/settings', text: t('sidebar.settings'), icon: <SettingsIcon />, module: 'SETTINGS', action: 'view_settings' },
            ] as NavItem[]
        };
    }, [t]);

    // Ensure the relevant section is open based on the current path
    useEffect(() => {
        const isFinancePath = allNavItems.finance.some(item => item.to === location.pathname);
        if (isFinancePath) {
            setIsFinanceOpen(true);
        }

        // Auto-scroll the active item into view
        const timeout = setTimeout(() => {
            if (navContainerRef.current) {
                // Find the active NavLink (usually contains bg-primary in this app's styling)
                const activeEl = navContainerRef.current.querySelector('.bg-primary, .text-primary.font-black');
                if (activeEl) {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, 150); // Small delay to allow NavLink and Collapse animations to resolve

        return () => clearTimeout(timeout);
    }, [location.pathname, allNavItems.finance, isOpen]);

    useEffect(() => {
        if (isOpen) document.body.classList.add('no-scroll');
        else document.body.classList.remove('no-scroll');
        return () => document.body.classList.remove('no-scroll');
    }, [isOpen]);

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
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) => 
                                `flex items-center px-4 py-3 rounded-2xl transition-all group ${
                                    isActive 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-gray-800'
                                }`
                            }
                        >
                            <div className={`flex-shrink-0 transition-transform group-hover:scale-110`}>{item.icon}</div>
                            <span className="ml-4 font-bold text-sm tracking-tight">{item.text}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
        );
    };

    const FinanceSection: React.FC<{ items: NavItem[] }> = ({ items }) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-6">
                <button 
                    onClick={() => setIsFinanceOpen(!isFinanceOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-gray-800 transition-all group mb-1"
                >
                    <div className="flex items-center">
                        <div className="flex-shrink-0 transition-transform group-hover:scale-110"><BriefcaseIcon /></div>
                        <span className="ml-4 font-bold text-sm tracking-tight">Finance & Controls</span>
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isFinanceOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isFinanceOpen && (
                    <div className="space-y-1 ml-4 border-l-2 border-slate-100 dark:border-gray-800 pl-2 animate-fade-in">
                        {items.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => 
                                    `flex items-center px-4 py-2 rounded-xl transition-all group ${
                                        isActive 
                                        ? 'text-primary font-black' 
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`
                                }
                            >
                                <span className="text-[11px] font-bold uppercase tracking-widest">{item.text}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden transition-opacity"/>}
            <aside className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 flex flex-col z-[60] lg:z-40 border-r border-slate-100 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-20 flex items-center justify-center px-6 flex-shrink-0 bg-[#101F3E] relative">
                    <h2 className="text-white text-2xl font-bold tracking-[0.3em] select-none pl-[0.3em]">FinTab</h2>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="lg:hidden absolute right-4 p-2 text-slate-300 hover:text-white transition-all active:scale-90"
                    >
                        <CloseIcon />
                    </button>
                </div>
                <nav ref={navContainerRef} className="flex-1 px-4 py-8 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="flex-1">
                        <NavSection items={mainNavItems} />
                        <FinanceSection items={financeNavItems} />
                        <NavSection title="Organization" items={managementNavItems} />
                        <NavSection title="My Terminal" items={appNavItems} />
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-50 dark:border-gray-800">
                        <div className="bg-slate-50 dark:bg-gray-800/40 p-6 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative flex-shrink-0">
                                    <img src={currentUser?.avatarUrl} className="w-12 h-12 rounded-2xl object-cover border-4 border-white dark:border-gray-700 shadow-md" alt="Avatar" />
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-white dark:border-gray-800 rounded-full shadow-sm"></div>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Session Active</p>
                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase truncate tracking-tight">{currentUser?.name}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsLogoutConfirmOpen(true)}
                                className="w-full py-4 bg-white dark:bg-gray-900 text-slate-400 hover:text-rose-500 border border-slate-100 dark:border-gray-700 hover:border-rose-100 dark:hover:border-rose-900/30 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm"
                            >
                                <LogoutIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </nav>
            </aside>

            <ConfirmationModal 
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={onLogout}
                title="Terminate Terminal Session"
                message="Confirming this will end your current authorization. All local nodes will be locked until re-authentication."
                confirmLabel="Terminate"
                variant="danger"
                isIrreversible={false}
            />
        </>
    );
};

export default memo(Sidebar);
