// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import ModalShell from './ModalShell';

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
                setScanMessage({ type: 'error', text: 'Protocol Error: Authorized hourly identity required.' });
                return;
            }
            
            setScanMessage({ type: 'info', text: `Point camera at station checkpoint...` });
            
            const html5QrCode = new Html5Qrcode(QR_READER_ID);
            scannerRef.current = html5QrCode;

            const qrCodeSuccessCallback = (decodedText: string) => {
                if (decodedText === QR_CODE_VALUE) {
                    html5QrCode.pause(true);
                    onClockInOut();
                    setScanMessage({ type: 'success', text: `Success! Identity authenticated.` });
                    setTimeout(() => { onClose(); }, 1500);
                } else {
                    setScanMessage({ type: 'error', text: 'Checksum Mismatch. Use terminal checkpoint QR.' });
                }
            };
            
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
                .catch((err: any) => { setScanMessage({ type: 'error', text: 'Optics Failure: Camera access denied.' }); });
            
            return () => { if (scannerRef.current && scannerRef.current.isScanning) { scannerRef.current.stop(); } };
        }
    }, [isOpen, currentUser]);

    const footer = (
        <button onClick={onClose} className="btn-base btn-secondary w-full py-4">Terminate Protocol</button>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Identity Scan" 
            description="Personnel Checkpoint Protocol"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-8">
                <div id={QR_READER_ID} className="w-full rounded-[2.5rem] overflow-hidden border-4 border-slate-50 dark:border-gray-800 bg-black shadow-2xl aspect-square"></div>
                
                {scanMessage && (
                    <div className={`p-6 rounded-[2rem] text-center border animate-fade-in ${
                        scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        scanMessage.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">{scanMessage.type}</p>
                        <p className="text-xs font-bold uppercase tracking-tight">{scanMessage.text}</p>
                    </div>
                )}
                
                <div className="text-center">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Node ID: {currentUser?.id.slice(-8).toUpperCase() || 'NULL'}</p>
                </div>
            </div>
        </ModalShell>
    );
};

export default QRScannerModal;