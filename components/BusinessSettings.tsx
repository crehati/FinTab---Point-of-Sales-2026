
// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { BusinessSettingsData, BusinessProfile, User, WorkflowRoleKey, WorkflowRoleAssignment, AnomalySettings } from '../types';
import Card from './Card';
import DestructiveConfirmationModal from './DestructiveConfirmationModal';
import { CreditCardIcon, TruckIcon, CalculatorIcon, PlusIcon, DeleteIcon, ChevronDownIcon, InvestorIcon, BuildingIcon, StorefrontIcon, ProfileIcon, CloseIcon, COUNTRIES, LightBulbIcon, WarningIcon } from '../constants';
import { ShieldCheckIcon } from './Permissions';

interface BusinessSettingsProps {
    settings: BusinessSettingsData;
    onUpdateSettings: (settings: BusinessSettingsData) => void;
    businessProfile: BusinessProfile | null;
    onUpdateBusinessProfile: (profile: BusinessProfile | null) => void;
    onResetBusiness: () => void;
    t: (key: string) => string;
    currentUser: User;
    onUpdateCurrentUserProfile: (profileData: { name?: string; avatarUrl?: string; phone?: string; initialInvestment?: number; }) => void;
    users: User[];
}

// Fix: Declaring children as optional in SectionErrorBoundaryProps to resolve missing property error in JSX
interface SectionErrorBoundaryProps {
    children?: React.ReactNode;
    sectionTitle: string;
    onReportError?: (error: Error) => void;
}

interface SectionErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Section-level Error Boundary to prevent page-wide crashes
 */
class SectionErrorBoundary extends React.Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
    constructor(props: SectionErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    public static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
    public componentDidCatch(error: Error) {
        if (this.props.onReportError) this.props.onReportError(error);
    }
    public render() {
        if (this.state.hasError) {
            return (
                <div className="bg-rose-50 dark:bg-rose-950/20 border-2 border-dashed border-rose-100 dark:border-rose-900/50 rounded-[2.5rem] p-8 text-center">
                    <WarningIcon className="w-8 h-8 text-rose-500 mx-auto mb-4" />
                    <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest">{this.props.sectionTitle} Module Interrupted</h3>
                    <p className="text-[10px] text-rose-400 font-bold mt-2 uppercase tracking-tight leading-relaxed">
                        A rendering exception was intercepted in this node.<br/>
                        Diagnostic: {this.state.error?.message || 'Unknown Protocol Error'}
                    </p>
                    <div className="flex gap-3 justify-center mt-6">
                        <button onClick={() => this.setState({ hasError: false, error: null })} className="px-6 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">Retry Node</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const SectionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, description, icon, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-md overflow-hidden border border-slate-100 dark:border-gray-700">
        <div className="p-8 border-b bg-slate-50/50 dark:bg-gray-700/30">
            <div className="flex items-start gap-5">
                <div className="flex-shrink-0 text-primary p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">{icon}</div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{description}</p>
                </div>
            </div>
        </div>
        <div className="p-8 space-y-6">
            {children}
        </div>
    </div>
);

const Input: React.FC<any> = ({ name, label, ...props }) => (
  <div>
    <label htmlFor={name} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{label}</label>
    <input
      id={name}
      name={name}
      className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
      {...props}
    />
  </div>
);

const Toggle: React.FC<{ label: string; description: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, description, name, checked, onChange }) => (
    <div className="flex items-center justify-between p-4 rounded-3xl border border-slate-50 bg-slate-50/50 dark:bg-gray-900 dark:border-gray-700">
        <div className="flex-1 pr-4">
            <label htmlFor={name} className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{label}</label>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{description}</p>
        </div>
        <label htmlFor={name} className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" id={name} name={name} checked={checked} onChange={onChange} className="sr-only" />
                <div className={`block ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-gray-700'} w-12 h-7 rounded-full transition-colors`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform transform ${checked ? 'translate-x-5' : ''}`}></div>
            </div>
        </label>
    </div>
);

const WORKFLOW_ROLE_LABELS: Record<WorkflowRoleKey, { label: string; category: string }> = {
    cashCounter: { label: 'Cash Counter', category: 'Cash Verification' },
    cashVerifier: { label: 'Cash Verifier (2nd Sign)', category: 'Cash Verification' },
    cashApprover: { label: 'Cash Approver (Final)', category: 'Cash Verification' },
    receivingClerk: { label: 'Receiving Clerk', category: 'Goods Receiving' },
    receivingVerifier: { label: 'Receiving Verifier (2nd Sign)', category: 'Goods Receiving' },
    receivingApprover: { label: 'Receiving Approver (Final)', category: 'Goods Receiving' },
    costingManager: { label: 'Costing Manager', category: 'Goods Costing' },
    costingApprover: { label: 'Costing Approver (Final)', category: 'Goods Costing' },
    stockManager: { label: 'Stock Manager', category: 'Stock Audit' },
    stockVerifier: { label: 'Stock Verifier (2nd Sign)', category: 'Stock Audit' },
    stockApprover: { label: 'Stock Approver (Final)', category: 'Stock Audit' },
};

const BusinessSettings: React.FC<BusinessSettingsProps> = ({ settings, onUpdateSettings, businessProfile, onUpdateBusinessProfile, onResetBusiness, t, currentUser, onUpdateCurrentUserProfile, users }) => {
    // Robust state initialization with fallbacks
    const [draftSettings, setDraftSettings] = useState<any>(settings || { paymentMethods: [] });
    const [draftProfile, setDraftProfile] = useState<any>(businessProfile || {});
    const [draftOwner, setDraftOwner] = useState<any>({ name: '', avatarUrl: '', initialInvestment: 0 });
    const [ownerPhone, setOwnerPhone] = useState({ countryCode: '+1', localPhone: '' });
    const [newPaymentMethod, setNewPaymentMethod] = useState('');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
    
    const businessLogoInputRef = useRef<HTMLInputElement>(null);
    const ownerAvatarInputRef = useRef<HTMLInputElement>(null);

    const shopfrontUrl = useMemo(() => `${window.location.origin}${window.location.pathname}#/public-shopfront/${businessProfile?.id || 'unknown'}`, [businessProfile?.id]);

    useEffect(() => { if (settings) setDraftSettings(settings); }, [settings]);
    useEffect(() => { if (businessProfile) setDraftProfile(businessProfile); }, [businessProfile]);
    
    useEffect(() => {
        if (currentUser) {
            setDraftOwner({
                name: currentUser.name || '',
                avatarUrl: currentUser.avatarUrl || '',
                initialInvestment: currentUser.initialInvestment || 0
            });
            const phone = currentUser.phone || '';
            const country = COUNTRIES.find(c => phone.startsWith(c.dial_code));
            if (country) {
                setOwnerPhone({ countryCode: country.dial_code, localPhone: phone.substring(country.dial_code.length) });
            } else {
                setOwnerPhone({ countryCode: '+1', localPhone: phone.replace(/\D/g, '') });
            }
        }
    }, [currentUser]);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const keys = name.split('.');
        
        setDraftSettings((prev: any) => {
            const newSettings = JSON.parse(JSON.stringify(prev || {}));
            let current = newSettings;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            if (type === 'checkbox') {
                current[keys[keys.length - 1]] = checked;
            } else {
                const numericKeys = ['cashDiffThreshold', 'cashDiffPercentage', 'receivingMismatchThreshold', 'marginMin', 'marginMax', 'costChangeThreshold', 'expectedSubmissionHourEnd'];
                const val = numericKeys.includes(keys[keys.length-1]) ? parseFloat(value) || 0 : value;
                current[keys[keys.length - 1]] = val;
            }
            return newSettings;
        });
    };
    
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setDraftProfile((prev: any) => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleBusinessLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setDraftProfile((prev: any) => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDraftOwner((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleOwnerPhoneChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setOwnerPhone(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleOwnerAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setDraftOwner((prev: any) => ({ ...prev, avatarUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddPaymentMethod = () => {
        if (newPaymentMethod.trim() && !(draftSettings.paymentMethods || []).includes(newPaymentMethod.trim())) {
            setDraftSettings((prev: any) => ({ ...prev, paymentMethods: [...(prev.paymentMethods || []), newPaymentMethod.trim()] }));
            setNewPaymentMethod('');
        }
    };

    const handleRemovePaymentMethod = (methodToRemove: string) => {
        setDraftSettings((prev: any) => ({ ...prev, paymentMethods: (prev.paymentMethods || []).filter((method: string) => method !== methodToRemove) }));
    };
    
    const handleSave = () => {
        try {
            if (currentUser.role === 'Owner') {
                const ownerFullPhoneNumber = `${ownerPhone.countryCode}${ownerPhone.localPhone.replace(/\D/g, '')}`;
                onUpdateCurrentUserProfile({
                    name: draftOwner.name,
                    avatarUrl: draftOwner.avatarUrl,
                    phone: ownerFullPhoneNumber,
                    initialInvestment: parseFloat(String(draftOwner.initialInvestment)) || 0,
                });
            }
            
            const settingsToSave: BusinessSettingsData = {
                ...draftSettings,
                defaultTaxRate: parseFloat(String(draftSettings.defaultTaxRate)) || 0,
                investorProfitWithdrawalRate: parseInt(String(draftSettings.investorProfitWithdrawalRate)) || 0,
                investorDistributionPercentage: parseInt(String(draftSettings.investorDistributionPercentage)) || 100,
            };
            onUpdateSettings(settingsToSave);
            onUpdateBusinessProfile(draftProfile as BusinessProfile | null);
            alert('Protocol Sync Successful: Terminal settings updated.');
        } catch (err) {
            console.error("Save failure:", err);
            alert("Digital Logic Error: Could not commit settings to local ledger.");
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shopfrontUrl).then(() => {
            setCopySuccess(t('shopfront.copied'));
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            alert('Communication failure: Could not copy link.');
        });
    };

    const handleWorkflowRoleAssignment = (roleKey: WorkflowRoleKey, userId: string) => {
        const allowMultiple = draftSettings.allowMultipleAssigneesPerWorkflowRole || false;
        const currentRoles = JSON.parse(JSON.stringify(draftSettings.workflowRoles || {}));
        const assignments = currentRoles[roleKey] || [];

        if (userId === 'none') {
            currentRoles[roleKey] = [];
        } else if (allowMultiple) {
            if (!assignments.find((a: any) => a.userId === userId)) {
                currentRoles[roleKey] = [...assignments, { userId, assignedBy: currentUser.name, assignedAt: new Date().toISOString() }];
            }
        } else {
            currentRoles[roleKey] = [{ userId, assignedBy: currentUser.name, assignedAt: new Date().toISOString() }];
        }

        setDraftSettings({ ...draftSettings, workflowRoles: currentRoles });
    };

    const handleRemoveWorkflowRoleAssignment = (roleKey: WorkflowRoleKey, userId: string) => {
        const currentRoles = JSON.parse(JSON.stringify(draftSettings.workflowRoles || {}));
        const assignments = currentRoles[roleKey] || [];
        currentRoles[roleKey] = assignments.filter((a: any) => a.userId !== userId);
        setDraftSettings({ ...draftSettings, workflowRoles: currentRoles });
    };

    const copyDiagnostics = () => {
        const data = {
            settings,
            profile: businessProfile,
            currentUser: { id: currentUser.id, role: currentUser.role },
            usersCount: users.length,
            errors: sectionErrors,
            version: "FT-OS-1.0.4"
        };
        navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => alert("Diagnostic payload copied to clipboard."));
    };

    const isPrivileged = currentUser.role === 'Owner' || currentUser.role === 'Super Admin';

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-32 animate-fade-in font-sans">
            <SectionErrorBoundary sectionTitle="Owner Node" onReportError={(err) => setSectionErrors(p => ({ ...p, owner: err.message }))}>
                {currentUser.role === 'Owner' && (
                    <SectionCard title="Principal Identity" description="Update your personal terminal authentication and equity stake." icon={<ProfileIcon />}>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="md:col-span-2">
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Identity Avatar</label>
                                 <div className="flex items-center gap-6">
                                     <img src={draftOwner.avatarUrl || 'https://ui-avatars.com/api/?name=User'} alt="Owner Avatar" className="w-20 h-20 rounded-[2rem] object-cover shadow-md border-4 border-slate-50 dark:border-gray-700" />
                                     <div className="space-y-2">
                                         <input type="file" accept="image/*" ref={ownerAvatarInputRef} onChange={handleOwnerAvatarUpload} className="hidden" />
                                         <button type="button" onClick={() => ownerAvatarInputRef.current?.click()} className="bg-white dark:bg-gray-800 py-3 px-6 border-2 border-slate-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">Upload New</button>
                                     </div>
                                 </div>
                             </div>
                            <Input name="name" label="Legal Full Name" value={draftOwner.name} onChange={handleOwnerChange} required />
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Mobile Credential</label>
                                <div className="flex rounded-2xl bg-slate-50 dark:bg-gray-900 border-none overflow-hidden focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                    <select name="countryCode" value={ownerPhone.countryCode} onChange={handleOwnerPhoneChange} className="bg-transparent border-none text-sm font-bold pl-4 w-32 outline-none">
                                        {COUNTRIES.map(c => <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>)}
                                    </select>
                                    <input type="tel" name="localPhone" value={ownerPhone.localPhone} onChange={handleOwnerPhoneChange} className="flex-1 bg-transparent border-none p-4 text-sm font-bold outline-none" placeholder="5551234567" />
                                </div>
                            </div>
                            <Input name="initialInvestment" label="Capital Injection Value" value={draftOwner.initialInvestment} onChange={handleOwnerChange} required type="number" />
                        </div>
                    </SectionCard>
                )}
            </SectionErrorBoundary>

            <SectionErrorBoundary sectionTitle="Profile Node" onReportError={(err) => setSectionErrors(p => ({ ...p, profile: err.message }))}>
                <SectionCard title="Business Profile" description="Authorized company identity for public and internal ledgers." icon={<BuildingIcon />}>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Input name="businessName" label="Business Descriptor" value={draftProfile?.businessName || ''} onChange={handleProfileChange} required />
                        <Input name="businessEmail" label="Official Communication Email" value={draftProfile?.businessEmail || ''} onChange={handleProfileChange} required type="email" />
                        <Input name="businessPhone" label="Contact Mobile" value={draftProfile?.businessPhone || ''} onChange={handleProfileChange} required type="tel" />
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Company Seal / Logo</label>
                            <div className="flex items-center gap-6">
                                <span className="inline-block h-16 w-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-gray-800 border-2 border-slate-50 shadow-inner">
                                    {draftProfile?.logo ? <img src={draftProfile.logo} alt="Logo" className="h-full w-full object-contain" /> : <svg className="h-full w-full text-slate-300 p-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM11.99 15.89l-2.6-3.07L6 16.22h12l-3.37-4.48-2.64 3.15z"/></svg>}
                                </span>
                                <input type="file" accept="image/*" ref={businessLogoInputRef} onChange={handleBusinessLogoUpload} className="hidden" />
                                <button type="button" onClick={() => businessLogoInputRef.current?.click()} className="bg-white dark:bg-gray-800 py-3 px-6 border-2 border-slate-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                                    Upload Seal
                                </button>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary sectionTitle="AI Node" onReportError={(err) => setSectionErrors(p => ({ ...p, ai: err.message }))}>
                <SectionCard title="Anomaly Detection Protocols" description="Algorithmic safety limits for financial and operational auditing." icon={<LightBulbIcon />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        <div className="space-y-6">
                            <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.3em] border-b border-primary/10 pb-2">Settlement Rules</h4>
                            <Input name="anomalies.cashDiffThreshold" label="Max Absolute Variance ($)" type="number" step="0.01" value={draftSettings.anomalies?.cashDiffThreshold ?? 10} onChange={handleSettingsChange} />
                            <Input name="anomalies.cashDiffPercentage" label="Max Percentage Variance (%)" type="number" step="0.1" value={draftSettings.anomalies?.cashDiffPercentage ?? 1} onChange={handleSettingsChange} />
                            <Input name="anomalies.expectedSubmissionHourEnd" label="Cut-off Hour (24h Limit)" type="number" step="1" min="0" max="23" value={draftSettings.anomalies?.expectedSubmissionHourEnd ?? 21} onChange={handleSettingsChange} />
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] border-b border-rose-500/10 pb-2">Yield Protocols</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input name="anomalies.marginMin" label="Min Bound (%)" type="number" step="1" value={draftSettings.anomalies?.marginMin ?? 10} onChange={handleSettingsChange} />
                                <Input name="anomalies.marginMax" label="Max Bound (%)" type="number" step="1" value={draftSettings.anomalies?.marginMax ?? 200} onChange={handleSettingsChange} />
                            </div>
                            <Input name="anomalies.costChangeThreshold" label="Max Single Unit Shift (%)" type="number" step="1" value={draftSettings.anomalies?.costChangeThreshold ?? 30} onChange={handleSettingsChange} />
                        </div>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary sectionTitle="Workflow Node" onReportError={(err) => setSectionErrors(p => ({ ...p, workflow: err.message }))}>
                <SectionCard title="Workflow Authorizations" description="Delegation of financial and logistics signatures to staff units." icon={<ShieldCheckIcon className="w-7 h-7" />}>
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Toggle 
                                label="Multi-Agent Assignments"
                                description="Enable multiple users for identical verification roles."
                                name="allowMultipleAssigneesPerWorkflowRole"
                                checked={draftSettings.allowMultipleAssigneesPerWorkflowRole || false}
                                onChange={handleSettingsChange}
                            />
                            <Toggle 
                                label="Enforce Unique Signers"
                                description="Dual-signatures must originate from different identities."
                                name="enforceUniqueSigners"
                                checked={draftSettings.enforceUniqueSigners !== false}
                                onChange={handleSettingsChange}
                            />
                        </div>

                        <div className="divide-y dark:divide-gray-700">
                            {Object.entries(WORKFLOW_ROLE_LABELS).map(([key, { label, category }]) => {
                                const assignments = (draftSettings.workflowRoles?.[key] || []);
                                return (
                                    <div key={key} className="py-6 first:pt-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{category}</p>
                                                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm mt-0.5">{label}</h4>
                                            </div>
                                            <select 
                                                value="none" 
                                                onChange={(e) => handleWorkflowRoleAssignment(key as WorkflowRoleKey, e.target.value)}
                                                className="bg-slate-50 dark:bg-gray-900 border-none rounded-2xl text-[10px] font-bold uppercase tracking-widest px-6 py-3 outline-none focus:ring-4 focus:ring-primary/10"
                                            >
                                                <option value="none">Assign Unit...</option>
                                                {(users || []).map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {assignments.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                                {assignments.map((a: any) => {
                                                    const u = users.find(user => user.id === a.userId);
                                                    return (
                                                        <div key={a.userId} className="inline-flex items-center gap-3 bg-slate-50 dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl px-4 py-2 group">
                                                            <img src={u?.avatarUrl || 'https://ui-avatars.com/api/?name=User'} className="w-5 h-5 rounded-full object-cover shadow-sm" />
                                                            <div>
                                                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate block">{u?.name || 'Unknown Unit'}</span>
                                                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">By {a.assignedBy}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleRemoveWorkflowRoleAssignment(key as WorkflowRoleKey, a.userId)}
                                                                className="ml-2 text-slate-300 hover:text-rose-500 transition-colors"
                                                                title="Revoke Role"
                                                            >
                                                                <CloseIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>
            
            <SectionErrorBoundary sectionTitle="Equity Node" onReportError={(err) => setSectionErrors(p => ({ ...p, equity: err.message }))}>
                <SectionCard title="Equity & Capital Pooling" description="Manage integration protocols for owner and investor capital." icon={<InvestorIcon />}>
                    <Toggle 
                        label="Include Owner in Distributive Pool"
                        description="Principal owner is treated as a capital participant for profit sharing."
                        name="includeOwnerInProfitSharing"
                        checked={draftSettings.includeOwnerInProfitSharing ?? true}
                        onChange={handleSettingsChange}
                    />
                </SectionCard>
            </SectionErrorBoundary>

            <SectionErrorBoundary sectionTitle="Digital Shopfront Node" onReportError={(err) => setSectionErrors(p => ({ ...p, shopfront: err.message }))}>
                <SectionCard title="Digital Shopfront" description="Public presence and remote order acceptance protocols." icon={<StorefrontIcon />}>
                    <div className="space-y-4">
                        <Toggle 
                            label="Authorize Public Directory Listing"
                            description="Make business discoverable in global terminal index."
                            name="isPublic"
                            checked={draftProfile?.isPublic || false}
                            onChange={handleProfileChange}
                        />
                         <Toggle 
                            label="Accept Remote Client Orders"
                            description="Enable order requests from public shopfront interface."
                            name="acceptRemoteOrders"
                            checked={draftSettings.acceptRemoteOrders || false}
                            onChange={handleSettingsChange}
                        />
                    </div>
                    <div className="pt-6 border-t dark:border-gray-700">
                        <label htmlFor="shopfront-url" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Public Terminal Endpoint</label>
                        <div className="flex bg-slate-50 dark:bg-gray-900 rounded-2xl overflow-hidden border-2 border-transparent focus-within:border-primary/20 transition-all">
                            <input id="shopfront-url" type="text" readOnly value={shopfrontUrl} className="flex-1 bg-transparent border-none px-4 py-4 text-xs font-bold text-slate-500 outline-none" />
                            <button onClick={handleCopyLink} className="px-6 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">
                                {copySuccess || 'Copy URI'}
                            </button>
                        </div>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>
            
            <SectionErrorBoundary sectionTitle="Payment Node" onReportError={(err) => setSectionErrors(p => ({ ...p, payments: err.message }))}>
                <SectionCard title="Settlement Methods" description="Accepted financial protocols at checkout." icon={<CreditCardIcon />}>
                    <div className="flex flex-wrap gap-3">
                        {(draftSettings.paymentMethods || []).map((method: string) => (
                            <div key={method} className="flex items-center gap-3 bg-primary/5 text-primary border border-primary/10 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl">
                                {method}
                                <button onClick={() => handleRemovePaymentMethod(method)} className="text-primary/40 hover:text-rose-500 transition-colors">
                                    <CloseIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 pt-6 border-t dark:border-gray-700 mt-6">
                        <input type="text" value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} placeholder="e.g. Mobile Payout" className="flex-grow bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold outline-none" />
                        <button onClick={handleAddPaymentMethod} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex-shrink-0">
                            Enroll Protocol
                        </button>
                    </div>
                </SectionCard>
            </SectionErrorBoundary>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SectionErrorBoundary sectionTitle="Accounting Node" onReportError={(err) => setSectionErrors(p => ({ ...p, tax: err.message }))}>
                    <Card title="Taxation (%)" className="rounded-[2rem] shadow-md border-none">
                        <input type="number" name="defaultTaxRate" value={draftSettings.defaultTaxRate ?? 0} onChange={handleSettingsChange} step="0.01" min="0" className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-lg font-black tabular-nums outline-none focus:ring-4 focus:ring-primary/10" />
                    </Card>
                </SectionErrorBoundary>
                <SectionErrorBoundary sectionTitle="Payout Node" onReportError={(err) => setSectionErrors(p => ({ ...p, payout: err.message }))}>
                    <Card title="Payout Rate (%)" className="rounded-[2rem] shadow-md border-none">
                        <input type="number" name="investorProfitWithdrawalRate" value={draftSettings.investorProfitWithdrawalRate ?? 0} onChange={handleSettingsChange} step="1" min="0" max="100" className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-lg font-black tabular-nums outline-none focus:ring-4 focus:ring-primary/10" />
                    </Card>
                </SectionErrorBoundary>
                <SectionErrorBoundary sectionTitle="Pool Node" onReportError={(err) => setSectionErrors(p => ({ ...p, pool: err.message }))}>
                    <Card title="Pool Share (%)" className="rounded-[2rem] shadow-md border-none">
                        <input type="number" name="investorDistributionPercentage" value={draftSettings.investorDistributionPercentage ?? 100} onChange={handleSettingsChange} step="1" min="0" max="100" className="w-full bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-lg font-black tabular-nums outline-none focus:ring-4 focus:ring-primary/10" />
                    </Card>
                </SectionErrorBoundary>
            </div>

            {/* Principal Command Center (Fixed) */}
            <div className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 z-[50] flex flex-col items-end gap-4">
                {showDiagnostics && (
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border border-white/10 w-full max-w-sm mb-4 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            {/* Fix: Added missing opening tag for h4 element */}
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Terminal Diagnostics</h4>
                            <button onClick={() => setShowDiagnostics(false)}><CloseIcon className="w-4 h-4 text-slate-500" /></button>
                        </div>
                        <div className="space-y-4 mb-8">
                             <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-400">STATE:</span> <span className="text-success uppercase">Operational</span></div>
                             <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-400">IDENTITIES:</span> <span>{(users || []).length} Units</span></div>
                             <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-400">FAULTS:</span> <span className={Object.keys(sectionErrors).length > 0 ? 'text-rose-500' : 'text-slate-500'}>{Object.keys(sectionErrors).length} Nodes</span></div>
                        </div>
                        <button onClick={copyDiagnostics} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Copy Diagnostic Payload</button>
                    </div>
                )}
                <div className="flex gap-4">
                    {isPrivileged && (
                        <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="p-5 bg-white dark:bg-gray-900 text-slate-400 rounded-full shadow-2xl border dark:border-gray-800 transition-all hover:text-primary active:scale-90">
                            <LightBulbIcon className="w-6 h-6" />
                        </button>
                    )}
                    <button onClick={handleSave} className="px-12 py-5 bg-primary text-white rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/30 hover:bg-blue-700 hover:-translate-y-1 transition-all active:translate-y-0 active:scale-95">
                        Authorize Global Sync
                    </button>
                </div>
            </div>

            <div className="mt-20 border-t-4 border-rose-500/20 pt-10 px-4">
                <div className="flex flex-col md:flex-row justify-between items-center bg-rose-50 dark:bg-rose-950/20 p-10 rounded-[3rem] border border-rose-100 dark:border-rose-900/50 gap-10">
                    <div className="text-center md:text-left">
                        <h4 className="text-xl font-black text-rose-600 uppercase tracking-tighter">Terminal Reset Protocol</h4>
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-2">DANGER: Permanent WIPE of all local ledger data and identities.</p>
                    </div>
                    <button onClick={() => setIsResetModalOpen(true)} className="px-10 py-5 bg-rose-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-rose-700 active:scale-95 transition-all flex-shrink-0">
                        Execute Factory Reset
                    </button>
                </div>
            </div>

            <DestructiveConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={onResetBusiness}
                title="TERMINAL PURGE REQUEST"
                message="Confirming this will erase all sales, inventory, and users. This action cannot be revoked from the digital record."
                confirmationPhrase="PURGE"
                t={t}
            />
        </div>
    );
};

export default BusinessSettings;
