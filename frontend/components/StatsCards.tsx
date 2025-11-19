"use client";

import { Users, Activity, Clock, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  maxCount: number;
  avgCount: number;
  peakTime: string;
  duration: string;
}

export default function StatsCards({
  maxCount,
  avgCount,
  peakTime,
  duration,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Peak Crowd Density",
      value: maxCount.toString(),
      subtext: "People at once",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Average Density",
      value: avgCount.toFixed(1),
      subtext: "People per frame",
      icon: Activity,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      label: "Peak Time",
      value: peakTime,
      subtext: "High congestion",
      icon: Clock,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      label: "Duration",
      value: duration,
      subtext: "Analyzed footage",
      icon: TrendingUp,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground font-sans">
                {stat.label}
              </p>
              <h3 className="text-2xl font-bold text-card-foreground mt-2 font-serif">
                {stat.value}
              </h3>
              <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
                {stat.subtext}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
