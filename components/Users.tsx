
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../types';
import EmptyState from './EmptyState';
import { PlusIcon, StaffIcon, LinkIcon, CloseIcon, WarningIcon, DeleteIcon } from '../constants';
import UserModal from './UserModal';
import ModalShell from './ModalShell';
import { supabase } from '../lib/supabase';
import ConfirmationModal from './ConfirmationModal';

const Users: React.FC<{ users: User[], activeBusinessId: string, currentUser: User }> = ({ users = [], activeBusinessId, currentUser }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [inviteLinkToShow, setInviteLinkToShow] = useState<string | null>(null);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userToTerminate, setUserToTerminate] = useState<User | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchPendingInvites = async () => {
        if (!activeBusinessId) return;
        setIsLoading(true);
        try {
            const client = await supabase.wait();
            const { data, error } = await client
                .from('invitations')
                .select('id, business_id, invited_email, role, token, status, created_at, created_by, expires_at')
                .eq('business_id', activeBusinessId)
                .eq('status', 'pending');
            
            if (error) throw error;
            setPendingInvites(data || []);
        } catch (err) {
            console.error("Invite Sync Failure", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPendingInvites(); }, [activeBusinessId]);

    const displayInvites = useMemo(() => {
        const groups = new Map();
        pendingInvites.forEach(inv => {
            const email = inv.invited_email.toLowerCase();
            if (!groups.has(email)) {
                groups.set(email, { ...inv, duplicateIds: [inv.id] });
            } else {
                groups.get(email).duplicateIds.push(inv.id);
            }
        });
        return Array.from(groups.values());
    }, [pendingInvites]);

    const handleSaveUser = async (userData: any) => {
        if (!currentUser?.id || !activeBusinessId) {
            alert("Authorization Error: Identity or Node ID missing.");
            return;
        }

        const normalizedEmail = userData.email.toLowerCase().trim();

        if (users.find(u => u.email?.toLowerCase() === normalizedEmail)) {
            alert(`Protocol Error: User ${normalizedEmail} is already a live node in this business.`);
            return;
        }

        try {
            setIsProcessing(true);
            const client = await supabase.wait();
            const token = crypto.randomUUID();
            
            const fullPayload = {
                business_id: activeBusinessId,
                invited_email: normalizedEmail,
                role: userData.role,
                token: token,
                status: 'pending',
                created_by: currentUser.id,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                metadata: { initial_investment: userData.initialInvestment || 0 }
            };

            const { error: insertError } = await client.from('invitations').insert(fullPayload);
            if (insertError) throw insertError;

            const baseUrl = window.location.origin + window.location.pathname;
            const fullLink = `${baseUrl}#/invite?token=${token}`;
            setInviteLinkToShow(fullLink);
            setIsUserModalOpen(false);
            fetchPendingInvites();
        } catch (err) {
            alert(`Protocol Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const revokeInvite = async (email: string, ids: string[]) => {
        if (!confirm(`Confirm: Purge all pending invitations for ${email}?`)) return;
        setIsProcessing(true);
        try {
            const client = await supabase.wait();
            const { error } = await client.from('invitations').delete().in('id', ids);
            if (error) throw error;
            fetchPendingInvites();
        } catch (err) {
            alert("Revoke Failure: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const terminateMembership = async () => {
        if (!userToTerminate || !activeBusinessId) return;
        setIsProcessing(true);
        try {
            const client = await supabase.wait();
            const { error } = await client
                .from('memberships')
                .delete()
                .eq('business_id', activeBusinessId)
                .eq('user_id', userToTerminate.id);
            
            if (error) throw error;
            
            setUserToTerminate(null);
            window.location.reload(); 
        } catch (err) {
            alert("Termination protocol failed: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-12 font-sans pb-24 lg:pb-8">
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl p-8 border border-white/10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Personnel</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Authorized Hub Identities & Access Control</p>
                    </div>
                    {(currentUser.role === 'Owner' || currentUser.role === 'Super Admin') && (
                        <button onClick={() => setIsUserModalOpen(true)} className="px-10 py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3">
                            <PlusIcon className="w-4 h-4" />
                            Invite Staff
                        </button>
                    )}
                </header>

                <div className="space-y-10">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 px-4">Live Operational Units</h3>
                        <div className="table-wrapper rounded-[2.5rem] border border-slate-100 dark:border-gray-800 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-8 py-5">Unit Identity</th>
                                        <th className="px-8 py-5">Protocol Role</th>
                                        <th className="px-8 py-5 text-center">Status</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-slate-100" />
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{u.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold lowercase">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                    u.role === 'Owner' || u.role === 'Super Admin' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-slate-50 dark:bg-gray-800 text-slate-500 border-slate-100'
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="status-badge status-approved !text-[8px] px-4 py-1.5 uppercase">Operational</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {(currentUser.role === 'Owner' || currentUser.role === 'Super Admin') && u.id !== currentUser.id && (
                                                    <button 
                                                        onClick={() => setUserToTerminate(u)}
                                                        className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        Terminate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {displayInvites.length > 0 && (
                        <div className="animate-fade-in pt-8 border-t dark:border-gray-800">
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-8 px-4">Pending Authorization Keys</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                                {displayInvites.map(inv => (
                                    <div key={inv.id} className="p-8 bg-amber-50/20 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30 relative group shadow-sm hover:shadow-xl transition-all">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-700 flex items-center justify-center border border-amber-100 shadow-sm">
                                                <StaffIcon className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setInviteLinkToShow(`${window.location.origin}${window.location.pathname}#/invite?token=${inv.token}`)} className="p-2.5 bg-white dark:bg-gray-700 rounded-xl text-slate-400 hover:text-primary transition-all border border-slate-100 shadow-sm" title="Copy URI"><LinkIcon className="w-4 h-4" /></button>
                                                <button onClick={() => revokeInvite(inv.invited_email, inv.duplicateIds)} className="p-2.5 bg-white dark:bg-gray-700 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 shadow-sm"><CloseIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate mb-1">{inv.invited_email}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inv.role} Authorization</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} />

            <ModalShell isOpen={!!inviteLinkToShow} onClose={() => setInviteLinkToShow(null)} title="Invitation Link" description="Share this secure link with the invitee.">
                <div className="space-y-8 py-4">
                    <div className="p-8 bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl">
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-4">Secure URI</p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 break-all font-mono text-[11px] text-white/90 select-all leading-relaxed shadow-inner">
                            {inviteLinkToShow}
                        </div>
                    </div>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(inviteLinkToShow); alert('Link copied.'); }} 
                        className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                    >
                        Copy to Clipboard
                    </button>
                </div>
            </ModalShell>

            <ConfirmationModal
                isOpen={!!userToTerminate}
                onClose={() => setUserToTerminate(null)}
                onConfirm={terminateMembership}
                title="Decommission Access?"
                message={`Authorize the immediate removal of ${userToTerminate?.name} from this business node?`}
                variant="danger"
                isIrreversible
                confirmLabel="Authorize Removal"
                isProcessing={isProcessing}
            />
        </div>
    );
};

export default Users;
