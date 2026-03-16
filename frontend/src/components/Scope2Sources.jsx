import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Cell, ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '../utils';

/* ── Static Data ── */
const ELECTRICITY_SOURCES = [
    { name: 'Residential', value: 33561, color: '#2563eb' },
    { name: 'Commercial', value: 9321, color: '#f59e0b' },
    { name: 'Industrial and Construction', value: 23905, color: '#10b981' },
    { name: 'Agriculture and allied', value: 209878, color: '#ef4444' },
    { name: 'General utilities', value: 15190, color: '#8b5cf6' },
];
const ELECTRICITY_TOTAL = 291855;

const EV_SOURCES = [
    { name: '2W', value: 249.12, color: '#f97316' },
    { name: '3W', value: 102.96, color: '#0891b2' },
    { name: '4W', value: 156.24, color: '#ec4899' },
    { name: 'Bus', value: 37.44, color: '#2563eb' },
    { name: 'Goods Vehicles', value: 15.12, color: '#10b981' },
];
const EV_TOTAL = 560.88;

/* ── Compute share % ── */
function withShare(data, total) {
    return data.map((d) => ({
        ...d,
        share: ((d.value / total) * 100).toFixed(1),
    }));
}

const ELEC_WITH_SHARE = withShare(ELECTRICITY_SOURCES, ELECTRICITY_TOTAL);
const EV_WITH_SHARE = withShare(EV_SOURCES, EV_TOTAL);

/* ── Custom Bar Tooltip ── */
function BarTooltipContent({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(8,145,178,0.15)',
            borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(12px)',
            fontSize: '0.78rem', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
            <p style={{ color: '#1a2e1a', fontWeight: 600, marginBottom: 4 }}>{d.name}</p>
            <p style={{ color: d.color, margin: 0 }}>
                <strong>{formatNumber(d.value)} tCO₂e</strong> — {d.share}%
            </p>
        </div>
    );
}

/* ── Reusable horizontal bar + legend panel ── */
function SourcePanel({ title, subtitle, data, total, barHeight }) {
    return (
        <div className="glass-card stagger-1" style={{ marginBottom: 0 }}>
            <div className="chart-header">
                <div>
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
            </div>

            <div className="scope1-two-col">
                {/* Bar chart */}
                <div style={{ minHeight: barHeight }}>
                    <ResponsiveContainer width="100%" height={barHeight}>
                        <BarChart data={data} layout="vertical"
                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => formatNumber(v, true)}
                                stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={160}
                                stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} />
                            <Tooltip content={<BarTooltipContent />} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                                {data.map((e, i) => (
                                    <Cell key={i} fill={e.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend / stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '0.75rem', color: '#7a9a7a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Total
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a2e1a', marginBottom: 12 }}>
                        {formatNumber(total, true)}{' '}
                        <span style={{ fontSize: '0.85rem', color: '#7a9a7a', fontWeight: 400 }}>tCO₂e</span>
                    </div>
                    {data.map((d) => (
                        <div key={d.name} className="scope1-stat-row">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '0.8rem', color: '#4a6a4a' }}>{d.name}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: d.color }}>{d.share}%</span>
                            <span style={{ fontSize: '0.72rem', color: '#7a9a7a' }}>{formatNumber(d.value, true)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   Scope-2 Emission Sources FY24-25
   Two bar charts: Usage Electricity + Electric Vehicles
   ================================================================ */
export default function Scope2Sources() {
    return (
        <section className="dashboard-section">
            <div className="chart-header" style={{ marginBottom: 8 }}>
                <div>
                    <div className="chart-title">⚡ Scope-2 Emission Sources FY24-25</div>
                    <div className="chart-subtitle">
                        Indirect emissions from purchased electricity and electric vehicles (tCO₂e)
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SourcePanel
                    title="🔌 Usage Electricity"
                    subtitle="Emissions from grid electricity consumption by sector"
                    data={ELEC_WITH_SHARE}
                    total={ELECTRICITY_TOTAL}
                    barHeight={280}
                />
                <SourcePanel
                    title="🚗 Electric Vehicles"
                    subtitle="Emissions from electric vehicle charging by vehicle type"
                    data={EV_WITH_SHARE}
                    total={EV_TOTAL}
                    barHeight={260}
                />
            </div>
        </section>
    );
}
