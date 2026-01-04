
// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import type { User, Sale, ReceiptSettingsData, Withdrawal, CustomPayment, BusinessProfile } from '../types';
import Card from './Card';
import WithdrawalRequestModal from './WithdrawalRequestModal';
import WithdrawalReceiptModal from './WithdrawalReceiptModal';
import PaymentReceiptModal from './PaymentReceiptModal';
import ConfirmationModal from './ConfirmationModal';
import ModalShell from './ModalShell';
import { formatAbbreviatedNumber, formatCurrency } from '../lib/utils';
import { WarningIcon, PlusIcon, CloseIcon } from '../constants';

interface StaffProfileProps {
    currentUser: User;
    users: User[];
    sales: Sale[];
    receiptSettings: ReceiptSettingsData;
    onRequestWithdrawal: (userId: string, amount: number, source: 'commission' | 'investment') => void;
    onUpdateWithdrawalStatus: (userId: string, withdrawalId: string, status: Withdrawal['status']) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status']) => void;
    businessProfile: BusinessProfile | null;
    onSwitchUser: (user: User) => void;
    onConfirmWithdrawalReceived: (userId: string, withdrawalId: string) => void;
    onUpdateCurrentUserProfile: (profileData: { name?: string; avatarUrl?: string; phone?: string; initialInvestment?: number; }) => void;
}

const SummaryMetric: React.FC<{ title: string; value: string; caption: string; colorClass?: string; cs: string; rawValue: number }> = ({ title, value, caption, colorClass = "text-slate-900 dark:text-white", cs, rawValue }) => (
    <div 
        className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-gray-800 flex flex-col justify-between transition-all hover:shadow-xl group h-full cursor-help"
        title={formatCurrency(rawValue, cs)}
    >
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>{value}</p>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6 leading-relaxed">{caption}</p>
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; type: 'approved' | 'pending' | 'rejected' | 'draft' }> = {
        'pending': { label: 'In Review', type: 'pending' },
        'approved_by_owner': { label: 'Ready for Acceptance', type: 'pending' },
        'completed': { label: 'Settled', type: 'approved' },
        'rejected': { label: 'Rejected', type: 'rejected' },
        'cancelled_by_user': { label: 'Declined', type: 'draft' },
    };
    const item = config[status] || { label: status.replace(/_/g, ' '), type: 'draft' };
    
    let statusClass = 'status-draft';
    if (item.type === 'approved') statusClass = 'status-approved';
    if (item.type === 'pending') statusClass = 'status-pending';
    if (item.type === 'rejected') statusClass = 'status-rejected';

    return (
        <span className={`status-badge ${statusClass} !text-[8px] !px-3 !py-1`}>
            {item.label}
        </span>
    );
};

const StaffProfile: React.FC<StaffProfileProps> = ({ currentUser, users, sales, receiptSettings, onRequestWithdrawal, onUpdateWithdrawalStatus, handleUpdateCustomPaymentStatus, businessProfile, onSwitchUser, onConfirmWithdrawalReceived, onUpdateCurrentUserProfile }) => {
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [withdrawalReceiptToShow, setWithdrawalReceiptToShow] = useState<Withdrawal | null>(null);
    const [paymentReceiptToShow, setPaymentReceiptToShow] = useState<CustomPayment | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const cs = receiptSettings.currencySymbol || '$';

    const analytics = useMemo(() => {
        const mySales = sales.filter(s => s.userId === currentUser.id && s.status === 'completed');
        const earned = mySales.reduce((sum, s) => sum + (s.commission || 0), 0);
        
        const totalWithdrawnValue = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0);
            
        const reservedFundsValue = (currentUser.withdrawals || [])
            .filter(w => ['pending', 'approved_by_owner'].includes(w.status))
            .reduce((sum, w) => sum + w.amount, 0);

        const availableValue = Math.max(0, earned - totalWithdrawnValue - reservedFundsValue);
        
        const lastWithdrawal = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
        const lastCustomPayment = (currentUser.customPayments || [])
            .filter(p => p.status === 'completed')
            .sort((a, b) => new Date(b.dateInitiated).getTime() - new Date(a.dateInitiated).getTime())[0];

        const hasActiveRequest = (currentUser.withdrawals || []).some(w => ['pending', 'approved_by_owner'].includes(w.status) && w.source === 'commission');

        return { earned, totalWithdrawnValue, reservedFundsValue, availableValue, hasActiveRequest, lastUpdate: new Date().toLocaleString(), lastWithdrawal, lastCustomPayment };
    }, [currentUser, sales]);

    const history = useMemo(() => {
        const wds = (currentUser.withdrawals || []).map(w => ({ ...w, displayType: 'Yield Withdrawal', date: w.date, txClass: 'Withdrawal' }));
        const pms = (currentUser.customPayments || []).map(p => ({ ...p, displayType: 'Staff Remittance', date: p.dateInitiated, txClass: 'Payment' }));
        return [...wds, ...pms].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [currentUser]);

    const handleAcceptPayout = async (item: any) => {
        setIsProcessing(true);
        try {
            if (item.txClass === 'Withdrawal') {
                await onConfirmWithdrawalReceived(currentUser.id, item.id);
                // Synchronize local currentUser state to reflect the completion
                const updated = (currentUser.withdrawals || []).map(w => w.id === item.id ? { ...w, status: 'completed' } : w);
                onUpdateCurrentUserProfile({ withdrawals: updated });
            } else {
                await handleUpdateCustomPaymentStatus(currentUser.id, item.id, 'completed', 'Identity verification successful. Payout accepted by recipient.');
                // Synchronize local currentUser state
                const updated = (currentUser.customPayments || []).map(p => p.id === item.id ? { ...p, status: 'completed' } : p);
                onUpdateCurrentUserProfile({ customPayments: updated });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeclinePayout = async (item: any) => {
        setIsProcessing(true);
        try {
            if (item.txClass === 'Withdrawal') {
                await onUpdateWithdrawalStatus(currentUser.id, item.id, 'cancelled_by_user');
                // Synchronize local currentUser state
                const updated = (currentUser.withdrawals || []).map(w => w.id === item.id ? { ...w, status: 'cancelled_by_user' } : w);
                onUpdateCurrentUserProfile({ withdrawals: updated });
            } else {
                await handleUpdateCustomPaymentStatus(currentUser.id, item.id, 'cancelled_by_user', 'Recipient declined transaction protocol.');
                // Synchronize local currentUser state
                const updated = (currentUser.customPayments || []).map(p => p.id === item.id ? { ...p, status: 'cancelled_by_user' } : p);
                onUpdateCurrentUserProfile({ customPayments: updated });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdateCurrentUserProfile({ avatarUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* Identity Header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <img src={currentUser.avatarUrl} className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-white/10 shadow-2xl group-hover:opacity-75 transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-[2.5rem]">
                                <span className="bg-white text-slate-900 text-[8px] font-black uppercase px-4 py-2 rounded-xl">Update</span>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                                <span className="inline-block px-5 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">{currentUser.role} Node</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-6">Protocol Last Verified: {analytics.lastUpdate}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSwapModalOpen(true)} className="px-10 py-5 bg-white/10 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-white/20 transition-all active:scale-95 border border-white/10 backdrop-blur-md">
                        Switch Identity Node
                    </button>
                </div>
            </div>

            {/* Sub-Navigation */}
            <div className="flex gap-10 px-8 border-b dark:border-gray-800">
                <button onClick={() => setActiveTab('summary')} className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Node Performance</button>
                <button onClick={() => setActiveTab('transactions')} className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Settlement History</button>
            </div>

            {activeTab === 'summary' ? (
                <div className="space-y-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                        <SummaryMetric title="Lifetime Yield" value={`${cs}${formatAbbreviatedNumber(analytics.earned)}`} cs={cs} rawValue={analytics.earned} caption="Gross Commission Accrued" colorClass="text-emerald-600" />
                        <SummaryMetric title="In Verification" value={`${cs}${formatAbbreviatedNumber(analytics.reservedFundsValue)}`} cs={cs} rawValue={analytics.reservedFundsValue} caption="Requested Outflow" colorClass="text-amber-500" />
                        <SummaryMetric title="Settled Payouts" value={`${cs}${formatAbbreviatedNumber(analytics.totalWithdrawnValue)}`} cs={cs} rawValue={analytics.totalWithdrawnValue} caption="Disbursed To Recipient" colorClass="text-rose-600" />
                        <SummaryMetric title="Node Balance" value={`${cs}${formatAbbreviatedNumber(analytics.availableValue)}`} cs={cs} rawValue={analytics.availableValue} caption="Authorized Liquidity" colorClass="text-primary" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                                <div className="relative">
                                    {analytics.hasActiveRequest ? (
                                        <div className="text-center py-10">
                                            <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                <WarningIcon className="w-8 h-8 text-amber-500" />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Authorization Pending</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">The principal ledger is reviewing your reservation request.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-10">
                                                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Liquidation Node</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Initiate Payout from Available Yield Balance</p>
                                            </div>
                                            <button 
                                                onClick={() => setIsWithdrawalModalOpen(true)} 
                                                disabled={analytics.availableValue <= 0 || isProcessing} 
                                                className="w-full py-6 bg-primary text-white rounded-3xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-primary/30 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-4"
                                            >
                                                {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlusIcon className="w-6 h-6" />}
                                                Request Authorization
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-slate-50 dark:bg-gray-800/40 p-10 rounded-[3rem] border border-slate-100 dark:border-gray-800 h-full">
                                <h4 className="text-[11px] font-black uppercase tracking-prop0.4em] text-slate-400 mb-8">Accounting Policy</h4>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-1 h-8 bg-primary rounded-full"></div>
                                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase">Withdrawals are deducted from verified realized commissions.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-1 h-8 bg-emerald-500 rounded-full"></div>
                                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase">Remittances are authorized special payments logged for audit.</p>
                                    </div>
                                    <div className="pt-6 border-t dark:border-gray-700">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Identity Identifier: {currentUser.id.toUpperCase()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 border-b dark:border-gray-800">
                                <tr>
                                    <th className="px-10 py-8">Ledger Date</th>
                                    <th className="px-10 py-8">Protocol Class</th>
                                    <th className="px-10 py-8 text-right">Debit Value</th>
                                    <th className="px-10 py-8 text-center">Status</th>
                                    <th className="px-10 py-8 text-right">Certificate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {history.map((item) => (
                                    <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-10 py-10 whitespace-nowrap">
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm">{new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tabular-nums">ID: {item.id.slice(-8).toUpperCase()}</p>
                                        </td>
                                        <td className="px-10 py-10">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.displayType}</span>
                                        </td>
                                        <td className="px-10 py-10 text-right">
                                            <p className="font-black text-lg text-rose-600 tabular-nums">-{cs}{item.amount.toFixed(2)}</p>
                                        </td>
                                        <td className="px-10 py-10 text-center">
                                            <div className="flex flex-col gap-4 items-center">
                                                <StatusBadge status={item.status} />
                                                {item.status === 'approved_by_owner' && (
                                                    <div className="flex gap-2 animate-fade-in">
                                                        <button 
                                                            onClick={() => handleAcceptPayout(item)} 
                                                            disabled={isProcessing}
                                                            className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeclinePayout(item)} 
                                                            disabled={isProcessing}
                                                            className="px-5 py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-10 text-right">
                                            {item.status === 'completed' ? (
                                                <button 
                                                    onClick={() => item.txClass === 'Withdrawal' ? setWithdrawalReceiptToShow(item) : setPaymentReceiptToShow(item)} 
                                                    className="p-4 bg-primary/5 text-primary hover:bg-primary/10 rounded-2xl transition-all active:scale-90"
                                                >
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </button>
                                            ) : <span className="text-[10px] text-slate-300 font-bold uppercase italic tracking-widest">Pending</span>}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-40 text-center opacity-30">
                                            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Zero Ledger Entries</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Shared Modals preserved from StaffProfile */}
            <ModalShell isOpen={isSwapModalOpen} onClose={() => setIsSwapModalOpen(false)} title="Identity Matrix" description="Simulate terminal access via different personnel nodes." maxWidth="max-w-md">
                <div className="space-y-3">
                    {users.map(u => (
                        <button 
                            key={u.id} 
                            onClick={() => { onSwitchUser(u); setIsSwapModalOpen(false); }}
                            className={`w-full flex items-center gap-5 p-6 rounded-2xl border transition-all ${u.id === currentUser.id ? 'bg-primary/5 border-primary shadow-inner' : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 hover:border-primary/40'}`}
                        >
                            <img src={u.avatarUrl} className="w-14 h-14 rounded-xl object-cover border-2 border-white dark:border-gray-700" />
                            <div className="text-left flex-1 min-w-0">
                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{u.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{u.role}</p>
                            </div>
                            {u.id === currentUser.id && <span className="text-[8px] font-black text-primary uppercase bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">Active Node</span>}
                        </button>
                    ))}
                </div>
            </ModalShell>

            <WithdrawalRequestModal 
                isOpen={isWithdrawalModalOpen} 
                onClose={() => setIsWithdrawalModalOpen(false)} 
                onConfirm={(amount, source) => {
                    onRequestWithdrawal(currentUser.id, amount, source);
                    setIsWithdrawalModalOpen(false);
                }} 
                availableBalance={analytics.availableValue} 
                currencySymbol={cs} 
                source="commission" 
                isProcessing={isProcessing}
            />

            {withdrawalReceiptToShow && (
                <WithdrawalReceiptModal
                    isOpen={!!withdrawalReceiptToShow}
                    onClose={() => setWithdrawalReceiptToShow(null)}
                    withdrawal={withdrawalReceiptToShow}
                    user={currentUser}
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}

            {paymentReceiptToShow && (
                <PaymentReceiptModal
                    isOpen={!!paymentReceiptToShow}
                    onClose={() => setPaymentReceiptToShow(null)}
                    payment={paymentReceiptToShow}
                    user={currentUser}
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}
        </div>
    );
};

export default StaffProfile;
