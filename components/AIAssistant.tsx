
// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { formatCurrency, getStoredItem } from '../lib/utils';
import { AIIcon, CloseIcon, PlusIcon } from '../constants';
import type { User, Sale, Product, Expense, Customer, ExpenseRequest, CashCount, GoodsCosting, GoodsReceiving, AnomalyAlert, BusinessSettingsData, ReceiptSettingsData, AppPermissions } from '../types';
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
    const scrollRef = useRef<HTMLDivElement>(null);

    const contextStr = useMemo(() => {
        const safeSales = sales || [];
        const safeProducts = products || [];
        const safeExpenses = expenses || [];
        const cs = receiptSettings?.currencySymbol || '$';

        let str = `[TERMINAL CONTEXT: ${receiptSettings?.businessName || 'Business Portal'}]\n`;
        str += `- Current User: ${currentUser?.name} (Role: ${currentUser?.role})\n`;
        str += `- Registered Personnel: ${users?.length || 0} units\n`;
        
        // Detailed Staff Context
        str += `\n[PERSONNEL ROSTER]\n`;
        users.forEach(u => {
            const staffSales = safeSales.filter(s => s.userId === u.id);
            const staffYield = staffSales.reduce((s, x) => s + x.total, 0);
            str += `- ${u.name} (${u.role}): Lifetime Sales ${cs}${staffYield.toFixed(2)}, Active: ${u.status}\n`;
        });

        // Authorization Pipeline Context
        const pendingPayouts = expenseRequests.filter(r => r.status === 'pending');
        str += `\n[VERIFICATION QUEUE]\n- Pending Expense Requests: ${pendingPayouts.length}\n`;
        pendingPayouts.forEach(p => {
            const requester = users.find(u => u.id === p.userId)?.name || 'Unknown';
            str += `  * Request from ${requester}: ${cs}${p.amount.toFixed(2)} for ${p.category}\n`;
        });

        // Inventory Summary
        const totalStock = safeProducts.reduce((s, p) => s + (p.stock || 0), 0);
        const lowStockItems = safeProducts.filter(p => (p.stock || 0) <= lowStockThreshold);
        str += `\n[INVENTORY STATUS]\n- SKU Count: ${safeProducts.length}\n- Total Units: ${totalStock}\n- Low Stock Alerts: ${lowStockItems.length}\n`;
        if (lowStockItems.length > 0) {
            str += `- Top Low Stock: ${lowStockItems.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ')}\n`;
        }

        // Financial Summary
        const totalRev = safeSales.filter(s => s.status === 'completed').reduce((s, x) => s + x.total, 0);
        const totalExp = safeExpenses.filter(e => e.status !== 'deleted').reduce((s, e) => s + e.amount, 0);
        str += `\n[FINANCIAL HEALTH]\n- Lifetime Revenue: ${cs}${totalRev.toFixed(2)}\n- Total Outflow: ${cs}${totalExp.toFixed(2)}\n- Balance: ${cs}${(totalRev - totalExp).toFixed(2)}\n`;

        return str;
    }, [currentUser, sales, products, expenses, users, customers, anomalyAlerts, receiptSettings, permissions, lowStockThreshold, expenseRequests]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const currentInput = input;
        const newMessages = [...messages, { role: 'user' as const, text: currentInput }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: `Context:\n${contextStr}\n\nUser Question: ${currentInput}` }] }],
                config: {
                    systemInstruction: `You are the FinTab Core Intelligence, a high-level business management advisor. 
Your goal is to help the business owner optimize operations and manage staff effectively.

Operational Guidelines:
1. STAFF PERFORMANCE: Analyze who is selling the most and who needs support. Mention them by name if requested.
2. VERIFICATION: Remind the user about pending expense requests or signatures needed from the context provided.
3. INVENTORY: Flag critical stock issues before they become outages.
4. FINANCIAL ADVICE: Based on revenue and expenses, suggest where they might save money or push for more sales.
5. TONE: Be authoritative, data-driven, and highly professional. Use bullet points for complex data.
6. LIMITATION: Never invent data. If the context string doesn't have the answer, say "Node data for this query is currently unavailable."
7. SECURITY: Only the owner should see sensitive profit data; if the current user isn't an 'Owner', keep responses restricted to inventory and general sales counts.`
                }
            });

            if (response.text) {
                setMessages(prev => [...prev, { role: 'model', text: response.text }]);
            }
        } catch (error) {
            console.error("AI Node Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Protocol Error: Intelligence node connection failed. Please verify API configuration." }]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="flex flex-col h-[calc(100vh-14rem)] bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-gray-800 overflow-hidden font-sans animate-fade-in">
            <header className="p-8 border-b dark:border-gray-800 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="bg-white/10 p-4 rounded-[1.5rem] backdrop-blur-md border border-white/10"><AIIcon className="w-8 h-8 text-primary" /></div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Core Intelligence</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Analysis Protocol v2.1</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30 dark:bg-gray-950/30">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                        <div className="w-24 h-24 bg-slate-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                            <AIIcon className="w-12 h-12 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-[0.4em] text-slate-400">Awaiting Analysis Instruction</h3>
                        <p className="mt-4 text-xs font-bold text-slate-400 max-w-xs mx-auto leading-relaxed uppercase tracking-widest">
                            Ask about staff performance, pending requests, or inventory health.
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
                        placeholder="Inquire: 'Who is my top seller?' or 'Any pending tasks?'"
                        className="flex-1 bg-slate-50 dark:bg-gray-950 border-none rounded-2xl px-8 py-5 text-sm font-bold shadow-inner focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-slate-900 dark:bg-primary text-white px-10 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {isLoading ? 'Analysing...' : 'Execute'}
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default AIAssistant;
