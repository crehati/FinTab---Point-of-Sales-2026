
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
                setErrorMessage('Protocol Error: Missing Invitation Token.');
                return;
            }

            if (tokenFromUrl) {
                sessionStorage.setItem('fintab_invite_token', tokenFromUrl);
            }

            try {
                const client = await supabase.wait();
                
                // PHASE 1: Verify token with explicit columns to avoid metadata cache error
                const { data: invites, error: fetchErr } = await client
                    .from('invitations')
                    .select('id, business_id, invited_email, role, token, status, businesses(name)')
                    .eq('token', token)
                    .eq('status', 'pending')
                    .limit(1);

                if (fetchErr) throw new Error(`Registry Fetch Failure: ${fetchErr.message}`);
                
                const invite = invites && invites[0];

                if (!invite) {
                    throw new Error('Invitation invalid, expired, or already authorized.');
                }
                
                setInviteData(invite);

                if (!currentUser) {
                    setStatus('awaiting_auth');
                    return;
                }

                if (invite.invited_email.toLowerCase() !== currentUser.email?.toLowerCase()) {
                    setStatus('error');
                    setErrorMessage(`Identity Mismatch: This invite belongs to "${invite.invited_email}", not "${currentUser.email}".`);
                    return;
                }

                setStatus('joining');
                
                // PHASE 4: ATOMIC NODE INJECTION with schema resilience
                const membershipData = {
                    business_id: invite.business_id,
                    user_id: currentUser.id,
                    role: invite.role,
                    joined_at: new Date().toISOString()
                };

                // Attempt join including investment if metadata exists
                if (invite.metadata?.initial_investment) {
                    membershipData.initial_investment = invite.metadata.initial_investment;
                }

                const { error: joinErr } = await client.from('memberships').insert(membershipData);

                if (joinErr) {
                    // Check for missing 'initial_investment' column in memberships
                    if (joinErr.message.includes("initial_investment") || joinErr.code === '42703') {
                        const { initial_investment, ...safeMembership } = membershipData;
                        const { error: retryErr } = await client.from('memberships').insert(safeMembership);
                        if (retryErr && retryErr.code !== '23505') throw retryErr;
                    } else if (joinErr.code !== '23505') {
                        throw joinErr;
                    }
                }

                // PHASE 5: Decommission the token
                await client
                    .from('invitations')
                    .update({ 
                        status: 'accepted', 
                        accepted_at: new Date().toISOString(), 
                        accepted_by: currentUser.id 
                    })
                    .eq('id', invite.id);

                sessionStorage.removeItem('fintab_invite_token');
                setStatus('success');
                
                setTimeout(() => {
                    localStorage.setItem('fintab_active_business_id', invite.business_id);
                    window.location.href = '/#/dashboard';
                    window.location.reload();
                }, 1500);

            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Node synchronization failed.');
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
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Node Link Active</h2>
                        <div className="flex justify-center gap-3">
                             <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-3.5 h-3.5 bg-primary rounded-full animate-bounce"></div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] leading-relaxed">
                            Synchronizing registry credentials...
                        </p>
                    </div>
                )}

                {status === 'awaiting_auth' && (
                    <div className="space-y-10 animate-fade-in">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Authorize Identity</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-6">Invitation for {inviteData?.invited_email}</p>
                        <button onClick={() => navigate('/')} className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:bg-black transition-all">Authorize Terminal Entry</button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-8 animate-scale-in">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
                             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Access Granted</h2>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-10 animate-fade-in">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-rose-600">Protocol Failure</h2>
                        <p className="text-sm font-bold text-rose-700 dark:text-rose-400 uppercase leading-relaxed">{errorMessage}</p>
                        <button onClick={() => navigate('/')} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest">Return to Login</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitePage;
