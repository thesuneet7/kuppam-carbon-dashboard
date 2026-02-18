import React from 'react';
import {
    ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { formatNumber, formatDate, totalKey, unitLabel } from '../utils';

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

export default function CombinedChart({ historical, forecast, loading, mode }) {
    const unit = unitLabel(mode);
    const tKey = totalKey(mode);

    if (loading) {
        return (
            <div className="glass-card stagger-5">
                <div className="chart-header"><span className="chart-title">Combined Timeline</span></div>
                <div className="skeleton skeleton--chart" />
            </div>
        );
    }

    const histData = (historical || []).map((r) => ({
        date: r.date,
        historical: r[tKey] || 0,
        forecast: null,
    }));

    const foreData = (forecast || []).map((r) => ({
        date: r.date,
        historical: null,
        forecast: r[tKey] || 0,
    }));

    const lastHist = histData[histData.length - 1];
    let bridgeDate = lastHist?.date;

    const combined = [
        ...histData,
        ...(lastHist ? [{ date: lastHist.date, historical: lastHist.historical, forecast: lastHist.historical }] : []),
        ...foreData,
    ];

    const title = mode === 'tco2' ? 'Full Emissions Timeline' : 'Full Consumption Timeline';
    const subtitle = mode === 'tco2'
        ? 'Historical tCO₂ with forecast projection overlay'
        : 'Historical consumed kWh with forecast projection overlay';
    const histLabel = mode === 'tco2' ? 'Historical tCO₂' : 'Historical Consumed';
    const foreLabel = mode === 'tco2' ? 'Forecast tCO₂' : 'Forecast Consumed';

    return (
        <div className="glass-card stagger-5">
            <div className="chart-header">
                <div>
                    <div className="chart-title">{title}</div>
                    <div className="chart-subtitle">{subtitle}</div>
                </div>
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={380}>
                    <ComposedChart data={combined} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="grad-hist" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.01} />
                            </linearGradient>
                            <linearGradient id="grad-fore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#059669" stopOpacity={0.01} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tickFormatter={formatDate} stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} interval={11} />
                        <YAxis tickFormatter={(v) => formatNumber(v, true)} stroke="rgba(0,0,0,0.1)" tick={{ fill: '#4a6a4a', fontSize: 11 }} width={60} label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#4a6a4a', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip unit={unit} />} />
                        {bridgeDate && (
                            <ReferenceLine x={bridgeDate} stroke="rgba(220, 38, 38, 0.5)" strokeDasharray="4 4" label={{ value: 'NOW', position: 'top', fill: '#dc2626', fontSize: 11, fontWeight: 600 }} />
                        )}
                        <Area type="monotone" dataKey="historical" name={histLabel} stroke="#16a34a" fill="url(#grad-hist)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
                        <Area type="monotone" dataKey="forecast" name={foreLabel} stroke="#059669" fill="url(#grad-fore)" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-legend">
                <div className="chart-legend__item"><span className="chart-legend__dot" style={{ background: '#16a34a' }} />{histLabel}</div>
                <div className="chart-legend__item"><span className="chart-legend__dot" style={{ background: '#059669' }} />{foreLabel}</div>
                <div className="chart-legend__item"><span className="chart-legend__dot" style={{ background: '#dc2626' }} />Transition Point</div>
            </div>
        </div>
    );
}
