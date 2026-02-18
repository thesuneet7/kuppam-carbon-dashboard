import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CATEGORIES, formatNumber, formatDate, catKey, totalKey, unitLabel } from '../utils';

function CustomTooltip({ active, payload, label, unit }) {
    if (!active || !payload) return null;
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid rgba(22, 163, 74, 0.15)',
            borderRadius: '10px',
            padding: '12px 16px',
            backdropFilter: 'blur(12px)',
            fontSize: '0.78rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
            <p style={{ color: '#4a6a4a', marginBottom: 6, fontWeight: 600 }}>{formatDate(label)}</p>
            {payload.map((p) => (
                <p key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                    {p.name}: <strong>{formatNumber(p.value, true)} {unit}</strong>
                </p>
            ))}
        </div>
    );
}

export default function ForecastChart({ data, loading, mode }) {
    const unit = unitLabel(mode);
    const tKey = totalKey(mode);

    if (loading) {
        return (
            <div className="glass-card stagger-4">
                <div className="chart-header"><span className="chart-title">Forecast</span></div>
                <div className="skeleton skeleton--chart" />
            </div>
        );
    }

    const chartData = (data || []).map((r) => ({
        date: r.date,
        ...Object.fromEntries(CATEGORIES.map((c) => [c.key, r[catKey(c.key, mode)] || 0])),
        total: r[tKey] || 0,
    }));

    const title = mode === 'tco2' ? 'Emissions Forecast (tCO₂)' : 'Consumption Forecast';
    const subtitle = mode === 'tco2'
        ? 'ML-powered projection of CO₂ emissions with CAGR adjustment'
        : 'ML-powered projection of energy consumption (kWh) with CAGR adjustment';
    const totalLabel = mode === 'tco2' ? 'Total tCO₂' : 'Total Consumed';

    return (
        <div className="glass-card stagger-4">
            <div className="chart-header">
                <div>
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} interval={5} />
                        <YAxis tickFormatter={(v) => formatNumber(v, true)} stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} width={60} label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#4a6a4a', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip unit={unit} />} />
                        {CATEGORIES.map((c) => (
                            <Line key={c.key} type="monotone" dataKey={c.key} name={c.label} stroke={c.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                        ))}
                        <Line type="monotone" dataKey="total" name={totalLabel} stroke="#1a2e1a" strokeWidth={2.5} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-legend">
                {CATEGORIES.map((c) => (
                    <div key={c.key} className="chart-legend__item">
                        <span className="chart-legend__dot" style={{ background: c.color }} />
                        {c.label}
                    </div>
                ))}
                <div className="chart-legend__item">
                    <span className="chart-legend__dot" style={{ background: '#1a2e1a' }} />
                    {totalLabel}
                </div>
            </div>
        </div>
    );
}
