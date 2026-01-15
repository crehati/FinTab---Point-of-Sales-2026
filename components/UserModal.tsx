
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
    const [initialInvestment, setInitialInvestment] = useState('');

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setRole('Cashier');
            setInitialInvestment('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        
        // Final payload includes initialInvestment for metadata processing in invitations table
        onSave({ 
            email, 
            role, 
            initialInvestment: role === 'Investor' ? parseFloat(initialInvestment) || 0 : 0 
        });
        
        setEmail('');
        setInitialInvestment('');
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} title="Invite Personnel" description="Issue a secure terminal invitation token.">
            <form onSubmit={handleSubmit} className="space-y-8 py-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Invitee Terminal Email</label>
                    <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        placeholder="identity@domain.com"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Protocol Role (Identity Class)</label>
                    <select 
                        value={role} 
                        onChange={e => setRole(e.target.value as Role)} 
                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                
                {role === 'Investor' && (
                    <div className="animate-fade-in space-y-2 pt-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest block px-1">Initial Capital Injection ($)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <span className="text-primary font-black text-lg">$</span>
                            </div>
                            <input 
                                type="number" 
                                required 
                                value={initialInvestment} 
                                onChange={e => setInitialInvestment(e.target.value)} 
                                className="w-full bg-primary/5 border-2 border-primary/10 rounded-2xl p-5 pl-10 text-xl font-black text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none tabular-nums"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-relaxed">
                                <span className="text-primary font-black">Note:</span> This value will be recorded as the Partner's starting equity base upon link activation.
                            </p>
                        </div>
                    </div>
                )}

                <div className="pt-4">
                    <button 
                        type="submit" 
                        className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-primary/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        Issue Protocol Link
                    </button>
                </div>
            </form>
        </ModalShell>
    );
};

export default UserModal;
