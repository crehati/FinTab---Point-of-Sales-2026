
// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type { User, Sale, AttendanceRecord, PerformanceUser, ReceiptSettingsData, Role, CustomPayment, Customer, AppPermissions, UserPermissions, OwnerSettings, BusinessProfile } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import { QRCodeIcon, PrintIcon, PlusIcon, AIIcon, StaffIcon } from '../constants';
import PrintQRModal from './PrintQRModal';
import QRScannerModal from './QRScannerModal';
import UserDetailModal from './UserDetailModal';
import UserModal from './UserModal';
import ConfirmationModal from './ConfirmationModal';
import UserPermissionModal from './UserPermissionModal';
import InitiatePaymentModal from './InitiatePaymentModal';
import { hasAccess } from '../lib/permissions';
import { formatCurrency, formatAbbreviatedNumber, setStoredItemAndDispatchEvent } from '../lib/utils';

interface UsersProps {
    users: User[];
    sales: Sale[];
    customers: Customer[];
    t: (key: string) => string;
    currentUser: User | null;
    receiptSettings: ReceiptSettingsData;
    onSaveUser: (userData: Omit<User, 'id' | 'avatarUrl'>, isEditing: boolean, existingUserId?: string) => void;
    onDeleteUser: (userId: string) => void;
    trialLimits?: { canAddStaff: boolean };
    permissions: AppPermissions;
    ownerSettings: OwnerSettings;
    businessProfile: BusinessProfile | null;
    handleInitiateCustomPayment: (targetUserId: string, amount: number, description: string) => void;
}

const calculateTotalHours = (attendance: AttendanceRecord[] = []): number => {
    return attendance.reduce((total, record) => {
        if (record.clockOut) {
            const clockInTime = new Date(record.clockIn).getTime();
            const clockOutTime = new Date(record.clockOut).getTime();
            const hours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
            return total + hours;
        }
        return total;
    }, 0);
};

const displayRole = (user: User) => user.role_label || user.role;

const Users: React.FC<UsersProps> = ({ 
    users = [], sales = [], customers = [], t, currentUser, receiptSettings, onSaveUser, onDeleteUser, 
    trialLimits = { canAddStaff: true }, 
    permissions, ownerSettings, businessProfile, handleInitiateCustomPayment 
}) => {
    const [activeTab, setActiveTab] = useState<'commission' | 'hourly'>('commission');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false); 
    const [isIssuePaymentModalOpen, setIsIssuePaymentModalOpen] = useState(false);
    
    const [selectedUser, setSelectedUser] = useState<PerformanceUser | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [permissionEditingUser, setPermissionEditingUser] = useState<User | null>(null);

    const cs = receiptSettings?.currencySymbol || '$';

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const handleOpenInviteModal = () => {
        if (!hasAccess(currentUser, 'SETTINGS', 'manage_permissions', permissions)) return;
        setEditingUser(null);
        setIsUserModalOpen(true);
    };

    const handleOpenEditModal = (user: User) => {
        if (!hasAccess(currentUser, 'SETTINGS', 'manage_permissions', permissions)) return;
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleOpenIssuePayment = (user: User) => {
        if (!hasAccess(currentUser, 'COMMISSIONS', 'approve_commission_withdrawal', permissions)) return;
        setSelectedUser(user);
        setIsIssuePaymentModalOpen(true);
    }

    const handleConfirmIssuePayment = (amount: number, description: string) => {
        if (selectedUser) {
            handleInitiateCustomPayment(selectedUser.id, amount, description);
            setIsIssuePaymentModalOpen(false);
        }
    }

    const handleSaveUser = (userData: Omit<User, 'id' | 'avatarUrl'>, isEditing: boolean) => {
        onSaveUser(userData, isEditing, editingUser?.id);
        setIsUserModalOpen(false);
        setEditingUser(null);
    };

    const handleDeleteClick = (user: User) => {
        if (!hasAccess(currentUser, 'SETTINGS', 'manage_permissions', permissions)) return;
        setUserToDelete(user);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (userToDelete) onDeleteUser(userToDelete.id);
        setIsConfirmModalOpen(false);
        setUserToDelete(null);
    };

    const handleOpenPermissionModal = (user: User) => {
        if (!hasAccess(currentUser, 'SETTINGS', 'manage_permissions', permissions)) return;
        setPermissionEditingUser(user);
        setIsPermissionModalOpen(true);
    };

    const handleSavePermissions = (userId: string, userPermissions: UserPermissions, roleLabel: string) => {
        const timestamp = new Date().toISOString();
        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                return { 
                    ...u, 
                    permissions: userPermissions, 
                    role_label: roleLabel, 
                    permissions_version: 1,
                    lastUpdated: timestamp
                };
            }
            return u;
        });

        const bizId = localStorage.getItem('fintab_active_business_id');
        if (bizId) setStoredItemAndDispatchEvent(`fintab_${bizId}_users`, updatedUsers);
        
        setIsPermissionModalOpen(false);
        window.location.reload(); 
    };

    const userPerformance = useMemo((): PerformanceUser[] => {
        return users.map(member => {
            const memberSales = sales.filter(sale => sale && sale.userId === member.id && sale.status === 'completed');
            const totalCommission = memberSales.reduce((sum, sale) => sum + (sale.commission || 0), 0);
            const totalSalesValue = memberSales.reduce((sum, sale) => sum + sale.total, 0);
            const totalHours = calculateTotalHours(member.attendance);
            const totalHourlyEarnings = (member.hourlyRate || 0) * totalHours;
            
            return { ...member, salesCount: memberSales.length, totalSalesValue, totalCommission, totalHours, totalHourlyEarnings };
        });
    }, [users, sales]);

    const filteredUsersByTab = useMemo(() => {
        if (activeTab === 'commission') return userPerformance.filter(s => s.type === 'commission' && s.role !== 'Investor');
        return userPerformance.filter(s => s.type === 'hourly');
    }, [userPerformance, activeTab]);

    const totalPages = Math.ceil(filteredUsersByTab.length / itemsPerPage);
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsersByTab.slice(start, start + itemsPerPage);
    }, [filteredUsersByTab, currentPage]);

    const canManage = hasAccess(currentUser, 'SETTINGS', 'manage_permissions', permissions);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl p-8 border border-white/10">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-10 gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Personnel</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">Terminal Authentication & Performance Roster</p>
                    </div>
                    
                    <div className="flex bg-slate-50 dark:bg-gray-800 p-1.5 rounded-2xl shadow-inner border dark:border-gray-700">
                        <button 
                            onClick={() => setActiveTab('commission')} 
                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'commission' ? 'bg-white dark:bg-gray-900 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Commissioned ({userPerformance.filter(s => s.type === 'commission' && s.role !== 'Investor').length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('hourly')} 
                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'hourly' ? 'bg-white dark:bg-gray-900 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Hourly ({userPerformance.filter(s => s.type === 'hourly').length})
                        </button>
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {paginatedUsers.length > 0 ? (
                        <>
                            <div className="table-wrapper hidden md:block">
                                <div className="table-container max-h-[600px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col">Unit Identity</th>
                                                <th scope="col" className="text-center">Auth Status</th>
                                                {activeTab === 'commission' ? (
                                                    <>
                                                        <th scope="col" className="text-center">Conversions</th>
                                                        <th scope="col" className="text-right">Ledger Yield</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th scope="col" className="text-center">Hourly Rate</th>
                                                        <th scope="col" className="text-center">Accrued Quantum</th>
                                                        <th scope="col" className="text-right">Settlement Due</th>
                                                    </>
                                                )}
                                                {canManage && <th scope="col" className="text-center">Audit Protocols</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {paginatedUsers.map(member => (
                                                <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td>
                                                        <div className="flex items-center gap-4">
                                                            <img src={member.avatarUrl} alt={member.name} className="w-12 h-12 rounded-2xl object-cover border-4 border-white shadow-sm" />
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-sm">{member.name}</p>
                                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{displayRole(member)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center"><span className="status-badge status-active">Active</span></td>
                                                    {activeTab === 'commission' ? (
                                                        <>
                                                            <td className="text-center font-black text-slate-900 dark:text-white tabular-nums">{member.salesCount}</td>
                                                            <td className="table-num text-emerald-600 font-black text-base">{cs}{formatAbbreviatedNumber(member.totalCommission)}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="text-center font-bold text-slate-600 tabular-nums">{cs}{member.hourlyRate}/hr</td>
                                                            <td className="text-center font-black text-slate-900 dark:text-white tabular-nums">{member.totalHours.toFixed(1)} hrs</td>
                                                            <td className="table-num text-primary font-black text-base">{cs}{formatAbbreviatedNumber(member.totalHourlyEarnings)}</td>
                                                        </>
                                                    )}
                                                    {canManage && (
                                                        <td className="text-center">
                                                            <div className="flex justify-center gap-5">
                                                                <button onClick={() => { setSelectedUser(member); setIsDetailModalOpen(true); }} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Audit</button>
                                                                <button onClick={() => handleOpenPermissionModal(member)} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline">Rights</button>
                                                                <button onClick={() => handleOpenEditModal(member)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:underline">Edit</button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="md:hidden space-y-4">
                                {paginatedUsers.map(member => (
                                    <div key={member.id} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700">
                                        <div className="flex items-center gap-5 mb-5">
                                            <img src={member.avatarUrl} className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-md" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base truncate">{member.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{displayRole(member)}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-y dark:border-gray-700">
                                            <div className="text-left">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'commission' ? 'Yield Balance' : 'Settlement Due'}</p>
                                                <p className="text-xl font-black text-emerald-600 tabular-nums">
                                                    {cs}{formatAbbreviatedNumber(activeTab === 'commission' ? member.totalCommission : member.totalHourlyEarnings)}
                                                </p>
                                            </div>
                                            <div className="text-right"><span className="status-badge status-active">Active</span></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-5">
                                            <button onClick={() => { setSelectedUser(member); setIsDetailModalOpen(true); }} className="py-3 bg-white dark:bg-gray-700 text-slate-900 dark:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm">Audit Node</button>
                                            <button onClick={() => handleOpenPermissionModal(member)} className="py-3 bg-primary text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">Authorize</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center items-center gap-2">
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30 hover:text-primary transition-all active:scale-95"
                                    >
                                        Prev
                                    </button>
                                    <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                                        {Array.from({ length: totalPages }).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`flex-shrink-0 w-8 h-8 rounded-xl text-[10px] font-black transition-all active:scale-95 ${currentPage === i + 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-gray-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        className="p-2 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-30 hover:text-primary transition-all active:scale-95"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState icon={<StaffIcon />} title={`No ${activeTab === 'commission' ? 'Commissioned' : 'Hourly'} Personnel`} description={`Enroll staff members on the ${activeTab} protocol to track yield or attendance.`} />
                    )}
                </div>
            </div>

            <button
                onClick={handleOpenInviteModal}
                disabled={!trialLimits.canAddStaff}
                className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 bg-primary text-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-[40] disabled:bg-slate-300 flex items-center justify-center group"
            >
                <PlusIcon className="w-7 h-7" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Enroll Personnel</span>
            </button>

            <UserDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} user={selectedUser} sales={sales} expenses={[]} customers={customers} currentUser={currentUser} receiptSettings={receiptSettings} businessProfile={businessProfile} onClockInOut={() => {}} />
            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} userToEdit={editingUser} receiptSettings={receiptSettings} existingUsers={users} />
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmDelete} title="Revoke Access" message={`Confirm revocation of ${userToDelete?.name}'s terminal access?`} variant="danger" isIrreversible={true} confirmLabel="Revoke Access" />
            <UserPermissionModal isOpen={isPermissionModalOpen} onClose={() => setIsPermissionModalOpen(false)} onSave={handleSavePermissions} user={permissionEditingUser} />
            <InitiatePaymentModal isOpen={isIssuePaymentModalOpen} onClose={() => setIsIssuePaymentModalOpen(false)} onConfirm={handleConfirmIssuePayment} userName={selectedUser?.name || ''} currencySymbol={cs} />
        </div>
    );
};

export default Users;
