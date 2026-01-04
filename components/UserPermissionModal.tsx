
import React, { useState, useEffect, useMemo } from 'react';
import type { Role, User, AppPermissions, UserPermissions, ModuleKey } from '../types';
import { MODULE_CONFIG, DEFAULT_PERMISSIONS } from '../lib/permissions';
import ModalShell from './ModalShell';

interface UserPermissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, userPermissions: UserPermissions, roleLabel: string) => void;
    user: User | null;
}

const PRESET_ROLES: { id: Role; label: string }[] = [
    { id: 'Owner', label: 'Owner/Admin' },
    { id: 'Admin', label: 'System Admin' },
    { id: 'Manager', label: 'Manager' },
    { id: 'Staff', label: 'General Staff' },
    { id: 'Investor', label: 'Investor' },
    { id: 'Custom', label: 'Custom' }
];

const UserPermissionModal: React.FC<UserPermissionModalProps> = ({ isOpen, onClose, onSave, user }) => {
    const [draftPermissions, setDraftPermissions] = useState<UserPermissions>({});
    const [roleLabel, setRoleLabel] = useState<string>('Custom');

    useEffect(() => {
        if (user && isOpen) {
            setDraftPermissions(JSON.parse(JSON.stringify(user.permissions || {})));
            setRoleLabel(user.role_label || user.role || 'Custom');
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleToggle = (moduleKey: ModuleKey, actionKey: string, enabled: boolean) => {
        setDraftPermissions(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            if (!next[moduleKey]) next[moduleKey] = {};
            next[moduleKey][actionKey] = enabled;
            setRoleLabel('Custom'); 
            return next;
        });
    };

    const handleToggleModule = (moduleKey: ModuleKey, enabled: boolean) => {
        setDraftPermissions(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const module = MODULE_CONFIG.find(m => m.key === moduleKey);
            if (!module) return prev;
            next[moduleKey] = {};
            module.actions.forEach(a => {
                next[moduleKey][a.key] = enabled;
            });
            setRoleLabel('Custom');
            return next;
        });
    };

    const applyTemplate = (role: Role) => {
        const template = DEFAULT_PERMISSIONS.roles[role] || {};
        setDraftPermissions(JSON.parse(JSON.stringify(template)));
        setRoleLabel(role);
    };

    const handleSave = () => {
        onSave(user.id, draftPermissions, roleLabel);
    };

    const footer = (
        <>
            <button onClick={handleSave} className="btn-base btn-primary flex-1 py-5">
                Authorize Changes & Log Sync
            </button>
            <button onClick={onClose} className="btn-base btn-secondary px-8">
                Abort
            </button>
        </>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Rights Audit: ${user.name}`} 
            description="Manage per-user module authorization and specific action logic."
            maxWidth="max-w-5xl"
            footer={footer}
        >
            <div className="space-y-12 font-sans pb-10">
                {/* 1. Presets */}
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">Authority Protocol Presets</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {PRESET_ROLES.map(preset => (
                            <button 
                                key={preset.id}
                                onClick={() => applyTemplate(preset.id)}
                                className={`p-4 rounded-2xl border-2 transition-all text-center group active:scale-95 ${
                                    roleLabel === preset.id 
                                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20' 
                                    : 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800 text-slate-500 hover:border-primary/40'
                                }`}
                            >
                                <p className={`text-[10px] font-black uppercase tracking-widest ${roleLabel === preset.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{preset.label}</p>
                                <p className={`text-[8px] mt-1 font-bold uppercase tracking-tight ${roleLabel === preset.id ? 'text-white/60' : 'text-slate-400'}`}>Protocol</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. The Matrix */}
                <div className="grid grid-cols-1 gap-6">
                    {MODULE_CONFIG.map(module => {
                        const moduleActions = draftPermissions[module.key] || {};
                        const allEnabled = module.actions.every(a => moduleActions[a.key]);
                        const someEnabled = module.actions.some(a => moduleActions[a.key]);

                        return (
                            <div key={module.key} className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 overflow-hidden shadow-sm">
                                <header className="px-8 py-5 border-b dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${someEnabled ? 'bg-primary animate-pulse' : 'bg-slate-300'}`}></div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{module.name}</h4>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">Grant All</span>
                                        <input 
                                            type="checkbox" 
                                            checked={allEnabled}
                                            onChange={(e) => handleToggleModule(module.key, e.target.checked)}
                                            className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                        />
                                    </label>
                                </header>
                                <main className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {module.actions.map(action => {
                                        const checked = moduleActions[action.key] ?? false;
                                        return (
                                            <button 
                                                key={action.key}
                                                onClick={() => handleToggle(module.key, action.key, !checked)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                                                    checked 
                                                    ? 'bg-primary/[0.03] border-primary/10' 
                                                    : 'bg-transparent border-transparent grayscale opacity-40 hover:opacity-100 hover:grayscale-0'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-200 dark:border-gray-700'}`}>
                                                    {checked && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-[10px] font-black uppercase tracking-tight truncate ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{action.name}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">{action.description}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </main>
                            </div>
                        );
                    })}
                </div>

                {/* 3. Logic Notice */}
                <div className="p-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[2.5rem] flex items-start gap-5">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl text-primary shadow-sm">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <div>
                        <p className="text-xs font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest">Protocol Sync Enforcement</p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight mt-2 leading-relaxed">
                            Terminal security follows a safe-default policy. Any action not explicitly checked above will be denied at runtime. Changes are recorded in the business audit ledger.
                        </p>
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};

export default UserPermissionModal;
