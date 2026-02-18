import React, { useState, useEffect, useCallback } from 'react';
import { getHistorical, getForecast, getCagr, runForecast } from './api';
import KpiCards from './components/KpiCards';
import RevenueChart from './components/RevenueChart';
import ForecastChart from './components/ForecastChart';
import CombinedChart from './components/CombinedChart';
import CategoryBreakdown from './components/CategoryBreakdown';
import CategoryPieChart from './components/CategoryPieChart';
import CagrPanel from './components/CagrPanel';
import DataTable from './components/DataTable';

function Toast({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast toast--${t.type}`}>
                    {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
                </div>
            ))}
        </div>
    );
}

export default function App() {
    const [historical, setHistorical] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [cagr, setCagr] = useState(0.04);
    const [horizon, setHorizon] = useState(60);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [status, setStatus] = useState('connected');
    const [toasts, setToasts] = useState([]);
    const [activeTab, setActiveTab] = useState('combined');
    const [mode, setMode] = useState('kwh'); // 'kwh' | 'tco2'

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setStatus('loading');
        try {
            const [histRes, cagrRes] = await Promise.all([getHistorical(), getCagr()]);
            setHistorical(histRes.data);
            setCagr(cagrRes.cagr);
            setHorizon(cagrRes.horizon);

            try {
                const foreRes = await getForecast();
                setForecast(foreRes.data);
            } catch {
                setForecast(null);
            }

            setStatus('connected');
        } catch (err) {
            setStatus('error');
            addToast('Failed to connect to API', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleRunForecast = useCallback(async (newCagr, newHorizon) => {
        setRunning(true);
        setStatus('loading');
        addToast(`Running forecast with CAGR ${(newCagr * 100).toFixed(1)}%…`, 'info');
        try {
            const result = await runForecast(newCagr, newHorizon);
            if (result.status === 'success') {
                addToast('Forecast completed successfully!', 'success');
                setCagr(newCagr);
                setHorizon(newHorizon);
                const foreRes = await getForecast();
                setForecast(foreRes.data);
                setStatus('connected');
            } else {
                addToast(`Forecast failed: ${result.stderr || 'Unknown error'}`, 'error');
                setStatus('error');
            }
        } catch (err) {
            addToast(`Error: ${err.message}`, 'error');
            setStatus('error');
        } finally {
            setRunning(false);
        }
    }, [addToast]);

    const statusLabel = status === 'connected' ? 'API Connected' : status === 'loading' ? 'Loading…' : 'Connection Error';

    return (
        <div className="app-layout">
            <Toast toasts={toasts} />

            {/* Header */}
            <header className="app-header">
                <div className="app-header__brand">
                    <div className="app-header__icon">⚡</div>
                    <div>
                        <div className="app-header__title">Kuppam Carbon Dashboard</div>
                        <div className="app-header__subtitle">ML-Powered Carbon Analytics & Forecasting</div>
                    </div>
                </div>
                <div className="app-header__actions">
                    {/* kWh / tCO₂ toggle */}
                    <div className="mode-toggle">
                        <button
                            className={`mode-toggle__btn ${mode === 'kwh' ? 'mode-toggle__btn--active' : ''}`}
                            onClick={() => setMode('kwh')}
                        >
                            ⚡ kWh
                        </button>
                        <button
                            className={`mode-toggle__btn ${mode === 'tco2' ? 'mode-toggle__btn--active' : ''}`}
                            onClick={() => setMode('tco2')}
                        >
                            🌍 tCO₂
                        </button>
                    </div>
                    <div className="app-header__status">
                        <span className={`status-dot ${status === 'loading' ? 'status-dot--loading' : status === 'error' ? 'status-dot--error' : ''}`} />
                        {statusLabel}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                {/* KPI Cards */}
                <section className="dashboard-section">
                    <KpiCards historical={historical} forecast={forecast} cagr={cagr} horizon={horizon} loading={loading} mode={mode} />
                </section>

                {/* CAGR Panel */}
                <section className="dashboard-section">
                    <CagrPanel cagr={cagr} horizon={horizon} onRun={handleRunForecast} running={running} />
                </section>

                {/* Chart Tabs */}
                <section className="dashboard-section">
                    <div className="tab-bar">
                        <button className={`tab-btn ${activeTab === 'combined' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('combined')}>
                            📊 Combined Timeline
                        </button>
                        <button className={`tab-btn ${activeTab === 'historical' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('historical')}>
                            ⚡ Historical
                        </button>
                        <button className={`tab-btn ${activeTab === 'forecast' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('forecast')}>
                            🔮 Forecast
                        </button>
                    </div>

                    {activeTab === 'combined' && <CombinedChart historical={historical} forecast={forecast} loading={loading} mode={mode} />}
                    {activeTab === 'historical' && <RevenueChart data={historical} loading={loading} mode={mode} />}
                    {activeTab === 'forecast' && <ForecastChart data={forecast} loading={loading || !forecast} mode={mode} />}
                </section>

                {/* Pie Chart */}
                <section className="dashboard-section">
                    <CategoryPieChart historical={historical} loading={loading} mode={mode} />
                </section>

                {/* Data Table — full width, above bar charts */}
                <section className="dashboard-section">
                    <DataTable data={forecast} loading={loading} mode={mode} />
                </section>

                {/* Bar Chart — below table */}
                <section className="dashboard-section">
                    <CategoryBreakdown historical={historical} loading={loading} mode={mode} />
                </section>
            </main>
        </div>
    );
}
