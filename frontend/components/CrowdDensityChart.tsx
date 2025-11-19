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

// ... (CustomTooltip remains the same)

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
        <h3 className="text-lg font-bold text-slate-200">
          Crowd Density over Time
        </h3>
        <span className="text-xs font-medium text-slate-500 px-3 py-1 bg-white/5 rounded-full border border-white/5">
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
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.1)"
          />
          <XAxis
            dataKey="timeLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              borderColor: "rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "#fff",
            }}
            itemStyle={{ color: "#fff" }}
            cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#a855f7"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            activeDot={{ r: 6, strokeWidth: 0, fill: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
