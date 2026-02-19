import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Clock, CheckCircle, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";

export default function LiveAlertsPanel() {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['pendingAlerts'],
    queryFn: () => appClient.entities.PendingAlert.filter({ status: 'active' }, '-created_date', 20),
    refetchInterval: 30000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ id, acknowledgedBy }) => {
      return appClient.entities.PendingAlert.update(id, {
        status: 'acknowledged',
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAlerts'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolvedBy, responseTime }) => {
      return appClient.entities.PendingAlert.update(id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        provider_response_time: new Date().toISOString(),
        response_time_minutes: responseTime
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAlerts'] });
    },
  });

  const handleAcknowledge = async (alertId) => {
    const user = await appClient.auth.me();
    acknowledgeMutation.mutate({ id: alertId, acknowledgedBy: user.email });
  };

  const handleResolve = async (alert) => {
    const user = await appClient.auth.me();
    
    let responseTime = null;
    if (alert.initial_contact_time) {
      const start = new Date(alert.initial_contact_time);
      const end = new Date();
      responseTime = Math.round((end - start) / (1000 * 60));
    }
    
    resolveMutation.mutate({ 
      id: alert.id, 
      resolvedBy: user.email,
      responseTime 
    });
  };

  const priorityColors = {
    critical: { bg: '#991B1B', text: '#EF4444', border: '#EF4444' },
    high: { bg: '#92400E', text: '#F59E0B', border: '#F59E0B' },
    medium: { bg: '#1E40AF', text: '#60A5FA', border: '#60A5FA' },
    low: { bg: '#374151', text: '#60A5FA', border: '#60A5FA' }
  };

  const criticalAlerts = alerts.filter(a => a.priority === 'critical');

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <Bell className="w-5 h-5" style={{ color: '#60A5FA' }} />
            Live Alerts
            {alerts.length > 0 && (
              <Badge 
                className="ml-2"
                style={{ 
                  backgroundColor: criticalAlerts.length > 0 ? '#EF4444' : '#F59E0B',
                  color: '#000000'
                }}
              >
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          {criticalAlerts.length > 0 && (
            <Badge 
              className="animate-pulse border"
              style={{ 
                backgroundColor: '#991B1B',
                color: '#EF4444',
                borderColor: '#EF4444'
              }}
            >
              {criticalAlerts.length} CRITICAL
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#10B981' }} />
              <p className="font-semibold" style={{ color: '#60A5FA' }}>All Clear</p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>No pending alerts</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const config = priorityColors[alert.priority];
                const elapsedMinutes = alert.time_elapsed_minutes || 
                  (alert.initial_contact_time ? Math.round((Date.now() - new Date(alert.initial_contact_time)) / (1000 * 60)) : 0);
                
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-lg border ${alert.priority === 'critical' ? 'animate-pulse' : ''}`}
                    style={{ 
                      backgroundColor: '#4B5563',
                      borderColor: config.border
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-2">
                        <Badge 
                          className="border"
                          style={{ 
                            backgroundColor: config.bg,
                            color: config.text,
                            borderColor: config.border
                          }}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {alert.priority.toUpperCase()}
                        </Badge>
                        {alert.escalation_level > 0 && (
                          <Badge style={{ backgroundColor: '#EF4444', color: '#000000' }}>
                            Escalated {alert.escalation_level}x
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: config.text }}>
                        <Clock className="w-3 h-3" />
                        {elapsedMinutes} min
                      </div>
                    </div>
                    
                    <h4 className="font-semibold mb-1" style={{ color: '#60A5FA' }}>
                      {alert.hospital_name || 'Alert'}
                    </h4>
                    <p className="text-sm mb-2" style={{ color: '#60A5FA' }}>
                      {alert.description}
                    </p>
                    
                    {alert.action_required && (
                      <p className="text-sm mb-3 font-medium" style={{ color: config.text }}>
                        Action: {alert.action_required}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledgeMutation.isPending}
                        className="text-xs"
                        style={{ borderColor: '#60A5FA', color: '#60A5FA', backgroundColor: '#374151' }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleResolve(alert)}
                        disabled={resolveMutation.isPending}
                        className="text-xs"
                        style={{ backgroundColor: '#10B981', color: '#000000' }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
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