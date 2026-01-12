
import React, { useState, useMemo } from 'react';
import type { User, ReceiptSettingsData, CustomPayment } from '../types';
import { PlusIcon } from '../constants';
import DraftPaymentModal from './DraftPaymentModal';

interface StaffPaymentManagerProps {
    users: User[];
    receiptSettings: ReceiptSettingsData;
    handleInitiateCustomPayment: (targetUserId: string, amount: number, description: string) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status']) => void;
}

const StaffPaymentManager: React.FC<StaffPaymentManagerProps> = ({ users, receiptSettings, handleInitiateCustomPayment, handleUpdateCustomPaymentStatus }) => {
    const [activeTab, setActiveTab] = useState<'awaitingPayout' | 'history'>('awaitingPayout');
    const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

    const cs = receiptSettings.currencySymbol;

    const allPayments = useMemo(() => {
        return (users || []).flatMap(user =>
            (user.customPayments || []).map(p => ({ ...p, user }))
        ).sort((a, b) => new Date(b.dateInitiated).getTime() - new Date(a.dateInitiated).getTime());
    }, [users]);

    const awaitingPayout = useMemo(() => allPayments.filter(p => p.status === 'approved_by_owner' || p.status === 'pending_owner_approval'), [allPayments]);
    const history = useMemo(() => allPayments.filter(p => p.status === 'completed' || p.status === 'rejected_by_owner' || p.status === 'cancelled_by_user'), [allPayments]);

    const handleDraftConfirm = (targetUserId: string, amount: number, description: string) => {
        handleInitiateCustomPayment(targetUserId, amount, description);
        setIsDraftModalOpen(false);
    };

    const getStatusBadge = (status: CustomPayment['status']) => {
        const styles: Record<CustomPayment['status'], string> = {
            pending_owner_approval: 'bg-yellow-100 text-yellow-800',
            rejected_by_owner: 'bg-red-100 text-red-800',
            approved_by_owner: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled_by_user: 'bg-gray-100 text-gray-800',
        };
        const text: Record<CustomPayment['status'], string> = {
            pending_owner_approval: 'Review Required',
            rejected_by_owner: 'Declined',
            approved_by_owner: 'Authorized',
            completed: 'Settled',
            cancelled_by_user: 'Voided',
        };
        return <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg ${styles[status]}`}>{text[status]}</span>;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
                <div className="flex bg-slate-50 dark:bg-gray-800 p-1.5 rounded-2xl border border-slate-100 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('awaitingPayout')}
                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'awaitingPayout' ? 'bg-primary text-white shadow-lg' : 'text-slate-400'}`}
                    >
                        Pending Queue ({awaitingPayout.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-lg' : 'text-slate-400'}`}
                    >
                        Archive
                    </button>
                </div>
                <button onClick={() => setIsDraftModalOpen(true)} className="flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">
                    <PlusIcon className="w-4 h-4" />
                    <span>Issue Remittance</span>
                </button>
            </div>

            <div className="table-wrapper border-none rounded-none -mx-6 px-6">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <tr>
                            <th className="px-6 py-4">Recipient</th>
                            <th className="px-6 py-4">Auth Date</th>
                            <th className="px-6 py-4">Value</th>
                            <th className="px-6 py-4">Context</th>
                            <th className="px-6 py-4 text-center">Protocol Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                        {(activeTab === 'awaitingPayout' ? awaitingPayout : history).map(payment => (
                            <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <img src={payment.user?.avatarUrl} className="w-8 h-8 rounded-xl object-cover" />
                                        <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-xs">{payment.user?.name}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-slate-400 font-bold tabular-nums text-xs">{new Date(payment.dateInitiated).toLocaleDateString()}</td>
                                <td className="px-6 py-5 font-black text-slate-900 dark:text-white tabular-nums">{cs}{payment.amount.toFixed(2)}</td>
                                <td className="px-6 py-5 text-slate-500 text-xs font-medium max-w-[200px] truncate">{payment.description}</td>
                                <td className="px-6 py-5 text-center">
                                    {payment.status === 'approved_by_owner' ? (
                                        <button onClick={() => handleUpdateCustomPaymentStatus(payment.user.id, payment.id, 'completed')} className="px-6 py-2 text-[9px] font-black text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 uppercase tracking-widest transition-all">
                                            Settle Now
                                        </button>
                                    ) : (
                                        getStatusBadge(payment.status)
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {((activeTab === 'awaitingPayout' ? awaitingPayout : history).length === 0) && (
                    <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-[10px]">Registry Empty</div>
                )}
            </div>

            <DraftPaymentModal
                isOpen={isDraftModalOpen}
                onClose={() => setIsDraftModalOpen(false)}
                onConfirm={handleDraftConfirm}
                users={users}
                currencySymbol={cs}
            />
        </div>
    );
};

export default StaffPaymentManager;
