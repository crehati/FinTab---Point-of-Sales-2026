
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import { CloseIcon } from '../constants';

// Declare Html5Qrcode as it's loaded from a CDN
declare var Html5Qrcode: any;

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    onClockInOut: () => void;
}

const QR_CODE_VALUE = 'MAKETUP-CLOCK-IN-OUT-V1';
const QR_READER_ID = 'qr-code-full-region';

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, currentUser, onClockInOut }) => {
    const [scanMessage, setScanMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
    const scannerRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            if (!currentUser || currentUser.type !== 'hourly') {
                setScanMessage({ type: 'error', text: 'No hourly staff member is logged in.' });
                return;
            }
            
            setScanMessage({ type: 'info', text: `Ready for ${currentUser.name}. Point camera at the QR code.` });
            
            const html5QrCode = new Html5Qrcode(QR_READER_ID);
            scannerRef.current = html5QrCode;

            const qrCodeSuccessCallback = (decodedText: string) => {
                if (decodedText === QR_CODE_VALUE) {
                    html5QrCode.pause(true);
                    onClockInOut();
                    setScanMessage({ type: 'success', text: `Success! Clocked in/out for ${currentUser.name}.` });
                    setTimeout(() => {
                        onClose();
                    }, 1500);
                } else {
                    setScanMessage({ type: 'error', text: 'QR code not recognized. Please scan the correct code.' });
                }
            };
            
            const qrCodeErrorCallback = (errorMessage: string) => {
                // Not frequently needed for users
            };

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                qrCodeSuccessCallback, 
                qrCodeErrorCallback
            ).catch((err: any) => {
                setScanMessage({ type: 'error', text: 'Could not start camera. Please grant camera permission.' });
                console.error("Camera start error:", err);
            });
            
            return () => {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((err: any) => {
                        console.error("Failed to stop scanner:", err);
                    });
                }
            };
        }
    }, [isOpen, currentUser, onClockInOut, onClose]);

    if (!isOpen) return null;
    
    const getMessageColor = () => {
        if (!scanMessage) return 'text-gray-500';
        switch (scanMessage.type) {
            case 'success': return 'text-green-600 bg-green-50 border-green-200';
            case 'error': return 'text-red-600 bg-red-50 border-red-200';
            case 'info':
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" 
            role="dialog" 
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-scale-in border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 sm:p-8 border-b dark:border-gray-800 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Identity Scan</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Staff Clock In/Out Protocol</p>
                    </div>
                    <button onClick={onClose} className="p-3 -mr-3 -mt-2 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all" aria-label="Close scanner">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="p-6 sm:p-8 flex-grow overflow-y-auto">
                    <div id={QR_READER_ID} className="w-full rounded-3xl overflow-hidden border-4 border-slate-50 dark:border-gray-800 bg-black shadow-inner aspect-square"></div>
                    
                    {scanMessage && (
                        <div className={`mt-6 p-4 rounded-2xl text-center text-xs font-bold uppercase tracking-widest border animate-fade-in ${getMessageColor()}`}>
                            {scanMessage.text}
                        </div>
                    )}
                </main>
                
                <footer className="p-6 sm:p-8 bg-slate-50 dark:bg-gray-800/50 border-t dark:border-gray-800 flex justify-center">
                    <button onClick={onClose} className="btn-base btn-secondary w-full py-4">Cancel Protocol</button>
                </footer>
            </div>
        </div>
    );
};

export default QRScannerModal;
