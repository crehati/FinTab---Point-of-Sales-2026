
// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import type { User, ReceiptSettingsData, Product, BusinessSettingsData, PerformanceUser, AppPermissions } from '../types';
import UserDetailModal from './UserDetailModal';
import { InvestorIcon, WarningIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import ModalShell from './ModalShell';

interface InvestorPageProps {
    users: User[];
    netProfit: number;
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    currentUser: User | null;
    businessSettings: BusinessSettingsData;
    permissions: AppPermissions;
    initiateWorkflow: (type: string, auditId: string, amount: number, metadata: any) => Promise<string | null>;
}

const InvestorPage: React.FC<InvestorPageProps> = ({ 
    users = [], netProfit = 0, receiptSettings, currentUser, businessSettings, initiateWorkflow
}) => {
    const [auditUser, setAuditUser] = useState<PerformanceUser | null>(null);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const cs = receiptSettings.currencySymbol;

    const financialData = useMemo(() => {
        const participants = users.filter(u => u && (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = participants.reduce((sum, p) => sum + (p.initialInvestment || 0), 0);
        const distRate = (businessSettings.investorDistributionPercentage || 100) / 100;
        
        return participants.map(p => {
            const stakePercent = totalCapital > 0 ? (p.initialInvestment / totalCapital) : 0;
            const yieldEarned = netProfit * stakePercent * distRate;
            return { ...p, stakePercent: (stakePercent * 100).toFixed(2), yieldEarned };
        });
    }, [users, netProfit, businessSettings]);

    const handleRequestPayout = async () => {
        const amt = parseFloat(payoutAmount);
        if (isNaN(amt) || amt <= 0) return;
        
        setIsProcessing(true);
        const workflowId = await initiateWorkflow('PAYOUT', `payout-${Date.now()}`, amt, {
            user_id: currentUser.id,
            destination: 'CASH',
            type: 'Yield Distribution'
        });
        
        if (workflowId) {
            setIsPayoutModalOpen(false);
            setPayoutAmount('');
            alert("Authorization Flow Initialized: Payout request submitted for governance review.");
        }
        setIsProcessing(false);
    };

    return (
        <div className="space-y-12 animate-fade-in font-sans pb-24 lg:pb-8">
            <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
                <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-inner">
                            <InvestorIcon className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Partner Grid</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Authoritative Equity Yield Matrix</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsPayoutModalOpen(true)} 
                        className="px-10 py-5 bg-primary text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        Liquidate Yield
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            <tr>
                                <th className="px-10 py-8">Partner Identity</th>
                                <th className="px-10 py-8 text-right">Capital Injection</th>
                                <th className="px-10 py-8 text-center">Equity Protocol</th>
                                <th className="px-10 py-8 text-right">Ledger Yield</th>
                                <th className="px-10 py-8 text-center">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                            {financialData.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <img src={p.avatarUrl} className="w-11 h-11 rounded-2xl object-cover border-2 border-white shadow-sm" />
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base">{p.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.role} Node</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right font-black text-slate-900 dark:text-white tabular-nums">{cs}{p.initialInvestment?.toLocaleString()}</td>
                                    <td className="px-10 py-8 text-center">
                                        <span className="px-4 py-1.5 bg-primary/5 text-primary border border-primary/10 rounded-full text-[10px] font-black tabular-nums">{p.stakePercent}%</span>
                                    </td>
                                    <td className="px-10 py-8 text-right font-black text-emerald-600 tabular-nums text-lg">{cs}{formatAbbreviatedNumber(p.yieldEarned)}</td>
                                    <td className="px-10 py-8 text-center">
                                        <button onClick={() => setAuditUser(p)} className="p-3 bg-slate-50 dark:bg-gray-800 text-slate-400 hover:text-primary rounded-xl transition-all">Audit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ModalShell isOpen={isPayoutModalOpen} onClose={() => setIsPayoutModalOpen(false)} title="Liquidation Protocol" description="Initialize profit distribution workflow">
                <div className="space-y-8">
                    <div className="p-8 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30 text-center shadow-inner">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">My Distributive Balance</p>
                        <p className="text-5xl font-black text-emerald-600 tabular-nums tracking-tighter">
                            {cs}{formatAbbreviatedNumber(financialData.find(p=>p.id===currentUser?.id)?.yieldEarned || 0)}
                        </p>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block px-1">Liquidation Value ({cs})</label>
                            <input 
                                type="number" 
                                value={payoutAmount} 
                                onChange={e => setPayoutAmount(e.target.value)} 
                                className="w-full p-6 bg-slate-50 dark:bg-gray-900 border-none rounded-3xl font-black text-4xl text-center tabular-nums focus:ring-4 focus:ring-primary/10 outline-none" 
                                placeholder="0.00" 
                                disabled={isProcessing}
                            />
                        </div>
                        <button 
                            onClick={handleRequestPayout} 
                            disabled={isProcessing || !payoutAmount}
                            className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-[12px] tracking-[0.3em] shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : "Commit Authorized Request"}
                        </button>
                    </div>
                </div>
            </ModalShell>

            {auditUser && (
                <UserDetailModal 
                    isOpen={!!auditUser} onClose={() => setAuditUser(null)} user={auditUser}
                    sales={[]} expenses={[]} receiptSettings={receiptSettings}
                />
            )}
        </div>
    );
};

export default InvestorPage;
