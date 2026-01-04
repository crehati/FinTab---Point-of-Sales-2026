
// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Product, ReceiptSettingsData, User, StockAdjustment } from '../types';
import Card from './Card';
import ProductModal from './ProductModal';
import ConfirmationModal from './ConfirmationModal';
import CategoryModal from './CategoryModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import StockHistoryModal from './StockHistoryModal';
import LabelPrintModal from './LabelPrintModal';
import EmptyState from './EmptyState';
import SearchInput from './SearchInput';
import { PlusIcon, MoreVertIcon, BarcodeIcon, InventoryIcon } from '../constants';
import { formatCurrency } from '../lib/utils';

interface InventoryProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    onSaveStockAdjustment: (productId: string, adjustment: Omit<StockAdjustment, 'date' | 'userId' | 'newStockLevel'>) => void;
    handleSaveProduct: (product: Product, isEditing: boolean) => void;
    currentUser: User;
    users: User[];
    trialLimits?: { canAddProduct: boolean };
}

const Inventory: React.FC<InventoryProps> = ({ 
    products, setProducts, t, receiptSettings, onSaveStockAdjustment, handleSaveProduct, currentUser, users, 
    trialLimits = { canAddProduct: true } 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [labelProduct, setLabelProduct] = useState<Product | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    const baseInputStyle = "block w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl shadow-sm text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all";

    useEffect(() => {
        const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories.sort());
    }, [products]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
        };
        if (openActionMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openActionMenuId]);

    const handleAddCategory = (newCategory: string) => {
        const trimmedCategory = newCategory.trim();
        if (trimmedCategory && !categories.includes(trimmedCategory)) {
            setCategories(prev => [...prev, trimmedCategory].sort());
        }
    };

    const filteredProducts = useMemo(() => {
        return products
            .filter(product => {
                if (selectedCategory === 'all') return true;
                return product.category === selectedCategory;
            })
            .filter(product => {
                if (!searchTerm.trim()) return true;
                const lower = searchTerm.toLowerCase();
                return product.name.toLowerCase().includes(lower) || (product.sku && product.sku.toLowerCase().includes(lower));
            });
    }, [products, searchTerm, selectedCategory]);

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleOpenAdjustModal = (product: Product) => {
        setAdjustingProduct(product);
        setIsAdjustModalOpen(true);
    };

    const handleOpenHistoryModal = (product: Product) => {
        setHistoryProduct(product);
    };

    const handleDeleteProduct = (product: Product) => {
        setProductToDelete(product);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (productToDelete) {
            setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
            setProductToDelete(null);
        }
        setIsConfirmModalOpen(false);
    };

    const onSave = (productData: Product, isEditing: boolean) => {
        handleSaveProduct(productData, isEditing);
        handleAddCategory(productData.category);
        setIsModalOpen(false);
        setEditingProduct(null);
    };
    
    const handleSaveAdjustment = (adjustment: { type: 'add' | 'remove'; quantity: number; reason: string }) => {
        if (!adjustingProduct || !currentUser) return;
        onSaveStockAdjustment(adjustingProduct.id, adjustment);
        setIsAdjustModalOpen(false);
        setAdjustingProduct(null);
    };

    const getStatusBadge = (product: Product) => {
        if (product.stock > 10) return <span className="status-badge status-approved">In Stock</span>;
        if (product.stock > 0) return <span className="status-badge status-pending">Low Stock</span>;
        return <span className="status-badge status-rejected">Out of Stock</span>;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Inventory</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Digital Asset Ledger & Quantum Registry</p>
                    </div>
                    
                    <div className="w-full md:w-auto bg-slate-50 dark:bg-gray-800 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700 shadow-inner">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="min-w-[280px]">
                                    <SearchInput
                                        placeholder="Search inventory..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                     <select
                                        value={selectedCategory}
                                        onChange={e => setSelectedCategory(e.target.value)}
                                        className={baseInputStyle}
                                    >
                                        <option value="all">All Classes</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button onClick={() => setIsCategoryModalOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                    Manage Protocol Classes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-[500px]">
                     {filteredProducts.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[700px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Digital Identity</th>
                                                <th scope="col">Classification</th>
                                                <th scope="col" className="text-right">Market Value</th>
                                                <th scope="col" className="text-right">Quantum</th>
                                                <th scope="col" className="text-center">Status</th>
                                                <th scope="col" className="text-right">Protocol</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredProducts.map(product => (
                                                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
                                                        <div className="flex items-center">
                                                            <img src={product.imageUrl} alt={product.name} className="w-11 h-11 rounded-xl mr-5 object-cover border-2 border-slate-50 dark:border-gray-700 shadow-sm" />
                                                            <div>
                                                                <span className="block truncate max-w-[240px] text-sm">{product.name}</span>
                                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{product.sku || 'SKU-PENDING'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-widest">{product.category}</td>
                                                    <td className="table-num text-slate-900 dark:text-white">
                                                        <div className="text-base font-black">
                                                            {formatCurrency(product.price, receiptSettings.currencySymbol)}
                                                            {product.tieredPricing && product.tieredPricing.length > 0 && (
                                                                <span className="block text-[7px] text-emerald-500 font-black uppercase tracking-[0.2em] mt-1">Bulk Active</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="table-num text-primary font-black text-base">{product.stock}</td>
                                                    <td className="text-center">{getStatusBadge(product)}</td>
                                                    <td className="text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-3">
                                                            <button onClick={() => handleOpenHistoryModal(product)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Audit</button>
                                                            <button onClick={() => handleOpenAdjustModal(product)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Shift</button>
                                                            <button onClick={() => handleOpenEditModal(product)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Edit</button>
                                                            <button onClick={() => setLabelProduct(product)} title="Print Label" className="text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                                <BarcodeIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="md:hidden space-y-4">
                                {filteredProducts.map(product => (
                                    <div key={product.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700 flex gap-5 relative overflow-visible">
                                        <img src={product.imageUrl} alt={product.name} className="w-24 h-24 rounded-[2rem] object-cover flex-shrink-0 border-4 border-slate-50 dark:border-gray-700 shadow-md" />
                                        <div className="flex-grow flex flex-col justify-between py-1 min-w-0">
                                            <div className="pr-10">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base truncate">{product.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {product.category} &bull; <span className="text-primary font-black">{product.sku || 'N/A'}</span>
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-end mt-4">
                                                <div>
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{formatCurrency(product.price, receiptSettings.currencySymbol)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Quantum: <span className="text-primary font-black">{product.stock}</span></p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {getStatusBadge(product)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-6 right-6">
                                            <div className="relative" ref={openActionMenuId === product.id ? actionMenuRef : null}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenActionMenuId(openActionMenuId === product.id ? null : product.id);
                                                    }}
                                                    className={`p-3 rounded-2xl transition-all ${openActionMenuId === product.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                                                >
                                                    <MoreVertIcon className="w-4 h-4" />
                                                </button>
                                                {openActionMenuId === product.id && (
                                                    <div className="absolute right-0 mt-3 w-52 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-gray-700 z-[100] py-4 overflow-hidden animate-scale-in origin-top-right">
                                                        <button onClick={() => { handleOpenHistoryModal(product); setOpenActionMenuId(null); }} className="w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">Audit Ledger</button>
                                                        <button onClick={() => { handleOpenAdjustModal(product); setOpenActionMenuId(null); }} className="w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-colors">Shift Units</button>
                                                        <button onClick={() => { handleOpenEditModal(product); setOpenActionMenuId(null); }} className="w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-colors">Edit Identity</button>
                                                        <button onClick={() => { setLabelProduct(product); setOpenActionMenuId(null); }} className="w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">Print Asset Label</button>
                                                        <div className="my-3 border-t dark:border-gray-800"></div>
                                                        <button onClick={() => { handleDeleteProduct(product); setOpenActionMenuId(null); }} className="w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">Purge Node</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<InventoryIcon />} 
                            title={searchTerm ? "Zero inventory matches" : "No inventory recorded"} 
                            description={searchTerm ? `Try adjusting the protocol identity search or clearing filters.` : "Initialize your digital inventory by enrolling the first unit into the terminal registry."}
                            action={searchTerm ? undefined : { label: "Enroll First Unit", onClick: handleOpenAddModal }}
                        />
                    )}
                </div>
            </div>

            <button
                onClick={handleOpenAddModal}
                disabled={!trialLimits.canAddProduct}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] disabled:bg-slate-300 flex items-center justify-center group"
                aria-label="Add new product"
            >
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll New Asset</span>
            </button>
            
            <ProductModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onSave}
                product={editingProduct}
                t={t}
                categories={categories}
                receiptSettings={receiptSettings}
            />

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Purge Asset Protocol"
                message={`Permanently purge "${productToDelete?.name}" from the digital inventory grid? This action is absolute and will wipe all associated audit history.`}
                variant="danger"
                isIrreversible={true}
                confirmLabel="Authorize Purge"
            />
            
             <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                categories={categories}
                onAddCategory={handleAddCategory}
            />
            
            <StockAdjustmentModal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                onSave={handleSaveAdjustment}
                product={adjustingProduct}
            />
             {historyProduct && (
                <StockHistoryModal
                    isOpen={!!historyProduct}
                    onClose={() => setHistoryProduct(null)}
                    product={historyProduct}
                    users={users}
                />
            )}
            <LabelPrintModal
                isOpen={!!labelProduct}
                onClose={() => setLabelProduct(null)}
                product={labelProduct}
                receiptSettings={receiptSettings}
            />
        </div>
    );
};

export default Inventory;
