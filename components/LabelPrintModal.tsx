
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { Product, ReceiptSettingsData } from '../types';
import { CloseIcon, PrintIcon } from '../constants';
import { formatCurrency } from '../lib/utils';

declare var JsBarcode: any;

interface LabelPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    receiptSettings: ReceiptSettingsData;
}

const LabelPrintModal: React.FC<LabelPrintModalProps> = ({ isOpen, onClose, product, receiptSettings }) => {
    const [labelCount, setLabelCount] = useState<number>(1);
    const [include, setInclude] = useState({
        name: true,
        price: true,
        business: false,
        barcode: true,
    });
    
    const barcodePreviewRef = useRef<SVGSVGElement>(null);
    const sheetContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && barcodePreviewRef.current && product && include.barcode) {
            try {
                JsBarcode(barcodePreviewRef.current, product.id, {
                    format: "CODE128",
                    displayValue: true,
                    fontSize: 14,
                    height: 40,
                    margin: 0,
                });
            } catch (e) {
                console.error("Barcode generation failed:", e);
            }
        }
    }, [isOpen, product, include.barcode]);
    
    const handleIncludeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setInclude(prev => ({ ...prev, [name]: checked }));
    };
    
    const handlePrint = () => {
        if (!sheetContentRef.current || !product) return;

        let labelContent = '';
        if (include.business) labelContent += `<div style="font-size: 8px; font-weight: bold; text-align: center; margin-bottom: 2px;">${receiptSettings.businessName}</div>`;
        if (include.name) labelContent += `<div style="font-size: 10px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${product.name}</div>`;
        if (include.price) labelContent += `<div style="font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 4px;">${formatCurrency(product.price, receiptSettings.currencySymbol)}</div>`;
        if (include.barcode) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            JsBarcode(svg, product.id, { format: "CODE128", displayValue: true, fontSize: 10, height: 30, margin: 0, width: 1.5 });
            labelContent += `<div style="display: flex; justify-content: center;">${svg.outerHTML}</div>`;
        }
        
        const labelHTML = `
            <div style="width: 2.25in; height: 1.25in; border: 1px dotted #ccc; padding: 4px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: center; background: white; color: black; font-family: sans-serif;">
                ${labelContent}
            </div>
        `;
        
        const labels = Array(labelCount).fill(labelHTML).join('');
        
        sheetContentRef.current.innerHTML = `<div style="display: flex; flex-wrap: wrap; gap: 0;">${labels}</div>`;
        
        const onAfterPrint = () => {
            document.body.classList.remove('printing-labels');
            window.removeEventListener('afterprint', onAfterPrint);
            if (sheetContentRef.current) {
                sheetContentRef.current.innerHTML = ''; 
            }
        };

        window.addEventListener('afterprint', onAfterPrint);
        document.body.classList.add('printing-labels');
        window.print();
    };

    const modalRoot = document.getElementById('modal-root');
    if (!isOpen || !product || !modalRoot) return null;
    
    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in" 
            role="dialog" 
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-scale-in border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 sm:p-8 border-b dark:border-gray-800 flex justify-between items-center flex-shrink-0 bg-white dark:bg-gray-900">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Print Asset Labels</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Product: {product.name}</p>
                    </div>
                    <button onClick={onClose} className="p-3 -mr-3 -mt-2 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all no-print" aria-label="Close modal">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-grow overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-10 p-8">
                    <div className="space-y-8">
                        <div>
                            <label htmlFor="label-count" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Quantum to Issue</label>
                            <input
                                type="number"
                                id="label-count"
                                value={labelCount}
                                onChange={e => setLabelCount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full bg-slate-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                min="1"
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Protocol Attributes</h4>
                            <div className="space-y-3">
                                {[
                                    { name: 'name', label: 'Unit Identifier' },
                                    { name: 'price', label: 'Market Value' },
                                    { name: 'business', label: 'Business Identity' },
                                    { name: 'barcode', label: 'Physical Barcode' }
                                ].map(attr => (
                                    <label key={attr.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all group">
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{attr.label}</span>
                                        <div className="relative inline-flex items-center">
                                            <input type="checkbox" name={attr.name} checked={include[attr.name]} onChange={handleIncludeChange} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Asset Preview (2.25" x 1.25")</h4>
                        <div className="bg-slate-50 dark:bg-gray-950 p-8 rounded-[3rem] flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-gray-800 min-h-[300px]">
                            <div className="w-[216px] h-[120px] bg-white border shadow-2xl p-4 flex flex-col justify-center animate-fade-in rounded-lg">
                                {include.business && <p className="text-[8px] font-black text-center mb-1 uppercase tracking-tight text-slate-900">{receiptSettings.businessName}</p>}
                                {include.name && <p className="text-[10px] font-black text-center truncate mb-1 text-slate-900">{product.name}</p>}
                                {include.price && <p className="text-sm font-black text-center mb-2 text-primary">{formatCurrency(product.price, receiptSettings.currencySymbol)}</p>}
                                {include.barcode && <div className="flex justify-center"><svg ref={barcodePreviewRef}></svg></div>}
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="p-8 bg-slate-50 dark:bg-gray-900 border-t dark:border-gray-800 flex flex-col sm:flex-row gap-4 no-print flex-shrink-0">
                    <button onClick={handlePrint} className="btn-base btn-primary flex-1 py-5">
                        <PrintIcon className="w-5 h-5 mr-2" />
                        Execute Print Node
                    </button>
                    <button onClick={onClose} className="btn-base btn-secondary px-10 py-5">Cancel</button>
                </footer>
            </div>
            <div id="label-sheet-to-print" ref={sheetContentRef} className="hidden"></div>
        </div>,
        modalRoot
    );
};

export default LabelPrintModal;
