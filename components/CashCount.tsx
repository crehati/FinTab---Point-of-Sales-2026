
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { CashCount, User, Sale, ReceiptSettingsData, AppPermissions, CashCountSignature, CashCountStatus, BusinessSettingsData, BusinessProfile } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import ConfirmationModal from './ConfirmationModal';
import FinanceReportModal from './FinanceReportModal';
import ModalShell from './ModalShell';
import { CalculatorIcon, WarningIcon, PlusIcon, CloseIcon, FilePdfIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';
import { hasAccess } from '../lib/permissions';

interface CashCountProps {
    cashCounts: CashCount[];
    setCashCounts: (update: any) => void;
    users: User[];
    sales: Sale[];
    currentUser: User;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
    businessProfile: BusinessProfile | null;
    permissions: AppPermissions;
    createNotification: (targetUserId: string, title: string, message: string, type: string, link: string) => void;
}

const CashCountPage: React.FC<CashCountProps> = ({ cashCounts, setCashCounts, users, sales, currentUser, receiptSettings, permissions, createNotification, businessSettings, businessProfile }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [reportToShow, setReportToShow] = useState<CashCount | null>(null);

    const cs = receiptSettings.currencySymbol;
    const isOwnerOrAdmin = currentUser.role === 'Owner' || currentUser.role === 'Super Admin';

    const workflowRoles = businessSettings?.workflowRoles || {};

    const canSubmitCount = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.cashCounter || [];
        return assigned.some(a => a.userId === currentUser.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser.id]);

    const canVerifyCount = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.cashVerifier || [];
        return assigned.some(a => a.userId === currentUser.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser.id]);

    const canApproveCount = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.cashApprover || [];
        return assigned.some(a => a.userId === currentUser.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser.id]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        countedTotal: '',
        notes: ''
    });

    const calculatedSystemTotal = useMemo(() => {
        return (sales || [])
            .filter(s => s && s.status === 'completed' && s.paymentMethod === 'Cash' && s.date && s.date.startsWith(formData.date))
            .reduce((sum, s) => sum + s.total, 0);
    }, [sales, formData.date]);

    const difference = useMemo(() => {
        const counted = parseFloat(formData.countedTotal) || 0;
        return counted - calculatedSystemTotal;
    }, [formData.countedTotal, calculatedSystemTotal]);

    const handleCreateCount = () => {
        if (!canSubmitCount) {
            alert("Digital Protocol Error: Identity not authorized for 'Cash Counter' role.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        const newCount: CashCount = {
            id: `cc-${Date.now()}`,
            date: formData.date,
            systemTotal: calculatedSystemTotal,
            countedTotal: parseFloat(formData.countedTotal) || 0,
            difference,
            status: 'first_signed',
            notes: formData.notes,
            signatures: { first: signature },
            auditLog: [{
                timestamp: signature.timestamp,
                status: 'first_signed',
                actorId: currentUser.id,
                actorName: currentUser.name,
                note: 'Initial count submitted.'
            }]
        };

        setCashCounts(prev => [newCount, ...(prev || [])]);
        setIsAddModalOpen(false);
        setFormData({ date: new Date().toISOString().split('T')[0], countedTotal: '', notes: '' });

        // Notify verifiers
        const verifiers = workflowRoles?.cashVerifier?.map(a => a.userId) || [];
        (users || []).filter(u => u && u.id !== currentUser.id && (verifiers.includes(u.id) || u.role === 'Owner'))
            .forEach(u => createNotification(u.id, "Cash Verification Required", `A new cash count for ${newCount.date} requires a second signature.`, "action_required", "/cash-count"));
    };

    const handleSecondSign = (count: CashCount) => {
        if (!canVerifyCount) {
            alert("Digital Protocol Error: Identity not authorized for 'Cash Verifier' role.");
            return;
        }

        if (businessSettings?.enforceUniqueSigners !== false && count.signatures.first?.userId === currentUser.id) {
            alert("Dual-Signature Protocol: You cannot perform the second verification on your own submission. Please wait for an authorized verifier.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        const update = (prev: CashCount[]) => (prev || []).map(c => {
            if (c.id === count.id) {
                return {
                    ...c,
                    status: 'second_signed' as CashCountStatus,
                    signatures: { ...c.signatures, second: signature },
                    auditLog: [...(c.auditLog || []), {
                        timestamp: signature.timestamp,
                        status: 'second_signed',
                        actorId: currentUser.id,
                        actorName: currentUser.name,
                        note: 'Second signature verified.'
                    }]
                };
            }
            return c;
        });

        setCashCounts(update);

        // Notify Approvers
        const approvers = workflowRoles?.cashApprover?.map(a => a.userId) || [];
        (users || []).filter(u => u && (approvers.includes(u.id) || u.role === 'Owner')).forEach(o => 
            createNotification(o.id, "Cash Count Ready for Acceptance", `The count for ${count.date} has dual signatures and is ready for final audit.`, "info", "/cash-count")
        );
    };

    const handleOwnerAudit = (count: CashCount, status: 'accepted' | 'rejected') => {
        if (!canApproveCount) {
            alert("Digital Protocol Error: Identity not authorized for 'Cash Approver' role.");
            return;
        }

        const update = (prev: CashCount[]) => (prev || []).map(c => {
            if (c.id === count.id) {
                return {
                    ...c,
                    status,
                    ownerAudit: {
                        userId: currentUser.id,
                        userName: currentUser.name,
                        timestamp: new Date().toISOString(),
                        status
                    },
                    auditLog: [...(c.auditLog || []), {
                        timestamp: new Date().toISOString(),
                        status,
                        actorId: currentUser.id,
                        actorName: currentUser.name,
                        note: `Approver finalized as ${status}.`
                    }]
                };
            }
            return c;
        });

        setCashCounts(update);
    };

    const getStatusBadge = (status: CashCountStatus) => {
        const styles = {
            draft: 'status-draft',
            first_signed: 'status-pending animate-pulse',
            second_signed: 'status-warning',
            accepted: 'status-approved',
            rejected: 'status-rejected'
        };
        return <span className={`status-badge ${styles[status]}`}>{status.replace('_', ' ')}</span>;
    };

    const addModalFooter = (
        <>
            <button
                onClick={handleCreateCount}
                disabled={!formData.countedTotal || !canSubmitCount}
                className="btn-base btn-primary flex-1 py-4"
            >
                Authorize Initial Signature
            </button>
            <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="btn-base btn-secondary px-8 py-4"
            >
                Abort
            </button>
        </>
    );

    return (
        <div className="space-y-8 font-sans pb-24 lg:pb-8">
            <header className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Cash Verification</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dual-signature integrity protocol</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Count
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 shadow-sm flex items-center gap-6">
                    <div className="bg-primary/10 text-primary p-4 rounded-2xl">
                        <CalculatorIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Verification</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tighter">
                            {(cashCounts || []).filter(c => c && (c.status === 'first_signed' || c.status === 'second_signed')).length}
                        </p>
                    </div>
                </div>
            </div>

            <Card title="Cash Audit Ledger">
                <div className="overflow-x-auto -mx-6 px-6 min-h-[400px]">
                    {(cashCounts || []).length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                <tr>
                                    <th className="px-6 py-6 rounded-tl-3xl">Entry Date</th>
                                    <th className="px-6 py-6">System Total</th>
                                    <th className="px-6 py-6">Counted</th>
                                    <th className="px-6 py-6 text-center">Variance</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                    <th className="px-6 py-6 text-center rounded-tr-3xl">Protocols</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {cashCounts.map(count => (
                                    <tr key={count.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-6">
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{count.date}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Ref: {count.id.slice(-6).toUpperCase()}</p>
                                        </td>
                                        <td className="px-6 py-6 font-bold text-slate-500 tabular-nums">{cs}{count.systemTotal.toFixed(2)}</td>
                                        <td className="px-6 py-6 font-black text-slate-900 dark:text-white tabular-nums">{cs}{count.countedTotal.toFixed(2)}</td>
                                        <td className="px-6 py-6 text-center">
                                            <span className={`font-black tabular-nums ${count.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {count.difference > 0 ? '+' : ''}{cs}{count.difference.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            {getStatusBadge(count.status)}
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col items-center gap-3">
                                                {count.status === 'first_signed' && count.signatures?.first?.userId !== currentUser?.id && (
                                                    <button 
                                                        onClick={() => handleSecondSign(count)}
                                                        className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all disabled:opacity-30"
                                                        disabled={!canVerifyCount}
                                                    >
                                                        Verify Second Signature
                                                    </button>
                                                )}
                                                {count.status === 'second_signed' && canApproveCount && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleOwnerAudit(count, 'accepted')}
                                                            className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleOwnerAudit(count, 'rejected')}
                                                            className="px-5 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {count.status === 'accepted' && (
                                                    <button 
                                                        onClick={() => setReportToShow(count)}
                                                        className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 group"
                                                    >
                                                        <FilePdfIcon className="w-5 h-5" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block animate-fade-in">Report PDF</span>
                                                    </button>
                                                )}
                                                <div className="flex gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>Sign 1: {count.signatures?.first?.userName?.split(' ')[0] || '---'}</span>
                                                    <span>|</span>
                                                    <span>Sign 2: {count.signatures?.second?.userName?.split(' ')[0] || '---'}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState 
                            icon={<CalculatorIcon />} 
                            title="Ledger Clean" 
                            description="No cash verification records found in the current period."
                            action={{ label: "Initiate Count", onClick: () => setIsAddModalOpen(true) }}
                        />
                    )}
                </div>
            </Card>

            <ModalShell
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="New Cash Count"
                description="Internal verification protocol"
                footer={addModalFooter}
                maxWidth="max-w-lg"
            >
                <div className="space-y-6">
                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Protocol Date</label>
                        <input 
                            type="date" 
                            value={formData.date} 
                            onChange={e => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Verified Cash</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{cs}{calculatedSystemTotal.toFixed(2)}</p>
                    </div>

                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Physical Hand Count ({cs})</label>
                        <input 
                            type="number" 
                            value={formData.countedTotal}
                            onChange={e => setFormData({...formData, countedTotal: e.target.value})}
                            placeholder="0.00"
                            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-6 text-3xl font-black focus:ring-4 focus:ring-primary/10 transition-all outline-none tabular-nums"
                            autoFocus
                        />
                    </div>

                    <div className={`p-6 rounded-[2rem] border transition-all ${difference === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Variance Audit</p>
                        <p className="text-xl font-black tabular-nums">
                            {difference > 0 ? 'Over: +' : difference < 0 ? 'Short: ' : 'Matched: '}{cs}{Math.abs(difference).toFixed(2)}
                        </p>
                    </div>

                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Audit Memo (Optional)</label>
                        <textarea 
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            placeholder="Add context to variance..."
                            rows={2}
                        />
                    </div>
                </div>
            </ModalShell>

            {reportToShow && (
                <FinanceReportModal 
                    isOpen={!!reportToShow}
                    onClose={() => setReportToShow(null)}
                    record={reportToShow}
                    type="cash"
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}
        </div>
    );
};

export default CashCountPage;
