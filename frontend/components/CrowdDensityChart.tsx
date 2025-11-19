"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  timestamp: number;
  count: number;
}

interface CrowdDensityChartProps {
  data: DataPoint[];
  onClick?: (data: any) => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover p-3 border border-border shadow-lg rounded-lg">
        <p className="text-sm font-medium text-muted-foreground font-mono">{`Time: ${label}`}</p>
        <p className="text-sm font-bold text-primary font-serif">{`People: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export default function CrowdDensityChart({
  data,
  onClick,
}: CrowdDensityChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    ...d,
    timeLabel: formatTime(d.timestamp),
  }));

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-card-foreground font-serif">
          Crowd Density over Time
        </h3>
        <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted/50 rounded-full border border-border font-mono">
          Click chart to seek video
        </span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart
          data={chartData}
          onClick={onClick}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="timeLabel"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--muted-foreground)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--muted-foreground)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--primary)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            activeDot={{
              r: 6,
              strokeWidth: 0,
              fill: "var(--background)",
              stroke: "var(--primary)",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
