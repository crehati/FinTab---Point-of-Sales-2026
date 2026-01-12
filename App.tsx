
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
                    <h1 className="text-base font-black text-primary uppercase tracking-tight leading-none group-hover:text-blue-700 transition-colors">{businessProfile?.businessName || 'FinTab'}</h1>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 opacity-80">Authorized Node</p>
                </div>
            </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            <NotificationCenter 
                notifications={notifications} 
                onMarkAsRead={onMarkNotifRead} 
                onMarkAllAsRead={onMarkAllNotifsRead} 
                onClear={() => {}}
            />
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
    
    // Auth & Identity State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
    const [membershipsCount, setMembershipsCount] = useState<number | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [supabaseStatus, setSupabaseStatus] = useState(isSupabaseActive());
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
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([]);
    const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
    const [goodsCostings, setGoodsCostings] = useState<GoodsCosting[]>([]);
    const [goodsReceivings, setGoodsReceivings] = useState<GoodsReceiving[]>([]);
    const [weeklyChecks, setWeeklyChecks] = useState<WeeklyInventoryCheck[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isSupabaseActive()) {
                setSupabaseStatus(true);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Identity Logic
    const syncIdentity = async (session) => {
        if (!session?.user) {
            setCurrentUser(null);
            setActiveBusinessId(null);
            setMembershipsCount(0);
            setIsInitialLoad(false);
            return;
        }

        const { data: memberships, error: memErr } = await supabase
            .from('memberships')
            .select('business_id, role')
            .eq('user_id', session.user.id);
        
        if (memErr) {
            setMembershipsCount(0);
            setIsInitialLoad(false);
            return;
        }

        const count = memberships?.length || 0;
        setMembershipsCount(count);

        if (count > 0) {
            const role = memberships?.[0]?.role || 'Staff';
            setCurrentUser({ 
                id: session.user.id, 
                email: session.user.email || '', 
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0], 
                avatarUrl: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.id}`, 
                role: role, 
                status: 'Active', 
                type: 'commission',
                withdrawals: [],
                customPayments: []
            });

            const storedBizId = localStorage.getItem('fintab_active_business_id');
            const validBiz = memberships.find(m => m.business_id === storedBizId) || memberships[0];
            if (validBiz) {
                setActiveBusinessId(validBiz.business_id);
                localStorage.setItem('fintab_active_business_id', validBiz.business_id);
            }
        } else {
            setCurrentUser({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                role: 'Staff',
                status: 'Invited',
                type: 'commission'
            });
        }
        
        setIsInitialLoad(false);
    };

    useEffect(() => {
        if (!supabaseStatus) return;
        supabase.auth.getSession().then(({ data: { session } }) => syncIdentity(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => syncIdentity(session));
        return () => subscription.unsubscribe();
    }, [supabaseStatus]);

    // Handlers
    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('fintab_active_business_id');
        setCurrentUser(null);
        setActiveBusinessId(null);
        setMembershipsCount(0);
        navigate('/', { replace: true });
    };

    const onUpdateCartItem = (product: Product, variant: ProductVariant | undefined, quantity: number) => {
        setCart(prev => {
            const existingIdx = prev.findIndex(item => item.product.id === product.id && (!variant || item.variant?.id === variant.id));
            if (quantity <= 0) return prev.filter((_, i) => i !== existingIdx);
            if (existingIdx > -1) {
                const updated = [...prev];
                updated[existingIdx].quantity = quantity;
                return updated;
            }
            return [...prev, { product, variant, quantity, stock: variant ? variant.stock : product.stock }];
        });
    };

    const handleProcessSale = (sale: Sale) => {
        setSales(prev => [sale, ...prev]);
        setCart([]);
    };

    const handleSaveProduct = (product: Product, isEditing: boolean) => {
        setProducts(prev => isEditing ? prev.map(p => p.id === product.id ? product : p) : [product, ...prev]);
    };

    const t = (k: string) => translations[language]?.[k] || k;

    if (isInitialLoad || (currentUser && membershipsCount === null)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Initializing Grid Node</p>
                </div>
            </div>
        );
    }

    const isAuthenticated = !!currentUser;
    const hasMemberships = membershipsCount > 0;

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950`}>
            <ScrollToTop />
            <Routes>
                <Route path="/invite" element={<InvitePage currentUser={currentUser} />} />
                <Route path="/public-shopfront/:businessId" element={<PublicStorefront />} />
                <Route path="/" element={!isAuthenticated ? <Login /> : !hasMemberships ? <Navigate to="/onboarding" replace /> : <Navigate to="/dashboard" replace />} />
                <Route path="/onboarding" element={!isAuthenticated ? <Navigate to="/" replace /> : hasMemberships ? <Navigate to="/dashboard" replace /> : <Onboarding currentUser={currentUser} />} />
                
                <Route path="/*" element={
                    !isAuthenticated ? <Navigate to="/" replace /> :
                    !hasMemberships ? <Navigate to="/onboarding" replace /> :
                    !activeBusinessId ? <SelectBusiness currentUser={currentUser} onSelect={setActiveBusinessId} onLogout={handleLogout} isOwnerAdmin={currentUser.role === 'Owner'} /> : (
                        <div className="flex flex-1 overflow-hidden">
                            <Sidebar t={t} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} businessProfile={businessProfile} cart={cart} onLogout={handleLogout} ownerSettings={ownerSettings} />
                            <div id="app-main-viewport" className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                                <Header 
                                    currentUser={currentUser} 
                                    businessProfile={businessProfile} 
                                    onMenuClick={() => setIsSidebarOpen(true)} 
                                    cartCount={cart.length}
                                    notifications={notifications}
                                    onMarkNotifRead={(id) => setNotifications(p => p.map(n => n.id === id ? {...n, isRead: true} : n))}
                                    onMarkAllNotifsRead={() => setNotifications(p => p.map(n => ({...n, isRead: true})))}
                                />
                                <main className="p-4 md:p-8 flex-1">
                                    <Routes>
                                        <Route path="dashboard" element={<Dashboard products={products} customers={customers} users={users} sales={sales} expenses={expenses} deposits={deposits} expenseRequests={expenseRequests} anomalyAlerts={anomalyAlerts} currentUser={currentUser} businessProfile={businessProfile} businessSettings={businessSettings} ownerSettings={ownerSettings} receiptSettings={receiptSettings} permissions={DEFAULT_PERMISSIONS} t={t} />} />
                                        <Route path="today" element={<Today sales={sales} customers={customers} expenses={expenses} products={products} t={t} receiptSettings={receiptSettings} />} />
                                        <Route path="reports" element={<Reports sales={sales} products={products} expenses={expenses} customers={customers} users={users} t={t} receiptSettings={receiptSettings} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} ownerSettings={ownerSettings} ledgerEntries={ledgerEntries} />} />
                                        <Route path="items" element={<Items products={products} cart={cart} t={t} receiptSettings={receiptSettings} onUpdateCartItem={onUpdateCartItem} />} />
                                        <Route path="counter" element={<Counter cart={cart} customers={customers} users={users} onUpdateCartItem={onUpdateCartItem} onProcessSale={handleProcessSale} onClearCart={() => setCart([])} receiptSettings={receiptSettings} t={t} onAddCustomer={(c) => { const nc = {...c, id: Date.now().toString(), purchaseHistory: []}; setCustomers(p => [nc, ...p]); return nc; }} currentUser={currentUser} businessSettings={businessSettings} printerSettings={printerSettings} permissions={DEFAULT_PERMISSIONS} bankAccounts={bankAccounts} />} />
                                        <Route path="inventory" element={<Inventory products={products} setProducts={setProducts} t={t} receiptSettings={receiptSettings} onSaveStockAdjustment={() => {}} handleSaveProduct={handleSaveProduct} currentUser={currentUser} users={users} />} />
                                        <Route path="customers" element={<Customers customers={customers} setCustomers={setCustomers} t={t} receiptSettings={receiptSettings} />} />
                                        <Route path="users" element={<Users users={users} activeBusinessId={activeBusinessId} currentUser={currentUser} />} />
                                        <Route path="receipts" element={<Receipts sales={sales} customers={customers} users={users} t={t} receiptSettings={receiptSettings} onDeleteSale={(id) => setSales(p => p.filter(s => s.id !== id))} currentUser={currentUser} printerSettings={printerSettings} />} />
                                        <Route path="proforma" element={<Proforma sales={sales} customers={customers} users={users} t={t} receiptSettings={receiptSettings} onDeleteSale={(id) => setSales(p => p.filter(s => s.id !== id))} currentUser={currentUser} printerSettings={printerSettings} />} />
                                        <Route path="transactions" element={<Transactions sales={sales} deposits={deposits} bankAccounts={bankAccounts} users={users} receiptSettings={receiptSettings} currentUser={currentUser} onRequestDeposit={(a, d, b) => setDeposits(p => [{id: Date.now().toString(), amount: a, description: d, bank_account_id: b, user_id: currentUser.id, status: 'pending', date: new Date().toISOString()}, ...p])} onUpdateDepositStatus={(id, s) => setDeposits(p => p.map(d => d.id === id ? {...d, status: s} : d))} t={t} />} />
                                        <Route path="commission" element={<Commission products={products} setProducts={setProducts} t={t} receiptSettings={receiptSettings} />} />
                                        <Route path="expenses" element={<Expenses expenses={expenses} setExpenses={setExpenses} handleSaveExpense={(e) => setExpenses(p => [{...e, id: Date.now().toString(), date: new Date().toISOString()}, ...p])} bankAccounts={bankAccounts} t={t} receiptSettings={receiptSettings} />} />
                                        <Route path="expense-requests" element={<ExpenseRequestPage expenseRequests={expenseRequests} expenses={expenses} currentUser={currentUser} handleRequestExpense={(r) => setExpenseRequests(p => [{...r, id: Date.now().toString(), date: new Date().toISOString(), userId: currentUser.id, status: 'pending'}, ...p])} receiptSettings={receiptSettings} t={t} />} />
                                        <Route path="investors" element={<InvestorPage users={users} netProfit={0} products={products} t={t} receiptSettings={receiptSettings} currentUser={currentUser} businessSettings={businessSettings} permissions={DEFAULT_PERMISSIONS} initiateWorkflow={async () => 'mock-id'} />} />
                                        <Route path="cash-count" element={<CashCountPage sales={sales} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} initiateWorkflow={async () => 'mock-id'} advanceWorkflow={async () => true} t={t} />} />
                                        <Route path="bank-accounts" element={<BankAccountsPage bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} bankTransactions={bankTransactions} setBankTransactions={setBankTransactions} receiptSettings={receiptSettings} currentUser={currentUser} users={users} />} />
                                        <Route path="goods-costing" element={<GoodsCostingPage goodsCostings={goodsCostings} setGoodsCostings={setGoodsCostings} products={products} setProducts={setProducts} users={users} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} />} />
                                        <Route path="goods-receiving" element={<GoodsReceivingPage goodsReceivings={goodsReceivings} setGoodsReceivings={setGoodsReceivings} products={products} setProducts={setProducts} users={users} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} />} />
                                        <Route path="weekly-inventory-check" element={<WeeklyInventoryCheckPage weeklyChecks={weeklyChecks} setWeeklyChecks={setWeeklyChecks} products={products} users={users} currentUser={currentUser} receiptSettings={receiptSettings} businessSettings={businessSettings} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} t={t} />} />
                                        <Route path="alerts" element={<AlertsPage anomalyAlerts={anomalyAlerts} onDismiss={(id) => setAnomalyAlerts(p => p.map(a => a.id === id ? {...a, isDismissed: true} : a))} onMarkRead={(id) => setAnomalyAlerts(p => p.map(a => a.id === id ? {...a, isRead: true} : a))} receiptSettings={receiptSettings} currentUser={currentUser} />} />
                                        <Route path="profile" element={<MyProfile currentUser={currentUser} users={users} sales={sales} expenses={expenses} customers={customers} products={products} receiptSettings={receiptSettings} t={t} businessProfile={businessProfile} businessSettings={businessSettings} onUpdateWithdrawalStatus={() => {}} handleUpdateCustomPaymentStatus={() => {}} handleInitiateCustomPayment={() => {}} onRequestWithdrawal={() => {}} onConfirmWithdrawalReceived={() => {}} onUpdateCurrentUserProfile={() => {}} onSwitchUser={() => {}} companyValuations={[]} />} />
                                        <Route path="settings" element={<Settings language={language} setLanguage={setLanguage} t={t} currentUser={currentUser} users={users} receiptSettings={receiptSettings} setReceiptSettings={setReceiptSettings} businessSettings={businessSettings} onUpdateBusinessSettings={setBusinessSettings} businessProfile={businessProfile} onUpdateBusinessProfile={setBusinessProfile} ownerSettings={ownerSettings} onUpdateOwnerSettings={setOwnerSettings} printerSettings={printerSettings} onUpdatePrinterSettings={setPrinterSettings} permissions={DEFAULT_PERMISSIONS} onUpdatePermissions={() => {}} theme={theme} setTheme={setTheme} onResetBusiness={() => {}} />} />
                                        <Route path="ai" element={<AIAssistant currentUser={currentUser} sales={sales} products={products} expenses={expenses} customers={customers} users={users} expenseRequests={expenseRequests} cashCounts={cashCounts} goodsCosting={goodsCostings} goodsReceiving={goodsReceivings} anomalyAlerts={anomalyAlerts} businessSettings={businessSettings} lowStockThreshold={5} t={t} receiptSettings={receiptSettings} permissions={DEFAULT_PERMISSIONS} />} />
                                        <Route path="*" element={<Navigate to="dashboard" replace />} />
                                    </Routes>
                                </main>
                                <BottomNavBar t={t} cart={cart} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} />
                            </div>
                        </div>
                    )
                } />
            </Routes>
        </div>
    );
};

export default App;
