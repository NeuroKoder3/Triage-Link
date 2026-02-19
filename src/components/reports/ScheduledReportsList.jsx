import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Mail, Pause, Play, Trash2, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import { format } from "date-fns";

export default function ScheduledReportsList() {
  const queryClient = useQueryClient();

  const { data: scheduledReports = [] } = useQuery({
    queryKey: ['scheduledReports'],
    queryFn: () => appClient.entities.ScheduledReport.list('-created_date'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => appClient.entities.ScheduledReport.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.ScheduledReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledReports'] });
    },
  });

  const handleToggleStatus = (report) => {
    const newStatus = report.status === 'active' ? 'paused' : 'active';
    updateStatusMutation.mutate({ id: report.id, status: newStatus });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this scheduled report?')) {
      deleteMutation.mutate(id);
    }
  };

  const frequencyLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly'
  };

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getDeliveryDayLabel = (report) => {
    if (report.frequency === 'daily') return 'Every day';
    if (report.frequency === 'monthly') return `Day ${report.delivery_day} of month`;
    return weekDays[parseInt(report.delivery_day)];
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <CardTitle style={{ color: '#60A5FA' }}>
          <Calendar className="inline-block w-5 h-5 mr-2" />
          Scheduled Reports ({scheduledReports.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence>
          {scheduledReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: '#60A5FA' }} />
              <p style={{ color: '#60A5FA' }}>No scheduled reports yet</p>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                Create a scheduled report to receive automated insights
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {scheduledReports.map((report) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: '#4B5563', borderColor: '#60A5FA' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold" style={{ color: '#60A5FA' }}>
                          {report.report_name}
                        </h4>
                        <Badge
                          style={{
                            backgroundColor: report.status === 'active' ? '#10B981' : '#6B7280',
                            color: '#000000'
                          }}
                        >
                          {report.status.toUpperCase()}
                        </Badge>
                        <Badge style={{ backgroundColor: '#1F2937', color: '#60A5FA' }}>
                          {report.report_type}
                        </Badge>
                      </div>
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        Created by {report.created_by_name || report.created_by}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                        <Calendar className="w-4 h-4" />
                        <span>{frequencyLabels[report.frequency]}</span>
                        {report.frequency !== 'daily' && (
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>
                            ({getDeliveryDayLabel(report)})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                        <Clock className="w-4 h-4" />
                        <span>at {report.delivery_time}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                        <Mail className="w-4 h-4" />
                        <span>{report.recipients.length} recipient(s)</span>
                      </div>
                      {report.next_generation && (
                        <div style={{ color: '#9CA3AF' }}>
                          Next: {format(new Date(report.next_generation), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {report.recipients.slice(0, 3).map((email) => (
                      <Badge
                        key={email}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                      >
                        {email}
                      </Badge>
                    ))}
                    {report.recipients.length > 3 && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                      >
                        +{report.recipients.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t" style={{ borderColor: '#6B7280' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(report)}
                      style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                    >
                      {report.status === 'active' ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Resume
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(report.id)}
                      style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}