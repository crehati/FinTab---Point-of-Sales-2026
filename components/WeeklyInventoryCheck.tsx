
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
    t: (key: string) => string;
}

const WeeklyInventoryCheckPage: React.FC<WeeklyInventoryCheckProps> = ({ 
    weeklyChecks, setWeeklyChecks, products, users, currentUser, 
    receiptSettings, businessSettings, businessProfile, permissions, createNotification, t
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [reportToShow, setReportToShow] = useState<WeeklyInventoryCheck | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const isOwnerOrAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin';
    const workflowRoles = businessSettings?.workflowRoles || {};

    const canSubmitCheck = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        return (workflowRoles?.stockManager || []).some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const canVerifyCheck = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        return (workflowRoles?.stockVerifier || []).some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const canApproveCheck = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        return (workflowRoles?.stockApprover || []).some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const totalPages = Math.ceil((weeklyChecks || []).length / itemsPerPage);
    const paginatedChecks = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return (weeklyChecks || []).slice(start, start + itemsPerPage);
    }, [weeklyChecks, currentPage]);

    const selectAuditItems = useCallback(() => {
        const count = businessSettings?.anomalies?.weeklyCheckCount || 5;
        if (!products || products.length === 0) return [];
        const highValue = [...products].sort((a, b) => (b.price * b.stock) - (a.price * a.stock)).slice(0, 2);
        const highMovement = [...products].sort((a, b) => (b.stockHistory?.length || 0) - (a.stockHistory?.length || 0)).slice(0, 2);
        const selectedIds = new Set([...highValue, ...highMovement].map(p => p.id));
        const poolCopy = products.filter(p => !selectedIds.has(p.id));
        while (selectedIds.size < count && poolCopy.length > 0) {
            const idx = Math.floor(Math.random() * poolCopy.length);
            const item = poolCopy.splice(idx, 1)[0];
            selectedIds.add(item.id);
        }
        return products.filter(p => selectedIds.has(p.id)).map(p => ({
            productId: p.id, productName: p.name, productNumber: p.id.slice(-8).toUpperCase(),
            systemQty: p.stock, physicalQty: null, difference: 0, notes: ''
        }));
    }, [products, businessSettings?.anomalies]);

    const [formItems, setFormItems] = useState<InventoryCheckItem[]>([]);

    const handleStartNewCheck = () => {
        if (!canSubmitCheck) return;
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

    const handleSubmitCheck = () => {
        if (formItems.some(i => i.physicalQty === null)) return;
        const signature: CashCountSignature = { userId: currentUser.id, userName: currentUser.name, role: currentUser.role, timestamp: new Date().toISOString() };
        const newCheck: WeeklyInventoryCheck = { id: `wic-${Date.now()}`, date: new Date().toISOString().split('T')[0], items: formItems, status: 'checked', signatures: { manager: signature }, auditLog: [{ timestamp: signature.timestamp, status: 'checked', actorId: currentUser.id, actorName: currentUser.name, note: 'Physical verification submitted.' }] };
        setWeeklyChecks(prev => [newCheck, ...(prev || [])]);
        setIsAddModalOpen(false);
        setCurrentPage(1);
    };

    const handleSecondSign = (check: WeeklyInventoryCheck) => {
        if (!canVerifyCheck || (businessSettings?.enforceUniqueSigners !== false && check.signatures?.manager?.userId === currentUser?.id)) return;
        const signature: CashCountSignature = { userId: currentUser.id, userName: currentUser.name, role: currentUser.role, timestamp: new Date().toISOString() };
        setWeeklyChecks(prev => (prev || []).map(c => c.id === check.id ? { ...c, status: 'verified', signatures: { ...c.signatures, verifier: signature }, auditLog: [...(c.auditLog || []), { timestamp: signature.timestamp, status: 'verified', actorId: currentUser.id, actorName: currentUser.name, note: 'Secondary signature applied.' }] } : c));
    };

    const handleFinalAudit = (check: WeeklyInventoryCheck, status: 'accepted' | 'flagged') => {
        if (!canApproveCheck) return;
        const signature: CashCountSignature = { userId: currentUser.id, userName: currentUser.name, role: currentUser.role, timestamp: new Date().toISOString() };
        setWeeklyChecks(prev => (prev || []).map(c => c.id === check.id ? { ...c, status, signatures: { ...c.signatures, approver: signature }, auditLog: [...(c.auditLog || []), { timestamp: signature.timestamp, status, actorId: currentUser.id, actorName: currentUser.name, note: `Audit concluded as ${status}.` }] } : c));
    };

    const getStatusBadge = (status: InventoryCheckStatus) => {
        const styles = { checked: 'status-pending animate-pulse', verified: 'status-warning', accepted: 'status-approved', flagged: 'status-rejected' };
        return <span className={`status-badge ${styles[status]}`}>{status.replace('_', ' ')}</span>;
    };

    const addModalFooter = (<><button onClick={handleSubmitCheck} className="btn-base btn-primary flex-1 py-5">{t('authorize')}</button><button onClick={() => setIsAddModalOpen(false)} className="btn-base btn-secondary px-10 py-5">{t('cancel')}</button></>);

    return (
        <div className="space-y-8 font-sans pb-24 lg:pb-8">
            <header className="flex justify-between items-end px-2">
                <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{t('weeklyCheck')}</h1><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('weeklySub')}</p></div>
                <button onClick={handleStartNewCheck} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all flex items-center gap-2"><PlusIcon className="w-4 h-4" />{t('add')}</button>
            </header>
            <Card title={t('audit')}>
                <div className="overflow-x-auto -mx-6 px-6 min-h-[400px]">
                    {(weeklyChecks || []).length > 0 ? (<>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400"><tr><th className="px-6 py-6 rounded-tl-3xl">{t('date')}</th><th className="px-6 py-6 text-center">{t('itemsChecked')}</th><th className="px-6 py-6 text-center">{t('variances')}</th><th className="px-6 py-6 text-center">{t('status')}</th><th className="px-6 py-6 text-center rounded-tr-3xl">{t('controlFlow')}</th></tr></thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {paginatedChecks.map(check => (
                                    <tr key={check.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors"><td className="px-6 py-6 font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{check.date}</td><td className="px-6 py-6 text-center font-bold text-slate-500">{check.items?.length || 0}</td><td className="px-6 py-6 text-center font-black text-rose-500">{(check.items || []).filter(i => i.difference !== 0).length}</td><td className="px-6 py-6 text-center">{getStatusBadge(check.status)}</td><td className="px-6 py-6">
                                        <div className="flex flex-col items-center gap-3">
                                            {check.status === 'checked' && check.signatures?.manager?.userId !== currentUser?.id && (<button onClick={() => handleSecondSign(check)} className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg" disabled={!canVerifyCheck}>{t('dualSign')}</button>)}
                                            {check.status === 'verified' && canApproveCheck && (<div className="flex gap-2"><button onClick={() => handleFinalAudit(check, 'accepted')} className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{t('accept')}</button><button onClick={() => handleFinalAudit(check, 'flagged')} className="px-5 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{t('reject')}</button></div>)}
                                            {(check.status === 'accepted' || check.status === 'flagged') && (<button onClick={() => setReportToShow(check)} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 group"><FilePdfIcon className="w-5 h-5" /><span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block animate-fade-in">{t('auditCert')}</span></button>)}
                                        </div>
                                    </td></tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && (<div className="mt-8 flex justify-center items-center gap-2"><button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">{t('prev')}</button><div className="flex gap-1">{Array.from({ length: totalPages }).map((_, i) => (<button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 dark:bg-gray-800 text-slate-400'}`}>{i + 1}</button>))}</div><button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30">{t('next')}</button></div>)}
                    </>) : (<EmptyState icon={<WeeklyCheckIcon />} title={t('loading')} description={t('weeklySub')} action={{ label: t('authorize'), onClick: handleStartNewCheck }} />)}
                </div>
            </Card>
            <ModalShell isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('weeklyCheck')} description={t('weeklySub')} footer={addModalFooter} maxWidth="max-w-4xl">
                <div className="space-y-8"><div className="bg-slate-50 dark:bg-gray-900/50 p-6 rounded-[2.5rem] border dark:border-gray-800 flex items-start gap-4"><WarningIcon className="w-6 h-6 text-amber-500 mt-1" /><div><p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t('protocolNotice')}</p><p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">{t('protocolNoticeSub')}</p></div></div><div className="space-y-6">{(formItems || []).map((item, idx) => (<div key={item.productId} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-sm space-y-4"><div className="flex justify-between items-start"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.productNumber}</p><h4 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{item.productName}</h4></div><div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('systemQuantum')}</p><p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{item.systemQty}</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end"><div><label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">{t('physicalCount')}</label><input type="number" value={item.physicalQty === null ? '' : item.physicalQty} onChange={e => handleItemChange(idx, e.target.value)} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xl font-black tabular-nums outline-none" placeholder="0" /></div><div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-900 rounded-2xl border dark:border-gray-800"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('netVariance')}</p><p className={`text-2xl font-black tabular-nums ${item.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{item.difference > 0 ? '+' : ''}{item.difference}</p></div><div><label className={`text-[9px] font-bold uppercase tracking-widest px-1 mb-2 block ${item.difference !== 0 ? 'text-rose-500' : 'text-slate-400'}`}>{t('notes')} {item.difference !== 0 && '*'}</label><textarea value={item.notes} onChange={e => setFormItems(prev => { const n = [...prev]; n[idx].notes = e.target.value; return n; })} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs font-medium outline-none" placeholder="..." rows={1} /></div></div></div>))}</div></div>
            </ModalShell>
            {reportToShow && (<FinanceReportModal isOpen={!!reportToShow} onClose={() => setReportToShow(null)} record={reportToShow} type="inventory_audit" businessProfile={businessProfile} receiptSettings={receiptSettings} />)}
        </div>
    );
};

export default WeeklyInventoryCheckPage;
