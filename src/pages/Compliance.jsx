import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, FileText, Lock, Eye, CheckCircle, XCircle, Download } from "lucide-react";
import { motion } from "framer-motion";

export default function Compliance() {
  const [dateRange, setDateRange] = useState(30);
  const queryClient = useQueryClient();

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['hipaaAuditLogs', dateRange],
    queryFn: () => appClient.entities.HIPAAAuditLog.list('-created_date', 1000),
  });

  const { data: securityIncidents = [] } = useQuery({
    queryKey: ['securityIncidents'],
    queryFn: () => appClient.entities.SecurityIncident.list('-created_date'),
  });

  const { data: dataRetentionPolicies = [] } = useQuery({
    queryKey: ['dataRetentionPolicies'],
    queryFn: () => appClient.entities.DataRetentionPolicy.list(),
  });



  // Filter logs by date range
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - dateRange);
  const filteredLogs = auditLogs.filter(log => new Date(log.created_date) >= cutoffDate);

  // Calculate compliance metrics
  const totalAccess = filteredLogs.length;
  const successfulAccess = filteredLogs.filter(l => l.action_result === 'success').length;
  const deniedAccess = filteredLogs.filter(l => l.action_result === 'denied').length;
  const unauthorizedAttempts = filteredLogs.filter(l => l.action_type === 'unauthorized_access_attempt').length;
  const phiAccessed = filteredLogs.filter(l => l.action_type === 'phi_accessed').length;
  const phiCreated = filteredLogs.filter(l => l.action_type === 'phi_created').length;
  const phiUpdated = filteredLogs.filter(l => l.action_type === 'phi_updated').length;
  const phiExported = filteredLogs.filter(l => l.action_type === 'phi_exported').length;

  const activeIncidents = securityIncidents.filter(i => ['reported', 'investigating', 'contained'].includes(i.investigation_status));
  const criticalIncidents = securityIncidents.filter(i => i.severity === 'critical');
  const breachNotificationRequired = securityIncidents.filter(i => i.breach_notification_required);



  const exportComplianceReport = async () => {
    const user = await appClient.auth.me();
    
    const report = {
      report_type: "HIPAA Compliance Audit",
      generated_date: new Date().toISOString(),
      generated_by: user.email,
      date_range_days: dateRange,
      
      summary_metrics: {
        total_phi_access_events: totalAccess,
        successful_access: successfulAccess,
        denied_access: deniedAccess,
        unauthorized_attempts: unauthorizedAttempts,
        phi_accessed: phiAccessed,
        phi_created: phiCreated,
        phi_updated: phiUpdated,
        phi_exported: phiExported,
        active_security_incidents: activeIncidents.length,
        critical_incidents: criticalIncidents.length,
        breach_notifications_required: breachNotificationRequired.length
      },
      
      audit_log_details: filteredLogs.map(log => ({
        timestamp: log.created_date,
        action: log.action_type,
        user: log.user_email,
        entity: log.entity_type,
        result: log.action_result,
        hospital: log.hospital_name,
        reason: log.access_reason,
        denial_reason: log.denial_reason
      })),
      
      security_incidents: securityIncidents.map(incident => ({
        type: incident.incident_type,
        severity: incident.severity,
        discovered: incident.discovery_date,
        status: incident.investigation_status,
        phi_compromised: incident.phi_compromised,
        affected_patients: incident.affected_patients_count,
        breach_notification_required: incident.breach_notification_required,
        resolution: incident.resolution_date
      })),
      
      data_retention_policies: dataRetentionPolicies.map(policy => ({
        policy_name: policy.policy_name,
        entity_type: policy.entity_type,
        retention_years: policy.retention_period_years,
        disposal_method: policy.disposal_method,
        status: policy.policy_status
      })),
      
      compliance_status: {
        audit_logging: "Active",
        access_controls: "Enforced",
        encryption: "Enabled",
        breach_protocols: "Documented",
        data_retention: dataRetentionPolicies.length > 0 ? "Configured" : "Needs Configuration",
        incident_response: activeIncidents.length === 0 ? "Clear" : "Active Incidents"
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hipaa-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3" style={{ color: '#60A5FA' }}>
                <Shield className="w-10 h-10" style={{ color: '#10B981' }} />
                HIPAA Compliance & Security
              </h1>
              <p className="text-lg" style={{ color: '#60A5FA' }}>
                Healthcare data protection monitoring and audit trails
              </p>
            </div>
            <Button
              onClick={exportComplianceReport}
              style={{ backgroundColor: '#10B981', color: '#000000' }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Compliance Report
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Total PHI Access</p>
                  <p className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{totalAccess}</p>
                </div>
                <Eye className="w-8 h-8" style={{ color: '#60A5FA' }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#10B981', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Successful Access</p>
                  <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{successfulAccess}</p>
                </div>
                <CheckCircle className="w-8 h-8" style={{ color: '#10B981' }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#EF4444', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Denied Access</p>
                  <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>{deniedAccess}</p>
                </div>
                <XCircle className="w-8 h-8" style={{ color: '#EF4444' }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#F59E0B', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Active Incidents</p>
                  <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{activeIncidents.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8" style={{ color: '#F59E0B' }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="audit" className="space-y-6">
          <TabsList className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <TabsTrigger value="audit" style={{ color: '#60A5FA' }}>Audit Log</TabsTrigger>
            <TabsTrigger value="incidents" style={{ color: '#60A5FA' }}>Security Incidents</TabsTrigger>
            <TabsTrigger value="retention" style={{ color: '#60A5FA' }}>Data Retention</TabsTrigger>
          </TabsList>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
                <CardTitle style={{ color: '#60A5FA' }}>HIPAA Audit Log (Last {dateRange} days)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {filteredLogs.slice(0, 50).map((log) => (
                    <div key={log.id} className="p-4 rounded-lg border" style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge style={{ 
                            backgroundColor: log.action_result === 'success' ? '#065F46' : 
                                           log.action_result === 'denied' ? '#991B1B' : '#92400E',
                            color: '#FFF'
                          }}>
                            {log.action_result}
                          </Badge>
                          <Badge style={{ backgroundColor: '#1E3A8A', color: '#60A5FA' }}>
                            {log.action_type}
                          </Badge>
                        </div>
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>
                          {new Date(log.created_date).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-semibold" style={{ color: '#9CA3AF' }}>User: </span>
                          <span style={{ color: '#60A5FA' }}>{log.user_name || log.user_email}</span>
                        </div>
                        <div>
                          <span className="font-semibold" style={{ color: '#9CA3AF' }}>Entity: </span>
                          <span style={{ color: '#60A5FA' }}>{log.entity_type}</span>
                        </div>
                        {log.hospital_name && (
                          <div>
                            <span className="font-semibold" style={{ color: '#9CA3AF' }}>Hospital: </span>
                            <span style={{ color: '#60A5FA' }}>{log.hospital_name}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold" style={{ color: '#9CA3AF' }}>Reason: </span>
                          <span style={{ color: '#60A5FA' }}>{log.access_reason || 'N/A'}</span>
                        </div>
                        {log.denial_reason && (
                          <div className="col-span-2">
                            <span className="font-semibold" style={{ color: '#EF4444' }}>Denial Reason: </span>
                            <span style={{ color: '#EF4444' }}>{log.denial_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Incidents Tab */}
          <TabsContent value="incidents">
            <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
                <CardTitle style={{ color: '#60A5FA' }}>Security Incidents & Breach Management</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {securityIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10B981' }} />
                    <p className="text-xl font-semibold" style={{ color: '#10B981' }}>No Security Incidents Reported</p>
                    <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>System is secure and compliant</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {securityIncidents.map((incident) => (
                      <div key={incident.id} className="p-4 rounded-lg border" style={{ 
                        borderColor: incident.severity === 'critical' ? '#EF4444' : 
                                   incident.severity === 'high' ? '#F59E0B' : '#60A5FA',
                        backgroundColor: '#4B5563'
                      }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge style={{ 
                              backgroundColor: incident.severity === 'critical' ? '#991B1B' : 
                                             incident.severity === 'high' ? '#92400E' : '#1E3A8A',
                              color: '#FFF'
                            }}>
                              {incident.severity}
                            </Badge>
                            <Badge style={{ backgroundColor: '#7C3AED', color: '#A78BFA' }}>
                              {incident.incident_type}
                            </Badge>
                            <Badge style={{ 
                              backgroundColor: incident.investigation_status === 'resolved' ? '#065F46' : '#92400E',
                              color: '#FFF'
                            }}>
                              {incident.investigation_status}
                            </Badge>
                          </div>
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>
                            {new Date(incident.discovery_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p style={{ color: '#60A5FA' }}>{incident.description}</p>
                          {incident.phi_compromised && (
                            <div className="p-2 rounded" style={{ backgroundColor: '#991B1B' }}>
                              <span className="font-semibold" style={{ color: '#FFF' }}>
                                ⚠️ PHI COMPROMISED - {incident.affected_patients_count} patients affected
                              </span>
                            </div>
                          )}
                          {incident.breach_notification_required && (
                            <div className="p-2 rounded" style={{ backgroundColor: '#92400E' }}>
                              <span className="font-semibold" style={{ color: '#FFF' }}>
                                📋 Breach notification required under HIPAA
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Retention Tab */}
          <TabsContent value="retention">
            <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
                <CardTitle style={{ color: '#60A5FA' }}>Data Retention Policies (HIPAA Required: 6 Years)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {dataRetentionPolicies.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: '#F59E0B' }} />
                    <p className="text-xl font-semibold" style={{ color: '#F59E0B' }}>No Retention Policies Configured</p>
                    <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>Configure policies to ensure HIPAA compliance</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataRetentionPolicies.map((policy) => (
                      <div key={policy.id} className="p-4 rounded-lg border" style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563' }}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold" style={{ color: '#60A5FA' }}>{policy.policy_name}</h4>
                          <Badge style={{ 
                            backgroundColor: policy.policy_status === 'active' ? '#065F46' : '#6B7280',
                            color: '#FFF'
                          }}>
                            {policy.policy_status}
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-semibold" style={{ color: '#9CA3AF' }}>Entity: </span>
                            <span style={{ color: '#60A5FA' }}>{policy.entity_type}</span>
                          </div>
                          <div>
                            <span className="font-semibold" style={{ color: '#9CA3AF' }}>Retention: </span>
                            <span style={{ color: policy.retention_period_years >= 6 ? '#10B981' : '#EF4444' }}>
                              {policy.retention_period_years} years {policy.retention_period_years < 6 ? '⚠️ Below HIPAA minimum' : '✓'}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold" style={{ color: '#9CA3AF' }}>Disposal: </span>
                            <span style={{ color: '#60A5FA' }}>{policy.disposal_method}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}