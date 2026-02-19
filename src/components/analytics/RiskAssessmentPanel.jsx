import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, TrendingUp, CheckCircle } from "lucide-react";

export default function RiskAssessmentPanel({ risks }) {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const updateRiskMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.RiskAssessment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskAssessments'] });
    },
  });

  const filteredRisks = risks.filter(risk =>
    risk.patient_identifier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highRisks = filteredRisks.filter(r => 
    r.risk_level === 'high' || r.risk_level === 'critical'
  ).sort((a, b) => b.risk_score - a.risk_score);

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return { bg: '#991B1B', border: '#EF4444', text: '#EF4444' };
      case 'high': return { bg: '#92400E', border: '#F59E0B', text: '#F59E0B' };
      case 'moderate': return { bg: '#1E40AF', border: '#60A5FA', text: '#60A5FA' };
      default: return { bg: '#065F46', border: '#10B981', text: '#10B981' };
    }
  };

  const handleMarkAddressed = async (riskId) => {
    const user = await appClient.auth.me();
    updateRiskMutation.mutate({
      id: riskId,
      data: {
        status: 'addressed',
        reviewed_by: user.email
      }
    });
  };

  return (
    <Card className="border" style={{ borderColor: '#EF4444', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#EF4444' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
            High-Risk Patient Alerts
            <Badge style={{ backgroundColor: '#EF4444', color: '#000000' }}>
              {highRisks.filter(r => r.status === 'active').length} Active
            </Badge>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#60A5FA' }} />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              style={{ borderColor: '#EF4444', backgroundColor: '#4B5563', color: '#60A5FA' }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {highRisks.length > 0 ? (
          <div className="space-y-3">
            {highRisks.slice(0, 10).map((risk) => {
              const colors = getRiskColor(risk.risk_level);
              
              return (
                <div
                  key={risk.id}
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold" style={{ color: '#60A5FA' }}>
                          {risk.patient_identifier}
                        </h4>
                        <Badge style={{ backgroundColor: colors.text, color: '#000000' }}>
                          {risk.risk_level} Risk
                        </Badge>
                        <Badge style={{ backgroundColor: '#8B5CF6', color: '#000000', fontSize: '10px' }}>
                          Score: {risk.risk_score}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2" style={{ color: '#D1D5DB' }}>
                        <strong>Type:</strong> {risk.assessment_type.replace(/_/g, ' ')}
                      </p>
                      {risk.ai_reasoning && (
                        <p className="text-sm mb-3" style={{ color: '#D1D5DB' }}>
                          {risk.ai_reasoning.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                  </div>

                  {risk.contributing_factors && risk.contributing_factors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#60A5FA' }}>
                        Contributing Factors:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {risk.contributing_factors.slice(0, 3).map((factor, idx) => (
                          <Badge key={idx} style={{ backgroundColor: '#4B5563', color: '#D1D5DB', fontSize: '10px' }}>
                            {factor.factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {risk.recommended_actions && risk.recommended_actions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#60A5FA' }}>
                        Recommended Actions:
                      </p>
                      <ul className="text-xs space-y-1" style={{ color: '#D1D5DB' }}>
                        {risk.recommended_actions.slice(0, 2).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {risk.status === 'active' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleMarkAddressed(risk.id)}
                        style={{ backgroundColor: '#10B981', color: '#000000' }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Addressed
                      </Button>
                    </div>
                  )}
                  {risk.status === 'addressed' && (
                    <Badge style={{ backgroundColor: '#10B981', color: '#000000' }}>
                      ✓ Addressed
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10B981' }} />
            <p style={{ color: '#9CA3AF' }}>No high-risk patients identified</p>
            <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
              AI is continuously monitoring for risk factors
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}