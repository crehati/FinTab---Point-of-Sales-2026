
import React, { useState, useEffect, useMemo } from 'react';
import type { Product, ProductVariant, ReceiptSettingsData } from '../types';
import { formatCurrency } from '../lib/utils';
import ModalShell from './ModalShell';

interface VariantSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onConfirm: (product: Product, variant: ProductVariant, quantity: number) => void;
    receiptSettings: ReceiptSettingsData;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({ isOpen, onClose, product, onConfirm, receiptSettings }) => {
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState<string | number>(1);

    useEffect(() => {
        if (isOpen) {
            setSelectedOptions({});
            setQuantity(1);
        }
    }, [isOpen]);

    const handleOptionSelect = (optionName: string, value: string) => {
        setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
    };

    const selectedVariant = useMemo(() => {
        if (!product || !product.variants || product.variantOptions?.length !== Object.keys(selectedOptions).length) {
            return null;
        }
        return product.variants.find(variant => 
            variant.attributes.every(attr => selectedOptions[attr.name] === attr.value)
        );
    }, [product, selectedOptions]);

    const handleConfirmClick = () => {
        if (product && selectedVariant) {
            onConfirm(product, selectedVariant, Number(quantity) || 1);
        }
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '' || /^[0-9]+$/.test(val)) setQuantity(val);
    };
    
    const handleBlur = () => {
        if (!selectedVariant) return;
        const num = parseInt(String(quantity)) || 1;
        setQuantity(Math.max(1, Math.min(selectedVariant.stock, num)));
    };
    
    const footer = (
        <button 
            onClick={handleConfirmClick} 
            className="btn-base btn-primary w-full py-5 text-sm disabled:bg-slate-200 disabled:text-slate-400"
            disabled={!selectedVariant || selectedVariant.stock === 0}
        >
            {!selectedVariant ? 'Select Attributes' : selectedVariant.stock === 0 ? 'Protocol: Stock Null' : 'Synchronize Variant'}
        </button>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title={product?.name || 'Configure Variant'} 
            description="Multi-Attribute Selection Protocol"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-10">
                {product?.variantOptions?.map(option => (
                    <div key={option.name}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block px-1">{option.name}</label>
                        <div className="flex flex-wrap gap-3">
                            {option.values.map(value => (
                                <button
                                    key={value}
                                    onClick={() => handleOptionSelect(option.name, value)}
                                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-2xl border-2 transition-all active:scale-95 ${
                                        selectedOptions[option.name] === value
                                            ? 'bg-primary/5 border-primary text-primary shadow-inner'
                                            : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-500 hover:border-primary/40'
                                    }`}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                
                {selectedVariant && (
                    <div className="pt-8 border-t dark:border-gray-800 animate-fade-in">
                        <div className="flex items-center justify-between mb-8 p-6 bg-slate-50 dark:bg-gray-900 rounded-3xl border border-slate-100 dark:border-gray-800 shadow-inner">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Value</p>
                                <p className="text-3xl font-black text-primary tabular-nums mt-1">{formatCurrency(selectedVariant.price, receiptSettings.currencySymbol)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Availability</p>
                                <p className={`text-xl font-black uppercase tabular-nums mt-1 ${selectedVariant.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {selectedVariant.stock > 0 ? `${selectedVariant.stock} Units` : 'Null'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label htmlFor="quantity-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Quantity</label>
                            <div className="flex items-center justify-center gap-4 bg-slate-50 dark:bg-gray-900 rounded-[2rem] p-4 border border-slate-100 dark:border-gray-800">
                                <button 
                                    onClick={() => setQuantity(q => Math.max(1, (Number(q) || 1) - 1))} 
                                    className="w-14 h-14 rounded-2xl border-2 border-white dark:border-gray-800 text-2xl font-black text-slate-400 hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-90" 
                                    disabled={Number(quantity) <= 1}
                                >
                                    -
                                </button>
                                <input
                                    id="quantity-input"
                                    type="number"
                                    value={quantity}
                                    onChange={handleQuantityChange}
                                    onBlur={handleBlur}
                                    onFocus={(e) => e.target.select()}
                                    className="w-24 h-14 text-center text-2xl font-black bg-transparent border-none outline-none tabular-nums focus:ring-0"
                                    min="1"
                                />
                                <button 
                                    onClick={() => setQuantity(q => Math.min(selectedVariant.stock, (Number(q) || 0) + 1))} 
                                    className="w-14 h-14 rounded-2xl border-2 border-white dark:border-gray-800 text-2xl font-black text-slate-400 hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-90" 
                                    disabled={Number(quantity) >= selectedVariant.stock}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default VariantSelectionModal;
