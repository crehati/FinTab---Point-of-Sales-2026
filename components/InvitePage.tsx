
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AIIcon, WarningIcon, ShieldCheckIcon } from '../constants';

const InvitePage: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'joining' | 'success' | 'error' | 'awaiting_auth'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const [inviteData, setInviteData] = useState(null);
    
    const tokenFromUrl = searchParams.get('token');
    // Session backup to handle the auth redirect dance
    const tokenFromSession = sessionStorage.getItem('fintab_invite_token');
    const token = tokenFromUrl || tokenFromSession;

    useEffect(() => {
        const processInvite = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('Protocol Error: Missing Invitation Token. Ensure the link provided is complete.');
                return;
            }

            // Persist token in case user needs to log in/sign up
            if (tokenFromUrl) {
                sessionStorage.setItem('fintab_invite_token', tokenFromUrl);
            }

            try {
                const client = await supabase.wait();
                
                // PHASE 1: Verify token existence and status
                const { data: invites, error: fetchErr } = await client
                    .from('invitations')
                    .select('*, businesses(name)')
                    .eq('token', token)
                    .eq('status', 'pending')
                    .limit(1);

                if (fetchErr) throw new Error(`Cloud Sync Failure: ${fetchErr.message}`);

                const invite = invites && invites[0];

                if (!invite) {
                    throw new Error('Invitation protocol invalid or expired. Please request a new token from the business owner.');
                }
                
                setInviteData(invite);

                // PHASE 2: Identity Authentication Check
                if (!currentUser) {
                    setStatus('awaiting_auth');
                    return;
                }

                // PHASE 3: Identity Integrity Verification
                if (invite.invited_email.toLowerCase() !== currentUser.email?.toLowerCase()) {
                    setStatus('error');
                    setErrorMessage(`Identity Mismatch: This invite was issued for "${invite.invited_email}", but you are currently authenticated as "${currentUser.email}". Please sign in with the correct terminal identity.`);
                    return;
                }

                setStatus('joining');
                
                // PHASE 4: ATOMIC NODE INJECTION
                // Map the initial_investment from metadata to the membership record
                const { error: joinErr } = await client
                    .from('memberships')
                    .insert({
                        business_id: invite.business_id,
                        user_id: currentUser.id,
                        role: invite.role,
                        initial_investment: invite.metadata?.initial_investment || 0,
                        joined_at: new Date().toISOString()
                    });

                // Handle unique constraint (user already a member)
                if (joinErr && joinErr.code !== '23505') {
                    throw new Error(`Membership injection failed: ${joinErr.message}`);
                }

                // PHASE 5: Decommission the token
                const { error: updateErr } = await client
                    .from('invitations')
                    .update({ 
                        status: 'accepted', 
                        accepted_at: new Date().toISOString(), 
                        accepted_by: currentUser.id 
                    })
                    .eq('id', invite.id);

                sessionStorage.removeItem('fintab_invite_token');
                setStatus('success');
                
                // Final Sync & Redirect
                setTimeout(() => {
                    localStorage.setItem('fintab_active_business_id', invite.business_id);
                    // Force clean state reload
                    window.location.href = '/#/dashboard';
                    window.location.reload();
                }, 1800);

            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'An unknown protocol error occurred during node synchronization.');
            }
        };

        if (status !== 'success') {
            processInvite();
        }
    }, [token, currentUser, status]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-2xl p-12 text-center border border-white/10 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary shadow-inner">
                    <ShieldCheckIcon className="w-10 h-10" />
                </div>

                {(status === 'verifying' || status === 'joining') && (
                    <div className="space-y-8">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Synchronizing Node</h2>
                        <div className="flex justify-center gap-3">
                             <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce"></div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] leading-relaxed px-4">
                            {status === 'verifying' ? 'Validating secure invitation token...' : 'Injecting membership credentials into grid...'}
                        </p>
                    </div>
                )}

                {status === 'awaiting_auth' && (
                    <div className="space-y-10 animate-fade-in">
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3">Verification Required</p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Authorize Identity</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-6">Invitation for {inviteData?.invited_email} to join {inviteData?.businesses?.name}</p>
                        </div>
                        
                        <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase tracking-tight">
                                You must authenticate your global identity before this membership node can be activated.
                            </p>
                        </div>

                        <button 
                            onClick={() => navigate('/')} 
                            className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95"
                        >
                            Authorize Terminal Entry
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-8 animate-scale-in">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-200">
                             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Access Granted</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-6 px-4">Membership protocol finalized. Synchronizing dashboard node...</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-10 animate-fade-in">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-rose-600">Protocol Failure</h2>
                        <div className="p-8 bg-rose-50 dark:bg-rose-950/20 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/50 shadow-inner">
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-400 font-medium leading-relaxed uppercase tracking-tight">{errorMessage}</p>
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => navigate('/')} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl">Return to Login</button>
                            <button onClick={() => { sessionStorage.removeItem('fintab_invite_token'); window.location.reload(); }} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary">Purge Token & Retry</button>
                        </div>
                    </div>
                )}
            </div>
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.6em]">FinTab Security Node v1.4.5</p>
        </div>
    );
};

export default InvitePage;
