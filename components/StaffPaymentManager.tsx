
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
        return users.flatMap(user =>
            (user.customPayments || []).map(p => ({ ...p, user }))
        ).sort((a, b) => new Date(b.dateInitiated).getTime() - new Date(a.dateInitiated).getTime());
    }, [users]);

    // Fix: Filter using correct status 'approved_by_owner' instead of the undeclared 'approved'.
    const awaitingPayout = useMemo(() => allPayments.filter(p => p.status === 'approved_by_owner'), [allPayments]);
    
    // Fix: Update history filter to use precise status codes 'pending_owner_approval' and 'approved_by_owner'.
    const history = useMemo(() => allPayments.filter(p => p.status !== 'pending_owner_approval' && p.status !== 'approved_by_owner'), [allPayments]);

    const handleDraftConfirm = (targetUserId: string, amount: number, description: string) => {
        handleInitiateCustomPayment(targetUserId, amount, description);
        setIsDraftModalOpen(false);
    };

    const getStatusBadge = (status: CustomPayment['status']) => {
        // Fix: Update styles mapping keys to match actual CustomPayment status values.
        const styles: Record<CustomPayment['status'], string> = {
            pending_owner_approval: 'bg-yellow-100 text-yellow-800',
            rejected_by_owner: 'bg-red-100 text-red-800',
            approved_by_owner: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled_by_user: 'bg-gray-100 text-gray-800',
        };
        // Fix: Update text mapping keys to match actual CustomPayment status values.
        const text: Record<CustomPayment['status'], string> = {
            pending_owner_approval: 'Pending Owner Approval',
            rejected_by_owner: 'Rejected by Owner',
            approved_by_owner: 'Approved by Owner',
            completed: 'Completed',
            cancelled_by_user: 'Cancelled by User',
        };
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('awaitingPayout')}
                            className={`relative whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'awaitingPayout' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Awaiting Payout
                            {awaitingPayout.length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{awaitingPayout.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            History
                        </button>
                    </nav>
                </div>
                <button onClick={() => setIsDraftModalOpen(true)} className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow">
                    <PlusIcon />
                    <span>Draft New Payment</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Staff Member</th>
                            <th scope="col" className="px-6 py-3">Date Initiated</th>
                            <th scope="col" className="px-6 py-3">Amount</th>
                            <th scope="col" className="px-6 py-3">Description</th>
                            <th scope="col" className="px-6 py-3 text-center">Status/Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(activeTab === 'awaitingPayout' ? awaitingPayout : history).map(payment => (
                            <tr key={payment.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{payment.user.name}</td>
                                <td className="px-6 py-4">{new Date(payment.dateInitiated).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-semibold">{cs}{payment.amount.toFixed(2)}</td>
                                <td className="px-6 py-4">{payment.description}</td>
                                <td className="px-6 py-4 text-center">
                                    {/* Fix: Use the correct 'approved_by_owner' status check and trigger 'completed' as the target status. */}
                                    {payment.status === 'approved_by_owner' ? (
                                        <button onClick={() => handleUpdateCustomPaymentStatus(payment.user.id, payment.id, 'completed')} className="px-3 py-1 text-xs font-semibold text-white bg-primary rounded-md hover:bg-blue-700">
                                            Mark as Paid
                                        </button>
                                    ) : (
                                        getStatusBadge(payment.status)
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {(activeTab === 'awaitingPayout' && awaitingPayout.length === 0) && (
                    <div className="text-center py-10 text-gray-500">No payments awaiting payout.</div>
                )}
                {(activeTab === 'history' && history.length === 0) && (
                    <div className="text-center py-10 text-gray-500">No payment history found.</div>
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
