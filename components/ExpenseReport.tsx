
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Expense, ReceiptSettingsData } from '../types';
import Card from './Card';
import { formatCurrency } from '../lib/utils';

interface ExpenseReportProps {
    expenses: Expense[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
}

const COLORS = ['#1E88E5', '#009688', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const ExpenseReport: React.FC<ExpenseReportProps> = ({ expenses, t, receiptSettings }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const cs = receiptSettings.currencySymbol;

    const uniqueCategories = useMemo(() => 
        [...new Set(expenses.map(e => e.category))].sort(), 
    [expenses]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            if (startDate && new Date(`${startDate}T00:00:00`) > expenseDate) return false;
            if (endDate && new Date(`${endDate}T23:59:59`) < expenseDate) return false;
            if (selectedCategory !== 'all' && expense.category !== selectedCategory) return false;
            return true;
        });
    }, [expenses, startDate, endDate, selectedCategory]);

    const categoryTotals = useMemo(() => {
        // FIX: Explicitly typed the accumulator 'acc' to Record<string, { totalAmount: number; count: number }> to avoid unknown property access errors and added type checking in map.
        const totals = filteredExpenses.reduce((acc: Record<string, { totalAmount: number; count: number }>, expense) => {
            const current = acc[expense.category] || { totalAmount: 0, count: 0 };
            acc[expense.category] = {
                totalAmount: current.totalAmount + expense.amount,
                count: current.count + 1
            };
            return acc;
        }, {} as Record<string, { totalAmount: number; count: number }>);

        return Object.entries(totals)
            .map(([name, data]) => ({ 
                name, 
                value: (data as { totalAmount: number; count: number }).totalAmount, 
                count: (data as { totalAmount: number; count: number }).count 
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredExpenses]);

    const totalFilteredExpenses = useMemo(() =>
        filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 border rounded-md shadow-lg">
                    <p className="font-semibold">{`${payload[0].name}`}</p>
                    <p className="text-sm text-primary">{`${formatCurrency(payload[0].value, cs)} (${payload[0].payload.count} items)`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card title={t('expenseReport.title')}>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-grow">
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
                </div>
                <div className="flex-grow">
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
                    <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
                </div>
                <div className="flex-grow">
                    <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700">{t('expenseReport.filterByCategory')}</label>
                    <select id="category-filter" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="mt-1">
                        <option value="all">{t('expenseReport.allCategories')}</option>
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            <div className="text-center mb-8 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-600">{t('expenseReport.totalExpenses')}</h3>
                <p className="text-4xl font-bold text-red-600">{formatCurrency(totalFilteredExpenses, cs)}</p>
                <p className="text-sm text-gray-500">{filteredExpenses.length} items</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{t('expenseReport.distribution')}</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryTotals}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {categoryTotals.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('expenseReport.breakdown')}</h3>
                    <ul className="space-y-2 max-h-80 overflow-y-auto">
                        {categoryTotals.map((cat, index) => (
                            <li key={cat.name} className="flex justify-between items-center p-2 rounded-md bg-gray-50">
                                <div className="flex items-center">
                                    <span className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    <span className="font-medium text-gray-700">{cat.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-800">{formatCurrency(cat.value, cs)}</p>
                                    <p className="text-xs text-gray-500">{cat.count} items</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    );
};

export default ExpenseReport;
