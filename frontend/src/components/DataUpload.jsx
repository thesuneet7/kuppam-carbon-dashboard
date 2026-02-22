import React, { useState, useRef } from 'react';
import { uploadFile, getDataQuality, cleanData, refreshData } from '../api';

const STRATEGIES = [
    { value: 'median', label: 'Median fill' },
    { value: 'mean', label: 'Mean fill' },
    { value: 'zero', label: 'Fill with zero' },
    { value: 'drop', label: 'Drop rows' },
];

function ValidationBadge({ level, items }) {
    if (!items || items.length === 0) return null;
    const cls = level === 'error' ? 'vbadge vbadge--error'
        : level === 'warning' ? 'vbadge vbadge--warning'
            : 'vbadge vbadge--info';
    const icon = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
    return (
        <ul className={cls}>
            {items.map((msg, i) => (
                <li key={i}>{icon} {msg}</li>
            ))}
        </ul>
    );
}

export default function DataUpload({ onRefresh, addToast }) {
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [applyCleaning, setApplyCleaning] = useState(false);
    const [cleaningStrategy, setCleaningStrategy] = useState('median');
    const [qualityReport, setQualityReport] = useState(null);
    const [loadingQuality, setLoadingQuality] = useState(false);
    const [cleanPreview, setCleanPreview] = useState(null);
    const [cleaning, setCleaning] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = (f) => {
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            addToast('Only CSV and Excel files are supported', 'error');
            return;
        }
        setFile(f);
        setResult(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        handleFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        try {
            const res = await uploadFile(file, {
                target: 'historical',
                user: 'user',
                applyCleaning,
                cleaningStrategy,
            });
            setResult(res);
            if (res.status === 'success' || res.status === 'warning') {
                addToast(res.message, res.status === 'warning' ? 'info' : 'success');
                if (onRefresh) onRefresh();
            } else {
                addToast(res.message || 'Upload failed', 'error');
            }
        } catch (err) {
            addToast(`Upload error: ${err.message}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    const fetchQuality = async () => {
        setLoadingQuality(true);
        try {
            const res = await getDataQuality();
            setQualityReport(res.report);
        } catch (err) {
            addToast(`Quality check failed: ${err.message}`, 'error');
        } finally {
            setLoadingQuality(false);
        }
    };

    const previewClean = async () => {
        try {
            const res = await cleanData(cleaningStrategy, false);
            setCleanPreview(res);
        } catch (err) {
            addToast(`Preview failed: ${err.message}`, 'error');
        }
    };

    const applyClean = async () => {
        setCleaning(true);
        try {
            const res = await cleanData(cleaningStrategy, true);
            addToast(res.message || 'Cleaning applied', 'success');
            setCleanPreview(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            addToast(`Cleaning failed: ${err.message}`, 'error');
        } finally {
            setCleaning(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const res = await refreshData();
            addToast(res.message || 'Data refreshed', 'success');
            if (onRefresh) onRefresh();
        } catch (err) {
            addToast(`Refresh failed: ${err.message}`, 'error');
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="glass-card stagger-2">
            <div className="chart-header">
                <div>
                    <div className="chart-title">📂 Data Management</div>
                    <div className="chart-subtitle">Upload new data, validate quality, and clean records</div>
                </div>
                <button
                    className="btn btn--secondary"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? <><span className="btn__spinner" /> Refreshing…</> : '🔄 Refresh Data'}
                </button>
            </div>

            {/* Upload zone */}
            <div className="upload-section">
                <div className="upload-section__label">Upload CSV / Excel</div>
                <div
                    className={`drop-zone ${dragging ? 'drop-zone--active' : ''} ${file ? 'drop-zone--has-file' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    aria-label="Upload file drop zone"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                    {file ? (
                        <div className="drop-zone__file-info">
                            <span className="drop-zone__file-icon">📄</span>
                            <span className="drop-zone__file-name">{file.name}</span>
                            <span className="drop-zone__file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                    ) : (
                        <div className="drop-zone__placeholder">
                            <div className="drop-zone__icon">⬆️</div>
                            <div className="drop-zone__text">Drag & drop or click to select</div>
                            <div className="drop-zone__hint">Supports .csv, .xlsx, .xls · Max 50 MB</div>
                        </div>
                    )}
                </div>

                {/* Upload options */}
                <div className="upload-options">
                    <label className="upload-option">
                        <input
                            type="checkbox"
                            checked={applyCleaning}
                            onChange={(e) => setApplyCleaning(e.target.checked)}
                        />
                        <span>Auto-clean missing values after upload</span>
                    </label>
                    {applyCleaning && (
                        <select
                            className="upload-select"
                            value={cleaningStrategy}
                            onChange={(e) => setCleaningStrategy(e.target.value)}
                        >
                            {STRATEGIES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    )}
                    <button
                        className="btn btn--primary"
                        disabled={!file || uploading}
                        onClick={handleUpload}
                    >
                        {uploading ? <><span className="btn__spinner" /> Uploading…</> : '⬆️ Upload'}
                    </button>
                </div>

                {/* Upload result */}
                {result && (
                    <div className={`upload-result upload-result--${result.status}`}>
                        <div className="upload-result__header">
                            {result.status === 'error' ? '❌' : result.status === 'warning' ? '⚠️' : '✅'}
                            {' '}{result.message}
                        </div>
                        {result.validation && (
                            <>
                                <ValidationBadge level="error" items={result.validation.errors} />
                                <ValidationBadge level="warning" items={result.validation.warnings} />
                                <ValidationBadge level="info" items={result.validation.info} />
                            </>
                        )}
                        {result.cleaning_actions && result.cleaning_actions.length > 0 && (
                            <div className="upload-result__cleaning">
                                <strong>Cleaning actions:</strong>
                                <ul>{result.cleaning_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                            </div>
                        )}
                        {result.file_hash && (
                            <div className="upload-result__meta">
                                {result.rows} rows · {result.columns?.length} columns · SHA256: {result.file_hash}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="upload-divider" />

            {/* Data Quality section */}
            <div className="quality-section">
                <div className="quality-section__header">
                    <div>
                        <div className="upload-section__label">Data Quality Check</div>
                        <div className="chart-subtitle">Inspect current dataset for issues</div>
                    </div>
                    <button
                        className="btn btn--secondary"
                        onClick={fetchQuality}
                        disabled={loadingQuality}
                    >
                        {loadingQuality ? <><span className="btn__spinner" /> Checking…</> : '🔍 Run Check'}
                    </button>
                </div>

                {qualityReport && (
                    <div className="quality-report">
                        <div className="quality-report__summary">
                            <span className="quality-badge quality-badge--info">
                                {qualityReport.row_count} rows
                            </span>
                            {qualityReport.errors.length > 0 && (
                                <span className="quality-badge quality-badge--error">
                                    {qualityReport.errors.length} error{qualityReport.errors.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            {qualityReport.warnings.length > 0 && (
                                <span className="quality-badge quality-badge--warning">
                                    {qualityReport.warnings.length} warning{qualityReport.warnings.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            {qualityReport.outliers.length > 0 && (
                                <span className="quality-badge quality-badge--warning">
                                    {qualityReport.outliers.length} outlier col{qualityReport.outliers.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <ValidationBadge level="error" items={qualityReport.errors} />
                        <ValidationBadge level="warning" items={qualityReport.warnings} />
                        <ValidationBadge level="info" items={qualityReport.info} />
                        {qualityReport.outliers.length > 0 && (
                            <div className="outlier-table-wrapper">
                                <div className="upload-section__label" style={{ marginBottom: 8 }}>Outlier Summary</div>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Column</th>
                                            <th>Outlier Rows</th>
                                            <th>Lower Bound</th>
                                            <th>Upper Bound</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {qualityReport.outliers.map((o) => (
                                            <tr key={o.column}>
                                                <td>{o.column}</td>
                                                <td>{o.count}</td>
                                                <td>{o.lower_bound.toFixed(2)}</td>
                                                <td>{o.upper_bound.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="upload-divider" />

            {/* Cleaning utilities */}
            <div className="cleaning-section">
                <div className="quality-section__header">
                    <div>
                        <div className="upload-section__label">Data Cleaning</div>
                        <div className="chart-subtitle">Handle missing values in the current dataset</div>
                    </div>
                    <div className="cleaning-controls">
                        <select
                            className="upload-select"
                            value={cleaningStrategy}
                            onChange={(e) => setCleaningStrategy(e.target.value)}
                        >
                            {STRATEGIES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        <button className="btn btn--secondary" onClick={previewClean}>
                            👁 Preview
                        </button>
                        <button className="btn btn--primary" onClick={applyClean} disabled={cleaning}>
                            {cleaning ? <><span className="btn__spinner" /> Applying…</> : '✅ Apply'}
                        </button>
                    </div>
                </div>
                {cleanPreview && (
                    <div className={`upload-result upload-result--${cleanPreview.status === 'ok' ? 'success' : 'warning'}`}>
                        <strong>{cleanPreview.message}</strong>
                        {cleanPreview.actions && cleanPreview.actions.length > 0 && (
                            <ul style={{ marginTop: 8 }}>
                                {cleanPreview.actions.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
