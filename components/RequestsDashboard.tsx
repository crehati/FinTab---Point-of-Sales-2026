// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Sale, Withdrawal, Deposit, ReceiptSettingsData, Customer, AppPermissions, CustomPayment, ExpenseRequest, BankAccount } from '../types';
import { WarningIcon, PlusIcon, PhoneIcon, BankIcon, TransactionIcon, StaffIcon, CalculatorIcon, ChevronDownIcon, CloseIcon } from '../constants';
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
    
    const cs = String(receiptSettings.currencySymbol);
    const [activeDetailTab, setActiveDetailTab] = useState<any>(null);
    const [pendingWorkflows, setPendingWorkflows] = useState([]);

    useEffect(() => {
        const fetchWorkflows = async () => {
            const { data } = await supabase.from('approval_requests').select('*, approval_signatures(*)').in('status', ['pending_v1', 'pending_v2']);
            if (data) setPendingWorkflows(data);
        };
        fetchWorkflows();
    }, [activeDetailTab]);

    const handleSign = async (req: any, status: string) => {
        const success = await advanceWorkflow(req.id, status);
        if (success) setActiveDetailTab(null);
    };

    return (
        <div className="font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                    onClick={() => setActiveDetailTab('workflows')}
                    className={`relative group flex flex-col items-start p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border transition-all text-left hover:shadow-xl ${pendingWorkflows.length > 0 ? 'border-amber-100' : 'border-slate-50'}`}
                >
                    <div className="p-3 rounded-2xl mb-4 bg-amber-50 text-amber-600">
                        <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Security Guard</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white">{pendingWorkflows.length}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Sig</span>
                    </div>
                </button>
            </div>

            <ModalShell isOpen={activeDetailTab === 'workflows'} onClose={() => setActiveDetailTab(null)} title="Authorization Hub" description="Multi-identity verification required">
                <div className="space-y-4">
                    {pendingWorkflows.map(req => (
                        <div key={req.id} className="p-6 bg-slate-50 dark:bg-gray-800 rounded-[2rem] border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.type}</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{cs}{req.amount.toFixed(2)}</p>
                                </div>
                                <span className="status-badge status-pending">{req.status.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex gap-2">
                                {req.status === 'pending_v1' ? (
                                    <button onClick={() => handleSign(req, 'pending_v2')} className="flex-1 py-3 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Apply V2 Signature</button>
                                ) : (
                                    <button onClick={() => handleSign(req, 'authorized')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Final Audit Authorize</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {pendingWorkflows.length === 0 && <EmptyState icon={<WarningIcon />} title="Grid Secure" description="Zero pending authorizations detected." compact />}
                </div>
            </ModalShell>
        </div>
    );
};

export default RequestsDashboard;