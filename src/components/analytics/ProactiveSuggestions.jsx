import React from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProactiveSuggestions({ alerts }) {
  const queryClient = useQueryClient();
  const [expandedAlert, setExpandedAlert] = React.useState(null);

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.ProactiveAlert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactiveAlerts'] });
    },
  });

  const handleDismiss = async (alertId) => {
    const user = await appClient.auth.me();
    updateAlertMutation.mutate({
      id: alertId,
      data: {
        status: 'dismissed',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const handleImplement = async (alertId) => {
    const user = await appClient.auth.me();
    updateAlertMutation.mutate({
      id: alertId,
      data: {
        status: 'in_progress',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'urgent': return { bg: '#991B1B', border: '#EF4444', text: '#EF4444' };
      case 'important': return { bg: '#92400E', border: '#F59E0B', text: '#F59E0B' };
      case 'attention': return { bg: '#1E40AF', border: '#60A5FA', text: '#60A5FA' };
      default: return { bg: '#065F46', border: '#10B981', text: '#10B981' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'rule_suggestion': return <Lightbulb className="w-5 h-5" />;
      case 'trend_detected': return <TrendingUp className="w-5 h-5" />;
      case 'high_risk_patient': return <AlertCircle className="w-5 h-5" />;
      default: return <Lightbulb className="w-5 h-5" />;
    }
  };

  return (
    <Card className="border" style={{ borderColor: '#8B5CF6', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#8B5CF6' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
          <Lightbulb className="w-5 h-5" style={{ color: '#8B5CF6' }} />
          Proactive AI Suggestions
          <Badge style={{ backgroundColor: '#8B5CF6', color: '#000000', marginLeft: 'auto' }}>
            {alerts.filter(a => a.status === 'new').length} New
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => {
              const colors = getSeverityColor(alert.severity);
              const isExpanded = expandedAlert === alert.id;
              
              return (
                <motion.div
                  key={alert.id}
                  layout
                  className="rounded-lg border p-4"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                >
                  <div className="flex items-start gap-4">
                    <div style={{ color: colors.text }}>
                      {getTypeIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold mb-1" style={{ color: '#60A5FA' }}>
                            {alert.alert_title}
                          </h4>
                          <div className="flex gap-2 flex-wrap">
                            <Badge style={{ backgroundColor: colors.text, color: '#000000', fontSize: '10px' }}>
                              {alert.alert_type.replace(/_/g, ' ')}
                            </Badge>
                            <Badge style={{ backgroundColor: colors.text, color: '#000000', fontSize: '10px' }}>
                              {alert.severity}
                            </Badge>
                            {alert.confidence_score && (
                              <Badge style={{ backgroundColor: '#10B981', color: '#000000', fontSize: '10px' }}>
                                {alert.confidence_score}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                          className="p-1"
                        >
                          <ChevronRight 
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            style={{ color: '#60A5FA' }}
                          />
                        </button>
                      </div>
                      
                      <p className="text-sm mb-3" style={{ color: '#D1D5DB' }}>
                        {alert.description}
                      </p>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 mb-3"
                          >
                            {alert.ai_analysis && (
                              <div className="p-3 rounded border" style={{ backgroundColor: '#4B5563', borderColor: '#6B7280' }}>
                                <p className="text-sm font-semibold mb-1" style={{ color: '#60A5FA' }}>AI Analysis:</p>
                                <p className="text-sm" style={{ color: '#D1D5DB' }}>{alert.ai_analysis}</p>
                              </div>
                            )}

                            {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold mb-2" style={{ color: '#60A5FA' }}>
                                  Recommended Actions:
                                </p>
                                <ul className="space-y-2">
                                  {alert.suggested_actions.map((action, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: '#D1D5DB' }}>
                                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
                                      <div>
                                        <span className="font-medium">{action.action}</span>
                                        {action.estimated_impact && (
                                          <span className="text-xs ml-2" style={{ color: '#9CA3AF' }}>
                                            Impact: {action.estimated_impact}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {alert.status === 'new' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleImplement(alert.id)}
                            style={{ backgroundColor: '#10B981', color: '#000000' }}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Review & Implement
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismiss(alert.id)}
                            style={{ borderColor: '#EF4444', color: '#EF4444' }}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                      {alert.status === 'in_progress' && (
                        <Badge style={{ backgroundColor: '#F59E0B', color: '#000000' }}>
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Lightbulb className="w-16 h-16 mx-auto mb-4" style={{ color: '#8B5CF6' }} />
            <p style={{ color: '#9CA3AF' }}>No proactive suggestions at this time</p>
            <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
              AI is continuously monitoring for optimization opportunities
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}