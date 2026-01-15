
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

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const client = await supabase.wait();
                const { data: { session } } = await client.auth.getSession();
                if (!session?.user) {
                    setIsLoading(false);
                    return;
                }

                // 1. Prioritize any session invite token (from a link click)
                const sessionToken = sessionStorage.getItem('fintab_invite_token');
                if (sessionToken) {
                    navigate(`/invite?token=${sessionToken}`);
                    return;
                }

                // 2. Fetch existing memberships
                const { data: memberships, error: mError } = await client
                    .from('memberships')
                    .select('*, businesses(*)')
                    .eq('user_id', session.user.id);
                
                if (mError) throw mError;
                
                // 3. Fetch auto-detected invitations for this email
                const { data: invites } = await client
                    .from('invitations')
                    .select('id, token, role, businesses(name, id)')
                    .eq('invited_email', session.user.email.toLowerCase())
                    .eq('status', 'pending');

                // AUTO-SELECT LOGIC: If member of ONLY 1 business and NO invites, go straight in
                if (memberships && memberships.length === 1 && (!invites || invites.length === 0)) {
                    onSelect(memberships[0].business_id);
                    return; 
                }

                setMyMemberships(memberships || []);
                setPendingInvites(invites || []);

            } catch (err) {
                setError(err.message || "Protocol connection error.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [navigate, onSelect]);

    const handleJoinInvite = (token: string) => {
        navigate(`/invite?token=${token}`);
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 font-sans">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synchronizing Authorization Grid...</p>
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
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Access Hub</h1>
                    <p className="text-sm font-medium text-slate-500">Authorized terminal nodes available for your identity.</p>
                </header>

                <div className="space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 text-center animate-shake">
                            {error}
                        </div>
                    )}

                    {/* Pending Invitations - THE PRIMARY ACTION FOR NEW STAFF */}
                    {pendingInvites.length > 0 && (
                        <div className="space-y-3 animate-fade-in-up">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] px-4">New Invitations Detected</p>
                            {pendingInvites.map(inv => (
                                <div
                                    key={inv.id}
                                    className="w-full flex items-center gap-6 p-8 bg-amber-50/50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-900/30 rounded-[2.5rem] shadow-xl"
                                >
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-white dark:bg-gray-800 flex items-center justify-center text-amber-500 shadow-md">
                                        <ShieldCheckIcon className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Join as {inv.role}</p>
                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl truncate">{inv.businesses?.name || 'Authorized Unit'}</p>
                                        <button
                                            onClick={() => handleJoinInvite(inv.token)}
                                            className="mt-4 px-8 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-amber-600 active:scale-95 transition-all"
                                        >
                                            ACCEPT & JOIN
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Existing Memberships */}
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
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{m.role} Identity</p>
                                    </div>
                                    <div className="text-slate-200 group-hover:text-primary transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No businesses and no invites */}
                    {!isLoading && myMemberships.length === 0 && pendingInvites.length === 0 && (
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

                    {/* Secondary Actions */}
                    {(myMemberships.length > 0 || pendingInvites.length > 0) && (
                        <div className="pt-8 border-t dark:border-gray-800 flex justify-center">
                             <button 
                                onClick={() => navigate('/onboarding')} 
                                className="flex items-center gap-3 px-8 py-3 rounded-full text-slate-400 hover:text-primary hover:bg-white transition-all group"
                            >
                                <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Register New Enterprise</span>
                            </button>
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
