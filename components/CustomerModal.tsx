
import React, { useState, useEffect } from 'react';
import type { Customer } from '../types';
import { COUNTRIES } from '../constants';
import ModalShell from './ModalShell';

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customerData: Omit<Customer, 'id' | 'joinDate' | 'purchaseHistory'>) => void;
    customerToEdit: Customer | null;
}

interface FormData {
    name: string;
    email: string;
    countryCode: string;
    localPhone: string;
}

const getInitialFormData = (): FormData => ({
    name: '',
    email: '',
    countryCode: '+1',
    localPhone: '',
});

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, onSave, customerToEdit }) => {
    const [formData, setFormData] = useState<FormData>(getInitialFormData());

    useEffect(() => {
        if (isOpen) {
            if (customerToEdit) {
                const phone = customerToEdit.phone;
                const country = COUNTRIES.find(c => phone.startsWith(c.dial_code));
                setFormData({
                    name: customerToEdit.name,
                    email: customerToEdit.email,
                    countryCode: country?.dial_code || '+1',
                    localPhone: country ? phone.substring(country.dial_code.length) : phone.replace(/\D/g, ''),
                });
            } else {
                setFormData(getInitialFormData());
            }
        }
    }, [isOpen, customerToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        const fullPhoneNumber = `${formData.countryCode}${formData.localPhone.replace(/\D/g, '')}`;
        onSave({
            name: formData.name,
            email: formData.email,
            phone: fullPhoneNumber,
        });
    };

    const footer = (
        <>
            <button onClick={handleSubmit} className="btn-base btn-primary w-full sm:w-auto px-10 py-5">
                {customerToEdit ? 'Authorize Update' : 'Enroll Identity'}
            </button>
            <button onClick={onClose} className="btn-base btn-secondary w-full sm:w-auto px-10 py-5">
                Cancel
            </button>
        </>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title={customerToEdit ? 'Edit Customer' : 'Add New Customer'} 
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-6">
                <div>
                    <label htmlFor="name" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Legal Identity Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="First Last" />
                </div>
                <div>
                    <label htmlFor="email" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Communication Email</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="identity@domain.com" />
                </div>
                <div>
                    <label htmlFor="phone" className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Secure Mobile Protocol</label>
                    <div className="flex bg-slate-50 dark:bg-gray-900 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                        <select
                            name="countryCode"
                            value={formData.countryCode}
                            onChange={handleChange}
                            className="bg-transparent border-none text-sm font-bold pl-4 py-4 w-32 outline-none"
                        >
                            {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>)}
                        </select>
                        <input
                            type="tel"
                            name="localPhone"
                            id="phone"
                            value={formData.localPhone}
                            onChange={handleChange}
                            required
                            className="flex-1 bg-transparent border-none p-4 text-sm font-bold outline-none"
                            placeholder="5551234567"
                        />
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};

export default CustomerModal;
