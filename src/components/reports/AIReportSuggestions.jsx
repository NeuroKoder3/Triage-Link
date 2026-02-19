import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Clock, Target, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";

export default function AIReportSuggestions({ onGenerateReport }) {
  const queryClient = useQueryClient();

  const { data: suggestions = [] } = useQuery({
    queryKey: ['aiReportSuggestions'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.AIReportSuggestion.filter({ 
        status: 'active',
        created_for_user: user.email 
      }, '-priority', 5);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => appClient.entities.AIReportSuggestion.update(id, { status: 'dismissed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiReportSuggestions'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (id) => appClient.entities.AIReportSuggestion.update(id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiReportSuggestions'] });
    },
  });

  const handleGenerate = (suggestion) => {
    generateMutation.mutate(suggestion.id);
    if (onGenerateReport) {
      onGenerateReport(suggestion.suggested_filters || {});
    }
  };

  const priorityConfig = {
    high: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444', icon: TrendingUp },
    medium: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B', icon: Target },
    low: { bg: '#DBEAFE', text: '#1E40AF', border: '#60A5FA', icon: Clock }
  };

  if (suggestions.length === 0) return null;

  return (
    <Card className="border mb-6" style={{ borderColor: '#8B5CF6' }}>
      <CardHeader className="border-b" style={{ borderColor: '#8B5CF6' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#000000' }}>
          <Sparkles className="w-5 h-5" style={{ color: '#8B5CF6' }} />
          AI Report Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <AnimatePresence>
          <div className="space-y-3">
            {suggestions.map((suggestion) => {
              const config = priorityConfig[suggestion.priority];
              const Icon = config.icon;

              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: '#F9FAFB',
                    borderColor: config.border 
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" style={{ color: config.text }} />
                        <h4 className="font-semibold" style={{ color: '#000000' }}>
                          {suggestion.report_title}
                        </h4>
                        <Badge 
                          className="text-xs"
                          style={{ 
                            backgroundColor: config.bg,
                            color: config.text 
                          }}
                        >
                          {suggestion.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2" style={{ color: '#000000' }}>
                        {suggestion.description}
                      </p>
                      <div className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: '#F5F3FF' }}>
                        <Sparkles className="w-3 h-3 mt-0.5" style={{ color: '#8B5CF6' }} />
                        <p className="text-xs" style={{ color: '#000000' }}>
                          <strong>Why:</strong> {suggestion.ai_reasoning}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dismissMutation.mutate(suggestion.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleGenerate(suggestion)}
                      className="text-white"
                      style={{ backgroundColor: '#8B5CF6' }}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Generate This Report
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}