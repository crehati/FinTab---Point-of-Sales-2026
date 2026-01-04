import React, { useState } from 'react';

interface TerminalRecoveryProps {
    error: Error;
    info: React.ErrorInfo | null;
    snapshot?: any;
    resetErrorBoundary: () => void;
    onResetCheckout: () => void;
}

const TerminalRecovery: React.FC<TerminalRecoveryProps> = ({ error, info, snapshot, resetErrorBoundary, onResetCheckout }) => {
    const [showDebug, setShowDebug] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-rose-100 dark:border-rose-900/30 animate-fade-in max-w-2xl mx-auto overflow-hidden font-sans">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Terminal Flow Error</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                A rendering or validation exception was intercepted during the checkout sequence. No data has been corrupted.
            </p>
            
            <div className="w-full space-y-3 mb-8">
                <button 
                    onClick={() => {
                        onResetCheckout();
                        resetErrorBoundary();
                    }}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all uppercase tracking-widest text-[10px]"
                >
                    Clear Cart & Restart Flow
                </button>
                <button 
                    onClick={resetErrorBoundary}
                    className="w-full py-4 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                >
                    Attempt Soft Resume (Retain State)
                </button>
            </div>

            <div className="w-full pt-6 border-t border-slate-50 dark:border-gray-800">
                <button 
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                    {showDebug ? 'Hide' : 'Show'} Full Diagnostic Trace
                    <svg className={`w-3 h-3 transition-transform ${showDebug ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={3} /></svg>
                </button>

                {showDebug && (
                    <div className="mt-4 space-y-4 text-left">
                        <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl">
                            <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1">Exception Message</p>
                            <code className="text-xs text-rose-600 dark:text-rose-400 font-medium break-all">{error.message}</code>
                        </div>

                        {info && (
                            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl overflow-hidden">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Component Context</p>
                                <pre className="text-[10px] text-slate-500 dark:text-slate-400 overflow-auto max-h-40 whitespace-pre-wrap">
                                    {info.componentStack}
                                </pre>
                            </div>
                        )}

                        {snapshot && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-xl overflow-hidden border border-blue-100 dark:border-blue-900/30">
                                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-1">Checkout State Snapshot</p>
                                <pre className="text-[10px] text-blue-600 dark:text-blue-400 overflow-auto max-h-40">
                                    {JSON.stringify(snapshot, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TerminalRecovery;