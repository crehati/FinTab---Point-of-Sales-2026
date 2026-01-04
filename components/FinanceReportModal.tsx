import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import type { CashCount, GoodsCosting, GoodsReceiving, WeeklyInventoryCheck, BusinessProfile, ReceiptSettingsData } from '../types';
import { CloseIcon, PrintIcon, DownloadJpgIcon, WarningIcon } from '../constants';
import { loadScript } from '../lib/dom-utils';

interface FinanceReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: CashCount | GoodsCosting | GoodsReceiving | WeeklyInventoryCheck | null;
    type: 'cash' | 'costing' | 'receiving' | 'inventory_audit';
    businessProfile: BusinessProfile | null;
    receiptSettings: ReceiptSettingsData;
}

const FinanceReportModal: React.FC<FinanceReportModalProps> = ({ isOpen, onClose, record, type, businessProfile, receiptSettings }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const modalRoot = document.getElementById('modal-root');
    
    if (!isOpen || !record || !modalRoot) return null;
    const cs = receiptSettings.currencySymbol;

    const handleDownload = async () => {
        if (!reportRef.current) return;
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
            const canvas = await (window as any).html2canvas(reportRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Report_${type.toUpperCase()}_${record.id.slice(-6).toUpperCase()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        } catch (error) { console.error('Export failed:', error); }
    };

    const renderCashCount = (data: CashCount) => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Audit Date</p>
                    <p className="font-bold text-slate-900">{data.date}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="font-bold text-emerald-600 uppercase">ACCEPTED</p>
                </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">System Cash Total</span>
                    <span className="font-bold tabular-nums">{cs}{data.systemTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Counted Cash Amount</span>
                    <span className="font-bold tabular-nums text-primary">{cs}{data.countedTotal.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400">Variance Audit</span>
                    <span className={`text-xl font-black tabular-nums ${data.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {data.difference > 0 ? '+' : ''}{cs}{data.difference.toFixed(2)}
                    </span>
                </div>
            </div>

            {data.notes && (
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Internal Notes</p>
                    <p className="text-sm text-slate-600 p-4 bg-slate-50 rounded-xl border border-slate-100 italic">"{data.notes}"</p>
                </div>
            )}
        </div>
    );

    const renderGoodsCosting = (data: GoodsCosting) => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product Identity</p>
                    <p className="font-bold text-slate-900">{data.productName || 'Unnamed'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">ID: {data.productNumber}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Batch Size</p>
                    <p className="font-bold text-slate-900">{data.quantity} Units</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Buying Unit Price</span>
                    <span className="font-bold">{cs}{data.buyingUnitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Base Buying Sum</span>
                    <span className="font-bold">{cs}{data.totalBuyingAmount.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs text-slate-400 uppercase font-bold">
                        <span>Landed Surcharges</span>
                        <span>{cs}{data.totalAdditionalCosts.toFixed(2)}</span>
                    </div>
                    <div className="pl-4 space-y-1 text-[10px] text-slate-500">
                        <div className="flex justify-between"><span>Taxes/Duties</span><span>{cs}{data.additionalCosts.taxes.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Shipping/Logistics</span><span>{cs}{data.additionalCosts.shipping.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Inland Transport</span><span>{cs}{data.additionalCosts.transport.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Labor/Handling</span><span>{cs}{data.additionalCosts.labor.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Other/Fees</span><span>{cs}{(data.additionalCosts.transferFees + data.additionalCosts.other).toFixed(2)}</span></div>
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Landed Cost</p>
                            <p className="text-3xl font-bold tracking-tighter">{cs}{data.totalLandedCost.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">Unit Cost</p>
                            <p className="text-2xl font-black text-rose-500">{cs}{data.unitCost.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 border border-slate-100 rounded-2xl">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margin Applied</p>
                        <p className="text-lg font-bold text-slate-900">{data.marginPercentage}%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Market Value</p>
                        <p className="text-lg font-bold text-primary">{cs}{data.suggestedSellingPrice.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderGoodsReceiving = (data: GoodsReceiving) => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference Number</p>
                    <p className="font-bold text-slate-900">{data.refNumber}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Result</p>
                    <p className={`font-bold uppercase ${data.status === 'accepted' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {data.status.toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Unit Identity</p>
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">{data.productName}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-1">ID: {data.productNumber}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-2xl bg-white border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Expected</p>
                        <p className="text-xl font-bold">{data.expectedQty}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Received</p>
                        <p className="text-xl font-black text-primary">{data.receivedQty}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Variance</p>
                        <p className={`text-xl font-black ${data.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {data.difference > 0 ? '+' : ''}{data.difference}
                        </p>
                    </div>
                </div>

                {data.notes && (
                    <div className="p-6 bg-slate-50 rounded-2xl italic text-sm text-slate-600 border border-slate-100">
                        "{data.notes}"
                    </div>
                )}
            </div>
        </div>
    );

    const renderInventoryAudit = (data: WeeklyInventoryCheck) => (
        <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Audit Date</p>
                    <p className="font-bold text-slate-900">{data.date}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Protocol Result</p>
                    <p className={`font-bold uppercase ${data.status === 'accepted' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {data.status.toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {data.items.map((item, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{item.productNumber}</p>
                                <p className="font-bold text-slate-900 uppercase text-xs">{item.productName}</p>
                            </div>
                            <div className={`text-xs font-black tabular-nums ${item.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                Var: {item.difference > 0 ? '+' : ''}{item.difference}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[9px] font-bold uppercase tracking-widest">
                            <div className="text-slate-400">System Qty: <span className="text-slate-900">{item.systemQty}</span></div>
                            <div className="text-slate-400">Physical: <span className="text-slate-900">{item.physicalQty}</span></div>
                        </div>
                        {item.notes && <p className="text-[9px] text-slate-500 italic mt-1">Note: "{item.notes}"</p>}
                    </div>
                ))}
            </div>
        </div>
    );

    const auditTrail = [
        { label: 'First Signer', name: (record as any).signatures?.first?.userName || (record as any).signatures?.manager?.userName, role: (record as any).signatures?.first?.role || (record as any).signatures?.manager?.role, time: (record as any).signatures?.first?.timestamp || (record as any).signatures?.manager?.timestamp },
        { label: 'Second Signer', name: (record as any).signatures?.second?.userName || (record as any).signatures?.verifier?.userName, role: (record as any).signatures?.second?.role || (record as any).signatures?.verifier?.role, time: (record as any).signatures?.second?.timestamp || (record as any).signatures?.verifier?.timestamp },
        { label: 'Final Approver', name: (record as any).ownerAudit?.userName || (record as any).signatures?.approver?.userName, role: 'Owner/Admin', time: (record as any).ownerAudit?.timestamp || (record as any).signatures?.approver?.timestamp }
    ].filter(a => a.name);

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 font-sans printable-area" role="dialog">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0 no-print">
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.print()} className="p-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"><PrintIcon /></button>
                        <button onClick={handleDownload} className="p-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"><DownloadJpgIcon /></button>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-2xl text-slate-400 hover:bg-slate-50 transition-colors"><CloseIcon /></button>
                </header>

                <div className="overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar">
                    <div ref={reportRef} className="bg-white shadow-2xl py-12 px-10 border border-slate-100 rounded-[2rem] mx-auto max-w-[380px] relative overflow-hidden font-sans">
                        <div className="text-center mb-10 relative">
                            <h2 className="text-2xl font-bold uppercase tracking-tighter text-slate-900">{receiptSettings.businessName}</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-0.4em mt-2">
                                {type === 'cash' ? 'Cash Count Report' : type === 'costing' ? 'Landed Cost Audit' : type === 'receiving' ? 'Inventory Arrival Audit' : 'Weekly Stock Audit'}
                            </p>
                            <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-1">Ref ID: {record.id.toUpperCase()}</p>
                        </div>

                        {type === 'cash' && renderCashCount(record as CashCount)}
                        {type === 'costing' && renderGoodsCosting(record as GoodsCosting)}
                        {type === 'receiving' && renderGoodsReceiving(record as GoodsReceiving)}
                        {type === 'inventory_audit' && renderInventoryAudit(record as WeeklyInventoryCheck)}

                        <div className="mt-12 pt-8 border-t border-dashed border-slate-200">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Digital Audit Trail</p>
                            <div className="space-y-4">
                                {auditTrail.map((entry, i) => (
                                    <div key={i} className="flex justify-between items-center text-[8px] font-bold border-b border-slate-50 pb-2 last:border-0">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 uppercase tracking-widest">{entry.label}</span>
                                            <span className="text-slate-300">{new Date(entry.time!).toLocaleString()}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-slate-900 uppercase">SIGN: {entry.name}</span>
                                            <p className="text-[7px] text-slate-400">{entry.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 text-center border-t border-slate-50 pt-6">
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">Official Terminal Record • {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                <footer className="p-6 bg-white border-t no-print flex justify-center">
                    <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all">Close Report</button>
                </footer>
            </div>
        </div>,
        modalRoot
    );
};

export default FinanceReportModal;