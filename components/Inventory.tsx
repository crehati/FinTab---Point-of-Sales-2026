
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
import { PlusIcon, MoreVertIcon, BarcodeIcon, InventoryIcon, WarningIcon } from '../constants';
import { formatCurrency } from '../lib/utils';

// Local icon for the Total Value trend
const TrendingUpIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.5 4.5L21.75 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 7.5h3v3" />
    </svg>
);

interface InventoryProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    onSaveStockAdjustment: (productId: string, adjustment: Omit<StockAdjustment, 'date' | 'userId' | 'newStockLevel'>) => void;
    handleSaveProduct: (product: Product, isEditing: boolean) => void;
    onDeleteProduct: (productId: string) => void;
    currentUser: User;
    users: User[];
    trialLimits?: { canAddProduct: boolean };
}

const Inventory: React.FC<InventoryProps> = ({ 
    products = [], t, receiptSettings, onSaveStockAdjustment, handleSaveProduct, onDeleteProduct, currentUser, users, 
    trialLimits = { canAddProduct: true } 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
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
        if (openActionMenuId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openActionMenuId]);

    const inventoryMetrics = useMemo(() => {
        const totalItems = products.length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        return { totalItems, lowStock, totalValue };
    }, [products]);

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

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(start, start + itemsPerPage);
    }, [filteredProducts, currentPage]);

    const handleOpenAddModal = () => { setEditingProduct(null); setIsModalOpen(true); };
    const handleOpenEditModal = (product: Product) => { setEditingProduct(product); setIsModalOpen(true); };
    const handleOpenAdjustModal = (product: Product) => { setAdjustingProduct(product); setIsAdjustModalOpen(true); };
    const handleOpenHistoryModal = (product: Product) => { setHistoryProduct(product); };
    const handleDeleteClick = (product: Product) => { setProductToDelete(product); setIsConfirmModalOpen(true); };

    const handleConfirmDelete = () => {
        if (productToDelete) {
            onDeleteProduct(productToDelete.id);
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
        if (!adjustingProduct) return;
        onSaveStockAdjustment(adjustingProduct.id, adjustment);
        setIsAdjustModalOpen(false);
        setAdjustingProduct(null);
    };

    const getStatusBadge = (product: Product) => {
        if (product.stock > 10) return <span className="status-badge status-approved !text-[8px] !px-3 !py-1">In Stock</span>;
        if (product.stock > 0) return <span className="status-badge status-pending !text-[8px] !px-3 !py-1">Low Stock</span>;
        return <span className="status-badge status-rejected !text-[8px] !px-3 !py-1">Null Quantum</span>;
    };

    return (
        <div className="space-y-6 sm:space-y-12 animate-fade-in pb-24">
            {/* Inventory KPI Summary Grid - Enhanced Typography Responsiveness */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-white/10 flex justify-between items-center group hover:shadow-2xl transition-all">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-4 truncate">Total Registry</p>
                        <p className="text-3xl sm:text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter leading-none">{inventoryMetrics.totalItems}</p>
                    </div>
                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-gray-800 rounded-2xl sm:rounded-3xl text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-inner flex-shrink-0 ml-4">
                        <InventoryIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-white/10 flex justify-between items-center group hover:shadow-2xl transition-all">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-4 truncate">Low Stock Alerts</p>
                        <p className="text-3xl sm:text-4xl lg:text-6xl font-black text-warning tabular-nums tracking-tighter leading-none">{inventoryMetrics.lowStock}</p>
                    </div>
                    <div className="p-4 sm:p-5 bg-warning/10 dark:bg-warning/20 rounded-2xl sm:rounded-3xl text-warning group-hover:bg-warning group-hover:text-white transition-all shadow-inner flex-shrink-0 ml-4">
                        <WarningIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-white/10 flex justify-between items-center group hover:shadow-2xl transition-all">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-4 truncate">Registry Asset Value</p>
                        <p className="text-xl sm:text-2xl lg:text-4xl font-black text-success tabular-nums tracking-tighter leading-none truncate" title={formatCurrency(inventoryMetrics.totalValue, receiptSettings.currencySymbol)}>
                            {formatCurrency(inventoryMetrics.totalValue, receiptSettings.currencySymbol)}
                        </p>
                    </div>
                    <div className="p-4 sm:p-5 bg-success/10 dark:bg-success/20 rounded-2xl sm:rounded-3xl text-success group-hover:bg-success group-hover:text-white transition-all shadow-inner flex-shrink-0 ml-4">
                        <TrendingUpIcon className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl p-6 sm:p-12 border border-slate-50 dark:border-gray-800 overflow-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 sm:mb-12 gap-6 sm:gap-10">
                    <div className="space-y-2 sm:space-y-4">
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Inventory</h2>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] sm:tracking-[0.5em] mt-2 sm:mt-6">Digital Asset Ledger & Quantum Registry</p>
                    </div>
                    
                    <div className="w-full md:w-auto bg-slate-50 dark:bg-gray-800/50 p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="flex-grow sm:min-w-[320px]">
                                <SearchInput
                                    placeholder="Protocol Search: ID or SKU..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="!bg-white dark:!bg-gray-900 shadow-sm"
                                />
                            </div>
                            <div className="relative">
                                    <select
                                    value={selectedCategory}
                                    onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                                    className={`${baseInputStyle} !bg-white dark:!bg-gray-900 min-w-[160px] sm:min-w-[200px] shadow-sm font-black uppercase text-[10px] tracking-widest`}
                                >
                                    <option value="all">Global Classes</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                     <MoreVertIcon className="w-4 h-4 rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-[400px]">
                     {filteredProducts.length > 0 ? (
                        <>
                            {/* Desktop Table - Visible from md upwards for better tablet landscape experience */}
                            <div className="table-wrapper hidden md:block border dark:border-gray-800 rounded-[2.5rem] overflow-hidden">
                                <div className="table-container max-h-[700px]">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                            <tr>
                                                <th className="px-6 py-6 lg:px-8">Digital Identity</th>
                                                <th className="px-6 py-6 lg:px-8 hidden lg:table-cell">Classification</th>
                                                <th className="px-6 py-6 lg:px-8 text-right">Market Value</th>
                                                <th className="px-6 py-6 lg:px-8 text-right">Quantum</th>
                                                <th className="px-6 py-6 lg:px-8 text-center hidden xl:table-cell">Protocol Status</th>
                                                <th className="px-6 py-6 lg:px-8 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-800">
                                            {paginatedProducts.map(product => (
                                                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                                    <td className="px-6 py-6 lg:px-8">
                                                        <div className="flex items-center gap-4 lg:gap-5 min-w-0">
                                                            <img src={product.imageUrl || 'https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=200&h=200&auto=format&fit=crop'} alt={product.name} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-[1.25rem] object-cover border-2 border-slate-50 dark:border-gray-700 shadow-md group-hover:scale-110 transition-transform" />
                                                            <div className="min-w-0">
                                                                <span className="block truncate max-w-[120px] lg:max-w-[280px] font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xs lg:text-sm">{product.name}</span>
                                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 lg:mt-1.5 tabular-nums bg-slate-50 dark:bg-gray-800 px-2 py-0.5 rounded w-fit">{product.sku || 'SKU-PENDING'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 lg:px-8 hidden lg:table-cell">
                                                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-widest bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl">{product.category}</span>
                                                    </td>
                                                    <td className="px-6 py-6 lg:px-8 text-right">
                                                        <div className="text-base lg:text-lg font-black tabular-nums text-slate-900 dark:text-white">
                                                            {formatCurrency(product.price, receiptSettings.currencySymbol)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 lg:px-8 text-right font-black text-primary text-lg lg:text-xl tabular-nums">{product.stock}</td>
                                                    <td className="px-6 py-6 lg:px-8 text-center hidden xl:table-cell">{getStatusBadge(product)}</td>
                                                    <td className="px-6 py-6 lg:px-8 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-3 lg:gap-5">
                                                            <button onClick={() => handleOpenHistoryModal(product)} className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all">Audit</button>
                                                            <button onClick={() => handleOpenAdjustModal(product)} className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all">Shift</button>
                                                            <button onClick={() => handleOpenEditModal(product)} className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:underline transition-all">Edit</button>
                                                            <button onClick={() => handleDeleteClick(product)} className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-rose-500 hover:underline transition-all">Purge</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Mobile/Tablet Card Grid - Optimized Typography and Spacing */}
                            <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {paginatedProducts.map(product => (
                                    <div key={product.id} className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-visible group">
                                        <div className="flex gap-4 items-center">
                                            <div className="relative flex-shrink-0">
                                                <img src={product.imageUrl || 'https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=200&h=200&auto=format&fit=crop'} alt={product.name} className="w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] object-cover border-2 border-slate-50 dark:border-gray-700 shadow-lg" />
                                                <div className="absolute -bottom-1 -right-1 scale-50 sm:scale-75 origin-bottom-right">
                                                    {getStatusBadge(product)}
                                                </div>
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="text-[7px] sm:text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1 truncate">{product.category}</p>
                                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm sm:text-lg leading-tight line-clamp-2 pr-2">{product.name}</h3>
                                                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest tabular-nums mt-1">{product.sku || 'SKU-PENDING'}</p>
                                            </div>
                                            <div className="flex-shrink-0 self-start">
                                                <div className="relative" ref={openActionMenuId === product.id ? actionMenuRef : null}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenActionMenuId(openActionMenuId === product.id ? null : product.id);
                                                        }}
                                                        className={`p-2 rounded-xl transition-all ${openActionMenuId === product.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}
                                                    >
                                                        <MoreVertIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                    {openActionMenuId === product.id && (
                                                        <div className="absolute right-0 mt-2 w-44 bg-slate-900 text-white rounded-2xl shadow-2xl z-[100] p-3 overflow-hidden animate-scale-in origin-top-right border border-white/10">
                                                            <button onClick={() => { handleOpenHistoryModal(product); setOpenActionMenuId(null); }} className="w-full text-left px-4 py-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg transition-all">Audit Ledger</button>
                                                            <button onClick={() => { handleOpenAdjustModal(product); setOpenActionMenuId(null); }} className="w-full text-left px-4 py-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary hover:bg-white/10 rounded-lg transition-all">Shift Quantum</button>
                                                            <button onClick={() => { handleOpenEditModal(product); setOpenActionMenuId(null); }} className="w-full text-left px-4 py-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 rounded-lg transition-all">Modify Node</button>
                                                            <button onClick={() => { handleDeleteClick(product); setOpenActionMenuId(null); }} className="w-full text-left px-4 py-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">Purge Asset</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-slate-100 dark:border-gray-800 min-w-0">
                                                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Value</p>
                                                <p className="text-sm sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter truncate" title={formatCurrency(product.price, receiptSettings.currencySymbol)}>{formatCurrency(product.price, receiptSettings.currencySymbol)}</p>
                                            </div>
                                            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-slate-100 dark:border-gray-800 min-w-0">
                                                <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Quantum</p>
                                                <p className="text-sm sm:text-lg lg:text-xl font-black text-primary tabular-nums tracking-tighter truncate">{product.stock}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-12 sm:mt-16 flex justify-center items-center gap-2">
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        className="p-2.5 sm:p-3 px-4 sm:px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 disabled:opacity-30 hover:text-primary transition-all active:scale-95 border border-slate-100 dark:border-gray-700"
                                    >
                                        Prev
                                    </button>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[180px] sm:max-w-none px-2">
                                        {Array.from({ length: totalPages }).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-[9px] sm:text-[10px] font-black transition-all active:scale-95 border ${currentPage === i + 1 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110' : 'bg-white dark:bg-gray-900 text-slate-400 border-slate-100 dark:border-gray-800 hover:bg-slate-50'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        className="p-2.5 sm:p-3 px-4 sm:px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 disabled:opacity-30 hover:text-primary transition-all active:scale-95 border border-slate-100 dark:border-gray-700"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState 
                            icon={<InventoryIcon />} 
                            title={searchTerm ? "Zero matching identifications" : "Registry Null"} 
                            description={searchTerm ? `No assets found for protocol "${searchTerm}". Verify SKU or identifier.` : "Initialize your digital inventory by enrolling the first unit into the terminal registry."}
                            action={searchTerm ? undefined : { label: "Enroll First Unit", onClick: handleOpenAddModal }}
                        />
                    )}
                </div>
            </div>

            {/* Float Action Button - Tighter Labeling */}
            <button
                onClick={handleOpenAddModal}
                disabled={!trialLimits.canAddProduct}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 shadow-2xl shadow-primary/40 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] disabled:bg-slate-300 flex items-center justify-center group"
                aria-label="Add new product"
            >
                <PlusIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 sm:group-hover:ml-4 transition-all duration-500 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] whitespace-nowrap">Enroll New Asset</span>
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
                title="TERMINAL PURGE REQUEST"
                message={`Authorize the permanent deletion of "${productToDelete?.name}" from the digital grid. This sequence results in immediate erasure of all associated audit trails.`}
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
