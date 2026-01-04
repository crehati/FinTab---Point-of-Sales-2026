import React, { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { BuildingIcon } from '../constants';
import type { AdminBusinessData } from '../types';
import Card from './Card';
import EmptyState from './EmptyState';
import SearchInput from './SearchInput';
import { getStoredItem } from '../lib/utils';

const Directory: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [businesses, setBusinesses] = useState<AdminBusinessData[]>([]);

    useEffect(() => {
        // Load the central business registry from localStorage using correct namespace
        setBusinesses(getStoredItem('fintab_businesses_registry', []));
    }, []);

    const filteredBusinesses = useMemo(() => 
        businesses.filter(b => 
            b.profile.isPublic &&
            b.profile.businessName.toLowerCase().includes(searchTerm.toLowerCase())
        ), 
    [businesses, searchTerm]);

    return (
        <div className="space-y-6">
            <Card title="Business Directory">
                <p className="mb-6 text-neutral-medium dark:text-gray-400">
                    Explore public businesses on the FinTab platform. Click on any business to view their products and place an order request.
                </p>

                <SearchInput
                    containerClassName="mb-6"
                    placeholder="Search businesses by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search businesses"
                />


                {filteredBusinesses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBusinesses.map(business => (
                            <div key={business.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md flex flex-col overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-4">
                                    <img 
                                        src={business.profile.logo || `https://ui-avatars.com/api/?name=${business.profile.businessName.charAt(0)}&background=2563EB&color=ffffff`} 
                                        alt={`${business.profile.businessName} logo`}
                                        className="w-16 h-16 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
                                    />
                                    <div>
                                        <h3 className="text-lg font-bold text-neutral-dark dark:text-gray-100">{business.profile.businessName}</h3>
                                        <p className="text-sm text-neutral-medium dark:text-gray-400">{business.profile.businessType}</p>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <p className="text-xs text-neutral-medium dark:text-gray-500">Owner: {business.owner.name}</p>
                                    <p className="text-xs text-neutral-medium dark:text-gray-500">Joined: {new Date(business.stats.joinedDate).toLocaleDateString()}</p>
                                    <div className="flex-grow" />
                                    <NavLink 
                                        to={`/public-shopfront/${business.id}`}
                                        className="mt-4 w-full bg-primary text-white text-center px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        View Shopfront
                                    </NavLink>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState 
                        icon={<BuildingIcon />} 
                        title={searchTerm ? "Zero directory matches" : "Directory Empty"} 
                        description={searchTerm ? `No public businesses found matching "${searchTerm}".` : "There are currently no businesses listed in the public directory."}
                    />
                )}
            </Card>
        </div>
    );
};

export default Directory;