import React, { useState, useEffect } from 'react';
import type { User } from '../types';

interface DraftPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (targetUserId: string, amount: number, description: string) => void;
    users: User[];
    currencySymbol: string;
}

const DraftPaymentModal: React.FC<DraftPaymentModalProps> = ({ isOpen, onClose, onConfirm, users, currencySymbol }) => {
    const [targetUserId, setTargetUserId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTargetUserId('');
            setAmount('');
            setDescription('');
            setError('');
        }
    }, [isOpen]);

    const eligibleUsers = users.filter(u => u.role !== 'Super Admin');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!targetUserId) {
            setError('Please select a staff member.');
            return;
        }
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount greater than zero.');
            return;
        }
        if (!description.trim()) {
            setError('Please provide a description for this payment.');
            return;
        }
        onConfirm(targetUserId, numericAmount, description.trim());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                <header className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Draft New Payment</h2>
                </header>
                <main className="p-6 space-y-4">
                     <div>
                        <label htmlFor="target-user" className="block text-sm font-medium text-gray-700">Staff Member</label>
                        <select
                            id="target-user"
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            className="mt-1"
                            required
                        >
                            <option value="" disabled>Select a user...</option>
                            {eligibleUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="payment-amount" className="block text-sm font-medium text-gray-700">Payment Amount</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-lg">{currencySymbol}</span>
                            </div>
                            <input
                                type="number"
                                id="payment-amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-8"
                                placeholder="0.00"
                                step="0.01"
                                min="0.01"
                                required
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="payment-description" className="block text-sm font-medium text-gray-700">Description / Reason</label>
                        <input
                            type="text"
                            id="payment-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1"
                            placeholder="e.g., Sales bonus for Q2"
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </main>
                <footer className="p-4 bg-gray-50 rounded-b-lg flex sm:justify-center">
                    <div className="responsive-btn-group sm:flex-row-reverse">
                        <button type="submit" className="bg-primary text-white hover:bg-blue-700">
                            Draft Payment
                        </button>
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                            Cancel
                        </button>
                    </div>
                </footer>
            </form>
        </div>
    );
};

export default DraftPaymentModal;