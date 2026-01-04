
export interface Syncable {
  syncStatus?: 'pending' | 'synced';
  lastUpdated?: string;
  isDeleted?: boolean;
}

export interface BankAccount extends Syncable {
    id: string;
    bankName: string;
    accountName: string;
    accountNumber?: string;
    balance: number;
    status: 'Active' | 'Inactive';
}

export interface BankTransaction extends Syncable {
    id: string;
    date: string;
    bankAccountId: string;
    type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'sale_credit';
    amount: number;
    description: string;
    referenceId?: string; // Sale ID or Transfer ID
    userId: string;
}

export interface StockAdjustment {
  date: string;
  userId: string;
  type: 'add' | 'remove';
  quantity: number;
  reason: string;
  newStockLevel: number;
}

export interface WorkflowRoleAssignment {
  userId: string;
  assignedBy: string;
  assignedAt: string;
}

export type WorkflowRoleKey = 
  | 'cashCounter' | 'cashVerifier' | 'cashApprover'
  | 'receivingClerk' | 'receivingVerifier' | 'receivingApprover'
  | 'costingManager' | 'costingApprover'
  | 'stockManager' | 'stockVerifier' | 'stockApprover';

export type WorkflowRoles = Record<WorkflowRoleKey, WorkflowRoleAssignment[]>;

export interface AnomalySettings {
  cashDiffThreshold: number;
  cashDiffPercentage: number;
  receivingMismatchThreshold: number;
  marginMin: number;
  marginMax: number;
  costChangeThreshold: number;
  expectedSubmissionHourEnd: number;
  weeklyCheckCount: number;
}

export interface AnomalyAlert extends Syncable {
  id: string;
  type: 'cash' | 'costing' | 'receiving' | 'inventory_audit';
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  recommendation: string;
  recordId: string;
  timestamp: string;
  isDismissed: boolean;
  isRead?: boolean;
  dismissalReason?: string;
}

export interface InventoryCheckItem {
  productId: string;
  productName: string;
  productNumber: string;
  systemQty: number;
  physicalQty: number | null;
  difference: number;
  notes: string;
}

export type InventoryCheckStatus = 'draft' | 'checked' | 'verified' | 'accepted' | 'flagged';

export interface WeeklyInventoryCheck extends Syncable {
  id: string;
  date: string;
  items: InventoryCheckItem[];
  status: InventoryCheckStatus;
  signatures: {
    manager?: CashCountSignature;
    verifier?: CashCountSignature;
    approver?: CashCountSignature;
  };
  auditLog: AuditEntry[];
}

export type BusinessSettingsData = Syncable & {
  paymentMethods: string[];
  defaultTaxRate: number;
  rounding: {
    enabled: boolean;
    toNearest: number;
  };
  delivery: {
    enabled: boolean;
    fee: number;
  };
  investorProfitWithdrawalRate: number;
  investorDistributionPercentage: number;
  includeOwnerInProfitSharing: boolean;
  acceptRemoteOrders?: boolean;
  workflowRoles?: WorkflowRoles;
  allowMultipleAssigneesPerWorkflowRole?: boolean;
  enforceUniqueSigners?: boolean;
  anomalies?: AnomalySettings;
}

export type BusinessProfile = Syncable & {
    id?: string;
    businessName: string;
    dateEstablished: string;
    employeeCount: string;
    businessType: string;
    website?: string;
    businessEmail: string;
    businessPhone: string;
    logo?: string | null;
    isPublic?: boolean;
}

export interface ProductVariant {
  id: string;
  attributes: { name: string; value: string }[];
  price: number;
  costPrice: number;
  stock: number;
  sku?: string;
}

export type Product = Syncable & {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  imageUrl: string;
  commissionPercentage: number;
  tieredPricing?: Array<{ quantity: number; price: number; }>;
  stockHistory?: StockAdjustment[];
  productType?: 'simple' | 'variable';
  variantOptions?: Array<{ name: string; values: string[] }>;
  variants?: ProductVariant[];
}

export type Customer = Syncable & {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  purchaseHistory: Sale[];
}

export interface AuditEntry {
    timestamp: string;
    status: string;
    actorId: string;
    actorName: string;
    note?: string;
    changes?: any;
}

export interface Withdrawal {
    id: string;
    date: string;
    amount: number;
    status: 'pending' | 'approved_by_owner' | 'rejected' | 'completed' | 'cancelled_by_user';
    source: 'commission' | 'investment' | 'compensation';
    notes?: string;
    auditLog: AuditEntry[];
    approvalReference?: string;
}

export interface CustomPayment {
    id: string;
    dateInitiated: string;
    amount: number;
    description: string;
    status: 'pending_owner_approval' | 'rejected_by_owner' | 'approved_by_owner' | 'completed' | 'cancelled_by_user';
    initiatedBy: string;
    notes?: string;
    auditLog: AuditEntry[];
    approvalReference?: string;
}

export type Deposit = Syncable & {
    id: string;
    date: string;
    amount: number;
    description: string;
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    bankAccountId?: string;
}

export type Role = 'Owner' | 'Admin' | 'Manager' | 'Staff' | 'Investor' | 'Custom' | 'Cashier' | 'SellerAgent' | 'BankVerifier' | 'Super Admin';

export interface AttendanceRecord {
    clockIn: string;
    clockOut?: string;
}

export type User = Syncable & {
  id: string;
  name: string;
  role: Role;
  role_label?: string;
  /* Support for custom role labels when role is 'Custom' */
  customRoleName?: string;
  permissions?: UserPermissions;
  permissions_version?: number;
  email: string;
  avatarUrl: string;
  type: 'hourly' | 'commission';
  hourlyRate?: number;
  attendance?: AttendanceRecord[];
  withdrawals?: Withdrawal[];
  customPayments?: CustomPayment[];
  status?: 'Active' | 'Invited' | 'Pending Verification';
  initialInvestment?: number;
  investmentDate?: string;
  phone?: string;
  permission_audit?: AuditEntry[];
}

export type PerformanceUser = User & {
    salesCount: number;
    totalSalesValue: number;
    totalCommission: number;
    totalHours: number;
    totalHourlyEarnings: number;
    totalWithdrawals: number;
};

export type CartItem = {
  product: Product;
  variant?: ProductVariant;
  stock: number;
  quantity: number;
}

export type Sale = Syncable & {
  id: string;
  date: string;
  items: CartItem[];
  customerId: string;
  userId: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  taxRate?: number;
  commission?: number;
  status: 'completed' | 'proforma' | 'pending_approval' | 'rejected' | 'client_order' | 'approved_by_owner' | 'pending_bank_verification' | 'completed_bank_verified' | 'rejected_bank_not_verified';
  bankReceiptNumber?: string;
  bankName?: string;
  bankAccountId?: string;
  verificationNote?: string;
  cashReceived?: number;
  change?: number;
  businessId?: string;
  businessName?: string;
  businessPhone?: string;
  discountPercentage?: number;
  auditLog?: AuditEntry[];
  inventory_deducted?: boolean;
}

export type Expense = Syncable & {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status?: 'active' | 'deleted';
  requestId?: string;
}

export type ExpenseRequest = Syncable & {
  id: string;
  date: string;
  userId: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Other';
  merchant?: string;
  attachment?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  auditLog?: AuditEntry[];
}

export interface CashCountSignature {
    userId: string;
    userName: string;
    role: Role;
    timestamp: string;
}

export type CashCountStatus = 'draft' | 'first_signed' | 'second_signed' | 'accepted' | 'rejected';

export type CashCount = Syncable & {
    id: string;
    date: string;
    systemTotal: number;
    countedTotal: number;
    difference: number;
    status: CashCountStatus;
    notes?: string;
    signatures: {
        first?: CashCountSignature;
        second?: CashCountSignature;
    };
    ownerAudit?: {
        userId: string;
        userName: string;
        timestamp: string;
        status: 'accepted' | 'rejected';
        note?: string;
    };
    auditLog: AuditEntry[];
}

export interface GoodsCosting {
    id: string;
    date: string;
    productNumber: string;
    productName: string;
    quantity: number;
    buyingUnitPrice: number;
    additionalCosts: {
        taxes: number;
        shipping: number;
        transport: number;
        labor: number;
        transferFees: number;
        other: number;
        otherNote: string;
    };
    totalBuyingAmount: number;
    totalAdditionalCosts: number;
    totalLandedCost: number;
    unitCost: number;
    marginPercentage: number;
    suggestedSellingPrice: number;
    linkedProductId?: string;
    status: 'draft' | 'first_signed' | 'second_signed' | 'accepted' | 'rejected';
    signatures: {
        first?: CashCountSignature;
        second?: CashCountSignature;
    };
    ownerAudit?: {
        userId: string;
        userName: string;
        timestamp: string;
        status: 'accepted' | 'rejected';
        note?: string;
    };
    auditLog: AuditEntry[];
}

export interface GoodsReceiving {
    id: string;
    date: string;
    refNumber: string;
    productNumber: string;
    productName: string;
    expectedQty: number;
    receivedQty: number;
    difference: number;
    status: 'draft' | 'first_signed' | 'second_signed' | 'accepted' | 'rejected';
    notes?: string;
    signatures: {
        first?: CashCountSignature;
        second?: CashCountSignature;
    };
    ownerAudit?: {
        userId: string;
        userName: string;
        timestamp: string;
        status: 'accepted' | 'rejected';
        note?: string;
    };
    auditLog: AuditEntry[];
    linkedProductId?: string;
}

export type ReceiptSettingsData = Syncable & {
  logo: string | null;
  businessName: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currencySymbol: string;
  receiptPrefix: string;
  social: { twitter: string; instagram: string; };
  receiptTitle: string;
  thankYouNote: string;
  termsAndConditions: string;
  labels: Record<string, string>;
}

export type OwnerSettings = Syncable & {
  commissionTrackingEnabled: boolean;
  includeInStaffReports: boolean;
  showOnLeaderboard: boolean;
}

export interface CompanyValuation {
    date: string;
    valuation: number;
}

export interface LicensingInfo {
    licenseType: 'Free' | 'Trial' | 'Premium';
    enrollmentDate: string;
    trialEndDate: string;
}

export interface AdminBusinessData {
    id: string;
    profile: BusinessProfile;
    licensingInfo: LicensingInfo;
    settings: {
        acceptRemoteOrders: boolean;
    };
    owner: {
        name: string;
        email: string;
    };
    stats: {
        totalRevenue: number;
        salesCount: number;
        userCount: number;
        joinedDate: string;
        status: 'Active' | 'Suspended';
    };
}

/**
 * MODULE-BASED PERMISSION MATRIX SYSTEM
 */

export type ModuleKey = 
  | 'SALES' 
  | 'INVENTORY' 
  | 'RECEIPTS' 
  | 'CUSTOMERS' 
  | 'EXPENSES'
  | 'EXPENSE_REQUESTS'
  | 'COMMISSIONS' 
  | 'INVESTORS' 
  | 'REPORTS' 
  | 'FINANCE' 
  | 'SETTINGS'
  | 'AI';

export type UserPermissions = Partial<Record<ModuleKey, Record<string, boolean>>>;

export interface AppPermissions {
    roles: Partial<Record<Role, UserPermissions>>;
    users: Record<string, UserPermissions>;
}

export interface PrinterSettingsData {
    autoPrint: boolean;
}

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    link?: string;
    type: 'info' | 'action_required' | 'success' | 'warning' | 'error' | 'payment' | 'system' | 'order' | 'expense_request';
}
