
// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { formatCurrency, getStoredItem } from '../lib/utils';
import { AIIcon, CloseIcon, PlusIcon, WarningIcon, ShieldCheckIcon } from '../constants';
import type { User, Sale, Product, Expense, Customer, ExpenseRequest, AnomalyAlert, BusinessSettingsData, ReceiptSettingsData, AppPermissions } from '../types';
import { hasAccess } from '../lib/permissions';

interface AIAssistantProps {
    currentUser: User;
    sales: Sale[];
    products: Product[];
    expenses: Expense[];
    customers: Customer[];
    users: User[];
    expenseRequests: ExpenseRequest[];
    anomalyAlerts: AnomalyAlert[];
    businessSettings: BusinessSettingsData;
    lowStockThreshold: number;
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    permissions: AppPermissions;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
    currentUser, sales, products, expenses, customers, users,
    expenseRequests, anomalyAlerts, businessSettings, lowStockThreshold, t,
    receiptSettings, permissions
}) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null); // null means checking
    const scrollRef = useRef<HTMLDivElement>(null);

    const checkKeyStatus = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(hasKey);
            } catch (err) {
                console.error("Auth Node Check Failure:", err);
                setHasApiKey(false);
            }
        } else {
            setHasApiKey(!!process.env.API_KEY);
        }
    };

    useEffect(() => {
        checkKeyStatus();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            try {
                await window.aistudio.openSelectKey();
                // Assume success per instructions to mitigate race conditions
                setHasApiKey(true);
            } catch (err) {
                console.error("Select Key Protocol Failure:", err);
            }
        }
    };

    const contextStr = useMemo(() => {
        const safeSales = (sales || []).slice(0, 100); // Token safety
        const safeProducts = products || [];
        const safeExpenses = expenses || [];
        const cs = receiptSettings?.currencySymbol || '$';

        let str = `[TERMINAL CONTEXT: ${receiptSettings?.businessName || 'Business Portal'}]\n`;
        str += `- Current Identity: ${currentUser?.name} (${currentUser?.role})\n`;
        
        // Performance Stats
        const totalRev = safeSales.filter(s => s.status === 'completed' || s.status === 'completed_bank_verified').reduce((s, x) => s + x.total, 0);
        const totalExp = safeExpenses.filter(e => e.status !== 'deleted').reduce((s, e) => s + e.amount, 0);
        const netValue = totalRev - totalExp;

        str += `\n[FINANCIAL PERFORMANCE]\n- Lifetime Revenue: ${cs}${totalRev.toFixed(2)}\n- Total Debit Outflow: ${cs}${totalExp.toFixed(2)}\n- Estimated Liquidity: ${cs}${netValue.toFixed(2)}\n`;

        // Staffing
        str += `\n[PERSONNEL ROSTER]\n`;
        users.forEach(u => {
            const staffSales = safeSales.filter(s => s.userId === u.id);
            const staffTotal = staffSales.reduce((s, x) => s + x.total, 0);
            str += `- ${u.name} (${u.role}): ${cs}${staffTotal.toFixed(2)} lifetime yield\n`;
        });

        // Inventory
        const lowStockItems = safeProducts.filter(p => (p.stock || 0) <= lowStockThreshold);
        str += `\n[ASSET HEALTH]\n- Registered SKU Count: ${safeProducts.length}\n- Critical Low Stock Alerts: ${lowStockItems.length}\n`;
        
        return str;
    }, [currentUser, sales, products, expenses, users, receiptSettings, lowStockThreshold]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const currentInput = input;
        setMessages(prev => [...prev, { role: 'user', text: currentInput }]);
        setInput('');
        setIsLoading(true);

        try {
            // New instance created just-in-time for up-to-date API key injection
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `Business Node Telemetry:\n${contextStr}\n\nClient Inquiry: ${currentInput}`,
                config: {
                    systemInstruction: `You are the Core Intelligence of FinTab POS. 
Your goal is to provide authoritative, data-driven business advice. 
When asked for business value, synthesize the revenue, expense, and asset data provided in the telemetry.
Always be professional and use structured lists for clarity.
Security Protocol: If sensitive profit data is requested by non-owners, provide high-level inventory summaries instead.`
                }
            });

            if (response.text) {
                setMessages(prev => [...prev, { role: 'model', text: response.text }]);
            }
        } catch (error) {
            console.error("Intelligence Node Failure:", error);
            const errMsg = error.message || "";
            
            // Self-healing for auth errors
            if (errMsg.includes("Requested entity was not found.")) {
                setHasApiKey(false);
                setMessages(prev => [...prev, { role: 'model', text: "Protocol Reset: Authorization node decommissioned. Please re-authenticate via the security prompt." }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: `Protocol Error: Intelligence node connection failed. Please verify API configuration and quota status.` }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (hasApiKey === null) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-14rem)] bg-white dark:bg-gray-900 rounded-[3rem]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!hasApiKey) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-14rem)] bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-gray-800 p-12 text-center animate-fade-in font-sans">
                <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-amber-100 dark:border-amber-800 shadow-inner">
                    <WarningIcon className="w-12 h-12 text-amber-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Authorization Required</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-sm mb-10 leading-relaxed uppercase tracking-widest">
                    To access Core Intelligence protocols, you must authorize a valid API key from a paid Google Cloud project.
                </p>
                <div className="space-y-4 w-full max-w-xs">
                    <button 
                        onClick={handleSelectKey}
                        className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        Initialize Auth Protocol
                    </button>
                    <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
                    >
                        Review Billing Requirements
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-14rem)] bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-gray-800 overflow-hidden font-sans animate-fade-in">
            <header className="p-8 border-b dark:border-gray-800 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="bg-white/10 p-4 rounded-[1.5rem] backdrop-blur-md border border-white/10 shadow-inner"><AIIcon className="w-8 h-8 text-primary" /></div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Core Intelligence</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Secured • v2.2</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => setMessages([])}
                    className="relative z-10 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90"
                    title="Clear Terminal Session"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30 dark:bg-gray-950/30">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                        <div className="w-24 h-24 bg-slate-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                            <AIIcon className="w-12 h-12 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-[0.4em] text-slate-400">Awaiting Instruction</h3>
                        <p className="mt-4 text-xs font-bold text-slate-400 max-w-xs mx-auto leading-relaxed uppercase tracking-widest">
                            Inquire about node performance, valuation, or asset health.
                        </p>
                    </div>
                )}
                
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        <div className={`max-w-[85%] p-6 rounded-[2.5rem] shadow-sm ${
                            m.role === 'user' 
                            ? 'bg-primary text-white rounded-br-none' 
                            : 'bg-white dark:bg-gray-800 text-slate-900 dark:text-white rounded-bl-none border border-slate-100 dark:border-gray-700'
                        }`}>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] rounded-bl-none shadow-sm border border-slate-100 dark:border-gray-700">
                            <div className="flex gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </main>

            <footer className="p-8 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Inquire: 'Analyze business value' or 'Top staff performers?'"
                        className="flex-1 bg-slate-50 dark:bg-gray-950 border-none rounded-2xl px-8 py-5 text-sm font-bold shadow-inner focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-slate-900 dark:bg-primary text-white px-10 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {isLoading ? 'Processing...' : 'Execute'}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default AIAssistant;
