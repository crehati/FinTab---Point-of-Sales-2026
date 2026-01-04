
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
    if (!product.tieredPricing || product.tieredPricing.length === 0) {
        return basePrice;
    }
    const sortedTiers = [...product.tieredPricing].sort((a, b) => b.quantity - a.quantity);
    const applicableTier = sortedTiers.find(tier => quantity >= tier.quantity);
    return applicableTier ? (Number(applicableTier.price) || 0) : basePrice;
};

const CounterContent: React.FC<CounterProps> = (props) => {
    const { cart, customers, users, onUpdateCartItem, onProcessSale, onClearCart, receiptSettings, t, currentUser, businessSettings, printerSettings, isTrialExpired, permissions, bankAccounts } = props;
    
    const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'pending_confirmation' | 'processing' | 'completed' | 'error'>('idle');
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [proformaInvoice, setProformaInvoice] = useState<Sale | null>(null);
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

    // Action Permission Checks
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

    const { subtotal, numericDiscount, numericTaxRate, tax, total } = financialData;

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
        
        if (paymentMethod === 'Bank Receipt' && !canUseBank) { setValidationError("Unauthorized: Bank Transfer protocol disabled for your role."); return; }
        if (paymentMethod === 'Cash' && !canUseCash) { setValidationError("Unauthorized: Cash settlement disabled for your role."); return; }

        setValidationError('');
        setCommitSnapshot({ 
            ...financialData, 
            customerId: selectedCustomerId, 
            userId: selectedUserId, 
            paymentMethod: paymentMethod, 
            items: JSON.parse(JSON.stringify(cart)) 
        });

        if (paymentMethod === 'Bank Receipt') {
            setIsBankModalOpen(true);
        } else {
            setCheckoutStatus('pending_confirmation');
            setIsConfirmModalOpen(true);
        }
    };

    const handleConfirmSale = (paymentDetails: { cashReceived?: number; change?: number; bankReceiptNumber?: string; bankName?: string; bankAccountId?: string }) => {
        if (!commitSnapshot || checkoutStatus === 'processing') return;
        setCheckoutStatus('processing');
        const { subtotal, numericDiscount, total, numericTaxRate, items, customerId, userId, paymentMethod } = commitSnapshot;
        
        const totalCommission = items.reduce((commissionSum, item) => {
            if (!item.product) return commissionSum;
            const price = item.variant ? (Number(item.variant.price) || 0) : getEffectivePrice(item.product, item.quantity);
            const itemSubtotal = price * (Number(item.quantity) || 0);
            const proportionalDiscount = subtotal > 0 ? (itemSubtotal / subtotal) * numericDiscount : 0;
            const commissionableValue = Math.max(0, itemSubtotal - proportionalDiscount);
            const itemCommission = commissionableValue * ((Number(item.product.commissionPercentage) || 0) / 100);
            return commissionSum + itemCommission;
        }, 0);

        const isBank = paymentMethod === 'Bank Receipt';
        const sale: Sale = {
            id: `sale-${Date.now()}`,
            date: new Date().toISOString(),
            items: items || [],
            customerId: String(customerId),
            userId: String(userId),
            subtotal: Number(subtotal) || 0,
            tax: Number(tax) || 0,
            discount: Number(numericDiscount) || 0,
            total: Number(total) || 0,
            paymentMethod: String(paymentMethod),
            taxRate: Number(numericTaxRate) || 0,
            status: isBank ? 'pending_bank_verification' : 'completed',
            commission: Number(totalCommission) || 0,
            cashReceived: Number(paymentDetails?.cashReceived) || 0,
            change: Number(paymentDetails?.change) || 0,
            bankReceiptNumber: paymentDetails?.bankReceiptNumber,
            bankName: paymentDetails?.bankName,
            bankAccountId: paymentDetails?.bankAccountId
        };

        onProcessSale(sale);
        if (!isBank) setCompletedSale(sale);
        setCheckoutStatus('completed');
        setIsConfirmModalOpen(false);
        setIsBankModalOpen(false);
        resetCounter();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-xl font-sans pb-24">
            <Card title={t('counter.title')} className="flex flex-col relative" headerContent={
                cart.length > 0 && (
                    <button onClick={() => setIsClearConfirmOpen(true)} className="px-md py-xs bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded-lg hover:bg-rose-100">Reset Terminal</button>
                )
            }>
                <div className="flex-grow overflow-y-auto -mx-lg px-lg min-h-[300px]">
                    {validationError && (
                        <div className="mb-6 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 animate-shake">
                            <WarningIcon className="w-5 h-5 text-rose-500 mt-0.5" />
                            <p className="text-xs font-black text-rose-600 uppercase tracking-tight leading-relaxed">{validationError}</p>
                        </div>
                    )}

                    {cart.length === 0 ? (
                        <div className="text-center py-xxl flex flex-col items-center justify-center opacity-40">
                            <div className="bg-slate-50 p-xl rounded-full mb-lg"><CartIcon className="h-16 w-16 text-slate-300" /></div>
                            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Digital Basket Empty</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {cart.map((item, idx) => {
                                const price = item.variant ? (Number(item.variant.price) || 0) : getEffectivePrice(item.product, item.quantity);
                                return (
                                <li key={`${item.product.id}-${idx}`} className="py-md flex items-center group">
                                    <div className="relative">
                                        <img src={String(item.product.imageUrl)} className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-slate-100" />
                                        {item.variant && <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] font-bold px-sm py-xs rounded-lg uppercase">Variant</div>}
                                    </div>
                                    <div className="ml-lg flex-grow">
                                        <p className="font-bold text-slate-900 uppercase tracking-tighter text-sm line-clamp-1">{String(item.product.name)}</p>
                                        <div className="flex items-center gap-sm mt-sm">
                                            <span className="text-xs font-bold text-slate-900">{cs}{price.toFixed(2)}</span>
                                            {item.product.tieredPricing && item.product.tieredPricing.length > 0 && Number(item.quantity) >= Math.min(...item.product.tieredPricing.map(tp => tp.quantity)) && (
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Bulk Rate Active</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center bg-slate-50 dark:bg-gray-900 rounded-2xl p-xs gap-xs border border-slate-100 dark:border-gray-700">
                                        <button onClick={() => onUpdateCartItem(item.product, item.variant, item.quantity - 1)} className="w-10 h-10 rounded-xl text-lg font-bold text-slate-400 hover:text-primary transition-colors">-</button>
                                        <input 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={(e) => onUpdateCartItem(item.product, item.variant, parseInt(e.target.value) || 0)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-12 h-10 text-center font-black text-slate-900 dark:text-white text-sm bg-white dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary/20 rounded-lg tabular-nums outline-none"
                                        />
                                        <button onClick={() => onUpdateCartItem(item.product, item.variant, item.quantity + 1)} className="w-10 h-10 rounded-xl text-lg font-bold text-slate-400 hover:text-primary transition-colors">+</button>
                                    </div>
                                </li>
                            )})}
                        </ul>
                    )}
                </div>
                {cart.length > 0 && (
                    <div className="mt-xl border-t border-slate-100 pt-lg space-y-xl">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                            <div className="space-y-md">
                                <div className={`p-lg bg-slate-50 rounded-2xl border border-slate-100 ${!canApplyDiscount ? 'opacity-40 grayscale' : ''}`}>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-sm block px-xs">Applied Discount ({cs})</label>
                                    <input type="number" disabled={!canApplyDiscount} value={discount} onChange={(e) => setDiscount(e.target.value)} onFocus={(e) => e.target.select()} className="w-full bg-white border-2 border-transparent focus:border-primary rounded-xl px-lg py-md text-sm font-bold text-slate-900 outline-none" />
                                    {!canApplyDiscount && <p className="text-[8px] font-black text-rose-400 uppercase mt-2">Discount protocol locked</p>}
                                </div>
                                <div className="p-lg bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-sm block px-xs">Tax Rate (%)</label>
                                    <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} onFocus={(e) => e.target.select()} className="w-full bg-white border-2 border-transparent focus:border-primary rounded-xl px-lg py-md text-sm font-bold text-slate-900 outline-none" />
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-[2.5rem] p-xl text-white shadow-2xl flex flex-col justify-between">
                                <div className="space-y-sm">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400"><span>Subtotal</span><span>{cs}{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-rose-400"><span>Discount</span><span>-{cs}{numericDiscount.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-blue-400"><span>Tax</span><span>+{cs}{tax.toFixed(2)}</span></div>
                                </div>
                                <div className="mt-xl pt-lg border-t border-white/10 flex justify-between items-end"><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total</span><span className="text-4xl font-bold tracking-tighter tabular-nums">{cs}{total.toFixed(2)}</span></div>
                            </div>
                        </div>
                        <div className="space-y-md">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                                <button onClick={() => setIsCustomerSelectModalOpen(true)} className="w-full p-lg border-2 rounded-2xl bg-white text-slate-900 text-left font-bold uppercase text-[10px] tracking-widest border-slate-100 hover:border-slate-300 truncate">{selectedCustomer ? selectedCustomer.name : 'Choose Identity'}</button>
                                <button onClick={() => setIsUserSelectModalOpen(true)} className="w-full p-lg border-2 rounded-2xl bg-white text-slate-900 text-left font-bold uppercase text-[10px] tracking-widest border-slate-100 hover:border-slate-300 truncate">{selectedUser ? selectedUser.name : 'Select Staff'}</button>
                                <button onClick={() => setIsPaymentMethodSelectModalOpen(true)} className="w-full p-lg border-2 rounded-2xl bg-white text-slate-900 text-left font-bold uppercase text-[10px] tracking-widest border-slate-100 hover:border-slate-300 truncate">{paymentMethod ? paymentMethod : 'Method'}</button>
                            </div>
                            <button onClick={handleCheckout} className="btn-base btn-primary w-full py-5 text-sm" disabled={checkoutStatus === 'processing' || !canCreateSale}>
                                {checkoutStatus === 'processing' ? 'Processing...' : 'Commit Protocol Sale'}
                            </button>
                        </div>
                    </div>
                )}
            </Card>

            <PaymentConfirmationModal isOpen={isConfirmModalOpen} onClose={() => { setIsConfirmModalOpen(false); setCheckoutStatus('idle'); }} onConfirm={handleConfirmSale} total={commitSnapshot?.total || total} paymentMethod={commitSnapshot?.paymentMethod || paymentMethod} receiptSettings={receiptSettings} />
            <BankDetailsModal isOpen={isBankModalOpen} onClose={() => { setIsBankModalOpen(false); setCheckoutStatus('idle'); }} onConfirm={handleConfirmSale} total={commitSnapshot?.total || total} currencySymbol={cs} bankAccounts={bankAccounts} />
            
            {completedSale && <ReceiptModal sale={completedSale} customers={customers} users={users} onClose={() => setCompletedSale(null)} receiptSettings={receiptSettings} onDelete={() => {}} currentUser={currentUser} t={t} isTrialExpired={isTrialExpired} printerSettings={printerSettings} />}
            <CustomerSelectionModal isOpen={isCustomerSelectModalOpen} onClose={() => setIsCustomerSelectModalOpen(false)} customers={customers} onSelect={(id) => { setSelectedCustomerId(id); setIsCustomerSelectModalOpen(false); }} onAddNew={() => { setIsCustomerSelectModalOpen(false); }} />
            <UserSelectionModal isOpen={isUserSelectModalOpen} onClose={() => setIsUserSelectModalOpen(false)} users={users} onSelect={(id) => { setSelectedUserId(id); setIsUserSelectModalOpen(false); }} />
            <PaymentMethodSelectionModal isOpen={isPaymentMethodSelectModalOpen} onClose={() => setIsPaymentMethodSelectModalOpen(false)} paymentMethods={businessSettings.paymentMethods || []} onSelect={(method) => { setPaymentMethod(method); setIsPaymentMethodSelectModalOpen(false); }} />
            <ConfirmationModal isOpen={isClearConfirmOpen} onClose={() => setIsClearConfirmOpen(false)} onConfirm={() => { resetCounter(); setIsClearConfirmOpen(false); }} title="Reset Terminal" message="Abort transaction and clear basket protocol?" />
        </div>
    );
};

const Counter: React.FC<CounterProps> = (props) => (
    <TerminalErrorBoundary onResetCheckout={props.onClearCart}><CounterContent {...props} /></TerminalErrorBoundary>
);

export default Counter;
