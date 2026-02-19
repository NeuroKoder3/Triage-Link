import React, { useState, useMemo } from "react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Brain, TrendingUp, Clock, Target, AlertCircle, Users, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function TriageAnalyticsSection() {
  const [aiInsights, setAiInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: triageLogs = [] } = useQuery({
    queryKey: ['triageLogsAnalytics'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date', 500),
  });

  const { data: corrections = [] } = useQuery({
    queryKey: ['aiCorrectionsAnalytics'],
    queryFn: () => appClient.entities.AICorrection.list('-created_date', 200),
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['triageRulesAnalytics'],
    queryFn: () => appClient.entities.TriageRule.list(),
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['riskAssessmentsAnalytics'],
    queryFn: () => appClient.entities.RiskAssessment.list('-created_date', 200),
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalTriages = triageLogs.length;
    const avgTime = totalTriages > 0 
      ? Math.round(triageLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / totalTriages)
      : 0;
    
    const aiAccuracy = totalTriages > 0 
      ? Math.round(((totalTriages - corrections.length) / totalTriages) * 100)
      : 0;

    const highRiskCount = riskAssessments.filter(r => 
      r.risk_level === 'high' || r.risk_level === 'critical'
    ).length;

    return { totalTriages, avgTime, aiAccuracy, highRiskCount };
  }, [triageLogs, corrections, riskAssessments]);

  // Complaints by organ type
  const complaintsByOrgan = useMemo(() => {
    const organMap = {};
    triageLogs.forEach(log => {
      const organ = log.organ_type || 'unknown';
      const complaint = log.complaint_category || 'Other';
      const key = `${organ}-${complaint}`;
      
      if (!organMap[organ]) {
        organMap[organ] = {};
      }
      organMap[organ][complaint] = (organMap[organ][complaint] || 0) + 1;
    });

    return Object.entries(organMap).map(([organ, complaints]) => {
      const topComplaint = Object.entries(complaints)
        .sort((a, b) => b[1] - a[1])[0];
      return {
        organ: organ === 'kidney-pancreas' ? 'Kidney & Pancreas' : organ.charAt(0).toUpperCase() + organ.slice(1),
        topComplaint: topComplaint ? topComplaint[0] : 'N/A',
        count: topComplaint ? topComplaint[1] : 0
      };
    });
  }, [triageLogs]);

  // Most used rules
  const ruleUsage = useMemo(() => {
    const ruleMap = {};
    triageLogs.forEach(log => {
      if (log.rule_id) {
        ruleMap[log.rule_id] = (ruleMap[log.rule_id] || 0) + 1;
      }
    });

    return Object.entries(ruleMap)
      .map(([ruleId, count]) => {
        const rule = rules.find(r => r.id === ruleId);
        return {
          name: rule ? `${rule.complaint_category.substring(0, 20)}...` : 'Unknown',
          count,
          fullName: rule?.complaint_category || 'Unknown'
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [triageLogs, rules]);

  // Patient type distribution
  const patientTypeDistribution = useMemo(() => {
    const typeMap = {};
    triageLogs.forEach(log => {
      const type = log.patient_type || 'unknown';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });

    return Object.entries(typeMap).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count
    }));
  }, [triageLogs]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Prepare data for AI analysis
      const complaintFrequency = {};
      triageLogs.forEach(log => {
        const key = `${log.organ_type}-${log.complaint_category}`;
        complaintFrequency[key] = (complaintFrequency[key] || 0) + 1;
      });

      const hospitalPerformance = {};
      triageLogs.forEach(log => {
        if (!hospitalPerformance[log.hospital_id]) {
          hospitalPerformance[log.hospital_id] = {
            count: 0,
            totalTime: 0,
            name: log.hospital_name
          };
        }
        hospitalPerformance[log.hospital_id].count++;
        hospitalPerformance[log.hospital_id].totalTime += log.duration_seconds || 0;
      });

      const prompt = `Analyze this triage system data and provide actionable insights for optimization:

PERFORMANCE METRICS:
- Total triages processed: ${metrics.totalTriages}
- Average triage time: ${metrics.avgTime} seconds
- AI accuracy rate: ${metrics.aiAccuracy}%
- High-risk patients identified: ${metrics.highRiskCount}

COMPLAINT PATTERNS:
${JSON.stringify(Object.entries(complaintFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10), null, 2)}

HOSPITAL PERFORMANCE:
${JSON.stringify(Object.values(hospitalPerformance).map(h => ({
  hospital: h.name,
  triages: h.count,
  avgTime: Math.round(h.totalTime / h.count)
})), null, 2)}

AI CORRECTION PATTERNS:
- Total overrides: ${corrections.length}
- Override rate: ${((corrections.length / metrics.totalTriages) * 100).toFixed(1)}%

HIGH-RISK DEMOGRAPHICS:
${JSON.stringify(riskAssessments.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').slice(0, 10).map(r => ({
  type: r.assessment_type,
  risk: r.risk_level,
  factors: r.contributing_factors?.slice(0, 3).map(f => f.factor)
})), null, 2)}

Provide:
1. Key trends and patterns identified
2. Resource allocation recommendations
3. Process optimization suggestions
4. Areas needing attention or improvement
5. Predicted future needs based on patterns`;

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            keyTrends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trend: { type: "string" },
                  impact: { type: "string" },
                  actionable: { type: "boolean" }
                }
              }
            },
            resourceRecommendations: {
              type: "array",
              items: { type: "string" }
            },
            processOptimizations: {
              type: "array",
              items: { type: "string" }
            },
            areasNeedingAttention: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  severity: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            predictedNeeds: {
              type: "array",
              items: { type: "string" }
            },
            summary: { type: "string" }
          }
        }
      });

      setAiInsights(result);
    } catch (error) {
      console.error('AI analysis error:', error);
    }
    setIsAnalyzing(false);
  };

  const COLORS = ['#60A5FA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <Card className="border" style={{ borderColor: '#8B5CF6', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#8B5CF6' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <Brain className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            Triage Analytics & Insights
          </CardTitle>
          <Button
            onClick={handleAIAnalysis}
            disabled={isAnalyzing || triageLogs.length === 0}
            style={{ backgroundColor: '#8B5CF6', color: '#000000' }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate AI Insights
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#1F2937' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-6 h-6" style={{ color: '#60A5FA' }} />
                <span className="text-2xl font-bold" style={{ color: '#60A5FA' }}>
                  {metrics.totalTriages}
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#60A5FA' }}>Total Triages</p>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#10B981', backgroundColor: '#1F2937' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-6 h-6" style={{ color: '#10B981' }} />
                <span className="text-2xl font-bold" style={{ color: '#60A5FA' }}>
                  {metrics.avgTime}s
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#60A5FA' }}>Avg Resolution</p>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#8B5CF6', backgroundColor: '#1F2937' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                <span className="text-2xl font-bold" style={{ color: '#60A5FA' }}>
                  {metrics.aiAccuracy}%
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#60A5FA' }}>AI Accuracy</p>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#EF4444', backgroundColor: '#1F2937' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} />
                <span className="text-2xl font-bold" style={{ color: '#60A5FA' }}>
                  {metrics.highRiskCount}
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#60A5FA' }}>High Risk</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Complaints by Organ */}
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#1F2937' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle className="text-sm" style={{ color: '#60A5FA' }}>
                Top Complaints by Organ Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {complaintsByOrgan.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={complaintsByOrgan}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                    <XAxis dataKey="organ" tick={{ fill: '#60A5FA', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#60A5FA' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#60A5FA" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Most Used Rules */}
          <Card className="border" style={{ borderColor: '#10B981', backgroundColor: '#1F2937' }}>
            <CardHeader className="border-b" style={{ borderColor: '#10B981' }}>
              <CardTitle className="text-sm" style={{ color: '#60A5FA' }}>
                Most Frequently Used Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {ruleUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ruleUsage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                    <XAxis type="number" tick={{ fill: '#60A5FA' }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#60A5FA', fontSize: 10 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Patient Type Distribution */}
        <Card className="border" style={{ borderColor: '#8B5CF6', backgroundColor: '#1F2937' }}>
          <CardHeader className="border-b" style={{ borderColor: '#8B5CF6' }}>
            <CardTitle className="text-sm" style={{ color: '#60A5FA' }}>
              Patient Demographics Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {patientTypeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={patientTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {patientTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        {aiInsights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="border" style={{ borderColor: '#10B981', backgroundColor: '#065F46' }}>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                  AI Analysis Summary
                </h3>
                <p className="text-sm" style={{ color: '#D1D5DB' }}>{aiInsights.summary}</p>
              </CardContent>
            </Card>

            {aiInsights.keyTrends && aiInsights.keyTrends.length > 0 && (
              <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#1F2937' }}>
                <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
                  <CardTitle className="text-sm" style={{ color: '#60A5FA' }}>Key Trends Identified</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {aiInsights.keyTrends.map((trend, idx) => (
                    <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: '#374151' }}>
                      <p className="font-semibold text-sm" style={{ color: '#60A5FA' }}>{trend.trend}</p>
                      <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>Impact: {trend.impact}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {aiInsights.resourceRecommendations && aiInsights.resourceRecommendations.length > 0 && (
              <Card className="border" style={{ borderColor: '#F59E0B', backgroundColor: '#1F2937' }}>
                <CardHeader className="border-b" style={{ borderColor: '#F59E0B' }}>
                  <CardTitle className="text-sm" style={{ color: '#60A5FA' }}>Resource Allocation Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {aiInsights.resourceRecommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#D1D5DB' }}>
                        <Users className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {aiInsights.areasNeedingAttention && aiInsights.areasNeedingAttention.length > 0 && (
              <Card className="border" style={{ borderColor: '#EF4444', backgroundColor: '#1F2937' }}>
                <CardHeader className="border-b" style={{ borderColor: '#EF4444' }}>
                  <CardTitle className="text-sm" style={{ color: '#60A5FA' }}>Areas Needing Attention</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {aiInsights.areasNeedingAttention.map((area, idx) => (
                    <div key={idx} className="p-3 rounded-lg border" style={{ backgroundColor: '#7F1D1D', borderColor: '#EF4444' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
                        <p className="font-semibold text-sm" style={{ color: '#FCA5A5' }}>{area.area}</p>
                      </div>
                      <p className="text-xs" style={{ color: '#FCA5A5' }}>Severity: {area.severity}</p>
                      <p className="text-xs mt-2" style={{ color: '#D1D5DB' }}>{area.recommendation}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {triageLogs.length === 0 && (
          <div className="text-center py-8">
            <p style={{ color: '#60A5FA' }}>No triage data available yet. Complete some triages to see analytics.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}