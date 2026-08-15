"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { formatNumber, formatPercent } from "@/lib/domain";

export const CHART_COLORS = [
  "#2563eb", // mavi
  "#0ea5e9", // açık mavi
  "#f59e0b", // turuncu
  "#10b981", // yeşil
  "#f43f5e", // kırmızı-pembe
  "#8b5cf6", // mor
  "#94a3b8", // gri
  "#eab308",
  "#06b6d4",
  "#d946ef",
];

export const SONUC_RENK: Record<string, string> = {
  Olumlu: "#10b981",
  Olumsuz: "#ef4444",
  Beklemede: "#f59e0b",
  Ulaşılamadı: "#8b5cf6",
  "Hatalı Numara": "#94a3b8",
  Toplam: "#2563eb",
};

type Datum = { name: string; value: number };

export function DonutChart({
  data,
  height = 200,
  colors = CHART_COLORS,
  colorMap,
}: {
  data: Datum[];
  height?: number;
  colors?: string[];
  colorMap?: Record<string, string>;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="95%"
          paddingAngle={1}
          strokeWidth={0}
        >
          {data.map((d, i) => (
            <Cell
              key={d.name}
              fill={colorMap?.[d.name] ?? colors[i % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatNumber(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DonutLegend({
  data,
  colorMap,
  colors = CHART_COLORS,
  showCount = true,
}: {
  data: Datum[];
  colorMap?: Record<string, string>;
  colors?: string[];
  showCount?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="space-y-2">
      {data.map((d, i) => (
        <li key={d.name} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: colorMap?.[d.name] ?? colors[i % colors.length] }}
          />
          <span className="truncate text-slate-600">{d.name}</span>
          <span className="ml-auto whitespace-nowrap font-medium text-slate-700">
            {formatPercent((d.value / total) * 100)}
            {showCount ? (
              <span className="ml-1 text-muted">({formatNumber(d.value)})</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Donut + lejant: dar ekranda lejant alta sarar, taşma olmaz. */
export function DonutRow({
  data,
  colorMap,
  colors = CHART_COLORS,
  height = 150,
  showCount = true,
}: {
  data: Datum[];
  colorMap?: Record<string, string>;
  colors?: string[];
  height?: number;
  showCount?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="mx-auto w-[140px] flex-none">
        <DonutChart data={data} height={height} colors={colors} colorMap={colorMap} />
      </div>
      <div className="min-w-[170px] flex-1">
        <DonutLegend data={data} colors={colors} colorMap={colorMap} showCount={showCount} />
      </div>
    </div>
  );
}

export function TrendLine({
  data,
  height = 180,
  dataKey = "value",
  color = "#2563eb",
  area = true,
}: {
  data: Record<string, string | number>[];
  height?: number;
  dataKey?: string;
  color?: string;
  area?: boolean;
}) {
  const Chart = area ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip formatter={(v) => formatNumber(Number(v))} />
        {area ? (
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.2}
            fill={color}
            fillOpacity={0.08}
            dot={{ r: 3, fill: color }}
          />
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.2}
            dot={{ r: 3, fill: color }}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function MultiLine({
  data,
  series,
  height = 200,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color: string; label?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip formatter={(v) => formatNumber(Number(v))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label ?? s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 2.5, fill: s.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GroupedBars({
  data,
  series,
  height = 200,
  stacked = false,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color: string; label?: string }[];
  height?: number;
  stacked?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip formatter={(v) => formatNumber(Number(v))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label ?? s.key}
            fill={s.color}
            stackId={stacked ? "s" : undefined}
            radius={stacked ? 0 : [3, 3, 0, 0]}
            maxBarSize={18}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({
  data,
  height = 220,
  color = "#8b5cf6",
  angled = false,
}: {
  data: Datum[];
  height?: number;
  color?: string;
  angled?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: angled ? 30 : 0, left: -18 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 10 }}
          angle={angled ? -35 : 0}
          textAnchor={angled ? "end" : "middle"}
        />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip formatter={(v) => formatNumber(Number(v))} />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Başvuru → işe başlama huni grafiği */
export function Funnel({
  steps,
}: {
  steps: { label: string; value: number; color: string }[];
}) {
  const max = steps[0]?.value || 1;
  return (
    <div className="flex flex-col items-center gap-1.5">
      {steps.map((s) => {
        const w = 35 + (s.value / max) * 65;
        return (
          <div
            key={s.label}
            className="flex h-10 items-center justify-center text-[13px] font-semibold text-white"
            style={{
              width: `${w}%`,
              background: s.color,
              clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
            }}
            title={s.label}
          >
            {formatNumber(s.value)}
          </div>
        );
      })}
    </div>
  );
}

/** Yatay ilerleme çubuğu (oran göstergesi) */
export function RatioBar({ value, color = "#10b981" }: { value: number; color?: string }) {
  return (
    <span className="inline-flex w-24 items-center gap-1.5">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </span>
    </span>
  );
}
