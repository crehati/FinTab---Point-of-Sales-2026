// @ts-nocheck
import React, { useMemo, useState } from 'react';
import type { User, Sale, Expense, ReceiptSettingsData, Product, BusinessSettingsData, PerformanceUser, Customer, AppPermissions, UserPermissions } from '../types';
import Card from './Card';
import UserModal from './UserModal';
import ConfirmationModal from './ConfirmationModal';
import UserDetailModal from './UserDetailModal';
import UserPermissionModal from './UserPermissionModal';
import EmptyState from './EmptyState';
import { PlusIcon, FINALIZED_SALE_STATUSES, InvestorIcon, BankIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber, setStoredItemAndDispatchEvent } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { hasAccess } from '../lib/permissions';
import ModalShell from './ModalShell';

interface InvestorPageProps {
    users: User[];
    netProfit: number;
    products: Product[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    currentUser: User | null;
    businessSettings: BusinessSettingsData;
    permissions: AppPermissions;
    initiateWorkflow: (type: string, auditId: string, amount: number, metadata: any) => Promise<string | null>;
}

const InvestorPage: React.FC<InvestorPageProps> = ({ 
    users = [], 
    netProfit = 0,
    t, 
    receiptSettings, 
    products = [], 
    currentUser, 
    businessSettings, 
    permissions,
    initiateWorkflow
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [auditUser, setAuditUser] = useState<PerformanceUser | null>(null);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');

    const cs = receiptSettings.currencySymbol;
    const navigate = useNavigate();

    const financialData = useMemo(() => {
        const participants = users.filter(u => u && (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = participants.reduce((sum, p) => sum + (p.initialInvestment || 0), 0);
        const distRate = (businessSettings.investorDistributionPercentage || 100) / 100;
        
        const participantsWithYield = participants.map(p => {
            const stakePercent = totalCapital > 0 ? (p.initialInvestment / totalCapital) : 0;
            const yieldEarned = netProfit * stakePercent * distRate;
            return { ...p, stakePercent: (stakePercent * 100).toFixed(2), yieldEarned };
        });

        return { totalCapital, participants: participantsWithYield };
    }, [users, netProfit, businessSettings.investorDistributionPercentage]);

    const handleRequestPayout = async () => {
        const amt = parseFloat(payoutAmount);
        if (isNaN(amt) || amt <= 0) return;
        
        await initiateWorkflow('PAYOUT', `payout-${Date.now()}`, amt, {
            user_id: currentUser.id,
            destination: 'CASH',
            type: 'Yield Distribution'
        });
        setIsPayoutModalOpen(false);
        setPayoutAmount('');
        alert("Authorization Initiated: Payout request sent to governance queue.");
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Partners</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Authoritative Equity Yield Matrix</p>
                    </div>
                    
                    <div className="flex gap-4">
                         <button onClick={() => setIsPayoutModalOpen(true)} className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Liquidate Yield</button>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    <div className="table-wrapper">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th>Identity</th>
                                    <th className="text-right">Capital</th>
                                    <th className="text-center">Equity %</th>
                                    <th className="text-right">Ledger Yield</th>
                                    <th className="text-right">Audit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financialData.participants.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.name}</td>
                                        <td className="text-right">{cs}{p.initialInvestment.toLocaleString()}</td>
                                        <td className="text-center">{p.stakePercent}%</td>
                                        <td className="text-right text-emerald-600 font-bold">{cs}{p.yieldEarned.toLocaleString()}</td>
                                        <td className="text-right">
                                            <button onClick={() => setAuditUser(p)} className="text-primary text-[10px] font-bold uppercase">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ModalShell isOpen={isPayoutModalOpen} onClose={() => setIsPayoutModalOpen(false)} title="Request Payout" description="Initiate profit liquidation protocol">
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Amount to Liquidate ({cs})</label>
                        <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-2xl" placeholder="0.00" />
                    </div>
                    <button onClick={handleRequestPayout} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Initiate Auth Workflow</button>
                </div>
            </ModalShell>

            {auditUser && (
                <UserDetailModal 
                    isOpen={!!auditUser} onClose={() => setAuditUser(null)} user={auditUser}
                    sales={[]} expenses={[]} customers={[]} onClockInOut={() => {}}
                    currentUser={currentUser} receiptSettings={receiptSettings} businessProfile={null}
                />
            )}
        </div>
    );
};

export default InvestorPage;