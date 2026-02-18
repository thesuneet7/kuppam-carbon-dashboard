const BASE = import.meta.env.VITE_API_URL || '/api';

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
