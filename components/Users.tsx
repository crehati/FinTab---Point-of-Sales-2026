
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Sale, AttendanceRecord, PerformanceUser, ReceiptSettingsData, Role, CustomPayment, Customer, AppPermissions, UserPermissions, OwnerSettings, BusinessProfile } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import { QRCodeIcon, PrintIcon, PlusIcon, AIIcon, StaffIcon, LinkIcon } from '../constants';
import UserModal from './UserModal';
import ModalShell from './ModalShell';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';

const Users: React.FC<any> = ({ users = [], activeBusinessId, currentUser }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [inviteLinkToShow, setInviteLinkToShow] = useState<string | null>(null);

    const handleSaveUser = async (userData: any) => {
        // 1. Generate unique token
        const token = crypto.randomUUID();
        
        // 2. Persist invitation in Supabase
        const { error } = await supabase.from('invitations').insert({
            business_id: activeBusinessId,
            invited_email: userData.email.toLowerCase(),
            role: userData.role,
            token: token,
            status: 'pending',
            created_by: currentUser.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        if (error) {
            alert("Protocol Error: Could not issue invitation.");
            return;
        }

        // 3. Show Link to User
        const baseUrl = window.location.origin + window.location.pathname;
        const fullLink = `${baseUrl}#/invite?token=${token}`;
        setInviteLinkToShow(fullLink);
        setIsUserModalOpen(false);
    };

    return (
        <div className="space-y-6 font-sans">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <header className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Personnel</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Authorized Business Nodes</p>
                    </div>
                    <button onClick={() => setIsUserModalOpen(true)} className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Invite Unit</button>
                </header>

                <div className="table-wrapper">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr><th>Unit Identity</th><th>Status</th><th className="text-right">Action</th></tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="font-bold">{u.name} ({u.role})</td>
                                    <td><span className="status-badge status-approved">Live</span></td>
                                    <td className="text-right"><button className="text-[9px] font-black text-slate-400 uppercase">Manage</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} />

            <ModalShell isOpen={!!inviteLinkToShow} onClose={() => setInviteLinkToShow(null)} title="Invitation Issued" description="Share this secure link with the invitee.">
                <div className="space-y-6">
                    <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-slate-100 break-all font-mono text-[10px] text-primary select-all">
                        {inviteLinkToShow}
                    </div>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(inviteLinkToShow); alert('Copied to clipboard.'); }} 
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                    >
                        Copy Secure Link
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase text-center">This token expires in 7 days.</p>
                </div>
            </ModalShell>
        </div>
    );
};

export default Users;
