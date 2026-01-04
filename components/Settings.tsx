
import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import type { User, ReceiptSettingsData } from '../types';
import { CrownIcon, SettingsIcon, ChevronDownIcon } from '../constants';

// Professional Modern Icons
const ThemeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);
const LanguageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m4 13l4-4M19 17l-4-4m-4 4h4m-6 4H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 v6a2 2 0 01-2 2h-1l-4 4z" />
    </svg>
);
const CurrencyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 10v-1m0 0c-1.11 0-2.08-.402-2.599-1M9.401 9a2.001 2.001 0 00-1.414-1.414M12 16c-1.657 0-3-.895-3-2s1.343-2 3-2m0 0c1.657 0 3 .895 3 2s-1.343 2-2 2m0-10a9 9 0 110 18 9 9 0 010-18z" />
    </svg>
);
const ReceiptIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const PermissionsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);
const BusinessIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);
const PrinterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

interface SettingsProps {
    language: string;
    setLanguage: (langCode: string) => void;
    t: (key: string) => string;
    currentUser: User;
    receiptSettings: ReceiptSettingsData;
    setReceiptSettings: (settings: ReceiptSettingsData) => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}

const languages = [
    { name: 'English', code: 'en' },
    { name: 'Español', code: 'es' },
    { name: 'Français', code: 'fr' },
    { name: 'Deutsch', code: 'de' },
    { name: 'Kreyòl Ayisyen', code: 'ht' },
];

const currencies = [
    { name: 'USD ($)', symbol: '$' },
    { name: 'EUR (€)', symbol: '€' },
    { name: 'GBP (£)', symbol: '£' },
    { name: 'HTG (G)', symbol: 'G' },
    { name: 'DOP (RD$)', symbol: 'RD$' },
    { name: 'CAD (C$)', symbol: 'C$' },
];

const Settings: React.FC<SettingsProps> = ({ language, setLanguage, t, currentUser, receiptSettings, setReceiptSettings, theme, setTheme }) => {
    const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
    const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    const currencyDropdownRef = useRef<HTMLDivElement>(null);
    
    const selectedLanguage = languages.find(l => l.code === language) || languages[0];
    const selectedCurrency = currencies.find(c => c.symbol === receiptSettings.currencySymbol) || currencies[0];

    const managementNodes = [
        { key: 'settings.receipts', icon: <ReceiptIcon />, to: '/settings/receipts', desc: 'Visual identity & document logic' },
        ...(currentUser.role === 'Owner' || currentUser.role === 'Super Admin' ? [
            { key: 'settings.permissions', icon: <PermissionsIcon />, to: '/settings/permissions', desc: 'Authorization matrix & staff rights' },
            { key: 'settings.business', icon: <BusinessIcon />, to: '/settings/business', desc: 'Organization profile & workflows' },
            { key: 'settings.owner', icon: <CrownIcon />, to: '/settings/owner', desc: 'Principal ledger overrides' }
        ] : []),
        { key: 'settings.printer', icon: <PrinterIcon />, to: '/settings/printer', desc: 'Terminal hardware integration' }
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) setLanguageDropdownOpen(false);
            if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) setCurrencyDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleThemeToggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            {/* Header Block */}
            <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
                <div className="relative flex items-center gap-10">
                    <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                        <SettingsIcon className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{t('settings.title')}</h1>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-4">Terminal Configuration Node</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Visuals & Identity */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Interface Protocol</h3>
                        </div>
                        
                        <div className="space-y-8">
                            {/* Theme Node */}
                            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-gray-950 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl text-slate-400 dark:text-slate-500 shadow-sm"><ThemeIcon /></div>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Dark Mode</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={theme === 'dark'} onChange={handleThemeToggle} className="sr-only" />
                                    <div className={`w-14 h-8 rounded-full border-2 transition-all ${theme === 'dark' ? 'bg-primary border-primary' : 'bg-slate-200 border-slate-300 dark:border-gray-700'}`}>
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>

                            {/* Regional Nodes */}
                            <div className="space-y-4">
                                <div className="relative" ref={languageDropdownRef}>
                                    <button onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)} className="w-full flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2rem] hover:border-primary/20 transition-all text-left group">
                                        <div className="flex items-center gap-4">
                                            <div className="text-slate-300 group-hover:text-primary transition-colors"><LanguageIcon /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('settings.language')}</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{selectedLanguage.name}</p>
                                            </div>
                                        </div>
                                        <ChevronDownIcon className={`transition-transform duration-300 ${languageDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {languageDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-3 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-gray-800 p-2 animate-scale-in origin-top">
                                            {languages.map(lang => (
                                                <button key={lang.code} onClick={() => { setLanguage(lang.code); setLanguageDropdownOpen(false); }} className="w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors">{lang.name}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="relative" ref={currencyDropdownRef}>
                                    <button onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)} className="w-full flex items-center justify-between p-6 bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 rounded-[2rem] hover:border-primary/20 transition-all text-left group">
                                        <div className="flex items-center gap-4">
                                            <div className="text-slate-300 group-hover:text-primary transition-colors"><CurrencyIcon /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('settings.currency')}</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{selectedCurrency.name}</p>
                                            </div>
                                        </div>
                                        <ChevronDownIcon className={`transition-transform duration-300 ${currencyDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {currencyDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-3 bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-gray-800 p-2 animate-scale-in origin-top">
                                            {currencies.map(currency => (
                                                <button key={currency.symbol} onClick={() => { setReceiptSettings({ ...receiptSettings, currencySymbol: currency.symbol }); setCurrencyDropdownOpen(false); }} className="w-full text-left px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-colors">{currency.name}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Command Center Nodes */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800 h-full">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Management Authorization</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {managementNodes.map(node => (
                                <NavLink 
                                    key={node.key} 
                                    to={node.to || '#'} 
                                    className={`p-8 rounded-[2.5rem] border-2 border-slate-50 dark:border-gray-800 transition-all group flex flex-col justify-between h-56 ${node.to ? 'hover:border-primary/20 hover:shadow-2xl hover:-translate-y-1' : 'opacity-40 grayscale pointer-events-none'}`}
                                >
                                    <div className="w-14 h-14 bg-slate-50 dark:bg-gray-950 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all shadow-inner border border-slate-100 dark:border-gray-800">
                                        {node.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{t(node.key)}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{node.desc}</p>
                                    </div>
                                </NavLink>
                            ))}
                        </div>

                        <div className="mt-12 p-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[2.5rem] flex items-center gap-6">
                            <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase leading-relaxed tracking-tight">
                                Platform protocols are synchronized across all nodes in real-time. Unauthorized attempts to modify principal ledgers are recorded.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
