
import React, { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password?: string;
}

const checkPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        specialChar: /[^A-Za-z0-9]/.test(password)
    };
    
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;

    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.specialChar) score++;

    if (checks.uppercase && checks.lowercase && checks.number && checks.specialChar && password.length >= 12) score++;

    return { score, checks };
};


const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password = '' }) => {
    const { score } = checkPasswordStrength(password);

    const strength = useMemo(() => {
        if (score > 5) return { label: 'Strong', color: 'bg-success', width: '100%' };
        if (score >= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
        return { label: 'Weak', color: 'bg-error', width: '33%' };
    }, [score]);
    
    if (!password) return null;

    return (
        <div>
            <div className="w-full bg-gray-200 rounded-full h-2 my-2">
                <div 
                    className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                ></div>
            </div>
            <p className={`text-xs font-semibold ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
        </div>
    );
};

export default PasswordStrengthIndicator;
