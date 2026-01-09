// @ts-nocheck
import React, { useState, useMemo } from 'react';
import type { Sale, Deposit, User, ReceiptSettingsData, BankAccount } from '../types';
import Card from './Card';
import DepositModal from './DepositModal';
import EmptyState from './EmptyState';
import { PlusIcon, TransactionIcon, BankIcon, WarningIcon } from '../constants';
import { formatCurrency } from '../lib/utils';
import ConfirmationModal from './ConfirmationModal';

interface TransactionsProps {
    sales: Sale[];
    deposits: Deposit[];
    bankAccounts: BankAccount[];
    users: User[];
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
    onRequestDeposit: (amount: number, description: string, bankAccountId?: string) => void;
    onUpdateDepositStatus: (id: string, status: 'approved' | 'rejected') => void;
    t: (key: string) => string;
}

const Transactions: React.FC<TransactionsProps> = ({ sales = [], deposits = [], bankAccounts = [], users = [], receiptSettings, currentUser, onRequestDeposit, onUpdateDepositStatus, t }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ id: string, amount: number, title: string, variant: 'primary' | 'danger', status: 'approved' | 'rejected' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const cs = receiptSettings?.currencySymbol || '$';

    const sortedDepositsWithUser = useMemo(() => {
        return (deposits || [])
            .map(deposit => {
                const user = users.find(u => u.id === deposit.user_id);
                const bank = deposit.bank_account_id ? bankAccounts.find(b => b.id === deposit.bank_account_id) : null;
                return { 
                    ...deposit, 
                    userName: user ? user.name : 'Authorized Unit',
                    bankName: bank ? `${bank.bankName} - ${bank.accountName}` : null
                };
            })
            .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    }, [deposits, users, bankAccounts]);

    const totalPages = Math.ceil(sortedDepositsWithUser.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedDepositsWithUser.slice(start, start + itemsPerPage);
    }, [sortedDepositsWithUser, currentPage]);

    const getStatusBadge = (status: Deposit['status']) => {
        switch (status) {
            case 'pending':
                return <span className="status-badge status-pending animate-pulse">Pending Review</span>;
            case 'approved':
                return <span className="status-badge status-approved">Approved</span>;
            case 'rejected':
                return <span className="status-badge status-rejected">Rejected</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Transactions</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Cash Liquidity & Settlement Ledger</p>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {sortedDepositsWithUser.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[600px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Authorization Date</th>
                                                <th scope="col">Type</th>
                                                <th scope="col">Requested Unit</th>
                                                <th scope="col">Target Node</th>
                                                <th scope="col" className="text-right">Transaction Value</th>
                                                <th scope="col" className="text-center">Lifecycle Status</th>
                                                <th scope="col" className="text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {paginatedItems.map(deposit => (
                                                <tr key={deposit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="text-slate-500 dark:text-slate-400 tabular-nums text-xs">
                                                        {new Date(deposit.created_at || deposit.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </td>
                                                    <td>
                                                        <span className="status-badge status-approved !text-[8px]">DEPOSIT</span>
                                                    </td>
                                                    <td className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-xs">
                                                        {deposit.userName}
                                                    </td>
                                                    <td className="text-xs">
                                                        {deposit.bankName ? (
                                                            <div className="flex items-center gap-2 text-primary font-black uppercase">
                                                                <BankIcon className="w-3 h-3" />
                                                                {deposit.bankName}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 uppercase font-bold text-[10px]">Physical Treasury</span>
                                                        )}
                                                    </td>
                                                    <td className="table-num text-slate-900 dark:text-white font-black text-lg">
                                                        {formatCurrency(deposit.amount, cs)}
                                                    </td>
                                                    <td className="text-center">
                                                        {getStatusBadge(deposit.status)}
                                                    </td>
                                                    <td className="text-center">
                                                        {deposit.status === 'pending' && (
                                                            <div className="flex gap-2 justify-center">
                                                                <button 
                                                                    onClick={() => setPendingAction({ id: deposit.id, amount: deposit.amount, status: 'approved', title: 'Confirm Verification', variant: 'primary' })}
                                                                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest"
                                                                >
                                                                    Verify
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<TransactionIcon />} 
                            title="Zero deposit entries" 
                            description="No cash deposits found in the current ledger."
                            action={{ label: "Enroll Deposit", onClick: () => setIsModalOpen(true) }}
                        />
                    )}
                </div>
            </div>
            
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] flex items-center justify-center group"
            >
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll Deposit</span>
            </button>

            <DepositModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRequestDeposit={onRequestDeposit}
                maxAmount={999999}
                currencySymbol={cs}
                bankAccounts={bankAccounts}
            />

            <ConfirmationModal
                isOpen={!!pendingAction}
                onClose={() => setPendingAction(null)}
                onConfirm={() => {
                    if (pendingAction) {
                        onUpdateDepositStatus(pendingAction.id, pendingAction.status);
                        setPendingAction(null);
                    }
                }}
                title={pendingAction?.title || 'Verify Entry'}
                message={`Authorized verification for ${pendingAction?.amount ? cs + pendingAction.amount.toFixed(2) : 'this amount'}. This action updates account liquidity immediately.`}
                amount={pendingAction?.amount}
                currencySymbol={cs}
                variant={pendingAction?.variant}
            />
        </div>
    );
};

export default Transactions;