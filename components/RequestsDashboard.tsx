
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Sale, Withdrawal, Deposit, ReceiptSettingsData, Customer, AppPermissions, CustomPayment, ExpenseRequest, BankAccount } from '../types';
import { WarningIcon, PlusIcon, PhoneIcon, BankIcon, TransactionIcon, StaffIcon, CalculatorIcon, ChevronDownIcon, CloseIcon, ShieldCheckIcon } from '../constants';
import { formatCurrency } from '../lib/utils';
import { hasAccess } from '../lib/permissions';
import ConfirmationModal from './ConfirmationModal';
import EmptyState from './EmptyState';
import ModalShell from './ModalShell';
import { supabase } from '../lib/supabase';

interface RequestsDashboardProps {
    users: User[];
    customers: Customer[];
    sales: Sale[];
    deposits: Deposit[];
    bankAccounts: BankAccount[];
    expenseRequests: ExpenseRequest[];
    receiptSettings: ReceiptSettingsData;
    onUpdateWithdrawalStatus: (userId: string, withdrawalId: string, status: Withdrawal['status'], note?: string, fundingSource?: 'cash' | 'bank', bankAccountId?: string) => void;
    onUpdateDepositStatus: (depositId: string, status: 'approved' | 'rejected') => void;
    onApproveSale: (saleId: string) => void;
    onRejectSale: (saleId: string) => void;
    onApproveBankSale: (saleId: string) => void;
    onRejectBankSale: (saleId: string, reason: string) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status'], note?: string, fundingSource?: 'cash' | 'bank', bankAccountId?: string) => void;
    onUpdateExpenseRequestStatus: (requestId: string, status: 'approved' | 'rejected', reason?: string, fundingSource?: 'cash' | 'bank', bankAccountId?: string) => void;
    onApproveClientOrder: (saleId: string) => void;
    onRejectClientOrder: (saleId: string) => void;
    advanceWorkflow: (requestId: string, status: string, note?: string) => Promise<boolean>;
    t: (key: string) => string;
    currentUser: User;
    permissions: AppPermissions;
}

const RequestsDashboard: React.FC<RequestsDashboardProps> = (props) => {
    const { 
        users, sales, expenseRequests, deposits, bankAccounts = [], receiptSettings, 
        advanceWorkflow, currentUser, permissions, customers 
    } = props;
    
    const cs = String(receiptSettings.currencySymbol || '$');
    const [activeDetailTab, setActiveDetailTab] = useState<any>(null);
    const [pendingWorkflows, setPendingWorkflows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchWorkflows = async () => {
            setIsLoading(true);
            try {
                const client = await supabase.wait();
                const { data } = await client.from('approval_requests').select('*, approval_signatures(*)').in('status', ['pending_v1', 'pending_v2']);
                if (data) setPendingWorkflows(data);
            } catch (err) {
                console.error("Workflow fetch failed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWorkflows();
    }, [activeDetailTab]);

    const handleSign = async (req: any, status: string) => {
        const success = await advanceWorkflow(req.id, status);
        if (success) {
            setActiveDetailTab(null);
            // Refresh local state immediately
            setPendingWorkflows(prev => prev.filter(p => p.id !== req.id));
        }
    };

    return (
        <div className="font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                    onClick={() => setActiveDetailTab('workflows')}
                    className={`relative group flex flex-col items-start p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border transition-all text-left hover:shadow-2xl hover:-translate-y-1 ${pendingWorkflows.length > 0 ? 'border-amber-200 dark:border-amber-900/50' : 'border-slate-100 dark:border-gray-800'}`}
                >
                    <div className="p-3 rounded-2xl mb-6 bg-amber-50 dark:bg-amber-900/20 text-amber-600 shadow-sm">
                        <ShieldCheckIcon className="w-6 h-6" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Authorization Hub</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white">
                            {isLoading ? '...' : pendingWorkflows.length}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending Signs</span>
                    </div>
                    {pendingWorkflows.length > 0 && (
                        <div className="mt-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Action Required</p>
                        </div>
                    )}
                </button>
            </div>

            <ModalShell isOpen={activeDetailTab === 'workflows'} onClose={() => setActiveDetailTab(null)} title="Security Authorization" description="Multi-identity verification protocol">
                <div className="space-y-4">
                    {pendingWorkflows.length > 0 ? (
                        pendingWorkflows.map(req => (
                            <div key={req.id} className="p-8 bg-slate-50 dark:bg-gray-900 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{req.type.replace('_', ' ')}</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{cs}{req.amount.toFixed(2)}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Audit Link: {req.audit_link_id}</p>
                                    </div>
                                    <span className={`status-badge !text-[8px] ${req.status === 'pending_v1' ? 'status-pending' : 'status-warning'}`}>
                                        {req.status.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    {req.status === 'pending_v1' ? (
                                        <button onClick={() => handleSign(req, 'pending_v2')} className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all">Sign Verification</button>
                                    ) : (
                                        <button onClick={() => handleSign(req, 'authorized')} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Final Authorize</button>
                                    )}
                                    <button onClick={() => handleSign(req, 'rejected')} className="px-6 py-4 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all">Reject</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 opacity-40">
                                <ShieldCheckIcon className="w-10 h-10 text-slate-300" />
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Ledger Verified</h4>
                            <p className="text-xs text-slate-400 font-medium mt-3">Zero pending authorizations detected.</p>
                        </div>
                    )}
                </div>
            </ModalShell>
        </div>
    );
};

export default RequestsDashboard;
