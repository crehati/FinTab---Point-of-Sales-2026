
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { COUNTRIES, BuildingIcon, ShieldCheckIcon, TransactionIcon } from '../constants';

const STEPS = [
  { id: 1, label: 'Identity Verify' },
  { id: 2, label: 'Business Node' },
  { id: 3, label: 'Initialize Sync' },
];

const Onboarding: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [business, setBusiness] = useState({
        businessName: '',
        businessType: 'Retail',
        businessEmail: currentUser?.email || '',
    });
    const [businessPhone, setBusinessPhone] = useState({ countryCode: '+509', localPhone: ''});

    useEffect(() => {
        if (currentUser) {
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
            const userId = currentUser?.id;
            if (!userId) throw new Error("Identity Session Expired.");

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
                settings: {
                    defaultTaxRate: 0,
                    currencySymbol: '$',
                    paymentMethods: ['Cash', 'Bank Transfer']
                }
            };

            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .insert(bizPayload)
                .select()
                .single();
            
            if (bizError) throw bizError;

            const { error: memberError } = await supabase
                .from('memberships')
                .insert({
                    business_id: bizData.id,
                    user_id: userId,
                    role: 'Owner'
                });

            if (memberError) throw memberError;

            localStorage.setItem('fintab_active_business_id', bizData.id);
            setStep(3);
        } catch (err: any) {
            setError(err.message || "Initialization failure.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalLaunch = () => {
        window.location.hash = '/dashboard';
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[500px] space-y-10 animate-fade-in">
                
                {/* Header Section */}
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 mb-6 text-white">
                        <BuildingIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Business Setup</h1>
                    <div className="flex justify-center items-center gap-2">
                        {STEPS.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full transition-all duration-700 ${step >= s.id ? 'bg-primary w-6' : 'bg-slate-300 dark:bg-gray-800'}`} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 transition-all">
                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Confirmation</h2>
                                <p className="text-sm font-medium text-slate-500">Confirm your owner credentials.</p>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-gray-950 rounded-2xl border border-slate-100 dark:border-gray-800 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    <ShieldCheckIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed In As</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser?.email}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setStep(2)} 
                                className="w-full bg-slate-900 text-white py-5 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Continue to Node Config
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Node Configuration</h2>
                                <p className="text-sm font-medium text-slate-500">Define your primary business parameters.</p>
                            </div>
                            {error && (
                                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 animate-shake">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Business Name</label>
                                    <input value={business.businessName} onChange={e => setBusiness({...business, businessName: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-950 border-none rounded-xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all" placeholder="e.g. Acme Retail Solutions" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contact Protocol</label>
                                    <div className="flex bg-slate-50 dark:bg-gray-950 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                        <select value={businessPhone.countryCode} onChange={e => setBusinessPhone({...businessPhone, countryCode: e.target.value})} className="bg-transparent border-none text-sm font-bold pl-4 w-28 outline-none">
                                            {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.dial_code}</option>)}
                                        </select>
                                        <input type="tel" value={businessPhone.localPhone} onChange={e => setBusinessPhone({...businessPhone, localPhone: e.target.value})} className="flex-1 bg-transparent border-none p-4 text-sm font-bold outline-none" placeholder="5551234567" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-100 dark:bg-gray-800 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest" disabled={loading}>Back</button>
                                <button 
                                    onClick={handleRegistrationSubmit} 
                                    disabled={loading || !business.businessName}
                                    className="flex-[2] bg-primary text-white py-5 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Initialize Node'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-8 py-4 animate-scale-in">
                            <div className="w-24 h-24 bg-emerald-500 rounded-full shadow-2xl shadow-emerald-500/20 flex items-center justify-center text-white mx-auto">
                                <ShieldCheckIcon className="w-12 h-12" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Node Synchronized</h2>
                                <p className="text-sm font-medium text-slate-500">Your master identity is now anchored to this business.</p>
                            </div>
                            <button 
                                onClick={handleFinalLaunch} 
                                className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Start Operating
                            </button>
                        </div>
                    )}
                </div>

                {step < 3 && (
                    <div className="text-center">
                        <button onClick={() => navigate('/')} className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-rose-500 transition-colors">Abort Onboarding Protocol</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;
