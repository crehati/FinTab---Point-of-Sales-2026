
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Sale, Withdrawal, Deposit, ReceiptSettingsData, Customer, AppPermissions, CustomPayment, ExpenseRequest, BankAccount } from '../types';
import { WarningIcon, PlusIcon, PhoneIcon, BankIcon, TransactionIcon, StaffIcon, CalculatorIcon, ChevronDownIcon, CloseIcon } from '../constants';
import { formatCurrency } from '../lib/utils';
import { hasAccess } from '../lib/permissions';
import ConfirmationModal from './ConfirmationModal';
import EmptyState from './EmptyState';
import ModalShell from './ModalShell';

interface RequestsDashboardProps {
    users: User[];
    customers: Customer[];
    sales: Sale[];
    deposits: Deposit[];
    bankAccounts: BankAccount[];
    expenseRequests: ExpenseRequest[];
    receiptSettings: ReceiptSettingsData;
    onUpdateWithdrawalStatus: (userId: string, withdrawalId: string, status: Withdrawal['status'], note?: string) => void;
    onUpdateDepositStatus: (depositId: string, status: 'approved' | 'rejected') => void;
    onApproveSale: (saleId: string) => void;
    onRejectSale: (saleId: string) => void;
    onApproveBankSale: (saleId: string) => void;
    onRejectBankSale: (saleId: string, reason: string) => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status'], note?: string) => void;
    onUpdateExpenseRequestStatus: (requestId: string, status: 'approved' | 'rejected', reason?: string) => void;
    onApproveClientOrder: (saleId: string) => void;
    onRejectClientOrder: (saleId: string) => void;
    t: (key: string) => string;
    currentUser: User;
    permissions: AppPermissions;
}

type TabType = 'withdrawals' | 'paymentApprovals' | 'bankVerification' | 'expenses' | 'clientOrders' | 'deposits';

const RequestsDashboard: React.FC<RequestsDashboardProps> = (props) => {
    const { 
        users, sales, expenseRequests, deposits, bankAccounts = [], receiptSettings, onUpdateWithdrawalStatus, 
        handleUpdateCustomPaymentStatus, onApproveBankSale, onRejectBankSale, 
        onUpdateExpenseRequestStatus, onUpdateDepositStatus, onApproveClientOrder, onRejectClientOrder, 
        currentUser, permissions, customers 
    } = props;
    
    const cs = String(receiptSettings.currencySymbol);

    // State for the detailed view modal
    const [activeDetailTab, setActiveDetailTab] = useState<TabType | null>(null);

    // Confirmation State
    const [pendingAction, setPendingAction] = useState<{ 
        id: string; 
        userId?: string;
        type: TabType;
        status: string; 
        amount: number;
        title: string;
        variant: 'primary' | 'danger';
    } | null>(null);

    const [reviewNote, setReviewNote] = useState('');

    const pendingWithdrawals = useMemo(() => {
        return users.flatMap(user => (user.withdrawals || []).map(w => ({ ...w, user })))
            .filter(w => w.status === 'pending')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [users]);

    const pendingPayments = useMemo(() => {
        return users.flatMap(user => (user.customPayments || []).map(p => ({ ...p, user })))
            .filter(p => p.status === 'pending_owner_approval')
            .sort((a, b) => new Date(b.dateInitiated).getTime() - new Date(a.dateInitiated).getTime());
    }, [users]);

    const pendingBankSales = useMemo(() => {
        return sales.filter(s => s.status === 'pending_bank_verification')
            .map(s => ({ ...s, user: users.find(u => u.id === s.userId), customer: customers.find(c => c.id === s.customerId) }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, users, customers]);

    const pendingExpenses = useMemo(() => {
        return (expenseRequests || []).filter(r => r.status === 'pending')
            .map(r => ({ ...r, user: users.find(u => u.id === r.userId) }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenseRequests, users]);

    const pendingDeposits = useMemo(() => {
        return (deposits || []).filter(d => d.status === 'pending')
            .map(d => {
                const bank = d.bankAccountId ? bankAccounts.find(b => b.id === d.bankAccountId) : null;
                return { 
                    ...d, 
                    user: users.find(u => u.id === d.userId),
                    bankName: bank ? `${bank.bankName} - ${bank.accountName}` : null
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [deposits, users, bankAccounts]);

    const clientOrders = useMemo(() => {
        return sales.filter(s => s.status === 'client_order')
            .map(s => ({ 
                ...s, 
                customer: customers.find(c => c.id === s.customerId) 
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, customers]);

    const availableTabs = useMemo(() => {
        const tabs: { id: TabType; label: string; count: number; color: string; icon: React.ReactNode }[] = [];
        
        if (hasAccess(currentUser, 'SALES', 'view_client_requests', permissions)) {
            tabs.push({ id: 'clientOrders', label: 'Client Orders', count: clientOrders.length, color: 'emerald', icon: <PhoneIcon className="w-5 h-5" /> });
        }
        
        if (hasAccess(currentUser, 'SETTINGS', 'manage_permissions', permissions)) {
            tabs.push({ id: 'deposits', label: 'Cash Deposits', count: pendingDeposits.length, color: 'indigo', icon: <CalculatorIcon className="w-5 h-5" /> });
            tabs.push({ id: 'withdrawals', label: 'Pending Payouts', count: pendingWithdrawals.length, color: 'rose', icon: <TransactionIcon className="w-5 h-5" /> });
            tabs.push({ id: 'paymentApprovals', label: 'Staff Payments', count: pendingPayments.length, color: 'amber', icon: <StaffIcon className="w-5 h-5" /> });
        }

        if (hasAccess(currentUser, 'RECEIPTS', 'edit_receipt', permissions)) {
            tabs.push({ id: 'bankVerification', label: 'Bank Verification', count: pendingBankSales.length, color: 'primary', icon: <BankIcon className="w-5 h-5" /> });
        }

        if (hasAccess(currentUser, 'EXPENSES', 'approve_expense', permissions)) {
            tabs.push({ id: 'expenses', label: 'Expense Verification', count: pendingExpenses.length, color: 'violet', icon: <CalculatorIcon className="w-5 h-5" /> });
        }
        
        return tabs;
    }, [currentUser, permissions, pendingWithdrawals, pendingPayments, pendingBankSales, pendingExpenses, clientOrders, pendingDeposits]);

    const executeConfirmedAction = () => {
        if (!pendingAction) return;
        const { id, userId, type, status } = pendingAction;
        
        switch (type) {
            case 'deposits':
                onUpdateDepositStatus(id, status);
                break;
            case 'clientOrders':
                if (status === 'approved') onApproveClientOrder(id);
                else onRejectClientOrder(id);
                break;
            case 'expenses':
                onUpdateExpenseRequestStatus(id, status, reviewNote);
                break;
            case 'withdrawals':
                onUpdateWithdrawalStatus(userId, id, status, reviewNote);
                break;
            case 'paymentApprovals':
                handleUpdateCustomPaymentStatus(userId, id, status, reviewNote);
                break;
            case 'bankVerification':
                if (status === 'approved') onApproveBankSale(id);
                else onRejectBankSale(id, reviewNote);
                break;
        }

        setPendingAction(null);
        setReviewNote('');
    };

    const RequestCard: React.FC<{
        title: string;
        subtitle?: string;
        avatar?: string;
        amount: number;
        tag?: string;
        timestamp: string;
        details?: React.ReactNode;
        onApprove: () => void;
        onReject: () => void;
        accent: string;
        approveLabel?: string;
    }> = ({ title, subtitle, avatar, amount, tag, timestamp, details, onApprove, onReject, accent, approveLabel = "Authorize" }) => (
        <div className="bg-slate-50 dark:bg-gray-900 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-800 transition-all mb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    {avatar ? (
                        <img src={avatar} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-white dark:border-gray-700" alt="" />
                    ) : (
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-gray-800 ${accent.replace('bg-', 'text-')} border dark:border-gray-700`}>
                            <TransactionIcon className="w-5 h-5" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {tag && <span className="status-badge status-approved !px-2 !py-0.5 !text-[7px]">{tag}</span>}
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                <div className="text-left md:text-right">
                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{cs}{amount.toFixed(2)}</p>
                </div>
            </div>

            {details && <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-800">{details}</div>}

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button 
                    onClick={onApprove} 
                    className={`flex-1 inline-flex items-center justify-center py-3 ${accent} text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all active:scale-95 shadow-sm`}
                >
                    {approveLabel}
                </button>
                <button 
                    onClick={onReject} 
                    className="px-6 inline-flex items-center justify-center py-3 bg-white dark:bg-gray-800 text-slate-400 hover:text-rose-600 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all active:scale-95 border border-slate-100 dark:border-gray-800"
                >
                    Decline
                </button>
            </div>
        </div>
    );

    return (
        <div className="font-sans">
            {/* 1. Summary Grid (The requested "Boxes") */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveDetailTab(tab.id)}
                        className={`relative group flex flex-col items-start p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border transition-all text-left hover:border-${tab.color}-500/50 hover:shadow-xl hover:-translate-y-1 ${tab.count > 0 ? `border-${tab.color}-100 dark:border-${tab.color}-900/30` : 'border-slate-50 dark:border-gray-800'}`}
                    >
                        <div className={`p-3 rounded-2xl mb-4 transition-colors ${tab.count > 0 ? `bg-${tab.color}-50 text-${tab.color}-600 dark:bg-${tab.color}-900/20` : 'bg-slate-50 text-slate-400 dark:bg-gray-800'}`}>
                            {tab.icon}
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{tab.label}</h4>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-3xl font-black tabular-nums tracking-tighter ${tab.count > 0 ? `text-slate-900 dark:text-white` : 'text-slate-300 dark:text-slate-700'}`}>{tab.count}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending</span>
                        </div>
                        <div className={`absolute top-6 right-6 w-2 h-2 rounded-full ${tab.count > 0 ? `bg-${tab.color}-500 animate-pulse` : 'bg-slate-200 dark:bg-gray-800'}`}></div>
                    </button>
                ))}
            </div>

            {/* 2. Detailed Audit Modal */}
            <ModalShell
                isOpen={activeDetailTab !== null}
                onClose={() => { setActiveDetailTab(null); setReviewNote(''); }}
                title={availableTabs.find(t => t.id === activeDetailTab)?.label || 'Verification Protocol'}
                description="Secure audit and authorization workflow"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-6">
                    {(activeDetailTab && availableTabs.find(t => t.id === activeDetailTab)?.count > 0) && (
                        <div className="bg-slate-50 dark:bg-gray-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-1 mb-2 block">Ledger Remarks (Apply to next action)</label>
                            <textarea 
                                value={reviewNote} 
                                onChange={(e) => setReviewNote(e.target.value)} 
                                placeholder="Specify rationale for authorization node..." 
                                rows={2} 
                                className="w-full bg-white dark:bg-gray-800 border-none rounded-xl p-4 text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 transition-all outline-none leading-relaxed resize-none shadow-sm" 
                            />
                        </div>
                    )}

                    <div className="min-h-[300px]">
                        {activeDetailTab === 'deposits' && pendingDeposits.map(dep => (
                            <RequestCard
                                key={dep.id}
                                title={dep.user?.name || 'Authorized Unit'}
                                amount={dep.amount}
                                tag={dep.bankName ? `Bank: ${dep.bankName}` : "Cash Liquidity"}
                                timestamp={dep.date}
                                accent="bg-indigo-600 shadow-indigo-200"
                                approveLabel="Verify Deposit"
                                onApprove={() => setPendingAction({ id: dep.id, type: 'deposits', status: 'approved', amount: dep.amount, title: 'Verify Cash Deposit', variant: 'primary' })}
                                onReject={() => setPendingAction({ id: dep.id, type: 'deposits', status: 'rejected', amount: dep.amount, title: 'Reject Cash Deposit', variant: 'danger' })}
                                details={(
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Destination</p>
                                            <span className="text-[9px] font-black text-primary uppercase">{dep.bankName || 'Physical Treasury'}</span>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff Audit Memo</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 italic leading-relaxed">"{dep.description}"</p>
                                    </div>
                                )}
                            />
                        ))}

                        {activeDetailTab === 'clientOrders' && clientOrders.map(order => (
                            <RequestCard
                                key={order.id}
                                title={order.customer?.name || 'Anonymous Client'}
                                amount={order.total}
                                tag="Inquiry"
                                timestamp={order.date}
                                accent="bg-emerald-500 shadow-emerald-200"
                                approveLabel="Enroll as POS Sale"
                                onApprove={() => setPendingAction({ id: order.id, type: 'clientOrders', status: 'approved', amount: order.total, title: 'Authorize Client Order', variant: 'primary' })}
                                onReject={() => setPendingAction({ id: order.id, type: 'clientOrders', status: 'rejected', amount: order.total, title: 'Decline Inquiry', variant: 'danger' })}
                                details={(
                                    <div className="space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-bold uppercase tracking-tight"><span className="text-primary">{item.quantity}x</span> {item.product.name}</span>
                                                <span className="tabular-nums font-bold">{cs}{(item.quantity * (item.variant?.price || item.product.price)).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            />
                        ))}

                        {activeDetailTab === 'bankVerification' && pendingBankSales.map(sale => (
                            <RequestCard
                                key={sale.id}
                                title={sale.customer?.name || 'Bank Settlement'}
                                avatar={sale.user?.avatarUrl}
                                amount={sale.total}
                                tag="Receipt Review"
                                timestamp={sale.date}
                                accent="bg-primary shadow-primary/20"
                                approveLabel="Verify Settlement"
                                onApprove={() => setPendingAction({ id: sale.id, type: 'bankVerification', status: 'approved', amount: sale.total, title: 'Verify Bank Settlement', variant: 'primary' })}
                                onReject={() => setPendingAction({ id: sale.id, type: 'bankVerification', status: 'rejected', amount: sale.total, title: 'Reject Verification', variant: 'danger' })}
                                details={(
                                    <div className="grid grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-gray-700">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Receipt #</p>
                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{sale.bankReceiptNumber || '---'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bank</p>
                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{sale.bankName || '---'}</p>
                                        </div>
                                    </div>
                                )}
                            />
                        ))}

                        {activeDetailTab === 'paymentApprovals' && pendingPayments.map(p => (
                            <RequestCard
                                key={p.id}
                                title={p.user?.name}
                                subtitle={p.description}
                                avatar={p.user?.avatarUrl}
                                amount={p.amount}
                                tag="Staff Payment"
                                timestamp={p.dateInitiated}
                                accent="bg-amber-500 shadow-amber-200"
                                approveLabel="Authorize Payout"
                                onApprove={() => setPendingAction({ id: p.id, userId: p.user.id, type: 'paymentApprovals', status: 'approved_by_owner', amount: p.amount, title: 'Authorize Staff Payment', variant: 'primary' })}
                                onReject={() => setPendingAction({ id: p.id, userId: p.user.id, type: 'paymentApprovals', status: 'rejected_by_owner', amount: p.amount, title: 'Decline Remittance', variant: 'danger' })}
                            />
                        ))}

                        {activeDetailTab === 'expenses' && pendingExpenses.map(r => (
                            <RequestCard
                                key={r.id}
                                title={r.user?.name}
                                subtitle={r.description}
                                avatar={r.user?.avatarUrl}
                                amount={r.amount}
                                tag={r.category}
                                timestamp={r.date}
                                accent="bg-violet-600 shadow-violet-200"
                                approveLabel="Approve Expense"
                                onApprove={() => setPendingAction({ id: r.id, type: 'expenses', status: 'approved', amount: r.amount, title: 'Approve Expenditure', variant: 'primary' })}
                                onReject={() => setPendingAction({ id: r.id, type: 'expenses', status: 'rejected', amount: r.amount, title: 'Reject Expenditure', variant: 'danger' })}
                            />
                        ))}
                        
                        {activeDetailTab === 'withdrawals' && pendingWithdrawals.map(w => (
                            <RequestCard
                                key={w.id}
                                title={w.user?.name}
                                subtitle={`Source: ${w.source}`}
                                avatar={w.user?.avatarUrl}
                                amount={w.amount}
                                tag="Payout Request"
                                timestamp={w.date}
                                accent="bg-rose-600 shadow-rose-200"
                                onApprove={() => setPendingAction({ id: w.id, userId: w.user.id, type: 'withdrawals', status: 'approved_by_owner', amount: w.amount, title: 'Authorize Payout', variant: 'primary' })}
                                onReject={() => setPendingAction({ id: w.id, userId: w.user.id, type: 'withdrawals', status: 'rejected', amount: w.amount, title: 'Decline Payout', variant: 'danger' })}
                            />
                        ))}

                        {activeDetailTab && (availableTabs.find(t => t.id === activeDetailTab)?.count === 0) && (
                            <EmptyState 
                                icon={<WarningIcon />} 
                                title="Protocol Hub Clear" 
                                description="Zero pending requests found in this identity node."
                                compact
                            />
                        )}
                    </div>
                </div>
            </ModalShell>

            <ConfirmationModal 
                isOpen={!!pendingAction}
                onClose={() => setPendingAction(null)}
                onConfirm={executeConfirmedAction}
                title={pendingAction?.title || 'Execution Required'}
                message={`Verify the ledger entry for ${pendingAction?.amount ? cs + pendingAction.amount.toFixed(2) : 'this amount'}. Audit Note: "${reviewNote || 'No rationale provided'}"`}
                amount={pendingAction?.amount}
                currencySymbol={cs}
                variant={pendingAction?.variant}
                isIrreversible={pendingAction?.variant === 'danger'}
            />
        </div>
    );
};

export default RequestsDashboard;
