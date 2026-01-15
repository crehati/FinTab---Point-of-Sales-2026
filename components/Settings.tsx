
// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import type { 
    User, 
    ReceiptSettingsData, 
    BusinessSettingsData, 
    BusinessProfile, 
    AppPermissions, 
    OwnerSettings,
    PrinterSettingsData
} from '../types';
import { 
    CrownIcon, 
    SettingsIcon, 
    ChevronDownIcon, 
    BuildingIcon, 
    ReceiptsIcon, 
    PrintIcon, 
    ShieldCheckIcon,
    ProfileIcon,
    DownloadJpgIcon,
    WarningIcon,
    TransactionIcon,
    PlusIcon
} from '../constants';

// Sub-components
import BusinessSettings from './BusinessSettings';
import ReceiptSettings from './ReceiptSettings';
import PrinterSettings from './PrinterSettings';
import Permissions from './Permissions';
import OwnerSettingsPage from './OwnerSettings';

interface SettingsProps {
    language: string;
    setLanguage: (langCode: string) => void;
    t: (key: string) => string;
    currentUser: User;
    users: User[];
    receiptSettings: ReceiptSettingsData;
    setReceiptSettings: (settings: ReceiptSettingsData) => void;
    businessSettings: BusinessSettingsData;
    onUpdateBusinessSettings: (settings: BusinessSettingsData) => void;
    businessProfile: BusinessProfile | null;
    onUpdateBusinessProfile: (profile: BusinessProfile | null) => void;
    ownerSettings: OwnerSettings;
    onUpdateOwnerSettings: (settings: OwnerSettings) => void;
    printerSettings: PrinterSettingsData;
    onUpdatePrinterSettings: (settings: PrinterSettingsData) => void;
    permissions: AppPermissions;
    onUpdatePermissions: (newPermissions: AppPermissions) => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    onResetBusiness: () => void;
    onUpdateCurrentUserProfile: (profileData: any) => void;
}

const ThemeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);
const LanguageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m4 13l4-4M19 17l-4-4m-4 4h4m-6 4H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 v6a2 2 0 01-2 2h-1l-4 4z" />
    </svg>
);

const Settings: React.FC<SettingsProps> = (props) => {
    const { 
        language, setLanguage, t, currentUser, users, 
        receiptSettings, setReceiptSettings, 
        businessSettings, onUpdateBusinessSettings,
        businessProfile, onUpdateBusinessProfile,
        ownerSettings, onUpdateOwnerSettings,
        printerSettings, onUpdatePrinterSettings,
        permissions, onUpdatePermissions,
        theme, setTheme, onResetBusiness, onUpdateCurrentUserProfile
    } = props;

    const [activeTab, setActiveTab] = useState<'app' | 'business' | 'receipts' | 'hardware' | 'security' | 'owner' | 'sync'>('app');
    const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    
    const languages = [
        { name: 'English', code: 'en' },
        { name: 'Español', code: 'es' },
        { name: 'Français', code: 'fr' },
        { name: 'Kreyòl Ayisyen', code: 'ht' }
    ];
    const selectedLanguage = languages.find(l => l.code === language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
                setLanguageDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleManualBackup = () => {
        const data = {
            profile: businessProfile,
            settings: businessSettings,
            receipts: receiptSettings,
            timestamp: new Date().toISOString(),
            version: "1.4.6-LOCAL-BACKUP"
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FinTab_Node_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isPrivileged = currentUser.role === 'Owner' || currentUser.role === 'Super Admin' || currentUser.role === 'Admin';

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-fade-in font-sans">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
                <div className="relative flex items-center gap-10">
                    <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                        <SettingsIcon className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{t('settings')}</h1>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-4">Terminal Configuration Node</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Vertical Navigation */}
                <div className="lg:col-span-3 space-y-2">
                    {[
                        { id: 'app', label: 'App Preferences', icon: <SettingsIcon /> },
                        { id: 'business', label: 'Business Entity', icon: <BuildingIcon />, privileged: true },
                        { id: 'receipts', label: 'Visual Identity', icon: <ReceiptsIcon />, privileged: true },
                        { id: 'hardware', label: 'Hardware Link', icon: <PrintIcon />, privileged: true },
                        { id: 'security', label: 'Security Matrix', icon: <ShieldCheckIcon />, privileged: true },
                        { id: 'owner', label: 'Owner Logic', icon: <CrownIcon />, ownerOnly: true },
                        { id: 'sync', label: 'Sync Integrity', icon: <TransactionIcon />, privileged: true },
                    ].map((tab) => {
                        if (tab.privileged && !isPrivileged) return null;
                        if (tab.ownerOnly && currentUser.role !== 'Owner') return null;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm uppercase tracking-tight ${
                                    activeTab === tab.id 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                    : 'text-slate-500 hover:bg-white dark:hover:bg-gray-900 hover:shadow-sm'
                                }`}
                            >
                                <div className={activeTab === tab.id ? 'text-white' : 'text-slate-400'}>
                                    {tab.icon}
                                </div>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9 animate-fade-in">
                    {activeTab === 'app' && (
                        <div className="space-y-10">
                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white mb-8">Interface Protocol</h3>
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-gray-950 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl text-slate-400 shadow-sm"><ThemeIcon /></div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Dark Mode</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={theme === 'dark'} onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="sr-only" />
                                            <div className={`w-14 h-8 rounded-full border-2 transition-all ${theme === 'dark' ? 'bg-primary border-primary' : 'bg-slate-200'}`}>
                                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="relative" ref={languageDropdownRef}>
                                        <button onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)} className="w-full flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2rem] hover:border-primary/20 transition-all text-left group">
                                            <div className="flex items-center gap-4">
                                                <div className="text-slate-300 group-hover:text-primary transition-colors"><LanguageIcon /></div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Language</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{selectedLanguage.name}</p>
                                                </div>
                                            </div>
                                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {languageDropdownOpen && (
                                            <div className="absolute z-50 w-full mt-3 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border dark:border-gray-800 p-2 animate-scale-in origin-top">
                                                {languages.map(lang => (
                                                    <button key={lang.code} onClick={() => { setLanguage(lang.code); setLanguageDropdownOpen(false); }} className="w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors">{lang.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-8 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-[3rem]">
                                <h4 className="text-[9px] font-black text-rose-600 uppercase tracking-[0.4em] mb-4">Maintenance Protocol</h4>
                                <button onClick={() => { if(confirm('Clear local terminal cache? This will re-synchronize from registry.')) window.location.reload(); }} className="px-8 py-4 bg-white dark:bg-gray-900 border border-rose-100 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-rose-500 hover:text-white transition-all">Clear Node Cache</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'business' && isPrivileged && (
                        <BusinessSettings 
                            settings={businessSettings} 
                            onUpdateSettings={onUpdateBusinessSettings} 
                            businessProfile={businessProfile} 
                            onUpdateBusinessProfile={onUpdateBusinessProfile} 
                            onResetBusiness={onResetBusiness} 
                            t={t} 
                            currentUser={currentUser} 
                            onUpdateCurrentUserProfile={onUpdateCurrentUserProfile}
                            users={users}
                        />
                    )}

                    {activeTab === 'receipts' && isPrivileged && (
                        <ReceiptSettings settings={receiptSettings} setSettings={setReceiptSettings} t={t} />
                    )}

                    {activeTab === 'hardware' && isPrivileged && (
                        <PrinterSettings settings={printerSettings} onUpdateSettings={onUpdatePrinterSettings} />
                    )}

                    {activeTab === 'security' && isPrivileged && (
                        <Permissions permissions={permissions} onUpdatePermissions={onUpdatePermissions} t={t} users={users} />
                    )}

                    {activeTab === 'owner' && currentUser.role === 'Owner' && (
                        <OwnerSettingsPage ownerSettings={ownerSettings} onUpdate={onUpdateOwnerSettings} t={t} />
                    )}

                    {activeTab === 'sync' && isPrivileged && (
                        <div className="space-y-10">
                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-sm"><DownloadJpgIcon /></div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Manual Export Control</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Safety protocol for cloud sync failure</p>
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50 dark:bg-gray-950 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-inner mb-8">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-tight">
                                        If GitHub authentication is looping, use this button to export a snapshot of your node configuration. This file can be used to restore your settings in a new environment.
                                    </p>
                                </div>
                                <button onClick={handleManualBackup} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3">
                                    Generate Node Snapshot (.json)
                                </button>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-[3rem] p-10 shadow-xl border border-amber-100 dark:border-amber-900/30">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl shadow-sm"><WarningIcon /></div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Manual Key Injection Guide</h3>
                                        <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-1">How to bypass the GitHub login loop</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="p-6 bg-white dark:bg-gray-950 rounded-[1.5rem] border border-amber-100">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Phase 1: Get the Key (On GitHub.com)</p>
                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">1. Click your Profile Picture > <b>Settings</b></p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">2. Scroll to bottom > <b>Developer Settings</b></p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">3. <b>Personal Access Tokens</b> > <b>Tokens (classic)</b></p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">4. Generate New Token, name it "Editor", check <b>'repo'</b>, and COPY it.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 bg-white dark:bg-gray-950 rounded-[1.5rem] border border-amber-100">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Phase 2: Use the Key (In this Editor)</p>
                                        <div className="p-6 bg-slate-900 rounded-2xl border border-white/10 text-center">
                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <ShieldCheckIcon className="w-6 h-6 text-primary" />
                                            </div>
                                            <p className="text-xs text-white font-bold uppercase mb-4">Wait for the Prompt</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6">
                                                When you click "Push" or "Sync" and it fails, your editor will show a box asking for <b>Credentials</b> or <b>GitHub Login</b>.
                                            </p>
                                            <div className="bg-white/5 p-4 rounded-xl border border-dashed border-white/20">
                                                <p className="text-[9px] text-amber-400 font-black uppercase mb-2">DO NOT CLICK "SIGN IN WITH BROWSER"</p>
                                                <p className="text-[11px] text-slate-300">Look for a link inside that window that says <br/><b className="text-white">"Enter manual token"</b> or <b className="text-white">"Enter credentials"</b>.</p>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex items-center gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-tight">PASTE YOUR COPIED TOKEN INTO THAT BOX.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
