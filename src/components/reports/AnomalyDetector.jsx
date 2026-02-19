import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Brain, TrendingUp, TrendingDown, Zap, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";

export default function AnomalyDetector() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedAnomalies, setDetectedAnomalies] = useState(null);
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ['triageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date', 500),
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['mdConsultations'],
    queryFn: () => appClient.entities.MDConsultation.list('-created_date', 500),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['allAlerts'],
    queryFn: () => appClient.entities.PendingAlert.list('-created_date', 200),
  });

  const createReportMutation = useMutation({
    mutationFn: (reportData) => appClient.entities.AutomatedReport.create(reportData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automatedReports'] });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: (emailData) => appClient.integrations.Core.SendEmail(emailData),
  });

  const analyzeForAnomalies = async () => {
    setIsAnalyzing(true);

    try {
      // Calculate recent metrics (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentLogs = logs.filter(l => new Date(l.created_date) >= sevenDaysAgo);
      const recentConsultations = consultations.filter(c => new Date(c.created_date) >= sevenDaysAgo);
      const recentAlerts = alerts.filter(a => new Date(a.created_date) >= sevenDaysAgo);

      // Calculate 30-day baseline
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const baselineLogs = logs.filter(l => {
        const date = new Date(l.created_date);
        return date >= thirtyDaysAgo && date < sevenDaysAgo;
      });

      const recentCallVolume = recentLogs.length + recentConsultations.length;
      const baselineCallVolume = (baselineLogs.length / 23) * 7; // Average per week

      const recentAvgDuration = recentLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / recentLogs.length;
      const baselineAvgDuration = baselineLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / baselineLogs.length;

      const criticalAlerts = recentAlerts.filter(a => a.priority === 'critical').length;
      const responseTimeIssues = recentAlerts.filter(a => a.response_time_minutes > 30).length;

      // Build metrics summary for AI
      const metricsData = {
        recent: {
          callVolume: recentCallVolume,
          avgDuration: recentAvgDuration,
          criticalAlerts,
          responseTimeIssues,
          period: "Last 7 days"
        },
        baseline: {
          callVolume: Math.round(baselineCallVolume),
          avgDuration: baselineAvgDuration,
          period: "Previous 23 days"
        },
        changes: {
          callVolumeChange: ((recentCallVolume - baselineCallVolume) / baselineCallVolume) * 100,
          durationChange: ((recentAvgDuration - baselineAvgDuration) / baselineAvgDuration) * 100
        }
      };

      // Use AI to detect anomalies
      const prompt = `You are an expert medical triage system analyst. Analyze the following metrics and detect any anomalies, trends, or concerning patterns.

RECENT METRICS (Last 7 days):
- Call Volume: ${recentCallVolume} calls
- Average Duration: ${recentAvgDuration.toFixed(1)} seconds
- Critical Alerts: ${criticalAlerts}
- Response Time Issues (>30 min): ${responseTimeIssues}

BASELINE METRICS (Previous 23 days avg per week):
- Call Volume: ${Math.round(baselineCallVolume)} calls
- Average Duration: ${baselineAvgDuration.toFixed(1)} seconds

CHANGES:
- Call Volume: ${metricsData.changes.callVolumeChange.toFixed(1)}% ${metricsData.changes.callVolumeChange > 0 ? 'increase' : 'decrease'}
- Duration: ${metricsData.changes.durationChange.toFixed(1)}% ${metricsData.changes.durationChange > 0 ? 'increase' : 'decrease'}

TASK:
Identify any anomalies, concerning trends, or significant deviations from baseline. Consider:
1. Statistical significance of changes (>20% change is notable, >50% is critical)
2. Multiple concerning indicators happening together
3. Patterns that could indicate systemic issues
4. Actionable insights for coordinators/administrators

For each anomaly detected:
- Classify severity: low, medium, high, or critical
- Explain the concern and potential impact
- Suggest specific actions to address it

If NO significant anomalies are detected, state that clearly.`;

      const aiAnalysis = await appClient.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            has_anomalies: {
              type: "boolean",
              description: "Whether significant anomalies were detected"
            },
            overall_severity: {
              type: "string",
              enum: ["info", "attention_needed", "urgent"],
              description: "Overall severity of findings"
            },
            summary: {
              type: "string",
              description: "Executive summary of findings"
            },
            anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    description: "Type of anomaly (e.g., volume spike, performance degradation)"
                  },
                  severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"]
                  },
                  description: {
                    type: "string",
                    description: "Detailed description of the anomaly"
                  },
                  metric_impact: {
                    type: "string",
                    description: "Which metrics are impacted"
                  }
                }
              }
            },
            action_items: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Recommended actions"
            }
          },
          required: ["has_anomalies", "overall_severity", "summary"]
        }
      });

      setDetectedAnomalies({
        ...aiAnalysis,
        metrics: metricsData,
        timestamp: new Date().toISOString()
      });

      // If significant anomalies detected, create automated report
      if (aiAnalysis.has_anomalies && aiAnalysis.overall_severity !== 'info') {
        await createAutomatedReport(aiAnalysis, metricsData);
      }

    } catch (error) {
      console.error("Error analyzing for anomalies:", error);
    }

    setIsAnalyzing(false);
  };

  const createAutomatedReport = async (analysis, metrics) => {
    try {
      const user = await appClient.auth.me();

      const reportData = {
        report_title: `Anomaly Alert: ${analysis.anomalies?.[0]?.type || 'Performance Issue Detected'}`,
        report_type: 'anomaly_detected',
        trigger_reason: analysis.summary,
        report_data: {
          metrics,
          analysis
        },
        ai_insights: analysis.summary,
        anomalies_detected: analysis.anomalies || [],
        recipients: [user.email], // Send to current user
        delivery_status: 'pending',
        summary: analysis.summary,
        action_items: analysis.action_items || [],
        severity: analysis.overall_severity
      };

      const report = await createReportMutation.mutateAsync(reportData);

      // Send email notification
      const emailBody = `
Automated Anomaly Detection Alert

${analysis.summary}

DETECTED ANOMALIES:
${(analysis.anomalies || []).map((a, i) => `
${i + 1}. ${a.type.toUpperCase()} (${a.severity})
   ${a.description}
   Impact: ${a.metric_impact}
`).join('\n')}

RECOMMENDED ACTIONS:
${(analysis.action_items || []).map((action, i) => `${i + 1}. ${action}`).join('\n')}

This is an automated alert generated by TriageLink's AI monitoring system.
Log in to view detailed metrics and take action.
      `;

      await sendEmailMutation.mutateAsync({
        to: user.email,
        subject: `🚨 TriageLink Alert: ${analysis.anomalies?.[0]?.type || 'Anomaly Detected'}`,
        body: emailBody
      });

      // Update report as sent
      await appClient.entities.AutomatedReport.update(report.id, {
        delivery_status: 'sent',
        sent_at: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error creating automated report:", error);
    }
  };

  const severityConfig = {
    info: { bg: '#1E3A8A', text: '#60A5FA', icon: TrendingUp },
    attention_needed: { bg: '#92400E', text: '#F59E0B', icon: AlertTriangle },
    urgent: { bg: '#991B1B', text: '#EF4444', icon: Zap }
  };

  const anomalySeverityConfig = {
    low: { color: '#60A5FA', bg: '#1E3A8A' },
    medium: { color: '#F59E0B', bg: '#92400E' },
    high: { color: '#F97316', bg: '#9A3412' },
    critical: { color: '#EF4444', bg: '#991B1B' }
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <Brain className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            AI Anomaly Detection
          </CardTitle>
          <Button
            onClick={analyzeForAnomalies}
            disabled={isAnalyzing}
            size="sm"
            style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF' }}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Check for Anomalies
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {!detectedAnomalies ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Brain className="w-16 h-16 mx-auto mb-4" style={{ color: '#8B5CF6' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#60A5FA' }}>
                Automated Anomaly Monitoring
              </h3>
              <p className="mb-4" style={{ color: '#9CA3AF' }}>
                AI continuously monitors your system for unusual patterns, performance issues, and significant deviations from normal operations.
              </p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>
                Click "Check for Anomalies" to run analysis now
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Overall Status */}
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: severityConfig[detectedAnomalies.overall_severity].bg,
                  borderColor: severityConfig[detectedAnomalies.overall_severity].text
                }}
              >
                <div className="flex items-start gap-3">
                  {React.createElement(severityConfig[detectedAnomalies.overall_severity].icon, {
                    className: "w-6 h-6 flex-shrink-0",
                    style: { color: severityConfig[detectedAnomalies.overall_severity].text }
                  })}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        style={{
                          backgroundColor: severityConfig[detectedAnomalies.overall_severity].text,
                          color: '#000000'
                        }}
                      >
                        {detectedAnomalies.overall_severity.toUpperCase().replace('_', ' ')}
                      </Badge>
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        {new Date(detectedAnomalies.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-semibold" style={{ color: '#E0E7FF' }}>
                      {detectedAnomalies.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Anomalies List */}
              {detectedAnomalies.anomalies && detectedAnomalies.anomalies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm" style={{ color: '#60A5FA' }}>
                    Detected Issues:
                  </h4>
                  {detectedAnomalies.anomalies.map((anomaly, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: anomalySeverityConfig[anomaly.severity].bg,
                        borderColor: anomalySeverityConfig[anomaly.severity].color
                      }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Badge
                          style={{
                            backgroundColor: anomalySeverityConfig[anomaly.severity].color,
                            color: '#000000'
                          }}
                        >
                          {anomaly.severity.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-sm" style={{ color: '#E0E7FF' }}>
                          {anomaly.type}
                        </span>
                      </div>
                      <p className="text-sm mb-1" style={{ color: '#E0E7FF' }}>
                        {anomaly.description}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        Impact: {anomaly.metric_impact}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Items */}
              {detectedAnomalies.action_items && detectedAnomalies.action_items.length > 0 && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#4B5563' }}>
                  <h4 className="font-semibold text-sm mb-3" style={{ color: '#60A5FA' }}>
                    📋 Recommended Actions:
                  </h4>
                  <ul className="space-y-2">
                    {detectedAnomalies.action_items.map((item, index) => (
                      <li key={index} className="text-sm flex items-start gap-2" style={{ color: '#E0E7FF' }}>
                        <span style={{ color: '#F59E0B' }}>→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!detectedAnomalies.has_anomalies && (
                <div className="text-center py-4">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2" style={{ color: '#10B981' }} />
                  <p className="font-semibold" style={{ color: '#10B981' }}>
                    All Systems Normal
                  </p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    No significant anomalies detected
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}