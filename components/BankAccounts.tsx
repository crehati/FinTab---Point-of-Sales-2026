
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import type { BankAccount, BankTransaction, User, ReceiptSettingsData } from '../types';
import Card from './Card';
import ModalShell from './ModalShell';
import EmptyState from './EmptyState';
import { BankIcon, PlusIcon, TransactionIcon, WarningIcon } from '../constants';
import { formatCurrency, formatAbbreviatedNumber } from '../lib/utils';

interface BankAccountsPageProps {
    bankAccounts: BankAccount[];
    setBankAccounts: (update: any) => void;
    bankTransactions: BankTransaction[];
    setBankTransactions: (update: any) => void;
    receiptSettings: ReceiptSettingsData;
    currentUser: User;
    users: User[];
}

const BankAccountsPage: React.FC<BankAccountsPageProps> = ({ 
    bankAccounts = [], setBankAccounts, bankTransactions = [], setBankTransactions, 
    receiptSettings, currentUser, users 
}) => {
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<BankAccount | null>(null);

    const cs = receiptSettings.currencySymbol;

    // Account Form State
    const [newAccount, setNewAccount] = useState({ bankName: '', accountName: '', accountNumber: '' });
    
    // Transfer Form State
    const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '' });
    
    // Deposit Form State
    const [depositData, setDepositData] = useState({ accountId: '', amount: '', description: '' });

    const handleAddAccount = () => {
        if (bankAccounts.length >= 10) {
            alert("Protocol Limit: System only supports up to 10 authorized bank nodes.");
            return;
        }
        if (!newAccount.bankName || !newAccount.accountName) return;

        const account: BankAccount = {
            id: `bank-${Date.now()}`,
            bankName: newAccount.bankName,
            accountName: newAccount.accountName,
            accountNumber: newAccount.accountNumber,
            balance: 0,
            status: 'Active'
        };

        setBankAccounts(prev => [...(prev || []), account]);
        setIsAddAccountModalOpen(false);
        setNewAccount({ bankName: '', accountName: '', accountNumber: '' });
    };

    const handleManualDeposit = () => {
        const amt = parseFloat(depositData.amount);
        if (isNaN(amt) || amt <= 0 || !depositData.accountId) return;

        setBankAccounts(prev => prev.map(b => b.id === depositData.accountId ? { ...b, balance: b.balance + amt } : b));
        
        const transaction: BankTransaction = {
            id: `bt-${Date.now()}`,
            date: new Date().toISOString(),
            bankAccountId: depositData.accountId,
            type: 'deposit',
            amount: amt,
            description: depositData.description || 'Manual Fund Injection',
            userId: currentUser.id
        };

        setBankTransactions(prev => [transaction, ...(prev || [])]);
        setIsDepositModalOpen(false);
        setDepositData({ accountId: '', amount: '', description: '' });
    };

    const handleTransfer = () => {
        const amt = parseFloat(transferData.amount);
        if (isNaN(amt) || amt <= 0 || !transferData.fromId || !transferData.toId) return;
        if (transferData.fromId === transferData.toId) return;

        const fromAcc = bankAccounts.find(b => b.id === transferData.fromId);
        if (fromAcc.balance < amt) {
            alert("Insufficient Liquidity: Source node balance too low.");
            return;
        }

        setBankAccounts(prev => prev.map(b => {
            if (b.id === transferData.fromId) return { ...b, balance: b.balance - amt };
            if (b.id === transferData.toId) return { ...b, balance: b.balance + amt };
            return b;
        }));

        const ts = new Date().toISOString();
        const transOut: BankTransaction = {
            id: `bt-${Date.now()}-out`,
            date: ts,
            bankAccountId: transferData.fromId,
            type: 'transfer_out',
            amount: -amt,
            description: `Internal Transfer to ${bankAccounts.find(b => b.id === transferData.toId)?.accountName}`,
            userId: currentUser.id
        };
        const transIn: BankTransaction = {
            id: `bt-${Date.now()}-in`,
            date: ts,
            bankAccountId: transferData.toId,
            type: 'transfer_in',
            amount: amt,
            description: `Internal Transfer from ${fromAcc.accountName}`,
            userId: currentUser.id
        };

        setBankTransactions(prev => [transIn, transOut, ...(prev || [])]);
        setIsTransferModalOpen(false);
        setTransferData({ fromId: '', toId: '', amount: '' });
    };

    const filteredTransactions = useMemo(() => {
        if (!selectedAccountForLedger) return [];
        return bankTransactions.filter(t => t.bankAccountId === selectedAccountForLedger.id);
    }, [bankTransactions, selectedAccountForLedger]);

    const totalSystemLiquidity = useMemo(() => bankAccounts.reduce((sum, b) => sum + b.balance, 0), [bankAccounts]);

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-fade-in font-sans">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Bank Accounts</h1>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Enterprise liquidity nodes & fund distribution grid</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setIsTransferModalOpen(true)} className="px-8 py-3 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white hover:bg-slate-50 transition-all">Internal Transfer</button>
                    <button onClick={() => setIsDepositModalOpen(true)} className="px-8 py-3 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white hover:bg-slate-50 transition-all">Manual Deposit</button>
                    <button onClick={() => setIsAddAccountModalOpen(true)} disabled={bankAccounts.length >= 10} className="px-10 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all disabled:opacity-50">Enroll Bank</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/5 md:col-span-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Consolidated Grid Liquidity</p>
                    <p className="text-3xl font-black tabular-nums tracking-tighter">{cs}{formatAbbreviatedNumber(totalSystemLiquidity)}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-gray-800 flex flex-col justify-center md:col-span-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Active Nodes</p>
                    <p className="text-3xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white">{bankAccounts.length}/10</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 px-4">
                <div className="lg:col-span-2 space-y-6">
                    {bankAccounts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {bankAccounts.map(account => (
                                <button 
                                    key={account.id}
                                    onClick={() => setSelectedAccountForLedger(account)}
                                    className={`text-left p-8 rounded-[3rem] border-2 transition-all group relative overflow-hidden ${selectedAccountForLedger?.id === account.id ? 'bg-primary/5 border-primary shadow-xl' : 'bg-white dark:bg-gray-900 border-slate-50 dark:border-gray-800 hover:border-primary/20'}`}
                                >
                                    <div className="flex justify-between items-start mb-10">
                                        <div className={`p-4 rounded-2xl ${selectedAccountForLedger?.id === account.id ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-gray-800 text-slate-400'} transition-colors`}>
                                            <BankIcon className="w-8 h-8" />
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border border-emerald-100">Live Node</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{account.bankName}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{account.accountName}</p>
                                    <div className="mt-12 pt-8 border-t border-slate-50 dark:border-gray-800 flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Yield</p>
                                            <p className={`text-3xl font-black tabular-nums tracking-tighter ${selectedAccountForLedger?.id === account.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{cs}{account.balance.toLocaleString()}</p>
                                        </div>
                                        <div className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] group-hover:text-primary transition-colors">Inspect Ledger →</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <EmptyState 
                            icon={<BankIcon />} 
                            title="No Bank Nodes Enrolled" 
                            description="Initialize your enterprise banking grid by enrolling your first authorized account."
                            action={{ label: "Enroll First Node", onClick: () => setIsAddAccountModalOpen(true) }}
                        />
                    )}
                </div>

                <div className="lg:col-span-1">
                    <Card title={selectedAccountForLedger ? `Ledger: ${selectedAccountForLedger.accountName}` : "Unit Ledger Audit"}>
                        {selectedAccountForLedger ? (
                            <div className="space-y-6">
                                <div className="max-h-[600px] overflow-y-auto custom-scrollbar -mx-4 px-4 space-y-4">
                                    {filteredTransactions.map(t => (
                                        <div key={t.id} className="p-5 bg-slate-50 dark:bg-gray-900 rounded-[2rem] border border-slate-100 dark:border-gray-800 transition-all hover:bg-white dark:hover:bg-gray-800 group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                                                        t.type === 'sale_credit' || t.type === 'deposit' || t.type === 'transfer_in' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                                    }`}>
                                                        {t.type.replace('_', ' ')}
                                                    </span>
                                                    <p className="text-[8px] font-bold text-slate-300 uppercase mt-2 tracking-widest">{new Date(t.date).toLocaleString()}</p>
                                                </div>
                                                <p className={`text-sm font-black tabular-nums ${t.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.amount > 0 ? '+' : ''}{cs}{Math.abs(t.amount).toFixed(2)}
                                                </p>
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight line-clamp-1">{t.description}</p>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Auth Code: {t.id.slice(-8).toUpperCase()}</p>
                                        </div>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.5em] text-center py-20 italic">Ledger Sequences Null</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center opacity-30">
                                <TransactionIcon className="w-12 h-12 mx-auto mb-6 text-slate-300" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Select Node for Audit</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Add Bank Modal */}
            <ModalShell isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} title="Enroll Bank Node" description="Authorized financial enterprise registry">
                <div className="space-y-6">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Bank Enterprise Name</label>
                        <input type="text" value={newAccount.bankName} onChange={e => setNewAccount({...newAccount, bankName: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10" placeholder="e.g. Unibank, Sogebank" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Account Descriptor</label>
                        <input type="text" value={newAccount.accountName} onChange={e => setNewAccount({...newAccount, accountName: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10" placeholder="e.g. Primary Savings, USD Operating" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Account Identifier (Optional)</label>
                        <input type="text" value={newAccount.accountNumber} onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10" placeholder="XXXX-XXXX-XXXX" />
                    </div>
                    <button onClick={handleAddAccount} className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Authorize Node</button>
                </div>
            </ModalShell>

            {/* Manual Deposit Modal */}
            <ModalShell isOpen={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} title="Manual Fund Injection" description="Internal treasury balance adjustment">
                <div className="space-y-6">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Destination Node</label>
                        <select value={depositData.accountId} onChange={e => setDepositData({...depositData, accountId: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10">
                            <option value="">Select Account...</option>
                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Injection Value ({cs})</label>
                        <input type="number" value={depositData.amount} onChange={e => setDepositData({...depositData, amount: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-6 text-3xl font-black tabular-nums outline-none" placeholder="0.00" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Audit Description</label>
                        <input type="text" value={depositData.description} onChange={e => setDepositData({...depositData, description: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none" placeholder="Context for manual deposit..." />
                    </div>
                    <button onClick={handleManualDeposit} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Commit Injection</button>
                </div>
            </ModalShell>

            {/* Internal Transfer Modal */}
            <ModalShell isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Internal Liquidity Transfer" description="Rebalance funds between enterprise nodes">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Source Node</label>
                            <select value={transferData.fromId} onChange={e => setTransferData({...transferData, fromId: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs font-bold outline-none">
                                <option value="">Source...</option>
                                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.accountName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Target Node</label>
                            <select value={transferData.toId} onChange={e => setTransferData({...transferData, toId: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-xs font-bold outline-none">
                                <option value="">Target...</option>
                                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.accountName}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Transfer Quantum ({cs})</label>
                        <input type="number" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-6 text-3xl font-black tabular-nums outline-none" placeholder="0.00" />
                    </div>
                    <button onClick={handleTransfer} className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Authorize Grid Shift</button>
                </div>
            </ModalShell>
        </div>
    );
};

export default BankAccountsPage;
