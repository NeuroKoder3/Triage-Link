import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { appClient } from "@/api/appClient";

export default function TrendInsights({ data, dateRange }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      generateInsights();
    }
  }, [data]);

  const generateInsights = async () => {
    setIsLoading(true);

    try {
      const prompt = `You are a medical triage system analyst. Analyze the following data trends and provide actionable insights.

DATA SUMMARY:
- Total Calls: ${data.totalCalls || 0}
- Average Resolution Time: ${data.avgDuration || 0} seconds
- AI Accuracy: ${Math.round(data.aiAccuracy || 0)}%
- Average Response Time: ${data.avgResponseTime || 0} minutes

TRENDS:
${JSON.stringify({
  callVolumeByDate: (data.volumeOverTime || []).slice(-7),
  resolutionTimeTrend: (data.resolutionTrend || []).slice(-7),
  aiAccuracyTrend: (data.aiAccuracyTrend || []).slice(-7),
  callsByHospital: (data.callsByHospital || []).slice(0, 5)
})}

TASK:
Provide 3-5 key insights about:
1. Notable trends (increasing/decreasing patterns)
2. Performance highlights (what's working well)
3. Areas of concern (what needs attention)
4. Actionable recommendations

Be specific, concise, and focused on what coordinators and administrators need to know.`;

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  sentiment: { 
                    type: "string",
                    enum: ["positive", "neutral", "concern"]
                  },
                  metric_impact: { type: "string" }
                }
              }
            },
            overall_summary: {
              type: "string",
              description: "One sentence overall assessment"
            }
          },
          required: ["insights", "overall_summary"]
        }
      });

      setInsights(result);
    } catch (error) {
      console.error("Error generating insights:", error);
    }

    setIsLoading(false);
  };

  const sentimentConfig = {
    positive: { 
      icon: CheckCircle, 
      color: '#10B981', 
      bg: '#065F46',
      border: '#10B981'
    },
    neutral: { 
      icon: TrendingUp, 
      color: '#60A5FA', 
      bg: '#1E3A8A',
      border: '#60A5FA'
    },
    concern: { 
      icon: AlertCircle, 
      color: '#F59E0B', 
      bg: '#78350F',
      border: '#F59E0B'
    }
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
          <Brain className="w-5 h-5" style={{ color: '#8B5CF6' }} />
          AI Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#8B5CF6' }} />
              <span className="ml-3" style={{ color: '#60A5FA' }}>Analyzing trends...</span>
            </motion.div>
          ) : insights ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Overall Summary */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#4B5563', borderColor: '#8B5CF6' }}>
                <p className="font-semibold" style={{ color: '#60A5FA' }}>
                  {insights.overall_summary}
                </p>
              </div>

              {/* Individual Insights */}
              <div className="space-y-3">
                {(insights.insights || []).map((insight, index) => {
                  const config = sentimentConfig[insight.sentiment] || sentimentConfig.neutral;
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border"
                      style={{ 
                        backgroundColor: config.bg,
                        borderColor: config.border
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: config.color }} />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1" style={{ color: '#60A5FA' }}>
                            {insight.title}
                          </h4>
                          <p className="text-sm mb-2" style={{ color: '#60A5FA' }}>
                            {insight.description}
                          </p>
                          {insight.metric_impact && (
                            <Badge 
                              className="text-xs"
                              style={{ 
                                backgroundColor: config.bg,
                                color: config.color,
                                borderColor: config.border
                              }}
                            >
                              Impact: {insight.metric_impact}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Brain className="w-12 h-12 mx-auto mb-3" style={{ color: '#8B5CF6' }} />
              <p style={{ color: '#60A5FA' }}>
                AI insights will appear here once data is loaded
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}