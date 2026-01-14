
// @ts-nocheck
import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { getSystemLogo, formatCurrency, isRateLimited } from './lib/utils';
import { 
    MenuIcon, CartIcon, CounterIcon, DEFAULT_RECEIPT_SETTINGS, DEFAULT_OWNER_SETTINGS, 
    DEFAULT_BUSINESS_SETTINGS, FINALIZED_SALE_STATUSES, WarningIcon 
} from './constants';
import { DEFAULT_PERMISSIONS, hasAccess } from './lib/permissions';
import { translations } from './lib/translations';
import type { 
    AppNotification, Sale, User, Withdrawal, Expense, ExpenseRequest, CashCount, 
    GoodsCosting, GoodsReceiving, AnomalyAlert, WeeklyInventoryCheck, Product, 
    Customer, Deposit, CartItem, BusinessProfile, BusinessSettingsData, 
    OwnerSettings, ReceiptSettingsData, PrinterSettingsData, BankAccount, BankTransaction 
} from './types';

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
import AlertsPage from './components/AlertsPage';
import BankAccountsPage from './components/BankAccounts';
import CashCountPage from './components/CashCount';
import GoodsCostingPage from './components/GoodsCosting';
import GoodsReceivingPage from './components/GoodsReceiving';
import WeeklyInventoryCheckPage from './components/WeeklyInventoryCheck';

const mapProductFromDb = (p: any): Product => ({
    id: p.id, sku: p.sku || '', name: p.name || 'Unnamed Asset', category: p.category || 'General',
    price: parseFloat(p.price) || 0, costPrice: parseFloat(p.cost_price) || 0, stock: parseInt(p.stock) || 0,
    imageUrl: p.image_url || 'https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=200&h=200&auto=format&fit=crop',
    commissionPercentage: parseFloat(p.commission_percentage) || 0, tieredPricing: p.tiered_pricing || [],
    productType: p.product_type || 'simple', variantOptions: p.variant_options || [], variants: p.variants || [],
});

const Header = ({ currentUser, businessProfile, onMenuClick, cartCount, notifications, onMarkNotifRead, onMarkAllNotifsRead }) => (
    <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30 no-print">
        <div className="flex items-center gap-4">
            <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl transition-colors"><MenuIcon className="w-6 h-6" /></button>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20"><img src={getSystemLogo()} className="w-6 h-6" alt="Logo" /></div>
                <div className="hidden sm:block text-left">
                    <h1 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none truncate max-w-[150px]">{businessProfile?.businessName || 'FinTab Terminal'}</h1>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Operational</p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
            <NotificationCenter notifications={notifications} onMarkAsRead={onMarkNotifRead} onMarkAllAsRead={onMarkAllNotifsRead} onClear={() => {}} />
            <Link to="/counter" className="relative p-2.5 rounded-2xl text-slate-400 hover:text-primary transition-all active:scale-95">
                <CounterIcon className="w-6 h-6" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 badge-standard bg-primary scale-90 border-2 border-white dark:border-gray-900 font-black min-w-[20px] h-[20px] flex items-center justify-center text-[9px] shadow-lg animate-scale-in">{cartCount}</span>}
            </Link>
            <div className="h-8 w-px bg-slate-100 dark:border-gray-800 mx-1"></div>
            <Link to="/profile" className="flex items-center gap-3 pl-2 group transition-all">
                <div className="text-right hidden md:block"><p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">{currentUser?.name}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{currentUser?.role}</p></div>
                <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.name}`} className="w-9 h-9 rounded-xl object-cover border-2 border-slate-50 dark:border-gray-800 group-hover:border-primary transition-all shadow-sm" alt="User" />
            </Link>
        </div>
    </header>
);

export class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-6 text-center font-sans">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-gray-800 animate-scale-in">
                    <WarningIcon className="w-16 h-16 text-rose-500 mx-auto mb-8" />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Integrity Breach</h2>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Restart Protocol</button>
                </div>
            </div>
        );
        return this.props.children;
    }
}

const App = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [authUserId, setAuthUserId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeBusinessId, setActiveBusinessId] = useState(localStorage.getItem('fintab_active_business_id'));
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [language, setLanguage] = useState('en');
    const [theme, setTheme] = useState('light');

    // System States
    const [businessProfile, setBusinessProfile] = useState(null);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]); 
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [deposits, setDeposits] = useState([]);
    const [expenseRequests, setExpenseRequests] = useState([]);
    const [anomalyAlerts, setAnomalyAlerts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [bankTransactions, setBankTransactions] = useState([]);
    const [cart, setCart] = useState([]);
    const [notifications, setNotifications] = useState([]);

    const syncIdentity = async (session) => {
        if (!session?.user) { setCurrentUser(null); setIsAuthLoading(false); return; }
        const guard = setTimeout(() => setIsAuthLoading(false), 5000);
        try {
            const client = await supabase.wait();
            const { data: mships } = await client.from('memberships').select('*').eq('user_id', session.user.id);
            const activeMship = mships?.find(m => m.business_id === activeBusinessId) || mships?.[0];
            if (activeMship) {
                if (activeBusinessId !== activeMship.business_id) {
                    setActiveBusinessId(activeMship.business_id);
                    localStorage.setItem('fintab_active_business_id', activeMship.business_id);
                }
                setCurrentUser({ 
                    id: session.user.id, email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    avatarUrl: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.id}`,
                    role: activeMship.role, initialInvestment: activeMship.initial_investment || 0,
                    status: 'Active', withdrawals: activeMship.metadata?.withdrawals || [],
                    customPayments: activeMship.metadata?.customPayments || []
                });
            } else {
                setCurrentUser({ id: session.user.id, email: session.user.email, role: 'Staff', status: 'Pending' });
            }
        } catch (err) { console.error("Identity Protocol Failure:", err.message); } 
        finally { clearTimeout(guard); setIsAuthLoading(false); }
    };

    useEffect(() => {
        let sub = null;
        const boot = async () => {
            const client = await supabase.wait();
            const { data: { session } } = await client.auth.getSession();
            if (session) { setAuthUserId(session.user.id); await syncIdentity(session); }
            else setIsAuthLoading(false);
            const { data } = client.auth.onAuthStateChange((ev, sess) => {
                setAuthUserId(sess?.user?.id || null);
                if (ev === 'SIGNED_OUT') { setCurrentUser(null); setActiveBusinessId(null); setIsAuthLoading(false); }
                else if (sess) syncIdentity(sess);
            });
            sub = data;
        };
        boot();
        return () => sub?.subscription.unsubscribe();
    }, [activeBusinessId]);

    const fetchLedger = async () => {
        if (!activeBusinessId || !authUserId) return;
        try {
            const client = await supabase.wait();
            const [prods, custs, sls, exps, banks, bankTx, alerts, biz, members] = await Promise.all([
                client.from('products').select('*').eq('business_id', activeBusinessId).order('name'),
                client.from('customers').select('*').eq('business_id', activeBusinessId).order('name'),
                client.from('sales').select('*').eq('business_id', activeBusinessId).order('date', { ascending: false }),
                client.from('expenses').select('*').eq('business_id', activeBusinessId).order('date', { ascending: false }),
                client.from('bank_accounts').select('*').eq('business_id', activeBusinessId),
                client.from('bank_transactions').select('*').eq('business_id', activeBusinessId).order('date', { ascending: false }),
                client.from('anomaly_alerts').select('*').eq('business_id', activeBusinessId).eq('is_dismissed', false),
                client.from('businesses').select('*').eq('id', activeBusinessId).single(),
                client.from('memberships').select('*').eq('business_id', activeBusinessId)
            ]);

            if (prods.data) setProducts(prods.data.map(mapProductFromDb));
            if (custs.data) setCustomers(custs.data.map(c => ({ id: c.id, name: c.name, email: c.email || '', phone: c.phone || '', joinDate: c.created_at, purchaseHistory: [] })));
            if (sls.data) setSales(sls.data);
            if (exps.data) setExpenses(exps.data);
            if (banks.data) setBankAccounts(banks.data);
            if (bankTx.data) setBankTransactions(bankTx.data);
            if (alerts.data) setAnomalyAlerts(alerts.data);
            if (biz.data) setBusinessProfile({ businessName: biz.data.name, id: biz.data.id, ...biz.data.profile });
            if (members.data) setUsers(members.data.map(m => ({ id: m.user_id, name: 'Unit ' + m.user_id.slice(-4), role: m.role, avatarUrl: `https://ui-avatars.com/api/?name=${m.user_id.slice(-4)}`, email: '...', status: 'Active', initialInvestment: m.initial_investment })));
        } catch (err) { console.error("Ledger Sync Failure:", err.message); }
    };

    useEffect(() => { fetchLedger(); }, [activeBusinessId, authUserId]);

    // Governance Logic gate
    const initiateWorkflow = async (type: string, auditId: string, amount: number, metadata: any) => {
        try {
            const client = await supabase.wait();
            const { data, error } = await client.from('approval_requests').insert({
                business_id: activeBusinessId, type, audit_link_id: auditId, amount, status: 'pending_v1',
                created_by: currentUser.id, metadata
            }).select().single();
            if (error) throw error;
            await fetchLedger();
            return data.id;
        } catch (err) { alert(`Workflow Init Failure: ${err.message}`); return null; }
    };

    const advanceWorkflow = async (requestId: string, nextStatus: string, note?: string) => {
        try {
            const client = await supabase.wait();
            const { error } = await client.from('approval_requests').update({ status: nextStatus }).eq('id', requestId);
            if (error) throw error;
            await client.from('approval_signatures').insert({ request_id: requestId, user_id: currentUser.id, status_assigned: nextStatus, note });
            await fetchLedger();
            return true;
        } catch (err) { alert(`Signature Auth Failure: ${err.message}`); return false; }
    };

    const handleSaveProduct = async (data: Product, isEditing: boolean) => {
        try {
            const client = await supabase.wait();
            const payload = { business_id: activeBusinessId, sku: data.sku, name: data.name, price: data.price, cost_price: data.costPrice, stock: data.stock, category: data.category, image_url: data.imageUrl, product_type: data.productType, variants: data.variants, variant_options: data.variantOptions };
            if (isEditing) await client.from('products').update(payload).eq('id', data.id);
            else await client.from('products').insert(payload);
            await fetchLedger();
        } catch (err) { alert(err.message); }
    };

    const handleProcessSale = async (sale: Sale) => {
        try {
            const client = await supabase.wait();
            const { error } = await client.from('sales').insert({ ...sale, business_id: activeBusinessId });
            if (error) throw error;
            for (const item of sale.items) {
                const { data: p } = await client.from('products').select('stock').eq('id', item.product.id).single();
                if (p) await client.from('products').update({ stock: Math.max(0, p.stock - item.quantity) }).eq('id', item.product.id);
            }
            await fetchLedger();
        } catch (err) { alert(err.message); }
    };

    const t = (k) => translations[language]?.[k] || k;

    if (isAuthLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    if (!authUserId) return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-gray-950 overflow-hidden">
            <Routes>
                <Route path="/invite" element={<InvitePage currentUser={null} />} />
                <Route path="*" element={<Login onEnterDemo={() => {}} />} />
            </Routes>
        </div>
    );

    if (!activeBusinessId && location.pathname !== '/invite' && location.pathname !== '/onboarding') return <SelectBusiness currentUser={currentUser} onSelect={setActiveBusinessId} onLogout={() => supabase.auth.signOut()} isOwnerAdmin={currentUser?.role === 'Owner'} />;

    return (
        <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950 overflow-hidden`}>
            <div className="flex flex-1 h-full overflow-hidden">
                <Sidebar t={t} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} businessProfile={businessProfile} cart={cart} onLogout={() => supabase.auth.signOut()} ownerSettings={DEFAULT_OWNER_SETTINGS} />
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <Header currentUser={currentUser} businessProfile={businessProfile} onMenuClick={() => setIsSidebarOpen(true)} cartCount={cart.reduce((s, i) => s + i.quantity, 0)} notifications={notifications} onMarkNotifRead={(id) => setNotifications(p => p.map(n => n.id === id ? {...n, isRead: true} : n))} onMarkAllNotifsRead={() => setNotifications(p => p.map(n => ({...n, isRead: true})))} />
                    <div id="app-main-viewport" className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/50 dark:bg-gray-950/50">
                        <main className="p-4 md:p-10 min-h-full max-w-[1600px] mx-auto">
                            <Routes>
                                <Route path="dashboard" element={<Dashboard products={products} customers={customers} users={users} sales={sales} expenses={expenses} deposits={deposits} expenseRequests={expenseRequests} anomalyAlerts={anomalyAlerts} currentUser={currentUser} businessProfile={businessProfile} businessSettings={DEFAULT_BUSINESS_SETTINGS} ownerSettings={DEFAULT_OWNER_SETTINGS} receiptSettings={DEFAULT_RECEIPT_SETTINGS} permissions={DEFAULT_PERMISSIONS} t={t} advanceWorkflow={advanceWorkflow} />} />
                                <Route path="onboarding" element={<Onboarding currentUser={currentUser} />} />
                                <Route path="inventory" element={<Inventory products={products} setProducts={setProducts} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} users={users} currentUser={currentUser} handleSaveProduct={handleSaveProduct} onDeleteProduct={async (id) => { const client = await supabase.wait(); await client.from('products').delete().eq('id', id); await fetchLedger(); }} />} />
                                <Route path="items" element={<Items products={products} cart={cart} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onUpdateCartItem={(p, v, q) => setCart(prev => { const idx = prev.findIndex(i => i.product.id === p.id && (!v || i.variant?.id === v.id)); if (q <= 0) return prev.filter((_, i) => i !== idx); if (idx > -1) { const up = [...prev]; up[idx].quantity = q; return up; } return [...prev, { product: p, variant: v, quantity: q, stock: v ? v.stock : p.stock }]; })} />} />
                                <Route path="counter" element={<Counter cart={cart} customers={customers} users={users} onClearCart={() => setCart([])} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={t} currentUser={currentUser} businessSettings={DEFAULT_BUSINESS_SETTINGS} printerSettings={{autoPrint: false}} permissions={DEFAULT_PERMISSIONS} bankAccounts={bankAccounts} onProcessSale={handleProcessSale} onAddCustomer={async (d) => { const client = await supabase.wait(); await client.from('customers').insert({...d, business_id: activeBusinessId}); await fetchLedger(); }} />} />
                                <Route path="receipts" element={<Receipts sales={sales} customers={customers} users={users} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onDeleteSale={async (id) => { const client = await supabase.wait(); await client.from('sales').delete().eq('id', id); await fetchLedger(); }} currentUser={currentUser} printerSettings={{autoPrint: false}} />} />
                                <Route path="customers" element={<Customers customers={customers} handleSaveCustomer={async (d) => { const client = await supabase.wait(); await client.from('customers').insert({...d, business_id: activeBusinessId}); await fetchLedger(); }} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                <Route path="users" element={<Users users={users} activeBusinessId={activeBusinessId} currentUser={currentUser} />} />
                                <Route path="investors" element={<InvestorPage users={users} netProfit={sales.reduce((s,x)=>s+x.total, 0) - expenses.reduce((s,x)=>s+x.amount, 0)} products={products} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} currentUser={currentUser} businessSettings={DEFAULT_BUSINESS_SETTINGS} permissions={DEFAULT_PERMISSIONS} initiateWorkflow={initiateWorkflow} />} />
                                <Route path="alerts" element={<AlertsPage anomalyAlerts={anomalyAlerts} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onMarkRead={() => {}} onDismiss={() => {}} />} />
                                <Route path="bank-accounts" element={<BankAccountsPage bankAccounts={bankAccounts} bankTransactions={bankTransactions} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} setBankAccounts={setBankAccounts} setBankTransactions={setBankTransactions} users={users} />} />
                                <Route path="cash-count" element={<CashCountPage sales={sales} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} initiateWorkflow={initiateWorkflow} advanceWorkflow={advanceWorkflow} t={t} />} />
                                <Route path="goods-costing" element={<GoodsCostingPage goodsCostings={[]} products={products} users={users} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} />} />
                                <Route path="goods-receiving" element={<GoodsReceivingPage goodsReceivings={[]} products={products} users={users} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} />} />
                                <Route path="weekly-inventory-check" element={<WeeklyInventoryCheckPage weeklyChecks={[]} products={products} users={users} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={() => {}} t={t} />} />
                                <Route path="profile" element={<MyProfile currentUser={currentUser} users={users} sales={sales} expenses={expenses} customers={customers} products={products} netProfit={0} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={t} businessSettings={DEFAULT_BUSINESS_SETTINGS} ownerSettings={DEFAULT_OWNER_SETTINGS} businessProfile={businessProfile} onConfirmWithdrawalReceived={() => {}} />} />
                                <Route path="settings" element={<Settings language={language} setLanguage={setLanguage} t={t} currentUser={currentUser} users={users} receiptSettings={DEFAULT_RECEIPT_SETTINGS} setReceiptSettings={() => {}} businessSettings={DEFAULT_BUSINESS_SETTINGS} onUpdateBusinessSettings={() => {}} businessProfile={businessProfile} onUpdateBusinessProfile={() => {}} ownerSettings={DEFAULT_OWNER_SETTINGS} onUpdateOwnerSettings={() => {}} printerSettings={{autoPrint: false}} onUpdatePrinterSettings={() => {}} permissions={DEFAULT_PERMISSIONS} theme={theme} setTheme={setTheme} />} />
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
