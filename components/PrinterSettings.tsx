
import React, { useState } from 'react';
import type { PrinterSettingsData } from '../types';
import { PrintIcon, LightBulbIcon, WarningIcon } from '../constants';

interface PrinterSettingsProps {
    settings: PrinterSettingsData;
    onUpdateSettings: (settings: PrinterSettingsData) => void;
}

const PrinterSettings: React.FC<PrinterSettingsProps> = ({ settings, onUpdateSettings }) => {
    const [draft, setDraft] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = () => {
        setDraft(prev => ({ ...prev, autoPrint: !prev.autoPrint }));
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            onUpdateSettings(draft);
            setIsSaving(false);
            alert('Hardware Protocol Synchronized: Printer settings updated.');
        }, 600);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-32 animate-fade-in font-sans">
            {/* Header Block */}
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
                <div className="relative flex items-center gap-8">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                        <PrintIcon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Hardware Interface</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-3">Printer Node & Logistics Protocol</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Configuration Section */}
                <div className="lg:col-span-7 space-y-10">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Global Print Policy</h3>
                        </div>

                        <div className="flex items-center justify-between p-8 bg-slate-50 dark:bg-gray-950 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                            <div className="flex-1 pr-6">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Auto-Issuance Protocol</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                                    Automatically initialize the system print engine upon settlement finalization.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={draft.autoPrint} onChange={handleToggle} className="sr-only" />
                                <div className={`w-14 h-8 rounded-full border-2 transition-all ${draft.autoPrint ? 'bg-primary border-primary' : 'bg-slate-200 border-slate-300 dark:bg-gray-700 dark:border-gray-600'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform ${draft.autoPrint ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="p-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[2.5rem] flex items-start gap-6">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                            <LightBulbIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mb-1">Audit Tip</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-tight">
                                Enabling Auto-Issuance reduces terminal processing time but consumes paper resources automatically for every verified transaction.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Technical Guidance */}
                <div className="lg:col-span-5 space-y-10">
                    <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 shadow-xl border border-slate-50 dark:border-gray-800 h-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Technical Standards</h3>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-black">01</span>
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Browser Engine (Default)</h5>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase pl-9">
                                    Compatible with all terminal hardware including Wi-Fi, USB, and LAN thermal printers. Uses standard OS print logic.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">02</span>
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Bluetooth Protocol (Mobile)</h5>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase pl-9">
                                    Requires Bluetooth LE (Low Energy) hardware. Restricted to Chrome/Edge environments. Direct 80mm/58mm thermal output.
                                </p>
                            </div>

                            <div className="pt-6 border-t dark:border-gray-800">
                                <div className="flex items-center gap-3 text-rose-500 mb-2">
                                    <WarningIcon className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Protocol Constraint</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold leading-relaxed uppercase italic">
                                    Legacy "Bluetooth Classic" SPP devices are not supported via browser interface. Hardware upgrade may be required for direct wireless sync.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <div className="flex justify-end pt-10 border-t-2 border-slate-100 dark:border-gray-800">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-16 py-6 bg-primary text-white rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95 flex items-center justify-center min-w-[280px]"
                >
                    {isSaving ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Commit Node Protocol'}
                </button>
            </div>
        </div>
    );
};

export default PrinterSettings;
