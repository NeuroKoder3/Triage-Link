
import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import ReportFilters from "../components/reports/ReportFilters";
import MetricsCards from "../components/reports/MetricsCards";
import ReportCharts from "../components/reports/ReportCharts";
import AIReportSuggestions from "../components/reports/AIReportSuggestions";
import NaturalLanguageReport from "../components/reports/NaturalLanguageReport";
import ScheduleReportModal from "../components/reports/ScheduleReportModal";
import ScheduledReportsList from "../components/reports/ScheduledReportsList";
import AnomalyDetector from "../components/reports/AnomalyDetector";

export default function Reports() {
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    hospitalId: 'all',
    patientType: 'all',
    urgencyLevel: 'all',
    reportType: 'all'
  });

  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.list(),
  });

  const { data: triageLogs = [] } = useQuery({
    queryKey: ['triageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date'),
  });

  const { data: mdConsultations = [] } = useQuery({
    queryKey: ['mdConsultations'],
    queryFn: () => appClient.entities.MDConsultation.list('-created_date'),
  });

  const { data: aiCorrections = [] } = useQuery({
    queryKey: ['aiCorrections'],
    queryFn: () => appClient.entities.AICorrection.list('-created_date'),
  });

  const { data: pendingAlerts = [] } = useQuery({
    queryKey: ['pendingAlerts'],
    queryFn: () => appClient.entities.PendingAlert.list('-created_date'),
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyCustomFilters = (customFilters) => {
    setFilters(prev => ({ ...prev, ...customFilters }));
    generateReport();
  };

  const filterByDateRange = (items) => {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    
    return items.filter(item => {
      const itemDate = new Date(item.created_date);
      return itemDate >= start && itemDate <= end;
    });
  };

  const filterByHospital = (items) => {
    if (filters.hospitalId === 'all') return items;
    return items.filter(item => item.hospital_id === filters.hospitalId);
  };

  const filterByPatientType = (items) => {
    if (filters.patientType === 'all') return items;
    return items.filter(item => item.patient_type === filters.patientType);
  };

  const generateReport = () => {
    setIsGenerating(true);

    // Filter data based on report type
    let filteredTriageLogs = triageLogs;
    let filteredConsultations = mdConsultations;

    if (filters.reportType === 'patient') {
      filteredConsultations = [];
    } else if (filters.reportType === 'consultation') {
      filteredTriageLogs = [];
    }

    // Apply filters
    filteredTriageLogs = filterByDateRange(filterByHospital(filterByPatientType(filteredTriageLogs)));
    filteredConsultations = filterByDateRange(filterByHospital(filterByPatientType(filteredConsultations)));

    // Calculate metrics
    const totalCalls = filteredTriageLogs.length + filteredConsultations.length;
    
    const avgResolutionTime = totalCalls > 0
      ? [...filteredTriageLogs, ...filteredConsultations].reduce((sum, item) => sum + (item.duration_seconds || 0), 0) / totalCalls
      : 0;

    // AI Accuracy
    const relevantCorrections = filterByDateRange(aiCorrections);
    const totalAIDecisions = filteredTriageLogs.length;
    const overridden = relevantCorrections.length;
    const accepted = totalAIDecisions - overridden;
    const aiAccuracy = totalAIDecisions > 0 ? (accepted / totalAIDecisions) * 100 : 0;

    // Response Rate from alerts
    const relevantAlerts = filterByDateRange(pendingAlerts);
    const resolvedAlerts = relevantAlerts.filter(a => a.status === 'resolved').length;
    const responseRate = relevantAlerts.length > 0 ? (resolvedAlerts / relevantAlerts.length) * 100 : 0;

    // Volume over time
    const volumeMap = {};
    [...filteredTriageLogs, ...filteredConsultations].forEach(item => {
      const date = new Date(item.created_date).toLocaleDateString();
      if (!volumeMap[date]) {
        volumeMap[date] = { date, calls: 0, consultations: 0 };
      }
      if (filteredTriageLogs.includes(item)) {
        volumeMap[date].calls++;
      } else {
        volumeMap[date].consultations++;
      }
    });
    const volumeOverTime = Object.values(volumeMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calls by hospital
    const hospitalMap = {};
    [...filteredTriageLogs, ...filteredConsultations].forEach(item => {
      const name = item.hospital_name || 'Unknown';
      hospitalMap[name] = (hospitalMap[name] || 0) + 1;
    });
    const callsByHospital = Object.entries(hospitalMap)
      .map(([name, count]) => ({ name: name.substring(0, 20), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Urgency distribution
    const urgencyMap = {};
    filteredTriageLogs.forEach(log => {
      const match = log.coordinator_notes?.match(/Urgency:\s*(\w+)/i);
      const urgency = match ? match[1].toLowerCase() : 'routine';
      urgencyMap[urgency] = (urgencyMap[urgency] || 0) + 1;
    });
    filteredConsultations.forEach(consultation => {
      const urgency = consultation.urgency_level || 'routine';
      urgencyMap[urgency] = (urgencyMap[urgency] || 0) + 1;
    });
    const urgencyDistribution = Object.entries(urgencyMap).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));

    // Response times by urgency
    const responseTimesMap = {};
    relevantAlerts.forEach(alert => {
      if (alert.response_time_minutes) {
        const urgency = alert.priority || 'medium';
        if (!responseTimesMap[urgency]) {
          responseTimesMap[urgency] = { total: 0, count: 0 };
        }
        responseTimesMap[urgency].total += alert.response_time_minutes;
        responseTimesMap[urgency].count++;
      }
    });
    const responseTimesByUrgency = Object.entries(responseTimesMap).map(([urgency, data]) => ({
      urgency: urgency.charAt(0).toUpperCase() + urgency.slice(1),
      avgTime: Math.round(data.total / data.count)
    }));

    setReportData({
      metrics: {
        totalCalls,
        avgResolutionTime,
        aiAccuracy,
        responseRate
      },
      charts: {
        volumeOverTime,
        callsByHospital,
        urgencyDistribution,
        responseTimesByUrgency,
        aiMetrics: {
          accepted,
          overridden,
          avgConfidence: totalAIDecisions > 0 ? Math.round((accepted / totalAIDecisions) * 100) : 0
        }
      }
    });

    setIsGenerating(false);
  };

  const handleExport = () => {
    if (!reportData) return;

    let csv = 'TriageLink Report\n\n';
    csv += `Generated: ${new Date().toLocaleString()}\n`;
    csv += `Date Range: ${filters.startDate} to ${filters.endDate}\n\n`;
    
    csv += 'Key Metrics\n';
    csv += `Total Calls,${reportData.metrics.totalCalls}\n`;
    csv += `Avg Resolution Time (seconds),${Math.round(reportData.metrics.avgResolutionTime)}\n`;
    csv += `AI Accuracy (%),${Math.round(reportData.metrics.aiAccuracy)}\n`;
    csv += `Response Rate (%),${Math.round(reportData.metrics.responseRate)}\n\n`;

    csv += 'Calls by Hospital\n';
    csv += 'Hospital,Count\n';
    reportData.charts.callsByHospital.forEach(item => {
      csv += `${item.name},${item.count}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triagelink-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#60A5FA' }}>
            <FileText className="inline-block w-8 h-8 mr-2" style={{ color: '#60A5FA' }} />
            Reports & Analytics
          </h1>
          <p className="text-lg" style={{ color: '#60A5FA' }}>
            AI-powered insights, automated reporting, and anomaly detection
          </p>
        </motion.div>

        {/* Anomaly Detector */}
        <div className="mb-6">
          <AnomalyDetector />
        </div>

        {/* Scheduled Reports List */}
        <div className="mb-6">
          <ScheduledReportsList />
        </div>

        {/* AI Report Suggestions */}
        <AIReportSuggestions onGenerateReport={handleApplyCustomFilters} />

        {/* Natural Language Report Request */}
        <div className="mb-6">
          <NaturalLanguageReport onReportGenerated={handleApplyCustomFilters} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <ReportFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            hospitals={hospitals}
            onGenerate={generateReport}
            onExport={handleExport}
            isLoading={isGenerating}
            onSchedule={() => setShowScheduleModal(true)}
          />
        </div>

        {/* Report Content */}
        {reportData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Metrics Cards */}
            <MetricsCards metrics={reportData.metrics} />

            {/* Charts */}
            <ReportCharts data={reportData.charts} />
          </motion.div>
        ) : (
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                No Report Generated
              </h3>
              <p style={{ color: '#60A5FA' }}>
                Use AI suggestions, ask in natural language, or set filters and click "Generate Report"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Schedule Report Modal */}
        <ScheduleReportModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          currentFilters={filters}
          onScheduled={() => {
            // Optionally refresh scheduled reports list
          }}
        />
      </div>
    </div>
  );
}
