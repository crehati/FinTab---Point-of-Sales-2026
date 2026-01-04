
import React from 'react';
import ReactDOM from 'react-dom';
import type { Product, User, StockAdjustment } from '../types';
import { CloseIcon } from '../constants';

interface StockHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    users: User[];
}

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ isOpen, onClose, product, users }) => {
    const modalRoot = document.getElementById('modal-root');
    if (!isOpen || !product || !modalRoot) return null;

    const userMap = new Map(users.map(u => [u.id, u.name]));

    const sortedHistory = product.stockHistory 
        ? [...product.stockHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 font-sans animate-fade-in" 
            role="dialog" 
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 sm:p-8 border-b dark:border-gray-800 flex justify-between items-center flex-shrink-0 bg-white dark:bg-gray-950">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Audit History</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Unit: {product.name}</p>
                    </div>
                    <button onClick={onClose} className="p-3 -mr-3 -mt-2 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all" aria-label="Close modal">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-grow overflow-y-auto custom-scrollbar p-0">
                    {sortedHistory.length > 0 ? (
                        <div className="table-wrapper border-none rounded-none">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-gray-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th scope="col" className="px-8 py-4">Timestamp</th>
                                        <th scope="col" className="px-8 py-4">Auth User</th>
                                        <th scope="col" className="px-8 py-4 text-center">Shift</th>
                                        <th scope="col" className="px-8 py-4 text-center">New Bal</th>
                                        <th scope="col" className="px-8 py-4">Rationale</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                                    {sortedHistory.map((adj, index) => {
                                        const isAdd = adj.type === 'add';
                                        return (
                                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-8 py-5 whitespace-nowrap text-[10px] font-bold text-slate-400 tabular-nums">
                                                    {new Date(adj.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </td>
                                                <td className="px-8 py-5 font-bold text-slate-900 dark:text-white uppercase text-xs">
                                                    {userMap.get(adj.userId) || 'System Agent'}
                                                </td>
                                                <td className={`px-8 py-5 text-center font-black tabular-nums ${isAdd ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {isAdd ? '+' : '-'}{adj.quantity}
                                                </td>
                                                <td className="px-8 py-5 text-center font-black text-slate-900 dark:text-white tabular-nums">{adj.newStockLevel}</td>
                                                <td className="px-8 py-5 text-[10px] font-bold text-slate-500 italic max-w-[200px] truncate">"{adj.reason}"</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-32 opacity-30">
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Ledger Empty</p>
                        </div>
                    )}
                </main>
                
                <footer className="p-6 sm:p-8 bg-slate-50 dark:bg-gray-900/50 border-t dark:border-gray-800 flex justify-end flex-shrink-0">
                    <button type="button" onClick={onClose} className="btn-base btn-primary w-full sm:w-auto px-10">
                        Exit Audit
                    </button>
                </footer>
            </div>
        </div>,
        modalRoot
    );
};

export default StockHistoryModal;
