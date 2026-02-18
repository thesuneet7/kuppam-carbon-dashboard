import React, { useState, useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Sector,
} from 'recharts';
import { CATEGORIES, formatNumber, catKey, unitLabel } from '../utils';

const RADIAN = Math.PI / 180;

function renderActiveShape(props) {
    const {
        cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
        fill, payload, percent, value,
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
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} style={{ filter: `drop-shadow(0 0 6px ${fill}40)` }} />
            <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 8} outerRadius={outerRadius + 12} fill={fill} opacity={0.3} />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
            <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 8 : -8)} y={ey} textAnchor={textAnchor} fill="#1a2e1a" fontSize={12} fontWeight={600}>
                {payload.name}
            </text>
            <text x={ex + (cos >= 0 ? 8 : -8)} y={ey} dy={16} textAnchor={textAnchor} fill="#4a6a4a" fontSize={11}>
                {formatNumber(value, true)} {payload.unit} ({(percent * 100).toFixed(1)}%)
            </text>
        </g>
    );
}

export default function CategoryPieChart({ historical, loading, mode }) {
    const unit = unitLabel(mode);

    const fyList = useMemo(() => {
        if (!historical) return [];
        return [...new Set(historical.map((r) => r.fy))].filter(Boolean);
    }, [historical]);

    const [selectedFy, setSelectedFy] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const activeFy = selectedFy || fyList[fyList.length - 1] || '';

    const pieData = useMemo(() => {
        if (!historical || !activeFy) return [];
        const filtered = historical.filter((r) => r.fy === activeFy);
        return CATEGORIES.map((c) => ({
            name: c.label,
            value: filtered.reduce((sum, r) => sum + (r[catKey(c.key, mode)] || 0), 0),
            fill: c.color,
            unit,
        })).filter((d) => d.value > 0);
    }, [historical, activeFy, mode, unit]);

    const totalVal = pieData.reduce((s, d) => s + d.value, 0);

    if (loading) {
        return (
            <div className="glass-card stagger-4">
                <div className="chart-header"><span className="chart-title">Category Distribution</span></div>
                <div className="skeleton skeleton--chart" style={{ height: 320 }} />
            </div>
        );
    }

    const title = mode === 'tco2' ? '🥧 Emissions Distribution by Category' : '🥧 Consumption Distribution by Category';
    const subtitle = mode === 'tco2'
        ? `Share of tCO₂ emissions per tariff category for each FY`
        : `Share of consumed kWh per tariff category for each FY`;
    const totalLabel = mode === 'tco2' ? 'TOTAL EMISSIONS' : 'TOTAL CONSUMED';

    return (
        <div className="glass-card stagger-4">
            <div className="chart-header">
                <div>
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {fyList.map((fy) => (
                    <button key={fy} onClick={() => { setSelectedFy(fy); setActiveIndex(0); }} style={{
                        padding: '5px 12px', borderRadius: '6px',
                        border: activeFy === fy ? '1px solid #16a34a' : '1px solid rgba(0,0,0,0.1)',
                        background: activeFy === fy ? 'rgba(22, 163, 74, 0.08)' : 'rgba(0,0,0,0.02)',
                        color: activeFy === fy ? '#16a34a' : '#7a9a7a',
                        fontFamily: 'var(--font-family)', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease',
                    }}>
                        {fy}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ flex: '1 1 60%', minHeight: 320 }}>
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie activeIndex={activeIndex} activeShape={renderActiveShape} data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} dataKey="value" onMouseEnter={(_, index) => setActiveIndex(index)} stroke="rgba(255, 255, 255, 0.6)" strokeWidth={2}>
                                {pieData.map((entry, index) => (<Cell key={index} fill={entry.fill} />))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#7a9a7a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        FY {activeFy} — {totalLabel}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a2e1a', marginBottom: '12px' }}>
                        {formatNumber(totalVal, true)} <span style={{ fontSize: '0.85rem', color: '#7a9a7a', fontWeight: 400 }}>{unit}</span>
                    </div>
                    {pieData.map((d, i) => {
                        const pct = totalVal > 0 ? ((d.value / totalVal) * 100).toFixed(1) : 0;
                        return (
                            <div key={d.name} style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px',
                                background: activeIndex === i ? 'rgba(22, 163, 74, 0.06)' : 'transparent', cursor: 'pointer', transition: 'background 0.15s ease',
                            }} onMouseEnter={() => setActiveIndex(i)}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: '0.8rem', color: '#4a6a4a' }}>{d.name}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: d.fill }}>{pct}%</span>
                                <span style={{ fontSize: '0.72rem', color: '#7a9a7a' }}>{formatNumber(d.value, true)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
