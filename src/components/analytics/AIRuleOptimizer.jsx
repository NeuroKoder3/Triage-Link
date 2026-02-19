import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AIRuleOptimizer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['allRules'],
    queryFn: () => appClient.entities.TriageRule.list(),
  });

  const { data: triageLogs = [] } = useQuery({
    queryKey: ['allTriageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date', 500),
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['allFeedbacks'],
    queryFn: () => appClient.entities.AIFeedback.list('-created_date', 200),
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['allRiskAssessments'],
    queryFn: () => appClient.entities.RiskAssessment.list('-created_date', 200),
  });

  const { data: corrections = [] } = useQuery({
    queryKey: ['allCorrections'],
    queryFn: () => appClient.entities.AICorrection.list('-created_date', 200),
  });

  const createAlertMutation = useMutation({
    mutationFn: (alertData) => appClient.entities.ProactiveAlert.create(alertData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactiveAlerts'] });
    },
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Analyze rule performance
      const rulePerformance = rules.map(rule => {
        const usageCount = triageLogs.filter(log => log.rule_id === rule.id).length;
        const overrides = corrections.filter(c => c.ai_suggested_rule_id === rule.id).length;
        const lowRatings = feedbacks.filter(f => f.final_rule_id === rule.id && f.accuracy_rating <= 2).length;
        
        return {
          rule_id: rule.id,
          rule_name: `${rule.complaint_category} - ${rule.patient_type} - ${rule.organ_type}`,
          hospital_id: rule.hospital_id,
          usage_count: usageCount,
          override_count: overrides,
          low_rating_count: lowRatings,
          override_rate: usageCount > 0 ? (overrides / usageCount) * 100 : 0,
          trigger_criteria: rule.trigger_criteria,
          action_required: rule.action_required,
          priority: rule.priority
        };
      });

      // Identify high-risk patterns
      const highRiskPatterns = {};
      riskAssessments.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').forEach(risk => {
        const key = `${risk.hospital_id}-${risk.assessment_type}`;
        if (!highRiskPatterns[key]) {
          highRiskPatterns[key] = {
            hospital_id: risk.hospital_id,
            type: risk.assessment_type,
            count: 0,
            factors: []
          };
        }
        highRiskPatterns[key].count++;
        if (risk.contributing_factors) {
          risk.contributing_factors.forEach(f => highRiskPatterns[key].factors.push(f.factor));
        }
      });

      // Identify coverage gaps
      const coverageGaps = [];
      const categoryUsage = {};
      triageLogs.forEach(log => {
        const key = `${log.hospital_id}-${log.patient_type}-${log.organ_type}-${log.complaint_category}`;
        categoryUsage[key] = (categoryUsage[key] || 0) + 1;
      });

      // Find frequently corrected scenarios
      const correctionPatterns = {};
      corrections.forEach(c => {
        const key = `${c.hospital_id}-${c.patient_type}-${c.organ_type}`;
        if (!correctionPatterns[key]) {
          correctionPatterns[key] = {
            count: 0,
            reasons: []
          };
        }
        correctionPatterns[key].count++;
        if (c.correction_reason) {
          correctionPatterns[key].reasons.push(c.correction_reason);
        }
      });

      const prompt = `You are an expert medical triage system analyst. Analyze the following data and generate proactive recommendations for rule optimization.

DATA ANALYSIS:
1. RULE PERFORMANCE:
${JSON.stringify(rulePerformance.filter(r => r.usage_count > 5 || r.override_rate > 20).slice(0, 10), null, 2)}

2. HIGH-RISK PATTERNS (requiring new rules or adjustments):
${JSON.stringify(Object.values(highRiskPatterns).slice(0, 5), null, 2)}

3. CORRECTION PATTERNS (coordinators frequently override AI):
${JSON.stringify(Object.entries(correctionPatterns).slice(0, 5).map(([key, data]) => ({
  scenario: key,
  correction_count: data.count,
  sample_reasons: data.reasons.slice(0, 3)
})), null, 2)}

4. TOTAL CONTEXT:
- Total Rules: ${rules.length}
- Total Triage Logs: ${triageLogs.length}
- Total Corrections: ${corrections.length}
- Total Feedbacks: ${feedbacks.length}
- Total Risk Assessments: ${riskAssessments.length}

TASK:
Generate 3-5 high-impact proactive alerts for system optimization. For each alert:

1. Identify the specific issue or opportunity
2. Determine alert type (rule_suggestion, trend_detected, high_risk_patient, process_improvement)
3. Provide detailed analysis
4. Suggest concrete actions (e.g., "Adjust trigger criteria for Rule X", "Create new rule for Y scenario")
5. Estimate confidence and potential impact
6. Reference specific data points

Focus on:
- Rules with high override rates (>20%) that need adjustment
- High-risk patient patterns that lack dedicated rules
- Frequent correction scenarios indicating missing or unclear rules
- Trending complaint categories that need better coverage

Return actionable recommendations that admins can review and implement.`;

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  alert_title: { type: "string" },
                  alert_type: { 
                    type: "string",
                    enum: ["rule_suggestion", "trend_detected", "high_risk_patient", "process_improvement"]
                  },
                  severity: {
                    type: "string",
                    enum: ["info", "attention", "important", "urgent"]
                  },
                  hospital_id: { type: "string" },
                  description: { type: "string" },
                  ai_analysis: { type: "string" },
                  suggested_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        priority: { type: "string" },
                        estimated_impact: { type: "string" }
                      }
                    }
                  },
                  related_rule_ids: {
                    type: "array",
                    items: { type: "string" }
                  },
                  confidence_score: { type: "number" },
                  data_points: {
                    type: "object",
                    properties: {
                      override_rate: { type: "number" },
                      affected_patients: { type: "number" },
                      correction_count: { type: "number" }
                    }
                  }
                }
              }
            },
            summary: { type: "string" }
          },
          required: ["recommendations", "summary"]
        }
      });

      setAnalysisResult(result);

      // Create ProactiveAlert records for each recommendation
      for (const rec of result.recommendations) {
        await createAlertMutation.mutateAsync({
          alert_title: rec.alert_title,
          alert_type: rec.alert_type,
          severity: rec.severity,
          hospital_id: rec.hospital_id || null,
          description: rec.description,
          ai_analysis: rec.ai_analysis,
          data_sources: ['TriageLog', 'AIFeedback', 'RiskAssessment', 'AICorrection'],
          suggested_actions: rec.suggested_actions,
          related_entities: {
            rule_ids: rec.related_rule_ids,
            data_points: rec.data_points
          },
          confidence_score: rec.confidence_score,
          status: 'new'
        });
      }

    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult({ error: 'Analysis failed. Please try again.' });
    }

    setIsAnalyzing(false);
  };

  return (
    <Card className="border" style={{ borderColor: '#8B5CF6', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#8B5CF6' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <Brain className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            AI Rule Optimization Engine
          </CardTitle>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{ backgroundColor: '#8B5CF6', color: '#000000' }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#4B5563' }}>
          <p className="text-sm" style={{ color: '#D1D5DB' }}>
            This AI-powered system analyzes:
          </p>
          <ul className="text-sm mt-2 space-y-1" style={{ color: '#9CA3AF' }}>
            <li>• <strong>{triageLogs.length}</strong> triage logs for outcome patterns</li>
            <li>• <strong>{feedbacks.length}</strong> staff feedback entries for accuracy issues</li>
            <li>• <strong>{riskAssessments.length}</strong> risk assessments for high-risk patterns</li>
            <li>• <strong>{corrections.length}</strong> coordinator corrections for learning gaps</li>
            <li>• <strong>{rules.length}</strong> existing rules for optimization opportunities</li>
          </ul>
        </div>

        {analysisResult && !analysisResult.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-lg border" style={{ backgroundColor: '#065F46', borderColor: '#10B981' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" style={{ color: '#10B981' }} />
                <h3 className="font-semibold" style={{ color: '#60A5FA' }}>Analysis Complete</h3>
              </div>
              <p className="text-sm" style={{ color: '#D1D5DB' }}>{analysisResult.summary}</p>
              <Badge className="mt-2" style={{ backgroundColor: '#10B981', color: '#000000' }}>
                {analysisResult.recommendations.length} Proactive Alerts Generated
              </Badge>
            </div>

            <div className="space-y-3">
              {analysisResult.recommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: '#4B5563', borderColor: '#8B5CF6' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold" style={{ color: '#60A5FA' }}>
                        {rec.alert_title}
                      </h4>
                      <div className="flex gap-2 mt-1">
                        <Badge style={{ backgroundColor: '#8B5CF6', color: '#000000', fontSize: '10px' }}>
                          {rec.alert_type}
                        </Badge>
                        <Badge style={{ 
                          backgroundColor: rec.severity === 'urgent' ? '#EF4444' : 
                                         rec.severity === 'important' ? '#F59E0B' : '#60A5FA',
                          color: '#000000',
                          fontSize: '10px'
                        }}>
                          {rec.severity}
                        </Badge>
                        <Badge style={{ backgroundColor: '#10B981', color: '#000000', fontSize: '10px' }}>
                          {rec.confidence_score}% confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm mb-2" style={{ color: '#D1D5DB' }}>
                    {rec.description}
                  </p>
                  {rec.suggested_actions && rec.suggested_actions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#60A5FA' }}>
                        Recommended Actions:
                      </p>
                      <ul className="space-y-1">
                        {rec.suggested_actions.map((action, i) => (
                          <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#D1D5DB' }}>
                            <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
                            {action.action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#1E3A8A' }}>
              <p className="text-sm" style={{ color: '#93C5FD' }}>
                💡 All recommendations have been saved as Proactive Alerts. Review them in the Predictive Analytics page or Admin Settings.
              </p>
            </div>
          </motion.div>
        )}

        {analysisResult?.error && (
          <div className="p-4 rounded-lg border" style={{ backgroundColor: '#7F1D1D', borderColor: '#EF4444' }}>
            <AlertCircle className="w-5 h-5 mb-2" style={{ color: '#EF4444' }} />
            <p style={{ color: '#FCA5A5' }}>{analysisResult.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}