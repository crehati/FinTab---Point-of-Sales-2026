
import React from 'react';
import ModalShell from './ModalShell';
import { CreditCardIcon } from '../constants';

interface PaymentMethodSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentMethods: string[];
    onSelect: (method: string) => void;
}

const PaymentMethodSelectionModal: React.FC<PaymentMethodSelectionModalProps> = ({ isOpen, onClose, paymentMethods, onSelect }) => {
    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Payment Method" 
            description="Select financial protocol"
            maxWidth="max-w-sm"
        >
            <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map(method => (
                    <button
                        key={method}
                        onClick={() => {
                            onSelect(method);
                            onClose();
                        }}
                        className="w-full text-left p-6 bg-slate-50 dark:bg-gray-900 hover:bg-primary/5 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all flex items-center justify-between group active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl text-slate-400 group-hover:text-primary transition-colors">
                                <CreditCardIcon className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-lg">{method}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-gray-700 flex items-center justify-center group-hover:border-primary transition-colors">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </button>
                ))}
                
                {paymentMethods.length === 0 && (
                    <div className="text-center py-12 px-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No methods configured</p>
                    </div>
                )}
            </div>
        </ModalShell>
    );
};

export default PaymentMethodSelectionModal;
