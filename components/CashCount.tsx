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
import { supabase } from '../lib/supabase';

interface CashCountProps {
    sales: Sale[];
    currentUser: User;
    receiptSettings: ReceiptSettingsData;
    businessSettings: BusinessSettingsData;
    initiateWorkflow: (type: string, auditId: string, amount: number, metadata: any) => Promise<string | null>;
    advanceWorkflow: (requestId: string, status: string, note?: string) => Promise<boolean>;
    t: (key: string) => string;
}

const CashCountPage: React.FC<CashCountProps> = ({ sales, currentUser, receiptSettings, businessSettings, initiateWorkflow, advanceWorkflow, t }) => {
    const [cashCounts, setCashCounts] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [reportToShow, setReportToShow] = useState<CashCount | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const cs = receiptSettings.currencySymbol;

    useEffect(() => {
        const fetchCounts = async () => {
            const { data } = await supabase.from('approval_requests').select('*, approval_signatures(*)').eq('type', 'CASH_COUNT');
            if (data) setCashCounts(data);
        };
        fetchCounts();
    }, []);

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

    const handleCreateCount = async () => {
        const counted = parseFloat(formData.countedTotal) || 0;
        const diff = counted - calculatedSystemTotal;
        
        // 1. Create the shadow record (optional depending on DB schema, assuming metadata is enough)
        const workflowId = await initiateWorkflow('CASH_COUNT', `cc-${Date.now()}`, counted, {
            system_total: calculatedSystemTotal,
            difference: diff,
            notes: formData.notes,
            audit_date: formData.date
        });

        if (workflowId) {
            setIsAddModalOpen(false);
            setFormData({ date: new Date().toISOString().split('T')[0], countedTotal: '', notes: '' });
            // Refresh logic...
        }
    };

    const handleSign = async (count: any, status: string) => {
        const success = await advanceWorkflow(count.id, status);
        if (success) {
            // Refetch or update locally...
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = { pending_v1: 'status-pending', pending_v2: 'status-warning', authorized: 'status-approved', settled: 'status-success', rejected: 'status-rejected' };
        return <span className={`status-badge ${styles[status] || 'status-draft'}`}>{status.replace(/_/g, ' ')}</span>;
    };

    return (
        <div className="space-y-8 font-sans pb-24 lg:pb-8">
            <header className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cash Verification</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dual-Signature Governance Node</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl transition-all flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> New Count
                </button>
            </header>

            <Card title="Audit Ledger">
                <div className="overflow-x-auto -mx-6 px-6 min-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-gray-900 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                            <tr>
                                <th className="px-6 py-6">Audit Date</th>
                                <th className="px-6 py-6">Physical Count</th>
                                <th className="px-6 py-6 text-center">Lifecycle</th>
                                <th className="px-6 py-6 text-center">Protocol Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {cashCounts.map(count => (
                                <tr key={count.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-6 font-bold">{count.metadata?.audit_date || 'Unknown'}</td>
                                    <td className="px-6 py-6 font-black tabular-nums">{cs}{count.amount.toFixed(2)}</td>
                                    <td className="px-6 py-6 text-center">{getStatusBadge(count.status)}</td>
                                    <td className="px-6 py-6 text-center">
                                        {count.status === 'pending_v1' && (
                                            <button onClick={() => handleSign(count, 'pending_v2')} className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Sign V2</button>
                                        )}
                                        {count.status === 'pending_v2' && (
                                            <button onClick={() => handleSign(count, 'authorized')} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Final Authorize</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ModalShell isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Cash Verification" description="Initiate multi-signature audit protocol" maxWidth="max-w-lg">
                <div className="space-y-6">
                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Audit Target Date</label>
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold" />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Physical Hand Count ({cs})</label>
                        <input type="number" value={formData.countedTotal} onChange={e => setFormData({...formData, countedTotal: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-6 text-3xl font-black tabular-nums" placeholder="0.00" />
                    </div>
                    <button onClick={handleCreateCount} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Initiate Workflow</button>
                </div>
            </ModalShell>
        </div>
    );
};

export default CashCountPage;