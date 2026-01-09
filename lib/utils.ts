export const getStoredItem = <T,>(key: string, defaultValue: T): T => {
    const item = localStorage.getItem(key);
    if (item === null || item === 'undefined' || item === 'null') return defaultValue;
    try {
        return JSON.parse(item) as T;
    } catch (error) {
        if (typeof defaultValue === 'string') {
            return item as unknown as T;
        }
        console.error(`Error reading ${key} from localStorage`, error);
        return defaultValue;
    }
};

export const SYSTEM_BRANDING_LOGO_KEY = 'fintab_system_branding_logo';

export const getSystemLogo = (): string => {
    return getStoredItem(SYSTEM_BRANDING_LOGO_KEY, '/logo.png');
};

export const formatCurrency = (amount: number, currencySymbol: string): string => {
    if (typeof amount !== 'number') {
        amount = 0;
    }
    const formattedAmount = amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${currencySymbol}${formattedAmount}`;
};

export const formatAbbreviatedNumber = (amount: number): string => {
    if (typeof amount !== 'number') {
        amount = 0;
    }
    const sign = amount < 0 ? "-" : "";
    const absAmount = Math.abs(amount);
    if (absAmount >= 1_000_000) {
        return `${sign}${(absAmount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (absAmount >= 1_000) {
        return `${sign}${(absAmount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const exportToCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                return cell;
            }).join(separator);
        }).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Production Hardening: Rate Limiting ---
const RATE_LIMIT_MAP = new Map<string, number>();
export const isRateLimited = (key: string, limitMs: number = 2000): boolean => {
    const now = Date.now();
    const lastRun = RATE_LIMIT_MAP.get(key) || 0;
    if (now - lastRun < limitMs) return true;
    RATE_LIMIT_MAP.set(key, now);
    return false;
};

export const setStoredItemAndDispatchEvent = (key: string, value: any): void => {
    if (value === undefined) return;
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
    } catch (error) {
        console.error(`Error writing ${key} to localStorage`, error);
    }
};