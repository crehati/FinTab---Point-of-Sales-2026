import React from 'react';

interface UpgradeBannerProps {
    businessName: string;
    businessEmail: string;
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ businessName, businessEmail }) => {

    const handleContactClick = () => {
        const subject = `Premium Upgrade Request for ${businessName}`;
        const body = `Hello,
I would like to upgrade my account for the business "${businessName}" (${businessEmail}) to the Premium plan.

Please provide me with the next steps.

Thank you,
`;
        // Replace with the admin's actual email address
        const adminEmail = "admin@marketup.com";
        window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="bg-yellow-400 text-yellow-900 px-4 py-3 text-center text-sm font-semibold z-20 shadow-md">
            Your trial period has expired. To unlock unlimited features, please upgrade to Premium.
            <button
                onClick={handleContactClick}
                className="ml-4 px-3 py-1 bg-yellow-800 text-white rounded-full hover:bg-yellow-900 transition-colors text-xs font-bold"
            >
                Contact Us to Upgrade
            </button>
        </div>
    );
};

export default UpgradeBanner;