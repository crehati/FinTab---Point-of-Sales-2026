
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import type { Sale, Deposit, User, ReceiptSettingsData, BankAccount, Expense } from '../types';
import Card from './Card';
import DepositModal from './DepositModal';
import EmptyState from './EmptyState';
import { PlusIcon, TransactionIcon, BankIcon, TodayIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import ConfirmationModal from './ConfirmationModal';
import ReportFilterModal from './ReportFilterModal';

interface TransactionsProps {
    sales: Sale[];
    deposits: Deposit[];
    bankAccounts: BankAccount[];
    expenses: Expense[];
    users: User[];
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
    onRequestDeposit: (amount: number, description: string, bankAccountId?: string) => void;
    onUpdateDepositStatus: (id: string, status: 'approved' | 'rejected') => void;
    t: (key: string) => string;
}

const StatCard: React.FC<{ title: string; value: number; cs: string; colorClass?: string; caption: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", caption }) => (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-between group hover:shadow-xl transition-all h-full">
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{title}</p>
            <p className={`text-3xl lg:text-4xl font-black ${colorClass} tracking-tighter tabular-nums leading-none`}>
                {formatCurrency(value, cs)}
            </p>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6 opacity-60 group-hover:opacity-100 transition-opacity">{caption}</p>
    </div>
);

const Transactions: React.FC<TransactionsProps> = ({ sales = [], deposits = [], bankAccounts = [], expenses = [], users = [], receiptSettings, currentUser, onRequestDeposit, onUpdateDepositStatus, t }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ id: string, amount: number, title: string, variant: 'primary' | 'danger', status: 'approved' | 'rejected' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const itemsPerPage = 10;

    const cs = receiptSettings?.currencySymbol || '$';
    const isVerifier = currentUser.role === 'Owner' || currentUser.role === 'Admin' || currentUser.role === 'Super Admin';

    const metrics = useMemo(() => {
        let fSales = sales;
        let fDeposits = deposits;
        let fExpenses = expenses;

        if (startDate) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            fSales = fSales.filter(s => new Date(s.date).getTime() >= start);
            fDeposits = fDeposits.filter(d => new Date(d.date || d.created_at).getTime() >= start);
            fExpenses = fExpenses.filter(e => new Date(e.date).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(`${endDate}T23:59:59`).getTime();
            fSales = fSales.filter(s => new Date(s.date).getTime() <= end);
            fDeposits = fDeposits.filter(d => new Date(d.date || d.created_at).getTime() <= end);
            fExpenses = fExpenses.filter(e => new Date(e.date).getTime() <= end);
        }

        const totalCashReceived = fSales
            .filter(s => (s.status === 'completed' || s.status === 'completed_bank_verified' || s.status === 'approved_by_owner') && s.paymentMethod === 'Cash')
            .reduce((sum, s) => sum + (s.total || 0), 0);

        const totalCashDeposited = fDeposits
            .filter(d => d.status === 'approved')
            .reduce((sum, d) => sum + (d.amount || 0), 0);

        const totalCashExpenses = fExpenses
            .filter(e => e.status !== 'deleted' && e.paymentSource === 'cash')
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        const cashOnHand = totalCashReceived - totalCashExpenses - totalCashDeposited;

        return { totalCashReceived, totalCashDeposited, cashOnHand };
    }, [sales, expenses, deposits, startDate, endDate]);

    const displayDeposits = useMemo(() => {
        let result = [...(deposits || [])];
        
        if (startDate) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            result = result.filter(d => new Date(d.date || d.created_at).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(`${endDate}T23:59:59`).getTime();
            result = result.filter(d => new Date(d.date || d.created_at).getTime() <= end);
        }

        return result.map(deposit => {
            const user = users.find(u => u.id === deposit.user_id);
            const bank = deposit.bank_account_id ? bankAccounts.find(b => b.id === deposit.bank_account_id) : null;
            return { 
                ...deposit, 
                userName: user ? user.name : 'Authorized unit',
                userRole: user ? user.role : 'Staff',
                bankName: bank ? `${bank.bankName} - ${bank.accountName}` : 'Physical Treasury'
            };
        }).sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.date).getTime());
    }, [deposits, users, bankAccounts, startDate, endDate]);

    const totalPages = Math.ceil(displayDeposits.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return displayDeposits.slice(start, start + itemsPerPage);
    }, [displayDeposits, currentPage]);

    const getStatusBadge = (status: Deposit['status']) => {
        switch (status) {
            case 'pending':
                return <span className="status-badge status-pending animate-pulse uppercase tracking-[0.2em] text-[8px] px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100">In Review</span>;
            case 'approved':
                return <span className="status-badge status-approved uppercase tracking-[0.2em] text-[8px] px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100">Verified</span>;
            case 'rejected':
                return <span className="status-badge status-rejected uppercase tracking-[0.2em] text-[8px] px-3 py-1 bg-rose-50 text-rose-600 border-rose-100">Flagged</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-10 animate-fade-in font-sans pb-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Cash Received" value={metrics.totalCashReceived} cs={cs} caption="Gross Cash Inflow" colorClass="text-emerald-500" />
                <StatCard title="Total Cash Deposited" value={metrics.totalCashDeposited} cs={cs} caption="Verified Ledger Outflow" colorClass="text-rose-500" />
                <div className="bg-primary p-8 rounded-[3rem] shadow-2xl shadow-primary/30 flex flex-col justify-between group transition-all relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-4">Cash on Hand</p>
                        <p className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none">
                            {formatCurrency(metrics.cashOnHand, cs)}
                        </p>
                    </div>
                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-8">Physical Tray Liquidity</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl p-8 sm:p-12 border border-slate-50 dark:border-gray-800 flex flex-col min-h-[700px]">
                <header className="flex flex-col xl:flex-row xl:justify-between xl:items-end mb-12 gap-10">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Audit Ledger</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Fiscal Authorization History</p>
                    </div>
                    <button 
                        onClick={() => setIsFilterModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-50 dark:bg-gray-800 rounded-2xl text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all border border-slate-100 dark:border-gray-700"
                    >
                        <TodayIcon className="w-4 h-4" />
                        {startDate || endDate ? `${startDate || '...'} to ${endDate || '...'}` : 'Filter by Date'}
                    </button>
                </header>

                <div className="flex-1">
                    {paginatedItems.length > 0 ? (
                        <>
                            <div className="hidden md:block overflow-x-auto border dark:border-gray-800 rounded-[2.5rem] bg-slate-50/20">
                                <table className="w-full text-left table-auto">
                                    <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        <tr>
                                            <th className="px-8 py-6 whitespace-nowrap">Timestamp</th>
                                            <th className="px-8 py-6 whitespace-nowrap">Agent Identity</th>
                                            <th className="px-8 py-6">Audit Memo</th>
                                            <th className="px-8 py-6 text-right whitespace-nowrap">Value</th>
                                            <th className="px-8 py-6 text-center whitespace-nowrap">Status</th>
                                            {isVerifier && <th className="px-8 py-6 text-center w-[320px]">Governance Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-800 bg-white dark:bg-gray-900">
                                        {paginatedItems.map(deposit => (
                                            <tr key={deposit.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-8 py-6 text-slate-400 tabular-nums font-bold text-[11px] whitespace-nowrap">
                                                    {new Date(deposit.created_at || deposit.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xs">{deposit.userName}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed">"{deposit.description}"</p>
                                                    <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[8px] mt-2">
                                                        <BankIcon className="w-2.5 h-2.5" />
                                                        Node: {deposit.bankName}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white text-lg tabular-nums whitespace-nowrap">
                                                    {formatCurrency(deposit.amount, cs)}
                                                </td>
                                                <td className="px-8 py-6 text-center whitespace-nowrap">
                                                    {getStatusBadge(deposit.status)}
                                                </td>
                                                {isVerifier && (
                                                    <td className="px-8 py-6">
                                                        {deposit.status === 'pending' ? (
                                                            <div className="flex gap-4 justify-center whitespace-nowrap">
                                                                <button 
                                                                    onClick={() => setPendingAction({ id: deposit.id, amount: deposit.amount, status: 'approved', title: 'Verify Settlement', variant: 'primary' })}
                                                                    className="flex-1 px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                                                >
                                                                    Approve
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic opacity-50">Audit Finalized</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-12 flex justify-center items-center gap-3">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-3 px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30 border border-slate-100 dark:border-gray-800">Prev</button>
                                    <div className="flex gap-2">{Array.from({ length: totalPages }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-slate-400'}`}>{i + 1}</button>))}</div>
                                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-3 px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30 border border-slate-100 dark:border-gray-800">Next</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState 
                            icon={<TransactionIcon />} 
                            title="Audit Ledger Empty" 
                            description="Financial settlement events will appear here in the fiscal grid."
                            action={{ label: "Enroll Deposit", onClick: () => setIsModalOpen(true) }}
                        />
                    )}
                </div>
            </div>
            
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2.5rem] p-7 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] flex items-center justify-center group"
            >
                <PlusIcon className="w-8 h-8" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-4 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll Settlement</span>
            </button>

            <DepositModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRequestDeposit={onRequestDeposit}
                maxAmount={metrics.cashOnHand}
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
                title={pendingAction?.title || 'Audit Signature'}
                message={`Authorize digital signature for ${pendingAction?.amount ? cs + pendingAction.amount.toFixed(2) : 'this amount'}.`}
                amount={pendingAction?.amount}
                currencySymbol={cs}
                variant={pendingAction?.variant}
                confirmLabel="Finalize Verification"
            />

            <ReportFilterModal 
                isOpen={isFilterModalOpen} 
                onClose={() => setIsFilterModalOpen(false)} 
                onApply={(s, e) => { setStartDate(s); setEndDate(e); setCurrentPage(1); }}
                initialStart={startDate}
                initialEnd={endDate}
            />
        </div>
    );
};

export default Transactions;
