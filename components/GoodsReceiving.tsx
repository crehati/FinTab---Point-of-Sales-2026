
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { GoodsReceiving, User, Product, ReceiptSettingsData, AppPermissions, CashCountSignature, BusinessSettingsData, BusinessProfile } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import FinanceReportModal from './FinanceReportModal';
import ModalShell from './ModalShell';
import { TruckIcon, PlusIcon, CloseIcon, WarningIcon, FilePdfIcon } from '../constants';
import { hasAccess } from '../lib/permissions';

interface GoodsReceivingProps {
    goodsReceivings: GoodsReceiving[];
    setGoodsReceivings: (update: any) => void;
    products: Product[];
    setProducts: (products: Product[]) => void;
    users: User[];
    currentUser: User;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
    businessProfile: BusinessProfile | null;
    permissions: AppPermissions;
    createNotification: (targetUserId: string, title: string, message: string, type: string, link: string) => void;
}

const GoodsReceivingPage: React.FC<GoodsReceivingProps> = ({ 
    goodsReceivings, setGoodsReceivings, products, setProducts, 
    users, currentUser, receiptSettings, permissions, createNotification, businessSettings, businessProfile
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [reportToShow, setReportToShow] = useState<GoodsReceiving | null>(null);

    const isOwnerOrAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin';
    const workflowRoles = businessSettings?.workflowRoles || {};

    const canSubmitReceiving = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.receivingClerk || [];
        return assigned.some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const canVerifyReceiving = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.receivingVerifier || [];
        return assigned.some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const canApproveReceiving = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.receivingApprover || [];
        return assigned.some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const [formData, setFormData] = useState({
        refNumber: '',
        productNumber: '',
        productName: '',
        expectedQty: '',
        receivedQty: '',
        notes: '',
        linkedProductId: ''
    });

    const difference = useMemo(() => {
        const expected = parseFloat(formData.expectedQty) || 0;
        const received = parseFloat(formData.receivedQty) || 0;
        return received - expected;
    }, [formData.expectedQty, formData.receivedQty]);

    const handleLinkProduct = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pId = e.target.value;
        const product = (products || []).find(p => p && p.id === pId);
        if (product) {
            setFormData(prev => ({
                ...prev,
                linkedProductId: pId,
                productName: product.name,
                productNumber: product.id.slice(-8).toUpperCase()
            }));
        } else {
            setFormData(prev => ({ ...prev, linkedProductId: '', productName: '', productNumber: '' }));
        }
    };

    const handleCreateReceiving = () => {
        if (!canSubmitReceiving) {
            alert("Digital Protocol Error: Identity not authorized for 'Receiving Clerk' role.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        const newEntry: GoodsReceiving = {
            id: `rec-${Date.now()}`,
            date: new Date().toISOString(),
            refNumber: formData.refNumber,
            productNumber: formData.productNumber,
            productName: formData.productName,
            expectedQty: parseFloat(formData.expectedQty) || 0,
            receivedQty: parseFloat(formData.receivedQty) || 0,
            difference,
            status: 'first_signed',
            notes: formData.notes,
            signatures: { first: signature },
            linkedProductId: formData.linkedProductId || undefined,
            auditLog: [{
                timestamp: signature.timestamp,
                status: 'first_signed',
                actorId: currentUser.id,
                actorName: currentUser.name,
                note: 'Initial quantity verification submitted.'
            }]
        };

        setGoodsReceivings(prev => [newEntry, ...(prev || [])]);
        setIsAddModalOpen(false);
        setFormData({ refNumber: '', productNumber: '', productName: '', expectedQty: '', receivedQty: '', notes: '', linkedProductId: '' });

        // Notify verifiers
        const verifiers = workflowRoles?.receivingVerifier?.map(a => a.userId) || [];
        (users || []).filter(u => u && u.id !== currentUser.id && (verifiers.includes(u.id) || u.role === 'Owner'))
            .forEach(u => createNotification(u.id, "Receiving Verification Required", `A shipment for ${newEntry.productName} requires dual sign-off.`, "action_required", "/goods-receiving"));
    };

    const handleSecondSign = (entry: GoodsReceiving) => {
        if (!canVerifyReceiving) {
            alert("Digital Protocol Error: Identity not authorized for 'Receiving Verifier' role.");
            return;
        }

        if (businessSettings?.enforceUniqueSigners !== false && entry.signatures?.first?.userId === currentUser?.id) {
            alert("Dual-Signature Protocol: You cannot perform the second verification on your own submission. Please wait for an authorized verifier.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        setGoodsReceivings(prev => (prev || []).map(e => {
            if (e.id === entry.id) {
                return {
                    ...e,
                    status: 'second_signed',
                    signatures: { ...e.signatures, second: signature },
                    auditLog: [...(e.auditLog || []), {
                        timestamp: signature.timestamp,
                        status: 'second_signed',
                        actorId: currentUser.id,
                        actorName: currentUser.name,
                        note: 'Second verification signature confirmed.'
                    }]
                };
            }
            return e;
        }));

        // Notify Approvers
        const approvers = workflowRoles?.receivingApprover?.map(a => a.userId) || [];
        (users || []).filter(u => u && (approvers.includes(u.id) || u.role === 'Owner')).forEach(o => 
            createNotification(o.id, "Shipment Ready for Acceptance", `Verified receiving record for ${entry.productName} is awaiting final audit.`, "info", "/goods-receiving")
        );
    };

    const handleOwnerAudit = (entry: GoodsReceiving, status: 'accepted' | 'rejected') => {
        if (!canApproveReceiving) {
            alert("Digital Protocol Error: Identity not authorized for 'Receiving Approver' role.");
            return;
        }

        setGoodsReceivings(prev => (prev || []).map(e => {
            if (e.id === entry.id) {
                return {
                    ...e,
                    status,
                    ownerAudit: {
                        userId: currentUser.id,
                        userName: currentUser.name,
                        timestamp: new Date().toISOString(),
                        status
                    },
                    auditLog: [...(e.auditLog || []), {
                        timestamp: new Date().toISOString(),
                        status,
                        actorId: currentUser.id,
                        actorName: currentUser.name,
                        note: `Approver finalized status as ${status}.`
                    }]
                };
            }
            return e;
        }));

        if (status === 'accepted' && entry.linkedProductId) {
            const updatedProducts = (products || []).map(p => {
                if (p && p.id === entry.linkedProductId) {
                    const newStock = (p.stock || 0) + entry.receivedQty;
                    return {
                        ...p,
                        stock: newStock,
                        stockHistory: [{
                            date: new Date().toISOString(),
                            userId: currentUser.id,
                            type: 'add',
                            quantity: entry.receivedQty,
                            reason: `Verified Goods Receiving (Ref: ${entry.refNumber})`,
                            newStockLevel: newStock
                        }, ...(p.stockHistory || [])]
                    };
                }
                return p;
            });
            setProducts(updatedProducts);
        }
    };

    const getStatusBadge = (status: string) => {
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
                onClick={handleCreateReceiving}
                disabled={!formData.refNumber || !formData.expectedQty || !formData.receivedQty || !canSubmitReceiving}
                className="btn-base btn-primary flex-1 py-5"
            >
                Authorize Initial Entry (Step 1)
            </button>
            <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="btn-base btn-secondary px-10 py-5"
            >
                Abort Arrival
            </button>
        </>
    );

    return (
        <div className="space-y-8 font-sans pb-24 lg:pb-8">
            <header className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Goods Receiving</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">3-Step Verification Protocol (Entry → Verify → Approve)</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Arrival
                </button>
            </header>

            <Card title="Receiving Audit Ledger">
                <div className="overflow-x-auto -mx-6 px-6 min-h-[400px]">
                    {(goodsReceivings || []).length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                <tr>
                                    <th className="px-6 py-6 rounded-tl-3xl">Entry Date</th>
                                    <th className="px-6 py-6">Ref / Product</th>
                                    <th className="px-6 py-6 text-center">Expected</th>
                                    <th className="px-6 py-6 text-center">Received</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                    <th className="px-6 py-6 text-center rounded-tr-3xl">Workflow Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {goodsReceivings.map(entry => (
                                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-6 font-bold text-slate-500 uppercase tabular-nums">{new Date(entry.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-6">
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter truncate max-w-[150px]">{entry.productName}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Ref: {entry.refNumber}</p>
                                        </td>
                                        <td className="px-6 py-6 text-center font-bold text-slate-400 tabular-nums">{entry.expectedQty}</td>
                                        <td className="px-6 py-6 text-center font-black text-slate-900 dark:text-white tabular-nums text-lg">{entry.receivedQty}</td>
                                        <td className="px-6 py-6 text-center">
                                            {getStatusBadge(entry.status)}
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col items-center gap-3">
                                                {entry.status === 'first_signed' && entry.signatures?.first?.userId !== currentUser?.id && (
                                                    <button 
                                                        onClick={() => handleSecondSign(entry)}
                                                        className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all disabled:opacity-30"
                                                        disabled={!canVerifyReceiving}
                                                    >
                                                        Sign Verification (Step 2)
                                                    </button>
                                                )}
                                                {entry.status === 'second_signed' && canApproveReceiving && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleOwnerAudit(entry, 'accepted')}
                                                            className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all"
                                                        >
                                                            Final Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleOwnerAudit(entry, 'rejected')}
                                                            className="px-5 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all"
                                                        >
                                                            Flag Error
                                                        </button>
                                                    </div>
                                                )}
                                                {(entry.status === 'accepted' || entry.status === 'rejected') && (
                                                    <button 
                                                        onClick={() => setReportToShow(entry)}
                                                        className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 group"
                                                    >
                                                        <FilePdfIcon className="w-5 h-5" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block animate-fade-in">Report PDF</span>
                                                    </button>
                                                )}
                                                <div className="flex gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span className={entry.signatures?.first ? 'text-emerald-500' : ''}>1. Clerk</span>
                                                    <span>|</span>
                                                    <span className={entry.signatures?.second ? 'text-emerald-500' : ''}>2. Verify</span>
                                                    <span>|</span>
                                                    <span className={entry.status === 'accepted' ? 'text-emerald-500' : ''}>3. Approve</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState 
                            icon={<TruckIcon />} 
                            title="Ledger Clean" 
                            description="No inventory arrival records found."
                            action={{ label: "Log Arrival", onClick: () => setIsAddModalOpen(true) }}
                        />
                    )}
                </div>
            </Card>

            <ModalShell
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="New Goods Receiving"
                description="3-Step protocol initialized"
                footer={addModalFooter}
                maxWidth="max-w-lg"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Link Existing Product</label>
                            <select 
                                value={formData.linkedProductId} 
                                onChange={handleLinkProduct}
                                className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold outline-none"
                            >
                                <option value="">Manual Entry...</option>
                                {(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Ref Number *</label>
                                <input type="text" value={formData.refNumber} onChange={e => setFormData({...formData, refNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none" placeholder="RECV-XXXX" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Product Identifier</label>
                                <input type="text" value={formData.productNumber} onChange={e => setFormData({...formData, productNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none" placeholder="SKU-XXXX" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Product Display Name</label>
                            <input type="text" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none" placeholder="Enter name..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Expected Qty *</label>
                                <input type="number" value={formData.expectedQty} onChange={e => setFormData({...formData, expectedQty: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none tabular-nums" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Received Qty *</label>
                                <input type="number" value={formData.receivedQty} onChange={e => setFormData({...formData, receivedQty: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none tabular-nums" placeholder="0" />
                            </div>
                        </div>

                        <div className={`p-6 rounded-[2rem] border transition-all ${difference === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Arrival Variance</p>
                            <p className="text-xl font-black tabular-nums">
                                {difference > 0 ? 'Over: +' : difference < 0 ? 'Short: ' : 'Perfect Match: '}{Math.abs(difference)} units
                            </p>
                        </div>
                    </div>
                </div>
            </ModalShell>

            {reportToShow && (
                <FinanceReportModal 
                    isOpen={!!reportToShow}
                    onClose={() => setReportToShow(null)}
                    record={reportToShow}
                    type="receiving"
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}
        </div>
    );
};

export default GoodsReceivingPage;
