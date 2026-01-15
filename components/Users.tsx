
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../types';
import EmptyState from './EmptyState';
import { PlusIcon, StaffIcon, LinkIcon, CloseIcon } from '../constants';
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
            
            if (error) {
                const { data: fallbackData } = await client
                    .from('invitations')
                    .select('id, invited_email, role, token, status')
                    .eq('business_id', activeBusinessId)
                    .eq('status', 'pending');
                if (fallbackData) setPendingInvites(fallbackData);
            } else if (data) {
                setPendingInvites(data);
            }
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

        try {
            const client = await supabase.wait();
            const token = crypto.randomUUID();
            
            const fullPayload = {
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
            };

            const { error: insertError } = await client.from('invitations').insert(fullPayload);

            if (insertError) {
                const errorText = insertError.message || "";
                if (errorText.includes("metadata") || errorText.includes("schema cache") || insertError.code === '42703') {
                    const { metadata, ...basicPayload } = fullPayload;
                    const { error: retryError } = await client.from('invitations').insert(basicPayload);
                    if (retryError) throw retryError;
                    alert("PROTOCOL SYNC WARNING: PostgREST schema cache is stale. Enrollment was successful in 'Safe Mode'.");
                } else {
                    throw insertError;
                }
            }

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
        if (!confirm("Revoke this invitation? The link will be decommissioned.")) return;
        const client = await supabase.wait();
        await client.from('invitations').delete().eq('id', id);
        fetchPendingInvites();
    };

    const terminateMembership = async () => {
        if (!userToTerminate || !activeBusinessId) return;
        
        try {
            const client = await supabase.wait();
            const { error } = await client
                .from('memberships')
                .delete()
                .eq('business_id', activeBusinessId)
                .eq('user_id', userToTerminate.id);
            
            if (error) throw error;
            
            setUserToTerminate(null);
            // We need to refresh the parent App's users state.
            // Since App.tsx fetches from 'memberships', a reload or state sync is needed.
            alert(`Identity ${userToTerminate.name} has been purged from the node.`);
            window.location.reload(); 
        } catch (err) {
            alert("Termination protocol failed: " + err.message);
        }
    };

    const forceSyncRegistry = () => {
        setIsLoading(true);
        fetchPendingInvites();
        setTimeout(() => setIsLoading(false), 1000);
    };

    return (
        <div className="space-y-12 font-sans pb-24 lg:pb-8">
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl p-8 border border-white/10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Personnel</h2>
                        <div className="flex items-center gap-4 mt-4">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Authorized Node Grid: Live & Pending Identities</p>
                            <button onClick={forceSyncRegistry} className="p-2 bg-slate-50 dark:bg-gray-800 rounded-lg text-slate-400 hover:text-primary transition-colors" title="Force Sync Schema Cache">
                                <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                    </div>
                    {(currentUser.role === 'Owner' || currentUser.role === 'Super Admin') && (
                        <button onClick={() => setIsUserModalOpen(true)} className="px-10 py-4 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3">
                            <PlusIcon className="w-4 h-4" />
                            Enroll New Unit
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
                                        <th className="px-8 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-800">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-11 h-11 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-sm" />
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base">{u.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold lowercase truncate max-w-[150px]">{u.email}</p>
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
                                                <span className="status-badge status-approved !text-[8px] px-4 py-1.5">Live Node</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {(currentUser.role === 'Owner' || currentUser.role === 'Super Admin') && u.id !== currentUser.id && (
                                                    <button 
                                                        onClick={() => setUserToTerminate(u)}
                                                        className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-rose-500 transition-colors"
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
                        <div className="animate-fade-in">
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-6 px-4">Pending Identity Authorizations</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pendingInvites.map(inv => (
                                    <div key={inv.id} className="p-6 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2.5rem] flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center border border-amber-100">
                                                <LinkIcon className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">{inv.invited_email}</p>
                                                <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-1">Protocol: {inv.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setInviteLinkToShow(`${window.location.origin}${window.location.pathname}#/invite?token=${inv.token}`); }} className="p-3 bg-white dark:bg-gray-800 rounded-xl text-slate-400 hover:text-primary transition-all border border-slate-100 shadow-sm"><LinkIcon className="w-4 h-4" /></button>
                                            <button onClick={() => revokeInvite(inv.id)} className="p-3 bg-white dark:bg-gray-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 shadow-sm"><CloseIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} />

            <ModalShell isOpen={!!inviteLinkToShow} onClose={() => setInviteLinkToShow(null)} title="Identity Token Issued" description="Share this secure authorization link with the invitee.">
                <div className="space-y-8 py-4">
                    <div className="p-8 bg-slate-900 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Secure Terminal URI</p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 break-all font-mono text-[11px] text-white/90 select-all leading-relaxed shadow-inner">
                            {inviteLinkToShow}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => { navigator.clipboard.writeText(inviteLinkToShow); alert('Protocol link copied to clipboard.'); }} 
                            className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all hover:bg-blue-700"
                        >
                            Copy Authorization Link
                        </button>
                    </div>
                </div>
            </ModalShell>

            <ConfirmationModal
                isOpen={!!userToTerminate}
                onClose={() => setUserToTerminate(null)}
                onConfirm={terminateMembership}
                title="TERMINATE UNIT ACCESS"
                message={`Authorize the immediate decommissioning of ${userToTerminate?.name}'s access to this business node. This identity will no longer be able to authorize terminal sequences.`}
                variant="danger"
                isIrreversible
                confirmLabel="Authorize Termination"
            />
        </div>
    );
};

export default Users;
