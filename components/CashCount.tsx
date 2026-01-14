
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Sale, ReceiptSettingsData, BusinessSettingsData } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import ModalShell from './ModalShell';
import { CalculatorIcon, PlusIcon, FilePdfIcon, WarningIcon } from '../constants';
import { formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import FinanceReportModal from './FinanceReportModal';

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
    const [counts, setCounts] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [reportToShow, setReportToShow] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const cs = receiptSettings.currencySymbol;

    const fetchCounts = async () => {
        const client = await supabase.wait();
        const { data } = await client.from('approval_requests').select('*, approval_signatures(*)').eq('type', 'CASH_COUNT').order('created_at', { ascending: false });
        if (data) setCounts(data);
    };

    useEffect(() => { fetchCounts(); }, []);

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
        const counted = parseFloat(formData.countedTotal);
        if (isNaN(counted)) return;

        setIsProcessing(true);
        const workflowId = await initiateWorkflow('CASH_COUNT', `cc-${Date.now()}`, counted, {
            system_total: calculatedSystemTotal,
            difference: counted - calculatedSystemTotal,
            notes: formData.notes,
            audit_date: formData.date
        });

        if (workflowId) {
            setIsAddModalOpen(false);
            setFormData({ date: new Date().toISOString().split('T')[0], countedTotal: '', notes: '' });
            await fetchCounts();
        }
        setIsProcessing(false);
    };

    const handleSign = async (count: any, status: string) => {
        if (businessSettings?.enforceUniqueSigners !== false && count.created_by === currentUser.id) {
            alert("Security Protocol: Dual-signature requires a different authorized identity.");
            return;
        }
        setIsProcessing(true);
        const success = await advanceWorkflow(count.id, status);
        if (success) await fetchCounts();
        setIsProcessing(false);
    };

    const getStatusBadge = (status: string) => {
        const config = {
            pending_v1: { s: 'status-pending', l: 'Initial Verification' },
            pending_v2: { s: 'status-warning', l: 'Awaiting Audit' },
            authorized: { s: 'status-approved', l: 'Accepted' },
            rejected: { s: 'status-rejected', l: 'Flagged' }
        };
        const item = config[status] || { s: 'status-draft', l: status };
        return <span className={`status-badge ${item.s} !text-[8px]`}>{item.l}</span>;
    };

    return (
        <div className="space-y-12 animate-fade-in font-sans pb-24 lg:pb-8">
            <header className="flex justify-between items-end px-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Cash Verification</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Persistent Dual-Signature Governance Node</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="px-10 py-4 bg-primary text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                    New Count
                </button>
            </header>

            <Card title="Operational Audit Ledger">
                <div className="table-wrapper border-none rounded-none -mx-6 px-6 min-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-gray-950 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            <tr>
                                <th className="px-8 py-6">Audit Node Date</th>
                                <th className="px-8 py-6 text-right">Physical Quantum</th>
                                <th className="px-8 py-6 text-right">Audit Variance</th>
                                <th className="px-8 py-6 text-center">Lifecycle Status</th>
                                <th className="px-8 py-6 text-center">Protocol Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-800">
                            {counts.map(count => (
                                <tr key={count.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6 font-bold text-slate-900 dark:text-white uppercase tabular-nums text-xs">{count.metadata?.audit_date}</td>
                                    <td className="px-8 py-6 text-right font-black text-lg tabular-nums">{cs}{count.amount.toFixed(2)}</td>
                                    <td className={`px-8 py-6 text-right font-black tabular-nums ${count.metadata?.difference === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {count.metadata?.difference > 0 ? '+' : ''}{cs}{count.metadata?.difference?.toFixed(2)}
                                    </td>
                                    <td className="px-8 py-6 text-center">{getStatusBadge(count.status)}</td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex justify-center gap-3">
                                            {count.status === 'pending_v1' && count.created_by !== currentUser.id && (
                                                <button onClick={() => handleSign(count, 'pending_v2')} className="px-6 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Verify V1</button>
                                            )}
                                            {count.status === 'pending_v2' && (currentUser.role === 'Owner' || currentUser.role === 'Manager') && (
                                                <button onClick={() => handleSign(count, 'authorized')} className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">Final Audit</button>
                                            )}
                                            {count.status === 'authorized' && (
                                                <button onClick={() => setReportToShow({ ...count, date: count.metadata?.audit_date, systemTotal: count.metadata?.system_total, countedTotal: count.amount, difference: count.metadata?.difference, notes: count.metadata?.notes })} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all"><FilePdfIcon /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {counts.length === 0 && <EmptyState icon={<CalculatorIcon />} title="Grid Silent" description="No cash verification events recorded for this node." compact />}
                </div>
            </Card>

            <ModalShell isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Start Verification" description="Dual-signature audit protocol initialized" maxWidth="max-w-md">
                <div className="space-y-8">
                    <div className="p-8 bg-slate-50 dark:bg-gray-950 rounded-[2.5rem] border dark:border-gray-800 text-center shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">System Logic: Cash-In-Hand</p>
                        <p className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{cs}{calculatedSystemTotal.toFixed(2)}</p>
                    </div>
                    <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Physical Currency Audit ({cs})</label>
                        <input type="number" value={formData.countedTotal} onChange={e => setFormData({...formData, countedTotal: e.target.value})} className="w-full p-6 bg-slate-50 dark:bg-gray-900 border-none rounded-3xl font-black text-4xl text-center tabular-nums focus:ring-4 focus:ring-primary/10 outline-none" placeholder="0.00" autoFocus />
                        <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full p-4 bg-slate-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold" placeholder="Optional audit memo..."></textarea>
                        <button onClick={handleCreateCount} disabled={isProcessing || !formData.countedTotal} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase text-[12px] tracking-[0.3em] shadow-xl hover:bg-black active:scale-95 transition-all">Initialize Workflow</button>
                    </div>
                </div>
            </ModalShell>

            {reportToShow && (
                <FinanceReportModal 
                    isOpen={!!reportToShow} onClose={() => setReportToShow(null)} 
                    record={reportToShow} type="cash" 
                    businessProfile={null} receiptSettings={receiptSettings} 
                />
            )}
        </div>
    );
};

export default CashCountPage;
