"use client";

import * as React from "react";
import type { TooltipProps } from "recharts";
import { Tooltip } from "recharts";

import { cn } from "@/lib/utils";

type ValueType = number | string;
type NameType = string;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
  }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

export function useChartConfig() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChartConfig must be used within a ChartContainer");
  }

  return context;
}

export interface ChartContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
}

export function ChartContainer({
  className,
  children,
  config,
  ...props
}: ChartContainerProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)} {...props}>
      <ChartContext.Provider value={config}>{children}</ChartContext.Provider>
    </div>
  );
}

export type ChartTooltipProps = TooltipProps<ValueType, NameType>;

export function ChartTooltip(props: ChartTooltipProps) {
  return (
    <Tooltip
      cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
      {...props}
    />
  );
}

type TooltipEntry = {
  dataKey?: string | number;
  name?: NameType;
  color?: string;
  value?: ValueType;
  payload?: Record<string, unknown>;
};

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: ValueType;
  indicator?: "dot" | "line";
  hideLabel?: boolean;
  labelFormatter?: (value: ValueType) => React.ReactNode;
  className?: string;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = "dot",
  hideLabel,
  className,
  labelFormatter,
}: ChartTooltipContentProps) {
  const config = React.useContext(ChartContext);

  if (!active || !payload?.length) {
    return null;
  }

  const labelContent =
    hideLabel || typeof label === "undefined"
      ? null
      : labelFormatter
      ? labelFormatter(label)
      : label;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-popover p-3 text-sm shadow-lg",
        className
      )}
    >
      {labelContent && (
        <div className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
          {labelContent}
        </div>
      )}

      <div className="mt-2 space-y-1">
        {payload.map((entry, index) => {
          const key =
            typeof entry.dataKey === "string"
              ? entry.dataKey
              : `${entry.dataKey ?? index}`;
          const item =
            typeof entry.dataKey === "string" ? config?.[entry.dataKey] : null;
          return (
            <div key={key} className="flex items-center gap-2 text-foreground">
              <span
                className={cn(
                  "inline-flex h-2 w-2 rounded-full",
                  indicator === "line" && "h-0.5 w-4 rounded-none"
                )}
                style={{
                  backgroundColor:
                    entry.color || item?.color || "var(--primary)",
                }}
              />
              <span className="font-medium">
                {item?.label || entry.name || entry.dataKey}
              </span>
              <span className="font-mono text-muted-foreground">
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
