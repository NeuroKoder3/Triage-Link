import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle, X, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";

export default function RuleSuggestions() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: suggestions = [] } = useQuery({
    queryKey: ['ruleSuggestions'],
    queryFn: () => appClient.entities.RuleSuggestion.filter({ status: 'pending' }, '-confidence_score'),
  });

  const { data: corrections = [] } = useQuery({
    queryKey: ['aiCorrections'],
    queryFn: () => appClient.entities.AICorrection.list('-created_date', 100),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['triageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date', 500),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.list(),
  });

  const { data: existingRules = [] } = useQuery({
    queryKey: ['triageRules'],
    queryFn: () => appClient.entities.TriageRule.list(),
  });

  const approveMutation = useMutation({
    mutationFn: async (suggestion) => {
      const newRule = await appClient.entities.TriageRule.create({
        hospital_id: suggestion.hospital_id,
        patient_type: suggestion.patient_type,
        organ_type: suggestion.organ_type,
        complaint_category: suggestion.complaint_category,
        trigger_criteria: suggestion.trigger_criteria,
        action_required: suggestion.action_required,
        contact_method: suggestion.contact_method || 'secure_page',
        priority: suggestion.priority,
        status: 'active'
      });

      await appClient.entities.RuleSuggestion.update(suggestion.id, {
        status: 'implemented',
        created_rule_id: newRule.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ruleSuggestions'] });
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => appClient.entities.RuleSuggestion.update(id, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ruleSuggestions'] });
    },
  });

  const generateSuggestions = async () => {
    setIsGenerating(true);

    try {
      const correctionPatterns = {};
      (corrections || []).forEach(correction => {
        const key = `${correction.hospital_id}-${correction.patient_type}-${correction.organ_type}`;
        if (!correctionPatterns[key]) {
          correctionPatterns[key] = [];
        }
        correctionPatterns[key].push(correction);
      });

      const volumePatterns = {};
      (logs || []).forEach(log => {
        const key = `${log.hospital_id}-${log.patient_type}-${log.organ_type}-${log.complaint_category}`;
        volumePatterns[key] = (volumePatterns[key] || 0) + 1;
      });

      const patternsToAnalyze = Object.entries(correctionPatterns)
        .filter(([_, corrections]) => corrections.length >= 2)
        .slice(0, 5);

      if (patternsToAnalyze.length === 0) {
        alert('Not enough correction data yet. AI needs at least 2 coordinator corrections in the same category to identify patterns.');
        setIsGenerating(false);
        return;
      }

      for (const [pattern, patternCorrections] of patternsToAnalyze) {
        const [hospitalId, patientType, organType] = pattern.split('-');
        
        const prompt = `You are analyzing medical triage coordinator corrections to suggest new triage rules.

PATTERN IDENTIFIED:
- Hospital: ${hospitalId}
- Patient Type: ${patientType}
- Organ Type: ${organType}
- Number of corrections: ${patternCorrections.length}

COORDINATOR CORRECTIONS:
${patternCorrections.slice(0, 5).map(c => `
- Original complaint: "${c.original_complaint}"
- Coordinator's reason: "${c.correction_reason}"
`).join('\n')}

EXISTING RULES FOR THIS COMBINATION:
${(existingRules || []).filter(r => 
  r.hospital_id === hospitalId && 
  r.patient_type === patientType && 
  r.organ_type === organType
).map(r => `- ${r.complaint_category}: ${r.action_required}`).join('\n') || 'No existing rules'}

TASK:
Based on these repeated corrections, suggest a NEW triage rule that would prevent these corrections in the future.`;

        const aiSuggestion = await appClient.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              complaint_category: { type: "string" },
              trigger_criteria: { type: "string" },
              action_required: { type: "string" },
              contact_method: { type: "string" },
              priority: { 
                type: "string",
                enum: ["routine", "urgent", "emergency"]
              },
              reasoning: { type: "string" },
              confidence_score: { type: "number" }
            },
            required: ["complaint_category", "action_required", "priority", "reasoning", "confidence_score"]
          }
        });

        const hospital = (hospitals || []).find(h => h.id === hospitalId);

        await appClient.entities.RuleSuggestion.create({
          hospital_id: hospitalId,
          hospital_name: hospital?.name || "Unknown",
          patient_type: patientType,
          organ_type: organType,
          complaint_category: aiSuggestion.complaint_category,
          trigger_criteria: aiSuggestion.trigger_criteria || "",
          action_required: aiSuggestion.action_required,
          contact_method: aiSuggestion.contact_method || "secure_page",
          priority: aiSuggestion.priority,
          ai_reasoning: aiSuggestion.reasoning,
          based_on_corrections_count: patternCorrections.length,
          based_on_volume_count: volumePatterns[`${pattern}-${aiSuggestion.complaint_category}`] || 0,
          confidence_score: aiSuggestion.confidence_score,
          status: 'pending'
        });
      }

      queryClient.invalidateQueries({ queryKey: ['ruleSuggestions'] });
    } catch (error) {
      console.error("Error generating suggestions:", error);
    }

    setIsGenerating(false);
  };

  const confidenceColor = (score) => {
    if (score >= 80) return { bg: '#065F46', text: '#10B981', border: '#10B981' };
    if (score >= 60) return { bg: '#1E3A8A', text: '#60A5FA', border: '#60A5FA' };
    return { bg: '#78350F', text: '#F59E0B', border: '#F59E0B' };
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <Lightbulb className="w-5 h-5" style={{ color: '#F59E0B' }} />
            AI Rule Suggestions
            {suggestions.length > 0 && (
              <Badge style={{ backgroundColor: '#F59E0B', color: '#000000' }}>
                {suggestions.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={generateSuggestions}
            disabled={isGenerating}
            className="font-semibold"
            style={{ backgroundColor: '#60A5FA', color: '#000000' }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence>
          {suggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Lightbulb className="w-16 h-16 mx-auto mb-4" style={{ color: '#F59E0B' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                No Suggestions Yet
              </h3>
              <p style={{ color: '#60A5FA' }}>
                Click "Generate Suggestions" to analyze coordinator corrections and suggest new rules
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => {
                const confColor = confidenceColor(suggestion.confidence_score);
                
                return (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-5 rounded-lg border"
                    style={{ backgroundColor: '#4B5563', borderColor: '#60A5FA' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg" style={{ color: '#60A5FA' }}>
                            {suggestion.complaint_category}
                          </h4>
                          <Badge style={{ 
                            backgroundColor: confColor.bg,
                            color: confColor.text,
                            borderColor: confColor.border
                          }}>
                            {suggestion.confidence_score}% Confidence
                          </Badge>
                        </div>
                        <p className="text-sm mb-2" style={{ color: '#60A5FA' }}>
                          <strong>Hospital:</strong> {suggestion.hospital_name} | 
                          <strong> Type:</strong> {suggestion.patient_type} | 
                          <strong> Organ:</strong> {suggestion.organ_type}
                        </p>
                      </div>
                    </div>

                    {suggestion.trigger_criteria && (
                      <p className="text-sm mb-2" style={{ color: '#60A5FA' }}>
                        <strong>Trigger:</strong> {suggestion.trigger_criteria}
                      </p>
                    )}

                    <p className="mb-3" style={{ color: '#60A5FA' }}>
                      <strong>Action:</strong> {suggestion.action_required}
                    </p>

                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: '#374151' }}>
                      <p className="text-sm" style={{ color: '#60A5FA' }}>
                        <strong>AI Reasoning:</strong> {suggestion.ai_reasoning}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm" style={{ color: '#60A5FA' }}>
                        Based on {suggestion.based_on_corrections_count} corrections
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate(suggestion.id)}
                          disabled={rejectMutation.isPending}
                          style={{ borderColor: '#EF4444', color: '#EF4444', backgroundColor: '#374151' }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(suggestion)}
                          disabled={approveMutation.isPending}
                          style={{ backgroundColor: '#10B981', color: '#000000' }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve & Create Rule
                        </Button>
                      </div>
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