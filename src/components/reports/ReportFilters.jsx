
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, Download, RefreshCw, Calendar } from "lucide-react";

export default function ReportFilters({
  filters,
  onFilterChange,
  hospitals,
  onGenerate,
  onExport,
  isLoading,
  onSchedule
}) {
  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
          <Filter className="w-5 h-5" style={{ color: '#60A5FA' }} />
          Report Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Date Range */}
            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
                className="border"
                style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
                className="border"
                style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}
              />
            </div>

            {/* Hospital Filter */}
            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Hospital</Label>
              <Select
                value={filters.hospitalId}
                onValueChange={(value) => onFilterChange('hospitalId', value)}
              >
                <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
                  <SelectValue placeholder="All Hospitals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hospitals</SelectItem>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Patient Type Filter */}
            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Patient Type</Label>
              <Select
                value={filters.patientType}
                onValueChange={(value) => onFilterChange('patientType', value)}
              >
                <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pre-transplant">Pre-Transplant</SelectItem>
                  <SelectItem value="post-transplant">Post-Transplant</SelectItem>
                  <SelectItem value="non-transplant">Non-Transplant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgency Level Filter */}
            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Urgency Level</Label>
              <Select
                value={filters.urgencyLevel}
                onValueChange={(value) => onFilterChange('urgencyLevel', value)}
              >
                <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Report Type</Label>
              <Select
                value={filters.reportType}
                onValueChange={(value) => onFilterChange('reportType', value)}
              >
                <SelectTrigger className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', color: '#60A5FA' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="patient">Patient Calls Only</SelectItem>
                  <SelectItem value="consultation">MD Consultations Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onGenerate}
              disabled={isLoading}
              className="flex-1"
              style={{ backgroundColor: '#60A5FA', color: '#000000' }}
            >
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
            <Button
              onClick={onExport}
              disabled={isLoading}
              variant="outline"
              style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
            >
              Export CSV
            </Button>
            {onSchedule && (
              <Button
                onClick={onSchedule}
                variant="outline"
                style={{ borderColor: '#8B5CF6', color: '#8B5CF6' }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
