
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const GoBackButton: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Hide back button on the primary entry point (Dashboard)
    if (location.pathname === '/dashboard') return null;

    const handleGoBack = () => {
        // Safe navigation check: if history is shallow, default to the hub
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/dashboard', { replace: true });
        }
    };

    return (
        <button
            onClick={handleGoBack}
            className="p-2.5 rounded-2xl text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-gray-800 transition-all active:scale-90 flex items-center justify-center group"
            aria-label="Go back to previous menu"
            title="Return to Previous Node"
        >
            <div className="transition-transform group-hover:-translate-x-1">
                <ArrowLeftIcon />
            </div>
        </button>
    );
};

export default GoBackButton;
