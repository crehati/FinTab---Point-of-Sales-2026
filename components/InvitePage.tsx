
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheckIcon, TransactionIcon } from '../constants';

const InvitePage: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'joining' | 'success' | 'error' | 'awaiting_auth'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const [inviteData, setInviteData] = useState(null);
    
    const tokenFromUrl = searchParams.get('token');
    const tokenFromSession = sessionStorage.getItem('fintab_invite_token');
    const token = tokenFromUrl || tokenFromSession;

    useEffect(() => {
        const processInvite = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('Missing authorization token.');
                return;
            }
            if (tokenFromUrl) sessionStorage.setItem('fintab_invite_token', tokenFromUrl);

            try {
                const client = await supabase.wait();
                const { data: invites, error: fetchErr } = await client
                    .from('invitations')
                    .select('id, business_id, invited_email, role, token, status, metadata')
                    .eq('token', token)
                    .eq('status', 'pending');

                if (fetchErr) throw new Error("Registry unreachable.");
                const invite = invites && invites[0];

                if (!invite) throw new Error('Invalid or expired token.');
                
                const { data: biz } = await client.from('businesses').select('name').eq('id', invite.business_id).maybeSingle();
                setInviteData({ ...invite, businessName: biz?.name || 'Operational Unit' });

                if (!currentUser) { setStatus('awaiting_auth'); return; }

                if (invite.invited_email.toLowerCase() !== currentUser.email?.toLowerCase()) {
                    setStatus('error');
                    setErrorMessage(`Identity mismatch. Expected: ${invite.invited_email}`);
                    return;
                }

                setStatus('joining');
                const membershipData = {
                    business_id: invite.business_id,
                    user_id: currentUser.id,
                    role: invite.role,
                    joined_at: new Date().toISOString(),
                    initial_investment: invite.metadata?.initial_investment || 0
                };

                const { error: joinErr } = await client.from('memberships').insert(membershipData);
                if (joinErr && joinErr.code !== '23505') throw joinErr;

                await client.from('invitations').update({ 
                    status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: currentUser.id 
                }).eq('id', invite.id);

                sessionStorage.removeItem('fintab_invite_token');
                setStatus('success');
                
                setTimeout(() => {
                    localStorage.setItem('fintab_active_business_id', invite.business_id);
                    window.location.href = '/#/dashboard';
                    window.location.reload();
                }, 1500);

            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Sync failed.');
            }
        };

        if (status !== 'success') processInvite();
    }, [token, currentUser, status]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[440px] bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl p-12 text-center border border-white/10 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-10 text-primary">
                    <ShieldCheckIcon className="w-8 h-8" />
                </div>

                {(status === 'verifying' || status === 'joining') && (
                    <div className="space-y-8">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Authorizing Node</h2>
                        <div className="flex justify-center gap-2">
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Verifying Secure Integrity...</p>
                    </div>
                )}

                {status === 'awaiting_auth' && (
                    <div className="space-y-10 animate-fade-in">
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Identity Match</h2>
                            <p className="text-sm font-medium text-slate-500">You've been invited to join <span className="text-primary font-bold">{inviteData?.businessName}</span></p>
                        </div>
                        <button onClick={() => navigate('/')} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">Authorize Identity</button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 animate-scale-in">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
                             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Node Linked</h2>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-rose-600">Protocol Failure</h2>
                        <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase leading-relaxed">{errorMessage}</p>
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => navigate('/')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Return Home</button>
                            <button onClick={() => { sessionStorage.removeItem('fintab_invite_token'); window.location.reload(); }} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary">Purge Cache & Retry</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitePage;
