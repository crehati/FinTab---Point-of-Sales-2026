
import React, { useState, useEffect } from 'react';
import type { OwnerSettings } from '../types';
import Card from './Card';
import { CrownIcon } from '../constants';

interface OwnerSettingsProps {
    ownerSettings: OwnerSettings;
    onUpdate: (settings: OwnerSettings) => void;
    t: (key: string) => string;
}

const Toggle: React.FC<{ label: string; description: string; name: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, description, name, checked, onChange }) => (
    <div className="flex items-center justify-between p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md">
        <div className="flex-1 pr-4">
            <label htmlFor={name} className="font-black text-slate-900 dark:text-white uppercase tracking-tighter block mb-1">{label}</label>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">{description}</p>
        </div>
        <label htmlFor={name} className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" id={name} name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
                <div className={`block ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-gray-700'} w-14 h-8 rounded-full transition-colors`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${checked ? 'translate-x-6 shadow-lg' : ''}`}></div>
            </div>
        </label>
    </div>
);

const OwnerSettingsPage: React.FC<OwnerSettingsProps> = ({ ownerSettings, onUpdate, t }) => {
    // Correctly using ownerSettings and providing fallback to prevent Error Boundary triggers
    const [draft, setDraft] = useState<OwnerSettings>(ownerSettings || {
        commissionTrackingEnabled: true,
        includeInStaffReports: true,
        showOnLeaderboard: true
    });

    useEffect(() => {
        if (ownerSettings) {
            setDraft(ownerSettings);
        }
    }, [ownerSettings]);

    const handleSave = () => {
        onUpdate(draft);
        alert('Owner configuration applied successfully.');
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
                <div className="relative flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                        <CrownIcon />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('settings.owner.title')}</h2>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Manage your identity and logic overrides</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <Toggle 
                    label="Track Staff Commissions"
                    description="Enable or disable automated yield calculations for personnel nodes."
                    name="commissionTrackingEnabled"
                    checked={!!draft.commissionTrackingEnabled}
                    onChange={(val) => setDraft(p => ({ ...p, commissionTrackingEnabled: val }))}
                />
                <Toggle 
                    label="Include Owner in Reports"
                    description="Allow principal node activity to appear in aggregated staff productivity data."
                    name="includeInStaffReports"
                    checked={!!draft.includeInStaffReports}
                    onChange={(val) => setDraft(p => ({ ...p, includeInStaffReports: val }))}
                />
                <Toggle 
                    label="Show on Leaderboard"
                    description="Make the principal node visible on the transaction velocity rankings."
                    name="showOnLeaderboard"
                    checked={!!draft.showOnLeaderboard}
                    onChange={(val) => setDraft(p => ({ ...p, showOnLeaderboard: val }))}
                />
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSave}
                    className="px-10 py-5 bg-primary text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default OwnerSettingsPage;
