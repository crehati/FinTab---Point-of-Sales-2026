
// @ts-nocheck
import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase, isSupabaseActive } from './lib/supabase';
import { getStoredItem, setStoredItemAndDispatchEvent, getSystemLogo, formatCurrency, isRateLimited } from './lib/utils';
import { 
    BellIcon, 
    MenuIcon,
    CartIcon,
    CounterIcon,
    DEFAULT_RECEIPT_SETTINGS,
    DEFAULT_OWNER_SETTINGS,
    DEFAULT_BUSINESS_SETTINGS,
    FINALIZED_SALE_STATUSES,
    WarningIcon,
    CloseIcon,
    DUMMY_PRODUCTS
} from './constants';
import { DEFAULT_PERMISSIONS, hasAccess } from './lib/permissions';
import { translations } from './lib/translations';
import type { AppNotification, Sale, User, Withdrawal, Expense, ExpenseRequest, CashCount, GoodsCosting, GoodsReceiving, AnomalyAlert, WeeklyInventoryCheck, Product, ModuleKey, Customer, ProductVariant, CustomPayment, Deposit, StockAdjustment, CartItem, LicensingInfo, AppPermissions, BankAccount, BankTransaction, WorkflowRoleKey } from './types';

// Components
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Users from './components/Users';
import Receipts from './components/Receipts';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import BottomNavBar from './components/BottomNavBar';
import Today from './components/Today';
import Reports from './components/Reports';
import Items from './components/Items';
import Counter from './components/Counter';
import Proforma from './components/Proforma';
import Commission from './components/Commission';
import Expenses from './components/Expenses';
import ExpenseRequestPage from './components/ExpenseRequestPage';
import MyProfile from './components/MyProfile';
import Settings from './components/Settings';
import ReceiptSettings from './components/ReceiptSettings';
import Permissions from './components/Permissions';
import BusinessSettings from './components/BusinessSettings';
import OwnerSettingsPage from './components/OwnerSettings';
import PrinterSettings from './components/PrinterSettings';
import NotificationCenter from './components/NotificationCenter';
import AccessDenied from './components/AccessDenied';
import GoBackButton from './components/GoBackButton';
import SelectBusiness from './components/SelectBusiness';
import Transactions from './components/Transactions';
import InvestorPage from './components/Investor';
import CashCountPage from './components/CashCount';
import GoodsCostingPage from './components/GoodsCosting';
import GoodsReceivingPage from './components/GoodsReceiving';
import WeeklyInventoryCheckPage from './components/WeeklyInventoryCheck';
import Directory from './components/Directory';
import AlertsPage from './components/AlertsPage';
import PublicStorefront from './components/PublicStorefront';
import BankAccountsPage from './components/BankAccounts';
import InvitePage from './components/InvitePage';

const EXPENSE_WORKFLOW_THRESHOLD = 100;

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        const viewport = document.getElementById('app-main-viewport');
        if (viewport) viewport.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

const Header = ({ currentUser, businessProfile, onMenuClick, notifications, cartCount }) => (
    <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 z-50 sticky top-0 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center">
                <button onClick={onMenuClick} className="lg:hidden p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-2xl transition-all active:scale-95">
                    <MenuIcon />
                </button>
                <GoBackButton />
            </div>
            <Link to="/dashboard" className="flex items-center gap-3 group transition-all">
                <div className="hidden sm:block">
                    <h1 className="text-base font-black text-primary uppercase tracking-tight leading-none group-hover:text-blue-700 transition-colors">{businessProfile?.businessName || 'FinTab'}</h1>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 opacity-80">Authorized Node</p>
                </div>
            </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            {currentUser && <NotificationCenter notifications={notifications} onMarkAsRead={() => {}} onMarkAllAsRead={() => {}} onClear={() => {}} />}
            <Link to="/counter" className="p-2.5 rounded-2xl text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-gray-800 relative transition-all active:scale-95 group">
                <CounterIcon className="w-6 h-6 transition-transform group-hover:-rotate-6" />
                {cartCount > 0 && <span className="absolute top-1.5 right-1.5 badge-standard bg-primary scale-75 border-2 border-white dark:border-gray-900">{cartCount}</span>}
            </Link>
            <div className="h-8 w-px bg-slate-100 dark:bg-gray-800 mx-1 opacity-60"></div>
            <Link to="/profile" className="flex items-center gap-3 pl-2 group transition-all">
                <div className="relative">
                    <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}`} className="w-9 h-9 rounded-2xl object-cover shadow-sm border-2 border-white dark:border-gray-800 group-hover:border-primary transition-all duration-300" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm"></div>
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">{currentUser?.name || 'Terminal'}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-70">{currentUser?.role || 'Guest'}</p>
                </div>
            </Link>
        </div>
    </header>
);

export class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children?: React.ReactNode }) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 font-sans">
                    <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">System Critical Halt</h2>
                        <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Re-Initialize Node</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [supabaseStatus, setSupabaseStatus] = useState(isSupabaseActive());

    const [businessProfile, setBusinessProfile] = useState(null);
    const [products, setProducts] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [approvalRequests, setApprovalRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    
    const [ledgerRevenue, setLedgerRevenue] = useState(0);
    const [ledgerExpenses, setLedgerExpenses] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isSupabaseActive()) {
                setSupabaseStatus(true);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // 1. Auth & Membership Flow Control
    useEffect(() => {
        if (!supabaseStatus) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const user: User = { 
                    id: session.user.id, 
                    email: session.user.email || '', 
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0], 
                    avatarUrl: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.id}`, 
                    role: 'Staff', 
                    status: 'Active', 
                    type: 'commission', 
                    initialInvestment: 0 
                };
                setCurrentUser(user);

                // Membership Routing Logic
                const { data: memberships } = await supabase.from('memberships').select('business_id, role').eq('user_id', session.user.id);
                
                if (!memberships || memberships.length === 0) {
                    // Brand new user with no nodes
                    if (!location.pathname.startsWith('/invite') && location.pathname !== '/onboarding') {
                        navigate('/onboarding');
                    }
                } else {
                    // Existing user
                    const storedBizId = localStorage.getItem('fintab_active_business_id');
                    if (storedBizId && memberships.some(m => m.business_id === storedBizId)) {
                        setActiveBusinessId(storedBizId);
                        const myRole = memberships.find(m => m.business_id === storedBizId)?.role;
                        setCurrentUser(prev => ({ ...prev, role: myRole || 'Staff' }));
                    } else if (location.pathname === '/' || location.pathname === '/login') {
                        navigate('/dashboard'); // select-business logic in Dashboard/SelectBusiness will handle it
                    }
                }
            } else {
                setCurrentUser(null);
                setActiveBusinessId(null);
            }
            setIsInitialLoad(false);
        });
        return () => subscription.unsubscribe();
    }, [supabaseStatus, navigate, location.pathname]);

    // 2. Ledger Driven Data Sync
    useEffect(() => {
        if (!activeBusinessId || !supabaseStatus) return;
        const syncRegistry = async () => {
            const { data: biz } = await supabase.from('businesses').select('*').eq('id', activeBusinessId).single();
            if (biz) setBusinessProfile({ id: biz.id, businessName: biz.name, businessType: biz.type, businessEmail: biz.email, businessPhone: biz.phone, logo: biz.logo_url });

            const { data: prods } = await supabase.from('products').select('*').eq('business_id', activeBusinessId);
            if (prods) setProducts(prods.map(p => ({ ...p, costPrice: p.cost_price, imageUrl: p.image_url })));

            const { data: exps } = await supabase.from('expenses').select('*').eq('business_id', activeBusinessId);
            if (exps) setExpenses(exps);

            const { data: accounts } = await supabase.from('bank_accounts').select('*').eq('business_id', activeBusinessId);
            if (accounts) setBankAccounts(accounts);

            const { data: approvals } = await supabase.from('approval_requests').select('*, approval_signatures(*)').eq('business_id', activeBusinessId);
            if (approvals) setApprovalRequests(approvals);

            const { data: ledger } = await supabase.from('unified_ledger').select('*').eq('business_id', activeBusinessId);
            if (ledger) {
                setLedgerEntries(ledger);
                const rev = ledger.filter(l => l.type === 'SALE').reduce((s, l) => s + l.amount, 0);
                const exp = ledger.filter(l => l.type === 'EXPENSE').reduce((s, l) => s + Math.abs(l.amount), 0);
                const payouts = ledger.filter(l => l.type === 'PAYOUT').reduce((s, l) => s + Math.abs(l.amount), 0);
                setLedgerRevenue(rev);
                setLedgerExpenses(exp + payouts);
            }
            
            const { data: members } = await supabase.from('memberships').select('*, users(*)').eq('business_id', activeBusinessId);
            if (members) {
                setUsers(members.map(m => ({ ...m.users, role: m.role, initialInvestment: m.invested_amount || 0, status: 'Active', avatarUrl: m.users.avatar_url || `https://ui-avatars.com/api/?name=${m.users.full_name}` })));
                // Update current user role based on membership in active business
                const meInBiz = members.find(m => m.user_id === currentUser?.id);
                if (meInBiz) setCurrentUser(prev => prev ? ({ ...prev, role: meInBiz.role }) : null);
            }
        };
        syncRegistry();
    }, [activeBusinessId, supabaseStatus, currentUser?.id]);

    const netProfit = Math.max(0, ledgerRevenue - ledgerExpenses);

    const handleLogout = async () => {
        if (isSupabaseActive()) await supabase.auth.signOut();
        localStorage.removeItem('fintab_active_business_id');
        setCurrentUser(null);
        setActiveBusinessId(null);
        navigate('/');
    };

    if (isInitialLoad) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-950">
            <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.95)', color: 'white', fontSize: '9px', padding: '4px 10px', pointerEvents: 'none', borderBottomRightRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', backdropFilter: 'blur(4px)' }}>
                SUPABASE: <span style={{ color: supabaseStatus ? '#22c55e' : '#eab308', fontWeight: 'bold' }}>{supabaseStatus ? 'ACTIVE' : 'INITIALIZING...'}</span>
            </div>
            <ScrollToTop />
            <Routes>
                <Route path="/invite" element={<InvitePage currentUser={currentUser} />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/" element={!currentUser ? <Login onEnterDemo={() => navigate('/onboarding')} /> : <Navigate to="/dashboard" replace />} />
                
                {/* Protected Territory */}
                <Route path="/*" element={!currentUser ? <Navigate to="/" replace /> : !activeBusinessId ? <SelectBusiness currentUser={currentUser} onSelect={setActiveBusinessId} onLogout={handleLogout} /> : (
                    <div className="flex flex-1 overflow-hidden">
                        <Sidebar t={k => k} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} onLogout={handleLogout} permissions={DEFAULT_PERMISSIONS} businessProfile={businessProfile} />
                        <div id="app-main-viewport" className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                            <Header currentUser={currentUser} businessProfile={businessProfile} onMenuClick={() => setIsSidebarOpen(true)} notifications={[]} cartCount={cart.length} />
                            <main className="p-4 md:p-8 flex-1">
                                <Routes>
                                    <Route path="/dashboard" element={<Dashboard products={products} expenses={expenses} netProfit={netProfit} currentUser={currentUser} businessProfile={businessProfile} t={k => k} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                    <Route path="/inventory" element={<Inventory products={products} setProducts={setProducts} handleSaveProduct={() => {}} currentUser={currentUser} t={k => k} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                    <Route path="/counter" element={<Counter cart={cart} bankAccounts={bankAccounts} onUpdateCartItem={(p, v, q) => {
                                        setCart(prev => {
                                            const existing = prev.find(i => i.product.id === p.id && (!v || i.variant?.id === v.id));
                                            if (q <= 0) return prev.filter(i => !(i.product.id === p.id && (!v || i.variant?.id === v.id)));
                                            if (existing) return prev.map(i => (i.product.id === p.id && (!v || i.variant?.id === v.id)) ? { ...i, quantity: q } : i);
                                            return [...prev, { product: p, variant: v, quantity: q, stock: v ? v.stock : p.stock }];
                                        });
                                    }} onProcessSale={async (sale) => {
                                        const { data: saleData } = await supabase.from('sales').insert({ business_id: activeBusinessId, user_id: sale.userId, customer_id: sale.customerId, items: sale.items, total: sale.total, payment_method: sale.paymentMethod, bank_account_id: sale.bank_account_id }).select().single();
                                        // Ledger calls...
                                    }} onClearCart={() => setCart([])} currentUser={currentUser} t={k => k} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                    <Route path="/users" element={<Users users={users} currentUser={currentUser} activeBusinessId={activeBusinessId} />} />
                                    <Route path="/expenses" element={<Expenses expenses={expenses} setExpenses={setExpenses} bankAccounts={bankAccounts} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={k => k} />} />
                                    <Route path="/reports" element={<Reports sales={ledgerEntries.filter(l => l.type === 'SALE')} products={products} expenses={ledgerEntries.filter(l => l.type === 'EXPENSE' || l.type === 'PAYOUT')} customers={[]} users={users} t={k => k} receiptSettings={DEFAULT_RECEIPT_SETTINGS} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} ownerSettings={DEFAULT_OWNER_SETTINGS} ledgerEntries={ledgerEntries} />} />
                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                </Routes>
                            </main>
                            <BottomNavBar t={k => k} cart={cart} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} />
                        </div>
                    </div>
                )} />
            </Routes>
        </div>
    );
};

export default App;
