import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Mail, X } from "lucide-react";
import { appClient } from "@/api/appClient";

export default function ScheduleReportModal({ isOpen, onClose, currentFilters, onScheduled }) {
  const [reportName, setReportName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [deliveryDay, setDeliveryDay] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [includeAiInsights, setIncludeAiInsights] = useState(true);
  const [format, setFormat] = useState("email_summary");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await appClient.auth.me();
        if (user.email && recipients.length === 0) {
          setRecipients([user.email]);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

  const handleAddRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient("");
    }
  };

  const handleRemoveRecipient = (email) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const calculateNextGeneration = () => {
    const now = new Date();
    const [hours, minutes] = deliveryTime.split(':');
    const next = new Date(now);
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (frequency === 'daily') {
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    } else if (frequency === 'weekly') {
      const targetDay = parseInt(deliveryDay);
      const currentDay = next.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7;
      }
      next.setDate(next.getDate() + daysUntil);
    } else if (frequency === 'biweekly') {
      const targetDay = parseInt(deliveryDay);
      const currentDay = next.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 14;
      } else {
        daysUntil += 14;
      }
      next.setDate(next.getDate() + daysUntil);
    } else if (frequency === 'monthly') {
      const targetDate = parseInt(deliveryDay);
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next.toISOString();
  };

  const handleSave = async () => {
    if (!reportName.trim() || recipients.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const user = await appClient.auth.me();
      
      const scheduleData = {
        report_name: reportName,
        report_type: currentFilters.reportType || 'all',
        frequency,
        delivery_day: deliveryDay,
        delivery_time: deliveryTime,
        filter_config: currentFilters,
        recipients,
        include_ai_insights: includeAiInsights,
        format,
        next_generation: calculateNextGeneration(),
        status: 'active',
        created_by_name: user.full_name || user.email
      };

      await appClient.entities.ScheduledReport.create(scheduleData);
      
      if (onScheduled) {
        onScheduled();
      }
      
      handleClose();
    } catch (error) {
      console.error("Error scheduling report:", error);
    }

    setIsSaving(false);
  };

  const handleClose = () => {
    setReportName("");
    setFrequency("weekly");
    setDeliveryDay("");
    setDeliveryTime("09:00");
    setNewRecipient("");
    setIncludeAiInsights(true);
    setFormat("email_summary");
    onClose();
  };

  const weekDays = [
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" style={{ backgroundColor: '#374151', borderColor: '#60A5FA' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#60A5FA' }}>
            <Calendar className="inline-block w-5 h-5 mr-2" />
            Schedule Recurring Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Report Name */}
          <div className="space-y-2">
            <Label style={{ color: '#60A5FA' }}>Report Name</Label>
            <Input
              placeholder="e.g., Weekly Triage Performance Report"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
            />
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency !== 'daily' && (
              <div className="space-y-2">
                <Label style={{ color: '#60A5FA' }}>
                  {frequency === 'monthly' ? 'Day of Month' : 'Day of Week'}
                </Label>
                {frequency === 'monthly' ? (
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    placeholder="1-28"
                    value={deliveryDay}
                    onChange={(e) => setDeliveryDay(e.target.value)}
                    style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                  />
                ) : (
                  <Select value={deliveryDay} onValueChange={setDeliveryDay}>
                    <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map(day => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Delivery Time */}
          <div className="space-y-2">
            <Label style={{ color: '#60A5FA' }}>
              <Clock className="inline-block w-4 h-4 mr-1" />
              Delivery Time
            </Label>
            <Input
              type="time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
            />
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <Label style={{ color: '#60A5FA' }}>
              <Mail className="inline-block w-4 h-4 mr-1" />
              Recipients
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
              <Button
                type="button"
                onClick={handleAddRecipient}
                style={{ backgroundColor: '#60A5FA', color: '#000000' }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {recipients.map((email) => (
                <Badge
                  key={email}
                  className="flex items-center gap-1"
                  style={{ backgroundColor: '#4B5563', color: '#60A5FA', borderColor: '#60A5FA' }}
                >
                  {email}
                  <button
                    onClick={() => handleRemoveRecipient(email)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label style={{ color: '#60A5FA' }}>Report Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email_summary">Email Summary</SelectItem>
                <SelectItem value="pdf">PDF Attachment</SelectItem>
                <SelectItem value="csv">CSV Data Export</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="ai-insights"
              checked={includeAiInsights}
              onCheckedChange={setIncludeAiInsights}
            />
            <label
              htmlFor="ai-insights"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              style={{ color: '#60A5FA' }}
            >
              Include AI-generated insights and trend analysis
            </label>
          </div>

          {/* Current Filters Preview */}
          <div className="p-3 rounded-lg border" style={{ backgroundColor: '#4B5563', borderColor: '#60A5FA' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#60A5FA' }}>
              Report will use current filters:
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge style={{ backgroundColor: '#1F2937', color: '#60A5FA' }}>
                {currentFilters.startDate} to {currentFilters.endDate}
              </Badge>
              {currentFilters.hospitalId !== 'all' && (
                <Badge style={{ backgroundColor: '#1F2937', color: '#60A5FA' }}>
                  Hospital: {currentFilters.hospitalId}
                </Badge>
              )}
              {currentFilters.reportType !== 'all' && (
                <Badge style={{ backgroundColor: '#1F2937', color: '#60A5FA' }}>
                  Type: {currentFilters.reportType}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !reportName.trim() || recipients.length === 0}
            style={{ backgroundColor: '#60A5FA', color: '#000000' }}
          >
            {isSaving ? "Scheduling..." : "Schedule Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}