import React from 'react';

export const CATEGORIES = [
    { key: 'residential', label: 'Residential', color: '#16a34a' },
    { key: 'commercial', label: 'Commercial', color: '#0d9488' },
    { key: 'industrial', label: 'Industrial', color: '#0891b2' },
    { key: 'agriculture', label: 'Agriculture', color: '#65a30d' },
    { key: 'others', label: 'Others', color: '#8b5cf6' },
];

export function formatNumber(n, compact = false) {
    if (n == null || isNaN(n)) return '—';
    if (compact) {
        if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toFixed(0);
    }
    return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

/** Return the data key for a category based on mode */
export function catKey(baseKey, mode) {
    return mode === 'tco2' ? `${baseKey}_tco2` : baseKey;
}

/** Unit label for current mode */
export function unitLabel(mode) {
    return mode === 'tco2' ? 'tCO₂' : 'kWh';
}

/** Total key for current mode */
export function totalKey(mode) {
    return mode === 'tco2' ? 'total_tco2' : 'total';
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[0].length <= 2) {
            const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!isNaN(d2.getTime())) {
                return d2.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
        }
        return dateStr;
    }
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
