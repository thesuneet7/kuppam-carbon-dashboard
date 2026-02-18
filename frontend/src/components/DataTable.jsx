import React, { useState, useMemo } from 'react';
import { CATEGORIES, formatNumber, formatDate, catKey, totalKey, unitLabel } from '../utils';

const PAGE_SIZE = 12;

export default function DataTable({ data, loading, mode }) {
    const [sortKey, setSortKey] = useState('date');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(0);

    const unit = unitLabel(mode);
    const tKey = totalKey(mode);

    const columns = [
        { key: 'date', label: 'Date', dataKey: 'date' },
        ...CATEGORIES.map((c) => ({ key: c.key, label: `${c.label} (${unit})`, dataKey: catKey(c.key, mode) })),
        { key: 'total', label: `Total ${mode === 'tco2' ? 'tCO₂' : 'Consumed'}`, dataKey: tKey },
        ...(mode === 'kwh' ? [{ key: 'kwh', label: 'Supplied (kWh)', dataKey: 'kwh' }] : []),
        { key: 'ef', label: 'EF', dataKey: 'ef' },
    ];

    const sorted = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => {
            let va = a[sortKey === 'total' ? tKey : sortKey === 'date' ? 'date' : catKey(sortKey, mode)];
            let vb = b[sortKey === 'total' ? tKey : sortKey === 'date' ? 'date' : catKey(sortKey, mode)];
            if (sortKey === 'date') {
                va = new Date(va || 0).getTime();
                vb = new Date(vb || 0).getTime();
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDir, mode, tKey]);

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const rows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(0);
    };

    if (loading) {
        return (
            <div className="glass-card stagger-6">
                <div className="chart-header"><span className="chart-title">Forecast Data</span></div>
                <div className="skeleton skeleton--chart" style={{ height: 200 }} />
            </div>
        );
    }

    return (
        <div className="glass-card stagger-6">
            <div className="chart-header">
                <div>
                    <div className="chart-title">📋 Forecast Data Table</div>
                    <div className="chart-subtitle">
                        {mode === 'tco2'
                            ? 'Sortable view of forecasted CO₂ emissions (tCO₂)'
                            : 'Sortable view of forecasted energy consumption (kWh)'}
                    </div>
                </div>
            </div>
            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className={sortKey === col.key ? 'th--active' : ''} onClick={() => handleSort(col.key)}>
                                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i}>
                                <td>{formatDate(row.date)}</td>
                                {CATEGORIES.map((c) => (
                                    <td key={c.key} style={{ color: c.color, fontWeight: 500 }}>{formatNumber(row[catKey(c.key, mode)], true)}</td>
                                ))}
                                <td style={{ fontWeight: 700, color: '#1a2e1a' }}>{formatNumber(row[tKey], true)}</td>
                                {mode === 'kwh' && <td>{formatNumber(row.kwh, true)}</td>}
                                <td style={{ color: '#7a9a7a' }}>{row.ef ? row.ef.toFixed(4) : '—'}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} style={{ textAlign: 'center', padding: 24, color: '#7a9a7a' }}>
                                    No forecast data available. Run a forecast first.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="data-table__pagination">
                    <span className="data-table__pagination-info">
                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                    </span>
                    <div className="data-table__pagination-btns">
                        <button className="page-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} className={`page-btn ${page === i ? 'page-btn--active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
                        ))}
                        <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
