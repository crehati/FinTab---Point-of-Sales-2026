
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

    const handleSaveUser = async (userData: any) => {
        if (!currentUser?.id || !activeBusinessId) {
            alert("Authorization Error: Identity or Node ID missing.");
            return;
        }

        const normalizedEmail = userData.email.toLowerCase().trim();

        // 1. Check for existing membership
        if (users.find(u => u.email?.toLowerCase() === normalizedEmail)) {
            alert(`Protocol Error: User ${normalizedEmail} is already a live node in this business.`);
            return;
        }

        // 2. Check for duplicate pending invite
        const existingInvite = pendingInvites.find(inv => inv.invited_email.toLowerCase() === normalizedEmail);
        if (existingInvite) {
            if (confirm(`Identity ${normalizedEmail} already has a pending invitation. Re-issue current token link?`)) {
                const baseUrl = window.location.origin + window.location.pathname;
                setInviteLinkToShow(`${baseUrl}#/invite?token=${existingInvite.token}`);
                setIsUserModalOpen(false);
            }
            return;
        }

        try {
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
        }
    };

    const revokeInvite = async (id: string) => {
        if (!confirm("Authorize decommissioning of this invitation? The token will be immediately voided.")) return;
        setIsProcessing(true);
        try {
            const client = await supabase.wait();
            const { error } = await client.from('invitations').delete().eq('id', id);
            
            if (error) {
                if (error.message.includes("permission denied")) {
                    throw new Error("Authorization Denied: Run the Supabase SQL update to grant revoke permissions to Owners.");
                }
                throw error;
            }
            
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
            alert(`Identity ${userToTerminate.name} has been removed from this business node.`);
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
                            Enroll Unit
                        </button>
                    )}
                </header>

                <div className="space-y-10">
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 px-4">Live Operational Units</h3>
                        <div className="table-wrapper rounded-[2.5rem] border border-slate-50 dark:border-gray-800 overflow-hidden">
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

                    {pendingInvites.length > 0 && (
                        <div className="animate-fade-in pt-8 border-t dark:border-gray-800">
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-8 px-4">Pending Initializations ({pendingInvites.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                                {pendingInvites.map(inv => (
                                    <div key={inv.id} className="p-8 bg-slate-50 dark:bg-gray-800 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 relative group shadow-sm hover:shadow-xl transition-all">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-700 flex items-center justify-center border border-amber-100 shadow-sm">
                                                <StaffIcon className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setInviteLinkToShow(`${window.location.origin}${window.location.pathname}#/invite?token=${inv.token}`)} className="p-2.5 bg-white dark:bg-gray-700 rounded-xl text-slate-400 hover:text-primary transition-all border border-slate-100 shadow-sm" title="Re-issue Link"><LinkIcon className="w-4 h-4" /></button>
                                                <button onClick={() => revokeInvite(inv.id)} className="p-2.5 bg-white dark:bg-gray-700 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 shadow-sm" title="Decommission Invite"><CloseIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{inv.invited_email}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Target Role: {inv.role}</p>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-700 flex justify-between items-center">
                                            <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest animate-pulse">Awaiting Verification</span>
                                            <p className="text-[8px] font-bold text-slate-300 uppercase">{new Date(inv.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} />

            <ModalShell isOpen={!!inviteLinkToShow} onClose={() => setInviteLinkToShow(null)} title="Invitation Link Issued" description="Share this secure link with the staff node.">
                <div className="space-y-8 py-4">
                    <div className="p-8 bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-4">Secure Authorization URI</p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 break-all font-mono text-[11px] text-white/90 select-all leading-relaxed shadow-inner">
                            {inviteLinkToShow}
                        </div>
                    </div>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(inviteLinkToShow); alert('Link synchronized to clipboard.'); }} 
                        className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl hover:bg-blue-700 transition-all active:scale-95"
                    >
                        Copy to Clipboard
                    </button>
                </div>
            </ModalShell>

            <ConfirmationModal
                isOpen={!!userToTerminate}
                onClose={() => setUserToTerminate(null)}
                onConfirm={terminateMembership}
                title="Decommission Node?"
                message={`Authorize the immediate removal of ${userToTerminate?.name} from this business. Access will be revoked instantly.`}
                variant="danger"
                isIrreversible
                confirmLabel="Authorize Removal"
                isProcessing={isProcessing}
            />
        </div>
    );
};

export default Users;
