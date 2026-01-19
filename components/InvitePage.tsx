
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheckIcon, TransactionIcon, BuildingIcon, CrownIcon, StaffIcon, WarningIcon } from '../constants';

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

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('Authorization protocol failure: Invitation token null.');
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
                if (!invites) throw new Error('Verification Failure: invitation expired, revoked, or decommissioned.');

                setInviteData({
                    ...invites,
                    businessName: invites.businesses?.name || 'Authorized Unit'
                });

                if (!currentUser) setStatus('awaiting_auth');
                else setStatus('joining');
            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Security protocol interrupt.');
            }
        };

        if (status === 'verifying') verifyToken();
    }, [token, currentUser, status, tokenFromUrl]);

    useEffect(() => {
        const joinBusiness = async () => {
            if (status !== 'joining' || !currentUser || !inviteData || processingRef.current) return;
            
            processingRef.current = true;
            try {
                const client = await supabase.wait();

                // Security Check: Identity Mismatch Protocol
                if (inviteData.invited_email.toLowerCase() !== currentUser.email?.toLowerCase()) {
                    throw new Error(`Security Protocol Violation: Invitation issued to ${inviteData.invited_email}, but active node identity is ${currentUser.email}.`);
                }

                // 1. Provision Membership Node
                const { error: joinErr } = await client.from('memberships').insert({
                    business_id: inviteData.business_id,
                    user_id: currentUser.id,
                    role: inviteData.role,
                    initial_investment: inviteData.metadata?.initial_investment || 0,
                    joined_at: new Date().toISOString(),
                    status: 'Active'
                });

                if (joinErr && joinErr.code !== '23505') throw joinErr;

                // 2. Decommission Token
                await client.from('invitations').update({ 
                    status: 'accepted', 
                    accepted_at: new Date().toISOString(), 
                    accepted_by: currentUser.id 
                }).eq('id', inviteData.id);

                sessionStorage.removeItem('fintab_invite_token');
                setStatus('success');
                
                setTimeout(() => {
                    localStorage.setItem('fintab_active_business_id', inviteData.business_id);
                    window.location.href = '/#/dashboard';
                    window.location.reload();
                }, 2000);

            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Node provisioning failed.');
            } finally {
                processingRef.current = false;
            }
        };

        if (status === 'joining') joinBusiness();
    }, [status, currentUser, inviteData]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[500px] bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] p-12 text-center border border-slate-100 dark:border-gray-800 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-10 text-primary shadow-inner">
                    <ShieldCheckIcon className="w-8 h-8" />
                </div>

                {(status === 'verifying' || status === 'joining') && (
                    <div className="space-y-10">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Security Audit</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validating Node Credentials...</p>
                        </div>
                        <div className="flex justify-center gap-2">
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}

                {status === 'awaiting_auth' && (
                    <div className="space-y-12 animate-fade-in">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Node Connection</p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">Identity Request</h2>
                        </div>

                        <div className="p-10 bg-slate-50 dark:bg-gray-800 rounded-[3rem] border border-slate-100 dark:border-gray-700 shadow-inner relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                             <div className="flex flex-col items-center gap-5 relative">
                                <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
                                    {inviteData?.role === 'Investor' || inviteData?.role === 'Owner' ? <CrownIcon className="w-8 h-8 text-primary" /> : <StaffIcon className="w-8 h-8 text-primary" />}
                                </div>
                                <div>
                                    <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{inviteData?.businessName}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Provisioning Role: {inviteData?.role}</p>
                                </div>
                             </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <button onClick={() => navigate('/login')} className="w-full py-6 bg-primary text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-4">
                                Authorize Identity
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                            </button>
                            <button onClick={() => { sessionStorage.removeItem('fintab_invite_token'); navigate('/'); }} className="w-full py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] hover:text-slate-600 transition-colors">Abort Onboarding</button>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-10 animate-scale-in">
                        <div className="w-28 h-28 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20 rotate-12">
                             <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Node Linked</h2>
                            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Master Identity Synchronized.</p>
                        </div>
                        <div className="pt-4">
                            <div className="w-full h-1 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 animate-[progress_2s_ease-in-out]"></div>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-10 animate-fade-in">
                        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto border border-rose-100 shadow-inner">
                            <WarningIcon className="w-10 h-10" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-rose-600 leading-none">Verification Fault</h2>
                            <div className="p-8 bg-rose-50/50 dark:bg-rose-950/10 rounded-[2rem] border border-rose-100 dark:border-rose-900/30">
                                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase leading-relaxed tracking-tight">{errorMessage}</p>
                            </div>
                        </div>
                        <button onClick={() => { sessionStorage.removeItem('fintab_invite_token'); navigate('/'); }} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] shadow-xl active:scale-95 transition-all">Return to Registry</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitePage;
