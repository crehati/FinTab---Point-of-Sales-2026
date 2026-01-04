import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPortalProps {
    hasBusinesses: boolean;
}

const LoginPortal: React.FC<LoginPortalProps> = ({ hasBusinesses }) => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-light dark:bg-gray-900 p-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-wider text-primary">FinTab</h1>
                    <p className="mt-2 text-neutral-medium dark:text-gray-400">Please select your login type.</p>
                </div>
                
                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/login')}
                        disabled={!hasBusinesses}
                        className="w-full bg-primary text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md transform active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {hasBusinesses ? 'Login to a Business' : 'No Businesses Found'}
                    </button>

                    <button
                        onClick={() => navigate('/setup')}
                        className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-green-600 transition-colors shadow-md transform active:scale-95"
                    >
                        Create a New Account
                    </button>
                    
                    <button
                        onClick={() => navigate('/directory')}
                        className="w-full bg-white dark:bg-gray-700 text-primary dark:text-accent-sky border-2 border-primary dark:border-accent-sky py-3 px-6 rounded-lg font-semibold text-lg hover:bg-primary/5 dark:hover:bg-gray-600 transition-colors shadow-md transform active:scale-95"
                    >
                        Explore Businesses
                    </button>
                    
                    <button
                        onClick={() => navigate('/login/admin')}
                        className="w-full bg-neutral-dark dark:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors shadow-sm transform active:scale-95"
                    >
                        Platform Admin Login
                    </button>
                </div>
                 <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>If you need to reset the app, clear your browser's local storage.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPortal;