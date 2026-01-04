
import React, { useState, useMemo } from 'react';
import type { Sale, ReceiptSettingsData, User, Customer, PrinterSettingsData } from '../types';
import ReceiptModal from './ReceiptModal';
import EmptyState from './EmptyState';
import { formatCurrency } from '../lib/utils';
import { ReceiptsIcon, CloseIcon } from '../constants';
import { useNavigate } from 'react-router-dom';

interface ReceiptsProps {
    sales: Sale[];
    customers: Customer[];
    users: User[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    onDeleteSale: (saleId: string) => void;
    currentUser: User;
    isTrialExpired: boolean;
    printerSettings: PrinterSettingsData;
}

const Receipts: React.FC<ReceiptsProps> = ({ sales, customers, users, t, receiptSettings, onDeleteSale, currentUser, isTrialExpired, printerSettings }) => {
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activePreset, setActivePreset] = useState<string>('all');
    const navigate = useNavigate();

    const applyPreset = (preset: string) => {
        setActivePreset(preset);
        const now = new Date();
        let start = '';
        let end = '';

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        switch (preset) {
            case 'today':
                start = formatDate(now);
                end = formatDate(now);
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                start = formatDate(yesterday);
                end = formatDate(yesterday);
                break;
            case 'week':
                const lastWeek = new Date(now);
                lastWeek.setDate(now.getDate() - 7);
                start = formatDate(lastWeek);
                end = formatDate(now);
                break;
            case 'month':
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                start = formatDate(firstDay);
                end = formatDate(now);
                break;
            default:
                start = '';
                end = '';
        }
        setStartDate(start);
        setEndDate(end);
    };

    const filteredAndSortedSales = useMemo(() => {
        let filteredSales = sales.filter(sale => sale.status !== 'proforma');

        if (startDate) {
            const start = new Date(`${startDate}T00:00:00`);
            filteredSales = filteredSales.filter(sale => new Date(sale.date) >= start);
        }

        if (endDate) {
            const end = new Date(`${endDate}T23:59:59`);
            filteredSales = filteredSales.filter(sale => new Date(sale.date) <= end);
        }

        return filteredSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, startDate, endDate]);
    
    const getStatusBadge = (status: Sale['status']) => {
        switch(status) {
            case 'completed':
            case 'completed_bank_verified':
            case 'approved_by_owner':
                return <span className="status-badge status-approved">Approved</span>;
            case 'pending_bank_verification':
            case 'pending_approval':
                 return <span className="status-badge status-pending animate-pulse">In Review</span>;
            case 'rejected':
            case 'rejected_bank_not_verified':
                 return <span className="status-badge status-rejected">Rejected</span>;
            default:
                return <span className="status-badge status-draft">{status.replace(/_/g, ' ')}</span>;
        }
    }

    const renderDesktopTable = () => (
        <div className="table-wrapper hidden md:block">
            <div className="table-container max-h-[600px]">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th scope="col">ID #</th>
                            <th scope="col">Timestamp</th>
                            <th scope="col">Customer Identity</th>
                            <th scope="col">Terminal Actor</th>
                            <th scope="col" className="text-right">Settlement Value</th>
                            <th scope="col" className="text-center">Workflow Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredAndSortedSales.map(sale => {
                            const customer = customers.find(c => c.id === sale.customerId);
                            const user = users.find(u => u.id === sale.userId);
                            const isPending = sale.status === 'pending_bank_verification';
                            return (
                                <tr key={sale.id} className={`transition-colors duration-150 ${isPending ? 'bg-amber-50/30' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                                    <td className="font-bold">
                                        <button
                                            onClick={() => setSelectedSale(sale)}
                                            className="text-[11px] font-black text-primary hover:underline uppercase tracking-tight"
                                            aria-label={`View receipt ${sale.id.slice(-6).toUpperCase()}`}
                                        >
                                            {sale.id.slice(-6).toUpperCase()}
                                        </button>
                                    </td>
                                    <td className="text-slate-500 dark:text-slate-400 tabular-nums">
                                        {new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td className="text-slate-800 dark:text-slate-200 font-bold">{customer?.name || 'Anonymous Client'}</td>
                                    <td className="text-slate-600 dark:text-slate-400 font-medium">{user?.name || 'System Agent'}</td>
                                    <td className="table-num text-slate-900 dark:text-white">
                                        {formatCurrency(sale.total, receiptSettings.currencySymbol)}
                                    </td>
                                    <td className="text-center">
                                        {getStatusBadge(sale.status)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderMobileCards = () => (
        <div className="md:hidden space-y-3">
            {filteredAndSortedSales.map(sale => {
                const customer = customers.find(c => c.id === sale.customerId);
                return (
                    <div key={sale.id} className={`p-5 rounded-[2rem] shadow-sm border ${
                        sale.status === 'pending_bank_verification' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100 dark:bg-gray-900 dark:border-gray-800'
                    }`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-grow min-w-0">
                                <button
                                    onClick={() => setSelectedSale(sale)}
                                    className="text-[10px] font-black text-primary hover:underline text-left truncate block uppercase tracking-widest"
                                    aria-label={`View receipt ${sale.id.slice(-6).toUpperCase()}`}
                                >
                                    LOG #{sale.id.slice(-6).toUpperCase()}
                                </button>
                                <p className="text-slate-900 dark:text-white font-bold mt-2 truncate uppercase tracking-tighter">{customer?.name || 'Anonymous Client'}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-3 uppercase tracking-widest tabular-nums">
                                    {sale.items.length} units &bull; {new Date(sale.date).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-black text-xl text-slate-900 dark:text-white tabular-nums">{formatCurrency(sale.total, receiptSettings.currencySymbol)}</p>
                                <div className="mt-2">{getStatusBadge(sale.status)}</div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                 <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Receipts</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Transaction Lifecycle Audit Ledger</p>
                    </div>
                    
                    <div className="w-full md:w-auto bg-slate-50 dark:bg-gray-800 p-4 rounded-[2rem] border border-slate-100 dark:border-gray-700 shadow-inner">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', label: 'All Time' },
                                    { id: 'today', label: 'Today' },
                                    { id: 'yesterday', label: 'Yesterday' },
                                    { id: 'week', label: 'Last 7D' },
                                    { id: 'month', label: 'This Month' }
                                ].map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => applyPreset(preset.id)}
                                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                            activePreset === preset.id 
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                            : 'bg-white dark:bg-gray-900 text-slate-400 hover:text-slate-600 dark:hover:text-white border border-slate-100 dark:border-gray-700'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom'); }}
                                        className="w-full text-xs bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-2.5 font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                        aria-label="Start date"
                                    />
                                </div>
                                <span className="text-slate-300 font-bold">→</span>
                                <div className="relative flex-1">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom'); }}
                                        className="w-full text-xs bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-xl px-3 py-2.5 font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                        aria-label="End date"
                                    />
                                </div>
                                {(startDate || endDate) && (
                                    <button 
                                        onClick={() => applyPreset('all')}
                                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                        title="Clear Filter"
                                    >
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {filteredAndSortedSales.length > 0 ? (
                        <>
                            {renderDesktopTable()}
                            {renderMobileCards()}
                        </>
                    ) : (
                        <EmptyState 
                            icon={<ReceiptsIcon />} 
                            title={startDate || endDate ? "Zero matches in interval" : "No transactional records"} 
                            description={startDate || endDate ? "Try adjusting the entry horizon or final limit filters." : "Start by processing your first sale in the shopfront."}
                            action={{ label: "Go to Shopfront", onClick: () => navigate('/shopfront') }}
                        />
                    )}
                </div>
            </div>
            {selectedSale && (
                <ReceiptModal 
                    sale={selectedSale} 
                    customers={customers} 
                    users={users} 
                    onClose={() => setSelectedSale(null)} 
                    receiptSettings={receiptSettings} 
                    onDelete={onDeleteSale} 
                    currentUser={currentUser} 
                    t={t} 
                    isTrialExpired={isTrialExpired} 
                    printerSettings={printerSettings} 
                />
            )}
        </div>
    );
};

export default Receipts;
