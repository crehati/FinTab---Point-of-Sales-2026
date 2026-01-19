
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import type { Expense, ReceiptSettingsData, BankAccount } from '../types';
import Card from './Card';
import { PlusIcon, ExpensesIcon, BankIcon, TodayIcon } from '../constants';
import ExpenseModal from './ExpenseModal';
import EmptyState from './EmptyState';
import { formatCurrency } from '../lib/utils';
import ModalShell from './ModalShell';
import ReportFilterModal from './ReportFilterModal';

interface ExpensesProps {
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    handleSaveExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
    bankAccounts: BankAccount[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
}

const DEFAULT_EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Marketing', 'Salaries', 'Staff Payout', 'Investor Payout', 'Staff Payment'];

const Expenses: React.FC<ExpensesProps> = ({ expenses = [], handleSaveExpense, bankAccounts = [], t, receiptSettings }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const itemsPerPage = 10;

    const [fundingSource, setFundingSource] = useState<'cash' | 'bank'>('cash');
    const [selectedBankId, setSelectedBankId] = useState('');

    const cs = receiptSettings?.currencySymbol || '$';

    useEffect(() => {
        const uniqueExistingCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))];
        const allCategories = [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...uniqueExistingCategories])];
        setCategories(allCategories.sort());
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        let result = (expenses || []).filter(e => e && e.status !== 'deleted');
        
        if (startDate) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            result = result.filter(e => new Date(e.date).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(`${endDate}T23:59:59`).getTime();
            result = result.filter(e => new Date(e.date).getTime() <= end);
        }

        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, startDate, endDate]);

    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const paginatedExpenses = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredExpenses.slice(start, start + itemsPerPage);
    }, [filteredExpenses, currentPage]);

    const onSave = (expenseData: any) => {
        handleSaveExpense({
            ...expenseData,
            paymentSource: fundingSource,
            bankAccountId: fundingSource === 'bank' ? selectedBankId : undefined
        });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Expenses</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Global Debit Ledger & Expenditure Audit</p>
                    </div>
                    <button 
                        onClick={() => setIsFilterModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-50 dark:bg-gray-800 rounded-2xl text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all border border-slate-100 dark:border-gray-700"
                    >
                        <TodayIcon className="w-4 h-4" />
                        {startDate || endDate ? `${startDate || '...'} to ${endDate || '...'}` : 'Filter by Date'}
                    </button>
                </div>

                <div className="min-h-[500px]">
                    {filteredExpenses.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[700px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Authorization Date</th>
                                                <th scope="col">Class</th>
                                                <th scope="col">Funding Node</th>
                                                <th scope="col">Identity / Context</th>
                                                <th scope="col" className="text-right">Debit Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {paginatedExpenses.map(expense => (
                                                <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="text-slate-400 font-bold tabular-nums text-xs">{new Date(expense.date).toLocaleDateString()}</td>
                                                    <td className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">{expense.category}</td>
                                                    <td className="text-[9px] font-black uppercase text-slate-400">
                                                        {expense.payment_source === 'bank' ? (
                                                            <span className="flex items-center gap-1.5 text-primary">
                                                                <BankIcon className="w-3 h-3" />
                                                                {bankAccounts.find(b => b.id === expense.bank_account_id)?.bankName || 'BANK'}
                                                            </span>
                                                        ) : 'PHYSICAL CASH'}
                                                    </td>
                                                    <td className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-xs">{expense.description}</td>
                                                    <td className="table-num text-rose-600 font-black text-base">-{formatCurrency(expense.amount, cs)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="md:hidden space-y-4">
                                {paginatedExpenses.map(expense => (
                                    <div key={expense.id} className="p-6 bg-white dark:bg-gray-800 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(expense.date).toLocaleDateString()}</span>
                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter mt-1">{expense.description}</p>
                                            </div>
                                            <p className="font-black text-rose-500 tabular-nums">-{formatCurrency(expense.amount, cs)}</p>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                                            <span className="status-badge status-neutral !text-[8px]">{expense.category}</span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{expense.payment_source}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center items-center gap-2">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-3 px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Prev</button>
                                    <div className="flex gap-2">{Array.from({ length: totalPages }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-gray-900 text-slate-400'}`}>{i + 1}</button>))}</div>
                                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-3 px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Next</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState icon={<ExpensesIcon />} title="Digital Ledger Clean" description="No expenditure has been recorded in the current terminal cycle." action={{ label: "Enroll Debit", onClick: () => setIsModalOpen(true) }} />
                    )}
                </div>
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] flex items-center justify-center group"
            >
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll Ledger Debit</span>
            </button>

            <ModalShell isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Expense Request" maxWidth="max-w-xl">
                 <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 mb-8">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-4 px-1">Funding Protocol Source</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <button onClick={() => setFundingSource('cash')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${fundingSource === 'cash' ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Physical Cash</button>
                        <button onClick={() => setFundingSource('bank')} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${fundingSource === 'bank' ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>Bank Account</button>
                    </div>
                    {fundingSource === 'bank' && (
                        <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="w-full bg-white dark:bg-gray-900 border-none rounded-xl p-3 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none">
                            <option value="">Select Bank node...</option>
                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>)}
                        </select>
                    )}
                </div>
                <ExpenseModal isOpen={true} onClose={() => setIsModalOpen(false)} onSave={onSave} categories={categories} receiptSettings={receiptSettings} />
            </ModalShell>

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

export default Expenses;
