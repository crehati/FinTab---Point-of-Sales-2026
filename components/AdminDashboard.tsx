import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { User, AdminBusinessData, LicensingInfo } from '../types';
import { 
    DUMMY_ADMIN_BUSINESS_DATA, 
    LogoutIcon, 
    AdminDashboardIcon, 
    BuildingIcon, 
    UsersGroupIcon, 
    ReceiptsIcon, 
    SettingsIcon, 
    ChevronDownIcon,
    CloseIcon
} from '../constants';

type AdminView = 'dashboard' | 'businesses' | 'users' | 'sales' | 'settings';

// Helper to export data to CSV
const exportToCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows || !rows.length) {
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date
                    ? cell.toLocaleString()
                    : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// --- LocalStorage Helper Functions ---
const getStoredItem = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading ${key} from localStorage`, error);
        return defaultValue;
    }
};

const setStoredItem = (key: string, value: any): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing ${key} to localStorage`, error);
    }
};


// --- Sub-Components for AdminDashboard ---

const AdminSidebar: React.FC<{ activeView: AdminView; setActiveView: (view: AdminView) => void; onLogout: () => void; }> = ({ activeView, setActiveView, onLogout }) => {
    const navItems = [
        { view: 'dashboard', text: 'Dashboard', icon: <AdminDashboardIcon /> },
        { view: 'businesses', text: 'Businesses', icon: <BuildingIcon /> },
        { view: 'users', text: 'Users', icon: <UsersGroupIcon /> },
        { view: 'sales', text: 'Sales', icon: <ReceiptsIcon /> },
        { view: 'settings', text: 'Settings', icon: <SettingsIcon /> },
    ];

    return (
        <aside className="w-64 bg-gray-800 text-gray-300 flex flex-col">
            <div className="h-20 flex items-center justify-center text-2xl font-bold text-white tracking-wider">
                FinTab Admin
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map(item => (
                    <button
                        key={item.view}
                        onClick={() => setActiveView(item.view as AdminView)}
                        className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 group ${
                            activeView === item.view ? 'bg-gray-700 text-white' : 'hover:bg-gray-700/50'
                        }`}
                    >
                        {item.icon}
                        <span className="ml-4 font-medium">{item.text}</span>
                    </button>
                ))}
            </nav>
            <div className="px-4 py-3 border-t border-gray-700">
                <button onClick={onLogout} className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-gray-700/50">
                    <LogoutIcon />
                    <span className="ml-4 font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

const AdminHeader: React.FC<{ currentUser: User, title: string }> = ({ currentUser, title }) => (
    <header className="bg-white shadow-sm flex items-center justify-between h-20 px-6">
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        <div className="flex items-center gap-3">
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-12 h-12 rounded-full object-cover" />
            <div>
                <p className="font-semibold text-gray-800">{currentUser.name}</p>
                <p className="text-sm text-gray-500">{currentUser.role}</p>
            </div>
            <ChevronDownIcon />
        </div>
    </header>
);

const AdminStatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow flex items-center">
        <div className="bg-primary/10 text-primary p-3 rounded-lg">
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const DashboardView: React.FC<{ businesses: AdminBusinessData[] }> = ({ businesses }) => {
    const totalRevenue = useMemo(() => businesses.reduce((sum, b) => sum + b.stats.totalRevenue, 0), [businesses]);
    const totalUsers = useMemo(() => businesses.reduce((sum, b) => sum + b.stats.userCount, 0), [businesses]);
    
    const revenueByMonth = useMemo(() => {
        // This is a simplified simulation
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map(month => ({
            name: month,
            revenue: Math.random() * (totalRevenue / 3)
        }));
    }, [totalRevenue]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AdminStatCard title="Total Registered Businesses" value={businesses.length.toString()} icon={<BuildingIcon />} />
                <AdminStatCard title="Platform-Wide Revenue" value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<ReceiptsIcon />} />
                <AdminStatCard title="Total Users" value={totalUsers.toString()} icon={<UsersGroupIcon />} />
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Growth (Simulated)</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={revenueByMonth} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                            <Area type="monotone" dataKey="revenue" stroke="#2563EB" fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const BusinessesView: React.FC<{ initialBusinesses: AdminBusinessData[], onUpdate: (businesses: AdminBusinessData[]) => void }> = ({ initialBusinesses, onUpdate }) => {
    const [businesses, setBusinesses] = useState(initialBusinesses);
    const [managingBusiness, setManagingBusiness] = useState<AdminBusinessData | null>(null);
    
    const handleUpdateBusiness = (updatedBusiness: AdminBusinessData) => {
        const updatedList = businesses.map(b => b.id === updatedBusiness.id ? updatedBusiness : b);
        setBusinesses(updatedList);
        onUpdate(updatedList); // Propagate change up if needed (for persistence)
        setManagingBusiness(null);
    };

    const handleExport = () => {
        const dataToExport = businesses.map(b => ({
            business_id: b.id,
            business_name: b.profile.businessName,
            plan: b.licensingInfo.licenseType,
            trial_end_date: b.licensingInfo.trialEndDate,
            owner_name: b.owner.name,
            owner_email: b.owner.email,
            joined_date: b.stats.joinedDate,
            status: b.stats.status,
            total_revenue: b.stats.totalRevenue,
            sales_count: b.stats.salesCount,
            user_count: b.stats.userCount,
        }));
        exportToCsv('businesses_export.csv', dataToExport);
    };

    const getPlanBadge = (plan: LicensingInfo['licenseType']) => {
        const styles = {
            Premium: 'bg-green-100 text-green-800',
            Trial: 'bg-blue-100 text-blue-800',
            Free: 'bg-gray-200 text-gray-800',
        };
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[plan]}`}>{plan}</span>;
    };
    
    const getTrialCountdown = (licensingInfo: LicensingInfo) => {
        if (licensingInfo.licenseType === 'Premium') {
            return <span className="text-gray-500">N/A</span>;
        }
        if (licensingInfo.licenseType === 'Free') {
            return <span className="font-semibold text-red-600">Expired</span>;
        }
        const endDate = new Date(licensingInfo.trialEndDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            return <span className="font-semibold text-red-600">Expired</span>;
        }
        return <span className="font-semibold text-blue-600">{diffDays} days left</span>;
    };

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">All Registered Businesses</h3>
                    <button onClick={handleExport} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 text-sm">
                        Export to CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Business Name</th>
                                <th scope="col" className="px-6 py-3">Owner</th>
                                <th scope="col" className="px-6 py-3">Plan</th>
                                <th scope="col" className="px-6 py-3">Trial Ends</th>
                                <th scope="col" className="px-6 py-3">Total Revenue</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {businesses.map(b => (
                                <tr key={b.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                        <img src={b.profile.logo || `https://ui-avatars.com/api/?name=${b.profile.businessName.charAt(0)}&background=e0e7ff&color=4f46e5`} alt="logo" className="w-8 h-8 rounded-md object-cover" />
                                        {b.profile.businessName}
                                    </td>
                                    <td className="px-6 py-4">{b.owner.name}</td>
                                    <td className="px-6 py-4">{getPlanBadge(b.licensingInfo.licenseType)}</td>
                                    <td className="px-6 py-4">{getTrialCountdown(b.licensingInfo)}</td>
                                    <td className="px-6 py-4 font-semibold">${b.stats.totalRevenue.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => setManagingBusiness(b)} className="font-medium text-primary hover:underline">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <ManageBusinessModal
                isOpen={!!managingBusiness}
                onClose={() => setManagingBusiness(null)}
                business={managingBusiness}
                onSave={handleUpdateBusiness}
            />
        </>
    );
};

// Placeholder Views
const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <p className="mt-2">This section is under construction.</p>
    </div>
);


// --- Main AdminDashboard Component ---

interface AdminDashboardProps {
    currentUser: User;
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
    const [activeView, setActiveView] = useState<AdminView>('businesses');
    const [businesses, setBusinesses] = useState(() => getStoredItem('fintab_admin_businesses', DUMMY_ADMIN_BUSINESS_DATA));
    
    useEffect(() => {
        setStoredItem('fintab_admin_businesses', businesses);
    }, [businesses]);

    const viewTitles: Record<AdminView, string> = {
        dashboard: 'Admin Dashboard',
        businesses: 'Business Management',
        users: 'User Management',
        sales: 'Sales Analytics',
        settings: 'Platform Settings',
    };

    const renderActiveView = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardView businesses={businesses} />;
            case 'businesses':
                return <BusinessesView initialBusinesses={businesses} onUpdate={setBusinesses} />;
            case 'users':
                return <PlaceholderView title="User Management" />;
            case 'sales':
                return <PlaceholderView title="Sales Analytics" />;
            case 'settings':
                return <PlaceholderView title="Platform Settings" />;
            default:
                return null;
        }
    };

    return (
        <div className="h-screen flex bg-gray-100 font-sans">
            <AdminSidebar activeView={activeView} setActiveView={setActiveView} onLogout={onLogout} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminHeader currentUser={currentUser} title={viewTitles[activeView]} />
                <main className="flex-1 overflow-y-auto p-6">
                    {renderActiveView()}
                </main>
            </div>
        </div>
    );
};

// --- Modal for Managing Business ---
interface ManageBusinessModalProps {
    isOpen: boolean;
    onClose: () => void;
    business: AdminBusinessData | null;
    onSave: (updatedBusiness: AdminBusinessData) => void;
}
const ManageBusinessModal: React.FC<ManageBusinessModalProps> = ({ isOpen, onClose, business, onSave }) => {
    if (!isOpen || !business) return null;

    const handleUpgrade = () => {
        const updatedBusiness = {
            ...business,
            licensingInfo: { ...business.licensingInfo, licenseType: 'Premium' as const }
        };
        onSave(updatedBusiness);
    };

    const handleRevert = () => {
        const isTrialStillValid = new Date(business.licensingInfo.trialEndDate) > new Date();
        const updatedBusiness = {
            ...business,
            licensingInfo: { ...business.licensingInfo, licenseType: isTrialStillValid ? 'Trial' as const : 'Free' as const }
        };
        onSave(updatedBusiness);
    };
    
    const handleExtendTrial = (days: number) => {
        const trialEndDate = new Date(business.licensingInfo.trialEndDate);
        const startDate = trialEndDate > new Date() ? trialEndDate : new Date();

        const newEndDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
        
        const updatedBusiness = {
            ...business,
            licensingInfo: {
                ...business.licensingInfo,
                trialEndDate: newEndDate.toISOString(),
                licenseType: 'Trial' as const // Ensure it's a trial
            }
        };
        onSave(updatedBusiness);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <header className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Manage: {business.profile.businessName}</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </header>
                <div className="p-6 space-y-4">
                    <p>Current Plan: <strong className="text-primary">{business.licensingInfo.licenseType}</strong></p>
                    
                    <div className="space-y-2">
                        {business.licensingInfo.licenseType !== 'Premium' && (
                            <button onClick={handleUpgrade} className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600">Upgrade to Premium</button>
                        )}
                        {business.licensingInfo.licenseType === 'Premium' && (
                            <button onClick={handleRevert} className="w-full bg-yellow-500 text-white py-2 rounded-md hover:bg-yellow-600">Revert to Trial/Free</button>
                        )}
                    </div>

                    <div className="pt-4 border-t">
                        <p className="text-sm font-semibold mb-2">Extend Trial Period:</p>
                        <div className="flex justify-between gap-2">
                            <button onClick={() => handleExtendTrial(7)} className="flex-1 bg-blue-100 text-blue-800 py-2 rounded-md hover:bg-blue-200 text-sm">+ 7 Days</button>
                            <button onClick={() => handleExtendTrial(14)} className="flex-1 bg-blue-100 text-blue-800 py-2 rounded-md hover:bg-blue-200 text-sm">+ 14 Days</button>
                            <button onClick={() => handleExtendTrial(30)} className="flex-1 bg-blue-100 text-blue-800 py-2 rounded-md hover:bg-blue-200 text-sm">+ 30 Days</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;