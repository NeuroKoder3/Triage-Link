
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, RefreshCw, Loader2, Brain, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";

export default function RuleEffectivenessAnalysis({ onEditRule }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: analyses } = useQuery({
    queryKey: ['rulePerformanceAnalyses'],
    queryFn: () => appClient.entities.RulePerformanceAnalysis.filter({ status: 'active' }, '-effectiveness_score'),
  });

  const { data: rules } = useQuery({
    queryKey: ['triageRules'],
    queryFn: () => appClient.entities.TriageRule.list(),
  });

  const { data: logs } = useQuery({
    queryKey: ['triageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date', 500),
  });

  const { data: corrections } = useQuery({
    queryKey: ['aiCorrections'],
    queryFn: () => appClient.entities.AICorrection.list('-created_date', 200),
  });

  const { data: ruleSuggestions } = useQuery({
    queryKey: ['ruleSuggestions'],
    queryFn: () => appClient.entities.RuleSuggestion.filter({ status: 'implemented' }),
  });

  const analyzeRules = async () => {
    setIsAnalyzing(true);

    try {
      // Analyze each active rule
      for (const rule of (rules || []).filter(r => r.status === 'active')) {
        // Get logs using this rule
        const ruleLogs = (logs || []).filter(log => log.rule_id === rule.id);
        
        if (ruleLogs.length === 0) continue;

        // Get corrections related to this rule
        const ruleCorrections = (corrections || []).filter(c => 
          c.ai_suggested_rule_id === rule.id || c.coordinator_selected_rule_id === rule.id
        );

        const timesUsed = ruleLogs.length;
        const timesOverridden = ruleCorrections.filter(c => c.ai_suggested_rule_id === rule.id).length;
        const overrideRate = timesUsed > 0 ? (timesOverridden / timesUsed) * 100 : 0;

        // Calculate average resolution time
        const avgResolutionTime = ruleLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / timesUsed;

        // Check if this is a newly suggested rule
        const suggestion = (ruleSuggestions || []).find(s => s.created_rule_id === rule.id);
        const isNewRule = !!suggestion;

        // Get baseline metrics if new rule
        let baselineMetrics = null;
        let postImplementationMetrics = null;

        if (isNewRule && suggestion) {
          const ruleCreatedDate = new Date(rule.created_date);
          const thirtyDaysBefore = new Date(ruleCreatedDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          const baselineLogs = (logs || []).filter(log => {
            const logDate = new Date(log.created_date);
            return logDate >= thirtyDaysBefore && 
                   logDate < ruleCreatedDate &&
                   log.hospital_id === rule.hospital_id &&
                   log.patient_type === rule.patient_type &&
                   log.organ_type === rule.organ_type &&
                   log.complaint_category === rule.complaint_category;
          });

          if (baselineLogs.length > 0) {
            baselineMetrics = {
              avgDuration: baselineLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / baselineLogs.length,
              callCount: baselineLogs.length,
              overrideRate: 0 
            };
          }

          postImplementationMetrics = {
            avgDuration: avgResolutionTime,
            callCount: timesUsed,
            overrideRate: overrideRate
          };
        }

        // Use AI to analyze this rule's performance
        const analysisPrompt = `You are a medical triage system analyst. Analyze this triage rule's performance:

RULE DETAILS:
- Hospital: ${rule.hospital_id}
- Category: ${rule.complaint_category}
- Patient Type: ${rule.patient_type}
- Organ Type: ${rule.organ_type}
- Action: ${rule.action_required}
- Priority: ${rule.priority}

PERFORMANCE METRICS:
- Times Used: ${timesUsed}
- Times Overridden: ${timesOverridden}
- Override Rate: ${overrideRate.toFixed(1)}%
- Avg Resolution Time: ${avgResolutionTime.toFixed(0)} seconds

${isNewRule ? `
NEW RULE COMPARISON:
- This rule was AI-suggested and recently implemented
- Before Implementation: ${baselineMetrics ? `${baselineMetrics.avgDuration.toFixed(0)}s avg, ${baselineMetrics.callCount} calls` : 'No baseline data'}
- After Implementation: ${avgResolutionTime.toFixed(0)}s avg, ${timesUsed} calls
` : ''}

OVERRIDE REASONS (from coordinator corrections):
${ruleCorrections.slice(0, 5).map(c => `- ${c.correction_reason}`).join('\n') || 'No overrides'}

TASK:
1. Calculate an effectiveness score (0-100)
2. Determine performance status: excellent (95-100), good (80-94), needs_review (60-79), poor (<60)
3. Identify common patterns in why this rule is being overridden
4. Suggest specific, actionable optimizations
5. Recommend: keep, modify, replace, or remove
6. ${isNewRule ? 'Compare pre/post implementation metrics and assess if the new rule improved outcomes' : 'Provide detailed analysis'}

Be specific and actionable in your suggestions.`;

        const aiAnalysis = await appClient.integrations.Core.InvokeLLM({
          prompt: analysisPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              effectiveness_score: {
                type: "number",
                description: "Score from 0-100"
              },
              performance_status: {
                type: "string",
                enum: ["excellent", "good", "needs_review", "poor"]
              },
              common_override_reasons: {
                type: "array",
                items: { type: "string" },
                description: "Common reasons for overrides"
              },
              optimization_suggestions: {
                type: "array",
                items: { type: "string" },
                description: "Specific suggestions to improve this rule"
              },
              analysis_summary: {
                type: "string",
                description: "Detailed analysis of performance"
              },
              recommended_action: {
                type: "string",
                enum: ["keep", "modify", "replace", "remove"]
              },
              new_rule_assessment: {
                type: "string",
                description: "For new rules: assessment of impact vs baseline"
              }
            },
            required: ["effectiveness_score", "performance_status", "recommended_action", "analysis_summary"]
          }
        });

        // Create or update analysis record
        const existingAnalysis = (analyses || []).find(a => a.rule_id === rule.id);
        
        const analysisData = {
          rule_id: rule.id,
          rule_name: rule.complaint_category,
          hospital_id: rule.hospital_id,
          analysis_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          analysis_period_end: new Date().toISOString().split('T')[0],
          times_used: timesUsed,
          times_overridden: timesOverridden,
          override_rate: overrideRate,
          avg_resolution_time: avgResolutionTime,
          effectiveness_score: aiAnalysis.effectiveness_score,
          performance_status: aiAnalysis.performance_status,
          common_override_reasons: aiAnalysis.common_override_reasons || [],
          optimization_suggestions: aiAnalysis.optimization_suggestions || [],
          ai_analysis_summary: isNewRule && aiAnalysis.new_rule_assessment 
            ? `${aiAnalysis.analysis_summary}\n\nNew Rule Assessment: ${aiAnalysis.new_rule_assessment}`
            : aiAnalysis.analysis_summary,
          recommended_action: aiAnalysis.recommended_action,
          is_new_rule: isNewRule,
          baseline_metrics: baselineMetrics,
          post_implementation_metrics: postImplementationMetrics,
          status: 'active'
        };

        if (existingAnalysis) {
          await appClient.entities.RulePerformanceAnalysis.update(existingAnalysis.id, analysisData);
        } else {
          await appClient.entities.RulePerformanceAnalysis.create(analysisData);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['rulePerformanceAnalyses'] });
    } catch (error) {
      console.error("Error analyzing rules:", error);
    }

    setIsAnalyzing(false);
  };

  const statusConfig = {
    excellent: { bg: '#065F46', text: '#10B981', border: '#10B981', icon: CheckCircle },
    good: { bg: '#1E3A8A', text: '#60A5FA', border: '#60A5FA', icon: TrendingUp },
    needs_review: { bg: '#78350F', text: '#F59E0B', border: '#F59E0B', icon: AlertTriangle },
    poor: { bg: '#7F1D1D', text: '#EF4444', border: '#EF4444', icon: TrendingDown }
  };

  const actionConfig = {
    keep: { label: 'Keep As Is', color: '#10B981' },
    modify: { label: 'Modify Rule', color: '#60A5FA' },
    replace: { label: 'Replace Rule', color: '#F59E0B' },
    remove: { label: 'Remove Rule', color: '#EF4444' }
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <Brain className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            Rule Effectiveness Analysis
          </CardTitle>
          <Button
            onClick={analyzeRules}
            disabled={isAnalyzing}
            className="font-semibold"
            style={{ backgroundColor: '#8B5CF6', color: '#E0E7FF' }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Analyze All Rules
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence>
          {(analyses || []).length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Brain className="w-16 h-16 mx-auto mb-4" style={{ color: '#8B5CF6' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                No Analysis Available
              </h3>
              <p className="mb-4" style={{ color: '#60A5FA' }}>
                Click "Analyze All Rules" to evaluate rule performance and get optimization suggestions
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {(analyses || []).map((analysis) => {
                const statusConf = statusConfig[analysis.performance_status];
                const StatusIcon = statusConf.icon;
                const actionConf = actionConfig[analysis.recommended_action];

                return (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-lg border"
                    style={{ 
                      backgroundColor: '#4B5563',
                      borderColor: statusConf.border
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusIcon className="w-5 h-5" style={{ color: statusConf.text }} />
                          <h4 className="font-semibold text-lg" style={{ color: '#E0E7FF' }}>
                            {analysis.rule_name}
                          </h4>
                          <Badge 
                            style={{ 
                              backgroundColor: statusConf.bg,
                              color: statusConf.text,
                              borderColor: statusConf.border
                            }}
                          >
                            {analysis.performance_status.toUpperCase().replace('_', ' ')}
                          </Badge>
                          {analysis.is_new_rule && (
                            <Badge style={{ backgroundColor: '#5B21B6', color: '#8B5CF6' }}>
                              NEW RULE
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm" style={{ color: '#9CA3AF' }}>
                          <span>Used: {analysis.times_used}x</span>
                          <span>Overridden: {analysis.times_overridden}x</span>
                          <span>Override Rate: {analysis.override_rate.toFixed(1)}%</span>
                          <span>Avg Time: {Math.round(analysis.avg_resolution_time)}s</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold mb-1" style={{ color: '#E0E7FF' }}>
                          {analysis.effectiveness_score}
                        </div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>Effectiveness Score</div>
                      </div>
                    </div>

                    {/* Effectiveness Progress Bar */}
                    <div className="mb-4">
                      <Progress 
                        value={analysis.effectiveness_score} 
                        className="h-2"
                        style={{ backgroundColor: '#4B5563' }} // Darker track for progress bar
                      />
                    </div>

                    {/* New Rule Comparison */}
                    {analysis.is_new_rule && analysis.baseline_metrics && (
                      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#1F2937' }}> {/* Darker background */}
                        <h5 className="font-semibold mb-2 text-sm" style={{ color: '#E0E7FF' }}>
                          Before/After Implementation Comparison
                        </h5>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="font-semibold" style={{ color: '#9CA3AF' }}>Before</div>
                            <div style={{ color: '#E0E7FF' }}>
                              {Math.round(analysis.baseline_metrics.avgDuration)}s avg
                            </div>
                            <div style={{ color: '#9CA3AF' }}>
                              {analysis.baseline_metrics.callCount} calls
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: '#9CA3AF' }}>After</div>
                            <div style={{ color: '#E0E7FF' }}>
                              {Math.round(analysis.post_implementation_metrics.avgDuration)}s avg
                            </div>
                            <div style={{ color: '#9CA3AF' }}>
                              {analysis.post_implementation_metrics.callCount} calls
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: '#9CA3AF' }}>Impact</div>
                            <div className="flex items-center gap-1" style={{ 
                              color: analysis.post_implementation_metrics.avgDuration < analysis.baseline_metrics.avgDuration 
                                ? '#10B981' : '#EF4444' 
                            }}>
                              {analysis.post_implementation_metrics.avgDuration < analysis.baseline_metrics.avgDuration ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : (
                                <TrendingUp className="w-4 h-4" />
                              )}
                              {Math.abs(
                                ((analysis.post_implementation_metrics.avgDuration - analysis.baseline_metrics.avgDuration) / 
                                analysis.baseline_metrics.avgDuration) * 100
                              ).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Analysis */}
                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#1F2937' }}> {/* Darker background */}
                      <div className="flex items-start gap-2 mb-2">
                        <Brain className="w-4 h-4 mt-0.5" style={{ color: '#8B5CF6' }} />
                        <div>
                          <h5 className="font-semibold text-sm mb-1" style={{ color: '#E0E7FF' }}>
                            AI Analysis
                          </h5>
                          <p className="text-sm" style={{ color: '#E0E7FF' }}>
                            {analysis.ai_analysis_summary}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Common Override Reasons */}
                    {analysis.common_override_reasons && analysis.common_override_reasons.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-semibold text-sm mb-2" style={{ color: '#E0E7FF' }}>
                          Common Override Reasons:
                        </h5>
                        <ul className="list-disc list-inside space-y-1">
                          {analysis.common_override_reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm" style={{ color: '#E0E7FF' }}>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optimization Suggestions */}
                    {analysis.optimization_suggestions && analysis.optimization_suggestions.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#1F2937' }}> {/* Darker background */}
                        <h5 className="font-semibold text-sm mb-2" style={{ color: '#E0E7FF' }}>
                          💡 Optimization Suggestions:
                        </h5>
                        <ul className="space-y-1">
                          {analysis.optimization_suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#E0E7FF' }}>
                              <span className="text-yellow-600">→</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Action */}
                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#6B7280' }}> {/* Darker border */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: '#E0E7FF' }}>
                          Recommended:
                        </span>
                        <Badge style={{ backgroundColor: actionConf.color, color: '#FFFFFF' }}>
                          {actionConf.label}
                        </Badge>
                      </div>
                      {analysis.recommended_action === 'modify' && onEditRule && (
                        <Button
                          size="sm"
                          onClick={() => onEditRule((rules || []).find(r => r.id === analysis.rule_id))}
                          className="text-white"
                          style={{ backgroundColor: '#60A5FA' }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit Rule
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
