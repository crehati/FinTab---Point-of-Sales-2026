
import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import SearchInput from './SearchInput';
import ModalShell from './ModalShell';

interface UserSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    onSelect: (userId: string) => void;
}

const UserSelectionModal: React.FC<UserSelectionModalProps> = ({ isOpen, onClose, users, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        const eligibleUsers = users.filter(u => u.role !== 'Investor');
        if (!searchTerm.trim()) return eligibleUsers;

        const lowercasedFilter = searchTerm.toLowerCase();
        return eligibleUsers.filter(user =>
            user.name.toLowerCase().includes(lowercasedFilter) ||
            user.email.toLowerCase().includes(lowercasedFilter)
        );
    }, [users, searchTerm]);

    const handleSelect = (id: string) => {
        onSelect(id);
        onClose();
    };

    const displayRole = (user: User) => user.role === 'Custom' && user.customRoleName ? user.customRoleName : user.role;

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Select Seller" 
            description="Authenticated terminal agents"
            maxWidth="max-w-md"
        >
            <div className="space-y-6">
                <SearchInput
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search users"
                />

                <div className="max-h-80 overflow-y-auto custom-scrollbar -mx-4 px-4">
                    {filteredUsers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {filteredUsers.map(user => (
                                <button 
                                    key={user.id}
                                    onClick={() => handleSelect(user.id)}
                                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-gray-900 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-gray-800 flex items-center gap-4 group"
                                >
                                    <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-sm" />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-gray-100 uppercase tracking-tighter group-hover:text-primary transition-colors">{user.name}</p>
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{displayRole(user)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-12 px-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Zero agents found</p>
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default UserSelectionModal;
