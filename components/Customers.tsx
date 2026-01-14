
// @ts-nocheck
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Customer, ReceiptSettingsData, Sale } from '../types';
import Card from './Card';
import { PlusIcon, MoreVertIcon, CustomersIcon, FINALIZED_SALE_STATUSES } from '../constants';
import CustomerModal from './CustomerModal';
import CustomerDetailModal from './CustomerDetailModal';
import EmptyState from './EmptyState';
import SearchInput from './SearchInput';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';

interface CustomersProps {
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    handleSaveCustomer: (data: any) => void;
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    trialLimits?: { canAddCustomer: boolean };
}

const Customers: React.FC<CustomersProps> = ({ 
    customers = [], handleSaveCustomer, t, receiptSettings, 
    trialLimits = { canAddCustomer: true } 
}) => {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    
    const cs = receiptSettings?.currencySymbol || '$';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
        };
        if (openActionMenuId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openActionMenuId]);
    
    const getTotalSpent = (customer: Customer) => (customer.purchaseHistory || []).reduce((sum, sale) => sum + sale.total, 0);

    const filteredCustomers = useMemo(() => {
        const lower = searchTerm.toLowerCase();
        return (customers || [])
            .filter(c => c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower) || c.phone.includes(searchTerm))
            .sort((a, b) => getTotalSpent(b) - getTotalSpent(a));
    }, [customers, searchTerm]);

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const paginatedCustomers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredCustomers.slice(start, start + itemsPerPage);
    }, [filteredCustomers, currentPage]);

    const metrics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newThisMonth = customers.filter(c => new Date(c.joinDate) >= startOfMonth).length;
        const totalYield = customers.reduce((sum, c) => sum + getTotalSpent(c), 0);
        return { count: customers.length, newThisMonth, totalYield };
    }, [customers]);

    const handleOpenAddModal = () => { setEditingCustomer(null); setIsCustomerModalOpen(true); };
    const handleOpenEditModal = (customer: Customer) => { setEditingCustomer(customer); setIsCustomerModalOpen(true); };

    const onSave = (customerData: any) => {
        handleSaveCustomer(customerData);
        setIsCustomerModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Customers</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Client Relationship & Identity Grid</p>
                    </div>
                    
                    <div className="w-full md:w-auto grid grid-cols-2 md:flex gap-4">
                        <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 text-center min-w-[120px] shadow-inner">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Clients</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{metrics.count}</p>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-center min-w-[120px] shadow-inner">
                            <p className="text-[8px] font-black text-primary uppercase tracking-widest">New (MTD)</p>
                            <p className="text-lg font-black text-primary tabular-nums">+{metrics.newThisMonth}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <SearchInput
                        placeholder="Protocol Search: Name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <div className="min-h-[500px]">
                    {filteredCustomers.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[700px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Digital Identity</th>
                                                <th scope="col">Communication Protocol</th>
                                                <th scope="col">Enrollment Date</th>
                                                <th scope="col" className="text-right">Lifetime Yield</th>
                                                <th scope="col" className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {paginatedCustomers.map(customer => (
                                                <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-sm">{customer.name}</td>
                                                    <td className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">
                                                        {customer.email}<br/><span className="text-primary">{customer.phone}</span>
                                                    </td>
                                                    <td className="text-slate-400 tabular-nums font-bold text-xs">{new Date(customer.joinDate).toLocaleDateString()}</td>
                                                    <td className="table-num text-emerald-600 font-black text-base">{formatCurrency(getTotalSpent(customer), cs)}</td>
                                                    <td className="text-right">
                                                        <div className="flex justify-end gap-4">
                                                            <button onClick={() => setSelectedCustomer(customer)} className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Profile</button>
                                                            <button onClick={() => handleOpenEditModal(customer)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:underline">Edit</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center items-center gap-2">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Prev</button>
                                    <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                                        {Array.from({ length: totalPages }).map((_, i) => (
                                            <button key={i} onClick={() => setCurrentPage(i + 1)} className={`flex-shrink-0 w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-gray-800 text-slate-400'}`}>{i + 1}</button>
                                        ))}
                                    </div>
                                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">Next</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState icon={<CustomersIcon />} title="Zero clients found" description={searchTerm ? "Try searching for another identity." : "Start by enrolling your first customer to the terminal database."} action={searchTerm ? undefined : { label: "Enroll Identity", onClick: handleOpenAddModal }} />
                    )}
                </div>
            </div>

            <button onClick={handleOpenAddModal} disabled={!trialLimits.canAddCustomer} className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] disabled:bg-slate-300 flex items-center justify-center group">
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll New Client</span>
            </button>

            <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSave={onSave} customerToEdit={editingCustomer} />
            <CustomerDetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} receiptSettings={receiptSettings} />
        </div>
    );
};

export default Customers;
