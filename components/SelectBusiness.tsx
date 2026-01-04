
import React, { useMemo, useState } from 'react';
import type { User, AdminBusinessData } from '../types';
import { getStoredItem } from '../lib/utils';
import { BuildingIcon, LogoutIcon, PlusIcon } from '../constants';

interface SelectBusinessProps {
    currentUser: User;
    onSelect: (businessId: string) => void;
    onLogout: () => void;
}

const SelectBusiness: React.FC<SelectBusinessProps> = ({ currentUser, onSelect, onLogout }) => {
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const myBusinesses = useMemo(() => {
        const registry = getStoredItem<AdminBusinessData[]>('fintab_businesses_registry', []);
        // In this simulation, we check for ownership or staff listing
        return registry.filter(b => {
            if (b.owner.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
            const users = getStoredItem<User[]>(`fintab_${b.id}_users`, []);
            return users.some(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
        });
    }, [currentUser.email]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        // Invite code logic simulation
        if (inviteCode.length < 4) {
            setError("Invalid Protocol Code.");
            return;
        }
        setError("Synchronization Error: Invite node not found. Check code with owner.");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[500px] space-y-10 animate-fade-in">
                <header className="text-center space-y-4">
                    <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-slate-100 dark:border-gray-800 flex items-center justify-center mx-auto">
                        <BuildingIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase">Select Business Node</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Authorization Required</p>
                </header>

                <div className="space-y-6">
                    {myBusinesses.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {myBusinesses.map(biz => (
                                <button
                                    key={biz.id}
                                    onClick={() => onSelect(biz.id)}
                                    className="w-full flex items-center gap-5 p-6 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-[2rem] hover:border-primary hover:shadow-xl transition-all group text-left shadow-sm active:scale-[0.98]"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                        <BuildingIcon className="w-6 h-6 text-slate-400 group-hover:text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-lg truncate">{biz.profile.businessName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{biz.owner.name.split(' ')[0]}'s Node</p>
                                    </div>
                                    <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={3} /></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border border-dashed border-slate-200 dark:border-gray-800 text-center">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Active Connections Found</p>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 px-1">Join via Invitation</h3>
                        <form onSubmit={handleJoin} className="space-y-4">
                            <input 
                                type="text" 
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                                placeholder="Enter Access Code"
                                className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none uppercase text-center tracking-[0.5em]"
                            />
                            {error && <p className="text-[10px] font-black text-rose-500 uppercase text-center mt-2">{error}</p>}
                            <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2">
                                <PlusIcon className="w-4 h-4" /> Join Network
                            </button>
                        </form>
                    </div>
                </div>

                <div className="flex justify-center pt-6">
                    <button onClick={onLogout} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-gray-900 rounded-2xl text-slate-400 hover:text-rose-500 font-bold uppercase text-[10px] tracking-[0.3em] transition-all border border-slate-100 dark:border-gray-800">
                        <LogoutIcon className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectBusiness;
