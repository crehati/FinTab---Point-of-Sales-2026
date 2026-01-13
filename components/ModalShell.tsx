// @ts-nocheck
import React, { useEffect, useCallback, useRef } from 'react';
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
    const modalRef = useRef<HTMLDivElement>(null);

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
            >
                <div 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
                    onClick={closeOnBackdropClick ? onClose : undefined}
                    aria-hidden="true"
                />
                
                <div 
                    ref={modalRef}
                    className={`relative w-full ${maxWidth} max-h-[92vh] flex flex-col bg-white dark:bg-gray-950 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-scale-in border border-white/10 dark:border-white/5`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="flex-shrink-0 p-8 sm:p-10 bg-[#0F172A] flex justify-between items-start z-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        
                        <div className="pr-12 min-w-0 relative z-10">
                            {description && (
                                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">
                                    {description}
                                </p>
                            )}
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight leading-tight truncate">
                                {title}
                            </h2>
                        </div>
                        
                        <button 
                            onClick={onClose} 
                            className="relative z-20 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90 no-print"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto p-8 sm:p-10 custom-scrollbar min-h-0 bg-white dark:bg-gray-950">
                        <div className="animate-fade-in-up">
                            {children}
                        </div>
                    </main>

                    {footer && (
                        <footer className="flex-shrink-0 px-8 py-8 sm:px-10 border-t border-slate-50 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col sm:flex-row-reverse gap-4 z-10 no-print">
                            {footer}
                        </footer>
                    )}
                </div>
            </div>
        </SafePortal>
    );
};

export default ModalShell;