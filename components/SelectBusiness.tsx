
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { BuildingIcon, LogoutIcon, PlusIcon, WarningIcon, CrownIcon, StaffIcon, TransactionIcon } from '../constants';

interface SelectBusinessProps {
    currentUser: User | null;
    onSelect: (businessId: string) => void;
    onLogout: () => void;
}

const SelectBusiness: React.FC<SelectBusinessProps> = ({ currentUser, onSelect, onLogout }) => {
    const navigate = useNavigate();
    const [myMemberships, setMyMemberships] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [manualToken, setManualToken] = useState('');
    const [showInviteInput, setShowInviteInput] = useState(false);

    useEffect(() => {
        const fetchMemberships = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const client = await supabase.wait();
                const { data: { session } } = await client.auth.getSession();
                if (!session?.user) {
                    setIsLoading(false);
                    return;
                }

                const pendingToken = sessionStorage.getItem('fintab_invite_token');
                if (pendingToken) {
                    navigate(`/invite?token=${pendingToken}`);
                    return;
                }

                const { data, error: fetchError } = await client
                    .from('memberships')
                    .select('*, businesses(*)')
                    .eq('user_id', session.user.id);
                
                if (fetchError) {
                    setError("Registry sync failure.");
                } else if (data) {
                    setMyMemberships(data);
                }
            } catch (err) {
                setError(err.message || "Connection error.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMemberships();
    }, [navigate]);

    const handleManualTokenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualToken.trim()) {
            navigate(`/invite?token=${manualToken.trim()}`);
        }
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 font-sans">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Linking Terminal...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[480px] space-y-12 animate-fade-in">
                <header className="text-center space-y-4">
                    <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                             <TransactionIcon className="text-white w-6 h-6" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Your Hub</h1>
                    <p className="text-sm font-medium text-slate-500">Select an active operational node to continue.</p>
                </header>

                <div className="space-y-4">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 text-center">
                            {error}
                        </div>
                    )}

                    {myMemberships.length > 0 ? (
                        <div className="space-y-3">
                            {myMemberships.map(m => (
                                <button
                                    key={m.business_id}
                                    onClick={() => onSelect(m.business_id)}
                                    className="w-full flex items-center gap-5 p-6 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-3xl hover:border-primary hover:shadow-2xl transition-all group text-left active:scale-[0.98]"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        {(m.role === 'Owner' || m.role === 'Super Admin') ? (
                                            <CrownIcon className="w-6 h-6 text-primary group-hover:text-white" />
                                        ) : (
                                            <StaffIcon className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl truncate">{m.businesses?.name || 'Authorized Unit'}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: Operational • {m.role}</p>
                                    </div>
                                    <div className="text-slate-200 group-hover:text-primary transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : !error && (
                        <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 text-center space-y-10">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                                <BuildingIcon className="w-10 h-10" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">No Active Nodes</h3>
                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                    You aren't associated with a business yet. Start your own or verify an invitation.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate('/onboarding')} 
                                className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                Start My Business
                            </button>
                        </div>
                    )}

                    <div className="pt-6 space-y-3">
                        {!showInviteInput ? (
                            <button 
                                onClick={() => setShowInviteInput(true)}
                                className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-[0.2em] transition-all"
                            >
                                Redeem Invite Code
                            </button>
                        ) : (
                            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-primary/20 animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enrollment Token</p>
                                    <button onClick={() => setShowInviteInput(false)} className="text-slate-300 hover:text-rose-500"><PlusIcon className="w-4 h-4 rotate-45" /></button>
                                </div>
                                <form onSubmit={handleManualTokenSubmit} className="space-y-4">
                                    <input 
                                        type="text" 
                                        value={manualToken} 
                                        onChange={e => setManualToken(e.target.value)} 
                                        placeholder="PASTE TOKEN HERE" 
                                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-xl p-4 text-sm font-bold text-center uppercase tracking-[0.2em] outline-none" 
                                    />
                                    <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Verify & Link</button>
                                </form>
                            </div>
                        )}
                        
                        {myMemberships.length > 0 && (
                             <button 
                                onClick={() => navigate('/onboarding')} 
                                className="w-full flex items-center justify-center gap-3 p-5 bg-white dark:bg-gray-900 text-slate-500 border border-slate-100 dark:border-gray-800 rounded-3xl hover:border-primary/20 hover:text-primary transition-all shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Create New Business</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-center pt-8 border-t dark:border-gray-800">
                    <button onClick={onLogout} className="flex items-center gap-3 px-10 py-3 bg-white dark:bg-gray-900 rounded-full text-slate-400 hover:text-rose-500 font-bold uppercase text-[9px] tracking-widest transition-all border border-slate-100 dark:border-gray-800">
                        <LogoutIcon className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectBusiness;
