'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Severity } from '@young-owl/shared';

export const SEV_COLORS: Record<Severity, string> = {
  CRITICAL: '#f43f5e',
  HIGH: '#fb923c',
  MEDIUM: '#facc15',
  LOW: '#38bdf8',
  INFO: '#cbd5e1',
};
const ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(226,232,240,0.9)',
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: '#64748b' },
  cursor: { fill: 'rgba(15,23,42,0.03)' },
};
const axis = { stroke: '#94a3b8', fontSize: 11, tickLine: false, axisLine: false };
const grid = 'rgba(15,23,42,0.06)';

export function SeverityChart({ data }: { data: Record<Severity, number> }) {
  const rows = ORDER.map((s) => ({
    severity: s.charAt(0) + s.slice(1).toLowerCase(),
    key: s,
    count: data[s] ?? 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 12 }}>
        <CartesianGrid horizontal={false} stroke={grid} />
        <XAxis type="number" allowDecimals={false} {...axis} />
        <YAxis type="category" dataKey="severity" width={64} {...axis} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" radius={[0, 999, 999, 0]} barSize={10}>
          {rows.map((r) => (
            <Cell key={r.key} fill={SEV_COLORS[r.key]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AssessmentTrend({ data }: { data: { month: string; count: number }[] }) {
  const rows = data.map((d) => ({
    ...d,
    label: new Date(`${d.month}-01T00:00:00Z`).toLocaleString('en', {
      month: 'short',
      timeZone: 'UTC',
    }),
  }));
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={rows} margin={{ left: -24, right: 4, top: 8 }}>
        <defs>
          <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="label" {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name="Assessments"
          stroke="#0891b2"
          strokeWidth={1.75}
          fill="url(#trend)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
