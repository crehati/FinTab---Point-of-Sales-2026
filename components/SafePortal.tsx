
import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SafePortalProps {
    children: React.ReactNode;
    containerId: string;
}

/**
 * SafePortal wraps React Portals with an existence check for the target DOM node.
 * This prevents React Error #299 (Target container is not a DOM element).
 */
export const SafePortal: React.FC<SafePortalProps> = ({ children, containerId }) => {
    const [mounted, setMounted] = useState(false);
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useLayoutEffect(() => {
        const el = document.getElementById(containerId);
        if (el) {
            setTarget(el);
            setMounted(true);
        } else {
            console.error(`[FinTab Integrity] Portal Failure: DOM node #${containerId} was not found. Render aborted to prevent Crash #299.`);
        }
        
        return () => {
            setMounted(false);
            setTarget(null);
        };
    }, [containerId]);

    if (!mounted || !target) {
        return null;
    }

    return createPortal(children, target);
};

export default SafePortal;
