import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MetricsCards({ metrics }) {
  if (!metrics) return null;

  const metricsData = [
    {
      title: "Total Calls",
      value: metrics.totalCalls || 0,
      icon: "📞",
      trend: null
    },
    {
      title: "Avg Resolution Time",
      value: `${Math.round(metrics.avgResolutionTime || 0)}s`,
      icon: "⏱️",
      trend: null
    },
    {
      title: "AI Accuracy",
      value: `${Math.round(metrics.aiAccuracy || 0)}%`,
      icon: "🤖",
      trend: metrics.aiAccuracy >= 80 ? "up" : "down"
    },
    {
      title: "Response Rate",
      value: `${Math.round(metrics.responseRate || 0)}%`,
      icon: "✅",
      trend: metrics.responseRate >= 90 ? "up" : "down"
    }
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      {metricsData.map((metric, index) => (
        <Card key={index} className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{metric.icon}</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold" style={{ color: '#60A5FA' }}>
                  {metric.value}
                </span>
                {metric.trend && (
                  metric.trend === "up" ? (
                    <TrendingUp className="w-6 h-6" style={{ color: '#10B981' }} />
                  ) : (
                    <TrendingDown className="w-6 h-6" style={{ color: '#EF4444' }} />
                  )
                )}
              </div>
            </div>
            <p className="font-semibold" style={{ color: '#60A5FA' }}>{metric.title}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}