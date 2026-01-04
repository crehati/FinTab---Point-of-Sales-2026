
// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    signOut 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { PlusIcon, EmailIcon, CloseIcon } from '../constants';
import { getStoredItem, setStoredItemAndDispatchEvent } from '../lib/utils';

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
                <path className="fil3" d="M734.72 374.02l59.86 0 8.07 5.76c-21.99,30.73 -39.41,62.74 -52.96,98.03l-55.94 -20.99c11.09,-29.1 24.76,-56.58 40.98,-82.79zm2576.58 1897.2l-61.07 0c7.43,-32.86 10.44,-64.84 10.44,-98.98l59.76 0c0,33.96 -2.72,66.33 -9.13,98.98zm-2636.26 -1753.61c-10.19,43.17 -13.06,81.13 -13.06,125.33l59.76 0c0,-39.68 2.35,-73.03 11.5,-111.8l-58.2 -13.53zm-13.06 185.08l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.51 -59.76 0 0 -119.51zm0 179.27l59.76 0 0 119.51 -59.76 0 0 -119.51zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0 0 119.52 -59.76 0 0 -119.52zm0 179.27l59.76 0c0,40.6 -0.69,74.17 6.34,113.85l-58.81 10.55c-7.87,-42.66 -7.29,-80.98 -7.29,-124.4zm2658.45 -24.37l-59.76 0 0 -119.52 59.76 0 0 119.52zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0 0 -119.51 59.76 0 0 -119.51zm0 -179.27l-59.76 0 0 -119.51 59.76 0 0 -119.51zm0 -179.27l-59.76 0 0 -119.51 59.76 0 0 -119.51zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0 0 -119.52 59.76 0 0 -119.52zm0 -179.27l-59.76 0c0,-39.42 1.22,-75.77 -5.09,-114.5l59.01 -9.46c6.85,42.54 5.85,80.57 5.85,123.96zm-19.8 -186.05c-11.86,-40.16 -29.48,-80.45 -51.55,-116.07l-50.84 31.39c19.36,31.34 34.72,66.48 45.14,101.78l57.26 -17.11z" />
                <path className="fil3" d="M1150.67 141.01l1681.07 0c134.42,0 256.6,54.98 345.16,143.53 88.56,88.56 143.53,210.74 143.53,345.16l0 773.86 -59.76 0 0 -773.86c0,-117.93 -48.27,-225.16 -126.01,-302.91 -77.76,-77.74 -184.99,-126.01 -302.91,-126.01l-1681.07 0c-117.93,0 -225.16,48.27 -302.91,126.01 -77.74,77.75 -126.01,184.99 -126.01,302.91l0 773.86 -59.76 0 0 -773.86c0,-134.42 54.98,-256.6 143.53,-345.16 88.56,-88.55 210.74,-143.53 345.16,-143.53z" />
            </g>
        </g>
    </svg>
);

const GoogleLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" className="w-5 h-5" version="1.1" style={{ shapeRendering: 'geometricPrecision', textRendering: 'geometricPrecision', imageRendering: 'optimizeQuality', fillRule: 'evenodd', clipRule: 'evenodd' }} viewBox="0 0 4000 4000">
        <g id="Layer_x0020_1">
            <metadata id="CorelCorpID_0Corel-Layer"/>
            <path fill="#4285F4" d="M3915 2045c0-141-12-276-35-407H2000v770h1075c-46 250-188 461-400 604v502h648c379-349 592-862 592-1469z"/>
            <path fill="#34A853" d="M2000 4000c540 0 993-179 1324-486l-648-502c-180 120-410 191-676 191-520 0-960-351-1117-824H218v520C549 3549 1222 4000 2000 4000z"/>
            <path fill="#FBBC05" d="M883 2379c-40-120-63-248-63-379s23-259 63-379V1101H218C79 1379 0 1681 0 2000s79 621 218 899l665-520z"/>
            <path fill="#EA4335" d="M2000 815c294 0 557 101 765 299l574-574C2992 191 2539 0 2000 0 1222 0 549 451 218 1101l665 520c157-473 597-824 1117-824z"/>
        </g>
    </svg>
);

const Login: React.FC<any> = ({ onEnterDemo }) => {
    const navigate = useNavigate();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showVerificationNotice, setShowVerificationNotice] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);

    useEffect(() => {
        const pendingEmail = localStorage.getItem('fintab_verification_pending_email');
        if (pendingEmail) {
            setRegisteredEmail(pendingEmail);
            setShowVerificationNotice(true);
            localStorage.removeItem('fintab_verification_pending_email');
        }
    }, []);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSimulatorAuth = async (isGoogle = false) => {
        const mockUsers = getStoredItem('fintab_mock_auth_users', []);
        
        if (isForgotPasswordMode) {
            const user = mockUsers.find(u => u.email === email);
            if (user) {
                setResetEmailSent(true);
            } else {
                setError("Email node not found in system registry.");
            }
            return;
        }

        if (isGoogle) {
            // Simulated Google Login
            const googleUser = {
                uid: 'google-sim-123',
                email: 'google.user@example.com',
                displayName: 'Google Simulator',
                photoURL: 'https://ui-avatars.com/api/?name=G+S&background=4285F4&color=fff'
            };
            setStoredItemAndDispatchEvent('fintab_simulator_session', googleUser);
            return;
        }

        if (isLoginMode) {
            const user = mockUsers.find(u => u.email === email && u.password === password);
            if (user) {
                setStoredItemAndDispatchEvent('fintab_simulator_session', user);
            } else {
                throw { code: 'auth/invalid-credential' };
            }
        } else {
            if (mockUsers.some(u => u.email === email)) {
                throw { code: 'auth/email-already-in-use' };
            }
            const newUser = {
                uid: `mock-${Date.now()}`,
                email,
                password,
                displayName: fullName,
                photoURL: avatar
            };
            mockUsers.push(newUser);
            localStorage.setItem('fintab_mock_auth_users', JSON.stringify(mockUsers));
            setRegisteredEmail(email);
            setShowVerificationNotice(true);
        }
    };

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (isFirebaseConfigured) {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                // onAuthStateChanged in App.tsx will handle the rest
            } else {
                await new Promise(r => setTimeout(r, 1200));
                await handleSimulatorAuth(true);
            }
        } catch (err) {
            console.error("Google Auth Exception:", err);
            setError(err.message || "Could not synchronize with Google Identity node.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isFirebaseConfigured) {
                if (isForgotPasswordMode) {
                    await sendPasswordResetEmail(auth, email);
                    setResetEmailSent(true);
                    setIsLoading(false);
                    return;
                }

                if (isLoginMode) {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    if (!userCredential.user.emailVerified) {
                        await sendEmailVerification(userCredential.user);
                        setRegisteredEmail(email);
                        setShowVerificationNotice(true);
                        await signOut(auth);
                        setIsLoading(false);
                        return;
                    }
                } else {
                    if (password !== confirmPassword) {
                        setError("Passwords do not match.");
                        setIsLoading(false);
                        return;
                    }
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    
                    await updateProfile(userCredential.user, {
                        displayName: fullName,
                        photoURL: avatar
                    });

                    await sendEmailVerification(userCredential.user);
                    
                    setRegisteredEmail(email);
                    setShowVerificationNotice(true);
                    
                    await signOut(auth);
                    setIsLoading(false);
                    return;
                }
            } else {
                if (!isForgotPasswordMode && !isLoginMode && password !== confirmPassword) {
                    setError("Passwords do not match.");
                    setIsLoading(false);
                    return;
                }
                await new Promise(r => setTimeout(r, 1000));
                await handleSimulatorAuth();
            }
        } catch (err) {
            console.error("Auth Exception:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError("Account already exists. Sign in instead?");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Security protocol engaged. Too many attempts. Try later.");
            } else if (err.code?.includes('invalid') || err.code?.includes('user-not-found') || err.code?.includes('wrong-password')) {
                setError("Email or password is incorrect.");
            } else {
                setError(err.message || "An authentication protocol error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // View: Confirmation for verification email
    if (showVerificationNotice) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center p-8 sm:p-12 font-sans overflow-y-auto">
                <div className="w-full max-w-[480px] my-auto animate-fade-in flex flex-col">
                    <div className="text-center mb-6">
                        <FinTabLogo />
                        <h1 className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Verify Enrollment</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">Identity Proof Required</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 text-center space-y-8">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto text-primary">
                            <EmailIcon className="w-10 h-10" />
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed uppercase tracking-tight">
                                We have sent you a verification email to <span className="font-black text-slate-900 dark:text-white">{registeredEmail}</span>.
                            </p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Verify it and log in.
                            </p>
                        </div>
                        <button 
                            onClick={() => { setShowVerificationNotice(false); setIsLoginMode(true); }}
                            className="w-full bg-primary text-white py-4 px-6 rounded-xl font-black text-base shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // View: Confirmation for password reset link
    if (isForgotPasswordMode && resetEmailSent) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center p-8 sm:p-12 font-sans overflow-y-auto">
                <div className="w-full max-w-[480px] my-auto animate-fade-in flex flex-col">
                    <div className="text-center mb-6">
                        <FinTabLogo />
                        <h1 className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Security Sync</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">Link Dispatched</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 text-center space-y-8">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mx-auto text-emerald-500">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed uppercase tracking-tight">
                                We sent you a password change link to <span className="font-black text-slate-900 dark:text-white">{email}</span>.
                            </p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Follow the link in your inbox to reset your terminal access.
                            </p>
                        </div>
                        <button 
                            onClick={() => { setIsForgotPasswordMode(false); setResetEmailSent(false); }}
                            className="w-full bg-primary text-white py-4 px-6 rounded-xl font-black text-base shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex flex-col items-center p-8 sm:p-12 font-sans overflow-y-auto">
            <div className="w-full max-w-[480px] my-auto animate-fade-in flex flex-col">
                
                <div className="text-center mb-6">
                    {(isLoginMode || isForgotPasswordMode) && <FinTabLogo />}
                    <h1 className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                        {isForgotPasswordMode ? 'Recover Access' : isLoginMode ? 'Authorize Entry' : 'Enroll Node'}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">
                        {isFirebaseConfigured ? 'Terminal Access Protocol' : 'Simulator Mode Active'}
                    </p>
                </div>

                {!isFirebaseConfigured && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-center mb-6">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-relaxed">
                            Infrastructure key missing. Identity logic shifted to local simulation.
                        </p>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800">
                    <form onSubmit={handleAuth} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 text-rose-600 text-[11px] font-bold uppercase tracking-widest rounded-xl border border-rose-100 animate-shake text-center leading-relaxed">
                                {error}
                            </div>
                        )}

                        {!isLoginMode && !isForgotPasswordMode && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1 block">Full Identity Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                                    placeholder="e.g. Jean Dupont"
                                />
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1 block">Security Email</label>
                            <input 
                                type="email" 
                                required 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                                placeholder="name@domain.com"
                            />
                        </div>

                        {!isForgotPasswordMode && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1 block">Protocol Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                                    placeholder="••••••••"
                                />
                                {!isLoginMode && <PasswordStrengthIndicator password={password} />}
                                {isLoginMode && (
                                    <button 
                                        type="button"
                                        onClick={() => setIsForgotPasswordMode(true)}
                                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline px-1 mt-1"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                        )}

                        {!isLoginMode && !isForgotPasswordMode && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1 block">Verify Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-xl p-3.5 text-base font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl font-black text-base shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
                        >
                            {isLoading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : (isForgotPasswordMode ? 'Get Reset Link' : isLoginMode ? 'Authorize Entry' : 'Initialize Identity')}
                        </button>
                    </form>

                    {!isForgotPasswordMode && (
                        <div className="space-y-6 mt-8">
                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-slate-100 dark:border-gray-800"></div>
                                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Protocol Mirror</span>
                                <div className="flex-grow border-t border-slate-100 dark:border-gray-800"></div>
                            </div>

                            <button 
                                onClick={handleGoogleAuth}
                                disabled={isLoading}
                                className="w-full bg-white dark:bg-gray-800 border-2 border-slate-100 dark:border-gray-700 text-slate-600 dark:text-white py-4 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest hover:border-primary/20 transition-all flex items-center justify-center gap-4 group active:scale-98 shadow-sm"
                            >
                                <GoogleLogo />
                                {isLoginMode ? 'Auth via Google Node' : 'Enroll via Google Node'}
                            </button>
                        </div>
                    )}

                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-gray-800 text-center space-y-5">
                        {isForgotPasswordMode ? (
                            <button 
                                onClick={() => { setIsForgotPasswordMode(false); setError(null); }} 
                                className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest hover:text-primary transition-colors"
                            >
                                Back to Authorization
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }} 
                                className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest hover:text-primary transition-colors"
                            >
                                {isLoginMode ? 'Create New Global Identity' : 'Already Enrolled? Authorize Entry'}
                            </button>
                        )}
                        
                        {isLoginMode && !isForgotPasswordMode && (
                            <div>
                                <button 
                                    onClick={onEnterDemo} 
                                    className="text-[10px] font-bold text-slate-400 hover:text-emerald-500 uppercase tracking-[0.2em] transition-all"
                                >
                                    Try Terminal Demo
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {!isForgotPasswordMode && !isLoginMode && (
                    <button onClick={() => { setIsLoginMode(true); setIsForgotPasswordMode(false); }} className="w-full text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-500 transition-colors mt-8">Abort & Back to Login</button>
                )}
                
                <p className="text-center text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em] mt-8">
                    FinTab v.0.0.1
                </p>
            </div>
        </div>
    );
};

export default Login;
