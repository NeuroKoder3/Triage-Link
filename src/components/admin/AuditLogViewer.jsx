import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, User, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import { format } from "date-fns";

export default function AuditLogViewer() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['permissionAuditLogs'],
    queryFn: () => appClient.entities.PermissionAuditLog.list('-created_date', 100),
  });

  const filteredLogs = auditLogs.filter(log =>
    log.target_user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_role_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.performed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const actionTypeConfig = {
    role_created: { label: 'Role Created', color: '#10B981' },
    role_updated: { label: 'Role Updated', color: '#60A5FA' },
    role_deleted: { label: 'Role Deleted', color: '#EF4444' },
    role_assigned: { label: 'Role Assigned', color: '#8B5CF6' },
    role_revoked: { label: 'Role Revoked', color: '#F59E0B' },
    permission_changed: { label: 'Permission Changed', color: '#60A5FA' }
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
          <ScrollText className="w-5 h-5" />
          Permission Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#60A5FA' }} />
            <Input
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
            />
          </div>
        </div>

        {/* Audit Log Entries */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => {
            if (!log) return null;
            const config = actionTypeConfig[log.action_type] || { label: log.action_type || 'Unknown', color: '#60A5FA' };
            
            return (
              <div
                key={log.id}
                className="p-4 rounded-lg border"
                style={{ backgroundColor: '#4B5563', borderColor: '#6B7280' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: config.color, color: '#000000' }}>
                      {config.label}
                    </Badge>
                    {log.target_role_name && (
                      <Badge variant="outline" style={{ borderColor: '#60A5FA', color: '#60A5FA' }}>
                        {log.target_role_name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
                    <Calendar className="w-3 h-3" />
                    {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                    <User className="w-4 h-4" />
                    <span className="font-semibold">Performed by:</span>
                    <span>{log.performed_by_name || log.performed_by}</span>
                  </div>

                  {log.target_user_email && (
                    <div style={{ color: '#9CA3AF' }}>
                      Target user: {log.target_user_email}
                    </div>
                  )}

                  {log.reason && (
                    <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#374151' }}>
                      <span className="font-semibold" style={{ color: '#60A5FA' }}>Reason: </span>
                      <span style={{ color: '#9CA3AF' }}>{log.reason}</span>
                    </div>
                  )}

                  {log.changes_made && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold" style={{ color: '#60A5FA' }}>
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 rounded text-xs overflow-x-auto" style={{ backgroundColor: '#374151', color: '#9CA3AF' }}>
                        {JSON.stringify(log.changes_made, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <ScrollText className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
            <p style={{ color: '#9CA3AF' }}>
              {searchTerm ? 'No audit logs found matching your search' : 'No audit logs yet'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}