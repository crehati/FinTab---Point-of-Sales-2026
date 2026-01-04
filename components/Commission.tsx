
import React, { useState } from 'react';
import type { Product, ReceiptSettingsData } from '../types';
import EmptyState from './EmptyState';
import { formatCurrency } from '../lib/utils';
import { CommissionIcon, InventoryIcon } from '../constants';
import { useNavigate } from 'react-router-dom';

interface CommissionProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
}

const Commission: React.FC<CommissionProps> = ({ products = [], setProducts, t, receiptSettings }) => {
    const [editingState, setEditingState] = useState<{ id: string | null; value: string }>({ id: null, value: '' });
    const navigate = useNavigate();

    const handleCommissionChange = (productId: string, newCommission: number) => {
        const commission = Math.max(0, newCommission);
        setProducts(prevProducts =>
            prevProducts.map(p =>
                p.id === productId ? { ...p, commissionPercentage: commission } : p
            )
        );
    };

    const handleEditClick = (product: Product) => {
        setEditingState({ id: product.id, value: String(product.commissionPercentage) });
    };

    const handleCancelClick = () => {
        setEditingState({ id: null, value: '' });
    };

    const handleSaveClick = (productId: string) => {
        const newCommission = parseFloat(editingState.value);
        if (!isNaN(newCommission)) {
            handleCommissionChange(productId, newCommission);
        }
        setEditingState({ id: null, value: '' });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Commissions</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Per-SKU Staff Yield Configuration</p>
                    </div>
                    
                    <div className="max-w-md bg-blue-50 dark:bg-blue-900/20 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide leading-relaxed">
                            Yield protocols define staff earnings on completed transactions after discounts. Configure percentage-based incentives below.
                        </p>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {products.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[700px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Product Asset</th>
                                                <th scope="col">Market Value</th>
                                                <th scope="col">Yield Percentage (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {products.map(product => (
                                                <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
                                                        <div className="flex items-center gap-4">
                                                            <img src={product.imageUrl} alt={product.name} className="w-11 h-11 rounded-xl object-cover border-2 border-slate-50 shadow-sm" />
                                                            <span className="text-sm">{product.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-slate-500 font-bold tabular-nums">
                                                        {formatCurrency(product.price, receiptSettings.currencySymbol)}
                                                    </td>
                                                    <td>
                                                        {editingState.id === product.id ? (
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    value={editingState.value}
                                                                    onChange={(e) => setEditingState({ ...editingState, value: e.target.value })}
                                                                    className="w-24 bg-white border-2 border-primary rounded-xl px-3 py-2 text-sm font-black tabular-nums outline-none shadow-lg"
                                                                    autoFocus
                                                                    min="0"
                                                                    step="0.1"
                                                                />
                                                                <button onClick={() => handleSaveClick(product.id)} className="text-[10px] font-black uppercase text-emerald-600 hover:underline">Commit</button>
                                                                <button onClick={handleCancelClick} className="text-[10px] font-black uppercase text-slate-400 hover:underline">Abort</button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleEditClick(product)} 
                                                                className="group flex items-center gap-4 text-slate-900 dark:text-white"
                                                            >
                                                                <span className="text-xl font-black tabular-nums">{product.commissionPercentage}%</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all">Edit Rate</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="md:hidden space-y-4">
                                {products.map(product => (
                                    <div key={product.id} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-gray-700">
                                        <div className="flex items-center gap-4 mb-4">
                                            <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-md" />
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{product.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(product.price, receiptSettings.currencySymbol)}</p>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t dark:border-gray-700">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Protocol Yield</label>
                                            {editingState.id === product.id ? (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        value={editingState.value}
                                                        onChange={(e) => setEditingState({ ...editingState, value: e.target.value })}
                                                        className="flex-1 bg-white border-2 border-primary rounded-xl px-4 py-3 text-lg font-black tabular-nums outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveClick(product.id)} className="bg-emerald-500 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase">OK</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEditClick(product)} className="w-full flex justify-between items-center py-2">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{product.commissionPercentage}%</span>
                                                    <span className="text-[10px] font-black uppercase text-primary">Modify Rate</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<InventoryIcon />} 
                            title="Inventory Registry Empty" 
                            description="Enroll products into the digital ledger before configuring yield protocols."
                            action={{ label: "Go to Inventory", onClick: () => navigate('/inventory') }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Commission;
