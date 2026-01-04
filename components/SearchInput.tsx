
import React from 'react';
import { SearchIcon } from '../constants';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    containerClassName?: string;
}

/**
 * Standardized Search Input component
 * Prevents icon overlap by enforcing consistent left padding and icon alignment.
 */
const SearchInput: React.FC<SearchInputProps> = ({ containerClassName = '', className = '', ...props }) => {
    return (
        <div className={`relative flex-grow ${containerClassName}`}>
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                <SearchIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
                type="text"
                {...props}
                className={`block w-full !pl-14 pr-4 py-4 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-4 focus:ring-primary/10 transition-all outline-none ${className}`}
            />
        </div>
    );
};

export default SearchInput;
