// @ts-nocheck
import React, { useState } from 'react';
import ModalShell from './ModalShell';
import { CloseIcon, TodayIcon } from '../constants';

interface ReportFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (start: string, end: string) => void;
    initialStart?: string;
    initialEnd?: string;
}

const ReportFilterModal: React.FC<ReportFilterModalProps> = ({ isOpen, onClose, onApply, initialStart = '', initialEnd = '' }) => {
    const [start, setStart] = useState(initialStart);
    const [end, setEnd] = useState(initialEnd);

    const applyPreset = (preset: string) => {
        const now = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        let s = '';
        let e = formatDate(now);

        switch (preset) {
            case 'today':
                s = formatDate(now);
                e = formatDate(now);
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                s = formatDate(yesterday);
                e = formatDate(yesterday);
                break;
            case 'thisWeek':
                const firstDayOfWeek = new Date(now);
                const day = now.getDay(); // 0 is Sun
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                firstDayOfWeek.setDate(diff);
                s = formatDate(firstDayOfWeek);
                break;
            case 'lastWeek':
                const lastWeekEnd = new Date(now);
                const dayLast = now.getDay();
                const diffLastEnd = now.getDate() - dayLast;
                lastWeekEnd.setDate(diffLastEnd);
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                s = formatDate(lastWeekStart);
                e = formatDate(lastWeekEnd);
                break;
            case 'thisMonth':
                s = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
                break;
            case 'lastMonth':
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                s = formatDate(lastMonthStart);
                e = formatDate(lastMonthEnd);
                break;
            case 'thisYear':
                s = formatDate(new Date(now.getFullYear(), 0, 1));
                break;
            case 'lastYear':
                s = formatDate(new Date(now.getFullYear() - 1, 0, 1));
                e = formatDate(new Date(now.getFullYear() - 1, 11, 31));
                break;
        }
        setStart(s);
        setEnd(e);
    };

    const handleApply = () => {
        onApply(start, end);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-slate-100 font-sans animate-fade-in">
            {/* Header - Mimicking Screenshot */}
            <header className="bg-primary text-white h-16 flex items-center px-6 shadow-md relative z-10">
                <button onClick={onClose} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <h1 className="ml-4 text-lg font-bold uppercase tracking-widest">Filter by Date</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-10 max-w-lg mx-auto w-full">
                <div className="text-center space-y-8">
                    <p className="text-slate-500 font-bold text-sm">Select Date Range</p>
                    
                    <div className="space-y-4">
                        <div className="relative group">
                            <input 
                                type="date" 
                                value={start} 
                                onChange={e => setStart(e.target.value)}
                                className="w-full text-center bg-transparent border-b-2 border-slate-300 py-3 text-xl font-medium text-slate-700 outline-none focus:border-primary transition-colors"
                                placeholder="Start Date"
                            />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Start Date</p>
                        </div>
                        <div className="relative group">
                            <input 
                                type="date" 
                                value={end} 
                                onChange={e => setEnd(e.target.value)}
                                className="w-full text-center bg-transparent border-b-2 border-slate-300 py-3 text-xl font-medium text-slate-700 outline-none focus:border-primary transition-colors"
                                placeholder="End Date"
                            />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">End Date</p>
                        </div>
                    </div>

                    <button 
                        onClick={handleApply}
                        className="w-full bg-primary text-white py-4 rounded-lg font-bold uppercase text-sm tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                        Show Reports
                    </button>
                </div>

                {/* Preset Grid - Mimicking Screenshot */}
                <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    {[
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'thisWeek', label: 'This Week' },
                        { id: 'lastWeek', label: 'Last Week' },
                        { id: 'thisMonth', label: 'This Month' },
                        { id: 'lastMonth', label: 'Last Month' },
                        { id: 'thisYear', label: 'This Year' },
                        { id: 'lastYear', label: 'Last Year' }
                    ].map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => applyPreset(preset.id)}
                            className="bg-white py-6 px-4 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors active:bg-slate-100"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ReportFilterModal;