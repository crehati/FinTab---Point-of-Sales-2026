
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { CloseIcon, PrintIcon } from '../constants';

// Declare QRCode as it's loaded from a CDN
declare var QRCode: any;

interface PrintQRModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const QR_CODE_VALUE = 'MAKETUP-CLOCK-IN-OUT-V1';

const PrintQRModal: React.FC<PrintQRModalProps> = ({ isOpen, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const qrContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, QR_CODE_VALUE, { width: 256, margin: 2 }, (error: any) => {
                if (error) console.error('Error generating QR Code:', error);
            });
        }
    }, [isOpen]);

    const modalRoot = document.getElementById('modal-root');
    if (!isOpen || !modalRoot) return null;

    const handlePrint = () => {
        window.print();
    };

    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 printable-area animate-fade-in" 
            role="dialog" 
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 sm:p-8 border-b dark:border-gray-800 flex justify-between items-center flex-shrink-0 no-print">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Print Protocol</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Station Clock QR Asset</p>
                    </div>
                    <button onClick={onClose} className="p-3 -mr-3 -mt-2 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all no-print" aria-label="Close modal">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <div ref={qrContainerRef} className="overflow-y-auto bg-slate-50 dark:bg-gray-950 p-8 flex-grow">
                    <div className="p-10 bg-white dark:bg-gray-900 rounded-[3rem] text-center border border-slate-100 dark:border-gray-800 shadow-xl">
                        <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase tracking-tighter mb-2">Personnel Checkpoint</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-10">Deploy this asset at the physical terminal station.</p>
                        <div className="bg-white p-6 rounded-[2rem] inline-block shadow-inner border border-slate-50">
                            <canvas ref={canvasRef} className="mx-auto" />
                        </div>
                        <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.4em] mt-8">FT-PROTOCOL-V1</p>
                    </div>
                </div>

                <footer className="p-6 sm:p-8 bg-white dark:bg-gray-900 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-3 flex-shrink-0 no-print">
                    <button onClick={handlePrint} type="button" className="btn-base btn-primary flex-1 py-4">
                        <PrintIcon className="w-5 h-5 mr-2" />
                        Print Asset
                    </button>
                    <button onClick={onClose} type="button" className="btn-base btn-secondary flex-1 py-4">
                        Close
                    </button>
                </footer>
            </div>
        </div>,
        modalRoot
    );
};

export default PrintQRModal;
