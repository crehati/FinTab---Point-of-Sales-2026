
import React, { useState, useMemo, useEffect } from 'react';
import type { Product, CartItem, ReceiptSettingsData } from '../types';
import { formatCurrency } from '../lib/utils';
import ModalShell from './ModalShell';

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

const QuantityModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    cart: CartItem[];
    onConfirm: (product: Product, quantity: number) => void;
    receiptSettings: ReceiptSettingsData;
}> = ({ isOpen, onClose, product, cart, onConfirm, receiptSettings }) => {
    
    const initialQuantity = useMemo(() => {
        if (!product) return 1;
        const existingItem = cart.find(item => item.product.id === product.id && !item.variant);
        return existingItem ? existingItem.quantity : 1;
    }, [product, cart]);

    const [quantity, setQuantity] = useState<string | number>(initialQuantity);

    useEffect(() => {
        if (isOpen) {
            setQuantity(initialQuantity);
        }
    }, [isOpen, initialQuantity]);

    const handleIncrement = () => setQuantity(q => Math.min(product?.stock || 0, (Number(q) || 0) + 1));
    const handleDecrement = () => setQuantity(q => Math.max(1, (Number(q) || 1) - 1));
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '' || /^[0-9]+$/.test(val)) {
            setQuantity(val);
        }
    };

    const handleBlur = () => {
        if (!product) return;
        const num = parseInt(String(quantity)) || 1;
        setQuantity(Math.max(1, Math.min(product.stock, num)));
    };

    const handleConfirmClick = () => {
        if (product) onConfirm(product, Number(quantity) || 1);
    };

    const effectiveUnitPrice = useMemo(() => {
        if (!product) return 0;
        return getEffectivePrice(product, Number(quantity) || 0);
    }, [product, quantity]);

    const isBulkApplied = useMemo(() => {
        if (!product) return false;
        return effectiveUnitPrice !== Number(product.price);
    }, [product, effectiveUnitPrice]);

    const footer = (
        <button onClick={handleConfirmClick} className="btn-base btn-primary w-full py-5 text-sm">
            Synchronize to Cart
        </button>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title={product?.name || 'Set Quantity'} 
            description="Terminal Inventory Adjustment"
            maxWidth="max-w-sm"
            footer={footer}
        >
            <div className="text-center py-4">
                <div className="mb-8">
                    <p className={`text-4xl font-black tabular-nums transition-colors ${isBulkApplied ? 'text-emerald-500' : 'text-primary'}`}>
                        {formatCurrency(effectiveUnitPrice, receiptSettings.currencySymbol)}
                    </p>
                    {isBulkApplied && (
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1 animate-pulse">Bulk Rate Protocol Active</p>
                    )}
                </div>
                <div className="flex items-center justify-center gap-4">
                    <button 
                        onClick={handleDecrement} 
                        className="w-16 h-16 rounded-3xl border-2 border-slate-100 text-3xl font-black text-slate-400 hover:bg-slate-50 transition-all active:scale-90"
                        disabled={Number(quantity) <= 1}
                    >
                        -
                    </button>
                    <input
                        id="quantity-input"
                        type="number"
                        value={quantity}
                        onBlur={handleBlur}
                        onChange={handleInputChange}
                        onFocus={(e) => e.target.select()}
                        className="w-24 h-16 text-center text-3xl font-black bg-slate-50 dark:bg-gray-900 border-none rounded-3xl focus:ring-4 focus:ring-primary/10 outline-none tabular-nums"
                        min="1"
                    />
                    <button 
                        onClick={handleIncrement} 
                        className="w-16 h-16 rounded-3xl border-2 border-slate-100 text-3xl font-black text-slate-400 hover:bg-slate-50 transition-all active:scale-90"
                        disabled={product ? Number(quantity) >= product.stock : false}
                    >
                        +
                    </button>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8">
                    Verified Stock: <span className="text-slate-900 dark:text-white">{product?.stock || 0} Units</span>
                </p>
            </div>
        </ModalShell>
    );
};

export default QuantityModal;
