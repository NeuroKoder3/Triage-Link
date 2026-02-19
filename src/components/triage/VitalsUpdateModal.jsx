import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function VitalsUpdateModal({ triageLog, onSubmit, onClose }) {
  const [vitals, setVitals] = useState({
    temperature: "",
    blood_pressure_systolic: "",
    blood_pressure_diastolic: "",
    heart_rate: "",
    respiratory_rate: "",
    oxygen_saturation: "",
    weight: "",
    pain_level: "",
    additional_symptoms: "",
    notes: ""
  });

  const handleSubmit = () => {
    // Convert string inputs to numbers where applicable
    const processedVitals = {
      ...vitals,
      temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
      blood_pressure_systolic: vitals.blood_pressure_systolic ? parseInt(vitals.blood_pressure_systolic) : undefined,
      blood_pressure_diastolic: vitals.blood_pressure_diastolic ? parseInt(vitals.blood_pressure_diastolic) : undefined,
      heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : undefined,
      respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : undefined,
      oxygen_saturation: vitals.oxygen_saturation ? parseFloat(vitals.oxygen_saturation) : undefined,
      weight: vitals.weight ? parseFloat(vitals.weight) : undefined,
      pain_level: vitals.pain_level ? parseInt(vitals.pain_level) : undefined
    };

    onSubmit(processedVitals);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Activity className="w-5 h-5" />
              Update Patient Vitals & Symptoms
            </CardTitle>
            <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
              Adding new vitals will trigger automatic AI re-analysis
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Vital Signs Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label style={{ color: '#60A5FA' }}>Temperature (°F)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                  placeholder="98.6"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                />
              </div>

              <div>
                <Label style={{ color: '#60A5FA' }}>Blood Pressure</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={vitals.blood_pressure_systolic}
                    onChange={(e) => setVitals({...vitals, blood_pressure_systolic: e.target.value})}
                    placeholder="120"
                    style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                  />
                  <span className="text-2xl" style={{ color: '#60A5FA' }}>/</span>
                  <Input
                    type="number"
                    value={vitals.blood_pressure_diastolic}
                    onChange={(e) => setVitals({...vitals, blood_pressure_diastolic: e.target.value})}
                    placeholder="80"
                    style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                  />
                </div>
              </div>

              <div>
                <Label style={{ color: '#60A5FA' }}>Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  value={vitals.heart_rate}
                  onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})}
                  placeholder="72"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                />
              </div>

              <div>
                <Label style={{ color: '#60A5FA' }}>Respiratory Rate (breaths/min)</Label>
                <Input
                  type="number"
                  value={vitals.respiratory_rate}
                  onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})}
                  placeholder="16"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                />
              </div>

              <div>
                <Label style={{ color: '#60A5FA' }}>Oxygen Saturation (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={vitals.oxygen_saturation}
                  onChange={(e) => setVitals({...vitals, oxygen_saturation: e.target.value})}
                  placeholder="98"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                />
              </div>

              <div>
                <Label style={{ color: '#60A5FA' }}>Weight (lbs)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={vitals.weight}
                  onChange={(e) => setVitals({...vitals, weight: e.target.value})}
                  placeholder="150"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                />
              </div>

              <div>
                <Label style={{ color: '#60A5FA' }}>Pain Level (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={vitals.pain_level}
                  onChange={(e) => setVitals({...vitals, pain_level: e.target.value})}
                  placeholder="5"
                  style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                />
              </div>
            </div>

            {/* Additional Symptoms */}
            <div>
              <Label style={{ color: '#60A5FA' }}>New or Updated Symptoms</Label>
              <Textarea
                value={vitals.additional_symptoms}
                onChange={(e) => setVitals({...vitals, additional_symptoms: e.target.value})}
                placeholder="Describe any new symptoms or changes since initial complaint..."
                rows={3}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
            </div>

            {/* Clinical Notes */}
            <div>
              <Label style={{ color: '#60A5FA' }}>Clinical Notes</Label>
              <Textarea
                value={vitals.notes}
                onChange={(e) => setVitals({...vitals, notes: e.target.value})}
                placeholder="Additional clinical observations..."
                rows={3}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
            </div>

            {/* Re-analysis Notice */}
            <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1E3A8A', borderColor: '#60A5FA' }}>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-5 h-5 mt-0.5" style={{ color: '#60A5FA' }} />
                <div>
                  <p className="font-semibold mb-1" style={{ color: '#60A5FA' }}>
                    Automatic AI Re-Analysis
                  </p>
                  <p className="text-sm" style={{ color: '#93C5FD' }}>
                    Once you submit these vitals, the AI will automatically re-analyze the case with the new data and provide updated recommendations.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                style={{ backgroundColor: '#60A5FA', color: '#000000' }}
              >
                Submit & Trigger Re-Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}