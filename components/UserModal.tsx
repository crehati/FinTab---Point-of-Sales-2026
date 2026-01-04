
import React, { useState, useEffect } from 'react';
import type { User, Role, ReceiptSettingsData } from '../types';
import ModalShell from './ModalShell';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: Omit<User, 'id' | 'avatarUrl'>, isEditing: boolean) => void;
    userToEdit: User | null;
    receiptSettings: ReceiptSettingsData;
    defaultRole?: Role;
    existingUsers?: User[];
}

const getInitialFormData = () => ({
    name: '',
    email: '',
    role: 'Cashier' as Role,
    customRoleName: '',
    type: 'commission' as 'commission' | 'hourly',
    hourlyRate: '' as string | number,
    initialInvestment: '' as string | number,
});

const manageableRoles: Role[] = ['Manager', 'Cashier', 'SellerAgent', 'BankVerifier', 'Investor', 'Custom'];

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, userToEdit, receiptSettings, defaultRole, existingUsers = [] }) => {
    const [formData, setFormData] = useState(getInitialFormData());
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isEditing = !!userToEdit;
    const cs = receiptSettings.currencySymbol;

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsSaving(false);
            if (userToEdit) {
                setFormData({
                    name: userToEdit.name,
                    email: userToEdit.email,
                    role: userToEdit.role,
                    customRoleName: userToEdit.customRoleName || '',
                    type: userToEdit.type,
                    hourlyRate: userToEdit.hourlyRate || 0,
                    initialInvestment: userToEdit.initialInvestment || 0,
                });
            } else {
                 setFormData(prev => ({
                    ...getInitialFormData(),
                    role: defaultRole || 'Cashier'
                }));
            }
        }
    }, [isOpen, userToEdit, defaultRole]);
    
    useEffect(() => {
        if (formData.role === 'Investor') {
            setFormData(prev => ({ ...prev, type: 'commission' }));
        }
    }, [formData.role]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleTypeChange = (type: 'commission' | 'hourly') => {
        setFormData(prev => ({ ...prev, type }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isEditing) {
            const emailTaken = existingUsers.some(u => u.email.toLowerCase() === formData.email.toLowerCase());
            if (emailTaken) {
                setError("Protocol Error: Email credential already registered to another unit.");
                return;
            }
        }

        setIsSaving(true);
        const dataToSave = {
            ...formData,
            hourlyRate: parseFloat(String(formData.hourlyRate)) || 0,
            initialInvestment: parseFloat(String(formData.initialInvestment)) || 0,
        };
        try {
            await onSave(dataToSave, isEditing);
        } finally {
            setIsSaving(false);
        }
    };

    const isInvestorRole = formData.role === 'Investor';

    const footer = (
        <>
            <button onClick={handleSubmit} className="btn-base btn-primary flex-1 py-4" disabled={isSaving}>
                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>}
                {isEditing ? 'Confirm Identity Update' : 'Authorize Digital Invite'}
            </button>
            <button onClick={onClose} className="btn-base btn-secondary px-8 py-4" disabled={isSaving}>
                Abort
            </button>
        </>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit Identity' : 'Enroll New Identity'}
            description="Personnel Authorization Protocol"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-6">
                {error && (
                    <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-rose-100 animate-shake text-center">
                        {error}
                    </div>
                )}
                
                <div>
                    <label htmlFor="name" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Legal Identity Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="First Last" />
                </div>

                <div>
                    <label htmlFor="email" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Credential Email</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required disabled={isEditing} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none disabled:opacity-50" placeholder="user@domain.com" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="role" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Protocol Assignment</label>
                        <select name="role" id="role" value={formData.role} onChange={handleChange} required disabled={!!defaultRole} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none">
                            {manageableRoles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    {formData.role === 'Custom' && (
                        <div className="animate-fade-in">
                            <label htmlFor="customRoleName" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Custom Designation</label>
                            <input type="text" name="customRoleName" id="customRoleName" value={formData.customRoleName} onChange={handleChange} required className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="e.g. Sales Agent" />
                        </div>
                    )}
                </div>

                {!isInvestorRole && (
                    <div className="pt-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Yield Protocol Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.type === 'commission' ? 'bg-primary/5 border-primary text-primary shadow-inner' : 'bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-800 text-slate-400'}`}>
                                <input type="radio" name="type" checked={formData.type === 'commission'} onChange={() => handleTypeChange('commission')} className="sr-only" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Comm %</span>
                            </label>
                            <label className={`flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.type === 'hourly' ? 'bg-primary/5 border-primary text-primary shadow-inner' : 'bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-800 text-slate-400'}`}>
                                <input type="radio" name="type" checked={formData.type === 'hourly'} onChange={() => handleTypeChange('hourly')} className="sr-only" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Hourly</span>
                            </label>
                        </div>
                    </div>
                )}

                {formData.type === 'hourly' && !isInvestorRole && (
                    <div className="animate-fade-in">
                        <label htmlFor="hourlyRate" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Verified Hourly Value ({cs})</label>
                        <input type="number" name="hourlyRate" id="hourlyRate" value={formData.hourlyRate} onChange={handleChange} required min="0" step="0.01" className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-lg font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums" placeholder="0.00" />
                    </div>
                )}
                
                {isInvestorRole && (
                    <div className="animate-fade-in">
                        <label htmlFor="initialInvestment" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Initial Capital Injection ({cs})</label>
                        <input type="number" name="initialInvestment" id="initialInvestment" value={formData.initialInvestment} onChange={handleChange} required min="0" step="1" className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-lg font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums" placeholder="0" />
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default UserModal;
