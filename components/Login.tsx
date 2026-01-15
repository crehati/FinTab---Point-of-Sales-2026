
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { ShieldCheckIcon, AIIcon, BuildingIcon, TransactionIcon } from '../constants';
import { isRateLimited } from '../lib/utils';

const FinTabLogo = () => (
    <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <TransactionIcon className="text-white w-6 h-6" />
        </div>
        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">Fin<span className="text-primary">Tab</span></span>
    </div>
);

const Login: React.FC<any> = ({ onEnterDemo }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'update_password'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        setError(null);
        setInfoMessage(null);
        setPassword('');
    }, [authMode]);

    useEffect(() => {
        const checkRecovery = async () => {
            const client = await supabase.wait();
            client.auth.onAuthStateChange(async (event, session) => {
                if (event === "PASSWORD_RECOVERY") {
                    setAuthMode('update_password');
                    setInfoMessage("Identity Verified: Set your new secure access credentials.");
                }
            });
        };
        checkRecovery();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRateLimited(`auth-${email || 'global'}`, 5000)) {
            setError("Security: Rate limit active. Wait before retrying.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setInfoMessage(null);

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
                setInfoMessage("Verification link sent. Check your inbox to activate terminal.");
                setAuthMode('login');
            } else if (authMode === 'reset') {
                const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/#/login`,
                });
                if (resetError) throw resetError;
                setInfoMessage("Secure reset link dispatched.");
            } else if (authMode === 'update_password') {
                const { error: updateError } = await client.auth.updateUser({ password });
                if (updateError) throw updateError;
                setInfoMessage("Credentials updated. Authorizing redirect...");
                setTimeout(() => navigate('/dashboard'), 1500);
            }
        } catch (err) {
            setError(err.message || "Authentication protocol error.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex font-sans">
            {/* Left Side: Brand Narrative (Desktop Only) */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-20">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_70%)]"></div>
                <div className="relative z-10">
                    <FinTabLogo />
                </div>
                <div className="relative z-10 max-w-lg">
                    <h2 className="text-5xl font-black text-white tracking-tighter leading-tight mb-8">
                        The Operating System for Modern Commerce.
                    </h2>
                    <div className="space-y-6">
                        {[
                            { icon: <AIIcon />, title: 'Intelligence Node', text: 'Real-time AI insights for your inventory and sales.' },
                            { icon: <ShieldCheckIcon />, title: 'Dual-Sign Security', text: 'Enterprise-grade financial verification protocols.' },
                            { icon: <BuildingIcon />, title: 'Multi-Node Management', text: 'Operate multiple business units from one dashboard.' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="p-2 bg-white/5 rounded-lg text-primary">{item.icon}</div>
                                <div>
                                    <p className="text-white font-bold text-sm mb-1">{item.title}</p>
                                    <p className="text-slate-400 text-xs leading-relaxed">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative z-10 flex gap-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">© 2026 FINTAB GLOBAL</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">V1.4.6 STABLE NODE</p>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 overflow-y-auto">
                <div className="w-full max-w-[420px] animate-fade-in space-y-10">
                    <div className="lg:hidden flex justify-center mb-10">
                        <FinTabLogo />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {authMode === 'login' ? 'Welcome Back' : 
                             authMode === 'signup' ? 'Get Started' : 
                             authMode === 'reset' ? 'Reset Credentials' : 
                             'Update Password'}
                        </h1>
                        <p className="text-sm font-medium text-slate-500">
                            {authMode === 'login' ? 'Please authorize entry to your business node.' : 
                             authMode === 'signup' ? 'Create a master identity to begin.' : 
                             'Security verification protocol initiated.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-900/30 animate-shake">
                                {error}
                            </div>
                        )}
                        {infoMessage && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                {infoMessage}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            {authMode === 'signup' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Legal Full Name</label>
                                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all" placeholder="John Doe" />
                                </div>
                            )}
                            
                            {authMode !== 'update_password' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Terminal Email</label>
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all" placeholder="name@company.com" />
                                </div>
                            )}
                            
                            {authMode !== 'reset' && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                            {authMode === 'update_password' ? 'New Password' : 'Password'}
                                        </label>
                                        {authMode === 'login' && (
                                            <button type="button" onClick={() => setAuthMode('reset')} className="text-[10px] font-black uppercase text-primary hover:underline">Forgot?</button>
                                        )}
                                    </div>
                                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-gray-900 border-2 border-transparent focus:border-primary/20 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all" placeholder="••••••••" />
                                    {(authMode === 'signup' || authMode === 'update_password') && <PasswordStrengthIndicator password={password} />}
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-primary text-white py-5 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 
                             (authMode === 'login' ? 'Authorize Access' : 
                              authMode === 'signup' ? 'Create Account' : 
                              authMode === 'reset' ? 'Send Reset Link' : 
                              'Save Credentials')}
                        </button>
                    </form>

                    <div className="pt-8 border-t dark:border-gray-800 text-center space-y-4">
                        <p className="text-sm font-medium text-slate-500">
                            {authMode === 'login' ? "Don't have an identity node?" : "Already have an identity?"}
                        </p>
                        <button 
                            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} 
                            className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            {authMode === 'login' ? 'Enroll New Global Identity' : 'Return to Authorization'}
                        </button>
                        
                        {authMode === 'login' && (
                            <div className="pt-6">
                                <button onClick={onEnterDemo} className="px-6 py-2 rounded-full border border-slate-100 dark:border-gray-800 text-[10px] font-black text-slate-400 hover:text-emerald-500 hover:border-emerald-500/20 uppercase tracking-[0.2em] transition-all">
                                    Launch Public Demo Protocol
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
