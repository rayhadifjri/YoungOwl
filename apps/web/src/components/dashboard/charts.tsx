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

const SEV_COLORS: Record<Severity, string> = {
  CRITICAL: '#f43f5e',
  HIGH: '#fb923c',
  MEDIUM: '#facc15',
  LOW: '#38bdf8',
  INFO: '#94a3b8',
};
const ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const tooltipStyle = {
  contentStyle: {
    background: '#0a1428',
    border: '1px solid #1a2f57',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: '#94a3b8' },
  cursor: { fill: 'rgba(34,211,238,0.06)' },
};

export function SeverityChart({ data }: { data: Record<Severity, number> }) {
  const rows = ORDER.map((s) => ({ severity: s, count: data[s] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="#112142" />
        <XAxis type="number" allowDecimals={false} stroke="#475569" fontSize={11} />
        <YAxis type="category" dataKey="severity" stroke="#475569" fontSize={11} width={70} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
          {rows.map((r) => (
            <Cell key={r.severity} fill={SEV_COLORS[r.severity]} />
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
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={rows} margin={{ left: -16, right: 8 }}>
        <defs>
          <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#112142" />
        <XAxis dataKey="label" stroke="#475569" fontSize={11} />
        <YAxis allowDecimals={false} stroke="#475569" fontSize={11} />
        <Tooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name="Assessments"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#trend)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
