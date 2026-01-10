
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
    const [businessPhone, setBusinessPhone] = useState({ countryCode: '+509', localPhone: ''});

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

        const TIMEOUT_MS = 15000;
        const timeout = (ms: number) => new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase request timed out — check your RLS policies or network.")), ms)
        );

        try {
            let userId = currentUser?.id;

            // 1. Authenticate Identity
            if (!userId) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: owner.email,
                    password: owner.password,
                    options: { data: { full_name: owner.fullName } }
                });
                if (authError) throw authError;
                userId = authData.user?.id;
            } else {
                await supabase.auth.updateUser({ data: { full_name: owner.fullName } });
            }

            if (!userId) throw new Error("Identity Check Failed: No User ID returned.");

            // 2. Initialize Business Node
            const finalBusinessPhone = `${businessPhone.countryCode}${businessPhone.localPhone.replace(/\D/g, '')}`;
            
            const bizPayload = {
                name: business.businessName,
                created_by: userId,
                profile: {
                    ledger_email: business.businessEmail,
                    phone: finalBusinessPhone,
                    type: business.businessType,
                    logo: null
                },
                settings: {}
            };

            const bizInsert = supabase
                .from('businesses')
                .insert(bizPayload)
                .select('id, name')
                .single();

            const bizResult = await Promise.race([bizInsert, timeout(TIMEOUT_MS)]) as any;
            
            if (bizResult.error) {
                console.error('BUSINESS_INSERT_ERROR', bizResult.error);
                setError(`BUSINESS_INSERT_ERROR: ${JSON.stringify(bizResult.error, null, 2)}`);
                setLoading(false);
                return;
            }

            const bizData = bizResult.data;
            if (!bizData?.id) throw new Error("Initialization Error: Business ID not returned from registry.");

            // 3. Authorize Principal Membership
            const memberInsert = supabase
                .from('memberships')
                .insert({
                    business_id: bizData.id,
                    user_id: userId,
                    role: 'Owner'
                });

            const memberResult = await Promise.race([memberInsert, timeout(TIMEOUT_MS)]) as any;
            
            if (memberResult.error) {
                console.error('MEMBERSHIP_INSERT_ERROR', memberResult.error);
                setError(`MEMBERSHIP_INSERT_ERROR: ${JSON.stringify(memberResult.error, null, 2)}`);
                setLoading(false);
                return;
            }

            localStorage.setItem('fintab_active_business_id', bizData.id);
            setStep(3);
        } catch (err: any) {
            console.error("[Protocol Error]", err);
            setError(err.message || "An unexpected error occurred during node synchronization.");
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
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Account</p>
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
                                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-mono text-left border border-rose-100 shadow-sm animate-shake mb-4 overflow-x-auto whitespace-pre-wrap">
                                    <div className="flex items-center gap-2 text-rose-600 mb-2 font-bold uppercase font-sans text-[11px]">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Protocol Fault Detected
                                    </div>
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
                                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 dark:bg-gray-800 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest" disabled={loading}>Back</button>
                                <button 
                                    onClick={handleRegistrationSubmit} 
                                    disabled={loading || !business.businessName}
                                    className="flex-[2] bg-primary text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                    <button onClick={() => navigate('/')} className="w-full text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-500 transition-colors mt-8" disabled={loading}>Abort Protocol</button>
                )}
            </div>
        </div>
    );
};

const Input: React.FC<any> = ({ label, ...props }) => (
    <div className="space-y-1">
        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1 block">{label}</label>
        <input className="w-full bg-slate-50 dark:bg-gray-950 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" {...props} />
    </div>
);

export default Onboarding;
