import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { appClient } from "@/api/appClient";

export default function NaturalLanguageReport({ onReportGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const examplePrompts = [
    "Compare AI accuracy between pre-transplant and post-transplant patients this month",
    "What are the average response times for urgent consultations by hospital?",
    "Show me the top 5 complaint categories that required the most overrides"
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResult(null);

    try {
      // Get all necessary data
      const [logs, consultations, corrections, hospitals] = await Promise.all([
        appClient.entities.TriageLog.list('-created_date'),
        appClient.entities.MDConsultation.list('-created_date'),
        appClient.entities.AICorrection.list('-created_date'),
        appClient.entities.Hospital.list()
      ]);

      // Use AI to interpret the prompt and generate filters
      const aiResponse = await appClient.integrations.Core.InvokeLLM({
        prompt: `You are a medical triage data analyst. A user has requested a custom report with this natural language query:

"${prompt}"

Available data context:
- We have ${logs.length} triage logs
- We have ${consultations.length} MD consultations
- We have ${corrections.length} AI corrections
- Available hospitals: ${hospitals.map(h => h.name).join(', ')}

TASK:
1. Interpret what data they want to see
2. Determine appropriate date range (if mentioned)
3. Identify filters needed (hospital, patient type, organ type, urgency, etc.)
4. Suggest what metrics or visualizations would answer their question
5. Provide a clear report title

Be specific about date ranges - convert relative dates like "last quarter", "this month" to actual dates.`,
        response_json_schema: {
          type: "object",
          properties: {
            report_title: {
              type: "string",
              description: "Clear title for this custom report"
            },
            interpretation: {
              type: "string",
              description: "What the user is asking for in clear terms"
            },
            date_range: {
              type: "object",
              properties: {
                start_date: { type: "string" },
                end_date: { type: "string" }
              },
              description: "Suggested date range"
            },
            filters: {
              type: "object",
              description: "Filters to apply (hospital_id, patient_type, organ_type, etc.)"
            },
            metrics_to_show: {
              type: "array",
              items: { type: "string" },
              description: "Key metrics to calculate"
            },
            visualization_suggestions: {
              type: "array",
              items: { type: "string" },
              description: "Recommended chart types"
            }
          },
          required: ["report_title", "interpretation", "metrics_to_show"]
        }
      });

      // Apply filters to data
      let filteredLogs = logs;
      let filteredConsultations = consultations;

      // Date filtering
      if (aiResponse.date_range?.start_date && aiResponse.date_range?.end_date) {
        const start = new Date(aiResponse.date_range.start_date);
        const end = new Date(aiResponse.date_range.end_date);
        
        filteredLogs = logs.filter(l => {
          const date = new Date(l.created_date);
          return date >= start && date <= end;
        });
        
        filteredConsultations = consultations.filter(c => {
          const date = new Date(c.created_date);
          return date >= start && date <= end;
        });
      }

      // Apply additional filters
      if (aiResponse.filters) {
        if (aiResponse.filters.hospital_id) {
          filteredLogs = filteredLogs.filter(l => l.hospital_id === aiResponse.filters.hospital_id);
          filteredConsultations = filteredConsultations.filter(c => c.hospital_id === aiResponse.filters.hospital_id);
        }
        
        if (aiResponse.filters.hospital_name) {
          const hospitalMatch = hospitals.find(h => 
            h.name.toLowerCase().includes(aiResponse.filters.hospital_name.toLowerCase())
          );
          if (hospitalMatch) {
            filteredLogs = filteredLogs.filter(l => l.hospital_id === hospitalMatch.id);
            filteredConsultations = filteredConsultations.filter(c => c.hospital_id === hospitalMatch.id);
          }
        }

        if (aiResponse.filters.patient_type) {
          filteredLogs = filteredLogs.filter(l => l.patient_type === aiResponse.filters.patient_type);
          filteredConsultations = filteredConsultations.filter(c => c.patient_type === aiResponse.filters.patient_type);
        }

        if (aiResponse.filters.organ_type) {
          filteredLogs = filteredLogs.filter(l => l.organ_type === aiResponse.filters.organ_type);
          filteredConsultations = filteredConsultations.filter(c => c.organ_type === aiResponse.filters.organ_type);
        }
      }

      // Calculate metrics
      const totalCalls = filteredLogs.length + filteredConsultations.length;
      const avgDuration = totalCalls > 0
        ? [...filteredLogs, ...filteredConsultations].reduce((sum, item) => sum + (item.duration_seconds || 0), 0) / totalCalls
        : 0;

      // Call volume by date
      const volumeByDate = {};
      [...filteredLogs, ...filteredConsultations].forEach(item => {
        const date = new Date(item.created_date).toLocaleDateString();
        volumeByDate[date] = (volumeByDate[date] || 0) + 1;
      });

      // By hospital
      const byHospital = {};
      [...filteredLogs, ...filteredConsultations].forEach(item => {
        const name = item.hospital_name || 'Unknown';
        byHospital[name] = (byHospital[name] || 0) + 1;
      });

      setResult({
        ...aiResponse,
        data: {
          totalCalls,
          avgDuration: Math.round(avgDuration),
          filteredLogs: filteredLogs.length,
          filteredConsultations: filteredConsultations.length,
          volumeByDate,
          byHospital,
          dateRange: aiResponse.date_range
        }
      });

      // Pass to parent if needed
      if (onReportGenerated) {
        onReportGenerated(aiResponse.filters);
      }

    } catch (error) {
      console.error("Error generating custom report:", error);
      alert("Failed to generate report. Please try rephrasing your request.");
    }

    setIsGenerating(false);
  };

  return (
    <Card className="border" style={{ borderColor: '#8B5CF6' }}>
      <CardHeader className="border-b" style={{ borderColor: '#8B5CF6' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#000000' }}>
          <MessageSquare className="w-5 h-5" style={{ color: '#8B5CF6' }} />
          Ask for a Custom Report
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask for any report in plain English..."
              className="border min-h-24"
              style={{ borderColor: '#8B5CF6' }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
              Try these examples:
            </p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, index) => (
                <Badge
                  key={index}
                  className="cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full text-white font-semibold"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Custom Report
              </>
            )}
          </Button>

          {/* Results Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 p-4 rounded-lg border"
                style={{ borderColor: '#10B981', backgroundColor: '#F0FDF4' }}
              >
                <div className="flex items-start gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#10B981' }} />
                  <div>
                    <h3 className="font-semibold text-lg mb-1" style={{ color: '#000000' }}>
                      {result.report_title}
                    </h3>
                    <p className="text-sm mb-3" style={{ color: '#000000' }}>
                      {result.interpretation}
                    </p>
                  </div>
                </div>

                {result.data && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded" style={{ backgroundColor: '#FFFFFF' }}>
                        <div className="text-2xl font-bold" style={{ color: '#000000' }}>
                          {result.data.totalCalls}
                        </div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>Total Calls</div>
                      </div>
                      <div className="p-3 rounded" style={{ backgroundColor: '#FFFFFF' }}>
                        <div className="text-2xl font-bold" style={{ color: '#000000' }}>
                          {result.data.avgDuration}s
                        </div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>Avg Duration</div>
                      </div>
                      <div className="p-3 rounded" style={{ backgroundColor: '#FFFFFF' }}>
                        <div className="text-2xl font-bold" style={{ color: '#000000' }}>
                          {result.data.filteredLogs}
                        </div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>Patient Calls</div>
                      </div>
                      <div className="p-3 rounded" style={{ backgroundColor: '#FFFFFF' }}>
                        <div className="text-2xl font-bold" style={{ color: '#000000' }}>
                          {result.data.filteredConsultations}
                        </div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>Consultations</div>
                      </div>
                    </div>

                    {result.data.dateRange && (
                      <div className="text-sm" style={{ color: '#000000' }}>
                        <strong>Date Range:</strong> {result.data.dateRange.start_date} to {result.data.dateRange.end_date}
                      </div>
                    )}

                    <div className="mt-3">
                      <p className="text-sm font-semibold mb-2" style={{ color: '#000000' }}>
                        Recommended Metrics:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.metrics_to_show.map((metric, index) => (
                          <Badge key={index} style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {result.visualization_suggestions && result.visualization_suggestions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold mb-2" style={{ color: '#000000' }}>
                          Suggested Visualizations:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.visualization_suggestions.map((viz, index) => (
                            <Badge key={index} style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>
                              {viz}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}