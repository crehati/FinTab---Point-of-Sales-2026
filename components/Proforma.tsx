
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import type { Sale, ReceiptSettingsData, User, Customer, PrinterSettingsData } from '../types';
import ReceiptModal from './ReceiptModal';
import EmptyState from './EmptyState';
import { formatCurrency } from '../lib/utils';
import { ProformaIcon, TodayIcon } from '../constants';
import { useNavigate } from 'react-router-dom';
import ReportFilterModal from './ReportFilterModal';

interface ProformaProps {
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

const Proforma: React.FC<ProformaProps> = ({ sales, customers, users, t, receiptSettings, onDeleteSale, currentUser, isTrialExpired, printerSettings }) => {
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const itemsPerPage = 10;
    const navigate = useNavigate();

    const filteredSales = useMemo(() => {
        let result = (sales || []).filter(sale => sale.status === 'proforma');
        
        if (startDate) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            result = result.filter(s => new Date(s.date).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(`${endDate}T23:59:59`).getTime();
            result = result.filter(s => new Date(s.date).getTime() <= end);
        }
        
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, startDate, endDate]);

    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredSales.slice(start, start + itemsPerPage);
    }, [filteredSales, currentPage]);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Proforma</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Pre-Authorization Estimates & Quotes</p>
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
                    {filteredSales.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[600px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">PROFORMA #</th>
                                                <th scope="col">Issuance Timestamp</th>
                                                <th scope="col">Potential Client</th>
                                                <th scope="col">Auth Agent</th>
                                                <th scope="col" className="text-right">Estimated Value</th>
                                                <th scope="col" className="text-center">Protocol Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {paginatedSales.map(sale => {
                                                const customer = customers.find(c => c.id === sale.customerId);
                                                const user = users.find(u => u.id === sale.userId);
                                                return (
                                                    <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="font-bold">
                                                            <button
                                                                onClick={() => setSelectedSale(sale)}
                                                                className="text-[11px] font-black text-primary hover:underline uppercase tracking-tight"
                                                                aria-label={`View proforma ${sale.id.slice(-6).toUpperCase()}`}
                                                            >
                                                                {sale.id.slice(-6).toUpperCase()}
                                                            </button>
                                                        </td>
                                                        <td className="text-slate-500 dark:text-slate-400 tabular-nums text-xs">
                                                            {new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </td>
                                                        <td className="text-slate-800 dark:text-slate-200 font-bold uppercase text-xs">{customer?.name || 'Anonymous Inquiry'}</td>
                                                        <td className="text-slate-600 dark:text-slate-400 font-medium uppercase text-[10px]">{user?.name || 'System'}</td>
                                                        <td className="table-num text-slate-900 dark:text-white font-black">
                                                            {formatCurrency(sale.total, receiptSettings.currencySymbol)}
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="status-badge status-draft">Quote Only</span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center items-center gap-2">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Prev</button>
                                    <div className="flex gap-1 overflow-x-auto no-scrollbar">{Array.from({ length: totalPages }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-gray-800 text-slate-400'}`}>{i + 1}</button>))}</div>
                                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Next</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState 
                            icon={<ProformaIcon />} 
                            title="No proforma records" 
                            description="Create proforma invoices for clients in the counter to track inquiries."
                            action={{ label: "Go to Counter", onClick: () => navigate('/counter') }}
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

export default Proforma;
