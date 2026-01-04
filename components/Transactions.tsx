
import React, { useState, useMemo } from 'react';
import type { Sale, Deposit, User, ReceiptSettingsData, BankAccount } from '../types';
import Card from './Card';
import DepositModal from './DepositModal';
import EmptyState from './EmptyState';
import { PlusIcon, TransactionIcon, BankIcon } from '../constants';
import { formatCurrency } from '../lib/utils';

interface TransactionsProps {
    sales: Sale[];
    deposits: Deposit[];
    bankAccounts: BankAccount[];
    users: User[];
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
    onRequestDeposit: (amount: number, description: string, bankAccountId?: string) => void;
    t: (key: string) => string;
}

const Transactions: React.FC<TransactionsProps> = ({ sales = [], deposits = [], bankAccounts = [], users = [], receiptSettings, currentUser, onRequestDeposit, t }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const cs = receiptSettings?.currencySymbol || '$';

    const totalCashReceived = useMemo(() =>
        sales
            .filter(s => s && s.paymentMethod === 'Cash' && s.status === 'completed')
            .reduce((sum, sale) => sum + (sale.cashReceived || sale.total), 0),
    [sales]);

    const totalCashDeposited = useMemo(() =>
        deposits
            .filter(d => d && d.status === 'approved')
            .reduce((sum, d) => sum + d.amount, 0),
    [deposits]);
    
    const cashOnHand = totalCashReceived - totalCashDeposited;
    
    const sortedDepositsWithUser = useMemo(() => {
        return deposits
            .map(deposit => {
                const user = users.find(u => u.id === deposit.userId);
                const bank = deposit.bankAccountId ? bankAccounts.find(b => b.id === deposit.bankAccountId) : null;
                return { 
                    ...deposit, 
                    userName: user ? user.name : 'Unknown User',
                    bankName: bank ? `${bank.bankName} - ${bank.accountName}` : null
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [deposits, users, bankAccounts]);

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
                    
                    <div className="w-full md:w-auto grid grid-cols-2 md:flex gap-4">
                        <div className="bg-slate-50 dark:bg-gray-800 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700 text-center min-w-[140px] shadow-inner">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Platform Pool</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{cs}{totalCashReceived.toFixed(0)}</p>
                        </div>
                        <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 text-center min-w-[140px] shadow-inner">
                            <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">Cash on Hand</p>
                            <p className="text-xl font-black text-primary tabular-nums">{cs}{cashOnHand.toFixed(0)}</p>
                        </div>
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
                                                <th scope="col">Authorization Timestamp</th>
                                                <th scope="col">Requested Identity</th>
                                                <th scope="col">Target Destination</th>
                                                <th scope="col">Audit Memo</th>
                                                <th scope="col" className="text-right">Transaction Value</th>
                                                <th scope="col" className="text-center">Lifecycle Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {sortedDepositsWithUser.map(deposit => (
                                                <tr key={deposit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="text-slate-500 dark:text-slate-400 tabular-nums text-xs">
                                                        {new Date(deposit.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
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
                                                    <td className="text-slate-400 italic text-xs">
                                                        "{deposit.description}"
                                                    </td>
                                                    <td className="table-num text-slate-900 dark:text-white font-black text-lg">
                                                        {formatCurrency(deposit.amount, cs)}
                                                    </td>
                                                    <td className="text-center">
                                                        {getStatusBadge(deposit.status)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="md:hidden space-y-4">
                                {sortedDepositsWithUser.map(deposit => (
                                    <div key={deposit.id} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm truncate">"{deposit.description}"</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {new Date(deposit.date).toLocaleDateString()} &bull; {deposit.userName}
                                                </p>
                                                {deposit.bankName && (
                                                    <p className="text-[9px] font-black text-primary uppercase mt-1 flex items-center gap-1">
                                                        <BankIcon className="w-3 h-3" /> {deposit.bankName}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="font-black text-xl text-slate-900 dark:text-white tabular-nums ml-4">{formatCurrency(deposit.amount, cs)}</p>
                                        </div>
                                        <div className="text-right pt-4 border-t dark:border-gray-700">
                                            {getStatusBadge(deposit.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<TransactionIcon />} 
                            title="Zero deposit entries" 
                            description="No cash deposits have been requested or verified in the current ledger."
                            action={cashOnHand > 0 ? { label: "Initialize Deposit", onClick: () => setIsModalOpen(true) } : undefined}
                        />
                    )}
                </div>
            </div>
            
            <button
                onClick={() => setIsModalOpen(true)}
                disabled={cashOnHand <= 0}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] disabled:bg-slate-300 flex items-center justify-center group"
            >
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll Deposit</span>
            </button>

            <DepositModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRequestDeposit={onRequestDeposit}
                maxAmount={cashOnHand}
                currencySymbol={cs}
                bankAccounts={bankAccounts}
            />
        </div>
    );
};

export default Transactions;
