import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Shield, Bell, Target, Clock } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function ReportingDashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [selectedHospital, setSelectedHospital] = useState('all');

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.list(),
  });

  const { data: triageLogs = [] } = useQuery({
    queryKey: ['triageLogs'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date', 1000),
  });

  const { data: aiCorrections = [] } = useQuery({
    queryKey: ['aiCorrections'],
    queryFn: () => appClient.entities.AICorrection.list(),
  });

  const { data: pageLogs = [] } = useQuery({
    queryKey: ['pageLogs'],
    queryFn: () => appClient.entities.PageLog.list('-created_date', 500),
  });

  const { data: hipaaLogs = [] } = useQuery({
    queryKey: ['hipaaLogs'],
    queryFn: () => appClient.entities.HIPAAAuditLog.list('-created_date', 500),
  });

  const { data: securityIncidents = [] } = useQuery({
    queryKey: ['securityIncidents'],
    queryFn: () => appClient.entities.SecurityIncident.list('-created_date', 100),
  });

  const { data: triageRules = [] } = useQuery({
    queryKey: ['triageRules'],
    queryFn: () => appClient.entities.TriageRule.list(),
  });

  // Filter data by date range and hospital
  const filterByDate = (items) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
    return items.filter(item => {
      const itemDate = new Date(item.created_date);
      const dateMatch = itemDate >= cutoff;
      const hospitalMatch = selectedHospital === 'all' || item.hospital_id === selectedHospital;
      return dateMatch && hospitalMatch;
    });
  };

  const filteredTriageLogs = filterByDate(triageLogs);
  const filteredPageLogs = filterByDate(pageLogs);
  const filteredHipaaLogs = filterByDate(hipaaLogs);
  const filteredSecurityIncidents = filterByDate(securityIncidents);

  // Calculate metrics
  const totalTriages = filteredTriageLogs.length;
  const avgResolutionTime = filteredTriageLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / totalTriages || 0;
  
  const aiAccuracy = aiCorrections.length > 0 
    ? ((triageLogs.length - aiCorrections.length) / triageLogs.length * 100).toFixed(1)
    : 100;

  const totalPages = filteredPageLogs.length;
  const successfulPages = filteredPageLogs.filter(p => p.status === 'delivered' || p.status === 'confirmed').length;
  const pagingSuccessRate = totalPages > 0 ? (successfulPages / totalPages * 100).toFixed(1) : 0;

  // Triage volume trends by day
  const volumeTrends = filteredTriageLogs.reduce((acc, log) => {
    const date = new Date(log.created_date).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const volumeData = Object.entries(volumeTrends)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  // Urgency distribution
  const urgencyData = filteredTriageLogs.reduce((acc, log) => {
    const urgency = log.action_taken?.includes('emergency') || log.action_taken?.includes('ER') ? 'Emergency' :
                   log.action_taken?.includes('urgent') ? 'Urgent' : 'Non-Urgent';
    acc[urgency] = (acc[urgency] || 0) + 1;
    return acc;
  }, {});

  const urgencyChartData = Object.entries(urgencyData).map(([name, value]) => ({ name, value }));

  // AI performance over time
  const aiPerformanceData = volumeData.map(day => {
    const dayLogs = filteredTriageLogs.filter(log => 
      new Date(log.created_date).toLocaleDateString() === day.date
    );
    const dayCorrections = aiCorrections.filter(corr => 
      dayLogs.some(log => log.id === corr.triage_log_id)
    );
    const accuracy = dayLogs.length > 0 ? ((dayLogs.length - dayCorrections.length) / dayLogs.length * 100) : 100;
    return { date: day.date, accuracy: accuracy.toFixed(1) };
  });

  // Paging performance
  const pagingStatusData = filteredPageLogs.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {});

  const pagingChartData = Object.entries(pagingStatusData).map(([name, value]) => ({ name, value }));

  // Rule utilization
  const ruleUsage = filteredTriageLogs.reduce((acc, log) => {
    const category = log.complaint_category || 'Unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const topRules = Object.entries(ruleUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));

  // Security metrics
  const securityMetrics = {
    totalAccessAttempts: filteredHipaaLogs.length,
    deniedAccess: filteredHipaaLogs.filter(l => l.action_result === 'denied').length,
    securityIncidents: filteredSecurityIncidents.length,
    criticalIncidents: filteredSecurityIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length,
  };

  // Hospital performance
  const hospitalPerformance = hospitals.map(hospital => {
    const hospitalLogs = filteredTriageLogs.filter(log => log.hospital_id === hospital.id);
    return {
      name: hospital.name,
      triages: hospitalLogs.length,
      avgTime: hospitalLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / hospitalLogs.length || 0
    };
  }).filter(h => h.triages > 0);

  const COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#EC4899'];

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3" style={{ color: '#60A5FA' }}>
            <BarChart3 className="w-10 h-10" />
            Executive Reporting Dashboard
          </h1>
          <p className="text-lg" style={{ color: '#60A5FA' }}>
            Comprehensive analytics and performance metrics
          </p>
        </motion.div>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-4">
              <label className="block mb-2 text-sm font-semibold" style={{ color: '#60A5FA' }}>Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardContent className="p-4">
              <label className="block mb-2 text-sm font-semibold" style={{ color: '#60A5FA' }}>Hospital</label>
              <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hospitals</SelectItem>
                  {hospitals.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Total Triages</p>
                    <p className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{totalTriages}</p>
                  </div>
                  <TrendingUp className="w-10 h-10" style={{ color: '#34D399' }} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>AI Accuracy</p>
                    <p className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{aiAccuracy}%</p>
                  </div>
                  <Target className="w-10 h-10" style={{ color: '#34D399' }} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Paging Success</p>
                    <p className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{pagingSuccessRate}%</p>
                  </div>
                  <Bell className="w-10 h-10" style={{ color: '#FBBF24' }} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Avg Resolution</p>
                    <p className="text-3xl font-bold" style={{ color: '#60A5FA' }}>{Math.round(avgResolutionTime / 60)}m</p>
                  </div>
                  <Clock className="w-10 h-10" style={{ color: '#A78BFA' }} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Triage Volume Trends</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA' }} />
                  <Area type="monotone" dataKey="count" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>AI Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={aiPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" domain={[80, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA' }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Urgency Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={urgencyChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {urgencyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Paging Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pagingChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pagingChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Security Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>Total Access</span>
                    <span className="font-bold" style={{ color: '#60A5FA' }}>{securityMetrics.totalAccessAttempts}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>Denied Access</span>
                    <span className="font-bold" style={{ color: '#F87171' }}>{securityMetrics.deniedAccess}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(securityMetrics.deniedAccess / securityMetrics.totalAccessAttempts * 100) || 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>Security Incidents</span>
                    <Badge style={{ backgroundColor: securityMetrics.criticalIncidents > 0 ? '#EF4444' : '#10B981', color: '#FFF' }}>
                      {securityMetrics.securityIncidents}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Top 10 Rule Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topRules} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="category" type="category" stroke="#9CA3AF" width={150} />
                  <Tooltip contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA' }} />
                  <Bar dataKey="count" fill="#60A5FA" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
              <CardTitle style={{ color: '#60A5FA' }}>Hospital Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hospitalPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#374151', border: '1px solid #60A5FA' }} />
                  <Legend />
                  <Bar dataKey="triages" fill="#60A5FA" name="Triages" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <Card style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle style={{ color: '#60A5FA' }}>System Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: '#9CA3AF' }}>Total Hospitals</p>
                <p className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{hospitals.length}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: '#9CA3AF' }}>Active Rules</p>
                <p className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{triageRules.filter(r => r.status === 'active').length}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: '#9CA3AF' }}>Total Pages Sent</p>
                <p className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{totalPages}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: '#9CA3AF' }}>AI Corrections</p>
                <p className="text-2xl font-bold" style={{ color: '#60A5FA' }}>{aiCorrections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}