
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { GoodsCosting, Product, User, ReceiptSettingsData, AppPermissions, AuditEntry, CashCountSignature, BusinessSettingsData, BusinessProfile } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import ConfirmationModal from './ConfirmationModal';
import FinanceReportModal from './FinanceReportModal';
import ModalShell from './ModalShell';
import { CalculatorIcon, PlusIcon, CloseIcon, InventoryIcon, WarningIcon, FilePdfIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';

interface GoodsCostingProps {
    goodsCostings: GoodsCosting[];
    setGoodsCostings: (update: any) => void;
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

const GoodsCostingPage: React.FC<GoodsCostingProps> = ({ goodsCostings, setGoodsCostings, products, setProducts, users, currentUser, receiptSettings, permissions, createNotification, businessSettings, businessProfile }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUpdateInventory, setIsUpdateInventory] = useState(false);
    const [reportToShow, setReportToShow] = useState<GoodsCosting | null>(null);

    const cs = receiptSettings.currencySymbol;
    const isOwnerOrAdmin = currentUser?.role === 'Owner' || currentUser?.role === 'Super Admin';

    const workflowRoles = businessSettings?.workflowRoles || {};

    const canSubmitCosting = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.costingManager || [];
        return assigned.some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const canApproveCosting = useMemo(() => {
        if (isOwnerOrAdmin) return true;
        const assigned = workflowRoles?.costingApprover || [];
        return assigned.some(a => a.userId === currentUser?.id);
    }, [isOwnerOrAdmin, workflowRoles, currentUser?.id]);

    const [formData, setFormData] = useState({
        productNumber: '',
        productName: '',
        quantity: '',
        buyingUnitPrice: '',
        marginPercentage: '30',
        linkedProductId: '',
        additionalCosts: {
            taxes: '',
            shipping: '',
            transport: '',
            labor: '',
            transferFees: '',
            other: '',
            otherNote: ''
        }
    });

    const calculatedMetrics = useMemo(() => {
        const qty = parseFloat(formData.quantity) || 0;
        const buyPrice = parseFloat(formData.buyingUnitPrice) || 0;
        const totalBuying = qty * buyPrice;

        const addCosts = formData.additionalCosts;
        const totalAdd = (parseFloat(addCosts.taxes) || 0) +
                         (parseFloat(addCosts.shipping) || 0) +
                         (parseFloat(addCosts.transport) || 0) +
                         (parseFloat(addCosts.labor) || 0) +
                         (parseFloat(addCosts.transferFees) || 0) +
                         (parseFloat(addCosts.other) || 0);

        const landedTotal = totalBuying + totalAdd;
        const unitCost = qty > 0 ? landedTotal / qty : 0;
        
        const margin = parseFloat(formData.marginPercentage) || 0;
        const sellingPrice = unitCost + (unitCost * (margin / 100));

        return { totalBuying, totalAdd, landedTotal, unitCost, sellingPrice };
    }, [formData]);

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

    const handleCreateCosting = () => {
        if (!canSubmitCosting) {
            alert("Digital Protocol Error: Identity not authorized for 'Costing Manager' role.");
            return;
        }

        if (!formData.productNumber || !formData.quantity || !formData.buyingUnitPrice) {
            alert("Identification and primary pricing protocols required.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        const newCosting: GoodsCosting = {
            id: `cost-${Date.now()}`,
            date: new Date().toISOString(),
            productNumber: formData.productNumber,
            productName: formData.productName,
            quantity: parseFloat(formData.quantity),
            buyingUnitPrice: parseFloat(formData.buyingUnitPrice),
            additionalCosts: {
                taxes: parseFloat(formData.additionalCosts.taxes) || 0,
                shipping: parseFloat(formData.additionalCosts.shipping) || 0,
                transport: parseFloat(formData.additionalCosts.transport) || 0,
                labor: parseFloat(formData.additionalCosts.labor) || 0,
                transferFees: parseFloat(formData.additionalCosts.transferFees) || 0,
                other: parseFloat(formData.additionalCosts.other) || 0,
                otherNote: formData.additionalCosts.otherNote
            },
            totalBuyingAmount: calculatedMetrics.totalBuying,
            totalAdditionalCosts: calculatedMetrics.totalAdd,
            totalLandedCost: calculatedMetrics.landedTotal,
            unitCost: calculatedMetrics.unitCost,
            marginPercentage: parseFloat(formData.marginPercentage),
            suggestedSellingPrice: calculatedMetrics.sellingPrice,
            linkedProductId: formData.linkedProductId || undefined,
            status: 'first_signed',
            signatures: { first: signature },
            auditLog: [{
                timestamp: signature.timestamp,
                status: 'first_signed',
                actorId: currentUser.id,
                actorName: currentUser.name,
                note: 'Initial costing derivation submitted.'
            }]
        };

        setGoodsCostings(prev => [newCosting, ...(prev || [])]);
        setIsAddModalOpen(false);
        setFormData({
            productNumber: '', productName: '', quantity: '', buyingUnitPrice: '', marginPercentage: '30', linkedProductId: '',
            additionalCosts: { taxes: '', shipping: '', transport: '', labor: '', transferFees: '', other: '', otherNote: '' }
        });

        // Notify Approvers
        const approvers = workflowRoles?.costingApprover?.map(a => a.userId) || [];
        (users || []).filter(u => u && u.id !== currentUser.id && (approvers.includes(u.id) || u.role === 'Owner'))
            .forEach(u => createNotification(u.id, "Costing Verification Required", `A new unit cost derivation for ${newCosting.productName} requires approval.`, "action_required", "/goods-costing"));
    };

    const handleSecondSign = (costing: GoodsCosting) => {
        if (businessSettings?.enforceUniqueSigners !== false && costing.signatures?.first?.userId === currentUser?.id) {
            alert("Dual-Signature Protocol: You cannot perform the second verification on your own submission. Please wait for an authorized verifier.");
            return;
        }

        const signature: CashCountSignature = {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            timestamp: new Date().toISOString()
        };

        setGoodsCostings(prev => (prev || []).map(c => {
            if (c.id === costing.id) {
                return {
                    ...c,
                    status: 'second_signed',
                    signatures: { ...c.signatures, second: signature },
                    auditLog: [...(c.auditLog || []), {
                        timestamp: signature.timestamp,
                        status: 'second_signed',
                        actorId: currentUser.id,
                        actorName: currentUser.name,
                        note: 'Second verification signature confirmed.'
                    }]
                };
            }
            return c;
        }));
    };

    const handleOwnerAudit = (costing: GoodsCosting, status: 'accepted' | 'rejected') => {
        if (!canApproveCosting) {
            alert("Digital Protocol Error: Identity not authorized for 'Costing Approver' role.");
            return;
        }

        if (status === 'accepted' && businessSettings?.enforceUniqueSigners !== false && costing.signatures?.first?.userId === currentUser?.id) {
             alert("Dual-Signature Protocol: You cannot authorize final acceptance for your own costing derivation in the current enforcement cycle.");
             return;
        }

        setGoodsCostings(prev => (prev || []).map(c => {
            if (c.id === costing.id) {
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
                        note: `Approver finalized status as ${status}.`
                    }]
                };
            }
            return c;
        }));

        if (status === 'accepted' && costing.linkedProductId) {
            const updatedProducts = (products || []).map(p => {
                if (p && p.id === costing.linkedProductId) {
                    return {
                        ...p,
                        costPrice: costing.unitCost,
                        price: costing.suggestedSellingPrice
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
                onClick={handleCreateCosting}
                disabled={!formData.quantity || parseFloat(formData.quantity) <= 0 || !canSubmitCosting}
                className="btn-base btn-primary flex-1 py-5"
            >
                Authorize Initial Signature
            </button>
            <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="btn-base btn-secondary px-10 py-5"
            >
                Abort Protocol
            </button>
        </>
    );

    return (
        <div className="space-y-8 font-sans pb-24 lg:pb-8">
            <header className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Goods Costing</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Landed value & pricing derivation grid</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Costing
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-gray-700 shadow-sm col-span-1 md:col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Recent Landed Values (Avg)</p>
                    <div className="flex items-center gap-8">
                        <div>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                {cs}{(goodsCostings || []).length > 0 ? ((goodsCostings || []).reduce((s, c) => s + (c?.unitCost || 0), 0) / (goodsCostings || []).length).toFixed(2) : '0.00'}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Protocol Unit Average</p>
                        </div>
                        <div className="h-12 w-px bg-slate-100 dark:bg-gray-700"></div>
                        <div>
                            <p className="text-4xl font-bold text-primary tabular-nums tracking-tighter">
                                {(goodsCostings || []).length}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Audited Batches</p>
                        </div>
                    </div>
                </div>
            </div>

            <Card title="Landed Cost Ledger">
                <div className="overflow-x-auto -mx-6 px-6 min-h-[400px]">
                    {(goodsCostings || []).length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                <tr>
                                    <th className="px-6 py-6 rounded-tl-3xl">Landed Date</th>
                                    <th className="px-6 py-6">Identity / Ref</th>
                                    <th className="px-6 py-6 text-center">Batch Size</th>
                                    <th className="px-6 py-6 text-right">Landed Total</th>
                                    <th className="px-6 py-6 text-right">Unit Cost</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                    <th className="px-6 py-6 text-center rounded-tr-3xl">Protocol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                {goodsCostings.map(costing => (
                                    <tr key={costing.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-6 font-bold text-slate-500 uppercase tabular-nums">{new Date(costing.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-6">
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{costing.productName || 'Unnamed Asset'}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {costing.productNumber}</p>
                                        </td>
                                        <td className="px-6 py-6 text-center font-black text-slate-900 dark:text-white tabular-nums">{costing.quantity}</td>
                                        <td className="px-6 py-6 text-right font-bold text-slate-500 tabular-nums">{cs}{costing.totalLandedCost.toFixed(2)}</td>
                                        <td className="px-6 py-6 text-right font-black text-rose-600 text-lg tabular-nums">{cs}{costing.unitCost.toFixed(2)}</td>
                                        <td className="px-6 py-6 text-center">
                                            {getStatusBadge(costing.status)}
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col items-center gap-3">
                                                {costing.status === 'first_signed' && costing.signatures?.first?.userId !== currentUser?.id && (
                                                    <button 
                                                        onClick={() => handleSecondSign(costing)}
                                                        className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
                                                    >
                                                        Sign Verification
                                                    </button>
                                                )}
                                                {costing.status === 'second_signed' && canApproveCosting && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleOwnerAudit(costing, 'accepted')}
                                                            className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleOwnerAudit(costing, 'rejected')}
                                                            className="px-5 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {costing.status === 'accepted' && (
                                                    <button 
                                                        onClick={() => setReportToShow(costing)}
                                                        className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 group"
                                                    >
                                                        <FilePdfIcon className="w-5 h-5" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block animate-fade-in">Report PDF</span>
                                                    </button>
                                                )}
                                                <div className="flex gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>S1: {costing.signatures?.first?.userName?.split(' ')[0] || '---'}</span>
                                                    <span>|</span>
                                                    <span>S2: {costing.signatures?.second?.userName?.split(' ')[0] || '---'}</span>
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
                            description="No goods costing audits have been executed in the current terminal cycle."
                            action={{ label: "Initiate Costing", onClick: () => setIsAddModalOpen(true) }}
                        />
                    )}
                </div>
            </Card>

            <ModalShell
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Goods Costing Execution"
                description="Landed value & pricing derivation grid"
                footer={addModalFooter}
                maxWidth="max-w-4xl"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Acquisition Logistics</h3>
                        <div className="bg-slate-50 dark:bg-gray-900 p-6 rounded-[2.5rem] space-y-4">
                            <div>
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Link to Existing SKU</label>
                                <select 
                                    value={formData.linkedProductId} 
                                    onChange={handleLinkProduct}
                                    className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                >
                                    <option value="">Create New Unlinked Record...</option>
                                    {(products || []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.id.slice(-6).toUpperCase()})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Product Identifier *</label>
                                    <input type="text" value={formData.productNumber} onChange={e => setFormData({...formData, productNumber: e.target.value})} className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold outline-none" placeholder="REF-XXXX" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Product Name</label>
                                    <input type="text" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold outline-none" placeholder="Unit Name" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Batch Quantity *</label>
                                    <input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold outline-none tabular-nums" placeholder="0" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Purchase Unit Price ({cs}) *</label>
                                    <input type="number" value={formData.buyingUnitPrice} onChange={e => setFormData({...formData, buyingUnitPrice: e.target.value})} className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold outline-none tabular-nums" placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 pt-4">Landed Surcharges</h3>
                        <div className="bg-slate-50 dark:bg-gray-900 p-6 rounded-[2.5rem] grid grid-cols-2 gap-4">
                            {[
                                { key: 'taxes', label: 'Taxes/Duties' },
                                { key: 'shipping', label: 'Boat / Sea Freight' },
                                { key: 'transport', label: 'Trucking / Transport' },
                                { key: 'labor', label: 'Labor / Handling' },
                                { key: 'transferFees', label: 'Bank / Wire Fees' },
                                { key: 'other', label: 'Misc Expenses' }
                            ].map(item => (
                                <div key={item.key}>
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">{item.label}</label>
                                    <input 
                                        type="number" 
                                        value={formData.additionalCosts[item.key]} 
                                        onChange={e => setFormData({...formData, additionalCosts: {...formData.additionalCosts, [item.key]: e.target.value}})}
                                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold outline-none tabular-nums" 
                                        placeholder="0.00" 
                                    />
                                </div>
                            ))}
                            <div className="col-span-2">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 mb-2 block">Misc Note</label>
                                <input type="text" value={formData.additionalCosts.otherNote} onChange={e => setFormData({...formData, additionalCosts: {...formData.additionalCosts, otherNote: e.target.value}})} className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-medium outline-none" placeholder="Context for misc cost..." />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Yield Audit Result</h3>
                        <div className="bg-slate-900 rounded-[3rem] p-8 text-white space-y-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            
                            <div className="space-y-6">
                                <div className="flex justify-between border-b border-white/5 pb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Buying Sum</span>
                                    <span className="text-xl font-bold tabular-nums">{cs}{calculatedMetrics.totalBuying.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consolidated Surcharges</span>
                                    <span className="text-xl font-bold tabular-nums text-rose-400">+{cs}{calculatedMetrics.totalAdd.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-primary">Final Landed Sum</span>
                                    <span className="text-3xl font-black tabular-nums tracking-tighter">{cs}{calculatedMetrics.landedTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 text-center">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Protocol unit cost</p>
                                <p className="text-5xl font-black tracking-tighter text-rose-500 tabular-nums">{cs}{calculatedMetrics.unitCost.toFixed(2)}</p>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1 block">Target Margin Multiplier (%)</label>
                                <div className="flex gap-4 items-center">
                                    <input 
                                        type="range" min="0" max="100" step="1" 
                                        value={formData.marginPercentage} 
                                        onChange={e => setFormData({...formData, marginPercentage: e.target.value})}
                                        className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                                    />
                                    <div className="w-20 p-3 bg-white/10 rounded-xl text-center font-black text-sm">{formData.marginPercentage}%</div>
                                </div>
                            </div>

                            <div className="p-8 bg-primary rounded-[2.5rem] text-center shadow-xl shadow-primary/20">
                                <p className="text-[9px] font-bold text-white/60 uppercase tracking-[0.3em] mb-2">Suggested Market Value</p>
                                <p className="text-5xl font-black tracking-tighter text-white tabular-nums">{cs}{calculatedMetrics.sellingPrice.toFixed(2)}</p>
                            </div>
                        </div>

                        {formData.linkedProductId && (
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-xl text-blue-600"><InventoryIcon className="w-5 h-5" /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Inventory Sync</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Update SKU registry on protocol acceptance</p>
                                    </div>
                                </div>
                                <label className="flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isUpdateInventory} onChange={e => setIsUpdateInventory(e.target.checked)} className="sr-only" />
                                    <div className={`w-14 h-8 rounded-full border-2 transition-all ${isUpdateInventory ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}>
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform ${isUpdateInventory ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </ModalShell>

            {reportToShow && (
                <FinanceReportModal 
                    isOpen={!!reportToShow}
                    onClose={() => setReportToShow(null)}
                    record={reportToShow}
                    type="costing"
                    businessProfile={businessProfile}
                    receiptSettings={receiptSettings}
                />
            )}
        </div>
    );
};

export default GoodsCostingPage;
