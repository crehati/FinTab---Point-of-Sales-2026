
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import type { Sale, ReceiptSettingsData, User, Customer, PrinterSettingsData } from '../types';
import ReceiptModal from './ReceiptModal';
import EmptyState from './EmptyState';
import { formatCurrency } from '../lib/utils';
import { ReceiptsIcon, CloseIcon, ShieldCheckIcon } from '../constants';
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
    onApproveBankSale?: (id: string) => void;
    onRejectBankSale?: (id: string, reason: string) => void;
}

const Receipts: React.FC<ReceiptsProps> = ({ sales, customers, users, t, receiptSettings, onDeleteSale, currentUser, isTrialExpired, printerSettings, onApproveBankSale, onRejectBankSale }) => {
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activePreset, setActivePreset] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const navigate = useNavigate();

    const isVerifier = currentUser.role === 'Owner' || currentUser.role === 'BankVerifier' || currentUser.role === 'Super Admin';

    const applyPreset = (preset: string) => {
        setActivePreset(preset);
        setCurrentPage(1);
        const now = new Date();
        let start = '';
        let end = '';
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        switch (preset) {
            case 'today': start = formatDate(now); end = formatDate(now); break;
            case 'yesterday': const y = new Date(now); y.setDate(now.getDate() - 1); start = formatDate(y); end = formatDate(y); break;
            case 'week': const w = new Date(now); w.setDate(now.getDate() - 7); start = formatDate(w); end = formatDate(now); break;
            case 'month': const f = new Date(now.getFullYear(), now.getMonth(), 1); start = formatDate(f); end = formatDate(now); break;
            default: start = ''; end = '';
        }
        setStartDate(start);
        setEndDate(end);
    };

    const filteredAndSortedSales = useMemo(() => {
        let filtered = (sales || []).filter(sale => sale.status !== 'proforma');
        if (startDate) { const s = new Date(`${startDate}T00:00:00`); filtered = filtered.filter(sale => new Date(sale.date) >= s); }
        if (endDate) { const e = new Date(`${endDate}T23:59:59`); filtered = filtered.filter(sale => new Date(sale.date) <= e); }
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, startDate, endDate]);

    const totalPages = Math.ceil(filteredAndSortedSales.length / itemsPerPage);
    const paginatedSales = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedSales.slice(start, start + itemsPerPage);
    }, [filteredAndSortedSales, currentPage]);
    
    const getStatusBadge = (status: Sale['status']) => {
        const isApproved = ['completed', 'completed_bank_verified', 'approved_by_owner'].includes(status);
        const isPending = ['pending_bank_verification', 'pending_approval'].includes(status);
        return <span className={`status-badge ${isApproved ? 'status-approved' : isPending ? 'status-pending' : 'status-rejected'}`}>
            {isApproved ? 'Verified' : isPending ? 'In Review' : 'Rejected'}
        </span>;
    }

    const handleReject = (id: string) => {
        const reason = prompt("Enter rejection reason:");
        if (reason && onRejectBankSale) onRejectBankSale(id, reason);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10 font-sans pb-24 px-4 sm:px-6 lg:px-10">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-slate-50 dark:border-gray-800">
                 <div className="flex flex-col lg:flex-row justify-between items-start gap-10 mb-12">
                    <div>
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{t('receipts')}</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Transaction Lifecycle Audit Ledger</p>
                    </div>
                    
                    <div className="w-full lg:w-auto bg-slate-50 dark:bg-gray-800/50 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                                {[
                                    { id: 'all', label: 'All Time' },
                                    { id: 'today', label: 'Today' },
                                    { id: 'yesterday', label: 'Yesterday' },
                                    { id: 'week', label: 'Last 7D' },
                                    { id: 'month', label: 'This Month' }
                                ].map(preset => (
                                    <button key={preset.id} onClick={() => applyPreset(preset.id)} className={`px-5 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activePreset === preset.id ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-gray-900 text-slate-400 hover:text-slate-600 border border-slate-100 dark:border-gray-800'}`}>{preset.label}</button>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] items-center gap-4">
                                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom'); setCurrentPage(1); }} className="!py-3 !px-4 bg-white dark:bg-gray-900 text-xs font-bold rounded-2xl" />
                                <span className="text-slate-300 font-bold hidden sm:block">→</span>
                                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom'); setCurrentPage(1); }} className="!py-3 !px-4 bg-white dark:bg-gray-900 text-xs font-bold rounded-2xl" />
                                {(startDate || endDate) && (
                                    <button onClick={() => applyPreset('all')} className="p-3 text-slate-400 hover:text-rose-500 bg-white dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800"><CloseIcon className="w-4 h-4" /></button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-[400px]">
                    {filteredAndSortedSales.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block border dark:border-gray-800 rounded-[2.5rem] overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <tr>
                                            <th className="px-8 py-6">ID #</th>
                                            <th className="px-8 py-6">Timestamp</th>
                                            <th className="px-8 py-6">Client Identity</th>
                                            <th className="px-8 py-6 text-right">Value</th>
                                            <th className="px-8 py-6 text-center">Protocol Status</th>
                                            <th className="px-8 py-6 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-800">
                                        {paginatedSales.map(sale => {
                                            const customer = customers.find(c => c.id === sale.customerId);
                                            return (
                                                <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                    <td className="px-8 py-6"><button onClick={() => setSelectedSale(sale)} className="text-[11px] font-black text-primary hover:underline uppercase tracking-tight">{sale.id.slice(-6).toUpperCase()}</button></td>
                                                    <td className="px-8 py-6 text-slate-500 dark:text-slate-400 tabular-nums text-xs font-medium">{new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                    <td className="px-8 py-6 font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">{customer?.name || 'Guest Identity'}</td>
                                                    <td className="px-8 py-6 text-right font-black tabular-nums text-slate-900 dark:text-white">{formatCurrency(sale.total, receiptSettings.currencySymbol)}</td>
                                                    <td className="px-8 py-6 text-center">
                                                        {getStatusBadge(sale.status)}
                                                        {sale.status === 'rejected_bank_not_verified' && sale.verification_note && (
                                                            <p className="text-[7px] text-rose-500 font-bold uppercase mt-1 italic">Note: {sale.verification_note}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        {sale.status === 'pending_bank_verification' && isVerifier && (
                                                            <div className="flex gap-2 justify-center">
                                                                <button onClick={() => onApproveBankSale && onApproveBankSale(sale.id)} className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md">Verify</button>
                                                                <button onClick={() => handleReject(sale.id)} className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md">Reject</button>
                                                            </div>
                                                        )}
                                                        {sale.payment_method === 'Bank Receipt' && sale.bank_receipt_number && (
                                                            <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Ref: {sale.bank_receipt_number}</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="md:hidden space-y-4">
                                {paginatedSales.map(sale => (
                                    <div key={sale.id} className="p-6 rounded-[2.5rem] bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <button onClick={() => setSelectedSale(sale)} className="text-[10px] font-black text-primary uppercase tracking-widest">LOG #{sale.id.slice(-6).toUpperCase()}</button>
                                            <div className="text-right">
                                                <p className="font-black text-xl tabular-nums">{formatCurrency(sale.total, receiptSettings.currencySymbol)}</p>
                                                <div className="mt-1">{getStatusBadge(sale.status)}</div>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white truncate">{(customers.find(c => c.id === sale.customerId))?.name || 'Guest Identity'}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{new Date(sale.date).toLocaleDateString()} &bull; {sale.items.length} Units</p>
                                        
                                        {sale.status === 'pending_bank_verification' && isVerifier && (
                                            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                                                <button onClick={() => onApproveBankSale && onApproveBankSale(sale.id)} className="w-full py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Verify Receipt</button>
                                                <button onClick={() => handleReject(sale.id)} className="w-full py-3 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Reject</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-12 flex justify-center items-center gap-2">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-3 px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Prev</button>
                                    <div className="flex gap-1 overflow-x-auto no-scrollbar">{Array.from({ length: totalPages }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 dark:bg-gray-800 text-slate-400'}`}>{i + 1}</button>))}</div>
                                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-3 px-6 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Next</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState icon={<ReceiptsIcon />} title="No transactional records" description="Adjust your audit horizon to find matching estimations or process a new sale." action={{ label: "Go to Counter", onClick: () => navigate('/counter') }} />
                    )}
                </div>
            </div>
            {selectedSale && <ReceiptModal sale={selectedSale} customers={customers} users={users} onClose={() => setSelectedSale(null)} receiptSettings={receiptSettings} onDelete={onDeleteSale} currentUser={currentUser} t={t} isTrialExpired={isTrialExpired} printerSettings={printerSettings} />}
        </div>
    );
};

export default Receipts;
