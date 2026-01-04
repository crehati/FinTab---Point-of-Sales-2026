
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
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    trialLimits?: { canAddCustomer: boolean };
}

const Customers: React.FC<CustomersProps> = ({ 
    customers = [], setCustomers, t, receiptSettings, 
    trialLimits = { canAddCustomer: true } 
}) => {
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
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

    const metrics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newThisMonth = customers.filter(c => new Date(c.joinDate) >= startOfMonth).length;
        const totalYield = customers.reduce((sum, c) => sum + getTotalSpent(c), 0);
        return { count: customers.length, newThisMonth, totalYield };
    }, [customers]);

    const handleOpenAddModal = () => { setEditingCustomer(null); setIsCustomerModalOpen(true); };
    const handleOpenEditModal = (customer: Customer) => { setEditingCustomer(customer); setIsCustomerModalOpen(true); };

    const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'joinDate' | 'purchaseHistory'>) => {
        if (editingCustomer) {
            setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { ...c, ...customerData } : c));
        } else {
            const newCustomer: Customer = {
                ...customerData,
                id: `cust-${Date.now()}`,
                joinDate: new Date().toISOString(),
                purchaseHistory: [],
            };
            setCustomers(prev => [newCustomer, ...prev]);
        }
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
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                                            {filteredCustomers.map(customer => (
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
                            <div className="md:hidden space-y-4">
                                {filteredCustomers.map(customer => (
                                    <div key={customer.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700 relative">
                                        <div className="pr-12">
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base truncate">{customer.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{customer.phone}</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-6 pt-4 border-t dark:border-gray-700">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lifetime Yield</p>
                                                <p className="text-xl font-black text-emerald-600 tabular-nums">{formatCurrency(getTotalSpent(customer), cs)}</p>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{customer.purchaseHistory.length} Orders</p>
                                        </div>
                                        <div className="absolute top-6 right-6">
                                            <div className="relative" ref={openActionMenuId === customer.id ? actionMenuRef : null}>
                                                <button onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(openActionMenuId === customer.id ? null : customer.id); }} className={`p-3 rounded-2xl transition-all ${openActionMenuId === customer.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700'}`}>
                                                    <MoreVertIcon className="w-4 h-4" />
                                                </button>
                                                {openActionMenuId === customer.id && (
                                                    <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-gray-700 z-[100] py-4 overflow-hidden animate-scale-in origin-top-right">
                                                        <button onClick={() => { setSelectedCustomer(customer); setOpenActionMenuId(null); }} className="w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">Identity Profile</button>
                                                        <button onClick={() => { handleOpenEditModal(customer); setOpenActionMenuId(null); }} className="w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-colors">Edit identity</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<CustomersIcon />} 
                            title="Zero clients found" 
                            description={searchTerm ? "Try searching for another identity." : "Start by enrolling your first customer to the terminal database."}
                            action={searchTerm ? undefined : { label: "Enroll Identity", onClick: handleOpenAddModal }}
                        />
                    )}
                </div>
            </div>

            <button
                onClick={handleOpenAddModal}
                disabled={!trialLimits.canAddCustomer}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] disabled:bg-slate-300 flex items-center justify-center group"
            >
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll New Client</span>
            </button>

            <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSave={handleSaveCustomer} customerToEdit={editingCustomer} />
            <CustomerDetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} receiptSettings={receiptSettings} />
        </div>
    );
};

export default Customers;
