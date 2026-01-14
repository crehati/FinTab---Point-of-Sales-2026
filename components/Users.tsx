
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../types';
import EmptyState from './EmptyState';
import { PlusIcon, StaffIcon } from '../constants';
import UserModal from './UserModal';
import ModalShell from './ModalShell';
import { supabase } from '../lib/supabase';

const Users: React.FC<{ users: User[], activeBusinessId: string, currentUser: User }> = ({ users = [], activeBusinessId, currentUser }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [inviteLinkToShow, setInviteLinkToShow] = useState<string | null>(null);

    // Fetch members logic handled in App.tsx or refined here if real-time needed
    const handleSaveUser = async (userData: any) => {
        if (!currentUser?.id || !activeBusinessId) {
            alert("Authorization Error: Identity or Node ID missing.");
            return;
        }

        try {
            await supabase.wait();
            const token = crypto.randomUUID();
            
            const { error } = await supabase.from('invitations').insert({
                business_id: activeBusinessId,
                invited_email: userData.email.toLowerCase(),
                role: userData.role,
                token: token,
                status: 'pending',
                created_by: currentUser.id,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    initial_investment: userData.initialInvestment || 0
                }
            });

            if (error) throw error;

            const baseUrl = window.location.origin + window.location.pathname;
            const fullLink = `${baseUrl}#/invite?token=${token}`;
            setInviteLinkToShow(fullLink);
            setIsUserModalOpen(false);
        } catch (err) {
            alert(`Protocol Error: ${err.message}`);
        }
    };

    return (
        <div className="space-y-6 font-sans">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <header className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Personnel</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Authorized Units for this Node</p>
                    </div>
                    {currentUser.role === 'Owner' && (
                        <button onClick={() => setIsUserModalOpen(true)} className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Invite Unit</button>
                    )}
                </header>

                <div className="table-wrapper">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-gray-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Unit Identity</th>
                                <th className="px-6 py-4">Role Protocol</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-800">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-9 h-9 rounded-xl object-cover border border-slate-100 dark:border-gray-800 shadow-sm" />
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-xs">{u.name}</p>
                                                <p className="text-[9px] text-slate-400 font-medium lowercase truncate max-w-[120px]">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                            u.role === 'Owner' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="status-badge status-approved !text-[8px]">Live Node</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        {currentUser.role === 'Owner' && u.id !== currentUser.id && (
                                            <button className="text-[9px] font-black text-slate-400 uppercase hover:text-primary transition-colors">Manage</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <EmptyState icon={<StaffIcon />} title="Personnel Grid Empty" description="Enroll staff units to begin delegating terminal operations." />
                    )}
                </div>
            </div>

            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} />

            <ModalShell isOpen={!!inviteLinkToShow} onClose={() => setInviteLinkToShow(null)} title="Invitation Issued" description="Share this secure link with the invitee.">
                <div className="space-y-6">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-tight leading-relaxed">This unit will be anchored to the current business node upon acceptance.</p>
                    <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 break-all font-mono text-[10px] text-primary select-all shadow-inner">
                        {inviteLinkToShow}
                    </div>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(inviteLinkToShow); alert('Protocol link copied to clipboard.'); }} 
                        className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                    >
                        Copy Secure Link
                    </button>
                    <p className="text-[8px] text-slate-400 font-bold uppercase text-center tracking-widest">Single-use token. Expires in 7 days.</p>
                </div>
            </ModalShell>
        </div>
    );
};

export default Users;
