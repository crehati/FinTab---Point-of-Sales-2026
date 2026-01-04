
import type { Role, AppPermissions, UserPermissions, User, ModuleKey } from '../types';

export interface PermissionActionInfo {
    key: string;
    name: string;
    description: string;
}

export interface ModuleConfig {
    key: ModuleKey;
    name: string;
    actions: PermissionActionInfo[];
}

export const MODULE_CONFIG: ModuleConfig[] = [
    {
        key: 'SALES',
        name: 'Sales / Counter',
        actions: [
            { key: 'view_counter', name: 'View Counter', description: 'Access storefront and checkout.' },
            { key: 'create_sale', name: 'Create Sale', description: 'Finalize transactions.' },
            { key: 'cash_sale', name: 'Cash Settlement', description: 'Process cash-based payments.' },
            { key: 'bank_transfer', name: 'Bank Transfer', description: 'Allow bank receipt/transfer payments.' },
            { key: 'view_transactions', name: 'Cash Transactions', description: 'Access the global cash transactions history.' },
            { key: 'view_client_requests', name: 'Client Request', description: 'Monitor incoming requests from the public shopfront.' },
            { key: 'process_client_requests', name: 'Process Client Requests', description: 'Convert public inquiries into finalized sales.' },
            { key: 'apply_discount', name: 'Apply Discount', description: 'Modify prices during checkout.' },
            { key: 'apply_gift_free', name: 'Apply Gift/Free', description: 'Zero out item prices.' },
            { key: 'add_tax', name: 'Add Tax', description: 'Modify tax at checkout.' },
            { key: 'edit_sale', name: 'Edit Sale', description: 'Modify existing sale records.' },
            { key: 'delete_sale', name: 'Delete Sale', description: 'Purge sale records.' },
            { key: 'give_credit', name: 'Give Credit', description: 'Allow debt transactions.' },
        ]
    },
    {
        key: 'INVENTORY',
        name: 'Inventory',
        actions: [
            { key: 'view_inventory', name: 'View Inventory', description: 'Access product registry.' },
            { key: 'create_product', name: 'Create Product', description: 'Enroll new items.' },
            { key: 'edit_product', name: 'Edit Product', description: 'Modify SKU details.' },
            { key: 'adjust_stock', name: 'Adjust Stock', description: 'Perform manual stock shifts.' },
            { key: 'view_cost_price', name: 'View Cost Price', description: 'See unit acquisition costs.' },
            { key: 'admin_inventory', name: 'Admin Inventory', description: 'Full inventory control.' },
        ]
    },
    {
        key: 'RECEIPTS',
        name: 'Receipts & Proforma',
        actions: [
            { key: 'view_receipts', name: 'View Receipts', description: 'Access sales ledger.' },
            { key: 'create_receipt', name: 'Create Receipt', description: 'Issue digital receipts.' },
            { key: 'edit_receipt', name: 'Edit Receipt', description: 'Modify issued receipts.' },
            { key: 'return_receipt', name: 'Return Receipt', description: 'Process stock returns.' },
            { key: 'delete_receipt', name: 'Delete Receipt', description: 'Purge receipt records.' },
            { key: 'view_proforma', name: 'View Proforma', description: 'Access proforma ledger.' },
            { key: 'create_proforma', name: 'Create Proforma', description: 'Issue quotes.' },
            { key: 'edit_proforma', name: 'Edit Proforma', description: 'Modify quotes.' },
        ]
    },
    {
        key: 'CUSTOMERS',
        name: 'Customers',
        actions: [
            { key: 'view_customers', name: 'View Customers', description: 'Access client registry.' },
            { key: 'create_customer', name: 'Create Customer', description: 'Enroll new clients.' },
            { key: 'edit_customer', name: 'Edit Customer', description: 'Modify client data.' },
            { key: 'admin_customers', name: 'Admin Customers', description: 'Full client control.' },
        ]
    },
    {
        key: 'EXPENSES',
        name: 'Expenses',
        actions: [
            { key: 'view_expenses', name: 'View Expenses', description: 'Access expense ledger.' },
            { key: 'add_expense', name: 'Add Expense', description: 'Log expenditure.' },
            { key: 'modify_expense', name: 'Modify Expense', description: 'Edit expense records.' },
            { key: 'delete_expense', name: 'Delete Expense', description: 'Archive expense records.' },
            { key: 'approve_expense', name: 'Approve Expense', description: 'Authorize pending items.' },
        ]
    },
    {
        key: 'EXPENSE_REQUESTS',
        name: 'Expense Requests',
        actions: [
            { key: 'view_expense_requests', name: 'View Requests', description: 'Monitor pending queue.' },
            { key: 'create_expense_request', name: 'Create Request', description: 'Submit for review.' },
            { key: 'approve_expense_request', name: 'Approve Request', description: 'Authorize staff spend.' },
        ]
    },
    {
        key: 'COMMISSIONS',
        name: 'Commissions & Withdrawals',
        actions: [
            { key: 'view_own_commissions', name: 'View Own', description: 'See personal yield.' },
            { key: 'request_commission_withdrawal', name: 'Request Payout', description: 'Initiate liquidation.' },
            { key: 'view_all_commissions', name: 'View All', description: 'Monitor team performance.' },
            { key: 'approve_commission_withdrawal', name: 'Approve Payout', description: 'Authorize liquidation.' },
        ]
    },
    {
        key: 'INVESTORS',
        name: 'Investors',
        actions: [
            { key: 'view_own_investment', name: 'View Own Stake', description: 'See personal capital.' },
            { key: 'view_own_profit_share', name: 'View Own Yield', description: 'See personal profit.' },
            { key: 'request_investor_withdrawal', name: 'Request Dividend', description: 'Request profit payout.' },
            { key: 'view_all_investors', name: 'View All', description: 'See global capital pool.' },
            { key: 'approve_investor_withdrawal', name: 'Approve Dividend', description: 'Authorize capital payout.' },
        ]
    },
    {
        key: 'REPORTS',
        name: 'Reports Page',
        actions: [
            { key: 'view_sales_reports', name: 'View Sales Reports', description: 'Access revenue and performance reports.' },
            { key: 'view_profit_reports', name: 'View Profit Reports', description: 'Access sensitive earnings and margin reports.' },
            { key: 'view_inventory_reports', name: 'View Inventory Reports', description: 'Access stock velocity reports.' },
        ]
    },
    {
        key: 'FINANCE',
        name: 'Finance & Controls',
        actions: [
            { key: 'cash_count_enter', name: 'Daily Cash Verification', description: 'Perform daily cash count entry.' },
            { key: 'cash_count_verify', name: 'Verify Cash (2nd Sign)', description: 'Perform 2nd signature verification.' },
            { key: 'cash_count_approve', name: 'Approve Cash (Final)', description: 'Final owner/admin audit approval.' },
            { key: 'weekly_inventory_check_enter', name: 'Weekly Inventory Audit', description: 'Perform physical stock checks.' },
            { key: 'weekly_inventory_check_verify', name: 'Verify Stock (2nd Sign)', description: 'Verify physical stock checks.' },
            { key: 'weekly_inventory_check_approve', name: 'Approve Stock (Final)', description: 'Final stock audit approval.' },
            { key: 'goods_receiving_enter', name: 'Goods Receiving', description: 'Log arrival of new shipments.' },
            { key: 'goods_receiving_verify', name: 'Verify Goods (2nd Sign)', description: 'Perform verification on shipments.' },
            { key: 'goods_receiving_approve', name: 'Approve Goods (Final)', description: 'Final sign-off for shipment entries.' },
            { key: 'goods_costing_view', name: 'Goods Costing', description: 'Access the landed cost derivation tool.' },
        ]
    },
    {
        key: 'AI',
        name: 'AI Assistant',
        actions: [
            { key: 'view_assistant', name: 'Use AI Assistant', description: 'Access the FinTab AI intelligence node.' },
            { key: 'admin_ai', name: 'Admin AI Policy', description: 'Manage AI filtering rules and data access.' },
        ]
    },
    {
        key: 'SETTINGS',
        name: 'Settings',
        actions: [
            { key: 'view_settings', name: 'View Settings', description: 'Access the basic settings panel.' },
            { key: 'manage_business_settings', name: 'Manage Business', description: 'Change business config and profile.' },
            { key: 'manage_permissions', name: 'Staff Management', description: 'Enroll staff and control access rights.' },
            { key: 'admin_settings', name: 'Owner Controls', description: 'Access principal owner-only overrides.' },
        ]
    }
];

export const PERMISSION_CONFIG = MODULE_CONFIG.map(m => ({
    path: m.key,
    name: m.name,
    description: m.actions[0]?.description || m.name,
    availableActions: m.actions.map(a => a.key)
}));

const getFullAccess = (): UserPermissions => {
    const perms: UserPermissions = {};
    MODULE_CONFIG.forEach(m => {
        perms[m.key] = {};
        m.actions.forEach(a => {
            perms[m.key]![a.key] = true;
        });
    });
    return perms;
};

export const DEFAULT_PERMISSIONS: AppPermissions = {
    roles: {
        'Owner': getFullAccess(),
        'Admin': getFullAccess(),
        'Super Admin': getFullAccess(),
        'Manager': {
            SALES: { view_counter: true, create_sale: true, cash_sale: true, bank_transfer: true, view_transactions: true, apply_discount: true, view_client_requests: true, process_client_requests: true },
            INVENTORY: { view_inventory: true },
            CUSTOMERS: { view_customers: true, create_customer: true, edit_customer: true },
            EXPENSES: { view_expenses: true, add_expense: true },
            REPORTS: { view_sales_reports: true },
            FINANCE: { cash_count_enter: true, weekly_inventory_check_enter: true, goods_receiving_enter: true },
            AI: { view_assistant: true }
        },
        'Staff': {
            SALES: { view_counter: true, create_sale: true, cash_sale: true, bank_transfer: true, view_client_requests: true },
            INVENTORY: { view_inventory: true },
            CUSTOMERS: { view_customers: true, create_customer: true },
            EXPENSES: { view_expenses: true },
            AI: { view_assistant: true }
        },
        'Cashier': {
            SALES: { view_counter: true, create_sale: true, cash_sale: true, bank_transfer: true, view_client_requests: true },
            INVENTORY: { view_inventory: true },
            CUSTOMERS: { view_customers: true, create_customer: true },
            EXPENSES: { view_expenses: true },
            AI: { view_assistant: true }
        },
        'Investor': {
            INVESTORS: { view_own_investment: true, view_own_profit_share: true },
            AI: { view_assistant: true }
        },
        'Custom': {},
    },
    users: {}
};

export const hasAccess = (user: User | null, module: ModuleKey, action: string, permissions?: AppPermissions, isSafeMode: boolean = false): boolean => {
    if (!user) return false;
    
    if (user.role === 'Owner' || user.role === 'Super Admin') return true;

    if (isSafeMode && action.toLowerCase().includes('view')) {
        return true;
    }

    const normalizedAction = action.toLowerCase();

    if (user.permissions && user.permissions[module]) {
        const foundAction = Object.keys(user.permissions[module]!).find(k => k.toLowerCase() === normalizedAction);
        if (foundAction) {
            const userPerm = user.permissions[module]![foundAction];
            if (typeof userPerm === 'boolean') return userPerm;
        }
    }

    if (permissions) {
        if (permissions.users[user.id] && permissions.users[user.id][module]) {
            const foundAction = Object.keys(permissions.users[user.id][module]!).find(k => k.toLowerCase() === normalizedAction);
            if (foundAction) {
                const centralUserPerm = permissions.users[user.id][module]![foundAction];
                if (typeof centralUserPerm === 'boolean') return centralUserPerm;
            }
        }

        if (permissions.roles[user.role] && permissions.roles[user.role]![module]) {
            const foundAction = Object.keys(permissions.roles[user.role]![module]!).find(k => k.toLowerCase() === normalizedAction);
            if (foundAction) {
                const rolePerm = permissions.roles[user.role]![module]![foundAction];
                if (typeof rolePerm === 'boolean') return rolePerm;
            }
        }
    }

    const fallbackRole = DEFAULT_PERMISSIONS.roles[user.role];
    if (fallbackRole && fallbackRole[module]) {
        const foundAction = Object.keys(fallbackRole[module]!).find(k => k.toLowerCase() === normalizedAction);
        if (foundAction) {
            const fallbackRolePerm = fallbackRole[module]![foundAction];
            if (typeof fallbackRolePerm === 'boolean') return fallbackRolePerm;
        }
    }

    return false;
};
