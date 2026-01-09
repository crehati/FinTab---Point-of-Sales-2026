// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { EmailIcon } from '../constants';
import { isRateLimited } from '../lib/utils';

const FinTabLogo = () => (
    <svg 
        viewBox="0 0 4000 4000" 
        className="mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 drop-shadow-xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <style type="text/css">
                {`
                .fil0 {fill:#1A457E}
                .fil1 {fill:#2563EB}
                .fil2 {fill:#666666}
                .fil3 {fill:#1A457E;fill-rule:nonzero}
                .fnt2 {font-weight:normal;font-size:261.56px;font-family:'Arial'}
                .fnt1 {font-weight:bold;font-size:1009.87px;font-family:'Arial'}
                .fnt0 {font-weight:bold;font-size:1046.33px;font-family:'Arial'}
                `}
            </style>
            <mask id="id0_custom">
                <linearGradient id="id1_custom" gradientUnits="userSpaceOnUse" x1="1903.94" y1="2217.48" x2="1895.38" y2="2662.81">
                    <stop offset="0" style={{ stopOpacity: 1, stopColor: 'white' }} />
                    <stop offset="1" style={{ stopOpacity: 0, stopColor: 'white' }} />
                </linearGradient>
                <rect style={{ fill: 'url(#id1_custom)' }} x="1154.91" y="446.15" width="1668.59" height="2211.97" />
            </mask>
            <mask id="id2_custom">
                <linearGradient id="id3_custom" gradientUnits="userSpaceOnUse" x1="1903.94" y1="2217.48" x2="1895.38" y2="2662.81">
                    <stop offset="0" style={{ stopOpacity: 1, stopColor: 'white' }} />
                    <stop offset="1" style={{ stopOpacity: 0, stopColor: 'white' }} />
                </linearGradient>
                <rect style={{ fill: 'url(#id3_custom)' }} x="1506.44" y="962.85" width="1322.44" height="1700.49" />
            </mask>
        </defs>
        <g id="Layer_x0020_1">
            <g id="_1680517084368">
                <text x="366.91" y="3541.37" className="fil0 fnt0">Fin</text>
                <text x="1875.45" y="3530.88" className="fil1 fnt1">Tab</text>
                <text x="432.85" y="3855.85" className="fil2 fnt2">Sell Smarter. Serve Faster.</text>
                <g>
                    <path className="fil0" style={{ mask: 'url(#id0_custom)' }} d="M1901.62 1656.8l1.71 -278.74c-78.46,4.17 -163.06,0.98 -242.21,0.82l-174.91 0.6c-53.52,0.46 -43.37,1.52 -50.65,-10.65 10.89,-246.14 -87.98,-635.78 298.33,-638.92 315.95,-2.56 632.53,-0.25 948.54,0.02 37.21,-74.66 116.8,-206.72 140.99,-280.28 -152.85,-7.35 -322.89,-0.47 -477.67,-0.39 -162.66,0.08 -325.31,-0 -487.97,0.04 -154.21,0.04 -286.91,-2.17 -408.27,69.42 -102.65,60.54 -181.42,135.99 -238.16,249.76 -66.83,134.01 -53.09,268.83 -53.28,427.8 -0.22,196.06 -7.98,1371.84 2.15,1461.39l274.36 0.36 1.5 -1002.3 465.56 1.07z" />
                    <path className="fil1" style={{ mask: 'url(#id2_custom)' }} d="M1506.54 1239.43l535.95 1.17 0.47 887.57c-0.06,318.61 231.6,529.78 544.41,535.06l-1.27 -271.63c-317.19,-17.81 -264.99,-297.4 -265.48,-576.49l-0.48 -571.66 369.31 -2.36 139.33 -278.15 -1182.99 0.1 -139.25 276.39z" />
                </g>
            </g>
        </g>
    </svg>
);

const Login: React.FC<any> = ({ onEnterDemo }) => {
    const navigate = useNavigate();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVerificationNotice, setShowVerificationNotice] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Rate Limiting Protocol
        if (isRateLimited(`auth-${email}`, 5000)) {
            setError("Brute-force protection active. Please wait before retrying.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (isLoginMode) {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
            } else {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email, password, options: { data: { full_name: fullName } }
                });
                if (signUpError) throw signUpError;
                if (data.user && !data.session) setShowVerificationNotice(true);
            }
        } catch (err) {
            setError(err.message || "An authentication protocol error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    if (showVerificationNotice) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-gray-800 text-center space-y-8 animate-fade-in">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary">
                        <EmailIcon className="w-10 h-10" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Verify Identity</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed uppercase tracking-tight">
                            We have sent a verification link to <span className="font-bold text-slate-900 dark:text-white">{email}</span>.
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check your inbox to activate your terminal.</p>
                    </div>
                    <button onClick={() => { setShowVerificationNotice(false); setIsLoginMode(true); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Back to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center p-8 sm:p-12 font-sans overflow-y-auto">
            <div className="w-full max-w-[480px] my-auto animate-fade-in flex flex-col">
                <div className="text-center mb-6">
                    <FinTabLogo />
                    <h1 className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        {isLoginMode ? 'Authorize Entry' : 'Enroll Node'}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">Terminal Access Protocol</p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800">
                    <form onSubmit={handleAuth} className="space-y-6">
                        {error && <div className="p-4 bg-rose-50 text-rose-600 text-[11px] font-bold uppercase tracking-widest rounded-xl border border-rose-100 animate-shake text-center">{error}</div>}
                        {!isLoginMode && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1 block">Full Identity Name</label>
                                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="e.g. Jean Dupont" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1 block">Security Email</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="name@domain.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1 block">Protocol Password</label>
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="••••••••" />
                            {!isLoginMode && <PasswordStrengthIndicator password={password} />}
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl font-black text-base shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 mt-4">
                            {isLoading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLoginMode ? 'Authorize Entry' : 'Initialize Identity')}
                        </button>
                    </form>
                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-gray-800 text-center space-y-5">
                        <button onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }} className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest hover:text-primary transition-colors">{isLoginMode ? 'Create New Global Identity' : 'Already Enrolled? Authorize Entry'}</button>
                        {isLoginMode && <div><button onClick={onEnterDemo} className="text-[10px] font-bold text-slate-400 hover:text-emerald-500 uppercase tracking-[0.2em] transition-all">Try Terminal Demo</button></div>}
                    </div>
                </div>
                <p className="text-center text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em] mt-8">FinTab v.1.0.5</p>
            </div>
        </div>
    );
};

export default Login;