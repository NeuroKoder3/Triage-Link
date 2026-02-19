import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, AlertTriangle, FileText, CheckCircle, Clock, Sparkles, Brain } from "lucide-react";
import { motion } from "framer-motion";

export default function TriageInstructions({ 
  rule, 
  hospital,
  aiAnalysis,
  onComplete,
  coordinatorNotes,
  setCoordinatorNotes,
  isLoading 
}) {
  if (!rule) return null;

  const priorityColors = {
    routine: { bg: '#1E40AF', text: '#60A5FA', border: '#60A5FA' },
    urgent: { bg: '#92400E', text: '#F59E0B', border: '#F59E0B' },
    emergency: { bg: '#991B1B', text: '#EF4444', border: '#EF4444' }
  };

  const priorityLevel = (rule?.priority || 'routine').toLowerCase().trim();
  const priorityConfig = priorityColors[priorityLevel] || priorityColors['routine'];

  const contactIcons = {
    phone: Phone,
    secure_page: Mail,
    email: Mail,
    urgent_page: AlertTriangle
  };

  const ContactIcon = contactIcons[rule.contact_method] || Phone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
        <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#60A5FA' }} />
              Triage Instructions
            </CardTitle>
            <Badge 
              className="border"
              style={{ 
                backgroundColor: priorityConfig.bg,
                color: priorityConfig.text,
                borderColor: priorityConfig.border
              }}
            >
              {priorityLevel.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* AI Analysis Summary (if available) */}
          {aiAnalysis && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#8B5CF6', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <Brain className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                AI Analysis Summary
              </h3>
              <p className="text-sm mb-2" style={{ color: '#60A5FA' }}>
                <strong>Summary:</strong> {aiAnalysis.ai_summary}
              </p>
              <p className="text-sm mb-2" style={{ color: '#60A5FA' }}>
                <strong>Urgency Assessed:</strong> <span className="uppercase font-semibold">{aiAnalysis.urgency_level}</span>
              </p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>
                <strong>Reasoning:</strong> {aiAnalysis.reasoning}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                <span className="text-sm font-semibold" style={{ color: '#60A5FA' }}>
                  AI Confidence: {aiAnalysis.confidence_score}%
                </span>
              </div>
            </div>
          )}

          {/* Hospital Info */}
          <div className="p-4 rounded-lg border" style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563' }}>
            <h3 className="font-semibold mb-2" style={{ color: '#60A5FA' }}>Hospital Information</h3>
            <p className="text-sm" style={{ color: '#60A5FA' }}><strong>Name:</strong> {hospital.name}</p>
            {hospital.contact_phone && (
              <p className="text-sm" style={{ color: '#60A5FA' }}><strong>Phone:</strong> {hospital.contact_phone}</p>
            )}
          </div>

          {/* Trigger Criteria */}
          {rule.trigger_criteria && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#F59E0B', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                Trigger Criteria
              </h3>
              <p className="text-sm" style={{ color: '#60A5FA' }}>{rule.trigger_criteria}</p>
            </div>
          )}

          {/* Action Required */}
          <div className="p-4 rounded-lg border" style={{ borderColor: '#10B981', backgroundColor: '#4B5563' }}>
            <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              Action Required
            </h3>
            <p className="text-sm mb-3" style={{ color: '#60A5FA' }}>{rule.action_required}</p>
            
            <div className="flex items-center gap-2">
              <Badge className="border" style={{ backgroundColor: '#1E40AF', color: '#60A5FA', borderColor: '#60A5FA' }}>
                <ContactIcon className="w-3 h-3 mr-1" />
                {rule.contact_method.replace('_', ' ')}
              </Badge>
              {rule.contact_info && (
                <span className="text-sm font-mono" style={{ color: '#60A5FA' }}>{rule.contact_info}</span>
              )}
            </div>
          </div>

          {/* Escalation Path */}
          {rule.escalation_path && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#F59E0B', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <Clock className="w-4 h-4" style={{ color: '#F59E0B' }} />
                Escalation Path
              </h3>
              <p className="text-sm" style={{ color: '#60A5FA' }}>{rule.escalation_path}</p>
            </div>
          )}

          {/* Documentation Notes */}
          {rule.documentation_notes && (
            <div className="p-4 rounded-lg border" style={{ borderColor: '#8B5CF6', backgroundColor: '#4B5563' }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <FileText className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                Documentation Notes
              </h3>
              <p className="text-sm" style={{ color: '#60A5FA' }}>{rule.documentation_notes}</p>
            </div>
          )}

          {/* Coordinator Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold" style={{ color: '#60A5FA' }}>
              Coordinator Notes (Optional)
            </label>
            <Textarea
              placeholder="Add any additional notes about this triage call..."
              value={coordinatorNotes}
              onChange={(e) => setCoordinatorNotes(e.target.value)}
              className="border min-h-24"
              style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}
            />
          </div>

          {/* Complete Button */}
          <Button
            onClick={onComplete}
            disabled={isLoading}
            className="w-full font-semibold py-6 text-lg"
            style={{ backgroundColor: '#60A5FA', color: '#000000' }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 animate-spin" />
                Completing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Complete Triage & Log
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}