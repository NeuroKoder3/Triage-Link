import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, AlertTriangle, CheckCircle, Info, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIAnalysisResult({ 
  analysis, 
  availableRules,
  onConfirm, 
  onCancel 
}) {
  const [showOverride, setShowOverride] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(analysis.matched_rule?.id || "");
  const [correctionReason, setCorrectionReason] = useState("");

  const urgencyColors = {
    urgent: { bg: '#92400E', text: '#F59E0B', border: '#F59E0B', icon: AlertTriangle },
    'non-urgent': { bg: '#1E40AF', text: '#60A5FA', border: '#60A5FA', icon: Info },
    emergency: { bg: '#991B1B', text: '#EF4444', border: '#EF4444', icon: AlertTriangle }
  };

  const urgencyLevel = (analysis?.urgency_level || 'non-urgent').toLowerCase().trim();
  const urgencyConfig = urgencyColors[urgencyLevel] || urgencyColors['non-urgent'];
  const UrgencyIcon = urgencyConfig?.icon || Info;

  const handleConfirm = () => {
    if (showOverride && selectedRuleId !== analysis.matched_rule?.id) {
      const selectedRule = availableRules.find(r => r.id === selectedRuleId);
      onConfirm(selectedRule, {
        isOverride: true,
        originalRuleId: analysis.matched_rule?.id,
        correctionReason: correctionReason
      });
    } else {
      onConfirm(analysis.matched_rule, { isOverride: false });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
        <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#60A5FA' }} />
              AI Analysis Complete
            </CardTitle>
            <Badge 
              className="border text-lg px-4 py-1"
              style={{ 
                backgroundColor: urgencyConfig.bg,
                color: urgencyConfig.text,
                borderColor: urgencyConfig.border
              }}
            >
              <UrgencyIcon className="w-4 h-4 mr-2" />
              {(analysis.urgency_level || 'UNKNOWN').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Patient Condition Summary */}
          {analysis.patient_condition_summary && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#10B981', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                Patient Condition Summary
              </h3>
              <p className="text-sm" style={{ color: '#60A5FA' }}>{analysis.patient_condition_summary}</p>
            </div>
          )}

          {/* AI Summary */}
          <div className="p-4 rounded-lg border" style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563' }}>
            <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#60A5FA' }} />
              AI Recommendation
            </h3>
            {analysis.hospital_code && (
              <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#374151' }}>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <span className="font-semibold" style={{ color: '#10B981' }}>Hospital: </span>
                    <span style={{ color: '#60A5FA' }}>{analysis.hospital_code}</span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: '#F59E0B' }}>Level of Urgency: </span>
                    <span style={{ color: '#60A5FA' }}>
                      {analysis.urgency_level === 'emergency' ? 'Emergency' : 
                       analysis.urgency_level === 'urgent' ? 'Always Urgent' : 'Non Urgent'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: '#8B5CF6' }}>Paging Route: </span>
                    <span style={{ color: '#60A5FA' }}>{analysis.matched_rule?.action_required || analysis.action_required}</span>
                  </div>
                </div>
              </div>
            )}
            <p style={{ color: '#60A5FA' }}>{analysis.ai_summary}</p>
          </div>

          {/* Flagged Keywords */}
          {analysis.flagged_keywords && analysis.flagged_keywords.length > 0 && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#F59E0B', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                Auto-Flagged Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysis.flagged_keywords.map((keyword, idx) => (
                  <Badge key={idx} style={{ backgroundColor: '#F59E0B', color: '#000000' }}>
                    {keyword}
                  </Badge>
                ))}
              </div>
              {analysis.similar_cases_noted && (
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  ℹ️ Similar cases found in recent patient history
                </p>
              )}
            </div>
          )}

          {/* Matched Rule */}
          {analysis.matched_rule && (
            <div className="p-4 rounded-lg border" style={{ 
              borderColor: urgencyConfig.border, 
              backgroundColor: '#4B5563'
            }}>
              <h3 className="font-semibold mb-3" style={{ color: '#60A5FA' }}>
                Recommended Triage Protocol
              </h3>
              <div className="space-y-2">
                <p style={{ color: '#60A5FA' }}>
                  <strong>Category:</strong> {analysis.matched_rule.complaint_category}
                </p>
                {analysis.matched_rule.trigger_criteria && (
                  <p style={{ color: '#60A5FA' }}>
                    <strong>Criteria:</strong> {analysis.matched_rule.trigger_criteria}
                  </p>
                )}
                <p style={{ color: '#60A5FA' }}>
                  <strong>Action:</strong> {analysis.matched_rule.action_required}
                </p>
                <p style={{ color: '#60A5FA' }}>
                  <strong>Contact:</strong> {analysis.matched_rule.contact_method.replace('_', ' ')} 
                  {analysis.matched_rule.contact_info && ` - ${analysis.matched_rule.contact_info}`}
                </p>
              </div>
            </div>
          )}

          {/* Clinical Reasoning */}
          {analysis.clinical_reasoning && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#8B5CF6', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2" style={{ color: '#60A5FA' }}>
                Clinical Decision-Making Process
              </h3>
              <p className="text-sm" style={{ color: '#60A5FA' }}>{analysis.clinical_reasoning}</p>
            </div>
          )}

          {/* AI Reasoning */}
          <div className="p-4 rounded-lg border" style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563' }}>
            <h3 className="font-semibold mb-2" style={{ color: '#60A5FA' }}>
              Triage Reasoning
            </h3>
            <p className="text-sm" style={{ color: '#60A5FA' }}>{analysis.reasoning}</p>
          </div>

          {/* Drug Toxicity Alert */}
          {analysis.drug_toxicity_alert?.is_suspected && (
            <div className="p-4 rounded-lg border-2" style={{ 
              borderColor: analysis.drug_toxicity_alert.severity === 'critical' ? '#DC2626' : '#F59E0B', 
              backgroundColor: analysis.drug_toxicity_alert.severity === 'critical' ? '#7F1D1D' : '#78350F' 
            }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#FBBF24' }}>
                <AlertTriangle className="w-5 h-5" />
                ⚠️ MEDICATION TOXICITY ALERT - {(analysis.drug_toxicity_alert?.severity || 'WARNING').toUpperCase()}
              </h3>
              <div className="space-y-2 text-sm" style={{ color: '#FDE68A' }}>
                <p><strong>Suspected Drug:</strong> {analysis.drug_toxicity_alert.suspected_drug}</p>
                <p><strong>Matching Symptoms:</strong> {analysis.drug_toxicity_alert.toxicity_symptoms?.join(', ')}</p>
                <p className="mt-2"><strong>Rationale:</strong> {analysis.drug_toxicity_alert.rationale}</p>
                <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <p className="font-semibold mb-2">Immediate Actions Required:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.drug_toxicity_alert.recommended_actions?.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Drug Interaction Alert */}
          {analysis.drug_interaction_alert?.is_suspected && (
            <div className="p-4 rounded-lg border-2" style={{ 
              borderColor: analysis.drug_interaction_alert.severity === 'contraindicated' || analysis.drug_interaction_alert.severity === 'major' ? '#DC2626' : '#F59E0B',
              backgroundColor: '#7F1D1D'
            }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#FCA5A5' }}>
                <AlertTriangle className="w-5 h-5" />
                🚫 DRUG INTERACTION DETECTED - {(analysis.drug_interaction_alert?.severity || 'WARNING').toUpperCase()}
              </h3>
              <div className="space-y-2 text-sm" style={{ color: '#FEE2E2' }}>
                <p><strong>Interacting Medications:</strong> {analysis.drug_interaction_alert.interacting_drugs?.join(' + ')}</p>
                <p><strong>Interaction Type:</strong> {analysis.drug_interaction_alert.interaction_type}</p>
                <p><strong>Clinical Effects:</strong> {analysis.drug_interaction_alert.clinical_effects}</p>
                <div className="mt-3 p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <p className="font-semibold mb-2">Required Actions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.drug_interaction_alert.recommended_actions?.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Protocol Deviation Recommendation */}
          {analysis.protocol_deviation_recommendation?.should_deviate && (
            <div className="p-4 rounded-lg border-2" style={{ borderColor: '#8B5CF6', backgroundColor: '#3B0764' }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#C084FC' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                📋 PROTOCOL ESCALATION RECOMMENDED
              </h3>
              <div className="space-y-3 text-sm" style={{ color: '#E9D5FF' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-red-400">Standard Protocol:</p>
                    <p className="mt-1">{analysis.protocol_deviation_recommendation.standard_protocol_action}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-400">Recommended Action:</p>
                    <p className="mt-1">{analysis.protocol_deviation_recommendation.recommended_action}</p>
                  </div>
                </div>
                
                <div className="p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <p className="font-semibold mb-2">Risk Factors Identified:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.protocol_deviation_recommendation.risk_factors?.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-3 rounded" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  <p className="font-semibold mb-1">Clinical Rationale:</p>
                  <p>{analysis.protocol_deviation_recommendation.deviation_rationale}</p>
                </div>
                
                {analysis.protocol_deviation_recommendation.evidence_supporting_escalation && (
                  <div className="p-3 rounded" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                    <p className="font-semibold mb-1">Evidence Base:</p>
                    <p>{analysis.protocol_deviation_recommendation.evidence_supporting_escalation}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alternative Diagnoses */}
          {analysis.alternative_diagnoses && analysis.alternative_diagnoses.length > 0 && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#F59E0B', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                Differential Diagnosis
              </h3>
              <ul className="space-y-1">
                {analysis.alternative_diagnoses.map((diagnosis, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#60A5FA' }}>
                    <span style={{ color: '#F59E0B' }}>•</span>
                    {diagnosis}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confidence Score */}
          <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: '#10B981', backgroundColor: '#4B5563' }}>
            <span className="font-semibold" style={{ color: '#60A5FA' }}>Confidence Score:</span>
            <div className="flex items-center gap-2">
              <div className="w-48 h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#1F2937' }}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${analysis.confidence_score}%`,
                    backgroundColor: analysis.confidence_score >= 80 ? '#10B981' : analysis.confidence_score >= 60 ? '#F59E0B' : '#EF4444'
                  }}
                />
              </div>
              <span className="font-bold text-lg" style={{ color: '#60A5FA' }}>
                {analysis.confidence_score}%
              </span>
            </div>
          </div>

          {/* Manual Override Section */}
          <AnimatePresence>
            {showOverride && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 p-4 rounded-lg border"
                style={{ borderColor: '#F59E0B', backgroundColor: '#4B5563' }}
              >
                <h3 className="font-semibold flex items-center gap-2" style={{ color: '#60A5FA' }}>
                  <Edit className="w-4 h-4" style={{ color: '#F59E0B' }} />
                  Manual Override
                </h3>
                <div className="space-y-2">
                  <Label style={{ color: '#60A5FA' }}>Select Correct Rule</Label>
                  <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                    <SelectTrigger className="border" style={{ borderColor: '#F59E0B', backgroundColor: '#374151', color: '#60A5FA' }}>
                      <SelectValue placeholder="Choose the correct rule..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.complaint_category} - {rule.priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: '#60A5FA' }}>Why is this the correct rule? (helps AI learn)</Label>
                  <Textarea
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g., Patient's fever is higher than threshold, requires immediate escalation..."
                    className="border"
                    style={{ borderColor: '#F59E0B', backgroundColor: '#374151', color: '#60A5FA' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Enhanced Features */}
          {analysis.follow_up_actions && analysis.follow_up_actions.length > 0 && (
            <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: '#8B5CF6', backgroundColor: '#1F2937' }}>
              <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#8B5CF6' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Recommended Follow-Up Actions
              </h4>
              <ul className="space-y-2">
                {analysis.follow_up_actions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold mt-1">{idx + 1}.</span>
                    <span style={{ color: '#D1D5DB' }}>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.medical_literature_references && analysis.medical_literature_references.length > 0 && (
            <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: '#3B82F6', backgroundColor: '#1F2937' }}>
              <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#3B82F6' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Clinical Guidelines & Evidence
              </h4>
              <div className="space-y-3">
                {analysis.medical_literature_references.map((ref, idx) => (
                  <div key={idx} className="p-3 rounded" style={{ backgroundColor: '#374151' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-blue-300">{ref.title}</p>
                      {ref.url && (
                        <a 
                          href={ref.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View
                        </a>
                      )}
                    </div>
                    {ref.source && (
                      <p className="text-xs text-gray-500 mb-1">Source: {ref.source}</p>
                    )}
                    <p className="text-sm text-gray-400 mb-1"><strong>Relevance:</strong> {ref.relevance}</p>
                    <p className="text-sm text-gray-300">{ref.key_points}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.patient_communication_template && (
            <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: '#10B981', backgroundColor: '#1F2937' }}>
              <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#10B981' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                Patient Communication Template
              </h4>
              
              {analysis.patient_communication_template.verbal_script && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: '#34D399' }}>📞 Verbal Script:</p>
                  <p className="text-sm p-3 rounded italic" style={{ backgroundColor: '#374151', color: '#D1D5DB' }}>
                    "{analysis.patient_communication_template.verbal_script}"
                  </p>
                </div>
              )}

              {analysis.patient_communication_template.written_message && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: '#34D399' }}>✉️ Written Follow-Up:</p>
                  <p className="text-sm p-3 rounded" style={{ backgroundColor: '#374151', color: '#D1D5DB' }}>
                    {analysis.patient_communication_template.written_message}
                  </p>
                </div>
              )}

              {analysis.patient_communication_template.key_education_points && analysis.patient_communication_template.key_education_points.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: '#34D399' }}>🎓 Key Education Points:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: '#D1D5DB' }}>
                    {analysis.patient_communication_template.key_education_points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.patient_communication_template.red_flag_warnings && analysis.patient_communication_template.red_flag_warnings.length > 0 && (
                <div className="p-3 rounded" style={{ backgroundColor: '#7F1D1D', borderLeft: '4px solid #EF4444' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#FCA5A5' }}>🚨 Red Flag Warnings - Return to ER if:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: '#FEE2E2' }}>
                    {analysis.patient_communication_template.red_flag_warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {!showOverride && (
              <Button
                variant="outline"
                onClick={() => setShowOverride(true)}
                className="w-full"
                style={{ borderColor: '#F59E0B', color: '#F59E0B', backgroundColor: '#374151' }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Override AI Suggestion (Help AI Learn)
              </Button>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                style={{ borderColor: '#60A5FA', color: '#60A5FA', backgroundColor: '#374151' }}
              >
                Cancel & Re-analyze
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={showOverride && (!selectedRuleId || !correctionReason.trim())}
                className="flex-1 font-semibold text-lg py-6"
                style={{ backgroundColor: '#60A5FA', color: '#000000' }}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {showOverride ? 'Confirm Override' : 'Confirm & Proceed'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}