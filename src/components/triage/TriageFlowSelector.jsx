import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles } from "lucide-react";

export default function TriageFlowSelector({
  hospitals,
  selectedHospital,
  setSelectedHospital,
  selectedShift,
  setSelectedShift,
  selectedCallerType,
  setSelectedCallerType,
  selectedPatientType,
  setSelectedPatientType,
  selectedOrganType,
  setSelectedOrganType,
  complaintMessage,
  setComplaintMessage,
  onAnalyze,
  isAnalyzing
}) {
  const isStepComplete = (step) => {
    if (step === 1) return !!selectedHospital;
    if (step === 2) return !!selectedShift;
    if (step === 3) return !!selectedCallerType;
    if (step === 4) return !!selectedPatientType;
    if (step === 5) return !!selectedOrganType;
    return false;
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
          <Sparkles className="w-5 h-5" style={{ color: '#60A5FA' }} />
          Patient Triage Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Step 1: Hospital Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {isStepComplete(1) ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#60A5FA', color: '#000000' }}>
                <span className="text-xs font-bold">1</span>
              </div>
            )}
            <Label className="text-lg font-semibold" style={{ color: '#60A5FA' }}>
              Select Hospital
            </Label>
          </div>
          <Select value={selectedHospital} onValueChange={setSelectedHospital}>
            <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
              <SelectValue placeholder="Choose a hospital..." />
            </SelectTrigger>
            <SelectContent>
              {hospitals.map((hospital) => (
                <SelectItem key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

          {/* Step 2: Shift */}
          <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {isStepComplete(2) ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedHospital ? '#60A5FA' : '#6B7280', color: '#000000' }}>
                <span className="text-xs font-bold">2</span>
              </div>
            )}
            <Label className="text-lg font-semibold" style={{ color: '#60A5FA' }}>
              Shift
            </Label>
          </div>
          <Select 
            value={selectedShift} 
            onValueChange={setSelectedShift}
            disabled={!selectedHospital}
          >
            <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
              <SelectValue placeholder="Select shift..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="business-hours">Business Hours</SelectItem>
              <SelectItem value="after-hours">After Business Hours/Weekends</SelectItem>
              <SelectItem value="all-hours">All Hours</SelectItem>
            </SelectContent>
          </Select>
          </div>

          {/* Step 3: Caller Type */}
          <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {isStepComplete(3) ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedShift ? '#60A5FA' : '#6B7280', color: '#000000' }}>
                <span className="text-xs font-bold">3</span>
              </div>
            )}
            <Label className="text-lg font-semibold" style={{ color: '#60A5FA' }}>
              Caller Type
            </Label>
          </div>
          <Select 
            value={selectedCallerType} 
            onValueChange={setSelectedCallerType}
            disabled={!selectedShift}
          >
            <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
              <SelectValue placeholder="Select caller type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patient-family">Patient/Family Member</SelectItem>
              <SelectItem value="labs">Labs</SelectItem>
              <SelectItem value="pharmacy">Pharmacy</SelectItem>
              <SelectItem value="outside-provider">Outside Provider</SelectItem>
              <SelectItem value="md-consult">MD to MD Consult</SelectItem>
              <SelectItem value="administrative-call">Administrative Call</SelectItem>
              <SelectItem value="living-donor">Living Donor</SelectItem>
              <SelectItem value="opo">OPO</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="unknown-patient">Unknown Patient</SelectItem>
              <SelectItem value="yale-lab">Yale Lab</SelectItem>
              <SelectItem value="ucsf-emergency">UCSF Emergency Department</SelectItem>
              <SelectItem value="outside-provider-kaiser">Outside Provider (Kaiser Hawaii)</SelectItem>
            </SelectContent>
          </Select>
          </div>

          {/* Step 4: Patient Type */}
          <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {isStepComplete(4) ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedCallerType ? '#60A5FA' : '#6B7280', color: '#000000' }}>
                <span className="text-xs font-bold">4</span>
              </div>
            )}
            <Label className="text-lg font-semibold" style={{ color: '#60A5FA' }}>
              Patient Type
            </Label>
          </div>
          <Select 
            value={selectedPatientType} 
            onValueChange={setSelectedPatientType}
            disabled={!selectedCallerType}
          >
            <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
              <SelectValue placeholder="Select patient type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pre-transplant">Pre-Transplant</SelectItem>
              <SelectItem value="post-transplant">Post-Transplant</SelectItem>
              <SelectItem value="non-transplant">Non-Transplant</SelectItem>
              <SelectItem value="abdominal-surgery">Abdominal Surgery</SelectItem>
              <SelectItem value="hepatology">Hepatology</SelectItem>
              <SelectItem value="pd-catheter">PD Catheter</SelectItem>
              <SelectItem value="unknown-pre-post">Unknown Pre or Post</SelectItem>
              <SelectItem value="living-donors">Living Donors</SelectItem>
              <SelectItem value="pediatric-pre-post">Pediatric Pre and Post</SelectItem>
              <SelectItem value="pediatric-heart">Pediatric Heart</SelectItem>
            </SelectContent>
          </Select>
          </div>

          {/* Step 5: Organ Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            {isStepComplete(3) ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedPatientType ? '#60A5FA' : '#6B7280', color: '#000000' }}>
                <span className="text-xs font-bold">3</span>
              </div>
            )}
            <Label className="text-lg font-semibold" style={{ color: '#60A5FA' }}>
              Organ Type
            </Label>
          </div>
          <Select 
            value={selectedOrganType} 
            onValueChange={setSelectedOrganType}
            disabled={!selectedPatientType}
          >
            <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
              <SelectValue placeholder="Select organ type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kidney">Kidney</SelectItem>
              <SelectItem value="liver">Liver</SelectItem>
              <SelectItem value="kidney-pancreas">Kidney & Pancreas</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="heart">Heart</SelectItem>
              <SelectItem value="non-transplant">Non Transplant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Step 4: Complaint */}
        <div className="space-y-2">
          <Label className="text-lg font-semibold" style={{ color: '#60A5FA' }}>
            Patient Complaint
          </Label>
          <Textarea
            placeholder="Describe the patient's complaint in detail..."
            value={complaintMessage}
            onChange={(e) => setComplaintMessage(e.target.value)}
            disabled={!selectedOrganType}
            className="border min-h-32"
            style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}
          />
        </div>

        {/* Analyze Button */}
        <Button
          onClick={onAnalyze}
          disabled={!complaintMessage.trim() || isAnalyzing}
          className="w-full font-semibold text-lg py-6"
          style={{ backgroundColor: '#60A5FA', color: '#000000' }}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-spin" />
              Analyzing with AI...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Analyze with AI
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}