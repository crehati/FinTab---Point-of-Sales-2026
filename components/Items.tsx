import React, { useState, useMemo, useEffect } from 'react';
import type { Product, ReceiptSettingsData, CartItem, ProductVariant } from '../types';
import { formatCurrency } from '../lib/utils';
import { ChevronDownIcon, InventoryIcon, StorefrontIcon } from '../constants';
import VariantSelectionModal from './VariantSelectionModal';
import QuantityModal from './QuantityModal';
import SearchInput from './SearchInput';

interface ItemsProps {
    products: Product[];
    cart: CartItem[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    onUpdateCartItem: (product: Product, variant: ProductVariant | undefined, quantity: number) => void;
}

const Items: React.FC<ItemsProps> = ({ products, cart, t, receiptSettings, onUpdateCartItem }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

    const groupedProducts = useMemo(() => {
        return products.reduce((acc, product) => {
            const category = product.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {} as Record<string, Product[]>);
    }, [products]);

    const categoryNames = useMemo(() => Object.keys(groupedProducts).sort(), [groupedProducts]);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };
    
    const anyProductMatches = useMemo(() => 
        products.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm]);

    const handleProductClick = (product: Product) => {
        if (product.stock > 0) {
            setSelectedProductForModal(product);
        }
    };
    
    const handleSetSimpleQuantity = (product: Product, quantity: number) => {
        onUpdateCartItem(product, undefined, quantity);
        setToastMessage(`${quantity} x ${product.name} synchronized to terminal`);
        setTimeout(() => setToastMessage(null), 2500);
        setSelectedProductForModal(null);
    };

    const handleSetVariantQuantity = (product: Product, variant: ProductVariant, quantity: number) => {
        onUpdateCartItem(product, variant, quantity);
        const variantName = variant.attributes.map(a => a.value).join(' / ');
        setToastMessage(`${quantity} x ${product.name} (${variantName}) authorized`);
        setTimeout(() => setToastMessage(null), 2500);
        setSelectedProductForModal(null);
    };

    const isVariableProduct = selectedProductForModal?.productType === 'variable';

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* High-Fidelity Header Block */}
            <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex items-center gap-10">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                            <InventoryIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Internal Assets</h1>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-4">Authorized Global Catalog</p>
                        </div>
                    </div>
                    <div className="w-full md:w-96">
                        <SearchInput
                            placeholder="Asset ID or Identifier Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            containerClassName="!bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10"
                            className="text-white placeholder-slate-500"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-10">
                {categoryNames.map(category => {
                    const productsInCategory = groupedProducts[category];
                    const filteredProductsInCategory = productsInCategory.filter(p =>
                        p.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                    if (filteredProductsInCategory.length === 0) return null;

                    const isCollapsed = collapsedCategories.has(category);

                    return (
                        <div key={category} className="animate-fade-in">
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full flex justify-between items-center p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 group hover:shadow-md transition-all active:scale-[0.99]"
                                aria-expanded={!isCollapsed}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-3 h-3 rounded-full transition-colors ${isCollapsed ? 'bg-slate-200' : 'bg-primary shadow-[0_0_12px_rgba(37,99,235,0.5)]'}`}></div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{category}</h2>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-left">{filteredProductsInCategory.length} Units Enrolled</p>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-gray-800 text-slate-400 transition-transform duration-500 ${isCollapsed ? '' : 'rotate-180 bg-primary/10 text-primary'}`}>
                                    <ChevronDownIcon className="w-6 h-6" />
                                </div>
                            </button>

                            {!isCollapsed && (
                                <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 px-2">
                                    {filteredProductsInCategory.map(product => {
                                        const isOutOfStock = product.stock <= 0;
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => handleProductClick(product)}
                                                disabled={isOutOfStock}
                                                className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden text-left transition-all hover:shadow-2xl hover:-translate-y-2 group border border-slate-50 dark:border-gray-800 disabled:opacity-50 disabled:grayscale disabled:transform-none relative"
                                            >
                                                <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-gray-800">
                                                    <img 
                                                        src={product.imageUrl} 
                                                        alt={product.name} 
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    {product.productType === 'variable' && (
                                                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-primary/90 backdrop-blur-md rounded-xl text-white text-[8px] font-black uppercase tracking-widest shadow-lg">Variants</div>
                                                    )}
                                                </div>
                                                <div className="p-6 flex flex-col flex-grow text-center relative">
                                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2 h-8 leading-tight mb-4">
                                                        {product.name}
                                                    </h3>
                                                    <div className="mt-auto space-y-3">
                                                        <div>
                                                            <p className="text-[14px] font-black text-slate-900 dark:text-gray-200 tabular-nums">
                                                                {product.productType === 'variable' && product.variants && product.variants.length > 0
                                                                    ? `${formatCurrency(Math.min(...product.variants.map(v => v.price)), receiptSettings.currencySymbol)} +`
                                                                    : formatCurrency(product.price, receiptSettings.currencySymbol)}
                                                            </p>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Protocol Value</p>
                                                        </div>
                                                        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-colors ${product.stock > 10 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : product.stock > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                            {product.stock > 0 ? `Q: ${product.stock} Units` : 'Stock Null'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {!anyProductMatches && searchTerm && (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-gray-800">
                        <StorefrontIcon className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px]">Zero matches for identification: "{searchTerm}"</p>
                    </div>
                )}
            </div>
            
            {isVariableProduct ? (
                <VariantSelectionModal
                    isOpen={!!selectedProductForModal}
                    onClose={() => setSelectedProductForModal(null)}
                    product={selectedProductForModal}
                    onConfirm={handleSetVariantQuantity}
                    receiptSettings={receiptSettings}
                />
            ) : (
                <QuantityModal
                    isOpen={!!selectedProductForModal}
                    onClose={() => setSelectedProductForModal(null)}
                    product={selectedProductForModal}
                    cart={cart}
                    onConfirm={handleSetSimpleQuantity}
                    receiptSettings={receiptSettings}
                />
            )}

            {toastMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">{toastMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Items;
