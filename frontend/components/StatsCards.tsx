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
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Average Density",
      value: avgCount.toFixed(1),
      subtext: "People per frame",
      icon: Activity,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Peak Time",
      value: peakTime,
      subtext: "High congestion",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "Duration",
      value: duration,
      subtext: "Analyzed footage",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {stat.value}
              </h3>
              <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
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
