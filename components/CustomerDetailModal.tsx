
import React from 'react';
import type { Customer, ReceiptSettingsData } from '../types';
import { formatCurrency } from '../lib/utils';

interface CustomerDetailModalProps {
    customer: Customer | null;
    onClose: () => void;
    receiptSettings: ReceiptSettingsData;
}

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose, receiptSettings }) => {
    if (!customer) return null;

    const cs = receiptSettings.currencySymbol;

    const getTotalSpent = (c: Customer) => {
        return c.purchaseHistory.reduce((sum, sale) => sum + sale.total, 0);
    };

    const sortedHistory = [...customer.purchaseHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <header className="p-4 sm:p-6 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{customer.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Close customer details">
                        <CloseIcon />
                    </button>
                </header>
                
                <main className="flex-grow overflow-y-auto">
                    <div className="p-4 sm:p-6 space-y-6">
                        {/* Customer Info Section */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-1">Contact Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <p><span className="font-medium text-gray-500">Email:</span> <span className="text-gray-800">{customer.email}</span></p>
                                <p><span className="font-medium text-gray-500">Phone:</span> <span className="text-gray-800">{customer.phone}</span></p>
                                <p><span className="font-medium text-gray-500">Join Date:</span> <span className="text-gray-800">{new Date(customer.joinDate).toLocaleDateString()}</span></p>
                                <p><span className="font-medium text-gray-500">Total Spent:</span> <span className="font-bold text-green-600">{formatCurrency(getTotalSpent(customer), cs)}</span></p>
                            </div>
                        </section>

                        {/* Purchase History Section */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-1">Purchase History ({sortedHistory.length})</h3>
                            {sortedHistory.length > 0 ? (
                                <ul className="space-y-4">
                                    {sortedHistory.map(sale => (
                                        <li key={sale.id} className="border rounded-lg p-3 text-sm bg-gray-50">
                                            <div className="flex justify-between items-center mb-2 flex-wrap">
                                                <p className="font-semibold text-gray-800">{new Date(sale.date).toLocaleString()}</p>
                                                <p className="font-bold text-primary">{formatCurrency(sale.total, cs)}</p>
                                            </div>
                                            <ul className="space-y-1 pl-4 border-l-2 border-gray-200">
                                                {sale.items.map(item => (
                                                    <li key={item.product.id} className="text-gray-600">
                                                        {item.quantity} x {item.product.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-gray-500">No purchase history available.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </main>
                
                <footer className="p-4 bg-gray-50 rounded-b-lg flex justify-end flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CustomerDetailModal;
