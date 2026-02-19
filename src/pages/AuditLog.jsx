import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search, FileText, Clock, User } from "lucide-react";

export default function AuditLog() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['triageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date'),
  });

  const filteredLogs = logs.filter(log =>
    log.hospital_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.complaint_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.created_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.organ_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#60A5FA' }}>Audit Log</h1>
          <p className="text-lg" style={{ color: '#60A5FA' }}>Complete history of all triage decisions</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#60A5FA' }} />
              <Input
                placeholder="Search by hospital, organ type, complaint, or coordinator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border"
                style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Patient Call Logs */}
        <div className="space-y-4">
          {logsLoading ? (
            <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardContent className="p-8 text-center">
                <p style={{ color: '#60A5FA' }}>Loading triage logs...</p>
              </CardContent>
            </Card>
          ) : filteredLogs.length === 0 ? (
            <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardContent className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>No Logs Found</h3>
                <p style={{ color: '#60A5FA' }}>
                  {searchTerm ? 'No logs match your search criteria.' : 'No triage calls have been logged yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                <CardHeader className="border-b pb-4" style={{ borderColor: '#60A5FA' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2" style={{ color: '#60A5FA' }}>
                        {log.hospital_name}
                      </CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                          {log.patient_type}
                        </Badge>
                        <Badge style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
                          {log.organ_type === 'kidney-pancreas' ? 'Kidney & Pancreas' : log.organ_type}
                        </Badge>
                        <Badge style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          {log.complaint_category}
                        </Badge>
                        <Badge 
                          style={{ 
                            backgroundColor: log.status === 'completed' ? '#DBEAFE' : log.status === 'escalated' ? '#FEF3C7' : '#F3F4F6',
                            color: log.status === 'completed' ? '#1E40AF' : log.status === 'escalated' ? '#92400E' : '#374151'
                          }}
                        >
                          {log.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm" style={{ color: '#60A5FA' }}>
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}
                      </div>
                      {log.duration_seconds && (
                        <div>Duration: {log.duration_seconds}s</div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: '#60A5FA' }}>Action Taken</h4>
                      <p style={{ color: '#60A5FA' }}>{log.action_taken}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: '#60A5FA' }}>Contact Method</h4>
                      <p style={{ color: '#60A5FA' }}>{log.contact_method?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {log.coordinator_notes && (
                    <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#4B5563', borderColor: '#60A5FA' }}>
                      <h4 className="font-semibold mb-2" style={{ color: '#60A5FA' }}>Coordinator Notes</h4>
                      <p style={{ color: '#60A5FA' }}>{log.coordinator_notes}</p>
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#60A5FA' }}>
                    <User className="w-4 h-4" />
                    <span>Coordinator: {log.created_by}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}