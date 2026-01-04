
import React, { useState, useMemo, useCallback } from 'react';
import type { WeeklyInventoryCheck, Product, User, ReceiptSettingsData, AppPermissions, InventoryCheckItem, InventoryCheckStatus, BusinessSettingsData, BusinessProfile, CashCountSignature } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import ModalShell from './ModalShell';
import { WeeklyCheckIcon, PlusIcon, CloseIcon, WarningIcon, FilePdfIcon } from '../constants';
import FinanceReportModal from './FinanceReportModal';

interface WeeklyInventoryCheckProps {
    weeklyChecks: WeeklyInventoryCheck[];
    setWeeklyChecks: (update: any) => void;
    products: Product[];
    users: User[];
    currentUser: User;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
    businessProfile: BusinessProfile | null;
    permissions: AppPermissions;
    createNotification: (targetUserId: string, title: string, message: string, type: string, link: string) => void;
}

const WeeklyInventoryCheckPage: React.FC<WeeklyInventoryCheckProps> = ({ 
    weeklyChecks, setWeeklyChecks, products, users, currentUser, 
    receiptSettings, businessSettings, businessProfile, permissions, createNotification 
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [reportToShow, setReportToShow] = useState<WeeklyInventoryCheck | null>(null);

    const isOwnerOrAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin';
    // Fix: Access workflowRoles from businessSettings and handle potentially undefined state
    const workflowRoles = businessSettings?.workflowRoles || {};

    const canSubmitCheck = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        // Fix: Property 'stockManager' does not exist on type '{}'. Using optional chaining.
        return (workflowRoles?.stockManager || []).some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const canVerifyCheck = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        // Fix: Property 'stockVerifier' does not exist on type '{}'. Using optional chaining.
        return (workflowRoles?.stockVerifier || []).some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const canApproveCheck = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        // Fix: Property 'stockApprover' does not exist on type '{}'. Using optional chaining.
        return (workflowRoles?.stockApprover || []).some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const selectAuditItems = useCallback(() => {
        const count = businessSettings?.anomalies?.weeklyCheckCount || 5;
        if (!products || products.length === 0) return [];

        const highValue = [...products].sort((a, b) => (b.price * b.stock) - (a.price * a.stock)).slice(0, 2);
        const highMovement = [...products].sort((a, b) => (b.stockHistory?.length || 0) - (a.stockHistory?.length || 0)).slice(0, 2);

        const selectedIds = new Set([...highValue, ...highMovement].map(p => p.id));
        const pool = products.filter(p => !selectedIds.has(p.id));
        
        const randoms = [];
        const poolCopy = [...pool];
        while (selectedIds.size < count && poolCopy.length > 0) {
            const idx = Math.floor(Math.random() * poolCopy.length);
            const item = poolCopy.splice(idx, 1)[0];
            selectedIds.add(item.id);
            randoms.push(item);
        }

        const finalItems = products.filter(p => selectedIds.has(p.id));
        return finalItems.map(p => ({
            productId: p.id,
            productName: p.name,
            productNumber: p.id.slice(-8).toUpperCase(),
            systemQty: p.stock,
            physicalQty: null,
            difference: 0,
            notes: ''
        }));
    }, [products, businessSettings?.anomalies]);

    const [formItems, setFormItems] = useState<InventoryCheckItem[]>([]);

    const handleStartNewCheck = () => {
        if (!canSubmitCheck) {
            alert("Digital Protocol Error: Identity not authorized for 'Stock Manager' role.");
            return;
        }
        setFormItems(selectAuditItems());
        setIsAddModalOpen(true);
    };

    const handleItemChange = (idx: number, physicalQty: string) => {
        const newItems = [...formItems];
        const val = parseFloat(physicalQty);
        newItems[idx].physicalQty = isNaN(val) ? null : val;
        newItems[idx].difference = (newItems[idx].physicalQty || 0) - newItems[idx].systemQty;
        setFormItems(newItems);
    };

    const handleNoteChange = (idx: number, note: string) => {
        const newItems = [...formItems];
        newItems[idx].notes = note;
        setFormItems(newItems);
    };

    const handleSubmitCheck = () => {
        if (formItems.some(i => i.physicalQty === null)) {
            alert("Protocol Violation: All items must have a verified physical quantity entry.");
            return;
        }

        if (formItems.some(i => i.difference !== 0 && !i.notes.trim())) {
            alert("Protocol Violation: Audit remarks are mandatory for items with variances.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        const newCheck: WeeklyInventoryCheck = {
            id: `wic-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            items: formItems,
            status: 'checked',
            signatures: { manager: signature },
            auditLog: [{
                timestamp: signature.timestamp,
                status: 'checked',
                actorId: currentUser.id,
                actorName: currentUser.name,
                note: 'Weekly inventory verification submitted.'
            }]
        };

        setWeeklyChecks(prev => [newCheck, ...(prev || [])]);
        setIsAddModalOpen(false);

        // Fix: Property 'stockVerifier' does not exist on type '{}'. Using optional chaining.
        const verifiers = workflowRoles?.stockVerifier?.map(a => a.userId) || [];
        (users || []).filter(u => u && (verifiers.includes(u.id) || u.role === 'Owner')).forEach(u => 
            createNotification(u.id, "Stock Audit Verification Needed", `Weekly inventory check for ${newCheck.date} requires a second signature.`, "action_required", "/weekly-inventory-check")
        );
    };

    const handleSecondSign = (check: WeeklyInventoryCheck) => {
        if (!canVerifyCheck) return;
        if (businessSettings?.enforceUniqueSigners !== false && check.signatures?.manager?.userId === currentUser?.id) {
            alert("Dual-Signature Protocol: Self-verification is unauthorized.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        setWeeklyChecks(prev => (prev || []).map(c => c.id === check.id ? {
            ...c,
            status: 'verified',
            signatures: { ...c.signatures, verifier: signature },
            auditLog: [...(c.auditLog || []), {
                timestamp: signature.timestamp,
                status: 'verified',
                actorId: currentUser.id,
                actorName: currentUser.name,
                note: 'Dual-signature verification confirmed.'
            }]
        } : c));
    };

    const handleFinalAudit = (check: WeeklyInventoryCheck, status: 'accepted' | 'flagged') => {
        if (!canApproveCheck) return;

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        setWeeklyChecks(prev => (prev || []).map(c => c.id === check.id ? {
            ...c,
            status,
            signatures: { ...c.signatures, approver: signature },
            auditLog: [...(c.auditLog || []), {
                timestamp: signature.timestamp,
                status,
                actorId: currentUser.id,
                actorName: currentUser.name,
                note: `Final audit completed with status: ${status}.`
            }]
        } : c));
    };

    const getStatusBadge = (status: InventoryCheckStatus) => {
        const styles = {
            draft: 'status-draft',
            checked: 'status-pending animate-pulse',
            verified: 'status-warning',
            accepted: 'status-approved',
            flagged: 'status-rejected'
        };
        return <span className={`status-badge ${styles[status]}`}>{status.replace('_', ' ')}</span>;
    };

    const addModalFooter = (
        <>
            <button
                onClick={handleSubmitCheck}
                className="btn-base btn-primary flex-1 py-5"
            >
                Authorize Initial Signature
            </button>
            <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="btn-base btn-secondary px-10 py-5"
            >
                Abort Audit
            </button>
        </>
    );

    return (
        <div className="space-y-8 font-sans pb-24 lg:pb-8">
            <header className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Weekly Inventory Check</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Physical verification audit protocol</p>
                </div>
                <button
                    onClick={handleStartNewCheck}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Audit
                </button>
            </header>

            <Card title="Inventory Audit Ledger">
                <div className="overflow-x-auto -mx-6 px-6 min-h-[400px]">
                    {(weeklyChecks || []).length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                <tr>
                                    <th className="px-6 py-6 rounded-tl-3xl">Entry Date</th>
                                    <th className="px-6 py-6 text-center">Items</th>
                                    <th className="px-6 py-6 text-center">Variances</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                    <th className="px-6 py-6 text-center rounded-tr-3xl">Control Flow</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {weeklyChecks.map(check => {
                                    const varianceCount = (check.items || []).filter(i => i && i.difference !== 0).length;
                                    return (
                                        <tr key={check.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-6">
                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{check.date}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Ref: {check.id.slice(-6).toUpperCase()}</p>
                                            </td>
                                            <td className="px-6 py-6 text-center font-bold text-slate-500">{check.items?.length || 0}</td>
                                            <td className="px-6 py-6 text-center">
                                                <span className={`font-black ${varianceCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {varianceCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                {getStatusBadge(check.status)}
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col items-center gap-3">
                                                    {check.status === 'checked' && check.signatures?.manager?.userId !== currentUser?.id && (
                                                        <button 
                                                            onClick={() => handleSecondSign(check)}
                                                            className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-30"
                                                            disabled={!canVerifyCheck}
                                                        >
                                                            Dual-Sign Verification
                                                        </button>
                                                    )}
                                                    {check.status === 'verified' && canApproveCheck && (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleFinalAudit(check, 'accepted')} className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Accept</button>
                                                            <button onClick={() => handleFinalAudit(check, 'flagged')} className="px-5 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Flag</button>
                                                        </div>
                                                    )}
                                                    {(check.status === 'accepted' || check.status === 'flagged') && (
                                                        <button onClick={() => setReportToShow(check)} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 group"
                                                    >
                                                        <FilePdfIcon className="w-5 h-5" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block animate-fade-in">Report PDF</span>
                                                    </button>
                                                )}
                                                <div className="flex gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                                                    <span>M: {check.signatures?.manager?.userName?.split(' ')[0] || '---'}</span>
                                                    <span>|</span>
                                                    <span>V: {check.signatures?.verifier?.userName?.split(' ')[0] || '---'}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <EmptyState 
                        icon={<WeeklyCheckIcon />} 
                        title="Audit Ledger Clear" 
                        description="No weekly inventory verification records found."
                        action={{ label: "Initiate Audit", onClick: handleStartNewCheck }}
                    />
                )}
            </div>
        </Card>

        <ModalShell
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            title="New Weekly Audit"
            description="Internal verification protocol"
            footer={addModalFooter}
            maxWidth="max-w-4xl"
        >
            <div className="space-y-8">
                <div className="bg-slate-50 dark:bg-gray-900/50 p-6 rounded-[2.5rem] border dark:border-gray-800 flex items-start gap-4">
                    <WarningIcon className="w-6 h-6 text-amber-500 mt-1" />
                    <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Protocol Notice</p>
                        <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">
                            This process is an informational audit only. Quantities entered here do not adjust the master inventory. Discrepancies must be resolved via standard stock adjustment workflows.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {(formItems || []).map((item, idx) => (
                        <div key={item.productId} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product: {item.productNumber}</p>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{item.productName}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Quantum</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{item.systemQty}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Physical Count</label>
                                    <input 
                                        type="number" 
                                        value={item.physicalQty === null ? '' : item.physicalQty} 
                                        onChange={e => handleItemChange(idx, e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xl font-black tabular-nums focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Variance</p>
                                    <p className={`text-2xl font-black tabular-nums ${item.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {item.difference > 0 ? '+' : ''}{item.difference}
                                    </p>
                                </div>
                                <div>
                                    <label className={`text-[9px] font-bold uppercase tracking-widest px-1 mb-2 block ${item.difference !== 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        Audit Remarks {item.difference !== 0 && '*'}
                                    </label>
                                    <textarea 
                                        value={item.notes}
                                        onChange={e => handleNoteChange(idx, e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                        placeholder="Explain discrepancy..."
                                        rows={1}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ModalShell>

        {reportToShow && (
            <FinanceReportModal 
                isOpen={!!reportToShow}
                onClose={() => setReportToShow(null)}
                record={reportToShow}
                type="inventory_audit"
                businessProfile={businessProfile}
                receiptSettings={receiptSettings}
            />
        )}
    </div>
);
};

export default WeeklyInventoryCheckPage;
