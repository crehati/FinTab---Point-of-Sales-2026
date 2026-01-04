
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import type { Expense, ReceiptSettingsData } from '../types';
import Card from './Card';
import { PlusIcon, DeleteIcon, ReportsIcon, LinkIcon, WarningIcon, ExpensesIcon } from '../constants';
import ExpenseModal from './ExpenseModal';
import ConfirmationModal from './ConfirmationModal';
import EmptyState from './EmptyState';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';

interface ExpensesProps {
    expenses: Expense[];
    setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
}

const DEFAULT_EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Marketing', 'Salaries', 'Staff Payout', 'Investor Payout', 'Staff Payment'];

const Expenses: React.FC<ExpensesProps> = ({ expenses = [], setExpenses, t, receiptSettings }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

    const cs = receiptSettings?.currencySymbol || '$';

    useEffect(() => {
        const uniqueExistingCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))];
        const allCategories = [...new Set([...DEFAULT_EXPENSE_CATEGORIES, ...uniqueExistingCategories])];
        setCategories(allCategories.sort());
    }, [expenses]);

    const visibleExpenses = useMemo(() => 
        (expenses || [])
            .filter(e => e && e.status !== 'deleted')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    , [expenses]);

    const metrics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const total = visibleExpenses.reduce((sum, e) => sum + e.amount, 0);
        const mtd = visibleExpenses.filter(e => new Date(e.date) >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);
        return { total, mtd };
    }, [visibleExpenses]);

    const handleSaveExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
        const newExpense: Expense = { ...expenseData, id: `exp-${Date.now()}`, date: new Date().toISOString(), status: 'active' };
        setExpenses(prev => [newExpense, ...prev]);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (expense: Expense) => { setExpenseToDelete(expense); setIsConfirmModalOpen(true); };

    const handleConfirmDelete = () => {
        if (expenseToDelete) setExpenses(prev => prev.map(exp => exp.id === expenseToDelete.id ? { ...exp, status: 'deleted' as const } : exp));
        setIsConfirmModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Expenses</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Global Debit Ledger & Expenditure Audit</p>
                    </div>
                    
                    <div className="w-full md:w-auto grid grid-cols-2 md:flex gap-4">
                        <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 text-center min-w-[140px] shadow-inner">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lifetime Outflow</p>
                            <p className="text-lg font-black text-rose-600 tabular-nums">{cs}{formatAbbreviatedNumber(metrics.total)}</p>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-center min-w-[140px] shadow-inner">
                            <p className="text-[8px] font-black text-primary uppercase tracking-widest">Monthly Burn</p>
                            <p className="text-lg font-black text-primary tabular-nums">{cs}{formatAbbreviatedNumber(metrics.mtd)}</p>
                        </div>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {visibleExpenses.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[700px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Authorization Date</th>
                                                <th scope="col">Protocol Class</th>
                                                <th scope="col">Identity / Context</th>
                                                <th scope="col" className="text-right">Debit Value</th>
                                                <th scope="col" className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {visibleExpenses.map(expense => {
                                                const isAuto = expense.id.startsWith('exp-wd-') || expense.id.startsWith('exp-cp-');
                                                return (
                                                    <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="text-slate-400 font-bold tabular-nums text-xs">{new Date(expense.date).toLocaleDateString()}</td>
                                                        <td className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">{expense.category}</td>
                                                        <td className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-xs">
                                                            <div className="flex items-center gap-3">
                                                                {isAuto && <LinkIcon className="w-3 h-3 text-primary" />}
                                                                {expense.description}
                                                            </div>
                                                        </td>
                                                        <td className="table-num text-rose-600 font-black text-base">-{formatCurrency(expense.amount, cs)}</td>
                                                        <td className="text-right">
                                                            {!isAuto && (
                                                                <button onClick={() => handleDeleteClick(expense)} className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:underline">Purge</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="md:hidden space-y-4">
                                {visibleExpenses.map(expense => (
                                    <div key={expense.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm truncate">{expense.description}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{expense.category}</p>
                                            </div>
                                            <p className="font-black text-xl text-rose-600 tabular-nums ml-4">-{formatCurrency(expense.amount, cs)}</p>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(expense.date).toLocaleDateString()}</p>
                                            {!expense.id.startsWith('exp-wd-') && (
                                                <button onClick={() => handleDeleteClick(expense)} className="text-[9px] font-black uppercase text-rose-500">Archive</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<ExpensesIcon />} 
                            title="Digital Ledger Clean" 
                            description="No expenditure has been recorded in the current terminal cycle."
                            action={{ label: "Enroll Debit", onClick: () => setIsModalOpen(true) }}
                        />
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

            <ExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveExpense} categories={categories} receiptSettings={receiptSettings} />
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="De-authorize Debit" message={`Verify de-authorization of "${expenseToDelete?.description}". This will archive the entry immediately.`} amount={expenseToDelete?.amount} currencySymbol={cs} variant="danger" isIrreversible={true} confirmLabel="De-authorize Entry" />
        </div>
    );
};

export default Expenses;
