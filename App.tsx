// @ts-nocheck
import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
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
import type { AppNotification, Sale, User, Withdrawal, Expense, ExpenseRequest, CashCount, GoodsCosting, GoodsReceiving, AnomalyAlert, WeeklyInventoryCheck, Product, ModuleKey, Customer, ProductVariant, CustomPayment, Deposit, StockAdjustment, CartItem, LicensingInfo, AppPermissions, BankAccount, BankTransaction, WorkflowRoleKey, BusinessProfile, BusinessSettingsData, OwnerSettings, ReceiptSettingsData, PrinterSettingsData } from './types';

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
import SelectBusiness from './components/SelectBusiness';
import Transactions from './components/Transactions';
import InvestorPage from './components/Investor';
import CashCountPage from './components/CashCount';
import GoodsCostingPage from './components/GoodsCosting';
import GoodsReceivingPage from './components/GoodsReceiving';
import WeeklyInventoryCheckPage from './components/WeeklyInventoryCheck';
import AlertsPage from './components/AlertsPage';
import PublicStorefront from './components/PublicStorefront';
import BankAccountsPage from './components/BankAccounts';
import InvitePage from './components/InvitePage';
import AIAssistant from './components/AIAssistant';
import NotificationCenter from './components/NotificationCenter';

// Robust mapping helpers to bridge DB snake_case and UI camelCase
const mapProductFromDb = (p: any): Product => ({
    id: p.id,
    sku: p.sku || '',
    name: p.name || 'Unnamed Asset',
    description: p.description || '',
    category: p.category || 'Uncategorized',
    price: parseFloat(p.price) || 0,
    costPrice: parseFloat(p.cost_price) || 0,
    stock: parseInt(p.stock) || 0,
    imageUrl: p.image_url || 'https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=200&h=200&auto=format&fit=crop',
    commissionPercentage: parseFloat(p.commission_percentage) || 0,
    tieredPricing: p.tiered_pricing || [],
    stockHistory: p.stock_history || [],
    productType: p.product_type || 'simple',
    variantOptions: p.variant_options || [],
    variants: p.variants || [],
});

const mapProductToDb = (p: Product, businessId: string) => ({
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    cost_price: p.costPrice,
    stock: p.stock,
    image_url: p.imageUrl,
    commission_percentage: p.commissionPercentage,
    tiered_pricing: p.tieredPricing,
    stock_history: p.stockHistory,
    product_type: p.productType,
    variant_options: p.variantOptions,
    variants: p.variants,
    business_id: businessId
});

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        const viewport = document.getElementById('app-main-viewport');
        if (viewport) viewport.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

const Header = ({ currentUser, businessProfile, onMenuClick, notifications, cartCount, onMarkNotifRead, onMarkAllNotifsRead }) => (
    <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800 z-50 sticky top-0 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={onMenuClick} className="lg:hidden p-2.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-2xl transition-all active:scale-95">
                <MenuIcon />
            </button>
            <Link to="/dashboard" className="flex items-center gap-3 group transition-all">
                <div className="hidden sm:block">
                    <h1 className="text-base font-extrabold text-primary uppercase tracking-tight leading-none group-hover:text-blue-700 transition-colors">{businessProfile?.businessName || 'FinTab'}</h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-1.5 opacity-80">System Node Active</p>
                </div>
            </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
            <Link 
                to="/counter" 
                className="relative p-2.5 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-gray-800 rounded-2xl transition-all group"
            >
                <CounterIcon className="w-6 h-6" />
                {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 badge-standard bg-primary min-w-[18px] h-[18px] !text-[8px] border-2 border-white dark:border-gray-900 flex items-center justify-center font-bold shadow-sm animate-scale-in">
                        {cartCount > 99 ? '99+' : cartCount}
                    </span>
                )}
            </Link>
            <NotificationCenter 
                notifications={notifications} 
                onMarkAsRead={onMarkNotifRead} 
                onMarkAllAsRead={onMarkAllNotifsRead} 
                onClear={() => {}}
            />
            <div className="h-8 w-px bg-slate-100 dark:bg-gray-800 mx-1 hidden sm:block"></div>
            <Link to="/profile" className="flex items-center gap-3 pl-2 group transition-all">
                <div className="relative">
                    <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}`} className="w-9 h-9 rounded-2xl object-cover shadow-sm border-2 border-white dark:border-gray-800 group-hover:border-primary transition-all duration-300" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm"></div>
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-primary transition-colors">{currentUser?.name || 'Terminal'}</p>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 opacity-70">{currentUser?.role || 'Guest'}</p>
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
                        <h2 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tighter mb-4">Critical Interface Halt</h2>
                        <button onClick={() => window.location.reload()} className="btn-base btn-primary w-full">Re-Initialize Terminal</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-6">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Initializing Security Grid</p>
        </div>
    </div>
);

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Identity State
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeBusinessId, setActiveBusinessId] = useState<string | null>(localStorage.getItem('fintab_active_business_id'));
    const [membershipsCount, setMembershipsCount] = useState<number | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const logoutJustHappenedRef = useRef(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [language, setLanguage] = useState('en');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Operational State
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
    const [businessSettings, setBusinessSettings] = useState<BusinessSettingsData>(DEFAULT_BUSINESS_SETTINGS);
    const [ownerSettings, setOwnerSettings] = useState<OwnerSettings>(DEFAULT_OWNER_SETTINGS);
    const [receiptSettings, setReceiptSettings] = useState<ReceiptSettingsData>(DEFAULT_RECEIPT_SETTINGS);
    const [printerSettings, setPrinterSettings] = useState({ autoPrint: false });
    
    const [products, setProducts] = useState<Product[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([]);
    const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
    const [goodsCostings, setGoodsCostings] = useState<GoodsCosting[]>([]);
    const [goodsReceivings, setGoodsReceivings] = useState<GoodsReceiving[]>([]);
    const [weeklyChecks, setWeeklyChecks] = useState<WeeklyInventoryCheck[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState([]);

    // Logic: Aggregated Yield
    const netProfit = useMemo(() => {
        const rev = sales.filter(s => FINALIZED_SALE_STATUSES.includes(s.status)).reduce((s, x) => s + x.total, 0);
        const exp = expenses.filter(e => e.status !== 'deleted').reduce((s, x) => s + x.amount, 0);
        return rev - exp;
    }, [sales, expenses]);

    // 1. Lifecycle & Identity Sync
    useEffect(() => {
        let mounted = true;
        let authListener = null;

        const syncIdentity = async (session) => {
            if (!session?.user) {
                if (mounted) {
                    setCurrentUser(null);
                    setMembershipsCount(0);
                    setIsAuthLoading(false);
                }
                return;
            }

            try {
                await supabase.wait();
                const { data: memberships, error } = await supabase
                    .from('memberships')
                    .select('business_id, role')
                    .eq('user_id', session.user.id);
                
                if (!mounted) return;

                if (error) {
                    console.error("[FinTab Auth] Identity Error:", error.message);
                    setMembershipsCount(0); 
                } else {
                    const count = memberships?.length || 0;
                    setMembershipsCount(count);
                    const role = memberships?.[0]?.role || 'Staff';
                    setCurrentUser({ 
                        id: session.user.id, email: session.user.email || '', 
                        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0], 
                        avatarUrl: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.id}`, 
                        role: role, status: 'Active', type: 'commission'
                    });
                    if (count > 0 && !activeBusinessId) {
                        const firstId = memberships[0].business_id;
                        setActiveBusinessId(firstId);
                        localStorage.setItem('fintab_active_business_id', firstId);
                    }
                }
            } catch (err) {
                console.error("[FinTab Auth] Identity Crash:", err.message);
                if (mounted) setMembershipsCount(0);
            } finally {
                if (mounted) setIsAuthLoading(false);
            }
        };

        const bootAuth = async () => {
            await supabase.wait();
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;
            if (session) {
                setAuthUserId(session.user.id);
                await syncIdentity(session);
            } else {
                setAuthUserId(null);
                setIsAuthLoading(false);
            }

            const { data } = supabase.auth.onAuthStateChange((event, session) => {
                setAuthUserId(session?.user?.id || null);
                if (event === 'SIGNED_OUT') {
                    if (mounted) {
                        logoutJustHappenedRef.current = true;
                        setCurrentUser(null);
                        setActiveBusinessId(null);
                        setMembershipsCount(0);
                        setIsAuthLoading(false);
                        localStorage.removeItem('fintab_active_business_id');
                    }
                } else if (session) {
                    syncIdentity(session);
                }
            });
            authListener = data;
        };

        bootAuth();

        return () => {
            mounted = false;
            if (authListener?.subscription) authListener.subscription.unsubscribe();
        };
    }, []);

    // 2. Data Sync
    useEffect(() => {
        if (!activeBusinessId || !authUserId) return;

        const fetchOperationalData = async () => {
            try {
                await supabase.wait();
                const { data: prods } = await supabase.from('products').select('*').eq('business_id', activeBusinessId);
                if (prods) setProducts(prods.map(mapProductFromDb));

                const { data: sls } = await supabase.from('sales').select('*').eq('business_id', activeBusinessId);
                if (sls) setSales(sls);

                const { data: bizNode } = await supabase.from('businesses').select('*').eq('id', activeBusinessId).single();
                if (bizNode) setBusinessProfile({
                    businessName: bizNode.name, businessEmail: bizNode.profile?.ledger_email,
                    businessPhone: bizNode.profile?.phone, businessType: bizNode.profile?.type,
                    logo: bizNode.profile?.logo, id: bizNode.id
                });
            } catch (err) {
                console.error("[FinTab Data] Node Sync Error:", err.message);
            }
        };
        fetchOperationalData();
    }, [activeBusinessId, authUserId]);

    // Financial Workflow Actions
    const initiateWorkflow = async (type, auditId, amount, metadata) => {
        const { data, error } = await supabase.from('approval_requests').insert({
            type, amount, metadata, business_id: activeBusinessId, created_by: currentUser.id, status: 'pending_v1'
        }).select().single();
        return data?.id || null;
    };

    const advanceWorkflow = async (requestId, status) => {
        const { error } = await supabase.from('approval_requests').update({ status }).eq('id', requestId);
        return !error;
    };

    // Inventory Handlers
    const handleSaveProduct = async (productData: Product, isEditing: boolean) => {
        if (!activeBusinessId) return;
        const payload = mapProductToDb(productData, activeBusinessId);
        try {
            const { data, error } = isEditing 
                ? await supabase.from('products').update(payload).eq('id', productData.id).select().single()
                : await supabase.from('products').insert([payload]).select().single();
            if (data) {
                const saved = mapProductFromDb(data);
                setProducts(prev => isEditing ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev]);
            }
        } catch (err) { console.error("Registry error:", err.message); }
    };

    const handleDeleteProduct = async (productId: string) => {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
    };

    const handleSaveStockAdjustment = async (productId: string, adjustment: any) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const newStock = product.stock + (adjustment.type === 'add' ? adjustment.quantity : -adjustment.quantity);
        const shift = { date: new Date().toISOString(), userId: currentUser.id, type: adjustment.type, quantity: adjustment.quantity, reason: adjustment.reason, newStockLevel: newStock };
        const { data } = await supabase.from('products').update({ stock: newStock, stock_history: [shift, ...(product.stockHistory || [])] }).eq('id', productId).select().single();
        if (data) setProducts(prev => prev.map(p => p.id === productId ? mapProductFromDb(data) : p));
    };

    const handleProcessSale = async (sale: Sale) => {
        const { data: savedSale } = await supabase.from('sales').insert([{ ...sale, business_id: activeBusinessId, items: sale.items }]).select().single();
        if (savedSale) {
            setSales(prev => [savedSale, ...prev]);
            setCart([]);
        }
    };

    const t = (k) => translations[language]?.[k] || k;

    // Navigation Guard
    useEffect(() => {
        const path = location.pathname;
        if (isAuthLoading) return;
        if (logoutJustHappenedRef.current) {
            logoutJustHappenedRef.current = false;
            if (path !== '/') navigate('/', { replace: true });
            return;
        }
        if (!authUserId) {
            if (!['/', '/login', '/invite'].includes(path) && !path.startsWith('/public-shopfront')) navigate('/', { replace: true });
        } else if ((path === '/' || path === '/login') && activeBusinessId && membershipsCount > 0) {
            navigate('/dashboard', { replace: true });
        }
    }, [authUserId, isAuthLoading, activeBusinessId, membershipsCount, location.pathname, navigate]);

    if (isAuthLoading || (authUserId && membershipsCount === null)) return <LoadingScreen />;

    if (!authUserId) return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950`}>
            <Routes>
                <Route path="/invite" element={<InvitePage currentUser={null} />} />
                <Route path="/public-shopfront/:businessId" element={<PublicStorefront />} />
                <Route path="*" element={<Login onEnterDemo={() => {}} />} />
            </Routes>
        </div>
    );

    if (membershipsCount === 0 && location.pathname !== '/invite') return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950`}>
             <Routes>
                <Route path="/invite" element={<InvitePage currentUser={currentUser} />} />
                <Route path="*" element={<Onboarding currentUser={currentUser} />} />
            </Routes>
        </div>
    );

    if (!activeBusinessId && location.pathname !== '/invite') return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950`}>
             <Routes>
                <Route path="/invite" element={<InvitePage currentUser={currentUser} />} />
                <Route path="*" element={<SelectBusiness currentUser={currentUser} onSelect={setActiveBusinessId} onLogout={() => supabase.auth.signOut()} isOwnerAdmin={currentUser?.role === 'Owner'} />} />
            </Routes>
        </div>
    );

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950`}>
            <ScrollToTop />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar t={t} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} businessProfile={businessProfile} cart={cart} onLogout={() => supabase.auth.signOut()} ownerSettings={ownerSettings} />
                <div id="app-main-viewport" className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                    <Header currentUser={currentUser} businessProfile={businessProfile} onMenuClick={() => setIsSidebarOpen(true)} cartCount={cart.reduce((s, i) => s + i.quantity, 0)} notifications={notifications} onMarkNotifRead={(id) => setNotifications(p => p.map(n => n.id === id ? {...n, isRead: true} : n))} onMarkAllNotifsRead={() => setNotifications(p => p.map(n => ({...n, isRead: true})))} />
                    <main className="p-4 md:p-8 flex-1">
                        <Routes>
                            <Route path="invite" element={<InvitePage currentUser={currentUser} />} />
                            <Route path="dashboard" element={<Dashboard products={products} customers={customers} users={users} sales={sales} expenses={expenses} deposits={deposits} expenseRequests={expenseRequests} anomalyAlerts={anomalyAlerts} currentUser={currentUser} businessProfile={businessProfile} businessSettings={businessSettings} ownerSettings={ownerSettings} receiptSettings={receiptSettings} permissions={DEFAULT_PERMISSIONS} t={t} onDismissAnomaly={() => {}} onMarkAnomalyRead={() => {}} advanceWorkflow={advanceWorkflow} />} />
                            <Route path="today" element={<Today sales={sales} customers={customers} expenses={expenses} products={products} t={t} receiptSettings={receiptSettings} />} />
                            <Route path="reports" element={<Reports sales={sales} products={products} expenses={expenses} customers={customers} users={users} t={t} receiptSettings={receiptSettings} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} ownerSettings={ownerSettings} ledgerEntries={ledgerEntries} />} />
                            <Route path="inventory" element={<Inventory products={products} setProducts={setProducts} t={t} receiptSettings={receiptSettings} onSaveStockAdjustment={handleSaveStockAdjustment} handleSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} currentUser={currentUser} users={users} />} />
                            <Route path="items" element={<Items products={products} cart={cart} t={t} receiptSettings={receiptSettings} onUpdateCartItem={(p, v, q) => setCart(prev => { const idx = prev.findIndex(i => i.product.id === p.id && (!v || i.variant?.id === v.id)); if (q <= 0) return prev.filter((_, i) => i !== idx); if (idx > -1) { const up = [...prev]; up[idx].quantity = q; return up; } return [...prev, { product: p, variant: v, quantity: q, stock: v ? v.stock : p.stock }]; })} />} />
                            <Route path="counter" element={<Counter cart={cart} customers={customers} users={users} onUpdateCartItem={(p, v, q) => setCart(prev => { const idx = prev.findIndex(i => i.product.id === p.id && (!v || i.variant?.id === v.id)); if (q <= 0) return prev.filter((_, i) => i !== idx); if (idx > -1) { const up = [...prev]; up[idx].quantity = q; return up; } return [...prev, { product: p, variant: v, quantity: q, stock: v ? v.stock : p.stock }]; })} onProcessSale={handleProcessSale} onClearCart={() => setCart([])} receiptSettings={receiptSettings} t={t} onAddCustomer={(c) => { const nc = {...c, id: Date.now().toString(), purchaseHistory: []}; setCustomers(p => [nc, ...p]); return nc; }} currentUser={currentUser} businessSettings={businessSettings} printerSettings={printerSettings} permissions={DEFAULT_PERMISSIONS} bankAccounts={bankAccounts} />} />
                            <Route path="receipts" element={<Receipts sales={sales} customers={customers} users={users} t={t} receiptSettings={receiptSettings} onDeleteSale={() => {}} currentUser={currentUser} printerSettings={printerSettings} />} />
                            <Route path="proforma" element={<Proforma sales={sales} customers={customers} users={users} t={t} receiptSettings={receiptSettings} onDeleteSale={() => {}} currentUser={currentUser} printerSettings={printerSettings} />} />
                            <Route path="commission" element={<Commission products={products} setProducts={setProducts} t={t} receiptSettings={receiptSettings} />} />
                            <Route path="expenses" element={<Expenses expenses={expenses} handleSaveExpense={() => {}} bankAccounts={bankAccounts} t={t} receiptSettings={receiptSettings} />} />
                            <Route path="expense-requests" element={<ExpenseRequestPage expenseRequests={expenseRequests} expenses={expenses} currentUser={currentUser} handleRequestExpense={() => {}} receiptSettings={receiptSettings} t={t} />} />
                            <Route path="customers" element={<Customers customers={customers} setCustomers={setCustomers} t={t} receiptSettings={receiptSettings} />} />
                            <Route path="users" element={<Users users={users} activeBusinessId={activeBusinessId} currentUser={currentUser} />} />
                            <Route path="investors" element={<InvestorPage users={users} netProfit={netProfit} products={products} t={t} receiptSettings={receiptSettings} currentUser={currentUser} businessSettings={businessSettings} permissions={DEFAULT_PERMISSIONS} initiateWorkflow={initiateWorkflow} />} />
                            <Route path="cash-count" element={<CashCountPage sales={sales} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} initiateWorkflow={initiateWorkflow} advanceWorkflow={advanceWorkflow} t={t} />} />
                            <Route path="bank-accounts" element={<BankAccountsPage bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} bankTransactions={bankTransactions} setBankTransactions={setBankTransactions} receiptSettings={receiptSettings} currentUser={currentUser} users={users} />} />
                            <Route path="goods-costing" element={<GoodsCostingPage goodsCostings={goodsCostings} setGoodsCostings={setGoodsCostings} products={products} setProducts={setProducts} users={users} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} />} />
                            <Route path="goods-receiving" element={<GoodsReceivingPage goodsReceivings={goodsReceivings} setGoodsReceivings={setGoodsReceivings} products={products} setProducts={setProducts} users={users} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} />} />
                            <Route path="weekly-inventory-check" element={<WeeklyInventoryCheckPage weeklyChecks={weeklyChecks} setWeeklyChecks={setWeeklyChecks} products={products} users={users} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} t={t} />} />
                            <Route path="transactions" element={<Transactions deposits={deposits} bankAccounts={bankAccounts} users={users} receiptSettings={receiptSettings} currentUser={currentUser} onUpdateDepositStatus={() => {}} t={t} />} />
                            <Route path="profile" element={<MyProfile currentUser={currentUser} users={users} sales={sales} expenses={expenses} customers={customers} products={products} netProfit={netProfit} receiptSettings={receiptSettings} t={t} businessSettings={businessSettings} ownerSettings={ownerSettings} onRequestWithdrawal={() => {}} handleUpdateCustomPaymentStatus={() => {}} handleInitiateCustomPayment={() => {}} businessProfile={businessProfile} onUpdateWithdrawalStatus={() => {}} onConfirmWithdrawalReceived={() => {}} companyValuations={[]} onSwitchUser={() => {}} onUpdateCurrentUserProfile={() => {}} />} />
                            <Route path="settings" element={<Settings language={language} setLanguage={setLanguage} t={t} currentUser={currentUser} users={users} receiptSettings={receiptSettings} setReceiptSettings={setReceiptSettings} businessSettings={businessSettings} onUpdateBusinessSettings={setBusinessSettings} businessProfile={businessProfile} onUpdateBusinessProfile={setBusinessProfile} ownerSettings={ownerSettings} onUpdateOwnerSettings={setOwnerSettings} printerSettings={printerSettings} onUpdatePrinterSettings={setPrinterSettings} permissions={DEFAULT_PERMISSIONS} theme={theme} setTheme={setTheme} />} />
                            <Route path="alerts" element={<AlertsPage anomalyAlerts={anomalyAlerts} onDismiss={() => {}} onMarkRead={() => {}} receiptSettings={receiptSettings} currentUser={currentUser} />} />
                            <Route path="*" element={<Navigate to="dashboard" replace />} />
                        </Routes>
                    </main>
                    <BottomNavBar t={t} cart={cart} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} />
                </div>
            </div>
        </div>
    );
};

export default App;