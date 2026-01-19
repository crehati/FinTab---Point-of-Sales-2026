
// @ts-nocheck
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { getSystemLogo } from './lib/utils';
import { MenuIcon, CounterIcon, DEFAULT_RECEIPT_SETTINGS, DEFAULT_OWNER_SETTINGS, DEFAULT_BUSINESS_SETTINGS, WarningIcon } from './constants';
import { DEFAULT_PERMISSIONS } from './lib/permissions';
import { translations } from './lib/translations';

// Component Imports - Critical Registry
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
import InvitePage from './components/InvitePage';
import NotificationCenter from './components/NotificationCenter';
import InvestorPage from './components/Investor';
import AlertsPage from './components/AlertsPage';
import BankAccountsPage from './components/BankAccounts';
import CashCountPage from './components/CashCount';
import GoodsCostingPage from './components/GoodsCosting';
import GoodsReceivingPage from './components/GoodsReceiving';
import WeeklyInventoryCheckPage from './components/WeeklyInventoryCheck';
import ExpenseRequestPage from './components/ExpenseRequestPage';
import Transactions from './components/Transactions';
import AIAssistant from './components/AIAssistant';

const LoadingScreen = () => (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-950 font-sans">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Syncing FinTab Node...</p>
    </div>
);

export class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-6 text-center font-sans">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 animate-scale-in">
                    <WarningIcon className="w-16 h-16 text-rose-500 mx-auto mb-8" />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Integrity Halt</h2>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-10 leading-relaxed font-bold">A localized runtime error was intercepted.</p>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Re-auth Node</button>
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

    // Action Ref Lock - Prevent double execution
    const isActionProcessing = useRef(false);
    const authListenerRef = useRef(null);
    const inactivityTimerRef = useRef(null);

    // Auto-Logout Inactivity Logic (30 Minutes)
    useEffect(() => {
        if (!authUserId) {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            return;
        }

        const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds

        const resetInactivityTimer = () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = setTimeout(async () => {
                console.info("[FinTab Security] Inactivity threshold reached. Terminating session node.");
                try {
                    const client = await supabase.wait();
                    await client.auth.signOut();
                } catch (e) {}
            }, INACTIVITY_LIMIT);
        };

        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(evt => document.addEventListener(evt, resetInactivityTimer));

        // Initial trigger
        resetInactivityTimer();

        return () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            activityEvents.forEach(evt => document.removeEventListener(evt, resetInactivityTimer));
        };
    }, [authUserId]);

    // State Ledger
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
    const [notifications, setNotifications] = useState([]);
    const [cart, setCart] = useState([]);
    const [businessProfile, setBusinessProfile] = useState(null);

    // ENTERPRISE SCALING: Clear memory when switching business nodes
    const clearStateLedger = () => {
        setProducts([]);
        setCustomers([]);
        setUsers([]);
        setSales([]);
        setExpenses([]);
        setDeposits([]);
        setExpenseRequests([]);
        setAnomalyAlerts([]);
        setBankAccounts([]);
        setBankTransactions([]);
        setNotifications([]);
        setCart([]);
        setBusinessProfile(null);
    };

    const syncIdentity = async (session) => {
        if (!session?.user) { setCurrentUser(null); setIsAuthLoading(false); return; }
        try {
            const client = await supabase.wait();
            const { data: mships } = await client.from('memberships').select('*').eq('user_id', session.user.id);
            const activeMship = mships?.find(m => m.business_id === activeBusinessId) || mships?.[0];
            if (activeMship) {
                if (activeBusinessId !== activeMship.business_id) {
                    clearStateLedger(); // Flush old business data
                    setActiveBusinessId(activeMship.business_id);
                    localStorage.setItem('fintab_active_business_id', activeMship.business_id);
                }
                setCurrentUser({ 
                    id: session.user.id, email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    avatarUrl: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.id}`,
                    role: activeMship.role, initialInvestment: activeMship.initial_investment || 0,
                    status: 'Active', withdrawals: activeMship.metadata?.withdrawals || [],
                    customPayments: activeMship.metadata?.customPayments || [],
                    phone: session.user.user_metadata?.phone || ''
                });
            } else {
                setCurrentUser({ id: session.user.id, email: session.user.email, role: 'Staff', status: 'Pending' });
            }
        } catch (err) { 
            console.error("Identity Sync Failed", err.message);
            if (err.message && err.message.includes('Refresh Token')) {
                const client = await supabase.wait();
                await client.auth.signOut();
            }
        } 
        finally { setIsAuthLoading(false); }
    };

    const handleUpdateCurrentUserProfile = async (profileData) => {
        if (!currentUser) return;
        try {
            const client = await supabase.wait();
            const { error } = await client.auth.updateUser({
                data: {
                    full_name: profileData.name || currentUser.name,
                    avatar_url: profileData.avatarUrl || currentUser.avatarUrl,
                    phone: profileData.phone || currentUser.phone
                }
            });

            if (error) throw error;

            // If updating investment (Owner role usually), update membership table
            if (profileData.initialInvestment !== undefined && currentUser.role === 'Owner') {
                const { error: mshipError } = await client.from('memberships')
                    .update({ initial_investment: profileData.initialInvestment })
                    .eq('business_id', activeBusinessId)
                    .eq('user_id', currentUser.id);
                if (mshipError) throw mshipError;
            }

            // Locally update the state immediately for reactive UI
            setCurrentUser(prev => ({
                ...prev,
                name: profileData.name || prev.name,
                avatarUrl: profileData.avatarUrl || prev.avatarUrl,
                phone: profileData.phone || prev.phone,
                initialInvestment: profileData.initialInvestment !== undefined ? profileData.initialInvestment : prev.initialInvestment
            }));

            // Sync full ledger to ensure all components see the change
            await fetchLedger();
            return true;
        } catch (err) {
            console.error("Profile Sync Failure:", err);
            alert("Digital Identity Sync Failure: " + err.message);
            return false;
        }
    };

    const createSystemNotification = async (targetUserId, title, message, type, link = "") => {
        try {
            const client = await supabase.wait();
            await client.from('notifications').insert({
                user_id: targetUserId,
                business_id: activeBusinessId,
                title,
                message,
                type,
                link
            });
        } catch (err) { console.error("Notification Dispatch Error", err); }
    };

    useEffect(() => {
        const boot = async () => {
            try {
                const client = await supabase.wait();
                const { data: { session } } = await client.auth.getSession();
                if (session) { setAuthUserId(session.user.id); await syncIdentity(session); }
                else setIsAuthLoading(false);

                if (!authListenerRef.current) {
                    const { data: { subscription } } = client.auth.onAuthStateChange(async (ev, sess) => {
                        setAuthUserId(sess?.user?.id || null);
                        if (ev === 'SIGNED_OUT') { clearStateLedger(); setCurrentUser(null); setActiveBusinessId(null); setIsAuthLoading(false); }
                        else if (sess) await syncIdentity(sess);
                    });
                    authListenerRef.current = subscription;
                }
            } catch (e) {
                console.error("Supabase boot error:", e);
                setIsAuthLoading(false);
            }
        };
        boot();
        return () => { if (authListenerRef.current) authListenerRef.current.unsubscribe(); };
    }, [activeBusinessId]);

    const fetchLedger = async () => {
        if (!activeBusinessId || !authUserId) return;
        try {
            const client = await supabase.wait();
            
            // INDIVIDUAL TABLE FETCHES: Resilient to single-table failures (CORS, missing table, etc)
            const safeFetch = async (query, setter, mapper, fallback = []) => {
                try {
                    const { data, error } = await query;
                    if (error) throw error;
                    if (data) setter(mapper ? mapper(data) : data);
                    else setter(fallback);
                } catch (e) {
                    // SILENT FALLBACK: If table is missing from schema, default to empty array instead of null
                    setter(fallback);
                    if (!e.message.includes('not find the table')) {
                        console.warn(`[FinTab Ledger] SafeFetch Interrupted: ${e.message}`);
                    }
                }
            };

            await Promise.all([
                safeFetch(client.from('products').select('*').eq('business_id', activeBusinessId).order('name'), setProducts, (data) => data.map(p => ({ 
                    ...p, price: parseFloat(p.price), costPrice: parseFloat(p.cost_price), stock: parseInt(p.stock), 
                    imageUrl: p.image_url, stockHistory: p.stock_history || [], commissionPercentage: p.commission_percentage 
                }))),
                safeFetch(client.from('customers').select('*').eq('business_id', activeBusinessId).order('name'), setCustomers),
                safeFetch(client.from('sales').select('*').eq('business_id', activeBusinessId).order('date', { ascending: false }), setSales, (data) => data.map(s => ({
                    ...s, customerId: s.customer_id, userId: s.user_id, taxRate: s.tax_rate, paymentMethod: s.payment_method,
                    cashReceived: s.cash_received, bankReceiptNumber: s.bank_receipt_number, bankName: s.bank_name, bankAccountId: s.bank_account_id
                }))),
                safeFetch(client.from('expenses').select('*').eq('business_id', activeBusinessId).order('date', { ascending: false }), setExpenses, (data) => data.map(e => ({
                    ...e, paymentSource: e.payment_source, bankAccountId: e.bank_account_id
                }))),
                safeFetch(client.from('bank_accounts').select('*').eq('business_id', activeBusinessId).order('bank_name'), setBankAccounts, (data) => data.map(b => ({ 
                    ...b, bankName: b.bank_name, accountName: b.account_name, accountNumber: b.account_number, balance: parseFloat(b.balance)
                }))),
                safeFetch(client.from('bank_transactions').select('*').eq('business_id', activeBusinessId).order('date', { ascending: false }), setBankTransactions, (data) => data.map(t => ({ 
                    ...t, bankAccountId: t.bank_account_id, userId: t.user_id
                }))),
                safeFetch(client.from('anomaly_alerts').select('*').eq('business_id', activeBusinessId).eq('is_dismissed', false), setAnomalyAlerts),
                safeFetch(client.from('businesses').select('*').eq('id', activeBusinessId).single(), setBusinessProfile, (data) => ({ businessName: data.name, id: data.id, ...data.profile }), null),
                safeFetch(client.from('memberships').select('*').eq('business_id', activeBusinessId), setUsers, (data) => data.map(m => ({ id: m.user_id, name: 'Unit ' + m.user_id.slice(-4), role: m.role, avatarUrl: `https://ui-avatars.com/api/?name=${m.user_id.slice(-4)}`, email: '...', status: 'Active', initialInvestment: m.initial_investment }))),
                safeFetch(client.from('notifications').select('*').eq('business_id', activeBusinessId).eq('user_id', authUserId).order('created_at', { ascending: false }), setNotifications, (data) => data.map(n => ({
                    id: n.id, title: n.title, message: n.message, type: n.type, link: n.link, isRead: n.is_read, timestamp: n.created_at
                }))),
                safeFetch(client.from('deposits').select('*').eq('business_id', activeBusinessId).order('date', { ascending: false }), setDeposits)
            ]);
        } catch (err) { console.error("Sync Failure", err.message); }
    };

    useEffect(() => { fetchLedger(); }, [activeBusinessId, authUserId]);

    const advanceWorkflow = async (requestId: string, nextStatus: string, note?: string) => {
        try {
            const client = await supabase.wait();
            const { error: updError } = await client.from('approval_requests').update({ status: nextStatus }).eq('id', requestId);
            if (updError) throw updError;
            
            const { error: sigError } = await client.from('approval_signatures').insert({ request_id: requestId, user_id: currentUser.id, status_assigned: nextStatus, note });
            if (sigError) throw sigError;
            
            const { data: originalReq } = await client.from('approval_requests').select('created_by, type').eq('id', requestId).single();
            if (originalReq) {
                await createSystemNotification(originalReq.created_by, "Workflow Update", `Your ${originalReq.type} request status has shifted to ${nextStatus.replace('_', ' ')}.`, "info", "");
            }

            await fetchLedger();
            return true;
        } catch (e) {
            console.error("Workflow advancement error:", e);
            alert("Workflow Error: " + e.message);
            return false;
        }
    };

    const initiateWorkflow = async (type: string, auditId: string, amount: number, metadata: any) => {
        try {
            const client = await supabase.wait();
            const { data, error } = await client.from('approval_requests').insert({ business_id: activeBusinessId, type, audit_link_id: auditId, amount, status: 'pending_v1', created_by: currentUser.id, metadata }).select().single();
            
            if (error) throw error;

            const owners = users.filter(u => u.role === 'Owner');
            for (const owner of owners) {
                await createSystemNotification(owner.id, "Verification Required", `A new ${type.replace('_', ' ')} protocol requires your authorization.`, "action_required", "/dashboard");
            }

            await fetchLedger();
            return data.id;
        } catch (e) {
            console.error("Workflow initiation error:", e);
            alert("Workflow Initiation Failure: " + e.message);
            return null;
        }
    };

    const onApproveBankSale = async (saleId: string) => {
        if (isActionProcessing.current) return;
        isActionProcessing.current = true;
        try {
            const client = await supabase.wait();
            const { data: sale, error: fetchErr } = await client.from('sales').select('*').eq('id', saleId).single();
            if (fetchErr) throw fetchErr;
            
            if (sale.status === 'completed_bank_verified') {
                 isActionProcessing.current = false;
                 return;
            }

            const { error: updateError } = await client.from('sales').update({ status: 'completed_bank_verified' }).eq('id', saleId);
            if (updateError) throw updateError;

            for (const item of sale.items) {
                const pid = item.product.id;
                const { data: current, error: pError } = await client.from('products').select('stock, stock_history').eq('id', pid).single();
                if (pError) throw pError;
                
                if (current) {
                    const newStock = Math.max(0, current.stock - item.quantity);
                    const history = [{
                        date: new Date().toISOString(),
                        userId: currentUser.id,
                        type: 'remove',
                        quantity: item.quantity,
                        reason: `Verified Bank Sale Settlement (Ref: ${sale.id.slice(-8).toUpperCase()})`,
                        newStockLevel: newStock
                    }, ...(current.stock_history || [])];
                    const { error: stockError } = await client.from('products').update({ stock: newStock, stock_history: history }).eq('id', pid);
                    if (stockError) throw stockError;
                }
            }

            await createSystemNotification(sale.user_id, "Bank Receipt Verified", `Transaction ${sale.id.slice(-6).toUpperCase()} has been authorized.`, "success", "/receipts");
            await fetchLedger();
            alert("Bank node verification finalized. Inventory synchronized.");
        } catch (err) {
            alert("Verification Failure: " + err.message);
        } finally {
            isActionProcessing.current = false;
        }
    };

    const onRejectBankSale = async (saleId: string, reason: string) => {
        if (isActionProcessing.current) return;
        isActionProcessing.current = true;
        try {
            const client = await supabase.wait();
            const { error: updateError } = await client.from('sales').update({ status: 'rejected_bank_not_verified', verification_note: reason }).eq('id', saleId);
            if (updateError) throw updateError;
            
            const { data: sale } = await client.from('sales').select('user_id').eq('id', saleId).single();
            if (sale) {
                await createSystemNotification(sale.user_id, "Bank Receipt Rejected", `Receipt for ${saleId.slice(-6).toUpperCase()} was flagged: ${reason}`, "error", "/receipts");
            }
            await fetchLedger();
        } catch (err) {
            alert("Rejection Protocol Failure: " + err.message);
        } finally {
            isActionProcessing.current = false;
        }
    };

    const unifiedLedger = useMemo(() => {
        const sEntries = (sales || []).map(s => ({
            id: s.id,
            date: s.date,
            created_at: s.date,
            type: 'SALE',
            amount: s.total,
            audit_link_id: s.id.slice(-8).toUpperCase(),
            actor_id: s.userId
        }));
        const eEntries = (expenses || []).filter(e => e.status !== 'deleted').map(e => ({
            id: e.id,
            date: e.date,
            created_at: e.date,
            type: 'EXPENSE',
            amount: -e.amount,
            audit_link_id: e.id.slice(-8).toUpperCase(),
            actor_id: 'SYSTEM'
        }));
        return [...sEntries, ...eEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, expenses]);

    const handleSaveProduct = async (d: any, edit: boolean) => {
        try {
            const client = await supabase.wait();
            const dbProduct = {
                name: d.name,
                sku: d.sku,
                description: d.description,
                category: d.category,
                price: d.price,
                cost_price: d.costPrice,
                stock: d.stock,
                image_url: d.imageUrl,
                commission_percentage: d.commissionPercentage,
                product_type: d.productType || 'simple',
                variant_options: d.variantOptions || [],
                variants: d.variants || [],
                tiered_pricing: d.tieredPricing || [],
                business_id: activeBusinessId
            };

            const { error } = edit 
                ? await client.from('products').update(dbProduct).eq('id', d.id)
                : await client.from('products').insert(dbProduct);
            
            if (error) throw error;
            await fetchLedger();
            return true;
        } catch (err) { 
            console.error("Product Save Failure:", err);
            alert("Integrity Error: Could not commit asset to cloud registry. Diagnostic: " + err.message); 
            return false;
        }
    };

    const handleSaveStockAdjustment = async (productId: string, adj: any) => {
        try {
            const client = await supabase.wait();
            const product = products.find(p => p.id === productId);
            if (!product) return;
            const qty = Number(adj.quantity);
            const newStock = adj.type === 'add' ? product.stock + qty : product.stock - qty;
            const newHistoryItem = { date: new Date().toISOString(), userId: currentUser.id, type: adj.type, quantity: qty, reason: adj.reason, newStockLevel: newStock };
            const updatedHistory = [newHistoryItem, ...(product.stockHistory || [])];
            const { error } = await client.from('products').update({ stock: newStock, stock_history: updatedHistory }).eq('id', productId);
            if (error) throw error;
            await fetchLedger();
        } catch (err) { alert("Digital Logic Error: Could not commit stock shift to registry. Diagnostic: " + err.message); }
    };

    const handleRequestDeposit = async (amt, desc, bankId) => {
        try {
            const client = await supabase.wait();
            const { data: dep, error } = await client.from('deposits').insert({
                business_id: activeBusinessId,
                user_id: currentUser.id,
                amount: amt,
                description: desc,
                bank_account_id: bankId,
                status: 'pending',
                date: new Date().toISOString()
            }).select().single();
            
            if (error) throw error;

            // NOTIFY OWNERS
            const owners = users.filter(u => u.role === 'Owner' || u.role === 'Admin');
            for (const owner of owners) {
                await createSystemNotification(
                    owner.id, 
                    "New Deposit Request", 
                    `${currentUser.name} requested a deposit of ${amt}. Verification required.`, 
                    "payment", 
                    "/transactions"
                );
            }

            await fetchLedger();
        } catch (err) {
            alert("Deposit Flow Error: " + err.message);
        }
    };

    const handleUpdateDepositStatus = async (id, status) => {
        try {
            const client = await supabase.wait();
            const { data: deposit, error: fetchErr } = await client.from('deposits').select('*').eq('id', id).single();
            if (fetchErr) throw fetchErr;

            const { error: updError } = await client.from('deposits').update({ status }).eq('id', id);
            if (updError) throw updError;

            // If approved, update bank balance if a bank account was selected
            if (status === 'approved' && deposit.bank_account_id) {
                const { data: bank, error: bError } = await client.from('bank_accounts').select('balance').eq('id', deposit.bank_account_id).single();
                if (bError) throw bError;
                
                if (bank) {
                    const { error: accUpdError } = await client.from('bank_accounts').update({ balance: (bank.balance || 0) + deposit.amount }).eq('id', deposit.bank_account_id);
                    if (accUpdError) throw accUpdError;

                    const { error: txError } = await client.from('bank_transactions').insert({
                        bank_account_id: deposit.bank_account_id,
                        type: 'deposit',
                        amount: deposit.amount,
                        description: `Approved Cash Deposit: ${deposit.description}`,
                        user_id: currentUser.id,
                        business_id: activeBusinessId,
                        date: new Date().toISOString(),
                        reference_id: deposit.id
                    });
                    if (txError) throw txError;
                }
            }

            // NOTIFY REQUESTER
            await createSystemNotification(
                deposit.user_id,
                `Deposit ${status === 'approved' ? 'Verified' : 'Rejected'}`,
                `Your deposit request for ${deposit.amount} was ${status} by ${currentUser.name}.`,
                status === 'approved' ? 'success' : 'error',
                "/transactions"
            );

            await fetchLedger();
        } catch (err) {
            alert("Status Update Protocol Failure: " + err.message);
        }
    };

    const t = (k) => translations[language]?.[k] || k;

    if (isAuthLoading) return <LoadingScreen />;
    if (!authUserId) return (
        <Routes>
            <Route path="/invite" element={<InvitePage currentUser={null} />} />
            <Route path="*" element={<Login onEnterDemo={() => {}} />} />
        </Routes>
    );
    if (!activeBusinessId && location.pathname !== '/invite' && location.pathname !== '/onboarding') {
        return <SelectBusiness currentUser={currentUser} onSelect={setActiveBusinessId} onLogout={() => supabase.auth.signOut()} />;
    }

    return (
        <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-gray-950 overflow-hidden font-sans`}>
            <div className="flex flex-1 h-full overflow-hidden">
                <Sidebar t={t} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} businessProfile={businessProfile} cart={cart} onLogout={() => supabase.auth.signOut()} ownerSettings={DEFAULT_OWNER_SETTINGS} />
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30 no-print">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl transition-colors"><MenuIcon className="w-6 h-6" /></button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20"><img src={getSystemLogo()} className="w-6 h-6" alt="Logo" /></div>
                                <div className="hidden sm:block text-left">
                                    <h1 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none truncate max-w-[150px]">{businessProfile?.businessName || 'FinTab Node'}</h1>
                                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operational</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            <NotificationCenter notifications={notifications} onMarkAsRead={async (id)=>{
                                try {
                                    const client = await supabase.wait();
                                    await client.from('notifications').update({ is_read: true }).eq('id', id);
                                    await fetchLedger();
                                } catch (e) {}
                            }} onMarkAllAsRead={async ()=>{
                                try {
                                    const client = await supabase.wait();
                                    await client.from('notifications').update({ is_read: true }).eq('user_id', authUserId);
                                    await fetchLedger();
                                } catch (e) {}
                            }} />
                            <Link to="/counter" className="relative p-2.5 rounded-2xl text-slate-400 hover:text-primary transition-all active:scale-95">
                                <CounterIcon className="w-6 h-6" />
                                {cart.length > 0 && <span className="absolute -top-1 -right-1 badge-standard bg-primary scale-90 border-2 border-white dark:border-gray-900 font-black min-w-[20px] h-[20px] flex items-center justify-center text-[9px] shadow-lg">{cart.length}</span>}
                            </Link>
                            <div className="h-8 w-px bg-slate-100 dark:border-gray-800 mx-1"></div>
                            <Link to="/profile" className="flex items-center gap-3 pl-2 group transition-all">
                                <div className="text-right hidden md:block"><p className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-primary">{currentUser?.name}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{currentUser?.role}</p></div>
                                <img src={currentUser?.avatarUrl} className="w-9 h-9 rounded-xl object-cover border-2 border-slate-50 shadow-sm" alt="User" />
                            </Link>
                        </div>
                    </header>
                    <div id="app-main-viewport" className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/50 dark:bg-gray-950/50">
                        <main className="p-4 md:p-10 min-h-full max-w-[1600px] mx-auto">
                            <Suspense fallback={<LoadingScreen />}>
                                <Routes>
                                    <Route path="dashboard" element={<Dashboard products={products} customers={customers} users={users} sales={sales} expenses={expenses} deposits={deposits} expenseRequests={expenseRequests} anomalyAlerts={anomalyAlerts} currentUser={currentUser} businessProfile={businessProfile} businessSettings={DEFAULT_BUSINESS_SETTINGS} ownerSettings={DEFAULT_OWNER_SETTINGS} receiptSettings={DEFAULT_RECEIPT_SETTINGS} permissions={DEFAULT_PERMISSIONS} t={t} advanceWorkflow={advanceWorkflow} />} />
                                    <Route path="today" element={<Today sales={sales} customers={customers} expenses={expenses} products={products} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                    <Route path="reports" element={<Reports sales={sales} products={products} expenses={expenses} customers={customers} users={users} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} ownerSettings={DEFAULT_OWNER_SETTINGS} ledgerEntries={unifiedLedger} />} />
                                    <Route path="inventory" element={<Inventory products={products} setProducts={setProducts} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} users={users} currentUser={currentUser} handleSaveProduct={handleSaveProduct} onSaveStockAdjustment={handleSaveStockAdjustment} onDeleteProduct={async (id) => { const client = await supabase.wait(); const { error } = await client.from('products').delete().eq('id', id); if (error) alert("Purge Error: " + error.message); await fetchLedger(); }} />} />
                                    <Route path="counter" element={<Counter cart={cart} customers={customers} users={users} onClearCart={() => setCart([])} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={t} currentUser={currentUser} businessSettings={DEFAULT_BUSINESS_SETTINGS} printerSettings={{autoPrint: false}} permissions={DEFAULT_PERMISSIONS} bankAccounts={bankAccounts} onUpdateCartItem={(p, v, q) => setCart(prev => { const idx = prev.findIndex(i => i.product.id === p.id && (!v || i.variant?.id === v.id)); if (q <= 0) return prev.filter((_, i) => i !== idx); if (idx > -1) { const up = [...prev]; up[idx].quantity = q; return up; } return [...prev, { product: p, variant: v, quantity: q, stock: v ? v.stock : p.stock }]; })} onSaveProforma={async (s) => {
                                        const client = await supabase.wait();
                                        const dbSale = { business_id: activeBusinessId, customer_id: s.customerId, user_id: s.userId, date: new Date(s.date).toISOString(), items: s.items, subtotal: s.subtotal, tax: s.tax, discount: s.discount, total: s.total, status: 'proforma', tax_rate: s.taxRate };
                                        const { error } = await client.from('sales').insert(dbSale);
                                        if (error) alert("Proforma Error: " + error.message);
                                        await fetchLedger();
                                    }} onProcessSale={async (s) => { 
                                        const client = await supabase.wait(); 
                                        const dbSale = { business_id: activeBusinessId, customer_id: s.customerId, user_id: s.userId, date: new Date(s.date).toISOString(), items: s.items, subtotal: s.subtotal, tax: s.tax, discount: s.discount, total: s.total, payment_method: s.payment_method, tax_rate: s.taxRate, status: s.status, cash_received: s.cashReceived, change: s.change, bank_receipt_number: s.bankReceiptNumber, bank_name: s.bankName, bank_account_id: s.bankAccountId };
                                        const { data: saleData, error: saleError } = await client.from('sales').insert(dbSale).select().single(); 
                                        if (saleError) { alert("Checkout Error: " + saleError.message); return; }

                                        if (s.status === 'pending_bank_verification') {
                                            const ownersAndVerifiers = users.filter(u => u.role === 'Owner' || u.role === 'BankVerifier');
                                            for (const recipient of ownersAndVerifiers) {
                                                await createSystemNotification(recipient.id, "New Bank Receipt", `A sale of ${s.total} requires bank verification.`, "payment", "/receipts");
                                            }
                                        }
                                        if (s.status !== 'pending_bank_verification') {
                                            for (const item of s.items) {
                                                const pid = item.product.id;
                                                const { data: current, error: pError } = await client.from('products').select('stock, stock_history').eq('id', pid).single();
                                                if (pError) throw pError;
                                                if (current) {
                                                    const newStock = Math.max(0, current.stock - item.quantity);
                                                    const history = [{ date: new Date().toISOString(), userId: currentUser.id, type: 'remove', quantity: item.quantity, reason: `POS Sale (Ref: ${saleData.id.slice(-8)})`, newStockLevel: newStock }, ...(current.stock_history || [])];
                                                    const { error: stockUpdError } = await client.from('products').update({ stock: newStock, stock_history: history }).eq('id', pid);
                                                    if (stockUpdError) throw stockUpdError;
                                                }
                                            }
                                        }
                                        await fetchLedger(); 
                                    }} onAddCustomer={async (d) => { const client = await supabase.wait(); const { error } = await client.from('customers').insert({...d, business_id: activeBusinessId}); if (error) alert("Identity Error: " + error.message); await fetchLedger(); }} />} />
                                    <Route path="cash-count" element={<CashCountPage sales={sales} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} initiateWorkflow={initiateWorkflow} advanceWorkflow={advanceWorkflow} t={t} />} />
                                    <Route path="bank-accounts" element={<BankAccountsPage bankAccounts={bankAccounts} bankTransactions={bankTransactions} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} setBankAccounts={setBankAccounts} setBankTransactions={setBankTransactions} users={users} />} />
                                    <Route path="transactions" element={<Transactions sales={sales} deposits={deposits} bankAccounts={bankAccounts} users={users} expenses={expenses} receiptSettings={DEFAULT_RECEIPT_SETTINGS} currentUser={currentUser} onRequestDeposit={handleRequestDeposit} onUpdateDepositStatus={handleUpdateDepositStatus} t={t} />} />
                                    <Route path="goods-costing" element={<GoodsCostingPage goodsCostings={[]} products={products} users={users} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={createSystemNotification} />} />
                                    <Route path="goods-receiving" element={<GoodsReceivingPage goodsReceivings={[]} products={products} users={users} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={createSystemNotification} />} />
                                    <Route path="weekly-inventory-check" element={<WeeklyInventoryCheckPage weeklyChecks={[]} products={products} users={users} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} businessSettings={DEFAULT_BUSINESS_SETTINGS} businessProfile={businessProfile} permissions={DEFAULT_PERMISSIONS} createNotification={createSystemNotification} t={t} />} />
                                    <Route path="customers" element={<Customers customers={customers} handleSaveCustomer={async (d) => { const client = await supabase.wait(); const { error } = await client.from('customers').insert({...d, business_id: activeBusinessId}); if (error) alert("Identity Error: " + error.message); await fetchLedger(); }} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                    <Route path="users" element={<Users users={users} activeBusinessId={activeBusinessId} currentUser={currentUser} />} />
                                    <Route path="investors" element={<InvestorPage users={users} netProfit={sales.reduce((s,x)=>s+x.total, 0) - expenses.reduce((s,x)=>s+x.amount, 0)} products={products} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} currentUser={currentUser} businessSettings={DEFAULT_BUSINESS_SETTINGS} permissions={DEFAULT_PERMISSIONS} initiateWorkflow={initiateWorkflow} />} />
                                    <Route path="receipts" element={<Receipts sales={sales} customers={customers} users={users} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onDeleteSale={async (id) => { const client = await supabase.wait(); const { error } = await client.from('sales').delete().eq('id', id); if (error) alert("Purge Error: " + error.message); await fetchLedger(); }} currentUser={currentUser} printerSettings={{autoPrint: false}} onApproveBankSale={onApproveBankSale} onRejectBankSale={onRejectBankSale} />} />
                                    <Route path="proforma" element={<Proforma sales={sales} customers={customers} users={users} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onDeleteSale={async (id) => { const client = await supabase.wait(); const { error } = await client.from('sales').delete().eq('id', id); if (error) alert("Purge Error: " + error.message); await fetchLedger(); }} currentUser={currentUser} printerSettings={{autoPrint: false}} />} />
                                    <Route path="expenses" element={<Expenses expenses={expenses} setExpenses={setExpenses} handleSaveExpense={async (d) => { const client = await supabase.wait(); const { error } = await client.from('expenses').insert({...d, business_id: activeBusinessId}); if (error) alert("Debit Error: " + error.message); await fetchLedger(); }} bankAccounts={bankAccounts} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                    <Route path="expense-requests" element={<ExpenseRequestPage expenseRequests={expenseRequests} expenses={expenses} currentUser={currentUser} handleRequestExpense={async (d) => { const client = await supabase.wait(); const { error } = await client.from('expense_requests').insert({...d, business_id: activeBusinessId, user_id: currentUser.id}); if (error) alert("Request Error: " + error.message); await fetchLedger(); }} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={t} />} />
                                    <Route path="alerts" element={<AlertsPage anomalyAlerts={anomalyAlerts} currentUser={currentUser} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onMarkRead={() => {}} onDismiss={() => {}} />} />
                                    <Route path="items" element={<Items products={products} cart={cart} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} onUpdateCartItem={(p, v, q) => setCart(prev => { const idx = prev.findIndex(i => i.product.id === p.id && (!v || i.variant?.id === v.id)); if (q <= 0) return prev.filter((_, i) => i !== idx); if (idx > -1) { const up = [...prev]; up[idx].quantity = q; return up; } return [...prev, { product: p, variant: v, quantity: q, stock: v ? v.stock : p.stock }]; })} />} />
                                    <Route path="commission" element={<Commission products={products} setProducts={setProducts} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} />} />
                                    <Route path="profile" element={<MyProfile currentUser={currentUser} users={users} sales={sales} expenses={expenses} customers={customers} products={products} netProfit={0} receiptSettings={DEFAULT_RECEIPT_SETTINGS} t={t} businessSettings={DEFAULT_BUSINESS_SETTINGS} ownerSettings={DEFAULT_OWNER_SETTINGS} businessProfile={businessProfile} onConfirmWithdrawalReceived={() => {}} onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile} />} />
                                    <Route path="settings" element={<Settings language={language} setLanguage={setLanguage} t={t} currentUser={currentUser} users={users} receiptSettings={DEFAULT_RECEIPT_SETTINGS} setReceiptSettings={() => {}} businessSettings={DEFAULT_BUSINESS_SETTINGS} onUpdateBusinessSettings={() => {}} businessProfile={businessProfile} onUpdateBusinessProfile={() => {}} ownerSettings={DEFAULT_OWNER_SETTINGS} onUpdateOwnerSettings={() => {}} printerSettings={{autoPrint: false}} onUpdatePrinterSettings={() => {}} permissions={DEFAULT_PERMISSIONS} theme={theme} setTheme={setTheme} onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile} />} />
                                    <Route path="onboarding" element={<Onboarding currentUser={currentUser} />} />
                                    <Route path="chat-help" element={<AIAssistant currentUser={currentUser} sales={sales} products={products} expenses={expenses} customers={customers} users={users} expenseRequests={expenseRequests} anomalyAlerts={anomalyAlerts} businessSettings={DEFAULT_BUSINESS_SETTINGS} lowStockThreshold={10} t={t} receiptSettings={DEFAULT_RECEIPT_SETTINGS} permissions={DEFAULT_PERMISSIONS} />} />
                                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                                </Routes>
                            </Suspense>
                        </main>
                        <BottomNavBar t={t} cart={cart} currentUser={currentUser} permissions={DEFAULT_PERMISSIONS} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
