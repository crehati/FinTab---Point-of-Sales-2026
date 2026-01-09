
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import type { Role } from '../types';
import ModalShell from './ModalShell';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: any) => void;
}

const ROLES: Role[] = ['Manager', 'Cashier', 'SellerAgent', 'BankVerifier', 'Investor'];

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>('Cashier');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        onSave({ email, role });
        setEmail('');
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Invite Personnel" description="Issue a secure terminal invitation.">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Invitee Email</label>
                    <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        placeholder="identity@domain.com"
                    />
                </div>
                <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Identity Protocol (Role)</label>
                    <select 
                        value={role} 
                        onChange={e => setRole(e.target.value as Role)} 
                        className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Issue Protocol Link</button>
            </form>
        </ModalShell>
    );
};

export default UserModal;
