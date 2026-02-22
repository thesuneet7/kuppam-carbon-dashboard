import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '../api';

const ACTION_LABELS = {
    upload: '⬆️ Upload',
    manual_refresh: '🔄 Refresh',
    scheduled_refresh: '⏰ Auto-Refresh',
    run_forecast: '🚀 Forecast',
    clean: '🧹 Clean',
};

const PAGE_SIZE = 20;

const STATUS_ICON = { success: '✅', error: '❌' };

export default function AuditLogTable({ addToast }) {
    const [entries, setEntries] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filterAction, setFilterAction] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAuditLogs(page, PAGE_SIZE, filterAction || null);
            setEntries(res.entries);
            setTotal(res.total);
        } catch (err) {
            addToast(`Failed to load audit logs: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [page, filterAction, addToast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const formatTimestamp = (ts) => {
        try {
            return new Date(ts).toLocaleString();
        } catch {
            return ts;
        }
    };

    return (
        <div className="glass-card stagger-3">
            <div className="chart-header">
                <div>
                    <div className="chart-title">📋 Audit Log</div>
                    <div className="chart-subtitle">Track all data changes, uploads, and system actions</div>
                </div>
                <div className="audit-controls">
                    <select
                        className="upload-select"
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                    >
                        <option value="">All actions</option>
                        {Object.keys(ACTION_LABELS).map((a) => (
                            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                        ))}
                    </select>
                    <button className="btn btn--secondary" onClick={fetchLogs} disabled={loading}>
                        {loading ? <><span className="btn__spinner" /> Loading…</> : '↺ Refresh'}
                    </button>
                </div>
            </div>

            {loading && entries.length === 0 ? (
                <div className="skeleton skeleton--chart" />
            ) : entries.length === 0 ? (
                <div className="audit-empty">No audit log entries found.</div>
            ) : (
                <>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Timestamp</th>
                                    <th>Action</th>
                                    <th>User</th>
                                    <th>Status</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>{entry.id}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatTimestamp(entry.timestamp)}</td>
                                        <td>
                                            <span className="audit-action-badge">
                                                {ACTION_LABELS[entry.action] || entry.action}
                                            </span>
                                        </td>
                                        <td>{entry.user}</td>
                                        <td>
                                            <span className={`audit-status audit-status--${entry.status}`}>
                                                {STATUS_ICON[entry.status] || '⚠️'} {entry.status}
                                            </span>
                                        </td>
                                        <td className="audit-details">{entry.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="data-table__pagination">
                        <span className="data-table__pagination-info">
                            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
                        </span>
                        <div className="data-table__pagination-btns">
                            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
                            <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                            <span className="page-btn page-btn--active">{page} / {totalPages}</span>
                            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
                            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
