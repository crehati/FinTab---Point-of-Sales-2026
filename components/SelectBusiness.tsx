
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { BuildingIcon, LogoutIcon, PlusIcon, WarningIcon, CrownIcon, StaffIcon } from '../constants';

interface SelectBusinessProps {
    currentUser: User | null;
    onSelect: (businessId: string) => void;
    onLogout: () => void;
    isOwnerAdmin: boolean;
}

const SelectBusiness: React.FC<SelectBusinessProps> = ({ currentUser, onSelect, onLogout, isOwnerAdmin }) => {
    const navigate = useNavigate();
    const [myMemberships, setMyMemberships] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [manualToken, setManualToken] = useState('');

    useEffect(() => {
        if (!currentUser || !currentUser.id) return;

        const fetchMemberships = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                await supabase.wait();
                const { data, error: fetchError } = await supabase
                    .from('memberships')
                    .select(`
                        role, 
                        business_id, 
                        businesses:business_id (
                            name, 
                            profile
                        )
                    `)
                    .eq('user_id', currentUser.id);
                
                if (fetchError) {
                    console.error("[Terminal Hub] Membership fetch failed:", fetchError);
                    setError(fetchError.message);
                } else if (data) {
                    setMyMemberships(data);
                }
            } catch (err) {
                setError("Protocol Error: Cloud node unreachable.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMemberships();
    }, [currentUser?.id]);

    const handleManualTokenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualToken.trim()) {
            navigate(`/invite?token=${manualToken.trim()}`);
        }
    };

    if (isLoading || !currentUser) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    const getRoleStyles = (role: string) => {
        if (role === 'Owner' || role === 'Super Admin') return 'bg-primary text-white border-primary shadow-lg shadow-primary/20';
        if (role === 'Manager') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        return 'bg-slate-50 text-slate-500 border-slate-100';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[500px] space-y-10 animate-fade-in">
                <header className="text-center space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-slate-100 dark:border-gray-800 flex items-center justify-center mx-auto">
                        <BuildingIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase">Terminal Hub</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Operational Nodes</p>
                </header>

                <div className="space-y-6">
                    {error && (
                        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl animate-shake">
                            <div className="flex items-center gap-2 text-rose-600 mb-3 font-black text-[10px] uppercase">
                                <WarningIcon className="w-4 h-4" />
                                Protocol Sync Failure
                            </div>
                            <pre className="text-[9px] font-mono text-rose-500 overflow-x-auto whitespace-pre-wrap">{error}</pre>
                            <button onClick={() => window.location.reload()} className="mt-4 w-full py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase">Retry Node Fetch</button>
                        </div>
                    )}

                    {myMemberships.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {myMemberships.map(m => (
                                <button
                                    key={m.business_id}
                                    onClick={() => onSelect(m.business_id)}
                                    className="w-full flex items-center gap-5 p-6 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2.5rem] hover:border-primary hover:shadow-2xl transition-all group text-left shadow-sm active:scale-[0.98]"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        {(m.role === 'Owner' || m.role === 'Super Admin') ? (
                                            <CrownIcon className="w-6 h-6 text-primary group-hover:text-white" />
                                        ) : (
                                            <StaffIcon className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl truncate leading-tight">{m.businesses?.name}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${getRoleStyles(m.role)}`}>
                                                Protocol: {m.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={4} /></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : !error && (
                        <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] border border-dashed border-slate-200 dark:border-gray-800 text-center space-y-6">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">No Authorized Nodes Found.<br/>You must enroll a new business to begin.</p>
                            <button onClick={() => navigate('/onboarding')} className="px-10 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Enroll New Business</button>
                        </div>
                    )}

                    {myMemberships.length > 0 && (
                        <button 
                            onClick={() => navigate('/onboarding')}
                            className="w-full flex items-center justify-center gap-3 p-6 bg-primary/5 text-primary border-2 border-dashed border-primary/20 rounded-[2.5rem] hover:bg-primary hover:text-white hover:border-primary transition-all group"
                        >
                            <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Enroll Additional Node</span>
                        </button>
                    )}

                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 px-1">Accept Invitation</h3>
                        <form onSubmit={handleManualTokenSubmit} className="space-y-4">
                            <input 
                                type="text" 
                                value={manualToken}
                                onChange={e => setManualToken(e.target.value)}
                                placeholder="Enter Protocol Token"
                                className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold text-center uppercase tracking-widest focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                            />
                            <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Verify Token</button>
                        </form>
                    </div>
                </div>

                <div className="flex justify-center pt-6">
                    <button onClick={onLogout} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-gray-900 rounded-2xl text-slate-400 hover:text-rose-500 font-bold uppercase text-[10px] tracking-[0.2em] transition-all border border-slate-100 dark:border-gray-800">
                        <LogoutIcon className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectBusiness;
