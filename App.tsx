
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
import MyProfile from './components/MyProfile';
import Settings from './components/Settings';
import SelectBusiness from './components/SelectBusiness';
import Transactions from './components/Transactions';
import InvitePage from './components/InvitePage';
import NotificationCenter from './components/NotificationCenter';
import InvestorPage from './components/Investor';

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

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        const viewport = document.getElementById('app-main-viewport');
        if (viewport) viewport.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

const Header = ({ currentUser, businessProfile, onMenuClick, notifications, cartCount, onMarkNotifRead, onMarkAllNotifsRead }) => (
    <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800 z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl transition-all">
                <MenuIcon />
            </button>
            <div>
                <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{businessProfile?.businessName || 'FinTab'}</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global Terminal Hub</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <Link to="/counter" className="relative p-2.5 text-slate-400 hover:text-primary transition-all">
                <CounterIcon className="w-6 h-6" />
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-scale-in">
                        {cartCount}
                    </span>
                )}
            </Link>
            <NotificationCenter notifications={notifications} onMarkAsRead={onMarkNotifRead} onMarkAllAsRead={onMarkAllNotifsRead} onClear={() => {}} />
            <div className="h-8 w-px bg-slate-100 dark:bg-gray-800 mx-2"></div>
            <Link to="/profile" className="flex items-center gap-3 pl-2 group">
                <div className="relative">
                    <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.name || 'User'}`} className="w-9 h-9 rounded-xl object-cover border-2 border-white dark:border-gray-800 group-hover:border-primary transition-all" />
                    {(currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin') && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
                    )}
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentUser?.name?.split(' ')[0] || 'Unit'}</p>
                    <p className="text-[8px] font-bold text-primary uppercase tracking-widest">{currentUser?.role || 'Guest'}</p>
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
                <div className="h-screen flex items-center justify-center bg-slate-50 p-8 font-sans">
                    <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Interface Halt</h2>
                        <button onClick={() => window.location.reload()} className="btn-base btn-primary w-full">Re-Initialize</button>
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
    
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeBusinessId, setActiveBusinessId] = useState<string | null>(localStorage.getItem('fintab_active_business_id'));
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [language, setLanguage] = useState('en');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [users, setUsers] = useState<User[]>([]); 
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        let authListener = null;
        
        const syncIdentity = async (session) => {
            if (!session?.user) { 
                setCurrentUser(null); 
                setIsAuthLoading(false); 
                return; 
            }

            // Safety release for the spinner
            const initGuard = setTimeout(() => setIsAuthLoading(false), 5000);

            try {
                const client = await supabase.wait();
                if (!client) throw new Error("Supabase node unreachable");

                // SAFE SELECT: Requesting * to avoid 400 if specific columns like initial_investment are missing
                const { data: mships, error: mErr } = await client
                    .from('memberships')
                    .select('*')
                    .eq('user_id', session.user.id);
                
                if (mErr) {
                    throw new Error(`Membership Sync Failure: ${mErr.message}`);
                }

                const activeMship = mships?.find(m => m.business_id === activeBusinessId) || mships?.[0];

                if (activeMship) {
                    if (!activeBusinessId || activeBusinessId !== activeMship.business_id) {
                        setActiveBusinessId(activeMship.business_id);
                        localStorage.setItem('fintab_active_business_id', activeMship.business_id);
                    }

                    setCurrentUser({ 
                        id: session.user.id,
                        email: session.user.email || '',
                        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                        avatarUrl: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.id}`,
                        role: activeMship.role,
                        initialInvestment: activeMship.initial_investment || 0,
                        status: 'Active',
                        type: 'commission'
                    });
                } else {
                    // Logged in but not a member yet? Allow select business view
                    setCurrentUser({
                        id: session.user.id,
                        email: session.user.email || '',
                        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                        role: 'Staff',
                        status: 'Pending Verification'
                    });
                }
            } catch (err) { 
                console.error("Identity Sync Protocol Failure:", err.message || JSON.stringify(err)); 
            } finally {
                clearTimeout(initGuard);
                setIsAuthLoading(false);
            }
        };

        const boot = async () => {
            try {
                const client = await supabase.wait();
                const { data: { session } } = await client.auth.getSession();
                if (session) { 
                    setAuthUserId(session.user.id); 
                    await syncIdentity(session); 
                } else { 
                    setAuthUserId(null); 
                    setIsAuthLoading(false); 
                }

                const { data } = client.auth.onAuthStateChange((event, session) => {
                    setAuthUserId(session?.user?.id || null);
                    if (event === 'SIGNED_OUT') {
                        setCurrentUser(null); 
                        setActiveBusinessId(null);
                        localStorage.removeItem('fintab_active_business_id');
                        setIsAuthLoading(false);
                    } else if (session) { 
                        syncIdentity(session); 
                    }
                });
                authListener = data;
            } catch (e) {
                console.error("Critical Terminal Boot Failure:", e.message || JSON.stringify(e));
                setIsAuthLoading(false);
            }
        };

        boot();
        return () => { if (authListener?.subscription) authListener.subscription.unsubscribe(); };
    }, [activeBusinessId]);

    useEffect(() => {
        if (!activeBusinessId || !authUserId) return;
        const fetch = async () => {
            try {
                const client = await supabase.wait();
                const { data: prods } = await client.from('products').select('*').eq('business_id', activeBusinessId);
                if (prods) setProducts(prods.map(mapProductFromDb));
                
                const { data: biz } = await client.from('businesses').select('*').eq('id', activeBusinessId).single();
                if (biz) setBusinessProfile({ businessName: biz.name, id: biz.id, ...biz.profile });

                const { data: members } = await client.from('memberships').select('*').eq('business_id', activeBusinessId);
                if (members) {
                    setUsers(members.map(m => ({
                        id: m.user_id,
                        name: 'Unit ' + m.user_id.slice(-4),
                        role: m.role,
                        avatarUrl: `https://ui-avatars.com/api/?name=${m.user_id.slice(-4)}`,
                        email: '...',
                        status: 'Active',
                        type: 'commission',
                        initialInvestment: m.initial_investment
                    })));
                }
            } catch (err) { console.error("Ledger Sync Failure:", err.message || JSON.stringify(err)); }
        };
        fetch();
    }, [activeBusinessId, authUserId]);

    const t = (k) => translations[language]?.[k] || k;

    if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    if (!authUserId) return (
        <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950 overflow-hidden`}>
            <Routes>
                <Route path="/invite" element={<InvitePage currentUser={null} />} />
                <Route path="*" element={<Login onEnterDemo={() => {}} />} />
            </Routes>
        </div>
    );

    if (!activeBusinessId && location.pathname !== '/invite' && location.pathname !== '/onboarding') return <SelectBusiness currentUser={currentUser} onSelect={setActiveBusinessId} onLogout={() => supabase.auth.signOut()} isOwnerAdmin={currentUser?.role === 'Owner'} />;

    return (
        <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950 overflow-hidden`}>
            <ScrollToTop />
            <div className="flex flex-1 h-full overflow-hidden">
                <Sidebar t={t} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} businessProfile={businessProfile} cart={cart} onLogout={() => supabase.auth.signOut()} ownerSettings={DEFAULT_OWNER_SETTINGS} />
                
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <Header currentUser={currentUser} businessProfile={businessProfile} onMenuClick={() => setIsSidebarOpen(true)} cartCount={cart.reduce((s, i) => s + i.quantity, 0)} notifications={notifications} onMarkNotifRead={(id) => setNotifications(p => p.map(n => n.id === id ? {...n, isRead: true} : n))} onMarkAllNotifsRead={() => setNotifications(p => p.map(n => ({...n, isRead: true})))} />
                    
                    <div id="app-main-viewport" className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/50 dark:bg-gray-950/50">
                        <main className="p-4 md:p-10 min-h-full max-w-[1600px] mx-auto">
                            <Routes>
                                <Route path="dashboard" element={<Dashboard products={products} customers={[]} users={users} sales={sales} expenses={expenses} deposits={[]} expenseRequests={[]} anomalyAlerts={[]} currentUser={currentUser} businessProfile={businessProfile} businessSettings={DEFAULT_BUSINESS_SETTINGS} ownerSettings={DEFAULT_OWNER_SETTINGS} receiptSettings={DEFAULT_RECEIPT_SETTINGS} permissions={DEFAULT_PERMISSIONS} t={t} onDismissAnomaly={() => {}} onMarkAnomalyRead={() => {}} />} />
                                <Route path="onboarding" element={<Onboarding currentUser={currentUser} />} />
                                <Route path="inventory" element={<Inventory products={products} setProducts={setProducts} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} users={users} currentUser={currentUser} />} />
                                <Route path="items" element={<Items products={products} cart={cart} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onUpdateCartItem={(p, v, q) => setCart(prev => { const idx = prev.findIndex(i => i.product.id === p.id && (!v || i.variant?.id === v.id)); if (q <= 0) return prev.filter((_, i) => i !== idx); if (idx > -1) { const up = [...prev]; up[idx].quantity = q; return up; } return [...prev, { product: p, variant: v, quantity: q, stock: v ? v.stock : p.stock }]; })} />} />
                                <Route path="counter" element={<Counter cart={cart} customers={[]} users={users} onClearCart={() => setCart([])} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={t} currentUser={currentUser} businessSettings={DEFAULT_BUSINESS_SETTINGS} printerSettings={{autoPrint: false}} permissions={DEFAULT_PERMISSIONS} bankAccounts={[]} />} />
                                <Route path="receipts" element={<Receipts sales={sales} customers={[]} users={users} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onDeleteSale={() => {}} currentUser={currentUser} printerSettings={{autoPrint: false}} />} />
                                <Route path="users" element={<Users users={users} activeBusinessId={activeBusinessId} currentUser={currentUser} />} />
                                <Route path="investors" element={<InvestorPage users={users} netProfit={0} products={products} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} currentUser={currentUser} businessSettings={DEFAULT_BUSINESS_SETTINGS} permissions={DEFAULT_PERMISSIONS} />} />
                                <Route path="profile" element={<MyProfile currentUser={currentUser} users={users} sales={sales} expenses={expenses} customers={[]} products={products} netProfit={0} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={t} businessSettings={DEFAULT_BUSINESS_SETTINGS} ownerSettings={DEFAULT_OWNER_SETTINGS} businessProfile={businessProfile} onConfirmWithdrawalReceived={() => {}} />} />
                                <Route path="settings" element={<Settings language={language} setLanguage={setLanguage} t={t} currentUser={currentUser} users={users} receiptSettings={DEFAULT_RECEIPT_SETTINGS} setReceiptSettings={() => {}} businessSettings={DEFAULT_BUSINESS_SETTINGS} onUpdateBusinessSettings={() => {}} businessProfile={businessProfile} onUpdateBusinessProfile={() => {}} ownerSettings={DEFAULT_OWNER_SETTINGS} onUpdateOwnerSettings={() => {}} printerSettings={{autoPrint: false}} onUpdatePrinterSettings={() => {}} permissions={DEFAULT_PERMISSIONS} theme={theme} setTheme={setTheme} />} />
                                <Route path="invite" element={<InvitePage currentUser={currentUser} />} />
                                <Route path="*" element={<Navigate to="dashboard" replace />} />
                            </Routes>
                        </main>
                        <BottomNavBar t={t} cart={cart} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
