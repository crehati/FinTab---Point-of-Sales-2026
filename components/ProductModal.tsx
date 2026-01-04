
// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Product, ReceiptSettingsData, ProductVariant } from '../types';
import { formatCurrency } from '../lib/utils';
import ModalShell from './ModalShell';
import { DeleteIcon, PlusIcon } from '../constants';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: Product, isEditing: boolean) => void;
    product: Product | null;
    t: (key: string) => string;
    categories: string[];
    receiptSettings: ReceiptSettingsData;
}

const getInitialFormData = (): Product => ({
    id: '',
    sku: '',
    name: '',
    description: '',
    category: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    imageUrl: '',
    commissionPercentage: 0,
    tieredPricing: [],
    stockHistory: [],
    productType: 'simple',
    variantOptions: [{ name: '', values: [] }],
    variants: [],
});

const ADD_NEW_CATEGORY_VALUE = '__ADD_NEW__';

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, categories, receiptSettings, t }) => {
    const [formData, setFormData] = useState<Product>(getInitialFormData());
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCategoryValue, setNewCategoryValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const cs = receiptSettings.currencySymbol;

    const liveProfit = useMemo(() => {
        return (formData.price || 0) - (formData.costPrice || 0);
    }, [formData.price, formData.costPrice]);

    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            if (product) {
                const productCategoryExists = categories.includes(product.category);
                setFormData({
                    ...getInitialFormData(),
                    ...product,
                    productType: product.productType || 'simple',
                    variantOptions: product.variantOptions && product.variantOptions.length > 0 ? product.variantOptions : [{ name: '', values: [] }],
                    variants: product.variants || [],
                    tieredPricing: product.tieredPricing || [],
                    stockHistory: product.stockHistory || [],
                });
                setImagePreview(product.imageUrl);
                if (!productCategoryExists && product.category) {
                    setIsAddingNewCategory(true);
                    setNewCategoryValue(product.category);
                } else {
                    setIsAddingNewCategory(false);
                    setNewCategoryValue('');
                }
            } else {
                setFormData(getInitialFormData());
                setImagePreview(null);
                setIsAddingNewCategory(false);
                setNewCategoryValue('');
            }
        }
    }, [product, isOpen, categories]);

    const handleProductTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const type = e.target.value as 'simple' | 'variable';
        setFormData(prev => ({ ...prev, productType: type }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'category' && e.target instanceof HTMLSelectElement) {
            if (value === ADD_NEW_CATEGORY_VALUE) {
                setIsAddingNewCategory(true);
                setFormData(prev => ({ ...prev, category: '' }));
            } else {
                setIsAddingNewCategory(false);
                setFormData(prev => ({ ...prev, category: value }));
            }
        } else {
            const isNumeric = ['price', 'costPrice', 'stock', 'commissionPercentage'].includes(name);
            setFormData(prev => ({
                ...prev,
                [name]: isNumeric ? parseFloat(value) || 0 : value
            }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setFormData(prev => ({ ...prev, imageUrl: result }));
                setImagePreview(result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAddOption = () => {
        setFormData(prev => ({ ...prev, variantOptions: [...(prev.variantOptions || []), { name: '', values: [] }] }));
    };

    const handleRemoveOption = (index: number) => {
        setFormData(prev => ({ ...prev, variantOptions: prev.variantOptions?.filter((_, i) => i !== index) }));
    };

    const handleOptionNameChange = (index: number, name: string) => {
        const newOptions = [...(formData.variantOptions || [])];
        newOptions[index].name = name;
        setFormData(prev => ({ ...prev, variantOptions: newOptions }));
    };

    const handleOptionValuesChange = (index: number, valuesStr: string) => {
        const newOptions = [...(formData.variantOptions || [])];
        newOptions[index].values = valuesStr.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, variantOptions: newOptions }));
    };

    const cartesian = (...a: string[][]): string[][] => a.reduce((acc: string[][], val: string[]) => acc.flatMap((d: string[]) => val.map((e: string) => [...d, e])), [[]]);

    const generateVariants = () => {
        if (!formData.variantOptions || formData.variantOptions.some(opt => opt.values.length === 0 || !opt.name.trim())) {
            alert("Please ensure all options have a name and at least one value before generating variants.");
            return;
        }

        const optionValuesArrays = formData.variantOptions.map(opt => opt.values).filter(arr => arr.length > 0);
        if (optionValuesArrays.length === 0) {
            setFormData(prev => ({ ...prev, variants: [] }));
            return;
        }

        const combinations = cartesian(...optionValuesArrays);

        const newVariants: ProductVariant[] = combinations.map((combo: string[]) => {
            const attributes = combo.map((value: string, index: number) => ({
                name: formData.variantOptions![index].name,
                value,
            }));
            
            const variantName = attributes.map(a => a.value).join('-');
            const id = `${formData.id || 'new'}-${variantName.toLowerCase().replace(/\s+/g, '-')}`;
            const existingVariant = formData.variants?.find(v => v.id === id);

            return {
                id,
                attributes,
                price: existingVariant?.price ?? formData.price ?? 0,
                costPrice: existingVariant?.costPrice ?? formData.costPrice ?? 0,
                stock: existingVariant?.stock ?? 0,
                sku: existingVariant?.sku ?? '',
            };
        });

        setFormData(prev => ({ ...prev, variants: newVariants }));
    };

    const handleVariantChange = (index: number, field: keyof ProductVariant, value: string) => {
        const newVariants = [...(formData.variants || [])];
        const isNumeric = ['price', 'costPrice', 'stock'].includes(field);
        (newVariants[index] as any)[field] = isNumeric ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };

    const handleTierChange = (index: number, field: 'quantity' | 'price', value: string) => {
        const newTiers = [...(formData.tieredPricing || [])];
        newTiers[index] = { ...newTiers[index], [field]: parseFloat(value) || 0 };
        setFormData(prev => ({ ...prev, tieredPricing: newTiers }));
    };

    const addTier = () => {
        const newTiers = [...(formData.tieredPricing || []), { quantity: 10, price: 0 }];
        setFormData(prev => ({ ...prev, tieredPricing: newTiers }));
    };

    const removeTier = (index: number) => {
        const newTiers = [...(formData.tieredPricing || [])];
        newTiers.splice(index, 1);
        setFormData(prev => ({ ...prev, tieredPricing: newTiers }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalCategory = isAddingNewCategory ? newCategoryValue.trim() : formData.category;
        if (!finalCategory) { alert("Protocol Error: Category identification mandatory."); return; }

        setIsSaving(true);
        let finalProductData = { ...formData, category: finalCategory };

        if (finalProductData.productType === 'variable') {
            if (!finalProductData.variants || finalProductData.variants.length === 0) {
                alert("Please generate variants before saving.");
                setIsSaving(false);
                return;
            }
            finalProductData.stock = finalProductData.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
            finalProductData.price = finalProductData.variants[0]?.price || 0;
            finalProductData.costPrice = finalProductData.variants[0]?.costPrice || 0;
        } else {
            finalProductData.productType = 'simple';
            finalProductData.variantOptions = [];
            finalProductData.variants = [];
        }
        
        try { await onSave(finalProductData, !!product); } finally { setIsSaving(false); }
    };

    const footer = (
        <>
            <button type="button" onClick={handleSubmit} className="btn-base btn-primary w-full sm:w-auto px-10 py-4" disabled={isSaving}>
                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>}
                {product ? 'Authorize Update' : 'Initialize Protocol'}
            </button>
            <button type="button" onClick={onClose} className="btn-base btn-secondary w-full sm:w-auto px-10 py-4" disabled={isSaving}>Abort</button>
        </>
    );

    const inputClasses = "w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-3.5 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none";

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title={product ? 'Edit Asset Identity' : 'Enroll New Asset'} 
            description="Inventory Control Protocol"
            maxWidth="max-w-4xl"
            footer={footer}
        >
            <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-1 space-y-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 block">Product Asset</label>
                        <div className="aspect-square w-full bg-slate-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center relative overflow-hidden group shadow-inner">
                            {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">No Asset</span>}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Update Image</button>
                            </div>
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="sku" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Product ID / SKU</label>
                                <input type="text" name="sku" id="sku" value={formData.sku || ''} onChange={handleChange} className={inputClasses} placeholder="e.g. PRD-001" disabled={isSaving} />
                            </div>
                            <div>
                                <label htmlFor="name" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Unit Descriptor</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputClasses} placeholder="e.g. Premium Item X" disabled={isSaving} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="category" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Protocol Class</label>
                                <select name="category" id="category" value={isAddingNewCategory ? ADD_NEW_CATEGORY_VALUE : formData.category} onChange={handleChange} required={!isAddingNewCategory} className={inputClasses} disabled={isSaving}>
                                    <option value="" disabled>Select Class...</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    <option value={ADD_NEW_CATEGORY_VALUE} className="font-black text-primary">+ Enroll New Category</option>
                                </select>
                            </div>
                            {isAddingNewCategory && (
                                <div className="animate-fade-in">
                                    <label htmlFor="newCategory" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">New Protocol Identity</label>
                                    <input type="text" id="newCategory" value={newCategoryValue} onChange={(e) => setNewCategoryValue(e.target.value)} required className={inputClasses} placeholder="Identity name..." disabled={isSaving} />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Workflow Protocol</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.productType === 'simple' ? 'bg-primary/5 border-primary text-primary shadow-inner' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-400'}`}>
                                    <input type="radio" value="simple" name="productType" checked={formData.productType === 'simple' || !formData.productType} onChange={handleProductTypeChange} className="sr-only" disabled={isSaving} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Static Unit</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.productType === 'variable' ? 'bg-primary/5 border-primary text-primary shadow-inner' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-400'}`}>
                                    <input type="radio" value="variable" name="productType" checked={formData.productType === 'variable'} onChange={handleProductTypeChange} className="sr-only" disabled={isSaving} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Dynamic Variant</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {formData.productType === 'variable' ? (
                    <div className="space-y-10 animate-fade-in">
                        <div className="p-8 bg-slate-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-slate-100 dark:border-gray-800">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-1">Variant Configuration</h4>
                            <div className="space-y-4">
                                {formData.variantOptions?.map((option, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                        <input type="text" placeholder="Attribute (e.g. Size)" value={option.name} onChange={(e) => handleOptionNameChange(index, e.target.value)} className="w-full bg-white dark:bg-gray-900 border-none rounded-xl p-3 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none" disabled={isSaving} />
                                        <input type="text" placeholder="Values (S, M, L)" value={option.values.join(', ')} onChange={(e) => handleOptionValuesChange(index, e.target.value)} className="md:col-span-2 w-full bg-white dark:bg-gray-900 border-none rounded-xl p-3 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none" disabled={isSaving} />
                                        <button type="button" onClick={() => handleRemoveOption(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl text-center transition-colors" disabled={isSaving}>&times;</button>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddOption} className="mt-4 text-[9px] font-black uppercase tracking-widest text-primary hover:underline" disabled={isSaving}>+ Enroll Attribute</button>
                            </div>
                            <button type="button" onClick={generateVariants} className="mt-8 w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-[0.98] transition-all" disabled={isSaving}>Synchronize Variant Grid</button>
                        </div>

                        {formData.variants && formData.variants.length > 0 && (
                            <div className="animate-fade-in space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-1">Variant Matrix ({formData.variants.length} nodes)</h4>
                                <div className="border dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-gray-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <tr>
                                                <th className="p-5">Permutation</th>
                                                <th className="p-5 text-right">Value ({cs})</th>
                                                <th className="p-5 text-right">Inventory</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                            {formData.variants.map((variant, index) => (
                                                <tr key={variant.id} className="bg-white dark:bg-gray-950">
                                                    <td className="p-5 font-bold text-slate-900 dark:text-white uppercase text-xs">{variant.attributes.map(attr => attr.value).join(' / ')}</td>
                                                    <td className="p-5">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-[9px] text-slate-400 font-bold">{cs}</div>
                                                            <input type="number" value={variant.price} onChange={e => handleVariantChange(index, 'price', e.target.value)} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-xl p-2.5 pl-6 text-right font-black tabular-nums" step="0.01" disabled={isSaving} />
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <input type="number" value={variant.stock} onChange={e => handleVariantChange(index, 'stock', e.target.value)} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-xl p-2.5 text-right font-black tabular-nums" step="1" disabled={isSaving} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-10 animate-fade-in">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label htmlFor="price" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 block">Market Value ({cs})</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-black text-lg">{cs}</div>
                                    <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl py-5 pl-12 pr-6 text-2xl font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums" placeholder="0.00" disabled={isSaving} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label htmlFor="costPrice" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 block">Unit Acq Cost ({cs})</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-black text-lg">{cs}</div>
                                    <input type="number" name="costPrice" id="costPrice" value={formData.costPrice} onChange={handleChange} required min="0" step="0.01" className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl py-5 pl-12 pr-6 text-2xl font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums" placeholder="0.00" disabled={isSaving} />
                                </div>
                            </div>
                        </div>
                        <div className={`p-10 rounded-[3rem] text-center transition-all shadow-inner border ${liveProfit >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30'}`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">Protocol Margin Yield</p>
                            <p className="text-6xl font-black tabular-nums tracking-tighter">
                                {formatCurrency(liveProfit, cs)}
                            </p>
                        </div>
                        
                        <div className="space-y-6 pt-10 border-t dark:border-gray-800">
                            <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Bulk Pricing Protocols</h4>
                                <button type="button" onClick={addTier} className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-widest hover:underline">
                                    <PlusIcon className="w-3 h-3" /> Enroll Tier
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {formData.tieredPricing?.map((tier, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-gray-800 p-5 rounded-[2rem] animate-fade-in border border-slate-100 dark:border-gray-700">
                                        <div className="flex-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Quantity Threshold</label>
                                            <input 
                                                type="number" 
                                                value={tier.quantity} 
                                                onChange={e => handleTierChange(idx, 'quantity', e.target.value)} 
                                                className="w-full bg-white dark:bg-gray-900 border-none rounded-xl p-3 text-xs font-bold outline-none tabular-nums" 
                                                placeholder="e.g. 10" 
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-1">Unit Price ({cs})</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[10px] text-slate-400 font-bold">{cs}</div>
                                                <input 
                                                    type="number" 
                                                    value={tier.price} 
                                                    onChange={e => handleTierChange(idx, 'price', e.target.value)} 
                                                    className="w-full bg-white dark:bg-gray-900 border-none rounded-xl p-3 pl-7 text-xs font-bold outline-none tabular-nums" 
                                                    placeholder="0.00" 
                                                />
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeTier(idx)} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all mt-4">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {formData.tieredPricing?.length === 0 && (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-[2.5rem]">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No bulk rates configured</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default ProductModal;
