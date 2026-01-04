
// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BusinessProfile, AdminBusinessData, Product, User, Customer } from '../types';
import { COUNTRIES, DEFAULT_RECEIPT_SETTINGS, PlusIcon } from '../constants';
import { setStoredItemAndDispatchEvent, getStoredItem } from '../lib/utils';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

const STEPS = [
  { id: 1, name: 'Authorization' },
  { id: 2, name: 'Business Logic' },
  { id: 3, name: 'Initialization' },
];

const Onboarding: React.FC<any> = ({ onEnterDemo, onSwitchToLogin, onSuccess }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [owner, setOwner] = useState({
        fullName: '',
        email: '',
        password: '',
    });
    const [business, setBusiness] = useState({
        businessName: '',
        businessType: 'Retail',
        businessEmail: '',
    });
    const [businessPhone, setBusinessPhone] = useState({ countryCode: '+1', localPhone: ''});

    const handleRegistrationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Simulation of database persistence
        setTimeout(() => {
            const businessId = `biz-${Date.now()}`;
            const finalBusinessPhone = `${businessPhone.countryCode}${businessPhone.localPhone.replace(/\D/g, '')}`;
            
            const profile: BusinessProfile = { 
                ...business, 
                id: businessId, 
                businessPhone: finalBusinessPhone,
                dateEstablished: new Date().toISOString(),
                employeeCount: '1-5',
                isPublic: true 
            };

            const ownerUser: User = {
                id: `user-owner-${Date.now()}`,
                name: owner.fullName,
                email: owner.email,
                role: 'Owner',
                status: 'Active',
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.fullName)}&background=2563EB&color=fff`,
                type: 'commission',
                initialInvestment: 0
            };

            const registry = getStoredItem<AdminBusinessData[]>('fintab_businesses_registry', []);
            const newEntry: AdminBusinessData = {
                id: businessId,
                profile,
                licensingInfo: { licenseType: 'Trial', enrollmentDate: new Date().toISOString(), trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
                settings: { acceptRemoteOrders: true },
                owner: { name: owner.fullName, email: owner.email },
                stats: { totalRevenue: 0, salesCount: 0, userCount: 1, joinedDate: new Date().toISOString(), status: 'Active' }
            };

            setStoredItemAndDispatchEvent('fintab_businesses_registry', [...registry, newEntry]);
            setStoredItemAndDispatchEvent(`fintab_${businessId}_users`, [ownerUser]);
            setStoredItemAndDispatchEvent(`fintab_${businessId}_receipt_settings`, {
                ...DEFAULT_RECEIPT_SETTINGS, 
                businessName: business.businessName
            });

            setLoading(false);
            setStep(3);
        }, 1500);
    };

    const handleFinish = () => {
        const registry = getStoredItem<AdminBusinessData[]>('fintab_businesses_registry', []);
        const biz = registry[registry.length - 1];
        const users = getStoredItem<User[]>(`fintab_${biz.id}_users`, []);
        onSuccess(users[0], biz.id);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto pt-4 pb-4">
            <div className="w-full max-w-[500px] space-y-3 animate-fade-in">
                
                <div className="flex justify-center gap-3">
                    {STEPS.map(s => (
                        <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= s.id ? 'bg-primary' : 'bg-slate-200 dark:bg-gray-800'}`} />
                    ))}
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800">
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <header>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Legal Identity</h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Principal Owner Enrollment</p>
                            </header>
                            <div className="space-y-4">
                                <Input label="Legal Full Name" value={owner.fullName} onChange={e => setOwner({...owner, fullName: e.target.value})} placeholder="e.g. Jean Dupont" />
                                <Input label="Security Email" value={owner.email} onChange={e => setOwner({...owner, email: e.target.value})} placeholder="owner@domain.com" />
                                <div className="space-y-2">
                                    <Input label="Protocol Password" type="password" value={owner.password} onChange={e => setOwner({...owner, password: e.target.value})} placeholder="••••••••" />
                                    <PasswordStrengthIndicator password={owner.password} />
                                </div>
                            </div>
                            <button 
                                onClick={() => setStep(2)} 
                                disabled={!owner.fullName || !owner.email || !owner.password}
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-98 transition-all disabled:opacity-30"
                            >
                                Continue Protocol
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <header>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Business Logic</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Node Configuration</p>
                            </header>
                            <div className="space-y-4">
                                <Input label="Organization Name" value={business.businessName} onChange={e => setBusiness({...business, businessName: e.target.value})} placeholder="e.g. Quantum Retail" />
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-1 block">Mobile Endpoint</label>
                                    <div className="flex bg-slate-50 dark:bg-gray-800 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                        <select name="countryCode" value={businessPhone.countryCode} onChange={e => setBusinessPhone({...businessPhone, countryCode: e.target.value})} className="bg-transparent border-none text-sm font-bold pl-3 w-28 outline-none">
                                            {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>)}
                                        </select>
                                        <input type="tel" value={businessPhone.localPhone} onChange={e => setBusinessPhone({...businessPhone, localPhone: e.target.value})} className="flex-1 bg-transparent border-none p-3.5 text-base font-bold outline-none" placeholder="5551234567" />
                                    </div>
                                </div>
                                <Input label="Official Ledger Email" value={business.businessEmail} onChange={e => setBusiness({...business, businessEmail: e.target.value})} placeholder="hq@business.io" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 dark:bg-gray-800 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest">Back</button>
                                <button 
                                    onClick={handleRegistrationSubmit} 
                                    disabled={loading || !business.businessName}
                                    className="flex-[2] bg-primary text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Initialize Grid'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-6 py-4 animate-scale-in">
                            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] shadow-2xl shadow-emerald-200 flex items-center justify-center text-white mx-auto">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Terminal Sync Complete</h2>
                                <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">Welcome, {owner.fullName}. Your secure business node is now active.</p>
                            </div>
                            <button 
                                onClick={handleFinish} 
                                className="w-full bg-slate-900 text-white py-5 rounded-xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
                            >
                                Launch Dashboard
                            </button>
                        </div>
                    )}
                </div>

                {step < 3 && (
                    <button onClick={onSwitchToLogin} className="w-full text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-500 transition-colors">Abort & Back to Login</button>
                )}
            </div>
        </div>
    );
};

const Input: React.FC<any> = ({ label, ...props }) => (
    <div className="space-y-1">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 block">{label}</label>
        <input className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" {...props} />
    </div>
);

export default Onboarding;
