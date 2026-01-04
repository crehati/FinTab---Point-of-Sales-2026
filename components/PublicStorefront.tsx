
// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import type { Product, CartItem, BusinessProfile, ReceiptSettingsData, Customer, Sale, User, ProductVariant, AdminBusinessData } from '../types';
import { translations } from '../lib/translations';
import { formatCurrency, setStoredItemAndDispatchEvent, getStoredItem } from '../lib/utils';
import { COUNTRIES, ChatBubbleIcon, PhoneIcon, EmailIcon, CartIcon, ChevronDownIcon, CloseIcon } from '../constants';
import VariantSelectionModal from './VariantSelectionModal';
import QuantityModal from './QuantityModal';
import SearchInput from './SearchInput';

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const getEffectivePrice = (item: CartItem): number => {
    if (item.variant) return item.variant.price;
    const { product, quantity } = item;
    if (!product.tieredPricing || product.tieredPricing.length === 0) return product.price;
    const sortedTiers = [...product.tieredPricing].sort((a, b) => b.quantity - a.quantity);
    const applicableTier = sortedTiers.find(tier => quantity >= tier.quantity);
    return applicableTier ? applicableTier.price : product.price;
};

const PublicStorefront: React.FC = () => {
    const { businessId } = useParams<{ businessId: string }>();
    const [business, setBusiness] = useState<AdminBusinessData | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [receiptSettings, setReceiptSettings] = useState<ReceiptSettingsData | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const t = (key: string) => (translations as any).en[key] || key;

    useEffect(() => {
        setIsLoading(true);
        if (!businessId) { setIsLoading(false); return; }
        const allBusinesses = getStoredItem<AdminBusinessData[]>('fintab_businesses_registry', []);
        const businessData = allBusinesses.find(b => b.id === businessId);
        if (businessData) {
            setBusiness(businessData);
            setProducts(getStoredItem(`fintab_${businessId}_products`, []));
            setReceiptSettings(getStoredItem(`fintab_${businessId}_receipt_settings`, null));
        }
        setIsLoading(false);
    }, [businessId]);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0), [cart]);
    const isVariableProduct = selectedProductForModal?.productType === 'variable';

    const groupedProducts = useMemo(() => {
        return products.reduce((acc, product) => {
            const category = product.category || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(product);
            return acc;
        }, {} as Record<string, Product[]>);
    }, [products]);

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-gray-100"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    if (!business || !receiptSettings) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
                <div className="text-center p-12 bg-white rounded-[3rem] shadow-xl max-w-sm border border-slate-100">
                    <h1 className="text-2xl font-bold text-gray-700 uppercase tracking-tighter">Node Not Found</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">The public terminal node is unreachable.</p>
                    <NavLink to="/directory" className="mt-10 btn-base btn-primary w-full">Directory Hub</NavLink>
                </div>
            </div>
        );
    }

    const cs = receiptSettings.currencySymbol;
    const profile = business?.profile || {};

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
             <header className="bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
                <div className="container mx-auto px-6 py-20 md:py-28 relative">
                    <NavLink to="/directory" className="absolute top-8 left-8 flex items-center gap-3 text-slate-400 hover:text-white transition-all z-10 font-black uppercase text-[10px] tracking-widest group">
                        <div className="group-hover:-translate-x-1 transition-transform"><ArrowLeftIcon className="w-5 h-5" /></div> Directory
                    </NavLink>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                            {profile.logo ? (
                                <img src={profile.logo} className="h-32 w-32 object-contain rounded-[2.5rem] bg-white/5 p-4 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40" />
                            ) : (
                                <div className="h-32 w-32 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl shadow-2xl">
                                    <span className="text-5xl font-black text-primary/40">{profile.businessName?.charAt(0)}</span>
                                </div>
                            )}
                            <div>
                                <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-tight">{profile.businessName || 'Terminal Node'}</h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Verified Presence Protocol</p>
                                    </div>
                                    <span className="h-4 w-px bg-white/10 hidden md:block"></span>
                                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">{profile.businessType} Class</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-10 mt-[-4rem] relative z-10">
                <div className="lg:col-span-2 space-y-10">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-2xl border border-white/10">
                        <SearchInput placeholder="Protocol Asset ID or SKU Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="space-y-16">
                        {Object.keys(groupedProducts).sort().map(category => {
                            const filtered = groupedProducts[category].filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
                            if (filtered.length === 0) return null;

                            return (
                                <div key={category} className="space-y-8 animate-fade-in">
                                    <div className="flex items-center gap-4 px-6">
                                        <div className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/40"></div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{category}</h2>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filtered.map(product => (
                                            <button 
                                                key={product.id} 
                                                onClick={() => setSelectedProductForModal(product)}
                                                disabled={product.stock === 0}
                                                className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl flex flex-col overflow-hidden text-left hover:shadow-2xl hover:-translate-y-2 transition-all group disabled:opacity-50 border border-slate-50 dark:border-gray-800"
                                            >
                                                <div className="relative overflow-hidden aspect-square">
                                                    <img src={product.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                                                    {product.stock === 0 && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                            <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] border border-white/20 px-4 py-2 rounded-xl">Protocol: Null</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-8 flex flex-col flex-grow">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{product.name}</h3>
                                                    <div className="mt-8 flex items-end justify-between">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price Node</p>
                                                            <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">{formatCurrency(product.price, cs)}</p>
                                                        </div>
                                                        <div className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] group-hover:bg-primary transition-colors shadow-lg">Request</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-12 space-y-8">
                        <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full -ml-16 -mt-16 blur-2xl"></div>
                             <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 pb-6 border-b border-white/5 flex justify-between items-center">
                                Order Ledger
                                <CartIcon className="w-6 h-6 text-primary" />
                             </h3>
                             {cart.length === 0 ? (
                                <div className="text-center py-20 opacity-30">
                                    <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                        <CartIcon className="w-10 h-10" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em]">Grid Empty</p>
                                </div>
                             ) : (
                                <>
                                    <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar no-scrollbar pr-4 mb-10">
                                        {cart.map((item, i) => (
                                            <div key={i} className="flex justify-between items-center group animate-fade-in">
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-tight truncate max-w-[180px] group-hover:text-primary transition-colors">{item.product.name}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase font-bold mt-1">{item.quantity} Unit(s)</p>
                                                </div>
                                                <p className="font-black tabular-nums text-sm">{cs}{(getEffectivePrice(item) * item.quantity).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Protocol Sum</p>
                                            <p className="text-4xl font-black tracking-tighter tabular-nums text-white">{cs}{subtotal.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsOrderModalOpen(true)} className="w-full mt-12 py-6 bg-primary text-white rounded-3xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-primary/20 active:scale-95 transition-all hover:bg-blue-700">Submit Protocol Order</button>
                                </>
                             )}
                        </div>
                    </div>
                </div>
            </main>
            
            <button onClick={() => setIsChatOpen(true)} className="fixed bottom-12 right-12 bg-primary text-white rounded-[2.5rem] p-8 shadow-2xl shadow-primary/30 hover:scale-110 active:scale-95 transition-all z-40 group">
                <ChatBubbleIcon className="w-8 h-8 group-hover:rotate-12 transition-transform" />
            </button>
            
             {isVariableProduct ? (
                <VariantSelectionModal isOpen={!!selectedProductForModal} onClose={() => setSelectedProductForModal(null)} product={selectedProductForModal} onConfirm={(p, v, q) => { setCart([...cart, { product: p, variant: v, quantity: q, stock: v.stock }]); setSelectedProductForModal(null); }} receiptSettings={receiptSettings} />
            ) : (
                <QuantityModal isOpen={!!selectedProductForModal} onClose={() => setSelectedProductForModal(null)} product={selectedProductForModal} cart={cart} onConfirm={(p, q) => { setCart([...cart, { product: p, quantity: q, stock: p.stock }]); setSelectedProductForModal(null); }} receiptSettings={receiptSettings} />
            )}
        </div>
    );
};

export default PublicStorefront;
