
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AIIcon } from '../constants';

const InvitePage: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'joining' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const token = searchParams.get('token');

    useEffect(() => {
        const processInvite = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('Missing Invitation Token. Please check the link provided by your business owner.');
                return;
            }

            if (!currentUser) {
                setStatus('error');
                setErrorMessage('Authentication Required. Please log in or create an account to accept this invitation.');
                return;
            }

            try {
                setStatus('joining');
                // 1. Verify invitation
                const { data: invite, error: fetchErr } = await supabase
                    .from('invitations')
                    .select('*')
                    .eq('token', token)
                    .eq('status', 'pending')
                    .single();

                if (fetchErr || !invite) throw new Error('Invitation protocol invalid or already utilized.');

                // 2. Security Check: Email match
                if (invite.invited_email.toLowerCase() !== currentUser.email.toLowerCase()) {
                    throw new Error(`Credential Mismatch: This invite was issued for ${invite.invited_email}, but you are logged in as ${currentUser.email}.`);
                }

                // 3. Perform Join (Atomic Membership Injection)
                const { error: joinErr } = await supabase
                    .from('memberships')
                    .insert({
                        business_id: invite.business_id,
                        user_id: currentUser.id,
                        role: invite.role,
                        joined_at: new Date().toISOString()
                    });

                if (joinErr) {
                    if (joinErr.code === '23505') {
                        // Already a member, that's fine
                    } else throw joinErr;
                }

                // 4. Close Invitation record
                await supabase
                    .from('invitations')
                    .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: currentUser.id })
                    .eq('id', invite.id);

                setStatus('success');
                setTimeout(() => navigate('/dashboard'), 2000);
            } catch (err) {
                setStatus('error');
                setErrorMessage(err.message);
            }
        };

        if (currentUser) processInvite();
    }, [token, currentUser, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl p-12 text-center border border-white/10 animate-fade-in">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary">
                    <AIIcon className="w-10 h-10" />
                </div>

                {status === 'verifying' || status === 'joining' ? (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Synchronizing Node</h2>
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Validating secure invitation token...</p>
                    </div>
                ) : status === 'success' ? (
                    <div className="space-y-6 animate-scale-in">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-200">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Identity Authorized</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Membership established. Initializing dashboard...</p>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-rose-600">Protocol Failure</h2>
                        <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-400 leading-relaxed uppercase tracking-tight">{errorMessage}</p>
                        </div>
                        {!currentUser && (
                             <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Authorize Login</button>
                        )}
                        <button onClick={() => navigate('/onboarding')} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-primary">Create New Business Node Instead</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitePage;
