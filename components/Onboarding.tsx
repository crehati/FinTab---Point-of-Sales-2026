
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { COUNTRIES } from '../constants';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

const STEPS = [
  { id: 1, name: 'Identity' },
  { id: 2, name: 'Business' },
  { id: 3, name: 'Sync' },
];

const Onboarding: React.FC<{ currentUser: any; membershipsCount: number }> = ({ currentUser, membershipsCount }) => {
    const navigate = useNavigate();
    // Start at step 1 regardless of authentication to verify Legal Identity
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [owner, setOwner] = useState({
        fullName: currentUser?.name || '',
        email: currentUser?.email || '',
        password: '',
    });
    const [business, setBusiness] = useState({
        businessName: '',
        businessType: 'Retail',
        businessEmail: currentUser?.email || '',
    });
    const [businessPhone, setBusinessPhone] = useState({ countryCode: '+1', localPhone: ''});

    useEffect(() => {
        if (currentUser) {
            setOwner(prev => ({ 
                ...prev, 
                fullName: currentUser.name || prev.fullName, 
                email: currentUser.email || prev.email 
            }));
            setBusiness(prev => ({ 
                ...prev, 
                businessEmail: currentUser.email || prev.businessEmail 
            }));
        }
    }, [currentUser]);

    const handleRegistrationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let userId = currentUser?.id;

            // 1. Auth check: Use existing session or create new
            if (!userId) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: owner.email,
                    password: owner.password,
                    options: { data: { full_name: owner.fullName } }
                });
                if (authError) throw authError;
                userId = authData.user?.id;
            } else {
                // Ensure name is synced to metadata for established accounts
                await supabase.auth.updateUser({
                    data: { full_name: owner.fullName }
                });
            }

            if (!userId) throw new Error("Identity Protocol failure.");

            // 2. Initialize Business Node
            const finalBusinessPhone = `${businessPhone.countryCode}${businessPhone.localPhone.replace(/\D/g, '')}`;
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .insert({
                    name: business.businessName,
                    type: business.businessType,
                    owner_id: userId,
                    profile: {
                        ledger_email: business.businessEmail,
                        phone: finalBusinessPhone
                    }
                })
                .select()
                .single();

            if (bizError) throw bizError;

            // 3. Establish Ownership Membership
            const { error: memberError } = await supabase
                .from('memberships')
                .insert({
                    business_id: bizData.id,
                    user_id: userId,
                    role: 'Owner'
                });

            if (memberError) throw memberError;

            localStorage.setItem('fintab_active_business_id', bizData.id);
            setLoading(false);
            setStep(3);
        } catch (err) {
            setError(err.message || "A protocol initialization error occurred.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto">
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
                                
                                {!currentUser ? (
                                    <>
                                        <Input label="Security Email" value={owner.email} onChange={e => setOwner({...owner, email: e.target.value})} placeholder="owner@domain.com" />
                                        <div className="space-y-2">
                                            <Input label="Protocol Password" type="password" value={owner.password} onChange={e => setOwner({...owner, password: e.target.value})} placeholder="••••••••" />
                                            <PasswordStrengthIndicator password={owner.password} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-100 dark:border-gray-800">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Email</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">{owner.email}</p>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => setStep(2)} 
                                disabled={!owner.fullName || (!currentUser && (!owner.email || !owner.password))}
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-98 transition-all disabled:opacity-30"
                            >
                                Continue Node Setup
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <header>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Business Logic</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Node Configuration</p>
                            </header>
                            {error && (
                                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase text-center border border-rose-100">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-4">
                                <Input label="Organization Name" value={business.businessName} onChange={e => setBusiness({...business, businessName: e.target.value})} placeholder="e.g. Quantum Retail" />
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 mb-1 block">Mobile Endpoint</label>
                                    <div className="flex bg-slate-50 dark:bg-gray-800 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                        <select name="countryCode" value={businessPhone.countryCode} onChange={e => setBusinessPhone({...businessPhone, countryCode: e.target.value})} className="bg-transparent border-none text-sm font-bold pl-3 w-28 outline-none">
                                            {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.dial_code}</option>)}
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
                                    {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Initialize Grid'}
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
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Sync Complete</h2>
                                <p className="text-xs font-medium text-slate-400 mt-2 leading-relaxed">Identity authorized. Business node live.</p>
                            </div>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="w-full bg-slate-900 text-white py-5 rounded-xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
                            >
                                Launch Dashboard
                            </button>
                        </div>
                    )}
                </div>

                {step < 3 && (
                    <button onClick={() => navigate('/')} className="w-full text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-500 transition-colors mt-8">Abort Protocol</button>
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
