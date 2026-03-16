import React, { useState } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Sector,
} from 'recharts';
import { formatNumber } from '../utils';

/* ── Static Data ── */
const SCOPE_OVERVIEW = [
    { name: 'Scope 1', value: 647904, share: 61, color: '#ef4444' },
    { name: 'Scope 2', value: 291855, share: 28, color: '#2563eb' },
    { name: 'Scope 3', value: 114211, share: 11, color: '#f59e0b' },
];
const SCOPE_TOTAL = 1053970;

const SECTOR_DATA = [
    { name: 'Stationary Energy', value: 739834, share: 70, color: '#10b981' },
    { name: 'Transportation', value: 206454, share: 20, color: '#2563eb' },
    { name: 'IPPU', value: 87449, share: 8, color: '#f97316' },
    { name: 'Waste', value: 18296, share: 2, color: '#8b5cf6' },
    { name: 'AFOLU', value: 1937, share: 0.18, color: '#f59e0b' },
];

const RADIAN = Math.PI / 180;

/* ── Active‑shape renderer ── */
function renderActiveShape(props) {
    const {
        cx, cy, midAngle, innerRadius, outerRadius,
        startAngle, endAngle, fill, payload, percent, value,
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 6) * cos;
    const sy = cy + (outerRadius + 6) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 18;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius}
                outerRadius={outerRadius + 6} startAngle={startAngle}
                endAngle={endAngle} fill={fill}
                style={{ filter: `drop-shadow(0 0 6px ${fill}40)` }} />
            <Sector cx={cx} cy={cy} startAngle={startAngle}
                endAngle={endAngle} innerRadius={outerRadius + 8}
                outerRadius={outerRadius + 12} fill={fill} opacity={0.3} />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                stroke={fill} fill="none" strokeWidth={1.5} />
            <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 8 : -8)} y={ey}
                textAnchor={textAnchor} fill="#1a2e1a"
                fontSize={12} fontWeight={600}>
                {payload.name}
            </text>
            <text x={ex + (cos >= 0 ? 8 : -8)} y={ey} dy={16}
                textAnchor={textAnchor} fill="#4a6a4a" fontSize={11}>
                {formatNumber(value, true)} tCO₂e ({(percent * 100).toFixed(1)}%)
            </text>
        </g>
    );
}

/* ================================================================
   Home Dashboard — KPI cards, Scope Overview donut, Sector donut
   ================================================================ */
export default function HomeDashboard() {
    const [scopeIdx, setScopeIdx] = useState(0);
    const [sectorIdx, setSectorIdx] = useState(0);

    /* ── KPI cards ── */
    const kpis = [
        { label: 'Total Emissions', value: SCOPE_TOTAL, icon: '🌍', color: 'cyan', sub: 'All scopes combined' },
        { label: 'Scope 1 — Direct', value: 647904, icon: '🏭', color: 'green', sub: '61% of total' },
        { label: 'Scope 2 — Indirect', value: 291855, icon: '⚡', color: 'teal', sub: '28% of total' },
        { label: 'Scope 3 — Other', value: 114211, icon: '🔗', color: 'purple', sub: '11% of total' },
    ];

    return (
        <>
            {/* ── KPI Hero Cards ── */}
            <section className="dashboard-section">
                <div className="dashboard-grid scope1-hero-grid">
                    {kpis.map((k, i) => (
                        <div key={k.label}
                            className={`glass-card kpi-card kpi-card--${k.color} stagger-${i + 1}`}>
                            <div className="kpi-card__header">
                                <span className="kpi-card__label">{k.label}</span>
                                <span className="kpi-card__icon">{k.icon}</span>
                            </div>
                            <div className="kpi-card__value">
                                {formatNumber(k.value, true)}
                                <span style={{ fontSize: '0.55em', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>tCO₂e</span>
                            </div>
                            <div className="kpi-card__sub">{k.sub}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Scope Overview Donut ── */}
            <section className="dashboard-section">
                <div className="glass-card stagger-2">
                    <div className="chart-header">
                        <div>
                            <div className="chart-title">📊 Scope-wise Emissions Overview</div>
                            <div className="chart-subtitle">
                                Total GHG emissions split across Scope 1, 2 &amp; 3 (tCO₂e)
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 55%', minHeight: 320 }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie activeIndex={scopeIdx}
                                        activeShape={renderActiveShape}
                                        data={SCOPE_OVERVIEW} cx="50%" cy="50%"
                                        innerRadius={72} outerRadius={112}
                                        dataKey="value"
                                        onMouseEnter={(_, idx) => setScopeIdx(idx)}
                                        stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                                        {SCOPE_OVERVIEW.map((e, i) => (
                                            <Cell key={i} fill={e.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: '0.75rem', color: '#7a9a7a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                Total Emissions
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a2e1a', marginBottom: 12 }}>
                                {formatNumber(SCOPE_TOTAL, true)}{' '}
                                <span style={{ fontSize: '0.85rem', color: '#7a9a7a', fontWeight: 400 }}>tCO₂e</span>
                            </div>
                            {SCOPE_OVERVIEW.map((d, i) => (
                                <div key={d.name} className="scope1-stat-row"
                                    style={{ background: scopeIdx === i ? 'rgba(22,163,74,0.06)' : 'transparent' }}
                                    onMouseEnter={() => setScopeIdx(i)}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: '0.8rem', color: '#4a6a4a' }}>{d.name}</span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: d.color }}>{d.share}%</span>
                                    <span style={{ fontSize: '0.72rem', color: '#7a9a7a' }}>{formatNumber(d.value, true)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Sector Breakdown Donut ── */}
            <section className="dashboard-section">
                <div className="glass-card stagger-4">
                    <div className="chart-header">
                        <div>
                            <div className="chart-title">🏗️ Emissions by Sector</div>
                            <div className="chart-subtitle">
                                Total GHG emissions distributed across economic sectors (tCO₂e)
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 55%', minHeight: 320 }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie activeIndex={sectorIdx}
                                        activeShape={renderActiveShape}
                                        data={SECTOR_DATA} cx="50%" cy="50%"
                                        innerRadius={72} outerRadius={112}
                                        dataKey="value"
                                        onMouseEnter={(_, idx) => setSectorIdx(idx)}
                                        stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                                        {SECTOR_DATA.map((e, i) => (
                                            <Cell key={i} fill={e.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: '0.75rem', color: '#7a9a7a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                Total by Sector
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a2e1a', marginBottom: 12 }}>
                                {formatNumber(SCOPE_TOTAL, true)}{' '}
                                <span style={{ fontSize: '0.85rem', color: '#7a9a7a', fontWeight: 400 }}>tCO₂e</span>
                            </div>
                            {SECTOR_DATA.map((d, i) => (
                                <div key={d.name} className="scope1-stat-row"
                                    style={{ background: sectorIdx === i ? 'rgba(22,163,74,0.06)' : 'transparent' }}
                                    onMouseEnter={() => setSectorIdx(i)}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: '0.8rem', color: '#4a6a4a' }}>{d.name}</span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: d.color }}>{d.share}%</span>
                                    <span style={{ fontSize: '0.72rem', color: '#7a9a7a' }}>{formatNumber(d.value, true)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
