
import React, { useState, useMemo } from 'react';
import type { Customer } from '../types';
import { PlusIcon } from '../constants';
import SearchInput from './SearchInput';
import ModalShell from './ModalShell';

interface CustomerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    onSelect: (customerId: string) => void;
    onAddNew: () => void;
}

const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({ isOpen, onClose, customers, onSelect, onAddNew }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(lowercasedFilter) ||
            customer.email.toLowerCase().includes(lowercasedFilter) ||
            customer.phone.includes(searchTerm)
        );
    }, [customers, searchTerm]);

    const handleSelect = (id: string) => {
        onSelect(id);
        onClose();
    };

    const footer = (
        <button
            type="button"
            onClick={onAddNew}
            className="w-full flex items-center justify-center gap-2 p-4 bg-primary text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-95"
        >
            <PlusIcon className="w-4 h-4" />
            Add New Client
        </button>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Select Client" 
            description="Verified identity registry"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-6">
                <SearchInput
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search customers"
                />

                <div className="max-h-80 overflow-y-auto custom-scrollbar -mx-4 px-4">
                    {filteredCustomers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {filteredCustomers.map(customer => (
                                <button 
                                    key={customer.id}
                                    onClick={() => handleSelect(customer.id)}
                                    className="w-full text-left p-5 hover:bg-slate-50 dark:hover:bg-gray-900 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-gray-800 group"
                                >
                                    <p className="font-bold text-slate-900 dark:text-gray-100 uppercase tracking-tighter group-hover:text-primary transition-colors">{customer.name}</p>
                                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{customer.phone}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-12 px-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Zero matches</p>
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default CustomerSelectionModal;
