import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, compact = false }) => {
    return (
        <div className={`flex flex-col items-center justify-center text-center font-sans ${compact ? 'py-12' : 'py-32'}`}>
            <div className={`bg-slate-50 dark:bg-gray-800/50 rounded-[2.5rem] flex items-center justify-center mb-6 opacity-40 ${compact ? 'p-6' : 'p-10'}`}>
                {/* Fix: Added React.isValidElement check and cast to React.ReactElement<any> to resolve the 'className' property type error */}
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { 
                    className: `${compact ? 'w-10 h-10' : 'w-16 h-16'} text-slate-300` 
                }) : icon}
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.4em] text-[11px]">
                {title}
            </h3>
            {description && (
                <p className="mt-3 text-slate-400 dark:text-slate-500 text-xs font-medium max-w-[240px] mx-auto leading-relaxed">
                    {description}
                </p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-8 px-8 py-3 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;