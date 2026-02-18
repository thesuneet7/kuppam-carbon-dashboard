import React from 'react';
import { formatNumber, unitLabel, totalKey } from '../utils';

export default function KpiCards({ historical, forecast, cagr, horizon, loading, mode }) {
    if (loading) {
        return (
            <div className="dashboard-grid dashboard-grid--kpis">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`glass-card kpi-card stagger-${i}`}>
                        <div className="skeleton skeleton--text" />
                        <div className="skeleton skeleton--value" />
                        <div className="skeleton skeleton--text" style={{ width: '40%' }} />
                    </div>
                ))}
            </div>
        );
    }

    const unit = unitLabel(mode);
    const tKey = totalKey(mode);

    const latestHist = historical?.[historical.length - 1];
    const latestVal = latestHist?.[tKey] ?? 0;
    const prevVal = historical?.[historical.length - 2]?.[tKey] ?? 0;
    const momChange = prevVal ? ((latestVal - prevVal) / prevVal) * 100 : 0;

    const latestSupplied = latestHist?.kwh ?? 0;
    const latestLossPct = latestHist?.loss_pct ?? 0;
    const latestEf = latestHist?.ef ?? 0;

    const forecastEnd = forecast?.[forecast.length - 1];
    const forecastVal = forecastEnd?.[tKey] ?? 0;

    const items = [
        {
            label: mode === 'tco2' ? 'Total Emissions (tCO₂)' : 'Total Consumed (kWh)',
            value: formatNumber(latestVal, true),
            sub: `${momChange >= 0 ? '↑' : '↓'} ${Math.abs(momChange).toFixed(1)}% MoM`,
            subClass: momChange >= 0 ? 'kpi-card__sub--up' : 'kpi-card__sub--down',
            color: 'cyan',
            icon: mode === 'tco2' ? '🌍' : '⚡',
        },
        {
            label: 'Energy Supplied (kWh)',
            value: formatNumber(latestSupplied, true),
            sub: `T&D Loss: ${latestLossPct ? Number(latestLossPct).toFixed(1) : '—'}%`,
            subClass: '',
            color: 'purple',
            icon: '🔌',
        },
        {
            label: mode === 'tco2' ? 'Forecast End (tCO₂)' : 'Forecast End',
            value: formatNumber(forecastVal, true),
            sub: forecastEnd ? `at ${new Date(forecastEnd.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '—',
            subClass: '',
            color: 'teal',
            icon: '🔮',
        },
        {
            label: 'CAGR / Horizon',
            value: `${((cagr || 0) * 100).toFixed(1)}%`,
            sub: `${horizon || 0} months · EF: ${latestEf ? latestEf.toFixed(3) : '—'}`,
            subClass: '',
            color: 'amber',
            icon: '📈',
        },
    ];

    return (
        <div className="dashboard-grid dashboard-grid--kpis">
            {items.map((item, i) => (
                <div key={item.label} className={`glass-card kpi-card kpi-card--${item.color} stagger-${i + 1}`}>
                    <div className="kpi-card__header">
                        <span className="kpi-card__label">{item.label}</span>
                        <span className="kpi-card__icon">{item.icon}</span>
                    </div>
                    <div className="kpi-card__value">{item.value}</div>
                    <div className={`kpi-card__sub ${item.subClass}`}>{item.sub}</div>
                </div>
            ))}
        </div>
    );
}
