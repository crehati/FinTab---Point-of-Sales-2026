
import React from 'react';
import type { User, Sale, ReceiptSettingsData, Withdrawal, BusinessProfile, CustomPayment, OwnerSettings, BusinessSettingsData, Expense, Customer, Product, CompanyValuation } from '../types';
import StaffProfile from './StaffProfile';
import OwnerProfile from './OwnerProfile';
import InvestorProfile from './InvestorProfile';

interface MyProfileProps {
    currentUser: User;
    users: User[];
    sales: Sale[];
    expenses: Expense[];
    customers: Customer[];
    products: Product[];
    receiptSettings: ReceiptSettingsData;
    t: (key: string) => string;
    onRequestWithdrawal: (userId: string, amount: number, source: 'commission' | 'investment') => void;
    handleUpdateCustomPaymentStatus: (targetUserId: string, paymentId: string, status: CustomPayment['status']) => void;
    handleInitiateCustomPayment: (targetUserId: string, amount: number, description: string) => void;
    businessProfile: BusinessProfile | null;
    ownerSettings: OwnerSettings;
    businessSettings: BusinessSettingsData;
    onUpdateWithdrawalStatus: (userId: string, withdrawalId: string, status: Withdrawal['status']) => void;
    onConfirmWithdrawalReceived: (userId: string, withdrawalId: string) => void;
    companyValuations: CompanyValuation[];
    onSwitchUser: (user: User) => void;
    onUpdateCurrentUserProfile: (profileData: { name?: string; avatarUrl?: string; phone?: string; initialInvestment?: number; }) => void;
}

const MyProfile: React.FC<MyProfileProps> = (props) => {
    const { currentUser } = props;

    // Strict role mapping ensures that each view is isolated and dedicated.
    // Switching identity triggers a complete component lifecycle restart.
    
    if (currentUser.role === 'Owner' || currentUser.role === 'Super Admin') {
        return <OwnerProfile {...props} />;
    }

    if (currentUser.role === 'Investor') {
        return <InvestorProfile {...props} />;
    }

    // Cashier, Manager, SellerAgent, and Custom roles all map to the Staff view
    return <StaffProfile {...props} />;
};

export default MyProfile;
