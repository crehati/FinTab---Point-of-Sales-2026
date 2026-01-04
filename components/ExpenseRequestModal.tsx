import React, { useState, useEffect, useRef } from 'react';
import type { ExpenseRequest, ReceiptSettingsData } from '../types';
import { CloseIcon, PlusIcon } from '../constants';

interface ExpenseRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (requestData: Omit<ExpenseRequest, 'id' | 'date' | 'userId' | 'status'>) => void;
    categories: string[];
    receiptSettings: ReceiptSettingsData;
}

const getInitialFormData = () => ({
    category: '',
    description: '',
    amount: '' as string | number,
    paymentMethod: 'Cash' as const,
    merchant: '',
    attachment: '' as string
});

const ADD_NEW_CATEGORY_VALUE = '__ADD_NEW__';
const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Other'];

const ExpenseRequestModal: React.FC<ExpenseRequestModalProps> = ({ isOpen, onClose, onSave, categories, receiptSettings }) => {
    const [formData, setFormData] = useState(getInitialFormData());
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCategoryValue, setNewCategoryValue] = useState('');
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData());
            setIsAddingNewCategory(false);
            setNewCategoryValue('');
            setAttachmentPreview(null);
            setIsSaving(false);
        }
    }, [isOpen]);

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
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setFormData(prev => ({ ...prev, attachment: base64 }));
                setAttachmentPreview(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        const finalCategory = isAddingNewCategory ? newCategoryValue.trim() : formData.category;
        const numericAmount = parseFloat(String(formData.amount)) || 0;

        if (!finalCategory) {
            alert("Protocol Error: Category identification mandatory.");
            return;
        }
        if (numericAmount <= 0) {
            alert("Protocol Error: Request value must exceed zero.");
            return;
        }

        setIsSaving(true);
        try {
            await onSave({ 
                ...formData, 
                category: finalCategory, 
                amount: numericAmount 
            });
            onClose();
        } catch (err) {
            alert("Communication failure. Re-trying signature...");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in font-sans" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-950 rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10">
                <header className="p-8 border-b dark:border-gray-800 flex justify-between items-center bg-slate-900 text-white">
                    <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] mb-2">Protocol Initialization</p>
                        <h2 className="text-3xl font-bold uppercase tracking-tighter">New Expense Request</h2>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-white/10 rounded-full transition-colors">
                        <CloseIcon className="w-6 h-6 text-white" />
                    </button>
                </header>
                
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Protocol Category</label>
                                <select
                                    name="category"
                                    value={isAddingNewCategory ? ADD_NEW_CATEGORY_VALUE : formData.category}
                                    onChange={handleChange}
                                    required={!isAddingNewCategory}
                                    className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                >
                                    <option value="" disabled>Select Category...</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    <option value={ADD_NEW_CATEGORY_VALUE} className="text-primary font-bold">+ Enroll New Category</option>
                                </select>
                            </div>
                            
                            {isAddingNewCategory && (
                                <div className="animate-fade-in">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">New Classification</label>
                                    <input
                                        type="text"
                                        value={newCategoryValue}
                                        onChange={(e) => setNewCategoryValue(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        placeholder="Enter name..."
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Request Value ({receiptSettings.currencySymbol})</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Settlement Method</label>
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                >
                                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Merchant / Vendor (Optional)</label>
                                <input
                                    type="text"
                                    name="merchant"
                                    value={formData.merchant}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    placeholder="Supplier name..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Internal Description (Required)</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none leading-relaxed"
                                placeholder="Purpose of expenditure..."
                            />
                        </div>

                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Supporting Evidence (Attachment)</label>
                            <div className="flex gap-4 items-center">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 h-32 border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-900 transition-all relative overflow-hidden group"
                                >
                                    {attachmentPreview ? (
                                        <img src={attachmentPreview} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <PlusIcon className="w-6 h-6 text-slate-300 group-hover:text-primary transition-colors" />
                                            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-2">Upload Voucher</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                                {attachmentPreview && (
                                    <button type="button" onClick={() => { setAttachmentPreview(null); setFormData(p => ({ ...p, attachment: '' })); }} className="text-rose-500 font-bold text-[9px] uppercase tracking-widest hover:underline">Remove</button>
                                )}
                            </div>
                        </div>
                    </main>

                    <footer className="p-8 border-t dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col sm:flex-row gap-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-5 bg-primary text-white rounded-[1.5rem] font-bold uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            Submit for Verification
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-10 py-5 bg-slate-100 dark:bg-gray-800 text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em] rounded-[1.5rem] hover:bg-slate-200 transition-all"
                        >
                            Abort
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default ExpenseRequestModal;