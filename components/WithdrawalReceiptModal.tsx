import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import type { Withdrawal, User, BusinessProfile, ReceiptSettingsData } from '../types';
import { CloseIcon, PrintIcon, DownloadJpgIcon } from '../constants';
import { loadScript } from '../lib/dom-utils';

interface WithdrawalReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    withdrawal: Withdrawal | null;
    user: User;
    businessProfile: BusinessProfile | null;
    receiptSettings: ReceiptSettingsData;
}

const WithdrawalReceiptModal: React.FC<WithdrawalReceiptModalProps> = ({ isOpen, onClose, withdrawal, user, receiptSettings }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const modalRoot = document.getElementById('modal-root');
    
    if (!isOpen || !withdrawal || !modalRoot) return null;
    const cs = receiptSettings.currencySymbol;

    const handleDownload = async () => {
        if (!receiptRef.current) return;
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
            const canvas = await (window as any).html2canvas(receiptRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Voucher_${withdrawal.id.slice(-6).toUpperCase()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        } catch (error) { console.error('Export failed:', error); }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans printable-area" role="dialog">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0 no-print">
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.print()} className="p-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"><PrintIcon /></button>
                        <button onClick={handleDownload} className="p-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"><DownloadJpgIcon /></button>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-2xl text-slate-400 hover:bg-slate-50 transition-colors"><CloseIcon /></button>
                </header>

                <div className="overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar">
                    <div ref={receiptRef} className="bg-white shadow-2xl py-12 px-10 border border-slate-100 rounded-[2rem] mx-auto max-w-[340px] relative overflow-hidden font-sans">
                        <div className="text-center mb-10 relative">
                            <h2 className="text-2xl font-bold uppercase tracking-tighter text-slate-900">{receiptSettings.businessName}</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Payout Voucher</p>
                        </div>

                        <div className="space-y-6 relative text-[10px]">
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="font-semibold text-slate-400 uppercase tracking-widest">Auth ID</span>
                                <span className="font-bold text-primary tracking-tight">{withdrawal.approvalReference || withdrawal.id.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="font-semibold text-slate-400 uppercase tracking-widest">Recipient</span>
                                <span className="font-bold text-slate-900 uppercase">{user.name}</span>
                            </div>
                        </div>

                        <div className="mt-12 p-10 bg-slate-900 rounded-[2rem] text-center shadow-2xl shadow-slate-900/20 relative">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Value Disbursed</span>
                            <p className="text-5xl font-bold text-white mt-3 tracking-tighter tabular-nums">{cs}{withdrawal.amount.toFixed(2)}</p>
                        </div>

                        <div className="mt-12 pt-8 border-t border-dashed border-slate-200">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-5">Audit Chain</p>
                            <div className="space-y-4">
                                {withdrawal.auditLog.map((entry, i) => (
                                    <div key={i} className="flex justify-between items-center text-[8px] font-bold">
                                        <div className="flex flex-col"><span className="text-slate-400 uppercase tracking-widest">{entry.status.replace(/_/g, ' ')}</span><span className="text-slate-300">{new Date(entry.timestamp).toLocaleString()}</span></div>
                                        <span className="text-slate-900 uppercase">SIGN: {entry.actorName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="p-6 bg-white border-t no-print flex justify-center">
                    <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl transition-all">Close Audit</button>
                </footer>
            </div>
        </div>,
        modalRoot
    );
};

export default WithdrawalReceiptModal;