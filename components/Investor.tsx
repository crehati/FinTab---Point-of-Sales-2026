
// @ts-nocheck
import React, { useMemo, useState } from 'react';
import type { User, ReceiptSettingsData, Product, BusinessSettingsData, PerformanceUser, AppPermissions } from '../types';
import UserDetailModal from './UserDetailModal';
import { InvestorIcon, WarningIcon, ShieldCheckIcon } from '../constants';
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
        }
        setIsProcessing(false);
    };

    return (
        <div className="space-y-12 animate-fade-in font-sans pb-24 lg:pb-8">
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full -mr-48 -mt-48 blur-[130px]"></div>
                <div className="relative flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="flex items-center gap-10">
                        <div className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner">
                            <InvestorIcon className="w-12 h-12 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Partner Grid</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Authorized Equity Yield Matrix</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsPayoutModalOpen(true)} 
                        className="px-12 py-6 bg-primary text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        Liquidate Yield
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] shadow-xl border border-slate-50 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <tr>
                                <th className="px-10 py-10">Partner Identity</th>
                                <th className="px-10 py-10 text-right">Capital Injection</th>
                                <th className="px-10 py-10 text-center">Equity Share</th>
                                <th className="px-10 py-10 text-right">Accrued Yield</th>
                                <th className="px-10 py-10 text-center">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                            {financialData.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                    <td className="px-10 py-10">
                                        <div className="flex items-center gap-5">
                                            <img src={p.avatarUrl} className="w-14 h-14 rounded-2xl object-cover border-4 border-white shadow-sm transition-transform group-hover:scale-110" />
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">{p.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.role} Identity</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-10 text-right font-black text-slate-900 dark:text-white tabular-nums text-lg">{cs}{p.initialInvestment?.toLocaleString()}</td>
                                    <td className="px-10 py-10 text-center">
                                        <span className="px-5 py-2 bg-primary/5 text-primary border border-primary/10 rounded-full text-[11px] font-black tabular-nums">{p.stakePercent}%</span>
                                    </td>
                                    <td className="px-10 py-10 text-right font-black text-emerald-600 tabular-nums text-2xl">{cs}{formatAbbreviatedNumber(p.yieldEarned)}</td>
                                    <td className="px-10 py-10 text-center">
                                        <button onClick={() => setAuditUser(p)} className="px-6 py-3 bg-slate-50 dark:bg-gray-800 text-slate-400 hover:text-primary rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">Audit Node</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ModalShell isOpen={isPayoutModalOpen} onClose={() => setIsPayoutModalOpen(false)} title="Liquidation Protocol" description="Initialize profit distribution workflow">
                <div className="space-y-10">
                    <div className="p-10 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-[3rem] border border-emerald-100 dark:border-emerald-900/30 text-center shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">My Authorized Balance</p>
                        <p className="text-6xl font-black text-emerald-600 tabular-nums tracking-tighter">
                            {cs}{formatAbbreviatedNumber(financialData.find(p=>p.id===currentUser?.id)?.yieldEarned || 0)}
                        </p>
                    </div>
                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block px-1">Liquidation Quantum ({cs})</label>
                            <input 
                                type="number" 
                                value={payoutAmount} 
                                onChange={e => setPayoutAmount(e.target.value)} 
                                className="w-full p-8 bg-slate-50 dark:bg-gray-900 border-none rounded-[2rem] font-black text-5xl text-center tabular-nums focus:ring-8 focus:ring-primary/5 outline-none" 
                                placeholder="0.00" 
                                disabled={isProcessing}
                            />
                        </div>
                        <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 flex items-start gap-5">
                            <ShieldCheckIcon className="w-6 h-6 text-amber-500 flex-shrink-0" />
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tight leading-relaxed">
                                This request will initialize a 2-step verification protocol. Funds remain in treasury until the second signature is authorized.
                            </p>
                        </div>
                        <button 
                            onClick={handleRequestPayout} 
                            disabled={isProcessing || !payoutAmount}
                            className="w-full py-7 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-4"
                        >
                            {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : "Authorize Remittance"}
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
