
import React, { useRef, useState } from 'react';
import type { Sale, Product, ReceiptSettingsData, User, Customer, PrinterSettingsData, CartItem } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ModalShell from './ModalShell';
import { CloseIcon, PrintIcon, DownloadJpgIcon, DeleteIcon, WarningIcon } from '../constants';
import { loadScript } from '../lib/dom-utils';
import { formatCurrency } from '../lib/utils';

interface ReceiptModalProps {
    sale: Sale | null;
    onClose: () => void;
    receiptSettings: ReceiptSettingsData;
    onDelete: (saleId: string) => void;
    currentUser: User;
    t: (key: string) => string;
    users: User[];
    customers: Customer[];
    isTrialExpired: boolean;
    printerSettings: PrinterSettingsData;
}

const getEffectivePrice = (item: CartItem): number => {
    if (!item) return 0;
    if (item.variant) return Number(item.variant.price) || 0;
    const { product, quantity } = item;
    if (!product) return 0;
    const basePrice = Number(product.price) || 0;
    if (!product.tieredPricing?.length) return basePrice;
    const applicableTier = [...product.tieredPricing]
        .sort((a, b) => b.quantity - a.quantity)
        .find(tier => quantity >= tier.quantity);
    return applicableTier ? (Number(applicableTier.price) || 0) : basePrice;
};

const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, receiptSettings, onDelete, currentUser, t, users, customers, isTrialExpired, printerSettings }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    if (!sale) return null;
    
    const customer = customers.find(c => c.id === sale.customerId);
    const user = users.find(u => u.id === sale.userId);
    const customerName = customer?.name || 'Guest Identity';
    
    const isProforma = sale.status === 'proforma';
    const isFinalized = ['completed', 'completed_bank_verified', 'approved_by_owner', 'pending_bank_verification'].includes(sale.status);
    const canDelete = currentUser && ['Owner', 'Manager'].includes(currentUser.role);
    const cs = receiptSettings.currencySymbol;
    const labels = receiptSettings.labels;

    const totalUnits = (sale.items || []).reduce((sum, item) => sum + item.quantity, 0);

    const generateAndDownloadJpg = async () => {
        if (!receiptRef.current) return;
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
            const canvas = await (window as any).html2canvas(receiptRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `${isProforma ? 'proforma' : 'receipt'}-${sale.id.slice(-6).toUpperCase()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        } catch (error) { console.error('Export error:', error); }
    };

    return (
        <ModalShell 
            isOpen={!!sale} 
            onClose={onClose} 
            title={isProforma ? 'Proforma Invoice' : 'Sales Receipt'}
            description={`Ref: ${receiptSettings.receiptPrefix}${sale.id.slice(-6).toUpperCase()}`}
            maxWidth="max-w-lg"
        >
            <div className="relative">
                {/* Action Bar: Top Middle */}
                <div className="flex justify-center gap-4 mb-8 no-print">
                    <button 
                        onClick={() => window.print()} 
                        title="Print" 
                        className="p-4 bg-slate-50 dark:bg-gray-800 text-slate-500 dark:text-slate-400 rounded-3xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                    >
                        <PrintIcon className="w-5 h-5" />
                    </button>
                    {isFinalized && (
                        <button 
                            onClick={generateAndDownloadJpg} 
                            title="Download JPG" 
                            className="p-4 bg-slate-50 dark:bg-gray-800 text-slate-500 dark:text-slate-400 rounded-3xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            <DownloadJpgIcon className="w-5 h-5" />
                        </button>
                    )}
                    {canDelete && (
                        <button 
                            onClick={() => setIsConfirmOpen(true)} 
                            title="Purge Record" 
                            className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            <DeleteIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Receipt Content */}
                <div ref={receiptRef} className="font-sans text-gray-900 bg-white max-w-[400px] mx-auto text-[11px] py-10 px-8">
                    {/* Header: Business Info */}
                    <div className="text-center mb-6">
                        {receiptSettings.logo && <img src={receiptSettings.logo} className="w-20 mx-auto mb-4 object-contain" alt="Logo" />}
                        <h2 className="text-2xl font-bold">{receiptSettings.businessName}</h2>
                        {receiptSettings.slogan && <p className="text-sm italic text-gray-500">{receiptSettings.slogan}</p>}
                        <p className="text-xs mt-3 text-gray-600 font-medium">Sold by: {user?.name || 'System User'}</p>
                    </div>

                    {/* Title Section */}
                    <div className="py-3 border-t border-b border-gray-900 text-center mb-6">
                        <h3 className="text-2xl font-bold">{isProforma ? 'Proforma Invoice' : 'Sales Receipt'}</h3>
                    </div>

                    {/* Customer & Receipt Metadata */}
                    <div className="text-center mb-6 space-y-1">
                        <h4 className="text-xl font-bold">{customerName}</h4>
                        {customer?.phone && <p className="text-sm font-medium text-gray-600">{customer.phone}</p>}
                        <p className="text-sm mt-3 font-medium">{isProforma ? labels.proformaNumber : labels.receiptNumber} {receiptSettings.receiptPrefix}{sale.id.slice(-6).toUpperCase()}</p>
                        <p className="text-sm font-medium">{new Date(sale.date).toLocaleString()}</p>
                    </div>

                    {/* Summary Table */}
                    <div className="bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden mb-6">
                        <table className="w-full text-[11px] table-fixed">
                            <thead className="bg-gray-50/80">
                                <tr className="text-gray-900 font-bold border-b border-gray-200">
                                    <th className="py-2 px-3 text-left w-[33%]">Mode</th>
                                    <th className="py-2 px-3 text-center w-[25%]">Items</th>
                                    <th className="py-2 px-3 text-center w-[17%]">Units</th>
                                    <th className="py-2 px-3 text-right w-[25%]">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="font-medium">
                                    <td className="py-2 px-3 text-left truncate">{sale.paymentMethod || 'Cash'}</td>
                                    <td className="py-2 px-3 text-center">{sale.items.length}</td>
                                    <td className="py-2 px-3 text-center">{totalUnits}</td>
                                    <td className="py-2 px-3 text-right font-bold">{formatCurrency(sale.total, cs)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Detailed Item List */}
                    <div className="border-t border-gray-900 pt-4 mb-8">
                        <div className="grid grid-cols-12 gap-1 font-bold text-xs border-b border-gray-200 pb-2 mb-2">
                            <div className="col-span-4">Item</div>
                            <div className="col-span-3 text-center">Price</div>
                            <div className="col-span-2 text-center">Qty</div>
                            <div className="col-span-3 text-right">Total</div>
                        </div>
                        <div className="space-y-4">
                            {sale.items.map((item, i) => {
                                const price = getEffectivePrice(item);
                                return (
                                    <div key={i} className="grid grid-cols-12 gap-1 items-start text-xs">
                                        <div className="col-span-4">
                                            <p className="font-bold truncate">{item.product?.name || 'Asset'}</p>
                                            <p className="text-[10px] text-gray-400 font-medium truncate">{item.product?.id?.slice(-8).toLowerCase()}</p>
                                        </div>
                                        <div className="col-span-3 text-center font-medium">{formatCurrency(price, cs)}</div>
                                        <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                                        <div className="col-span-3 text-right font-bold">{formatCurrency(price * item.quantity, cs)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Financial Totals */}
                    <div className="space-y-2 border-t border-gray-900 pt-4">
                        <div className="flex justify-between font-bold text-sm">
                            <span>Subtotal</span>
                            <span>{formatCurrency(sale.subtotal, cs)}</span>
                        </div>
                        {sale.discount > 0 && (
                            <div className="flex justify-between font-bold text-sm text-rose-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(sale.discount, cs)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-lg py-2 border-t border-b border-gray-900">
                            <span>Grand Total</span>
                            <span>{formatCurrency(sale.total, cs)}</span>
                        </div>
                        {sale.paymentMethod === 'Cash' && sale.cashReceived !== undefined && (
                            <>
                                <div className="flex justify-between font-bold text-sm pt-2">
                                    <span>Cash Received</span>
                                    <span>{formatCurrency(sale.cashReceived, cs)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm border-b border-gray-900 pb-2">
                                    <span>Change</span>
                                    <span>{formatCurrency(sale.change || 0, cs)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-10">
                        {receiptSettings.thankYouNote && <p className="text-sm font-bold text-gray-700">{receiptSettings.thankYouNote}</p>}
                    </div>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={isConfirmOpen} 
                onClose={() => setIsConfirmOpen(false)} 
                onConfirm={() => onDelete(sale.id)} 
                title="Purge Transaction" 
                message={`Permanently purge record #${sale.id.slice(-6).toUpperCase()}? This action is irreversible.`}
                amount={sale.total}
                currencySymbol={cs}
                variant="danger"
                isIrreversible={true}
                confirmLabel="Purge Record"
            />
        </ModalShell>
    );
};

export default ReceiptModal;
