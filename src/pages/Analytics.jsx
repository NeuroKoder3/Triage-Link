import React, { useState, useMemo } from "react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Clock, TrendingUp, Users, Building2, Activity, Brain, Target } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import RuleSuggestions from "../components/analytics/RuleSuggestions";
import TrendInsights from "../components/analytics/TrendInsights";
import RuleEffectivenessAnalysis from "../components/analytics/RuleEffectivenessAnalysis";
import AILearningMetrics from "../components/analytics/AILearningMetrics";
import AIRuleOptimizer from "../components/analytics/AIRuleOptimizer";

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedHospital, setSelectedHospital] = useState('all');

  const { data: logs = [] } = useQuery({
    queryKey: ['triageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date'),
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['mdConsultations'],
    queryFn: () => appClient.entities.MDConsultation.list('-created_date'),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.list(),
  });

  const { data: corrections = [] } = useQuery({
    queryKey: ['aiCorrections'],
    queryFn: () => appClient.entities.AICorrection.list('-created_date'),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['allAlerts'],
    queryFn: () => appClient.entities.PendingAlert.list('-created_date'),
  });

  // Filter data by date range and hospital
  const filteredData = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const filterByDate = (items) => items.filter(item => {
      const date = new Date(item.created_date);
      return date >= start && date <= end;
    });

    const filterByHospital = (items) => 
      selectedHospital === 'all' ? items : items.filter(item => item.hospital_id === selectedHospital);

    return {
      logs: filterByHospital(filterByDate(logs)),
      consultations: filterByHospital(filterByDate(consultations)),
      corrections: filterByHospital(filterByDate(corrections)),
      alerts: filterByHospital(filterByDate(alerts))
    };
  }, [logs, consultations, corrections, alerts, dateRange, selectedHospital]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCalls = filteredData.logs.length + filteredData.consultations.length;
    
    const avgDuration = totalCalls > 0
      ? Math.round([...filteredData.logs, ...filteredData.consultations]
          .reduce((sum, item) => sum + (item.duration_seconds || 0), 0) / totalCalls)
      : 0;

    const totalAIDecisions = filteredData.logs.length;
    const overridden = filteredData.corrections.length;
    const aiAccuracy = totalAIDecisions > 0 ? ((totalAIDecisions - overridden) / totalAIDecisions) * 100 : 0;

    const resolvedAlerts = filteredData.alerts.filter(a => a.response_time_minutes !== undefined && a.response_time_minutes !== null);
    const avgResponseTime = resolvedAlerts.length > 0
      ? Math.round(resolvedAlerts.reduce((sum, a) => sum + a.response_time_minutes, 0) / resolvedAlerts.length)
      : 0;

    return {
      totalCalls,
      avgDuration,
      aiAccuracy,
      avgResponseTime
    };
  }, [filteredData]);

  // Volume over time (daily)
  const volumeOverTime = useMemo(() => {
    const dateMap = {};
    
    [...filteredData.logs, ...filteredData.consultations].forEach(item => {
      const date = new Date(item.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap[date]) {
        dateMap[date] = { date, patient: 0, consultation: 0 };
      }
      if (filteredData.logs.includes(item)) {
        dateMap[date].patient++;
      } else {
        dateMap[date].consultation++;
      }
    });

    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredData]);

  // Resolution time trend
  const resolutionTrend = useMemo(() => {
    const dateMap = {};
    
    [...filteredData.logs, ...filteredData.consultations].forEach(item => {
      if (item.duration_seconds) {
        const date = new Date(item.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dateMap[date]) {
          dateMap[date] = { date, total: 0, count: 0 };
        }
        dateMap[date].total += item.duration_seconds;
        dateMap[date].count++;
      }
    });

    return Object.values(dateMap)
      .map(d => ({ date: d.date, avgTime: Math.round(d.total / d.count) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredData]);

  // AI Accuracy trend
  const aiAccuracyTrend = useMemo(() => {
    const dateMap = {};
    
    filteredData.logs.forEach(log => {
      const date = new Date(log.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap[date]) {
        dateMap[date] = { date, total: 0, accepted: 0 };
      }
      dateMap[date].total++;
      
      const wasOverridden = filteredData.corrections.some(c => 
        Math.abs(new Date(c.created_date) - new Date(log.created_date)) < 60000
      );
      if (!wasOverridden) {
        dateMap[date].accepted++;
      }
    });

    return Object.values(dateMap)
      .map(d => ({ 
        date: d.date, 
        accuracy: d.total > 0 ? Math.round((d.accepted / d.total) * 100) : 0 
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredData]);

  // Response time by urgency
  const responseByUrgency = useMemo(() => {
    const urgencyMap = {};
    
    filteredData.alerts.forEach(alert => {
      if (alert.response_time_minutes !== undefined && alert.response_time_minutes !== null) {
        const urgency = alert.priority || 'medium';
        if (!urgencyMap[urgency]) {
          urgencyMap[urgency] = { total: 0, count: 0 };
        }
        urgencyMap[urgency].total += alert.response_time_minutes;
        urgencyMap[urgency].count++;
      }
    });

    return Object.entries(urgencyMap).map(([urgency, data]) => ({
      urgency: urgency.charAt(0).toUpperCase() + urgency.slice(1),
      avgTime: Math.round(data.total / data.count)
    }));
  }, [filteredData]);

  // Calls by hospital
  const callsByHospital = useMemo(() => {
    const hospitalMap = {};
    
    [...filteredData.logs, ...filteredData.consultations].forEach(item => {
      const name = item.hospital_name || 'Unknown';
      hospitalMap[name] = (hospitalMap[name] || 0) + 1;
    });

    return Object.entries(hospitalMap)
      .map(([name, calls]) => ({ name: name.substring(0, 15), calls }))
      .sort((a, b) => b.calls - a.calls);
  }, [filteredData]);

  // Patient type distribution
  const patientTypeDistribution = useMemo(() => {
    const typeMap = {};
    
    [...filteredData.logs, ...filteredData.consultations].forEach(item => {
      if (item.patient_type) {
        const type = item.patient_type.replace('-', ' ');
        typeMap[type] = (typeMap[type] || 0) + 1;
      }
    });

    return Object.entries(typeMap).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));
  }, [filteredData]);

  const COLORS = ['#60A5FA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Prepare data for trend insights
  const insightData = useMemo(() => ({
    totalCalls: metrics.totalCalls,
    avgDuration: metrics.avgDuration,
    aiAccuracy: metrics.aiAccuracy,
    avgResponseTime: metrics.avgResponseTime,
    volumeOverTime,
    resolutionTrend,
    aiAccuracyTrend,
    callsByHospital
  }), [metrics, volumeOverTime, resolutionTrend, aiAccuracyTrend, callsByHospital]);

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#60A5FA' }}>
            <Activity className="inline-block w-8 h-8 mr-2" style={{ color: '#60A5FA' }} />
            Analytics Dashboard
          </h1>
          <p className="text-lg" style={{ color: '#60A5FA' }}>Real-time insights and trend analysis</p>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6 border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label style={{ color: '#60A5FA' }}>Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#60A5FA' }}>End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ color: '#60A5FA' }}>Hospital</Label>
                <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                  <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hospitals</SelectItem>
                    {hospitals.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-8 h-8" style={{ color: '#60A5FA' }} />
                <span className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{metrics.totalCalls}</span>
              </div>
              <p className="font-semibold" style={{ color: '#60A5FA' }}>Total Calls</p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>Selected period</p>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8" style={{ color: '#10B981' }} />
                <span className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{metrics.avgDuration}s</span>
              </div>
              <p className="font-semibold" style={{ color: '#60A5FA' }}>Avg Resolution</p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>Per call</p>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Brain className="w-8 h-8" style={{ color: '#8B5CF6' }} />
                <span className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{Math.round(metrics.aiAccuracy)}%</span>
              </div>
              <p className="font-semibold" style={{ color: '#60A5FA' }}>AI Accuracy</p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>Suggestions accepted</p>
            </CardContent>
          </Card>

          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8" style={{ color: '#F59E0B' }} />
                <span className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{metrics.avgResponseTime}m</span>
              </div>
              <p className="font-semibold" style={{ color: '#60A5FA' }}>Avg Response</p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>Provider response time</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Trend Insights */}
        <div className="mb-8">
          <TrendInsights data={insightData} dateRange={dateRange} />
        </div>

        {/* Rule Effectiveness Analysis - NEW */}
        <div className="mb-8">
          <RuleEffectivenessAnalysis />
        </div>

        {/* AI Rule Optimizer */}
        <div className="mb-8">
          <AIRuleOptimizer />
        </div>

        {/* AI Rule Suggestions */}
        <div className="mb-8">
          <RuleSuggestions />
        </div>

        {/* AI Learning Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#60A5FA' }}>
            AI Learning & Improvement
          </h2>
          <AILearningMetrics />
        </div>

        {/* Trend Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Call Volume Trend */}
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Call Volume Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {volumeOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={volumeOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                    <XAxis dataKey="date" tick={{ fill: '#60A5FA', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#60A5FA' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="patient" stackId="1" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.6} name="Patient Calls" />
                    <Area type="monotone" dataKey="consultation" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="MD Consultations" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Resolution Time Trend */}
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Resolution Time Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {resolutionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={resolutionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                    <XAxis dataKey="date" tick={{ fill: '#60A5FA', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#60A5FA' }} label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: '#60A5FA' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgTime" stroke="#10B981" strokeWidth={3} name="Avg Time (s)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>

          {/* AI Accuracy Trend */}
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>AI Accuracy Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {aiAccuracyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={aiAccuracyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                    <XAxis dataKey="date" tick={{ fill: '#60A5FA', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#60A5FA' }} domain={[0, 100]} label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft', fill: '#60A5FA' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#8B5CF6" strokeWidth={3} name="Accuracy %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Response Time by Urgency */}
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Response Time by Urgency</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {responseByUrgency.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseByUrgency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                    <XAxis dataKey="urgency" tick={{ fill: '#60A5FA' }} />
                    <YAxis tick={{ fill: '#60A5FA' }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#60A5FA' }} />
                    <Tooltip />
                    <Bar dataKey="avgTime" fill="#F59E0B" name="Avg Response (min)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calls by Hospital */}
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Calls by Hospital</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {callsByHospital.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={callsByHospital}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                    <XAxis dataKey="name" tick={{ fill: '#60A5FA' }} />
                    <YAxis tick={{ fill: '#60A5FA' }} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#60A5FA" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Patient Type Distribution */}
          <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Patient Type Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {patientTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={patientTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {patientTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#60A5FA' }}>No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}