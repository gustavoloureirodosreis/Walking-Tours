"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface DataPoint {
  timestamp: number;
  count: number;
}

interface CrowdDensityChartProps {
  data: DataPoint[];
  onSeek?: (timestamp: number) => void;
}

const chartConfig = {
  count: {
    label: "Crowd count",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function CrowdDensityChart({
  data,
  onSeek,
}: CrowdDensityChartProps) {
  if (!data || data.length === 0) return null;

  const handleChartClick = (state: any) => {
    if (!onSeek) return;

    const timestampFromPayload =
      state?.activePayload?.[0]?.payload?.timestamp ?? null;
    const timestampFromLabel =
      typeof state?.activeLabel === "number" ? state.activeLabel : null;

    const timestamp =
      typeof timestampFromPayload === "number"
        ? timestampFromPayload
        : timestampFromLabel;

    if (typeof timestamp === "number" && !Number.isNaN(timestamp)) {
      onSeek(timestamp);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-card-foreground">
          Crowd Density over Time
        </h3>
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-mono font-medium text-muted-foreground">
          Click a timestamp to seek video
        </span>
      </div>

      <ChartContainer config={chartConfig} className="h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={handleChartClick}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            className="cursor-pointer"
          >
            <defs>
              <linearGradient id="countGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={0.5}
                />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => formatTime(Number(value))}
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
              domain={["dataMin", "dataMax"]}
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
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) =>
                    `Time ${formatTime(Number(value))}`
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--primary)"
              strokeWidth={3}
              fill="url(#countGradient)"
              fillOpacity={1}
              activeDot={{
                r: 6,
                fill: "var(--background)",
                strokeWidth: 2,
                stroke: "var(--primary)",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
