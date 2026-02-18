import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CATEGORIES, formatNumber, formatDate, catKey, unitLabel } from '../utils';

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

export default function RevenueChart({ data, loading, mode }) {
    const unit = unitLabel(mode);

    if (loading) {
        return (
            <div className="glass-card stagger-3">
                <div className="chart-header"><span className="chart-title">Historical Consumption</span></div>
                <div className="skeleton skeleton--chart" />
            </div>
        );
    }

    const chartData = (data || []).map((r) => ({
        date: r.date,
        ...Object.fromEntries(CATEGORIES.map((c) => [c.key, r[catKey(c.key, mode)] || 0])),
    }));

    const title = mode === 'tco2' ? 'Historical CO₂ Emissions by Category' : 'Historical Energy Consumption by Category';
    const subtitle = mode === 'tco2'
        ? 'Monthly breakdown of tCO₂ emissions across tariff categories'
        : 'Monthly breakdown of consumed kWh across tariff categories';

    return (
        <div className="glass-card stagger-3">
            <div className="chart-header">
                <div>
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            {CATEGORIES.map((c) => (
                                <linearGradient key={c.key} id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={c.color} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={c.color} stopOpacity={0.02} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} interval={11} />
                        <YAxis tickFormatter={(v) => formatNumber(v, true)} stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} width={60} label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#4a6a4a', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip unit={unit} />} />
                        {CATEGORIES.map((c) => (
                            <Area key={c.key} type="monotone" dataKey={c.key} name={c.label} stroke={c.color} fill={`url(#grad-${c.key})`} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                        ))}
                    </AreaChart>
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
