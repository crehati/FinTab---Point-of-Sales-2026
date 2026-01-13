// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import type { ExpenseRequest, ReceiptSettingsData } from '../types';
import ModalShell from './ModalShell';
import { PlusIcon } from '../constants';

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
            alert("Identification Error: Category selection required.");
            return;
        }
        if (numericAmount <= 0) {
            alert("Value Error: Request must exceed zero.");
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
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <>
            <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="btn-base btn-primary flex-1"
            >
                {isSaving ? 'Processing...' : 'Submit Verification'}
            </button>
            <button
                type="button"
                onClick={onClose}
                className="btn-base btn-secondary px-10"
            >
                Abort
            </button>
        </>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="New Expense Request" 
            description="Operational Ledger Entry"
            maxWidth="max-w-2xl"
            footer={footer}
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 block px-1">Protocol Category</label>
                        <select
                            name="category"
                            value={isAddingNewCategory ? ADD_NEW_CATEGORY_VALUE : formData.category}
                            onChange={handleChange}
                            required={!isAddingNewCategory}
                        >
                            <option value="" disabled>Select category...</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            <option value={ADD_NEW_CATEGORY_VALUE} className="text-primary font-bold">+ New Category</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 block px-1">Request Value ({receiptSettings.currencySymbol})</label>
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            placeholder="0.00"
                            step="0.01"
                            className="!text-lg tabular-nums"
                        />
                    </div>
                </div>

                {isAddingNewCategory && (
                    <div className="animate-fade-in-up">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 block px-1">New Identity</label>
                        <input
                            type="text"
                            value={newCategoryValue}
                            onChange={(e) => setNewCategoryValue(e.target.value)}
                            required
                            placeholder="e.g. Server Maintenance"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 block px-1">Settlement Method</label>
                        <select
                            name="paymentMethod"
                            value={formData.paymentMethod}
                            onChange={handleChange}
                        >
                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 block px-1">Merchant (Optional)</label>
                        <input
                            type="text"
                            name="merchant"
                            value={formData.merchant}
                            onChange={handleChange}
                            placeholder="Entity Name..."
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 block px-1">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        required
                        rows={3}
                        placeholder="Purpose of this expenditure request..."
                        className="leading-relaxed"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 block px-1">Voucher Attachment</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-36 border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group shadow-inner"
                    >
                        {attachmentPreview ? (
                            <img src={attachmentPreview} className="w-full h-full object-cover rounded-[1.25rem]" />
                        ) : (
                            <>
                                <PlusIcon className="w-6 h-6 text-slate-300" />
                                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mt-3">Upload Settlement Proof</p>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};

export default ExpenseRequestModal;