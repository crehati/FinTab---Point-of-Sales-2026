import React, { memo } from 'react';

interface CardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    headerContent?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className, headerContent }) => {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-lg ${className}`}>
            <div className="flex justify-between items-center mb-lg">
                <h2 className="text-xl font-bold text-neutral-dark dark:text-gray-100">{title}</h2>
                {headerContent}
            </div>
            <div>{children}</div>
        </div>
    );
};

export default memo(Card);