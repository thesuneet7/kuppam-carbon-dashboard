import React, { useState } from 'react';

export default function CagrPanel({ cagr, horizon, onRun, running }) {
    const [localCagr, setLocalCagr] = useState(cagr || 0.04);
    const [localHorizon, setLocalHorizon] = useState(horizon || 60);

    // Sync when props change (e.g. after a fetch)
    React.useEffect(() => {
        if (cagr != null) setLocalCagr(cagr);
    }, [cagr]);
    React.useEffect(() => {
        if (horizon != null) setLocalHorizon(horizon);
    }, [horizon]);

    return (
        <div className="glass-card stagger-2">
            <div className="chart-header">
                <div>
                    <div className="chart-title">⚙️ Forecast Configuration</div>
                    <div className="chart-subtitle">Adjust parameters and re-run the ML forecast</div>
                </div>
            </div>
            <div className="cagr-panel">
                <div className="cagr-field">
                    <label className="cagr-field__label">CAGR (Growth Rate)</label>
                    <div className="cagr-field__value-display">{(localCagr * 100).toFixed(1)}%</div>
                    <input
                        type="range"
                        min="0.01"
                        max="0.50"
                        step="0.005"
                        value={localCagr}
                        onChange={(e) => setLocalCagr(parseFloat(e.target.value))}
                    />
                </div>
                <div className="cagr-field">
                    <label className="cagr-field__label">Horizon (months)</label>
                    <input
                        type="number"
                        min={12}
                        max={120}
                        step={12}
                        value={localHorizon}
                        onChange={(e) => setLocalHorizon(parseInt(e.target.value) || 60)}
                    />
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                        = {(localHorizon / 12).toFixed(1)} years
                    </div>
                </div>
                <button
                    className="btn btn--primary"
                    disabled={running}
                    onClick={() => onRun(localCagr, localHorizon)}
                >
                    {running ? (
                        <>
                            <span className="btn__spinner" />
                            Running…
                        </>
                    ) : (
                        <>🚀 Run Forecast</>
                    )}
                </button>
            </div>
        </div>
    );
}
