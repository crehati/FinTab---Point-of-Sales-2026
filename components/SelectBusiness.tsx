// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { BuildingIcon, LogoutIcon, PlusIcon, WarningIcon, CrownIcon, StaffIcon, TransactionIcon, ShieldCheckIcon } from '../constants';

interface SelectBusinessProps {
    currentUser: User | null;
    onSelect: (businessId: string) => void;
    onLogout: () => void;
}

const SelectBusiness: React.FC<SelectBusinessProps> = ({ currentUser, onSelect, onLogout }) => {
    const navigate = useNavigate();
    const [myMemberships, setMyMemberships] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Safety timeout to prevent infinite loading screen
            const fetchTimeout = setTimeout(() => {
                if (isLoading) {
                    setError("Connection Timeout: The global registry is taking too long to respond. Check your internet connection.");
                    setIsLoading(false);
                }
            }, 10000);

            const client = await supabase.wait();
            const { data: sessionData, error: authError } = await client.auth.getSession();
            
            if (authError) throw authError;
            
            const session = sessionData.session;
            if (!session?.user) {
                clearTimeout(fetchTimeout);
                setIsLoading(false);
                return;
            }

            const sessionToken = sessionStorage.getItem('fintab_invite_token');
            if (sessionToken) {
                clearTimeout(fetchTimeout);
                navigate(`/invite?token=${sessionToken}`);
                return;
            }

            // Independent parallel fetch to prevent one failure from killing the entire process
            const [mshipResponse, inviteResponse] = await Promise.allSettled([
                client
                    .from('memberships')
                    .select('*, businesses(*)')
                    .eq('user_id', session.user.id),
                client
                    .from('invitations')
                    .select('id, token, role, business_id, businesses(name, id)')
                    .eq('invited_email', session.user.email?.toLowerCase() || '')
                    .eq('status', 'pending')
            ]);
            
            clearTimeout(fetchTimeout);

            let memberships = [];
            let invites = [];

            if (mshipResponse.status === 'fulfilled' && !mshipResponse.value.error) {
                memberships = mshipResponse.value.data || [];
            } else {
                console.error("Membership fetch failed:", mshipResponse);
            }

            if (inviteResponse.status === 'fulfilled' && !inviteResponse.value.error) {
                invites = inviteResponse.value.data || [];
            } else {
                console.error("Invite fetch failed:", inviteResponse);
            }

            // Auto-redirect if exactly one node exists and no pending invites
            if (memberships.length === 1 && invites.length === 0) {
                onSelect(memberships[0].business_id);
                return; 
            }

            setMyMemberships(memberships);
            const uniqueInvitesMap = new Map();
            invites.forEach(inv => {
                const key = `${inv.business_id}_${inv.role}`;
                if (!uniqueInvitesMap.has(key)) uniqueInvitesMap.set(key, inv);
            });
            setPendingInvites(Array.from(uniqueInvitesMap.values()));

            // If we have nothing and both queries finished, we are ready to show onboarding
            setIsLoading(false);

        } catch (err: any) {
            console.error("[FinTab Registry] Sync Failure:", err);
            const msg = err.message === 'Failed to fetch' 
                ? 'Network Protocol Error: Could not reach the Supabase node. This may be caused by an ad-blocker or firewall.' 
                : (err.message || "Protocol connection error.");
            setError(msg);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [navigate, onSelect]);

    const handleJoinInvite = (token: string) => {
        navigate(`/invite?token=${token}`);
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 font-sans animate-fade-in">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Initializing Global Hub...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[500px] space-y-12 animate-fade-in">
                <header className="text-center space-y-4">
                    <div className="flex justify-center mb-8">
                        <div className="w-14 h-14 bg-primary rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/30">
                             <TransactionIcon className="text-white w-8 h-8" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Your Hub</h1>
                    <p className="text-sm font-medium text-slate-500">Pick an authorized terminal node to begin.</p>
                </header>

                <div className="space-y-6">
                    {error ? (
                        <div className="p-10 bg-white dark:bg-gray-900 border border-rose-100 dark:border-rose-900/50 rounded-[2.5rem] text-center animate-shake space-y-8 shadow-2xl">
                            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
                                <WarningIcon className="w-8 h-8" />
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Connectivity Protocol Error</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-4">
                                    The Hub could not synchronize with the global registry.
                                </p>
                                <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-xl mt-4 max-h-32 overflow-y-auto">
                                    <code className="text-[10px] font-mono text-rose-500 break-all">{error}</code>
                                </div>
                            </div>
                            <button 
                                onClick={fetchData}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl"
                            >
                                Retry Authorization
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {pendingInvites.length > 0 && (
                                <div className="space-y-3 animate-fade-in-up">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] px-4">New Authorization(s) Detected</p>
                                    {pendingInvites.map(inv => (
                                        <div
                                            key={inv.id}
                                            className="w-full p-8 bg-white dark:bg-gray-900 border-2 border-amber-200 dark:border-amber-900/30 rounded-[2.5rem] shadow-xl relative overflow-hidden group"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
                                            <div className="flex items-center gap-6 mb-8">
                                                <div className="w-16 h-16 rounded-[1.25rem] bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 dark:border-amber-900/30">
                                                    <ShieldCheckIcon className="w-8 h-8" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Invitation</p>
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-2xl truncate">{inv.businesses?.name || 'Authorized Unit'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <StaffIcon className="w-4 h-4 text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{inv.role} Protocol</span>
                                                </div>
                                                <button
                                                    onClick={() => handleJoinInvite(inv.token)}
                                                    className="px-8 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 hover:bg-amber-600 active:scale-95 transition-all"
                                                >
                                                    JOIN NODE
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {myMemberships.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Authorized Hubs</p>
                                    {myMemberships.map(m => (
                                        <button
                                            key={m.business_id}
                                            onClick={() => onSelect(m.business_id)}
                                            className="w-full flex items-center gap-5 p-6 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2rem] hover:border-primary hover:shadow-2xl transition-all group text-left active:scale-[0.98] shadow-sm"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary transition-colors text-slate-400 group-hover:text-white">
                                                {(m.role === 'Owner' || m.role === 'Super Admin') ? <CrownIcon className="w-6 h-6" /> : <StaffIcon className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg truncate">{m.businesses?.name || 'Unnamed Node'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{m.role} Authorization</p>
                                            </div>
                                            <div className="text-slate-200 group-hover:text-primary transition-colors">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {myMemberships.length === 0 && pendingInvites.length === 0 && !isLoading && (
                                <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 text-center space-y-8">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto text-slate-300 shadow-inner">
                                        <BuildingIcon className="w-10 h-10" />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">Ready to start?</h3>
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed px-6">
                                            You aren't associated with any business nodes. Create a new one below.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/onboarding')} 
                                        className="w-full py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-primary/30 hover:bg-blue-700 transition-all active:scale-95"
                                    >
                                        Start New Business
                                    </button>
                                </div>
                            )}

                            {myMemberships.length > 0 && (
                                <div className="pt-8 border-t dark:border-gray-800 flex justify-center">
                                     <button 
                                        onClick={() => navigate('/onboarding')} 
                                        className="flex items-center gap-3 px-8 py-3 rounded-full text-slate-400 hover:text-primary hover:bg-white transition-all group"
                                    >
                                        <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Enroll New Enterprise</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-center pt-10">
                    <button onClick={onLogout} className="flex items-center gap-3 px-10 py-3 bg-white dark:bg-gray-900 rounded-full text-slate-400 hover:text-rose-500 font-bold uppercase text-[9px] tracking-widest transition-all border border-slate-100 dark:border-gray-800 shadow-sm">
                        <LogoutIcon className="w-4 h-4" /> Sign Out Identity
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectBusiness;