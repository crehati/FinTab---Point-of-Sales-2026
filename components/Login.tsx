
// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { EmailIcon, WarningIcon } from '../constants';
import { isRateLimited } from '../lib/utils';

const FinTabLogo = () => (
    <svg viewBox="0 0 4000 4000" className="mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 drop-shadow-xl overflow-visible" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <style type="text/css">{`.fil0 {fill:#1A457E} .fil1 {fill:#2563EB} .fil2 {fill:#666666} .fnt2 {font-weight:normal;font-size:261.56px;font-family:'Arial'} .fnt1 {font-weight:bold;font-size:1009.87px;font-family:'Arial'} .fnt0 {font-weight:bold;font-size:1046.33px;font-family:'Arial'}`}</style>
        </defs>
        <g><text x="366.91" y="3541.37" className="fil0 fnt0">Fin</text><text x="1875.45" y="3530.88" className="fil1 fnt1">Tab</text></g>
    </svg>
);

const Login: React.FC<any> = ({ onEnterDemo }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRateLimited(`auth-${email}`, 5000)) {
            setError("Security: Rate limit active. Wait before retrying.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setInfoMessage(null);

        try {
            if (authMode === 'login') {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
            } else if (authMode === 'signup') {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email, password, options: { data: { full_name: fullName } }
                });
                if (signUpError) throw signUpError;
                setInfoMessage("Verification link sent. Check your inbox to activate terminal.");
                setAuthMode('login');
            } else if (authMode === 'reset') {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/#/profile`,
                });
                if (resetError) throw resetError;
                setInfoMessage("Secure reset link dispatched. Check your email.");
                setAuthMode('login');
            }
        } catch (err) {
            setError(err.message || "Authentication protocol error.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center justify-center p-8 font-sans">
            <div className="w-full max-w-[440px] animate-fade-in space-y-10">
                <div className="text-center">
                    <FinTabLogo />
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mt-4">
                        {authMode === 'login' ? 'Authorize Entry' : authMode === 'signup' ? 'Enroll Node' : 'Recovery Node'}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">Identity Authentication Protocol</p>
                </div>

                <div className="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800">
                    <form onSubmit={handleAuth} className="space-y-6">
                        {error && <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-xl border border-rose-100 animate-shake text-center">{error}</div>}
                        {infoMessage && <div className="p-4 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-xl border border-emerald-100 text-center">{infoMessage}</div>}
                        
                        {authMode === 'signup' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Full Identity Name</label>
                                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="e.g. Jean Dupont" />
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Email Address</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="name@domain.com" />
                        </div>
                        
                        {authMode !== 'reset' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Security Password</label>
                                    {authMode === 'login' && (
                                        <button type="button" onClick={() => setAuthMode('reset')} className="text-[10px] font-black uppercase text-primary hover:underline">Forgot?</button>
                                    )}
                                </div>
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="••••••••" />
                                {authMode === 'signup' && <PasswordStrengthIndicator password={password} />}
                            </div>
                        )}

                        <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-[0.98] flex items-center justify-center gap-3">
                            {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : (authMode === 'login' ? 'Authorize Entry' : authMode === 'signup' ? 'Initialize' : 'Send Reset Link')}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-gray-800 text-center space-y-4">
                        {authMode === 'login' ? (
                            <button onClick={() => setAuthMode('signup')} className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest hover:text-primary transition-colors">Enroll New Global Identity</button>
                        ) : (
                            <button onClick={() => setAuthMode('login')} className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest hover:text-primary transition-colors">Return to Authorization Hub</button>
                        )}
                        {authMode === 'login' && (
                            <div><button onClick={onEnterDemo} className="text-[10px] font-bold text-slate-400 hover:text-emerald-500 uppercase tracking-[0.2em] transition-all">Launch Terminal Demo</button></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
