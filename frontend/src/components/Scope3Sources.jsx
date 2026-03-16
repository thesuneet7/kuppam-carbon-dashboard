import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Cell, ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '../utils';

/* ── Static Data ── */
const SCOPE3_SOURCES = [
    { name: 'Transmission & Distribution Loss', value: 52275, color: '#f59e0b' },
];
const SCOPE3_TOTAL = 52275;

/* ── Custom Bar Tooltip ── */
function BarTooltipContent({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(12px)',
            fontSize: '0.78rem', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
            <p style={{ color: '#1a2e1a', fontWeight: 600, marginBottom: 4 }}>{d.name}</p>
            <p style={{ color: d.color, margin: 0 }}>
                <strong>{formatNumber(d.value)} tCO₂e</strong>
            </p>
        </div>
    );
}

/* ================================================================
   Scope-3 Emission Sources FY24-25
   ================================================================ */
export default function Scope3Sources() {
    return (
        <section className="dashboard-section">
            <div className="glass-card stagger-1">
                <div className="chart-header">
                    <div>
                        <div className="chart-title">🔗 Scope-3 Emission Sources FY24-25</div>
                        <div className="chart-subtitle">
                            Other indirect emissions — Transmission &amp; Distribution losses (tCO₂e)
                        </div>
                    </div>
                </div>

                <div className="scope1-two-col">
                    {/* Bar chart */}
                    <div style={{ minHeight: 120 }}>
                        <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={SCOPE3_SOURCES} layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                <XAxis type="number" tickFormatter={(v) => formatNumber(v, true)}
                                    stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={220}
                                    stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} />
                                <Tooltip content={<BarTooltipContent />} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                                    {SCOPE3_SOURCES.map((e, i) => (
                                        <Cell key={i} fill={e.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend / stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.75rem', color: '#7a9a7a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            Scope-3 Total
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a2e1a', marginBottom: 12 }}>
                            {formatNumber(SCOPE3_TOTAL, true)}{' '}
                            <span style={{ fontSize: '0.85rem', color: '#7a9a7a', fontWeight: 400 }}>tCO₂e</span>
                        </div>
                        {SCOPE3_SOURCES.map((d) => (
                            <div key={d.name} className="scope1-stat-row">
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.8rem', color: '#4a6a4a' }}>{d.name}</span>
                                <span style={{ fontSize: '0.72rem', color: '#7a9a7a' }}>{formatNumber(d.value, true)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
