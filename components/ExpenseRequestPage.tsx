
import React, { useState, useMemo } from 'react';
import type { ExpenseRequest, User, ReceiptSettingsData, Expense } from '../types';
import { PlusIcon, WarningIcon, ExpensesIcon } from '../constants';
import ExpenseRequestModal from './ExpenseRequestModal';
import EmptyState from './EmptyState';
import { formatCurrency } from '../lib/utils';

interface ExpenseRequestPageProps {
    expenseRequests: ExpenseRequest[];
    expenses: Expense[];
    currentUser: User;
    handleRequestExpense: (requestData: Omit<ExpenseRequest, 'id' | 'date' | 'userId' | 'status'>) => void;
    receiptSettings: ReceiptSettingsData;
    t: (key: string) => string;
}

const DEFAULT_EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Marketing', 'Salaries', 'Staff Payout', 'Travel', 'Meals'];

const ExpenseRequestPage: React.FC<ExpenseRequestPageProps> = ({ 
    expenseRequests = [], 
    expenses = [], 
    currentUser, 
    handleRequestExpense, 
    receiptSettings, 
    t 
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const cs = receiptSettings.currencySymbol;

    const myRequests = useMemo(() => 
        expenseRequests
            .filter(req => req && req.userId === currentUser?.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenseRequests, currentUser?.id]);
    
    const expenseCategories = useMemo(() => {
        const uniqueExistingCategories = [...new Set([...expenses.map(e => e.category), ...expenseRequests.map(r => r.category)])].filter(Boolean);
        const allCategories = [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...uniqueExistingCategories])];
        return allCategories.sort();
    }, [expenses, expenseRequests]);

    const getStatusBadge = (status: ExpenseRequest['status']) => {
        switch (status) {
            case 'pending':
                return <span className="status-badge status-pending animate-pulse">In Review</span>;
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
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">My Requests</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Personnel Expense Verification Queue</p>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-gray-800 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700 shadow-inner flex items-center gap-6">
                        <div className="text-center px-4">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Requests</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{myRequests.filter(r => r.status === 'pending').length}</p>
                        </div>
                        <div className="h-10 w-px bg-slate-200 dark:bg-gray-700"></div>
                        <div className="text-center px-4">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Disbursed Val</p>
                            <p className="text-2xl font-black text-emerald-600 tabular-nums">{cs}{myRequests.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0).toFixed(0)}</p>
                        </div>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {myRequests.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[600px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Submission Timestamp</th>
                                                <th scope="col">Audit Class</th>
                                                <th scope="col">Description</th>
                                                <th scope="col" className="text-right">Requested Value</th>
                                                <th scope="col" className="text-center">Lifecycle Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {myRequests.map(req => (
                                                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="text-slate-500 dark:text-slate-400 tabular-nums text-xs">
                                                        {new Date(req.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="status-badge status-neutral !text-[8px]">{req.category}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-xs uppercase tracking-tight text-slate-900 dark:text-white truncate max-w-[200px]">{req.description}</p>
                                                        {req.merchant && <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Vendor: {req.merchant}</p>}
                                                    </td>
                                                    <td className="table-num text-slate-900 dark:text-white font-black">
                                                        {formatCurrency(req.amount, cs)}
                                                    </td>
                                                    <td className="text-center">
                                                        {getStatusBadge(req.status)}
                                                        {req.status === 'rejected' && req.rejectionReason && (
                                                            <p className="text-[8px] text-rose-500 font-bold uppercase mt-1 italic">Audit Note: {req.rejectionReason}</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="md:hidden space-y-4">
                                {myRequests.map(req => (
                                    <div key={req.id} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-gray-700">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base truncate max-w-[180px]">{req.description}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(req.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-xl text-slate-900 dark:text-white tabular-nums">{formatCurrency(req.amount, cs)}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{req.paymentMethod}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end pt-4 border-t dark:border-gray-700">
                                            <span className="status-badge status-neutral !text-[8px]">{req.category}</span>
                                            {getStatusBadge(req.status)}
                                        </div>
                                        {req.status === 'rejected' && req.rejectionReason && (
                                            <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Rejection Memo</p>
                                                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium italic leading-normal">"{req.rejectionReason}"</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<ExpensesIcon />} 
                            title="Digital Ledger Clean" 
                            description="Initialize the authorization flow by submitting your first expense request."
                            action={{ label: "Enroll Request", onClick: () => setIsModalOpen(true) }}
                        />
                    )}
                </div>
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] flex items-center justify-center group"
                aria-label="New expense request"
            >
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">New Payout Request</span>
            </button>

            <ExpenseRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleRequestExpense}
                categories={expenseCategories}
                receiptSettings={receiptSettings}
            />
        </div>
    );
};

export default ExpenseRequestPage;
