import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ReportCharts({ data }) {
  if (!data) return null;

  const {
    volumeOverTime = [],
    callsByHospital = [],
    urgencyDistribution = [],
    responseTimesByUrgency = [],
    aiMetrics = {}
  } = data;

  return (
    <div className="space-y-6">
      {/* Call Volume Over Time */}
      {volumeOverTime.length > 0 && (
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle style={{ color: '#60A5FA' }}>Call Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                <XAxis dataKey="date" tick={{ fill: '#60A5FA' }} />
                <YAxis tick={{ fill: '#60A5FA' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="#60A5FA" strokeWidth={3} name="Patient Calls" />
                <Line type="monotone" dataKey="consultations" stroke="#10B981" strokeWidth={3} name="Consultations" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Calls by Hospital */}
      {callsByHospital.length > 0 && (
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle style={{ color: '#60A5FA' }}>Calls by Hospital</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={callsByHospital}>
                <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                <XAxis dataKey="name" tick={{ fill: '#60A5FA' }} />
                <YAxis tick={{ fill: '#60A5FA' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#60A5FA" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Urgency Distribution */}
      {urgencyDistribution.length > 0 && (
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle style={{ color: '#60A5FA' }}>Urgency Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={urgencyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                <XAxis dataKey="name" tick={{ fill: '#60A5FA' }} />
                <YAxis tick={{ fill: '#60A5FA' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Response Times by Urgency */}
      {responseTimesByUrgency.length > 0 && (
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle style={{ color: '#60A5FA' }}>Response Times by Urgency</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseTimesByUrgency}>
                <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                <XAxis dataKey="urgency" tick={{ fill: '#60A5FA' }} />
                <YAxis tick={{ fill: '#60A5FA' }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#60A5FA' }} />
                <Tooltip />
                <Bar dataKey="avgTime" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestion Metrics */}
      {aiMetrics && (
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle style={{ color: '#60A5FA' }}>AI Suggestion Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#10B981' }}>
                  {aiMetrics.accepted || 0}
                </div>
                <p style={{ color: '#60A5FA' }}>Accepted</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF4444' }}>
                  {aiMetrics.overridden || 0}
                </div>
                <p style={{ color: '#60A5FA' }}>Overridden</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#60A5FA' }}>
                  {aiMetrics.avgConfidence || 0}%
                </div>
                <p style={{ color: '#60A5FA' }}>Avg Confidence</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}