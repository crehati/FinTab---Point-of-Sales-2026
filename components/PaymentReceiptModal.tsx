import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import type { CustomPayment, User, BusinessProfile, ReceiptSettingsData } from '../types';
import { CloseIcon, PrintIcon, DownloadJpgIcon } from '../constants';
import { loadScript } from '../lib/dom-utils';

interface PaymentReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: CustomPayment | null;
    user: User;
    businessProfile: BusinessProfile | null;
    receiptSettings: ReceiptSettingsData;
}

const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({ isOpen, onClose, payment, user, receiptSettings }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const modalRoot = document.getElementById('modal-root');
    
    if (!isOpen || !payment || !modalRoot) return null;

    const cs = receiptSettings.currencySymbol;

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        if (!receiptRef.current) return;
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
            const canvas = await (window as any).html2canvas(receiptRef.current, { 
                scale: 3, 
                useCORS: true, 
                backgroundColor: '#ffffff',
                logging: false
            });
            const link = document.createElement('a');
            link.download = `Voucher_Remittance_${payment.id.slice(-6).toUpperCase()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Digital export failed.');
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 printable-area font-sans" role="dialog" aria-modal="true">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0 no-print bg-white/80 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} title="Print Verification" className="p-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"><PrintIcon /></button>
                        <button onClick={handleDownload} title="Download JPG" className="p-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"><DownloadJpgIcon /></button>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-2xl text-slate-400 hover:bg-slate-50 transition-colors"><CloseIcon /></button>
                </header>

                <div className="overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar">
                    <div ref={receiptRef} className="bg-white shadow-2xl py-12 px-10 border border-slate-100 rounded-[2rem] mx-auto max-w-[340px] relative overflow-hidden font-sans">
                        {/* Security Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] rotate-[-45deg] select-none">
                            <p className="text-8xl font-bold text-slate-900 uppercase">VERIFIED</p>
                        </div>

                        <div className="text-center mb-10 relative">
                            <h2 className="text-2xl font-bold uppercase tracking-tighter text-slate-900">{receiptSettings.businessName}</h2>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <div className="h-[1px] w-8 bg-slate-200"></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em]">Remittance Voucher</p>
                                <div className="h-[1px] w-8 bg-slate-200"></div>
                            </div>
                        </div>

                        <div className="space-y-6 relative">
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transaction Ref</span>
                                <span className="text-[10px] font-bold text-slate-900 tracking-tighter">{payment.approvalReference || payment.id.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Authorized Date</span>
                                <span className="text-[10px] font-bold text-slate-900 uppercase">{new Date(payment.dateInitiated).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Account Holder</span>
                                <span className="text-[10px] font-bold text-slate-900 uppercase">{user.name}</span>
                            </div>
                        </div>

                        <div className="mt-8 relative">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Internal Description</span>
                             <p className="text-xs text-slate-600 font-bold leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{payment.description}</p>
                        </div>

                        <div className="mt-12 p-10 bg-primary rounded-[2rem] text-center shadow-2xl shadow-primary/20 relative">
                            <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.3em]">Amount Credited</span>
                            <p className="text-5xl font-bold text-white mt-3 tracking-tighter">{cs}{payment.amount.toFixed(2)}</p>
                        </div>

                        <div className="mt-12 pt-8 border-t border-dashed border-slate-200">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-5">Digital Authorization Log</p>
                            <div className="space-y-4">
                                {payment.auditLog.map((entry, i) => (
                                    <div key={i} className="flex justify-between items-center text-[8px] font-bold">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 uppercase tracking-widest">{entry.status.replace(/_/g, ' ')}</span>
                                            <span className="text-slate-300 font-medium">{new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                        <span className="text-slate-900 uppercase bg-slate-50 px-2 py-1 rounded">AUTH: {entry.actorName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 text-center border-t border-slate-50 pt-6">
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">Official Enterprise Remittance</p>
                        </div>
                    </div>
                </div>
                
                <footer className="p-6 bg-white border-t no-print flex justify-center">
                    <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl hover:opacity-90 active:scale-95 transition-all">
                        Exit Receipt View
                    </button>
                </footer>
            </div>
        </div>,
        modalRoot
    );
};

export default PaymentReceiptModal;