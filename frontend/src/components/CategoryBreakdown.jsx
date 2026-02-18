import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CATEGORIES, formatNumber, catKey, unitLabel } from '../utils';

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
            <p style={{ color: '#4a6a4a', marginBottom: 6, fontWeight: 600 }}>{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                    {p.name}: <strong>{formatNumber(p.value, true)} {unit}</strong>
                </p>
            ))}
        </div>
    );
}

export default function CategoryBreakdown({ historical, loading, mode }) {
    const unit = unitLabel(mode);

    if (loading) {
        return (
            <div className="glass-card stagger-5">
                <div className="chart-header"><span className="chart-title">Category Breakdown</span></div>
                <div className="skeleton skeleton--chart" style={{ height: 280 }} />
            </div>
        );
    }

    const fyMap = {};
    (historical || []).forEach((r) => {
        const fy = r.fy || 'Unknown';
        if (!fyMap[fy]) {
            fyMap[fy] = { fy, ...Object.fromEntries(CATEGORIES.map((c) => [c.key, 0])) };
        }
        CATEGORIES.forEach((c) => {
            fyMap[fy][c.key] += r[catKey(c.key, mode)] || 0;
        });
    });
    const chartData = Object.values(fyMap);

    const title = mode === 'tco2' ? 'tCO₂ Emissions by Category & FY' : 'Consumed kWh by Category & FY';
    const subtitle = mode === 'tco2'
        ? 'Stacked annual breakdown of CO₂ emissions per consumer category'
        : 'Stacked annual breakdown of energy consumed per consumer category';

    return (
        <div className="glass-card stagger-5">
            <div className="chart-header">
                <div>
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
            </div>
            <div className="chart-container chart-container--sm">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="fy" stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => formatNumber(v, true)} stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} width={60} label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#4a6a4a', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip unit={unit} />} />
                        {CATEGORIES.map((c) => (
                            <Bar key={c.key} dataKey={c.key} name={c.label} stackId="a" fill={c.color} radius={c.key === 'others' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-legend">
                {CATEGORIES.map((c) => (
                    <div key={c.key} className="chart-legend__item">
                        <span className="chart-legend__dot" style={{ background: c.color }} />
                        {c.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
