
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheckIcon, TransactionIcon, BuildingIcon, CrownIcon, StaffIcon } from '../constants';

const InvitePage: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'joining' | 'success' | 'error' | 'awaiting_auth'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const [inviteData, setInviteData] = useState(null);
    const processingRef = useRef(false);
    
    const tokenFromUrl = searchParams.get('token');
    const tokenFromSession = sessionStorage.getItem('fintab_invite_token');
    const token = tokenFromUrl || tokenFromSession;

    // Phase 1: Verify the token and fetch business info
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('No valid authorization token found in the request URI.');
                return;
            }
            if (tokenFromUrl) sessionStorage.setItem('fintab_invite_token', tokenFromUrl);

            try {
                const client = await supabase.wait();
                const { data: invites, error: fetchErr } = await client
                    .from('invitations')
                    .select('*, businesses(name, id)')
                    .eq('token', token)
                    .eq('status', 'pending')
                    .maybeSingle();

                if (fetchErr) throw fetchErr;
                if (!invites) throw new Error('This invitation has expired, been revoked, or already used.');

                setInviteData({
                    ...invites,
                    businessName: invites.businesses?.name || 'Authorized Business Unit'
                });

                if (!currentUser) {
                    setStatus('awaiting_auth');
                } else {
                    setStatus('joining');
                }
            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Verification protocol failed.');
            }
        };

        if (status === 'verifying') verifyToken();
    }, [token, currentUser, status, tokenFromUrl]);

    // Phase 2: Handle the actual joining logic once user is logged in
    useEffect(() => {
        const joinBusiness = async () => {
            if (status !== 'joining' || !currentUser || !inviteData || processingRef.current) return;
            
            processingRef.current = true;
            try {
                const client = await supabase.wait();

                // Security Check: Does the logged in email match the invite?
                if (inviteData.invited_email.toLowerCase() !== currentUser.email?.toLowerCase()) {
                    throw new Error(`Identity Mismatch: This link was issued for ${inviteData.invited_email}, but you are authorized as ${currentUser.email}.`);
                }

                // 1. Create Membership
                const { error: joinErr } = await client.from('memberships').insert({
                    business_id: inviteData.business_id,
                    user_id: currentUser.id,
                    role: inviteData.role,
                    initial_investment: inviteData.metadata?.initial_investment || 0,
                    joined_at: new Date().toISOString()
                });

                // If they are already a member, we still want to mark invite as used and proceed
                if (joinErr && joinErr.code !== '23505') throw joinErr;

                // 2. Mark Invitation as Accepted
                await client.from('invitations').update({ 
                    status: 'accepted', 
                    accepted_at: new Date().toISOString(), 
                    accepted_by: currentUser.id 
                }).eq('id', inviteData.id);

                // 3. Cleanup and Redirect
                sessionStorage.removeItem('fintab_invite_token');
                setStatus('success');
                
                setTimeout(() => {
                    localStorage.setItem('fintab_active_business_id', inviteData.business_id);
                    window.location.href = '/#/dashboard';
                    window.location.reload();
                }, 1500);

            } catch (err: any) {
                console.error("Join Failure:", err);
                setStatus('error');
                setErrorMessage(err.message || 'Onboarding synchronization failed.');
            } finally {
                processingRef.current = false;
            }
        };

        if (status === 'joining') joinBusiness();
    }, [status, currentUser, inviteData]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[480px] bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl p-12 text-center border border-white/10 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-10 text-primary shadow-inner">
                    <ShieldCheckIcon className="w-8 h-8" />
                </div>

                {(status === 'verifying' || status === 'joining') && (
                    <div className="space-y-8">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Authenticating Node</h2>
                        <div className="flex justify-center gap-2">
                             <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Linking Identity to Terminal...</p>
                    </div>
                )}

                {status === 'awaiting_auth' && (
                    <div className="space-y-10 animate-fade-in">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Official Invitation</p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Join the Node</h2>
                            <div className="p-8 bg-slate-50 dark:bg-gray-800 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 shadow-inner">
                                <div className="flex items-center justify-center gap-4 mb-3">
                                    {inviteData?.role === 'Investor' || inviteData?.role === 'Owner' ? <CrownIcon className="w-6 h-6 text-primary" /> : <StaffIcon className="w-6 h-6 text-primary" />}
                                    <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{inviteData?.businessName}</p>
                                </div>
                                <div className="inline-block px-4 py-1.5 bg-white dark:bg-gray-900 rounded-full border border-slate-100 dark:border-gray-700">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol: {inviteData?.role}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                                To proceed, authorize your email credentials.
                            </p>
                            <div className="grid grid-cols-1 gap-3 pt-2">
                                <button onClick={() => navigate('/login')} className="w-full py-6 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-95">Log In / Register Identity</button>
                                <button onClick={() => { sessionStorage.removeItem('fintab_invite_token'); navigate('/'); }} className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors">Abort Onboarding</button>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-8 animate-scale-in">
                        <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20">
                             <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Node Linked</h2>
                            <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Onboarding Protocol Successful. Launching...</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-rose-600">Verification Error</h2>
                        <div className="p-8 bg-rose-50 dark:bg-rose-950/20 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/50">
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase leading-relaxed">{errorMessage}</p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <button onClick={() => { sessionStorage.removeItem('fintab_invite_token'); navigate('/'); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Return to Hub</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitePage;
