
import React, { useState, useRef, useEffect } from 'react';
import type { ReceiptSettingsData, Sale, Customer, User, Product } from '../types';
import Card from './Card';
import { formatCurrency } from '../lib/utils';

// Create a detailed dummy sale object for a realistic preview
const DUMMY_PREVIEW_PRODUCT_1: Product = { id: 'prev-1', name: 'Savon', description: 'Sample Item', category: 'General', price: 9.00, costPrice: 2.50, stock: 10, imageUrl: '', commissionPercentage: 0 };
const DUMMY_PREVIEW_CUSTOMER: Customer = { id: 'prev-cust', name: 'Benson Jean', email: '', phone: '+19522129810', joinDate: '', purchaseHistory: [] };
const DUMMY_PREVIEW_USER: User = { id: 'prev-user', name: 'Demo User', role: 'Cashier', email: '', avatarUrl: '', type: 'commission' };

const DUMMY_SALE_FOR_PREVIEW: Sale = {
    id: 'RE504278',
    date: new Date().toISOString(),
    items: [
        { product: DUMMY_PREVIEW_PRODUCT_1, quantity: 10, stock: DUMMY_PREVIEW_PRODUCT_1.stock }
    ],
    customerId: DUMMY_PREVIEW_CUSTOMER.id,
    userId: DUMMY_PREVIEW_USER.id,
    subtotal: 90.00,
    tax: 0,
    discount: 0,
    total: 90.00,
    paymentMethod: 'Cash',
    status: 'completed',
    cashReceived: 100.00,
    change: 10.00
};

const ReceiptPreview: React.FC<{ settings: ReceiptSettingsData; isProforma: boolean }> = ({ settings, isProforma }) => {
    const cs = settings.currencySymbol || '$';
    const labels = settings.labels;
    const sale = DUMMY_SALE_FOR_PREVIEW;

    return (
        <div className="font-sans text-gray-900 bg-white max-w-[340px] mx-auto text-[11px] py-10 px-8 border shadow-lg rounded-sm">
            {/* Header: Business Info */}
            <div className="text-center mb-6">
                {settings.logo && <img src={settings.logo} className="w-16 mx-auto mb-4 object-contain" alt="Logo" />}
                <h2 className="text-2xl font-bold uppercase tracking-tight">{settings.businessName}</h2>
                {settings.slogan && <p className="text-sm italic text-gray-500 font-medium">{settings.slogan}</p>}
                <p className="text-[10px] mt-3 text-gray-400 font-bold uppercase tracking-widest">Operator: Demo User</p>
            </div>

            {/* Title Section */}
            <div className="py-3 border-t border-b border-gray-900 text-center mb-6 bg-slate-50">
                <h3 className="text-xl font-black uppercase tracking-widest">{isProforma ? 'Proforma Invoice' : settings.receiptTitle}</h3>
            </div>

            {/* Customer & Receipt Metadata */}
            <div className="text-center mb-6 space-y-1">
                <h4 className="text-lg font-black uppercase tracking-tight">Benson Jean</h4>
                <p className="text-sm font-bold text-gray-500 tracking-widest">+19522129810</p>
                <p className="text-[9px] mt-3 font-black text-slate-400 uppercase tracking-widest">
                    {isProforma ? labels.proformaNumber : labels.receiptNumber} {sale.id}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleString()}</p>
            </div>

            {/* Summary Table */}
            <div className="border border-gray-200 overflow-hidden mb-6 rounded-xl">
                <table className="w-full text-[10px] table-fixed">
                    <thead className="bg-slate-900 text-white uppercase tracking-widest">
                        <tr className="font-bold">
                            <th className="py-2 px-3 text-left w-[33%]">Mode</th>
                            <th className="py-2 px-3 text-center w-[25%]">Items</th>
                            <th className="py-2 px-3 text-center w-[17%]">Units</th>
                            <th className="py-2 px-3 text-right w-[25%]">Sum</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="font-bold">
                            <td className="py-3 px-3 text-left">Cash</td>
                            <td className="py-3 px-3 text-center">1</td>
                            <td className="py-3 px-3 text-center">10</td>
                            <td className="py-3 px-3 text-right font-black">{formatCurrency(90, cs)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Detailed Item List */}
            <div className="border-t border-gray-900 pt-4 mb-8">
                <div className="grid grid-cols-12 gap-1 font-black text-[9px] uppercase tracking-widest border-b border-gray-200 pb-2 mb-2 text-slate-400">
                    <div className="col-span-4">Asset</div>
                    <div className="col-span-3 text-center">Val</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-right">Total</div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-1 items-start">
                        <div className="col-span-4">
                            <p className="font-black uppercase tracking-tight truncate text-[10px]">Savon</p>
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">SKU: prev-1</p>
                        </div>
                        <div className="col-span-3 text-center font-bold">{formatCurrency(9, cs)}</div>
                        <div className="col-span-2 text-center font-bold">10</div>
                        <div className="col-span-3 text-right font-black">{formatCurrency(90, cs)}</div>
                    </div>
                </div>
            </div>

            {/* Financial Totals */}
            <div className="space-y-2 border-t border-gray-900 pt-4">
                <div className="flex justify-between font-bold text-xs uppercase tracking-tight">
                    <span>Subtotal</span>
                    <span>{formatCurrency(90, cs)}</span>
                </div>
                <div className="flex justify-between font-black text-base py-3 border-t border-b border-gray-900 uppercase tracking-tighter">
                    <span>Grand Total</span>
                    <span>{formatCurrency(90, cs)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-2 uppercase tracking-widest text-slate-400">
                    <span>Received</span>
                    <span>{formatCurrency(100, cs)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs border-b border-gray-900 pb-2 uppercase tracking-widest text-slate-400">
                    <span>Change</span>
                    <span>{formatCurrency(10, cs)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">{settings.thankYouNote}</p>
            </div>
        </div>
    );
};

interface ReceiptSettingsProps {
    settings: ReceiptSettingsData;
    setSettings: (settings: ReceiptSettingsData) => void;
    t: (key: string) => string;
}

const InputField: React.FC<{
    labelKey: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    t: (key: string) => string;
    placeholder?: string;
    maxLength?: number;
    type?: string;
}> = ({ labelKey, name, value, onChange, t, placeholder, maxLength, type = "text" }) => (
    <div className="space-y-2">
        <label htmlFor={name} className="block text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">
            {t(labelKey as any)}
        </label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder || ''}
            maxLength={maxLength}
            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
        />
    </div>
);

const ReceiptSettings: React.FC<ReceiptSettingsProps> = ({ settings, setSettings, t }) => {
    const [localSettings, setLocalSettings] = useState<ReceiptSettingsData>(settings);
    const [activePreview, setActivePreview] = useState<'receipt' | 'proforma'>('receipt');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('social.')) {
            const socialKey = name.split('.')[1] as keyof ReceiptSettingsData['social'];
            setLocalSettings(prev => ({
                ...prev,
                social: { ...prev.social, [socialKey]: value }
            }));
        } else if (name.startsWith('labels.')) {
            const labelKey = name.split('.')[1] as keyof ReceiptSettingsData['labels'];
            setLocalSettings(prev => ({
                ...prev,
                labels: { ...prev.labels, [labelKey]: value }
            }));
        }
        else {
            setLocalSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalSettings(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate minor delay for professional feel
        setTimeout(() => {
            setSettings(localSettings);
            setIsSaving(false);
            alert('Protocol Sync Successful: Receipt configuration applied.');
        }, 600);
    };

    return (
        <div className="max-w-7xl mx-auto pb-24 font-sans animate-fade-in">
             <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mb-10">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
                <div className="relative flex items-center gap-8">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('settings.receipts.editTitle')}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">Visual Authorization Protocol</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-10">
                    {/* Identity Section */}
                    <Card title="Corporate Identity" className="rounded-[3rem] shadow-xl border-none">
                        <div className="space-y-8">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-4">{t('settings.receipts.logo')}</label>
                                <div className="flex items-center gap-8 bg-slate-50 dark:bg-gray-900 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-gray-800">
                                    <div className="h-24 w-24 rounded-[2rem] overflow-hidden bg-white dark:bg-gray-800 border-2 border-slate-100 dark:border-gray-700 shadow-sm flex-shrink-0 flex items-center justify-center p-2">
                                        {localSettings.logo ? <img src={localSettings.logo} alt="Logo" className="h-full w-full object-contain" /> : <svg className="w-10 h-10 text-slate-200" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM11.99 15.89l-2.6-3.07L6 16.22h12l-3.37-4.48-2.64 3.15z"/></svg>}
                                    </div>
                                    <div className="space-y-3">
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">
                                            {t('settings.receipts.uploadLogo')}
                                        </button>
                                        {localSettings.logo && (
                                            <button type="button" onClick={() => setLocalSettings(p => ({...p, logo: null}))} className="block w-full text-center text-[9px] font-black uppercase text-rose-500 hover:underline">Revoke Seal</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <InputField labelKey="settings.receipts.businessName" name="businessName" value={localSettings.businessName} onChange={handleInputChange} t={t} placeholder="Global Corp" />
                                <InputField labelKey="settings.receipts.slogan" name="slogan" value={localSettings.slogan} onChange={handleInputChange} t={t} placeholder="Excellence in Motion" />
                            </div>
                        </div>
                    </Card>

                    {/* Communication Hub */}
                    <Card title="Communication Hub" className="rounded-[3rem] shadow-xl border-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <InputField labelKey="settings.receipts.address" name="address" value={localSettings.address} onChange={handleInputChange} t={t} placeholder="123 Protocol St." />
                            <InputField labelKey="settings.receipts.phone" name="phone" value={localSettings.phone} onChange={handleInputChange} t={t} placeholder="+1 000 000 0000" />
                            <InputField labelKey="settings.receipts.email" name="email" value={localSettings.email} onChange={handleInputChange} t={t} placeholder="hq@domain.com" />
                            <InputField labelKey="settings.receipts.website" name="website" value={localSettings.website} onChange={handleInputChange} t={t} placeholder="www.domain.com" />
                        </div>
                    </Card>

                    {/* Financial Protocol */}
                    <Card title="Financial Protocol" className="rounded-[3rem] shadow-xl border-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <InputField labelKey="settings.receipts.currencySymbol" name="currencySymbol" value={localSettings.currencySymbol} onChange={handleInputChange} t={t} placeholder="$" />
                            <InputField labelKey="settings.receipts.receiptPrefix" name="receiptPrefix" value={localSettings.receiptPrefix} onChange={handleInputChange} t={t} placeholder="RE" maxLength={2} />
                            <div className="sm:col-span-2">
                                <InputField labelKey="settings.receipts.receiptTitle" name="receiptTitle" value={localSettings.receiptTitle} onChange={handleInputChange} t={t} placeholder="SALES RECEIPT" />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <label htmlFor="thankYouNote" className="block text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">{t('settings.receipts.thankYouNote')}</label>
                                <textarea id="thankYouNote" name="thankYouNote" value={localSettings.thankYouNote} onChange={handleInputChange} rows={2} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"></textarea>
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <label htmlFor="termsAndConditions" className="block text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">{t('settings.receipts.termsAndConditions')}</label>
                                <textarea id="termsAndConditions" name="termsAndConditions" value={localSettings.termsAndConditions} onChange={handleInputChange} rows={3} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"></textarea>
                            </div>
                        </div>
                    </Card>

                    {/* Variable Overrides */}
                    <Card title="Interface Variable Overrides" className="rounded-[3rem] shadow-xl border-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <InputField labelKey="settings.receipts.labelReceiptNumber" name="labels.receiptNumber" value={localSettings.labels.receiptNumber} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelProformaNumber" name="labels.proformaNumber" value={localSettings.labels.proformaNumber} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelDate" name="labels.date" value={localSettings.labels.date} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelTime" name="labels.time" value={localSettings.labels.time} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelCustomer" name="labels.customer" value={localSettings.labels.customer} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelCashier" name="labels.cashier" value={localSettings.labels.cashier} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelPayment" name="labels.payment" value={localSettings.labels.payment} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelItem" name="labels.item" value={localSettings.labels.item} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelTotal" name="labels.total" value={localSettings.labels.total} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelSubtotal" name="labels.subtotal" value={localSettings.labels.subtotal} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelTax" name="labels.tax" value={localSettings.labels.tax} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelDiscount" name="labels.discount" value={localSettings.labels.discount} onChange={handleInputChange} t={t} />
                            <InputField labelKey="settings.receipts.labelGrandTotal" name="labels.grandTotal" value={localSettings.labels.grandTotal} onChange={handleInputChange} t={t} />
                        </div>
                    </Card>
                </div>

                {/* Preview Sticky Column */}
                <div className="lg:col-span-5">
                    <div className="lg:sticky top-10 space-y-8">
                        <Card title={t('settings.receipts.previewTitle')} className="rounded-[3rem] shadow-2xl border-none">
                            <div className="mb-8 flex p-1.5 bg-slate-50 dark:bg-gray-950 rounded-2xl shadow-inner border border-slate-100 dark:border-gray-800">
                                <button 
                                    onClick={() => setActivePreview('receipt')}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activePreview === 'receipt' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm border border-slate-100 dark:border-gray-700' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Receipt Node
                                </button>
                                <button 
                                    onClick={() => setActivePreview('proforma')}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activePreview === 'proforma' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm border border-slate-100 dark:border-gray-700' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Proforma Node
                                </button>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-gray-950 p-6 md:p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-gray-800">
                                <ReceiptPreview settings={localSettings} isProforma={activePreview === 'proforma'} />
                            </div>
                        </Card>

                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center gap-3"
                        >
                            {isSaving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : t('settings.receipts.saveButton')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptSettings;
