
import React from 'react';
import { NavLink } from 'react-router-dom';
import Card from './Card';

const AccessDenied = () => (
    <div className="flex items-center justify-center h-full">
        <Card title="Access Denied">
            <div className="text-center p-8">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <h1 className="text-2xl font-bold text-red-600 mt-4">Permission Required</h1>
                <p className="text-gray-600 mt-2">You do not have the necessary permissions to view this page.</p>
                <p className="text-sm text-gray-500 mt-1">Please contact the system owner if you believe this is an error.</p>
                <NavLink to="/today" className="mt-6 inline-block bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                    Return to Dashboard
                </NavLink>
            </div>
        </Card>
    </div>
);

export default AccessDenied;
