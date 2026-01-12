
// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { User, Sale, ReceiptSettingsData, Withdrawal, CustomPayment, BusinessProfile } from '../types';
import Card from './Card';
import WithdrawalRequestModal from './WithdrawalRequestModal';
import WithdrawalReceiptModal from './WithdrawalReceiptModal';
import PaymentReceiptModal from './PaymentReceiptModal';
import ModalShell from './ModalShell';
import { formatAbbreviatedNumber, formatCurrency } from '../lib/utils';
import { WarningIcon, PlusIcon, CloseIcon, TransactionIcon } from '../constants';

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

    return <span className={`status-badge ${statusClass} !text-[8px] !px-3 !py-1`}>{item.label}</span>;
};

const StaffProfile: React.FC<StaffProfileProps> = ({ currentUser, users, sales, receiptSettings, onRequestWithdrawal, onUpdateWithdrawalStatus, handleUpdateCustomPaymentStatus, businessProfile, onSwitchUser, onConfirmWithdrawalReceived, onUpdateCurrentUserProfile }) => {
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [withdrawalReceiptToShow, setWithdrawalReceiptToShow] = useState<Withdrawal | null>(null);
    const [paymentReceiptToShow, setPaymentReceiptToShow] = useState<CustomPayment | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const cs = receiptSettings.currencySymbol || '$';

    const analytics = useMemo(() => {
        const mySales = (sales || []).filter(s => s.userId === currentUser.id && s.status === 'completed');
        const earned = mySales.reduce((sum, s) => sum + (s.commission || 0), 0);
        
        const totalWithdrawnValue = (currentUser.withdrawals || [])
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + w.amount, 0);
            
        const reservedFundsValue = (currentUser.withdrawals || [])
            .filter(w => ['pending', 'approved_by_owner'].includes(w.status))
            .reduce((sum, w) => sum + w.amount, 0);

        const availableValue = Math.max(0, earned - totalWithdrawnValue - reservedFundsValue);
        
        const trend = [];
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayComm = mySales.filter(s => s.date.startsWith(dateStr)).reduce((sum, s) => sum + (s.commission || 0), 0);
            trend.push({ name: d.toLocaleDateString(undefined, { weekday: 'short' }), yield: dayComm });
        }

        const hasActiveRequest = (currentUser.withdrawals || []).some(w => ['pending', 'approved_by_owner'].includes(w.status) && w.source === 'commission');

        return { earned, totalWithdrawnValue, reservedFundsValue, availableValue, hasActiveRequest, trend };
    }, [currentUser, sales]);

    const history = useMemo(() => {
        const wds = (currentUser.withdrawals || []).map(w => ({ ...w, displayType: 'Yield Withdrawal', date: w.date, txClass: 'Withdrawal' }));
        const pms = (currentUser.customPayments || []).map(p => ({ ...p, displayType: 'Staff Remittance', date: p.dateInitiated, txClass: 'Payment' }));
        return [...wds, ...pms].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [currentUser]);

    const handleAcceptPayout = async (item: any) => {
        setIsProcessing(true);
        try {
            if (item.txClass === 'Withdrawal') await onConfirmWithdrawalReceived(currentUser.id, item.id);
            else await handleUpdateCustomPaymentStatus(currentUser.id, item.id, 'completed', 'Accepted by recipient node.');
        } finally { setIsProcessing(false); }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                        <div className="relative">
                            <img src={currentUser.avatarUrl} className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-white/10 shadow-2xl" />
                        </div>
                        <div>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{currentUser.name}</h1>
                                <span className="inline-block px-5 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">{currentUser.role} Node</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-6">Identity Identifier: {currentUser.id.toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-10 px-8 border-b dark:border-gray-800">
                <button onClick={() => setActiveTab('summary')} className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Performance Summary</button>
                <button onClick={() => setActiveTab('transactions')} className={`py-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-4 ${activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Settlement Ledger</button>
            </div>

            {activeTab === 'summary' ? (
                <div className="space-y-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                        <SummaryMetric title="Accrued Yield" value={`${cs}${formatAbbreviatedNumber(analytics.earned)}`} cs={cs} rawValue={analytics.earned} caption="Lifetime Commission Inflow" colorClass="text-emerald-600" />
                        <SummaryMetric title="In Verification" value={`${cs}${formatAbbreviatedNumber(analytics.reservedFundsValue)}`} cs={cs} rawValue={analytics.reservedFundsValue} caption="Awaiting Audit" colorClass="text-amber-500" />
                        <SummaryMetric title="Settled Total" value={`${cs}${formatAbbreviatedNumber(analytics.totalWithdrawnValue)}`} cs={cs} rawValue={analytics.totalWithdrawnValue} caption="Disbursed Funds" colorClass="text-rose-600" />
                        <SummaryMetric title="Available Balance" value={`${cs}${formatAbbreviatedNumber(analytics.availableValue)}`} cs={cs} rawValue={analytics.availableValue} caption="Authorized Liquidity" colorClass="text-primary" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2">
                            <Card title="Commission Yield Velocity (7D)">
                                <div className="h-[300px] w-full mt-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics.trend}>
                                            <defs>
                                                <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                            <Area type="monotone" dataKey="yield" stroke="#2563EB" fillOpacity={1} fill="url(#colorYield)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 h-full flex flex-col justify-between">
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8">Liquidation Node</h4>
                                    {analytics.hasActiveRequest ? (
                                        <div className="text-center py-6">
                                            <WarningIcon className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Request pending principal authorization.</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase tracking-tight">Initiate payout protocol from available yield balance.</p>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setIsWithdrawalModalOpen(true)} 
                                    disabled={analytics.availableValue <= 0 || analytics.hasActiveRequest} 
                                    className="w-full py-6 bg-primary text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30"
                                >
                                    Request Payout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                <tr>
                                    <th className="px-10 py-8">Timestamp</th>
                                    <th className="px-10 py-8">Protocol Class</th>
                                    <th className="px-10 py-8 text-right">Debit Value</th>
                                    <th className="px-10 py-8 text-center">Status</th>
                                    <th className="px-10 py-8 text-right">Certificate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-10 py-8 font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xs tabular-nums">{new Date(item.date).toLocaleString()}</td>
                                        <td className="px-10 py-8"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.displayType}</span></td>
                                        <td className="px-10 py-8 text-right"><p className="font-black text-rose-600 tabular-nums">-{cs}{item.amount.toFixed(2)}</p></td>
                                        <td className="px-10 py-8 text-center">
                                            <div className="flex flex-col gap-2 items-center">
                                                <StatusBadge status={item.status} />
                                                {item.status === 'approved_by_owner' && (
                                                    <button onClick={() => handleAcceptPayout(item)} className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">Accept Funds</button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            {item.status === 'completed' && (
                                                <button onClick={() => item.txClass === 'Withdrawal' ? setWithdrawalReceiptToShow(item) : setPaymentReceiptToShow(item)} className="p-3 bg-primary/5 text-primary rounded-xl hover:bg-primary/10 transition-all"><TransactionIcon /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <WithdrawalRequestModal 
                isOpen={isWithdrawalModalOpen} 
                onClose={() => setIsWithdrawalModalOpen(false)} 
                onConfirm={(amount, source) => { onRequestWithdrawal(currentUser.id, amount, source); setIsWithdrawalModalOpen(false); }} 
                availableBalance={analytics.availableValue} 
                currencySymbol={cs} 
                source="commission" 
            />

            {withdrawalReceiptToShow && (
                <WithdrawalReceiptModal 
                    isOpen={!!withdrawalReceiptToShow} 
                    onClose={() => setWithdrawalReceiptToShow(null)} 
                    withdrawal={withdrawalReceiptToShow} 
                    user={currentUser} 
                    receiptSettings={receiptSettings} 
                />
            )}
            
            {paymentReceiptToShow && (
                <PaymentReceiptModal 
                    isOpen={!!paymentReceiptToShow} 
                    onClose={() => setPaymentReceiptToShow(null)} 
                    payment={paymentReceiptToShow} 
                    user={currentUser} 
                    receiptSettings={receiptSettings} 
                />
            )}
        </div>
    );
};

export default StaffProfile;
