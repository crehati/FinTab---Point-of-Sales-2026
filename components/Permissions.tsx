
import React, { useState, useEffect, useMemo } from 'react';
import type { Role, User, AppPermissions, UserPermissions, ModuleKey } from '../types';
import { MODULE_CONFIG } from '../lib/permissions';
import Card from './Card';
// Fix: Import WarningIcon to resolve Error on line 182
import { WarningIcon } from '../constants';

interface PermissionsProps {
    permissions: AppPermissions;
    onUpdatePermissions: (newPermissions: AppPermissions) => void;
    t: (key: string) => string;
    users: User[];
}

const manageableRoles: Role[] = ['Manager', 'Cashier', 'SellerAgent', 'BankVerifier', 'Investor'];

const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const ShieldCheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22.444a12.02 12.02 0 009-1.499A11.955 11.955 0 0112 2.944a11.955 11.955 0 018.618 3.04z" />
    </svg>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; isOverride?: boolean; }> = ({ checked, onChange, disabled, isOverride }) => {
    const baseBg = disabled ? 'bg-slate-100 dark:bg-gray-800' : (checked ? 'bg-primary' : 'bg-slate-300 dark:bg-gray-600');
    const overrideRing = isOverride ? 'ring-2 ring-offset-2 ring-amber-400 dark:ring-offset-gray-900' : '';
    return (
        <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
            <div className={`w-11 h-6 rounded-full transition-all peer-focus:ring-2 peer-focus:ring-primary/20 ${overrideRing} ${baseBg} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full shadow-inner`}></div>
        </label>
    );
};

const Permissions: React.FC<PermissionsProps> = ({ permissions, onUpdatePermissions, t, users }) => {
    const [draftPermissions, setDraftPermissions] = useState<AppPermissions>(permissions);
    const [mode, setMode] = useState<'roles' | 'users'>('roles');
    const [selectedId, setSelectedId] = useState<Role | string>('Manager');

    useEffect(() => { setDraftPermissions(permissions); }, [permissions]);

    const hasChanges = useMemo(() => JSON.stringify(permissions) !== JSON.stringify(draftPermissions), [permissions, draftPermissions]);

    const handleToggle = (moduleKey: ModuleKey, actionKey: string, enabled: boolean) => {
        setDraftPermissions(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev));
            const target = mode === 'roles' ? newPerms.roles[selectedId] : (newPerms.users[selectedId] = newPerms.users[selectedId] || {});

            if (!target[moduleKey]) target[moduleKey] = {};
            target[moduleKey][actionKey] = enabled;

            return newPerms;
        });
    };
    
    const handleApplyTemplate = (role: Role) => {
        if (mode !== 'users' || !selectedId) return;
        setDraftPermissions(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev));
            newPerms.users[selectedId] = JSON.parse(JSON.stringify(prev.roles[role] || {}));
            return newPerms;
        });
    };

    const getPermissionState = (moduleKey: ModuleKey, actionKey: string): { checked: boolean, isOverride: boolean } => {
        if (mode === 'roles') {
            return { checked: draftPermissions.roles[selectedId as Role]?.[moduleKey]?.[actionKey] ?? false, isOverride: false };
        }
        
        const user = users.find(u => u.id === selectedId);
        if (!user) return { checked: false, isOverride: false };

        const userOverride = draftPermissions.users[selectedId]?.[moduleKey]?.[actionKey];
        const rolePermission = draftPermissions.roles[user.role]?.[moduleKey]?.[actionKey] ?? false;
        
        return {
            checked: userOverride !== undefined ? userOverride : rolePermission,
            isOverride: userOverride !== undefined && userOverride !== rolePermission
        };
    };

    const eligibleUsers = useMemo(() => users.filter(u => u.role !== 'Owner' && u.role !== 'Super Admin'), [users]);
    const selectedUser = useMemo(() => users.find(u => u.id === selectedId), [users, selectedId]);

    return (
        <div className="space-y-10 animate-fade-in font-sans pb-24">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
                <div className="relative flex items-center gap-8">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                        <ShieldCheckIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Authorization Matrix</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">Enterprise Access Control Protocols</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-gray-800 sticky top-10">
                        <div className="flex bg-slate-50 dark:bg-gray-950 p-1.5 rounded-2xl mb-8">
                            <button onClick={() => { setMode('roles'); setSelectedId('Manager'); }} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'roles' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Roles</button>
                            <button onClick={() => { setMode('users'); setSelectedId(eligibleUsers[0]?.id || ''); }} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === 'users' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Users</button>
                        </div>

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                            {mode === 'roles' ? manageableRoles.map(role => (
                                <button key={role} onClick={() => setSelectedId(role)} className={`w-full text-left px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${selectedId === role ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800'}`}>{role}</button>
                            )) : eligibleUsers.map(user => (
                                <button key={user.id} onClick={() => setSelectedId(user.id)} className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedId === user.id ? 'bg-primary text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-gray-800'}`}>
                                    <img src={user.avatarUrl} className="w-8 h-8 rounded-xl object-cover border border-white/20" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-[11px] uppercase tracking-tighter truncate">{user.name}</p>
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${selectedId === user.id ? 'text-white/60' : 'text-slate-400'}`}>{user.role}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-10">
                    {mode === 'users' && selectedUser && (
                        <div className="p-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-1">Apply Protocol Template</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Instantly synchronize {selectedUser.name}'s access levels with a standard role definition.</p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <select onChange={e => handleApplyTemplate(e.target.value as Role)} defaultValue="" className="flex-1 md:w-48 bg-white dark:bg-gray-950 border-none rounded-2xl py-3 px-6 text-[10px] font-bold uppercase tracking-widest shadow-sm outline-none focus:ring-4 focus:ring-amber-500/10">
                                    <option value="" disabled>Select Template...</option>
                                    {manageableRoles.map(role => <option key={role} value={role}>{role}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-10">
                        {MODULE_CONFIG.map(module => (
                            <div key={module.key} className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-gray-700 overflow-hidden">
                                <header className="px-8 py-6 border-b dark:border-gray-700 bg-slate-50/30 dark:bg-gray-900/30 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{module.name}</h4>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{module.actions.length} Protocols</span>
                                </header>
                                <main className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {module.actions.map(action => {
                                        const { checked, isOverride } = getPermissionState(module.key, action.key);
                                        return (
                                            <div key={action.key} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${checked ? 'border-primary/10 bg-primary/[0.01]' : 'border-slate-50 dark:border-gray-800'}`}>
                                                <div className="flex-1 pr-6">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-xs font-black uppercase tracking-tight ${checked ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>{action.name}</p>
                                                        {isOverride && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="User Override Active"></span>}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-1 leading-relaxed">{action.description}</p>
                                                </div>
                                                <ToggleSwitch checked={checked} onChange={enabled => handleToggle(module.key, action.key, enabled)} isOverride={isOverride} />
                                            </div>
                                        );
                                    })}
                                </main>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {hasChanges && (
                <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-50 animate-fade-in-up">
                    <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 backdrop-blur-xl">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                <WarningIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-widest">Protocol Changes Detected</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pending Ledger Synchronization</p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={() => setDraftPermissions(permissions)} className="flex-1 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Discard</button>
                            <button onClick={() => onUpdatePermissions(draftPermissions)} className="flex-1 md:px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/30 hover:bg-blue-600 transition-all active:scale-95">Commit Access Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Permissions;
