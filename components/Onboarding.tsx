
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { COUNTRIES, BuildingIcon, ShieldCheckIcon, TransactionIcon, ChevronDownIcon } from '../constants';

const STEPS = [
  { id: 1, label: 'Identity Check' },
  { id: 2, label: 'Unit Definition' },
  { id: 3, label: 'Registry Sync' },
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
            if (!userId) throw new Error("Security violation: Master node identity not found.");

            const finalBusinessPhone = `${businessPhone.countryCode}${businessPhone.localPhone.replace(/\D/g, '')}`;
            
            const bizPayload = {
                name: business.businessName,
                created_by: userId,
                profile: {
                    ledger_email: business.businessEmail,
                    phone: finalBusinessPhone,
                    type: business.businessType,
                    logo: null,
                    isPublic: true
                },
                settings: {
                    defaultTaxRate: 0,
                    currencySymbol: '$',
                    paymentMethods: ['Cash', 'Bank Receipt', 'Card']
                }
            };

            const client = await supabase.wait();
            
            // 1. Create Business Registry Entry
            const { data: bizData, error: bizError } = await client
                .from('businesses')
                .insert(bizPayload)
                .select()
                .single();
            
            if (bizError) throw bizError;

            // 2. Provision Owner Membership
            const { error: memberError } = await client
                .from('memberships')
                .insert({
                    business_id: bizData.id,
                    user_id: userId,
                    role: 'Owner',
                    status: 'Active'
                });

            if (memberError) throw memberError;

            localStorage.setItem('fintab_active_business_id', bizData.id);
            setStep(3);
        } catch (err: any) {
            setError(err.message || "Registry synchronization failure.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalLaunch = () => {
        window.location.href = '/#/dashboard';
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[540px] space-y-12 animate-fade-in">
                
                {/* Protocol Progress */}
                <div className="space-y-6">
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Configuration</p>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Node Initialization</h2>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">Sequence 0{step} / 03</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden flex gap-1">
                        {STEPS.map(s => (
                            <div key={s.id} className={`h-full flex-1 transition-all duration-1000 ease-out ${step >= s.id ? 'bg-primary' : 'bg-transparent'}`} />
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-gray-800 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                    {step === 1 && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="space-y-3">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Confirmation</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">Ensure your master authentication credentials are correct before anchoring them to a business node.</p>
                            </div>
                            <div className="p-8 bg-slate-50 dark:bg-gray-800/50 rounded-[2rem] border border-slate-100 dark:border-gray-800 flex items-center gap-6 shadow-inner">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                                    <ShieldCheckIcon className="w-7 h-7" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Signed Authority</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{currentUser?.email}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setStep(2)} 
                                className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-4 group"
                            >
                                Continue Initialization
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-white transition-colors"></div>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="space-y-3">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enterprise Node Parameters</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">Define the primary operational identity for your business registry.</p>
                            </div>
                            
                            {error && (
                                <div className="p-6 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 animate-shake">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-3">Entity Name</label>
                                    <input required value={business.businessName} onChange={e => setBusiness({...business, businessName: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" placeholder="e.g. Zenith Solutions Group" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-3">Primary Sector</label>
                                    <div className="relative">
                                        <select value={business.businessType} onChange={e => setBusiness({...business, businessType: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner appearance-none">
                                            <option value="Retail">General Retail</option>
                                            <option value="Services">Services & Logistics</option>
                                            <option value="F&B">Food & Beverage</option>
                                            <option value="F&B">Electronics</option>
                                            <option value="Pharmacy">Medical / Pharmacy</option>
                                        </select>
                                        <ChevronDownIcon className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-3">Registry Contact Node</label>
                                    <div className="flex bg-slate-50 dark:bg-gray-800 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-inner">
                                        <select value={businessPhone.countryCode} onChange={e => setBusinessPhone({...businessPhone, countryCode: e.target.value})} className="bg-transparent border-none text-sm font-bold pl-6 w-32 outline-none">
                                            {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.dial_code}</option>)}
                                        </select>
                                        <input type="tel" required value={businessPhone.localPhone} onChange={e => setBusinessPhone({...businessPhone, localPhone: e.target.value})} className="flex-1 bg-transparent border-none p-5 text-sm font-bold outline-none" placeholder="5551234567" />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-50 dark:bg-gray-800 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all" disabled={loading}>Abort</button>
                                    <button 
                                        type="submit"
                                        disabled={loading || !business.businessName}
                                        className="flex-[2] bg-primary text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                                            <>
                                                Deploy Node
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-white transition-colors"></div>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-10 py-6 animate-scale-in">
                            <div className="w-28 h-28 bg-emerald-500 rounded-[2.5rem] shadow-2xl shadow-emerald-500/20 flex items-center justify-center text-white mx-auto rotate-12 transition-transform hover:rotate-0">
                                <ShieldCheckIcon className="w-14 h-14" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Registry Node Live</h2>
                                <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">Your master identity is now anchored. The enterprise terminal is ready for operation.</p>
                            </div>
                            <button 
                                onClick={handleFinalLaunch} 
                                className="w-full bg-slate-900 text-white py-7 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 group"
                            >
                                Initialize OS
                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"></div>
                            </button>
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400 opacity-40">Authorized Terminal Initialization Sequence v1.4.8</p>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
