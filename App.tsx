
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './lib/firebase';
import { getStoredItem, setStoredItemAndDispatchEvent, getSystemLogo, formatCurrency } from './lib/utils';
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
import AIAssistant from './components/AIAssistant';
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

/**
 * ScrollToTop Component - Synchronizes viewport position with route changes
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        const viewport = document.getElementById('app-main-viewport');
        if (viewport) viewport.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

/**
 * ProtectedRoute Component - Role-based authorization gate
 */
const ProtectedRoute = ({ children, module, action, user, permissions, isSafeMode }: { children: React.ReactNode, module: ModuleKey, action: string, user: User, permissions: AppPermissions, isSafeMode: boolean }) => {
    if (!hasAccess(user, module, action, permissions, isSafeMode)) {
        return <AccessDenied />;
    }
    return children || null;
};

/**
 * Header Component - Global top navigation and status hub
 */
const Header = ({ currentUser, businessProfile, onMenuClick, notifications, cartCount, onMarkAsRead, onMarkAllAsRead, onClear }) => (
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
            {currentUser && (
                <NotificationCenter 
                    notifications={notifications} 
                    onMarkAsRead={onMarkAsRead}
                    onMarkAllAsRead={onMarkAllAsRead}
                    onClear={onClear}
                />
            )}
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

/**
 * Global Error Boundary - Intercepts unhandled rendering exceptions
 */
// Fix: Added optional children to the props interface to resolve the TypeScript error in index.tsx where children were reported as missing in type {}.
export class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean }> {
    // Fix: Updated constructor to accept optional children in props.
    constructor(props: { children?: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Global Error Boundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-8 font-sans">
                    <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-10 text-center border border-rose-100 dark:border-rose-900/30">
                        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">System Critical Halt</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                            A global exception has compromised the terminal runtime. The node has been suspended to prevent data corruption.
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            Re-Initialize Node
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * High-end Splash Screen Component - Minimalist Intro
 */
const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        const introTimer = setTimeout(() => setIsVisible(true), 50);
        const exitTimerStart = setTimeout(() => setIsFadingOut(true), 1200);
        const onCompleteTimer = setTimeout(onComplete, 1500);
        return () => { 
            clearTimeout(introTimer); 
            clearTimeout(exitTimerStart); 
            clearTimeout(onCompleteTimer); 
        };
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-white dark:bg-gray-950 transition-opacity duration-300 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`relative transition-all duration-[800ms] ease-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                <svg viewBox="0 0 4000 4000" className="w-48 h-48 md:w-56 md:h-56 drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <style>{`.fs0 {fill:#1A457E} .fs1 {fill:#2563EB} .fs3 {fill:#1A457E;fill-rule:nonzero}`}</style>
                        <mask id="ms0"><linearGradient id="ls1" gradientUnits="userSpaceOnUse" x1="1903.94" y1="2217.48" x2="1895.38" y2="2662.81"><stop offset="0" style={{stopOpacity:1, stopColor:'white'}}/><stop offset="1" style={{stopOpacity:0, stopColor:'white'}}/></linearGradient><rect style={{fill:'url(#ls1)'}} x="1154.91" y="446.15" width="1668.59" height="2211.97"/></mask>
                        <mask id="ms2"><linearGradient id="ls3" gradientUnits="userSpaceOnUse" x1="1903.94" y1="2217.48" x2="1895.38" y2="2662.81"><stop offset="0" style={{stopOpacity:1, stopColor:'white'}}/><stop offset="1" style={{stopOpacity:0, stopColor:'white'}}/></linearGradient><rect style={{fill:'url(#ls3)'}} x="1506.44" y="962.85" width="1322.44" height="1700.49"/></mask>
                    </defs>
                    <g id="Layer_x0020_1">
                        <g id="_1680517084368">
                            <g>
                                <path d="M1901.62 1656.8l1.71 -278.74c-78.46,4.17 -163.06,0.98 -242.21,0.82l-174.91 0.6c-53.52,0.46 -43.37,1.52 -50.65,-10.65 10.89,-246.14 -87.98,-635.78 298.33,-638.92 315.95,-2.56 632.53,-0.25 948.54,0.02 37.21,-74.66 116.8,-206.72 140.99,-280.28 -152.85,-7.35 -322.89,-0.47 -477.67,-0.39 -162.66,0.08 -325.31,-0 -487.97,0.04 -154.21,0.04 -286.91,-2.17 -408.27,69.42 -102.65,60.54 -181.42,135.99 -238.16,249.76 -66.83,134.01 -53.09,268.83 -53.28,427.8 -0.22,196.06 -7.98,1371.84 2.15,1461.39l274.36 0.36 1.5 -1002.3 465.56 1.07z" className="fs0" style={{mask:'url(#ms0)'}}/><path d="M1506.54 1239.43l535.95 1.17 0.47 887.57c-0.06,318.61 231.6,529.78 544.41,535.06l-1.27 -271.63c-317.19,-17.81 -264.99,-297.4 -265.48,-576.49l-0.48 -571.66 369.31 -2.36 139.33 -278.15 -1182.99 0.1 -139.25 276.39z" className="fs1" style={{mask:'url(#ms2)'}}/>
                            </g>
                            <path d="M734.72 374.02l59.86 0 8.07 5.76c-21.99,30.73 -39.41,62.74 -52.96,98.03l-55.94 -20.99c11.09,-29.1 24.76,-56.58 40.98,-82.79zm2576.58 1897.2l-61.07 0c7.43,-32.86 10.44,-64.84 10.44,-98.98l59.76 0c0,33.96 -2.72,66.33 -9.13,98.98zm-2636.26 -1753.61c-10.19,43.17 -13.06,81.13 -13.06,125.33l59.76 0c0,-39.68 2.35,-73.03 11.5,-111.8l-58.2 -13.53zm-13.06 185.08l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.51 -59.76 0 0 -119.51zm0 179.27l59.76 0 0 119.51 -59.76 0 0 -119.51zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0c0,40.6 -0.69,74.17 6.34,113.85l-58.81 10.55c-7.87,-42.66 -7.29,-80.98 -7.29,-124.4zm2658.45 -24.37l-59.76 0 0 -119.52 59.76 0 0 119.52zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0 0 -119.51 59.76 0 0 -119.51zm0 -179.27l-59.76 0 0 -119.51 59.76 0 0 -119.51zm0 -179.27l-59.76 0 0 -119.51 59.76 0 0 -119.51zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0c0,-39.42 1.22,-75.77 -5.09,-114.5l59.01 -9.46c6.85,42.54 5.85,80.57 5.85,123.96zm-19.8 -186.05c-11.86,-40.16 -29.48,-80.45 -51.55,-116.07l-50.84 31.39c19.36,31.34 34.72,66.48 45.14,101.78l57.26 -17.11z" className="fs3"/><path d="M1150.67 141.01l1681.07 0c134.42,0 256.6,54.98 345.16,143.53 88.56,88.56 143.53,210.74 143.53,345.16l0 773.86 -59.76 0 0 -773.86c0,-117.93 -48.27,-225.16 -126.01,-302.91 -77.76,-77.74 -184.99,-126.01 -302.91,-126.01l-1681.07 0c-117.93,0 -225.16,48.27 -302.91,126.01 -77.74,77.75 -126.01,184.99 -126.01,302.91l0 773.86 -59.76 0 0 -773.86c0,-134.42 54.98,-256.6 143.53,-345.16 88.56,-88.55 210.74,-143.53 345.16,-143.53z" className="fs3"/></g>
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default function App() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessProfile, setBusinessProfile] = useState<any>(null);
    const [licensingInfo, setLicensingInfo] = useState<LicensingInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSplashComplete, setIsSplashComplete] = useState(false);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [systemLogo] = useState(() => getSystemLogo());
    
    const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredItem('fintab_ui_theme', 'light'));
    const [language, setLanguage] = useState<string>(() => getStoredItem('fintab_ui_language', 'en'));

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        localStorage.setItem('fintab_ui_theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('fintab_ui_language', language);
    }, [language]);

    const t = useCallback((key: string) => {
        const langData = translations[language] || translations.en;
        return langData[key] || translations.en[key] || key;
    }, [language]);

    const [products, setProducts] = useState<Product[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
    const [goodsCosting, setGoodsCosting] = useState<GoodsCosting[]>([]);
    const [goodsReceivings, setGoodsReceivings] = useState<GoodsReceiving[]>([]);
    const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([]);
    const [weeklyInventoryChecks, setWeeklyInventoryChecks] = useState<WeeklyInventoryCheck[]>([]);
    
    const [businessSettings, setBusinessSettings] = useState<any>(DEFAULT_BUSINESS_SETTINGS);
    const [receiptSettings, setReceiptSettings] = useState<any>(DEFAULT_RECEIPT_SETTINGS);
    const [permissions, setPermissions] = useState<any>(DEFAULT_PERMISSIONS);
    const [ownerSettings, setOwnerSettings] = useState<any>(DEFAULT_OWNER_SETTINGS);
    const [printerSettings, setPrinterSettings] = useState<any>(() => getStoredItem('fintab_printer_settings', { autoPrint: false }));

    const hydrateBusinessData = useCallback((bizId: string) => {
        if (!bizId) return;
        try {
            const registry = getStoredItem<AdminBusinessData[]>('fintab_businesses_registry', []);
            const bizEntry = (registry || []).find(b => b.id === bizId);
            if (bizEntry) {
                setBusinessProfile(bizEntry.profile);
                setLicensingInfo(bizEntry.licensingInfo);
            }
            
            setProducts(getStoredItem(`fintab_${bizId}_products`, DUMMY_PRODUCTS) || []);
            setSales(getStoredItem(`fintab_${bizId}_sales`, []) || []);
            setCustomers(getStoredItem(`fintab_${bizId}_customers`, []) || []);
            setUsers(getStoredItem(`fintab_${bizId}_users`, []) || []);
            setExpenses(getStoredItem(`fintab_${bizId}_expenses`, []) || []);
            setExpenseRequests(getStoredItem(`fintab_${bizId}_expense_requests`, []) || []);
            setDeposits(getStoredItem(`fintab_${bizId}_deposits`, []) || []);
            setBankAccounts(getStoredItem(`fintab_${bizId}_bank_accounts`, []) || []);
            setBankTransactions(getStoredItem(`fintab_${bizId}_bank_transactions`, []) || []);
            setNotifications(getStoredItem(`fintab_${bizId}_notifications`, []) || []);
            setCashCounts(getStoredItem(`fintab_${bizId}_cash_counts`, []) || []);
            setGoodsCosting(getStoredItem(`fintab_${bizId}_goods_costing`, []) || []);
            setGoodsReceivings(getStoredItem(`fintab_${bizId}_goods_receiving`, []) || []);
            setAnomalyAlerts(getStoredItem(`fintab_${bizId}_anomalies`, []) || []);
            setWeeklyInventoryChecks(getStoredItem(`fintab_${bizId}_weekly_checks`, []) || []);
            setReceiptSettings(getStoredItem(`fintab_${bizId}_receipt_settings`, DEFAULT_RECEIPT_SETTINGS));
            setBusinessSettings(getStoredItem(`fintab_${bizId}_settings`, DEFAULT_BUSINESS_SETTINGS));
            setOwnerSettings(getStoredItem(`fintab_${bizId}_owner_settings`, DEFAULT_OWNER_SETTINGS));
            setPermissions(getStoredItem(`fintab_${bizId}_permissions`, DEFAULT_PERMISSIONS));
            setPermissionsLoaded(true);
        } catch (e) {
            console.error("Hydration Protocol Failed:", e);
            setPermissionsLoaded(true);
        }
    }, []);

    const findUserInRegistryGlobal = (email: string) => {
        const registry = getStoredItem<any[]>('fintab_businesses_registry', []);
        for (const b of (registry || [])) {
            const bizUsers = getStoredItem<User[]>(`fintab_${b.id}_users`, []);
            const found = (bizUsers || []).find(u => u.email.toLowerCase() === email.toLowerCase());
            if (found) return { user: found, bizId: b.id };
        }
        return null;
    };

    const findAndSetUser = useCallback((userEmail: string, fbUserObj?: any) => {
        const match = findUserInRegistryGlobal(userEmail);
        if (match) {
            const appUserNode = {
                ...match.user,
                avatarUrl: fbUserObj?.photoURL || match.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.user.name)}`,
                name: fbUserObj?.displayName || match.user.name
            };
            setCurrentUser(appUserNode);
            setBusinessId(match.bizId);
            localStorage.setItem('fintab_active_business_id', match.bizId);
            hydrateBusinessData(match.bizId);
            const currentPath = window.location.hash.replace('#', '');
            if (currentPath === '/login' || currentPath === '/' || currentPath === '') {
                navigate('/dashboard', { replace: true });
            }
        } else {
            setCurrentUser({
                id: fbUserObj?.uid || `user-${Date.now()}`,
                name: fbUserObj?.displayName || 'New User',
                email: userEmail,
                avatarUrl: fbUserObj?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUserObj?.displayName || 'User')}`,
                role: 'Owner'
            });
            navigate('/setup');
        }
    }, [hydrateBusinessData, navigate]);

    useEffect(() => {
        let unsubscribeFirebase = () => {};
        if (isFirebaseConfigured) {
            unsubscribeFirebase = onAuthStateChanged(auth, async (fbUser) => {
                if (fbUser) {
                    if (!fbUser.emailVerified) {
                        setLoading(false);
                        return;
                    }
                    findAndSetUser(fbUser.email, fbUser);
                } else {
                    const simUser = getStoredItem('fintab_simulator_session', null);
                    if (simUser) {
                        findAndSetUser(simUser.email, simUser);
                    } else if (window.location.hash.replace('#', '') !== '/setup') {
                        setCurrentUser(null);
                        setBusinessId(null);
                        navigate('/login');
                    }
                }
                setLoading(false);
            });
        }
        const checkLocalSession = () => {
            const simUser = getStoredItem('fintab_simulator_session', null);
            if (simUser) {
                findAndSetUser(simUser.email, simUser);
                setLoading(false);
            } else if (!isFirebaseConfigured) setLoading(false);
        };
        checkLocalSession();
        return () => {
            unsubscribeFirebase();
        };
    }, [findAndSetUser, navigate]);

    const persistToBusiness = (key: string, data: any) => {
        if (!businessId || data === undefined) return;
        setStoredItemAndDispatchEvent(`fintab_${businessId}_${key}`, data);
    };

    const createPersistentSetter = (stateSetter: Function, key: string) => (updateVal: any) => {
        stateSetter(prev => {
            const next = typeof updateVal === 'function' ? updateVal(prev) : updateVal;
            persistToBusiness(key, next);
            return next;
        });
    };

    /**
     * CENTRALIZED NOTIFICATION ENGINE
     * Dispatches immediate bell alerts and simulated email protocols.
     */
    const createNotification = useCallback((targetUserId: string, title: string, msg: string, type: AppNotification['type'], link?: string) => {
        const n: AppNotification = { 
            id: `nt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
            userId: targetUserId, 
            title, 
            message: `${msg} [MAIL_REMINDER_SENT]`, 
            timestamp: new Date().toISOString(), 
            isRead: false, 
            type, 
            link 
        };
        
        setNotifications(prev => {
            const next = [n, ...(prev || [])];
            persistToBusiness('notifications', next);
            return next;
        });

        const targetUser = (users || []).find(u => u.id === targetUserId);
        if (targetUser) {
            console.info(`[SYSTEM_EMAIL_PROTOCOL] Dispatching task reminder to: ${targetUser.email}`);
        }
    }, [businessId, users]);

    /**
     * ROLE-BASED BROADCAST ENGINE
     * Notifies all authorized participants of a specific workflow role.
     */
    const notifyWorkflowParticipants = useCallback((roleKey: WorkflowRoleKey, title: string, msg: string, type: AppNotification['type'], link: string) => {
        const workflow = businessSettings?.workflowRoles || {};
        const assigned = workflow[roleKey] || [];
        const recipients = new Set<string>();
        assigned.forEach((a: any) => recipients.add(a.userId));
        (users || []).forEach(u => {
            if (u.role === 'Owner' || u.role === 'Admin' || u.role === 'Super Admin') {
                recipients.add(u.id);
            }
        });
        recipients.forEach(rid => {
            if (rid !== currentUser?.id) {
                createNotification(rid, title, msg, type, link);
            }
        });
    }, [businessSettings, users, currentUser, createNotification]);

    const handleSaveProduct = (product: Product, isEditing: boolean) => {
        setProducts(prev => {
            const next = isEditing ? (prev || []).map(p => p.id === product.id ? product : p) : [product, ...(prev || [])];
            persistToBusiness('products', next);
            return next;
        });
    };

    const handleSaveStockAdjustment = (productId: string, adjustment: Omit<StockAdjustment, 'date' | 'userId' | 'newStockLevel'>) => {
        setProducts(prev => {
            const next = (prev || []).map(p => {
                if (p.id === productId) {
                    const newQty = adjustment.type === 'add' ? p.stock + adjustment.quantity : p.stock - adjustment.quantity;
                    const newAdj: StockAdjustment = { ...adjustment, date: new Date().toISOString(), userId: currentUser.id, newStockLevel: newQty };
                    return { ...p, stock: newQty, stockHistory: [newAdj, ...(p.stockHistory || [])] };
                }
                return p;
            });
            persistToBusiness('products', next);
            return next;
        });
    };

    const handleUpdateCartItem = (product: Product, variant: ProductVariant | undefined, quantity: number) => {
        setCart(prev => {
            const cartItemId = variant ? variant.id : product.id;
            const existingIdx = (prev || []).findIndex(item => (item.variant ? item.variant.id : item.product.id) === cartItemId);
            const stock = variant ? variant.stock : product.stock;
            const newQty = Math.min(quantity, stock);
            if (newQty <= 0) {
                if (existingIdx > -1) {
                    const next = [...(prev || [])];
                    next.splice(existingIdx, 1);
                    return next;
                }
                return prev || [];
            }
            if (existingIdx > -1) {
                const next = [...(prev || [])];
                next[existingIdx] = { ...next[existingIdx], quantity: newQty };
                return next;
            }
            return [...(prev || []), { product, variant, quantity: newQty, stock }];
        });
    };

    const handleProcessSale = (sale: Sale) => {
        if (!sale) return;
        const updatedSales = [sale, ...(sales || [])];
        setSales(updatedSales);
        persistToBusiness('sales', updatedSales);
        if (sale.status === 'pending_bank_verification') {
            notifyWorkflowParticipants('bankVerifier', 'Settlement Verification Required', `A bank receipt for ${formatCurrency(sale.total, receiptSettings.currencySymbol)} requires verification.`, 'action_required', '/receipts');
        }
        if (sale.status === 'completed' || sale.status === 'completed_bank_verified' || sale.status === 'approved_by_owner') {
            setProducts(prev => {
                const next = (prev || []).map(p => {
                    const cartItem = (sale.items || []).find(i => i.product.id === p.id);
                    if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
                    return p;
                });
                persistToBusiness('products', next);
                return next;
            });
        }
    };

    const handleUpdateWithdrawalStatus = useCallback((userId: string, withdrawalId: string, status: Withdrawal['status'], note?: string) => {
        setUsers(prev => {
            const next = (prev || []).map(u => {
                if (u.id === userId) {
                    const updatedW = (u.withdrawals || []).map(w => 
                        w.id === withdrawalId ? { 
                            ...w, status, 
                            auditLog: [...(w.auditLog || []), { timestamp: new Date().toISOString(), status, actorId: currentUser.id, actorName: currentUser.name, note }] 
                        } : w
                    );
                    const title = status === 'completed' ? 'Payout Finalized' : status === 'approved_by_owner' ? 'Payout Authorized' : 'Payout Profile Updated';
                    const msg = status === 'rejected' ? `Your withdrawal request was declined: ${note || 'Protocol mismatch'}` : `Withdrawal status shifted to ${status.replace('_', ' ')}.`;
                    createNotification(userId, title, msg, status === 'rejected' ? 'warning' : 'success', '/profile');
                    return { ...u, withdrawals: updatedW };
                }
                return u;
            });
            persistToBusiness('users', next);
            return next;
        });
    }, [currentUser, createNotification]);

    const handleUpdateDepositStatus = useCallback((depositId: string, status: 'approved' | 'rejected') => {
        setDeposits(prev => {
            const next = (prev || []).map(d => {
                if (d.id === depositId) {
                    const title = status === 'approved' ? 'Deposit Verified' : 'Deposit Rejected';
                    const msg = status === 'approved' ? `Your cash deposit of ${formatCurrency(d.amount, receiptSettings.currencySymbol)} has been verified.` : 'Deposit entry was flagged for audit errors.';
                    createNotification(d.userId, title, msg, status === 'approved' ? 'success' : 'error', '/transactions');
                    const updatedD = { ...d, status };
                    if (status === 'approved' && d.bankAccountId) {
                        setBankAccounts(prevBanks => {
                            const nextBanks = prevBanks.map(b => {
                                if (b.id === d.bankAccountId) return { ...b, balance: b.balance + d.amount };
                                return b;
                            });
                            persistToBusiness('bank_accounts', nextBanks);
                            return nextBanks;
                        });
                        setBankTransactions(prevTrans => {
                            const newTrans: BankTransaction = {
                                id: `bt-dep-${Date.now()}`,
                                date: new Date().toISOString(),
                                bankAccountId: d.bankAccountId,
                                type: 'deposit',
                                amount: d.amount,
                                description: `Verified Cash Deposit: ${d.description}`,
                                referenceId: d.id,
                                userId: currentUser.id
                            };
                            const nextTrans = [newTrans, ...(prevTrans || [])];
                            persistToBusiness('bank_transactions', nextTrans);
                            return nextTrans;
                        });
                    }
                    return updatedD;
                }
                return d;
            });
            persistToBusiness('deposits', next);
            return next;
        });
    }, [receiptSettings, currentUser, createNotification]);

    const handleLogout = useCallback(() => { 
        if (isFirebaseConfigured) signOut(auth);
        localStorage.removeItem('fintab_active_business_id'); 
        localStorage.removeItem('fintab_demo_mode');
        localStorage.removeItem('fintab_simulator_session');
        localStorage.removeItem('fintab_verification_pending_email');
        setCurrentUser(null);
        setBusinessId(null);
        setPermissionsLoaded(false);
        navigate('/login', { replace: true });
    }, [navigate]);

    const handleMarkNotificationRead = (id: string) => {
        setNotifications(prev => {
            const next = (prev || []).map(n => n.id === id ? { ...n, isRead: true } : n);
            persistToBusiness('notifications', next);
            return next;
        });
    };

    const trialLimits = useMemo(() => {
        if (!licensingInfo) return { canAddProduct: true, canAddCustomer: true, canAddStaff: true };
        if (licensingInfo.licenseType === 'Premium') return { canAddProduct: true, canAddCustomer: true, canAddStaff: true };
        const isExpired = new Date(licensingInfo.trialEndDate) < new Date();
        if (isExpired) return { canAddProduct: false, canAddCustomer: false, canAddStaff: false };
        return { canAddProduct: true, canAddCustomer: true, canAddStaff: true };
    }, [licensingInfo]);

    const handleUpdateCustomPaymentStatus = useCallback((targetUserId: string, paymentId: string, status: CustomPayment['status'], note?: string) => {
        setUsers(prev => {
            const next = prev.map(u => {
                if (u.id === targetUserId) {
                    const updatedP = (u.customPayments || []).map(p => 
                        p.id === paymentId ? { 
                            ...p, status, 
                            auditLog: [...(p.auditLog || []), { timestamp: new Date().toISOString(), status, actorId: currentUser.id, actorName: currentUser.name, note }] 
                        } : p
                    );
                    createNotification(targetUserId, 'Remittance Protocol Update', `Special payment status shifted to ${status.replace(/_/g, ' ')}.`, status === 'completed' ? 'success' : 'info', '/profile');
                    return { ...u, customPayments: updatedP };
                }
                return u;
            });
            persistToBusiness('users', next);
            return next;
        });
    }, [currentUser, createNotification]);

    const handleUpdateExpenseRequestStatus = useCallback((requestId: string, status: 'approved' | 'rejected', reason?: string) => {
        setExpenseRequests(prev => {
            const next = prev.map(req => {
                if (req.id === requestId) {
                    const updatedReq = { 
                        ...req, status, rejectionReason: reason,
                        auditLog: [...(req.auditLog || []), { timestamp: new Date().toISOString(), status, actorId: currentUser.id, actorName: currentUser.name, note: reason }]
                    };
                    createNotification(req.userId, 'Expense Verification Complete', `Request for ${req.category} was ${status}.`, status === 'approved' ? 'success' : 'error', '/expense-requests');
                    if (status === 'approved') {
                        setExpenses(prevExp => {
                            const newExp = { id: `exp-${Date.now()}`, date: new Date().toISOString(), category: req.category, description: req.description, amount: req.amount, status: 'active', requestId: req.id };
                            const nextExp = [newExp, ...(prevExp || [])];
                            persistToBusiness('expenses', nextExp);
                            return nextExp;
                        });
                    }
                    return updatedReq;
                }
                return req;
            });
            persistToBusiness('expense_requests', next);
            return next;
        });
    }, [currentUser, createNotification]);

    const handleApproveBankSale = useCallback((saleId: string) => {
        setSales(prev => {
            const next = prev.map(s => {
                if (s.id === saleId) {
                    createNotification(s.userId, 'Bank Settlement Verified', `Sale Ref: ${s.id.slice(-6).toUpperCase()} has been authorized and balanced.`, 'success', '/receipts');
                    const updatedSale = { ...s, status: 'completed_bank_verified', auditLog: [...(s.auditLog || []), { timestamp: new Date().toISOString(), status: 'completed_bank_verified', actorId: currentUser.id, actorName: currentUser.name }] };
                    if (updatedSale.bankAccountId) {
                        setBankAccounts(prevBanks => {
                            const nextBanks = prevBanks.map(b => {
                                if (b.id === updatedSale.bankAccountId) return { ...b, balance: b.balance + updatedSale.total };
                                return b;
                            });
                            persistToBusiness('bank_accounts', nextBanks);
                            return nextBanks;
                        });
                        setBankTransactions(prevTrans => {
                            const newTrans: BankTransaction = {
                                id: `bt-${Date.now()}`,
                                date: new Date().toISOString(),
                                bankAccountId: updatedSale.bankAccountId,
                                type: 'sale_credit',
                                amount: updatedSale.total,
                                description: `Credit from Sale Log #${updatedSale.id.slice(-6).toUpperCase()}`,
                                referenceId: updatedSale.id,
                                userId: currentUser.id
                            };
                            const nextTrans = [newTrans, ...(prevTrans || [])];
                            persistToBusiness('bank_transactions', nextTrans);
                            return nextTrans;
                        });
                    }
                    setProducts(prevP => {
                        const nextP = (prevP || []).map(p => {
                            const item = (updatedSale.items || []).find(i => i.product.id === p.id);
                            if (item) return { ...p, stock: p.stock - item.quantity };
                            return p;
                        });
                        persistToBusiness('products', nextP);
                        return nextP;
                    });
                    return updatedSale;
                }
                return s;
            });
            persistToBusiness('sales', next);
            return next;
        });
    }, [currentUser, createNotification]);

    const handleRejectBankSale = useCallback((saleId: string, reason: string) => {
        setSales(prev => {
            const next = prev.map(s => {
                if (s.id === saleId) {
                    createNotification(s.userId, 'Settlement Protocol Rejected', `Bank verification failed for Ref: ${s.id.slice(-6).toUpperCase()}. Note: ${reason}`, 'error', '/receipts');
                    return { ...s, status: 'rejected_bank_not_verified', verificationNote: reason, auditLog: [...(s.auditLog || []), { timestamp: new Date().toISOString(), status: 'rejected_bank_not_verified', actorId: currentUser.id, actorName: currentUser.name, note: reason }] };
                }
                return s;
            });
            persistToBusiness('sales', next);
            return next;
        });
    }, [currentUser, createNotification]);

    const handleApproveClientOrder = useCallback((saleId: string) => {
        setSales(prev => {
            const next = prev.map(s => {
                if (s.id === saleId) {
                    return { ...s, status: 'approved_by_owner', auditLog: [...(s.auditLog || []), { timestamp: new Date().toISOString(), status: 'approved_by_owner', actorId: currentUser.id, actorName: currentUser.name }] };
                }
                return s;
            });
            persistToBusiness('sales', next);
            return next;
        });
    }, [currentUser]);

    const handleRejectClientOrder = useCallback((saleId: string) => {
        setSales(prev => {
            const next = prev.map(s => {
                if (s.id === saleId) {
                    return { ...s, status: 'rejected', auditLog: [...(s.auditLog || []), { timestamp: new Date().toISOString(), status: 'rejected', actorId: currentUser.id, actorName: currentUser.name }] };
                }
                return s;
            });
            persistToBusiness('sales', next);
            return next;
        });
    }, [currentUser]);

    const handleDismissAnomaly = useCallback((id: string, reason?: string) => {
        setAnomalyAlerts(prev => {
            const next = prev.map(a => a.id === id ? { ...a, isDismissed: true, dismissalReason: reason } : a);
            persistToBusiness('anomalies', next);
            return next;
        });
    }, [businessId]);

    const handleMarkAnomalyRead = useCallback((id: string) => {
        setAnomalyAlerts(prev => {
            const next = prev.map(a => a.id === id ? { ...a, isRead: true } : a);
            persistToBusiness('anomalies', next);
            return next;
        });
    }, [businessId]);

    const handleResetBusiness = useCallback(() => {
        if (!businessId) return;
        localStorage.removeItem(`fintab_${businessId}_products`);
        localStorage.removeItem(`fintab_${businessId}_sales`);
        localStorage.removeItem(`fintab_${businessId}_customers`);
        localStorage.removeItem(`fintab_${businessId}_users`);
        localStorage.removeItem(`fintab_${businessId}_expenses`);
        localStorage.removeItem(`fintab_${businessId}_expense_requests`);
        localStorage.removeItem(`fintab_${businessId}_deposits`);
        localStorage.removeItem(`fintab_${businessId}_bank_accounts`);
        localStorage.removeItem(`fintab_${businessId}_bank_transactions`);
        localStorage.removeItem(`fintab_${businessId}_notifications`);
        localStorage.removeItem(`fintab_${businessId}_cash_counts`);
        localStorage.removeItem(`fintab_${businessId}_goods_costing`);
        localStorage.removeItem(`fintab_${businessId}_goods_receiving`);
        localStorage.removeItem(`fintab_${businessId}_anomalies`);
        localStorage.removeItem(`fintab_${businessId}_weekly_checks`);
        localStorage.removeItem(`fintab_${businessId}_receipt_settings`);
        localStorage.removeItem(`fintab_${businessId}_settings`);
        localStorage.removeItem(`fintab_${businessId}_owner_settings`);
        localStorage.removeItem(`fintab_${businessId}_permissions`);
        window.location.reload();
    }, [businessId]);

    const handleUpdateCurrentUserProfile = useCallback((profileData: any) => {
        setCurrentUser(prev => {
            const next = { ...prev, ...profileData };
            setUsers(prevUsers => {
                const nextUsers = (prevUsers || []).map(u => u.id === prev.id ? next : u);
                persistToBusiness('users', nextUsers);
                return nextUsers;
            });
            return next;
        });
    }, [businessId]);

    const commonProps = { 
        products, customers, users, sales, expenses, deposits, bankAccounts, bankTransactions, expenseRequests, anomalyAlerts, currentUser, businessProfile, businessSettings, ownerSettings, receiptSettings, permissions, t, 
        cart,
        lowStockThreshold: 10, isSafeMode: !permissionsLoaded, trialLimits, 
        onSaveStockAdjustment: handleSaveStockAdjustment,
        onUpdateCartItem: handleUpdateCartItem,
        createNotification,
        notifyWorkflowParticipants
    };

    if (!isSplashComplete) return <SplashScreen onComplete={() => setIsSplashComplete(true)} />;
    if (loading) return <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-950"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    if (!currentUser) return (
        <Routes>
            <Route path="/login" element={<Login onEnterDemo={() => {
                const demoBizId = 'biz-demo-001';
                const demoOwner: User = { id: 'user-demo-owner', name: 'Demo Admin', email: 'demo@fintab.io', role: 'Owner', status: 'Active', avatarUrl: 'https://ui-avatars.com/api/?name=Demo+Admin&background=2563EB&color=fff', type: 'commission', initialInvestment: 10000, permissions: DEFAULT_PERMISSIONS.roles['Owner'] };
                localStorage.setItem('fintab_demo_mode', 'true');
                localStorage.setItem('fintab_active_business_id', demoBizId);
                const registry = getStoredItem<any[]>('fintab_businesses_registry', []) || [];
                if (!(registry || []).find(b => b.id === demoBizId)) {
                    registry.push({ id: demoBizId, profile: { businessName: 'FinTab Demo', isPublic: true }, owner: { name: 'Demo Admin', email: 'demo@fintab.io' }, stats: { totalRevenue: 0, salesCount: 0, userCount: 1, joinedDate: new Date().toISOString(), status: 'Active' }, licensingInfo: { licenseType: 'Trial', enrollmentDate: new Date().toISOString(), trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } });
                    setStoredItemAndDispatchEvent('fintab_businesses_registry', registry);
                }
                setStoredItemAndDispatchEvent(`fintab_${demoBizId}_users`, [demoOwner]);
                setStoredItemAndDispatchEvent('fintab_simulator_session', demoOwner);
                setCurrentUser(demoOwner);
                setBusinessId(demoBizId);
                hydrateBusinessData(demoBizId);
                navigate('/dashboard');
            }} />} />
            <Route path="/setup" element={<Onboarding onSwitchToLogin={handleLogout} onSuccess={(u) => findAndSetUser(u.email)} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );

    if (!businessId && location.pathname !== '/setup') return (
        <Routes>
            <Route path="/select-business" element={<SelectBusiness currentUser={currentUser} onSelect={(id) => { setBusinessId(id); hydrateBusinessData(id); navigate('/dashboard'); }} onLogout={handleLogout} />} />
            <Route path="/setup" element={<Onboarding onSwitchToLogin={handleLogout} onSuccess={(u) => findAndSetUser(u.email)} />} />
            <Route path="*" element={<Navigate to="/select-business" replace />} />
        </Routes>
    );

    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-gray-950 font-sans overflow-hidden">
            <ScrollToTop />
            {!permissionsLoaded && <div className="bg-amber-400 text-amber-900 px-6 py-2 text-center text-[10px] font-black uppercase tracking-widest z-[60] shadow-sm animate-pulse">Limited Mode – Synchronization Active</div>}
            <Header currentUser={currentUser} businessProfile={businessProfile} onMenuClick={() => setIsSidebarOpen(true)} notifications={(notifications || []).filter(n => n && currentUser && n.userId === currentUser.id)} cartCount={(cart || []).length} onMarkAsRead={handleMarkNotificationRead} onMarkAllAsRead={() => {}} onClear={() => {}} />
            <div className="flex-1 flex relative min-h-0 overflow-hidden">
                <Sidebar t={t} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} cart={cart || []} currentUser={currentUser} onLogout={handleLogout} permissions={permissions} businessProfile={businessProfile} ownerSettings={ownerSettings} systemLogo={systemLogo} isSafeMode={!permissionsLoaded} />
                <main id="app-main-viewport" className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC] dark:bg-gray-950 min-h-0 min-w-0 p-lg md:p-xl pb-24">
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard {...commonProps} 
                            onUpdateWithdrawalStatus={handleUpdateWithdrawalStatus} 
                            onApproveClientOrder={handleApproveClientOrder}
                            onRejectClientOrder={handleRejectClientOrder}
                            handleUpdateCustomPaymentStatus={handleUpdateCustomPaymentStatus}
                            onUpdateExpenseRequestStatus={handleUpdateExpenseRequestStatus}
                            onUpdateDepositStatus={handleUpdateDepositStatus}
                            onApproveBankSale={handleApproveBankSale}
                            onRejectBankSale={handleRejectBankSale}
                            onDismissAnomaly={handleDismissAnomaly}
                            onMarkAnomalyRead={handleMarkAnomalyRead}
                        />} />
                        <Route path="/inventory" element={<ProtectedRoute module="INVENTORY" action="view_inventory" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Inventory {...commonProps} setProducts={createPersistentSetter(setProducts, 'products')} handleSaveProduct={handleSaveProduct} /></ProtectedRoute>} />
                        <Route path="/counter" element={<ProtectedRoute module="SALES" action="view_counter" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Counter {...commonProps} cart={cart || []} onProcessSale={handleProcessSale} onClearCart={() => setCart([])} /></ProtectedRoute>} />
                        <Route path="/items" element={<ProtectedRoute module="SALES" action="view_counter" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Items {...commonProps} /></ProtectedRoute>} />
                        <Route path="/receipts" element={<ProtectedRoute module="RECEIPTS" action="view_receipts" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Receipts {...commonProps} onDeleteSale={(id) => { const next = (sales || []).filter(s => s.id !== id); setSales(next); persistToBusiness('sales', next); }} /></ProtectedRoute>} />
                        <Route path="/proforma" element={<ProtectedRoute module="RECEIPTS" action="view_proforma" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Proforma {...commonProps} /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute module="REPORTS" action="view_sales_reports" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Reports {...commonProps} /></ProtectedRoute>} />
                        <Route path="/today" element={<ProtectedRoute module="REPORTS" action="view_sales_reports" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Today {...commonProps} /></ProtectedRoute>} />
                        <Route path="/transactions" element={<ProtectedRoute module="SALES" action="view_transactions" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Transactions {...commonProps} onRequestDeposit={(amt, desc, bankId) => {
                            const newDeposit = { id: `dep-${Date.now()}`, date: new Date().toISOString(), amount: amt, description: desc, userId: currentUser.id, status: 'pending', bankAccountId: bankId };
                            setDeposits(prev => { const next = [newDeposit, ...(prev || [])]; persistToBusiness('deposits', next); return next; });
                            notifyWorkflowParticipants('cashApprover', 'New Cash Deposit Protocol', `Identity ${currentUser.name} requested deposit of ${formatCurrency(amt, receiptSettings.currencySymbol)}.`, 'action_required', '/transactions');
                        }} /></ProtectedRoute>} />
                        <Route path="/bank-accounts" element={<ProtectedRoute module="FINANCE" action="cash_count_enter" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><BankAccountsPage {...commonProps} setBankAccounts={createPersistentSetter(setBankAccounts, 'bank_accounts')} setBankTransactions={createPersistentSetter(setBankTransactions, 'bank_transactions')} /></ProtectedRoute>} />
                        <Route path="/commission" element={<ProtectedRoute module="COMMISSIONS" action="view_all_commissions" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Commission {...commonProps} setProducts={createPersistentSetter(setProducts, 'products')} /></ProtectedRoute>} />
                        <Route path="/expense-requests" element={<ProtectedRoute module="EXPENSE_REQUESTS" action="view_expense_requests" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><ExpenseRequestPage {...commonProps} handleRequestExpense={(data) => {
                            const newReq = { ...data, id: `req-${Date.now()}`, date: new Date().toISOString(), userId: currentUser.id, status: 'pending' };
                            setExpenseRequests(prev => { const next = [newReq, ...prev]; persistToBusiness('expense_requests', next); return next; });
                            (users || []).filter(u => u.role === 'Owner' || u.role === 'Admin').forEach(adm => createNotification(adm.id, 'New Expense Request', `${currentUser.name} submitted a request for ${data.category}.`, 'expense_request', '/dashboard'));
                        }} /></ProtectedRoute>} />
                        <Route path="/investors" element={<ProtectedRoute module="INVESTORS" action="view_all_investors" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><InvestorPage {...commonProps} onSaveUser={(data, isEdit, id) => {
                             setUsers(prev => {
                                let next;
                                if (isEdit && id) next = (prev || []).map(u => u.id === id ? { ...u, ...data } : u);
                                else next = [{ ...data, id: `user-${Date.now()}`, avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`, status: 'Active' }, ...(prev || [])];
                                persistToBusiness('users', next); return next;
                            });
                        }} /></ProtectedRoute>} />
                        <Route path="/users" element={<ProtectedRoute module="SETTINGS" action="manage_permissions" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Users {...commonProps} onSaveUser={(data, isEdit, id) => {
                            setUsers(prev => {
                                let next;
                                if (isEdit && id) next = (prev || []).map(u => u.id === id ? { ...u, ...data } : u);
                                else next = [{ ...data, id: `user-${Date.now()}`, avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`, status: 'Active' }, ...(prev || [])];
                                persistToBusiness('users', next); return next;
                            });
                        }} onDeleteUser={(id) => setUsers(prev => { const next = (prev || []).filter(u => u.id !== id); persistToBusiness('users', next); return next; })} handleInitiateCustomPayment={(uid, amt, desc) => {
                            setUsers(prev => {
                                const next = (prev || []).map(u => {
                                    if (u.id === uid) {
                                        const newPayment = { id: `cp-${Date.now()}`, dateInitiated: new Date().toISOString(), amount: amt, description: desc, status: 'pending_owner_approval', initiatedBy: currentUser.id, auditLog: [{ timestamp: new Date().toISOString(), status: 'pending_owner_approval', actorId: currentUser.id, actorName: currentUser.name, note: 'Payment initiated' }] };
                                        return { ...u, customPayments: [newPayment, ...(u.customPayments || [])] };
                                    }
                                    return u;
                                });
                                persistToBusiness('users', next);
                                return next;
                            });
                        }} /></ProtectedRoute>} />
                        <Route path="/assistant" element={<ProtectedRoute module="AI" action="view_assistant" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><AIAssistant {...commonProps} /></ProtectedRoute>} />
                        <Route path="/expenses" element={<ProtectedRoute module="EXPENSES" action="view_expenses" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Expenses {...commonProps} setExpenses={createPersistentSetter(setExpenses, 'expenses')} /></ProtectedRoute>} />
                        <Route path="/cash-count" element={<ProtectedRoute module="FINANCE" action="cash_count_enter" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><CashCountPage {...commonProps} setCashCounts={createPersistentSetter(setCashCounts, 'cash_counts')} /></ProtectedRoute>} />
                        <Route path="/goods-costing" element={<ProtectedRoute module="FINANCE" action="goods_costing_view" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><GoodsCostingPage {...commonProps} setGoodsCostings={createPersistentSetter(setGoodsCosting, 'goods_costing')} setProducts={createPersistentSetter(setProducts, 'products')} /></ProtectedRoute>} />
                        <Route path="/goods-receiving" element={<ProtectedRoute module="FINANCE" action="goods_receiving_enter" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><GoodsReceivingPage {...commonProps} setGoodsReceivings={createPersistentSetter(setGoodsReceivings, 'goods_receiving')} setProducts={createPersistentSetter(setProducts, 'products')} /></ProtectedRoute>} />
                        <Route path="/weekly-inventory-check" element={<ProtectedRoute module="FINANCE" action="weekly_inventory_check_enter" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><WeeklyInventoryCheckPage {...commonProps} setWeeklyChecks={createPersistentSetter(setWeeklyInventoryChecks, 'weekly_checks')} /></ProtectedRoute>} />
                        <Route path="/profile" element={<MyProfile {...commonProps} 
                            onRequestWithdrawal={(uid, amt, src) => {
                                const update = (prevU: User[]) => (prevU || []).map(u => {
                                    if (u.id === uid) {
                                        const newW = { id: `wd-${Date.now()}`, date: new Date().toISOString(), amount: amt, status: 'pending', source: src, auditLog: [{ timestamp: new Date().toISOString(), status: 'pending', actorId: currentUser.id, actorName: currentUser.name }] };
                                        (users || []).filter(adm => adm.role === 'Owner' || adm.role === 'Admin').forEach(a => createNotification(a.id, 'New Payout Request', `${u.name} requested a withdrawal of ${formatCurrency(amt, receiptSettings.currencySymbol)}.`, 'payment', '/dashboard'));
                                        return { ...u, withdrawals: [newW, ...(u.withdrawals || [])] };
                                    }
                                    return u;
                                });
                                setUsers(prev => { const next = update(prev); persistToBusiness('users', next); return next; });
                                if (uid === currentUser.id) setCurrentUser(prev => update([prev])[0]);
                            }} 
                            handleUpdateCustomPaymentStatus={handleUpdateCustomPaymentStatus} 
                            onConfirmWithdrawalReceived={(uid, wid) => handleUpdateWithdrawalStatus(uid, wid, 'completed', 'Recipient confirmed receipt.')} 
                            onUpdateWithdrawalStatus={handleUpdateWithdrawalStatus} 
                            companyValuations={[]} 
                            onSwitchUser={(u) => { setCurrentUser(u); localStorage.setItem('fintab_simulator_session', JSON.stringify(u)); }} 
                            onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile} 
                        />} />
                        <Route path="/settings" element={<ProtectedRoute module="SETTINGS" action="view_settings" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Settings {...commonProps} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} setReceiptSettings={createPersistentSetter(setReceiptSettings, 'receipt_settings')} /></ProtectedRoute>} />
                        <Route path="/settings/receipts" element={<ProtectedRoute module="SETTINGS" action="manage_business_settings" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><ReceiptSettings {...commonProps} settings={receiptSettings} setSettings={createPersistentSetter(setReceiptSettings, 'receipt_settings')} /></ProtectedRoute>} />
                        <Route path="/settings/permissions" element={<ProtectedRoute module="SETTINGS" action="manage_permissions" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Permissions {...commonProps} onUpdatePermissions={createPersistentSetter(setPermissions, 'permissions')} /></ProtectedRoute>} />
                        <Route path="/settings/business" element={<ProtectedRoute module="SETTINGS" action="manage_business_settings" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><BusinessSettings {...commonProps} onUpdateSettings={createPersistentSetter(setBusinessSettings, 'settings')} onUpdateBusinessProfile={createPersistentSetter(setBusinessProfile, 'business_profile')} onResetBusiness={handleResetBusiness} onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile} /></ProtectedRoute>} />
                        <Route path="/settings/owner" element={<ProtectedRoute module="SETTINGS" action="admin_settings" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><OwnerSettingsPage {...commonProps} onUpdate={createPersistentSetter(setOwnerSettings, 'owner_settings')} /></ProtectedRoute>} />
                        <Route path="/settings/printer" element={<ProtectedRoute module="SETTINGS" action="view_settings" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><PrinterSettings settings={printerSettings} onUpdateSettings={(s) => { setPrinterSettings(s); localStorage.setItem('fintab_printer_settings', JSON.stringify(s)); }} /></ProtectedRoute>} />
                        <Route path="/alerts" element={<ProtectedRoute module="REPORTS" action="view_sales_reports" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><AlertsPage {...commonProps} onDismiss={handleDismissAnomaly} onMarkRead={handleMarkAnomalyRead} /></ProtectedRoute>} />
                        <Route path="/directory" element={<Directory />} />
                        <Route path="/public-shopfront/:businessId" element={<PublicStorefront />} />
                        <Route path="/customers" element={<ProtectedRoute module="CUSTOMERS" action="view_customers" user={currentUser} permissions={permissions} isSafeMode={!permissionsLoaded}><Customers {...commonProps} setCustomers={createPersistentSetter(setCustomers, 'customers')} /></ProtectedRoute>} />
                        <Route path="/customer-management" element={<Navigate to="/customers" replace />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </main>
            </div>
            <BottomNavBar t={t} cart={cart || []} currentUser={currentUser} permissions={permissions} />
        </div>
    );
}
