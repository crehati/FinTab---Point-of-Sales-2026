// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import type { Product, CartItem, Sale, Customer, User, ReceiptSettingsData, BusinessSettingsData, PrinterSettingsData, ProductVariant, BankAccount } from '../types';
import Card from './Card';
import ReceiptModal from './ReceiptModal';
import CustomerModal from './CustomerModal';
import CustomerSelectionModal from './CustomerSelectionModal';
import UserSelectionModal from './UserSelectionModal';
import PaymentMethodSelectionModal from './PaymentMethodSelectionModal';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import BankDetailsModal from './BankDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import TerminalErrorBoundary from './TerminalErrorBoundary';
import { formatCurrency } from '../lib/utils';
import { WarningIcon, CartIcon } from '../constants';
import { hasAccess } from '../lib/permissions';

interface CounterProps {
    cart: CartItem[];
    customers: Customer[];
    users: User[];
    onUpdateCartItem: (product: Product, variant: ProductVariant | undefined, quantity: number) => void;
    onProcessSale: (sale: Sale) => void;
    onClearCart: () => void;
    receiptSettings: ReceiptSettingsData;
    t: (key: string) => string;
    onAddCustomer: (customerData: Omit<Customer, 'id' | 'joinDate' | 'purchaseHistory'>) => Customer;
    currentUser: User;
    businessSettings: BusinessSettingsData;
    printerSettings: PrinterSettingsData;
    isTrialExpired: boolean;
    permissions: AppPermissions;
    bankAccounts: BankAccount[];
}

const getEffectivePrice = (product: Product, quantity: number): number => {
    if (!product) return 0;
    const basePrice = Number(product.price) || 0;
    if (!product.tieredPricing || product.tieredPricing.length === 0) return basePrice;
    const sortedTiers = [...product.tieredPricing].sort((a, b) => b.quantity - a.quantity);
    const applicableTier = sortedTiers.find(tier => quantity >= tier.quantity);
    return applicableTier ? (Number(applicableTier.price) || 0) : basePrice;
};

const CounterContent: React.FC<CounterProps> = (props) => {
    const { cart, customers, users, onUpdateCartItem, onProcessSale, onClearCart, receiptSettings, t, currentUser, businessSettings, printerSettings, isTrialExpired, permissions, bankAccounts } = props;
    
    const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'pending_confirmation' | 'processing' | 'completed' | 'error'>('idle');
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [discount, setDiscount] = useState<string | number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
    const [validationError, setValidationError] = useState('');
    const [taxRate, setTaxRate] = useState<string | number>(businessSettings.defaultTaxRate || 0); 
    
    const [isCustomerSelectModalOpen, setIsCustomerSelectModalOpen] = useState(false);
    const [isUserSelectModalOpen, setIsUserSelectModalOpen] = useState(false);
    const [isPaymentMethodSelectModalOpen, setIsPaymentMethodSelectModalOpen] = useState(false);

    const [commitSnapshot, setCommitSnapshot] = useState<any>(null);

    const cs = String(receiptSettings.currencySymbol || '$');

    const canApplyDiscount = hasAccess(currentUser, 'SALES', 'APPLY_DISCOUNT', permissions);
    const canCreateSale = hasAccess(currentUser, 'SALES', 'CREATE_SALE', permissions);
    const canUseBank = hasAccess(currentUser, 'SALES', 'BANK_TRANSFER', permissions);
    const canUseCash = hasAccess(currentUser, 'SALES', 'CASH_SALE', permissions);

    const financialData = useMemo(() => {
        const rawSubtotal = (cart || []).reduce((sum, item) => {
            if (!item || !item.product) return sum;
            const price = item.variant ? (Number(item.variant.price) || 0) : getEffectivePrice(item.product, item.quantity);
            return sum + (price * (Number(item.quantity) || 0));
        }, 0);
        const nDiscount = canApplyDiscount ? Math.max(0, Number(discount) || 0) : 0;
        const nTaxRate = Math.max(0, Number(taxRate) || 0);
        const afterDiscount = Math.max(0, rawSubtotal - nDiscount);
        const calcTax = afterDiscount * (nTaxRate / 100);
        const finalTotal = afterDiscount + calcTax;
        return { subtotal: rawSubtotal, numericDiscount: nDiscount, numericTaxRate: nTaxRate, subtotalAfterDiscount: afterDiscount, tax: calcTax, total: finalTotal };
    }, [cart, discount, taxRate, canApplyDiscount]);

    const { subtotal, numericDiscount, total } = financialData;

    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

    const resetCounter = useCallback(() => {
        onClearCart();
        setSelectedCustomerId(null);
        setSelectedUserId(null);
        setDiscount(0);
        setPaymentMethod(null);
        setValidationError('');
        setCheckoutStatus('idle');
        setCommitSnapshot(null);
    }, [onClearCart]);

    const handleCheckout = () => {
        if (!canCreateSale) { setValidationError("Unauthorized Protocol: Access to 'Create Sale' denied."); return; }
        if (checkoutStatus === 'processing') return;
        if (!cart || cart.length === 0) { setValidationError("Protocol Violation: Digital basket is empty."); return; }
        if (!selectedCustomerId) { setValidationError("Identity verification required: select a client."); return; }
        if (!selectedUserId) { setValidationError("Processing entity required: select a staff member."); return; }
        if (!paymentMethod) { setValidationError("Financial protocol required: select a payment method."); return; }
        
        setValidationError('');
        setCommitSnapshot({ ...financialData, customerId: selectedCustomerId, userId: selectedUserId, paymentMethod: paymentMethod, items: JSON.parse(JSON.stringify(cart)) });

        if (paymentMethod === 'Bank Receipt') setIsBankModalOpen(true);
        else { setCheckoutStatus('pending_confirmation'); setIsConfirmModalOpen(true); }
    };

    const handleConfirmSale = (paymentDetails: any) => {
        if (!commitSnapshot || checkoutStatus === 'processing') return;
        setCheckoutStatus('processing');
        const { subtotal, numericDiscount, total, numericTaxRate, items, customerId, userId, paymentMethod } = commitSnapshot;
        
        const sale: Sale = {
            id: `sale-${Date.now()}`, date: new Date().toISOString(), items: items || [], customerId: String(customerId), userId: String(userId),
            subtotal: Number(subtotal) || 0, tax: Number(total - (subtotal - numericDiscount)) || 0, discount: Number(numericDiscount) || 0,
            total: Number(total) || 0, paymentMethod: String(paymentMethod), taxRate: Number(numericTaxRate) || 0,
            status: paymentMethod === 'Bank Receipt' ? 'pending_bank_verification' : 'completed',
            cashReceived: Number(paymentDetails?.cashReceived) || 0, change: Number(paymentDetails?.change) || 0,
            bankReceiptNumber: paymentDetails?.bankReceiptNumber, bankName: paymentDetails?.bankName, bankAccountId: paymentDetails?.bankAccountId
        };

        onProcessSale(sale);
        if (paymentMethod !== 'Bank Receipt') setCompletedSale(sale);
        setCheckoutStatus('completed');
        setIsConfirmModalOpen(false);
        setIsBankModalOpen(false);
        resetCounter();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 font-sans pb-24 px-2 sm:px-0">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-50 dark:border-gray-800">
                <header className="p-8 sm:p-10 border-b dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">{t('counter')}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Terminal Basket Entry</p>
                    </div>
                    {cart.length > 0 && (
                        <button onClick={() => setIsClearConfirmOpen(true)} className="px-6 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all active:scale-95">Reset Grid</button>
                    )}
                </header>

                <div className="p-8 sm:p-10 min-h-[360px]">
                    {validationError && (
                        <div className="mb-10 p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start gap-4 animate-shake">
                            <WarningIcon className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight leading-relaxed">{validationError}</p>
                        </div>
                    )}

                    {cart.length === 0 ? (
                        <div className="text-center py-28 flex flex-col items-center justify-center">
                            <div className="bg-slate-50 dark:bg-gray-800/50 p-10 rounded-full mb-8 opacity-30"><CartIcon className="h-16 w-16 text-slate-300" /></div>
                            <p className="font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em] text-[10px]">Digital Basket Empty</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-50 dark:divide-gray-800">
                            {cart.map((item, idx) => {
                                const price = item.variant ? (Number(item.variant.price) || 0) : getEffectivePrice(item.product, item.quantity);
                                return (
                                    <li key={`${item.product.id}-${idx}`} className="py-8 flex flex-col sm:flex-row sm:items-center gap-6 group">
                                        <div className="relative w-20 h-20 flex-shrink-0">
                                            <img src={String(item.product.imageUrl)} className="w-full h-full rounded-[1.5rem] object-cover shadow-sm border border-slate-100 dark:border-gray-800" />
                                            {item.variant && <div className="absolute -top-2 -right-2 bg-primary text-white text-[7px] font-black px-2 py-1 rounded-lg uppercase shadow-lg">Variant</div>}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tighter text-base line-clamp-1">{String(item.product.name)}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs font-black text-primary tabular-nums">{cs}{price.toFixed(2)}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Unit Price</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center bg-slate-50 dark:bg-gray-950 rounded-2xl p-1 gap-1 border border-slate-100 dark:border-gray-800 w-fit">
                                            <button onClick={() => onUpdateCartItem(item.product, item.variant, item.quantity - 1)} className="w-11 h-11 rounded-xl text-lg font-bold text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-90">-</button>
                                            <input type="number" value={item.quantity} onChange={(e) => onUpdateCartItem(item.product, item.variant, parseInt(e.target.value) || 0)} className="w-14 h-11 text-center font-black text-slate-900 dark:text-white text-sm bg-transparent border-none tabular-nums outline-none" />
                                            <button onClick={() => onUpdateCartItem(item.product, item.variant, item.quantity + 1)} className="w-11 h-11 rounded-xl text-lg font-bold text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-90">+</button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {cart.length > 0 && (
                    <footer className="p-8 sm:p-10 bg-slate-50/50 dark:bg-gray-950/50 border-t dark:border-gray-800">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                            <div className="space-y-6">
                                <div className={`p-6 bg-white dark:bg-gray-900 rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm ${!canApplyDiscount ? 'opacity-40' : ''}`}>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 block px-1">Applied Discount ({cs})</label>
                                    <input type="number" disabled={!canApplyDiscount} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
                                </div>
                                <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-slate-100 dark:border-gray-800 shadow-sm">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 block px-1">Tax Protocol (%)</label>
                                    <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400"><span>Basket Sum</span><span>{cs}{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-rose-400"><span>Adjustment</span><span>-{cs}{numericDiscount.toFixed(2)}</span></div>
                                </div>
                                <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-end relative z-10">
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Protocol Total</span>
                                    <span className="text-5xl font-black tracking-tighter tabular-nums text-white">{cs}{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <button onClick={() => setIsCustomerSelectModalOpen(true)} className="flex-1 p-5 border-2 border-slate-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest hover:border-primary/40 transition-all truncate text-left">{selectedCustomer ? selectedCustomer.name : 'Select Identity'}</button>
                                <button onClick={() => setIsUserSelectModalOpen(true)} className="flex-1 p-5 border-2 border-slate-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest hover:border-primary/40 transition-all truncate text-left">{selectedUser ? selectedUser.name : 'Verify Staff'}</button>
                                <button onClick={() => setIsPaymentMethodSelectModalOpen(true)} className="flex-1 p-5 border-2 border-slate-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-bold uppercase text-[10px] tracking-widest hover:border-primary/40 transition-all truncate text-left">{paymentMethod ? paymentMethod : 'Settlement'}</button>
                            </div>
                            <button onClick={handleCheckout} className="btn-base btn-primary w-full py-6 text-base" disabled={checkoutStatus === 'processing' || !canCreateSale}>
                                {checkoutStatus === 'processing' ? 'Processing Node...' : 'Authorize Transaction'}
                            </button>
                        </div>
                    </footer>
                )}
            </div>

            <PaymentConfirmationModal isOpen={isConfirmModalOpen} onClose={() => { setIsConfirmModalOpen(false); setCheckoutStatus('idle'); }} onConfirm={handleConfirmSale} total={commitSnapshot?.total || total} paymentMethod={commitSnapshot?.paymentMethod || paymentMethod} receiptSettings={receiptSettings} />
            <BankDetailsModal isOpen={isBankModalOpen} onClose={() => { setIsBankModalOpen(false); setCheckoutStatus('idle'); }} onConfirm={handleConfirmSale} total={commitSnapshot?.total || total} currencySymbol={cs} bankAccounts={bankAccounts} />
            {completedSale && <ReceiptModal sale={completedSale} customers={customers} users={users} onClose={() => setCompletedSale(null)} receiptSettings={receiptSettings} onDelete={() => {}} currentUser={currentUser} t={t} isTrialExpired={isTrialExpired} printerSettings={printerSettings} />}
            <CustomerSelectionModal isOpen={isCustomerSelectModalOpen} onClose={() => setIsCustomerSelectModalOpen(false)} customers={customers} onSelect={setSelectedCustomerId} onAddNew={() => setIsCustomerSelectModalOpen(false)} />
            <UserSelectionModal isOpen={isUserSelectModalOpen} onClose={() => setIsUserSelectModalOpen(false)} users={users} onSelect={setSelectedUserId} />
            <PaymentMethodSelectionModal isOpen={isPaymentMethodSelectModalOpen} onClose={() => setIsPaymentMethodSelectModalOpen(false)} paymentMethods={businessSettings.paymentMethods || []} onSelect={setPaymentMethod} />
            <ConfirmationModal isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)} onConfirm={() => { resetCounter(); setIsClearConfirmOpen(false); }} title="Reset Terminal" message="Abort transaction flow and purge the active basket registry?" />
        </div>
    );
};

const Counter: React.FC<CounterProps> = (props) => (
    <TerminalErrorBoundary onResetCheckout={props.onClearCart}><CounterContent {...props} /></TerminalErrorBoundary>
);

export default Counter;