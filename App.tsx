
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
            </div>
            <Link to="/dashboard" className="flex items-center gap-3 group transition-all">
                <div className="hidden sm:block">
                    <h1 className="text-base font-black text-primary uppercase tracking-tight leading-none group-hover:text-blue-700 transition-colors">{businessProfile?.businessName || 'FinTab'}</h1>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 opacity-80">Authorized Node</p>
                </div>
            </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
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
    const [membershipsCount, setMembershipsCount] = useState<number | null>(null); // NULL indicates LOADING
    const [isOwnerAdmin, setIsOwnerAdmin] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [supabaseStatus, setSupabaseStatus] = useState(isSupabaseActive());

    // Operational State
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
    const [businessSettings, setBusinessSettings] = useState<BusinessSettingsData>(DEFAULT_BUSINESS_SETTINGS);
    const [receiptSettings, setReceiptSettings] = useState<ReceiptSettingsData>(DEFAULT_RECEIPT_SETTINGS);
    const [products, setProducts] = useState<Product[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isSupabaseActive()) {
                setSupabaseStatus(true);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // 1. IDENTITY LIFECYCLE (The Handshake Logic)
    const syncIdentity = async (session) => {
        if (!session?.user) {
            setCurrentUser(null);
            setActiveBusinessId(null);
            setMembershipsCount(0); // Explicit 0 allows login screen
            setIsInitialLoad(false);
            return;
        }

        const user: User = { 
            id: session.user.id, 
            email: session.user.email || '', 
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0], 
            avatarUrl: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.id}`, 
            role: 'Staff', 
            status: 'Active', 
            type: 'commission'
        };

        // Fetch memberships to confirm onboarding status
        // We MUST await this before setting membershipsCount to avoid redirect loops
        const { data: memberships, error: memErr } = await supabase
            .from('memberships')
            .select('business_id, role')
            .eq('user_id', session.user.id);
        
        if (memErr) {
            console.error("[Identity Sync] Retrieval Error:", memErr);
            setMembershipsCount(0);
            setIsInitialLoad(false);
            return;
        }

        const count = memberships?.length || 0;
        setMembershipsCount(count); // Transition from null to a number
        setCurrentUser({ ...user, role: memberships?.[0]?.role || 'Staff' });

        if (count > 0) {
            const storedBizId = localStorage.getItem('fintab_active_business_id');
            const validBiz = memberships.find(m => m.business_id === storedBizId) || memberships[0];
            if (validBiz) {
                setActiveBusinessId(validBiz.business_id);
                localStorage.setItem('fintab_active_business_id', validBiz.business_id);
            }
        }
        
        setIsInitialLoad(false);
    };

    useEffect(() => {
        if (!supabaseStatus) return;
        supabase.auth.getSession().then(({ data: { session } }) => syncIdentity(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => syncIdentity(session));
        return () => subscription.unsubscribe();
    }, [supabaseStatus]);

    // 2. DATA SYNCHRONIZATION
    useEffect(() => {
        const syncRegistry = async () => {
            if (!activeBusinessId || !supabaseStatus) return;
            
            const { data: biz } = await supabase.from('businesses').select('*').eq('id', activeBusinessId).single();
            if (biz) {
                setBusinessProfile({ 
                    id: biz.id, 
                    businessName: biz.name, 
                    businessType: biz.profile?.type || 'Retail', 
                    businessEmail: biz.profile?.ledger_email || '', 
                    businessPhone: biz.profile?.phone || '', 
                    logo: biz.profile?.logo_url || null
                });
                setBusinessSettings(biz.settings || DEFAULT_BUSINESS_SETTINGS);
            }

            const [prods, sls, custs, exps, members] = await Promise.all([
                supabase.from('products').select('*').eq('business_id', activeBusinessId),
                supabase.from('sales').select('*').eq('business_id', activeBusinessId),
                supabase.from('customers').select('*').eq('business_id', activeBusinessId),
                supabase.from('expenses').select('*').eq('business_id', activeBusinessId),
                supabase.from('memberships').select('role, user_id').eq('business_id', activeBusinessId)
            ]);

            if (prods.data) setProducts(prods.data);
            if (sls.data) setSales(sls.data);
            if (custs.data) setCustomers(custs.data);
            if (exps.data) setExpenses(exps.data);
            if (members.data) setUsers(members.data.map(m => ({ id: m.user_id, role: m.role, name: 'Unit Node' })));
        };

        syncRegistry();
    }, [activeBusinessId, supabaseStatus]);

    // LOADING STATE GUARD (Prevents redirect loop)
    // If membershipsCount is null, we are still checking the DB.
    // Showing a spinner here prevents the routing guards from guessing wrong.
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
    const t = (k: string) => translations['en']?.[k] || k;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-950">
            <ScrollToTop />
            <Routes>
                <Route path="/invite" element={<InvitePage currentUser={currentUser} />} />
                <Route path="/" element={!isAuthenticated ? <Login /> : !hasMemberships ? <Navigate to="/onboarding" replace /> : <Navigate to="/dashboard" replace />} />
                <Route path="/onboarding" element={!isAuthenticated ? <Navigate to="/" replace /> : hasMemberships ? <Navigate to="/dashboard" replace /> : <Onboarding currentUser={currentUser} />} />
                
                <Route path="/*" element={
                    !isAuthenticated ? <Navigate to="/" replace /> :
                    !hasMemberships ? <Navigate to="/onboarding" replace /> :
                    !activeBusinessId ? <div className="p-20 text-center"><button onClick={() => window.location.reload()} className="btn-base btn-primary">Sync Node</button></div> : (
                        <div className="flex flex-1 overflow-hidden">
                            <Sidebar t={t} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} businessProfile={businessProfile} cart={cart} />
                            <div id="app-main-viewport" className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                                <Header currentUser={currentUser} businessProfile={businessProfile} onMenuClick={() => setIsSidebarOpen(true)} cartCount={cart.length} />
                                <main className="p-4 md:p-8 flex-1">
                                    <Routes>
                                        <Route path="/dashboard" element={<Dashboard products={products} customers={customers} users={users} sales={sales} expenses={expenses} currentUser={currentUser} businessProfile={businessProfile} businessSettings={businessSettings} receiptSettings={receiptSettings} permissions={DEFAULT_PERMISSIONS} t={t} />} />
                                        <Route path="/inventory" element={<Inventory products={products} setProducts={setProducts} t={t} receiptSettings={receiptSettings} currentUser={currentUser} users={users} />} />
                                        <Route path="/profile" element={<MyProfile currentUser={currentUser} users={users} sales={sales} expenses={expenses} customers={customers} products={products} receiptSettings={receiptSettings} t={t} businessProfile={businessProfile} businessSettings={businessSettings} />} />
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
