
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { ShieldCheckIcon, AIIcon, BuildingIcon, TransactionIcon, WarningIcon } from '../constants';
import { isRateLimited } from '../lib/utils';

const FinTabLogo = () => (
    <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3">
            <TransactionIcon className="text-white w-7 h-7" />
        </div>
        <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">Fin<span className="text-primary">Tab</span></span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Operating System</span>
        </div>
    </div>
);

const Login: React.FC<any> = ({ onEnterDemo }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'update_password'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            sessionStorage.setItem('fintab_invite_token', token);
            setInfoMessage("Secure Invitation Detected: Please authorize your identity to join the node.");
        }
    }, [searchParams]);

    useEffect(() => {
        setError(null);
        setInfoMessage(null);
        setPassword('');
    }, [authMode]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRateLimited(`auth-${email || 'global'}`, 1500)) {
            setError("Security Protocol: Rate limit active. Please wait.");
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const client = await supabase.wait();
            if (authMode === 'login') {
                const { error: signInError } = await client.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
            } else if (authMode === 'signup') {
                const { error: signUpError } = await client.auth.signUp({
                    email, password, options: { data: { full_name: fullName } }
                });
                if (signUpError) throw signUpError;
                setInfoMessage("Identity Created. Please verify your email to activate the terminal node.");
                setAuthMode('login');
            } else if (authMode === 'reset') {
                const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/#/login`,
                });
                if (resetError) throw resetError;
                setInfoMessage("Authorization reset link dispatched to your inbox.");
            }
        } catch (err) {
            setError(err.message || "Authentication node failure.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex font-sans overflow-hidden">
            {/* Left Side: System Telemetry (Desktop Only) */}
            <div className="hidden lg:flex w-[45%] bg-[#0F172A] relative overflow-hidden flex-col justify-between p-16">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_60%)]"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px]"></div>
                
                <div className="relative z-10">
                    <FinTabLogo />
                </div>

                <div className="relative z-10 space-y-12">
                    <div className="space-y-4">
                        <h2 className="text-6xl font-black text-white tracking-tighter leading-[0.9]">
                            Scale Your <br/><span className="text-primary">Business</span> Node.
                        </h2>
                        <p className="text-slate-400 text-lg font-medium max-w-sm">
                            The centralized architecture for inventory, logistics, and capital verification.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {[
                            { icon: <ShieldCheckIcon />, title: 'Multi-Sig Governance', text: 'Dual-signature protocols for every capital shift.' },
                            { icon: <AIIcon />, title: 'Neural Insights', text: 'Predictive inventory and automated margin auditing.' },
                            { icon: <BuildingIcon />, title: 'Edge Terminals', text: 'Connect unlimited hardware nodes to your registry.' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-5 items-start group">
                                <div className="p-3 bg-white/5 rounded-2xl text-primary border border-white/10 group-hover:bg-primary/20 group-hover:border-primary/50 transition-all">
                                    {React.cloneElement(item.icon, { className: 'w-6 h-6' })}
                                </div>
                                <div>
                                    <p className="text-white font-black uppercase tracking-widest text-[10px] mb-1">{item.title}</p>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-8">
                    <div className="flex gap-6">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">© 2026 FINTAB</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">v1.4.8-STABLE</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Core Synchronized</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Identity Terminal */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-8 sm:p-12 lg:p-24 overflow-y-auto bg-slate-50/30 dark:bg-gray-950">
                <div className="w-full max-w-[440px] animate-fade-in space-y-12">
                    <div className="lg:hidden flex justify-center mb-12">
                        <FinTabLogo />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
                            {authMode === 'login' ? 'System Login' : 
                             authMode === 'signup' ? 'Node Enrollment' : 
                             'Identity Reset'}
                        </h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            {authMode === 'login' ? 'Enter access credentials to initialize session.' : 
                             authMode === 'signup' ? 'Initialize your master identity node.' : 
                             'Security verification in progress.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-8">
                        {error && (
                            <div className="p-6 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] border border-rose-100 dark:border-rose-900/30 animate-shake flex items-center gap-4 shadow-sm">
                                <WarningIcon className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                        {infoMessage && (
                            <div className="p-6 bg-primary/5 dark:bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] border border-primary/10 flex items-center gap-4">
                                <ShieldCheckIcon className="w-5 h-5 flex-shrink-0" />
                                {infoMessage}
                            </div>
                        )}
                        
                        <div className="space-y-5">
                            {authMode === 'signup' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Legal Identity Name</label>
                                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 focus:border-primary/30 rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all shadow-sm" placeholder="e.g. Jean Dupont" />
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Digital Endpoint (Email)</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 focus:border-primary/30 rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all shadow-sm" placeholder="name@enterprise.com" />
                            </div>
                            
                            {authMode !== 'reset' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Secret Key (Password)</label>
                                        {authMode === 'login' && (
                                            <button type="button" onClick={() => setAuthMode('reset')} className="text-[9px] font-black uppercase text-primary hover:underline tracking-widest">Recover Key</button>
                                        )}
                                    </div>
                                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white dark:bg-gray-900 border-2 border-slate-100 dark:border-gray-800 focus:border-primary/30 rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all shadow-sm" placeholder="••••••••••••" />
                                    {authMode === 'signup' && <PasswordStrengthIndicator password={password} />}
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-primary text-white py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-primary/30 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group">
                            {isLoading ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {authMode === 'login' ? 'Authorize Terminal' : 
                                     authMode === 'signup' ? 'Initialize Node' : 
                                     'Dispatch Reset'}
                                    <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white transition-colors"></div>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="pt-10 border-t dark:border-gray-800 text-center space-y-6">
                        <div className="flex flex-col gap-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {authMode === 'login' ? "Identity node not found?" : "Identity node already active?"}
                            </p>
                            <button 
                                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} 
                                className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] hover:text-primary transition-colors py-2 border-2 border-slate-100 dark:border-gray-800 rounded-xl hover:border-primary/20"
                            >
                                {authMode === 'login' ? 'Register New Global Identity' : 'Return to Login Terminal'}
                            </button>
                        </div>
                        
                        {authMode === 'login' && (
                            <button onClick={onEnterDemo} className="text-[9px] font-black text-slate-300 hover:text-emerald-500 uppercase tracking-[0.4em] transition-all">
                                Launch Public Demo Protocol
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
