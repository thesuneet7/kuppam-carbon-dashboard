import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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

    // Separate agriculture from others for dual-axis
    const agriCat = CATEGORIES.find((c) => c.key === 'agriculture');
    const otherCats = CATEGORIES.filter((c) => c.key !== 'agriculture');

    const title = mode === 'tco2' ? 'tCO₂ Emissions by Category & FY' : 'Consumed kWh by Category & FY';
    const subtitle = mode === 'tco2'
        ? 'Agriculture on left axis, other categories stacked on right axis'
        : 'Agriculture on left axis, other categories stacked on right axis';

    return (
        <div className="glass-card stagger-5">
            <div className="chart-header">
                <div>
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
            </div>
            <div className="chart-container chart-container--sm">
                <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="fy" stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} />

                        {/* Left axis — Agriculture (large scale) */}
                        <YAxis
                            yAxisId="left"
                            tickFormatter={(v) => formatNumber(v, true)}
                            stroke={agriCat.color}
                            tick={{ fill: agriCat.color, fontSize: 11 }}
                            width={65}
                            label={{ value: `Agriculture (${unit})`, angle: -90, position: 'insideLeft', fill: agriCat.color, fontSize: 10, offset: 4 }}
                        />

                        {/* Right axis — Others (smaller scale) */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(v) => formatNumber(v, true)}
                            stroke="#2563eb"
                            tick={{ fill: '#4a6a4a', fontSize: 11 }}
                            width={65}
                            label={{ value: `Others (${unit})`, angle: 90, position: 'insideRight', fill: '#4a6a4a', fontSize: 10, offset: 4 }}
                        />

                        <Tooltip content={<CustomTooltip unit={unit} />} />

                        {/* Agriculture bar — left axis */}
                        <Bar
                            yAxisId="left"
                            dataKey={agriCat.key}
                            name={agriCat.label}
                            fill={agriCat.color}
                            radius={[4, 4, 0, 0]}
                        />

                        {/* Other categories stacked — right axis */}
                        {otherCats.map((c, idx) => (
                            <Bar
                                key={c.key}
                                yAxisId="right"
                                dataKey={c.key}
                                name={c.label}
                                stackId="others"
                                fill={c.color}
                                radius={idx === otherCats.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            />
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
