
import React, { useEffect, useCallback } from 'react';
import SafePortal from './SafePortal';
import { CloseIcon } from '../constants';

interface ModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
    closeOnBackdropClick?: boolean;
}

const ModalShell: React.FC<ModalShellProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    description, 
    children, 
    footer, 
    maxWidth = 'max-w-lg',
    closeOnBackdropClick = true
}) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('no-scroll');
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
            document.body.classList.remove('no-scroll');
            window.removeEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.body.style.overflow = '';
            document.body.classList.remove('no-scroll');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <SafePortal containerId="modal-root">
            <div 
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
                    onClick={closeOnBackdropClick ? onClose : undefined}
                    aria-hidden="true"
                />
                
                <div 
                    className={`relative w-full ${maxWidth} max-h-[95vh] flex flex-col bg-white dark:bg-gray-950 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-white/10 dark:border-white/5`}
                    onClick={(e) => e.stopPropagation()}
                >
                    
                    <header className="flex-shrink-0 p-6 sm:p-8 border-b dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-950 z-10">
                        <div className="pr-10 min-w-0">
                            <h2 id="modal-title" className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none truncate">{title}</h2>
                            {description && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 truncate">{description}</p>
                            )}
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 sm:p-3 -mr-2 sm:-mr-3 -mt-2 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all active:scale-90 flex-shrink-0 no-print"
                            aria-label="Close modal"
                        >
                            <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar min-h-0 bg-white dark:bg-gray-950">
                        {children}
                    </main>

                    {footer && (
                        <footer className="flex-shrink-0 p-6 sm:p-8 border-t dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row-reverse gap-3 z-10 no-print">
                            {footer}
                        </footer>
                    )}
                </div>
            </div>
        </SafePortal>
    );
};

export default ModalShell;
