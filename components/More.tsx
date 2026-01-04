
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    DashboardIcon, 
    TodayIcon,
    StorefrontIcon, 
    InventoryIcon, 
    CustomersIcon, 
    StaffIcon, 
    ReceiptsIcon, 
    ProformaIcon, 
    ExpensesIcon, 
    SettingsIcon, 
    ChatHelpIcon, 
    CommissionIcon, 
    InvestorIcon,
    ProfileIcon,
    TransactionIcon
} from '../constants';
import Card from './Card';
import { AppPermissions, User, ModuleKey } from '../types';
import { hasAccess } from '../lib/permissions';


interface MoreProps {
    t: (key: string) => string;
    currentUser: User;
    permissions: AppPermissions;
}

interface MoreItem {
    to: string;
    text: string;
    icon: React.ReactNode;
    module?: ModuleKey;
    action?: string;
}

const ArrowIcon = () => (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
);

const More: React.FC<MoreProps> = ({ t, currentUser, permissions }) => {
    const managementItems: MoreItem[] = [
        { to: '/today', text: t('today.title'), icon: <TodayIcon />, module: 'REPORTS', action: 'view_sales_reports' },
        { to: '/shopfront', text: t('sidebar.shopfront'), icon: <StorefrontIcon />, module: 'SALES', action: 'view_counter' },
        { to: '/receipts', text: t('sidebar.receipts'), icon: <ReceiptsIcon />, module: 'RECEIPTS', action: 'view_receipts' },
        { to: '/proforma', text: t('sidebar.proforma'), icon: <ProformaIcon />, module: 'RECEIPTS', action: 'view_receipts' },
        { to: '/transactions', text: t('transactions.title'), icon: <TransactionIcon />, module: 'SALES', action: 'view_counter' },
        { to: '/commission', text: t('sidebar.commission'), icon: <CommissionIcon />, module: 'COMMISSIONS', action: 'view_all_commissions' },
        { to: '/inventory', text: t('sidebar.inventory'), icon: <InventoryIcon />, module: 'INVENTORY', action: 'view_inventory' },
        { to: '/expenses', text: t('sidebar.expenses'), icon: <ExpensesIcon />, module: 'EXPENSES', action: 'view_expenses' },
        { to: '/expense-requests', text: 'Expense Requests', icon: <ExpensesIcon />, module: 'EXPENSES', action: 'view_expenses' },
        { to: '/customers', text: t('sidebar.customerManagement'), icon: <CustomersIcon />, module: 'CUSTOMERS', action: 'view_customers' },
        { to: '/users', text: t('sidebar.staffManagement'), icon: <StaffIcon />, module: 'SETTINGS', action: 'manage_permissions' },
        { to: '/investors', text: t('sidebar.investors'), icon: <InvestorIcon />, module: 'INVESTORS', action: 'view_all_investors' },
    ];
    
    const applicationItems: MoreItem[] = [
        { to: '/chat-help', text: t('sidebar.chatHelp'), icon: <ChatHelpIcon />, module: 'AI', action: 'view_assistant' },
        { to: '/settings', text: t('sidebar.settings'), icon: <SettingsIcon />, module: 'SETTINGS', action: 'view_settings' },
    ];

    const accountItems: MoreItem[] = [
        { to: currentUser.role === 'Investor' ? '/investor-profile' : '/profile', text: 'My Profile', icon: <ProfileIcon /> },
    ];

    const filteredManagementItems = managementItems.filter(item => {
        if (!item.module || !item.action) return true;
        return hasAccess(currentUser, item.module, item.action, permissions);
    });
    const filteredApplicationItems = applicationItems.filter(item => {
        if (!item.module || !item.action) return true;
        return hasAccess(currentUser, item.module, item.action, permissions);
    });
    const filteredAccountItems = accountItems.filter(item => {
        if (!item.module || !item.action) return true;
        return hasAccess(currentUser, item.module, item.action, permissions);
    });

    const MenuCard: React.FC<{ title: string; items: MoreItem[] }> = ({ title, items }) => {
        if (items.length === 0) return null;
        return (
            <Card title={title}>
                <div className="divide-y divide-gray-200">
                    {items.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        >
                            <div className="flex items-center">
                                {item.icon}
                                <span className="ml-4 text-lg text-gray-700 font-medium">{item.text}</span>
                            </div>
                            <ArrowIcon />
                        </NavLink>
                    ))}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <MenuCard title="My Account" items={filteredAccountItems} />
            <MenuCard title="Management" items={filteredManagementItems} />
            <MenuCard title="Application" items={filteredApplicationItems} />
        </div>
    );
};

export default More;
