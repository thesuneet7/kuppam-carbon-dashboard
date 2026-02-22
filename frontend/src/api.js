const BASE = import.meta.env.VITE_API_URL;

export async function getHistorical() {
    const res = await fetch(`${BASE}/historical`);
    if (!res.ok) throw new Error(`Historical fetch failed: ${res.status}`);
    return res.json();
}

export async function getForecast() {
    const res = await fetch(`${BASE}/forecast`);
    if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`);
    return res.json();
}

export async function getCagr() {
    const res = await fetch(`${BASE}/cagr`);
    if (!res.ok) throw new Error(`CAGR fetch failed: ${res.status}`);
    return res.json();
}

export async function updateCagr(cagr, horizon) {
    const res = await fetch(`${BASE}/cagr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cagr, horizon }),
    });
    if (!res.ok) throw new Error(`CAGR update failed: ${res.status}`);
    return res.json();
}

export async function runForecast(cagr, horizon) {
    const res = await fetch(`${BASE}/run-forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cagr, horizon }),
    });
    if (!res.ok) throw new Error(`Run forecast failed: ${res.status}`);
    return res.json();
}

export async function refreshData() {
    const res = await fetch(`${BASE}/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
    return res.json();
}

export async function uploadFile(file, { target = 'historical', user = 'user', applyCleaning = false, cleaningStrategy = 'median' } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams({ target, user, apply_cleaning: applyCleaning, cleaning_strategy: cleaningStrategy });
    const res = await fetch(`${BASE}/upload?${params}`, { method: 'POST', body: formData });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
}

export async function getDataQuality() {
    const res = await fetch(`${BASE}/data-quality`);
    if (!res.ok) throw new Error(`Data quality fetch failed: ${res.status}`);
    return res.json();
}

export async function cleanData(strategy = 'median', apply = false) {
    const res = await fetch(`${BASE}/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, apply }),
    });
    if (!res.ok) throw new Error(`Clean failed: ${res.status}`);
    return res.json();
}

export async function getAuditLogs(page = 1, pageSize = 50, action = null) {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (action) params.append('action', action);
    const res = await fetch(`${BASE}/audit-logs?${params}`);
    if (!res.ok) throw new Error(`Audit logs fetch failed: ${res.status}`);
    return res.json();
}
