
// @ts-nocheck
import React, { useMemo, useState } from 'react';
import type { User, Sale, Expense, ReceiptSettingsData, Product, BusinessSettingsData, PerformanceUser, Customer, AppPermissions, UserPermissions } from '../types';
import Card from './Card';
import UserModal from './UserModal';
import ConfirmationModal from './ConfirmationModal';
import UserDetailModal from './UserDetailModal';
import UserPermissionModal from './UserPermissionModal';
import EmptyState from './EmptyState';
import { PlusIcon, FINALIZED_SALE_STATUSES, InvestorIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber, setStoredItemAndDispatchEvent } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { hasAccess } from '../lib/permissions';

interface InvestorPageProps {
    users: User[];
    sales: Sale[];
    expenses: Expense[];
    products: Product[];
    t: (key: string) => string;
    receiptSettings: ReceiptSettingsData;
    currentUser: User | null;
    onSaveUser: (userData: Omit<User, 'id' | 'avatarUrl'>, isEditing: boolean, existingUserId?: string) => void;
    onDeleteUser: (userId: string) => void;
    businessSettings: BusinessSettingsData;
    businessProfile: any;
    permissions: AppPermissions;
}

const KPICard: React.FC<{ title: string; value: number; cs: string; colorClass?: string; subtext?: string }> = ({ title, value, cs, colorClass = "text-slate-900 dark:text-white", subtext }) => (
    <div 
        className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col justify-center font-sans h-full text-center cursor-help"
        title={formatCurrency(value, cs)}
    >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">{title}</p>
        <div className="flex items-center justify-center gap-1">
            <span className={`text-3xl font-black ${colorClass} tracking-tighter tabular-nums`}>
                {cs}{formatAbbreviatedNumber(value)}
            </span>
        </div>
        {subtext && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-4 uppercase tracking-widest leading-relaxed">{subtext}</p>}
    </div>
);

const InvestorPage: React.FC<InvestorPageProps> = ({ 
    users = [], 
    sales = [], 
    expenses = [], 
    t, 
    receiptSettings, 
    products = [], 
    currentUser, 
    onSaveUser, 
    onDeleteUser, 
    businessSettings, 
    businessProfile, 
    permissions 
}) => {
    const [period, setPeriod] = useState('this_month');
    const [auditUser, setAuditUser] = useState<PerformanceUser | null>(null);
    const [permissionEditingUser, setPermissionEditingUser] = useState<User | null>(null);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

    const cs = receiptSettings.currencySymbol;
    const navigate = useNavigate();

    const canManageRights = hasAccess(currentUser, 'SETTINGS', 'manage_permissions', permissions);
    
    const financialData = useMemo(() => {
        const participants = users.filter(u => u && (u.role === 'Investor' || u.role === 'Owner') && u.status === 'Active');
        const totalCapital = participants.reduce((sum, p) => sum + (p.initialInvestment || 0), 0);
        const realizedSales = sales.filter(s => s && FINALIZED_SALE_STATUSES.includes(s.status));
        const totalRevenue = realizedSales.reduce((s, x) => s + x.total, 0);

        return { totalCapital, participants, totalRevenue };
    }, [users, sales]);

    const handleOpenPermissionModal = (user: User) => {
        setPermissionEditingUser(user);
        setIsPermissionModalOpen(true);
    };

    const handleSavePermissions = (userId: string, userPermissions: UserPermissions, roleLabel: string) => {
        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                return { 
                    ...u, 
                    permissions: userPermissions, 
                    role_label: roleLabel, 
                    permissions_version: 1,
                    lastUpdated: new Date().toISOString()
                };
            }
            return u;
        });

        const bizId = localStorage.getItem('fintab_active_business_id');
        if (bizId) {
            setStoredItemAndDispatchEvent(`fintab_${bizId}_users`, updatedUsers);
        }
        
        setIsPermissionModalOpen(false);
        alert("Authorization Updated.");
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Partners</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Verified Equity Participation Grid</p>
                    </div>
                    
                    <div className="w-full md:w-auto grid grid-cols-2 md:flex gap-4">
                        <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 text-center min-w-[140px]">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Platform Pool</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{cs}{formatAbbreviatedNumber(financialData.totalCapital)}</p>
                        </div>
                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-center min-w-[140px]">
                            <p className="text-[8px] font-black text-primary uppercase tracking-widest">Gross Inflow</p>
                            <p className="text-lg font-black text-primary tabular-nums">{cs}{formatAbbreviatedNumber(financialData.totalRevenue)}</p>
                        </div>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {financialData.participants.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[700px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Participant Identity</th>
                                                <th scope="col" className="text-right">Capital Stake</th>
                                                <th scope="col" className="text-center">Pool Percentage (%)</th>
                                                <th scope="col" className="text-right">Audit Logic</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {financialData.participants.map(participant => (
                                                <tr key={participant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <img src={participant.avatarUrl} className="w-12 h-12 rounded-2xl object-cover border-4 border-white shadow-sm" />
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-sm">{participant.name}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{participant.role_label || participant.role}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="table-num text-slate-900 dark:text-white font-black text-base">
                                                        {cs}{formatAbbreviatedNumber(participant.initialInvestment || 0)}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="bg-primary/10 text-primary px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                            {financialData.totalCapital > 0 ? ((participant.initialInvestment / financialData.totalCapital) * 100).toFixed(2) : 0}%
                                                        </span>
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="flex justify-end gap-6">
                                                            <button onClick={() => setAuditUser(participant as PerformanceUser)} className="text-primary hover:underline font-black text-[10px] uppercase tracking-widest">Audit</button>
                                                            {canManageRights && (
                                                                <button onClick={() => handleOpenPermissionModal(participant)} className="text-emerald-600 hover:underline font-black text-[10px] uppercase tracking-widest">Rights</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="md:hidden space-y-4">
                                {financialData.participants.map(participant => (
                                    <div key={participant.id} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700">
                                        <div className="flex items-center gap-5 mb-5">
                                            <img src={participant.avatarUrl} className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-md" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base truncate">{participant.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{participant.role_label || participant.role}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 py-4 border-y dark:border-gray-700">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cap Stake</p>
                                                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{cs}{formatAbbreviatedNumber(participant.initialInvestment || 0)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Equity %</p>
                                                <p className="text-xl font-black text-primary tabular-nums">
                                                    {financialData.totalCapital > 0 ? ((participant.initialInvestment / financialData.totalCapital) * 100).toFixed(1) : 0}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-5">
                                            <button onClick={() => setAuditUser(participant as PerformanceUser)} className="py-3 bg-white dark:bg-gray-700 text-slate-900 dark:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm">Full Audit</button>
                                            <button onClick={() => handleOpenPermissionModal(participant)} className="py-3 bg-primary text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">Manage Rights</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyState 
                            icon={<InvestorIcon />} 
                            title="Capital Registry Clear" 
                            description="Zero partner identities detected in the current business node."
                            action={{ label: "Manage Personnel", onClick: () => navigate('/users') }}
                        />
                    )}
                </div>
            </div>

            {auditUser && (
                <UserDetailModal 
                    isOpen={!!auditUser} onClose={() => setAuditUser(null)} user={auditUser}
                    sales={sales} expenses={expenses} customers={[]} onClockInOut={() => {}}
                    currentUser={currentUser} receiptSettings={receiptSettings} businessProfile={businessProfile}
                />
            )}

            <UserPermissionModal 
                isOpen={isPermissionModalOpen} 
                onClose={() => setIsPermissionModalOpen(false)} 
                onSave={handleSavePermissions} 
                user={permissionEditingUser} 
            />
        </div>
    );
};

export default InvestorPage;
