import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Edit, Archive, Trash2, Search, Filter, CheckCircle, XCircle, Sparkles, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AIProtocolManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterHospital, setFilterHospital] = useState("all");
  const [filterPatientType, setFilterPatientType] = useState("all");
  const [filterOrganType, setFilterOrganType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showRefinements, setShowRefinements] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refinementSuggestions, setRefinementSuggestions] = useState(null);
  const [showDatabaseExport, setShowDatabaseExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    hospital_id: "",
    triage_level: "urgent",
    shift: "all-hours",
    caller_type: "any",
    patient_type: "post-transplant",
    organ_type: "kidney",
    complaint_category: "",
    trigger_criteria: "",
    action_required: "",
    contact_method: "secure_page",
    contact_info: "",
    escalation_path: "",
    documentation_notes: "",
    patient_education: "",
    priority: "urgent",
    time_sensitivity: "",
    status: "active"
  });

  const queryClient = useQueryClient();

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.list(),
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['triageRules'],
    queryFn: () => appClient.entities.TriageRule.list('-created_date'),
  });

  const { data: aiFeedback = [] } = useQuery({
    queryKey: ['aiFeedback'],
    queryFn: () => appClient.entities.AIFeedback.list('-created_date', 100),
  });

  const { data: aiCorrections = [] } = useQuery({
    queryKey: ['aiCorrections'],
    queryFn: () => appClient.entities.AICorrection.list('-created_date', 100),
  });

  const { data: triageLogs = [] } = useQuery({
    queryKey: ['triageLogsForAnalysis'],
    queryFn: () => appClient.entities.TriageLog.list('-created_date', 200),
  });

  const createRuleMutation = useMutation({
    mutationFn: (ruleData) => appClient.entities.TriageRule.create(ruleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
      resetForm();
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.TriageRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
      resetForm();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => appClient.entities.TriageRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
    },
  });

  const filteredRules = rules.filter(rule => {
    const matchesSearch = searchTerm === "" || 
      rule.complaint_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.trigger_criteria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.action_required?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesHospital = filterHospital === "all" || rule.hospital_id === filterHospital;
    const matchesPatient = filterPatientType === "all" || rule.patient_type === filterPatientType;
    const matchesOrgan = filterOrganType === "all" || rule.organ_type === filterOrganType;
    const matchesStatus = filterStatus === "all" || rule.status === filterStatus;

    return matchesSearch && matchesHospital && matchesPatient && matchesOrgan && matchesStatus;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData(rule);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleArchive = (rule) => {
    if (window.confirm(`Archive rule "${rule.complaint_category}"?`)) {
      updateRuleMutation.mutate({ 
        id: rule.id, 
        data: { ...rule, status: 'inactive' } 
      });
    }
  };

  const handleDelete = (rule) => {
    if (window.confirm(`Permanently delete rule "${rule.complaint_category}"? This cannot be undone.`)) {
      deleteRuleMutation.mutate(rule.id);
    }
  };

  const resetForm = () => {
    setFormData({
      hospital_id: "",
      triage_level: "urgent",
      shift: "all-hours",
      caller_type: "any",
      patient_type: "post-transplant",
      organ_type: "kidney",
      complaint_category: "",
      trigger_criteria: "",
      action_required: "",
      contact_method: "secure_page",
      contact_info: "",
      escalation_path: "",
      documentation_notes: "",
      patient_education: "",
      priority: "urgent",
      time_sensitivity: "",
      status: "active"
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const analyzeProtocolRefinements = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze feedback patterns
      const lowRatingFeedback = aiFeedback.filter(f => f.accuracy_rating < 4);
      const frequentCorrections = aiCorrections.reduce((acc, corr) => {
        const key = `${corr.hospital_id}-${corr.patient_type}-${corr.organ_type}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      // Identify cases without matching rules
      const casesWithoutRules = triageLogs.filter(log => 
        log.rule_id === 'GENERAL_PROTOCOL' || !log.rule_id
      );

      // Group by complaint patterns
      const complaintPatterns = {};
      casesWithoutRules.forEach(log => {
        const key = `${log.hospital_id}-${log.patient_type}-${log.organ_type}-${log.complaint_category}`;
        if (!complaintPatterns[key]) {
          complaintPatterns[key] = { count: 0, examples: [], log };
        }
        complaintPatterns[key].count++;
        if (complaintPatterns[key].examples.length < 3) {
          complaintPatterns[key].examples.push(log.coordinator_notes?.substring(0, 100));
        }
      });

      const frequentGaps = Object.entries(complaintPatterns)
        .filter(([_, data]) => data.count >= 3)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      // Identify conflicting rules
      const rulesByContext = {};
      rules.forEach(rule => {
        const key = `${rule.hospital_id}-${rule.patient_type}-${rule.organ_type}`;
        if (!rulesByContext[key]) rulesByContext[key] = [];
        rulesByContext[key].push(rule);
      });

      const potentialConflicts = Object.entries(rulesByContext)
        .filter(([_, contextRules]) => contextRules.length > 5)
        .map(([key, contextRules]) => ({
          context: key,
          rules: contextRules,
          count: contextRules.length
        }));

      const prompt = `You are an AI protocol optimization expert analyzing triage system performance. Based on the following data, suggest protocol refinements:

FEEDBACK ANALYSIS:
- Total AI Feedback entries: ${aiFeedback.length}
- Low rating feedback (<4 stars): ${lowRatingFeedback.length}
- Total AI corrections: ${aiCorrections.length}
- Cases handled without specific rules: ${casesWithoutRules.length}

FREQUENT CORRECTION PATTERNS:
${Object.entries(frequentCorrections).slice(0, 5).map(([context, count]) => 
  `- Context ${context}: ${count} corrections`
).join('\n')}

COMMON COMPLAINTS WITHOUT CLEAR PROTOCOLS (${frequentGaps.length} identified):
${frequentGaps.map(([key, data]) => {
  const hospital = hospitals.find(h => h.id === data.log.hospital_id);
  return `- ${hospital?.name || 'Unknown'} | ${data.log.patient_type} | ${data.log.organ_type} | "${data.log.complaint_category}": ${data.count} cases
    Examples: ${data.examples.join(' | ')}`;
}).join('\n')}

LOW-RATED AI SUGGESTIONS (Sample of issues):
${lowRatingFeedback.slice(0, 5).map(f => 
  `- Rule ${f.ai_suggested_rule_id}: ${f.misclassification_type} - ${f.feedback_text?.substring(0, 100)}`
).join('\n')}

POTENTIAL PROTOCOL CONFLICTS:
${potentialConflicts.slice(0, 3).map(c => 
  `- ${c.context}: ${c.count} rules (may have overlapping or conflicting criteria)`
).join('\n')}

EXISTING RULES COUNT: ${rules.length}

Provide actionable recommendations including:
1. New protocol suggestions for frequent unhandled cases
2. Modifications to existing protocols based on correction patterns
3. Identification of ambiguous/conflicting protocols that need review`;

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            new_protocol_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  hospital_id: { type: "string" },
                  patient_type: { type: "string" },
                  organ_type: { type: "string" },
                  complaint_category: { type: "string" },
                  trigger_criteria: { type: "string" },
                  action_required: { type: "string" },
                  priority: { type: "string", enum: ["routine", "urgent", "emergency"] },
                  reasoning: { type: "string" },
                  case_count: { type: "number" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            protocol_modifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_id: { type: "string" },
                  field_to_modify: { type: "string" },
                  current_value: { type: "string" },
                  suggested_value: { type: "string" },
                  reasoning: { type: "string" },
                  based_on_corrections: { type: "number" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            ambiguous_protocols: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_ids: { type: "array", items: { type: "string" } },
                  conflict_description: { type: "string" },
                  recommended_action: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setRefinementSuggestions(result);
      setShowRefinements(true);
    } catch (error) {
      console.error('Protocol refinement analysis failed:', error);
      alert('Failed to analyze protocol refinements. Please try again.');
    }
    setIsAnalyzing(false);
  };

  const handleApproveNewProtocol = async (suggestion) => {
    if (window.confirm(`Create new protocol for "${suggestion.complaint_category}"?`)) {
      createRuleMutation.mutate({
        hospital_id: suggestion.hospital_id,
        patient_type: suggestion.patient_type,
        organ_type: suggestion.organ_type,
        complaint_category: suggestion.complaint_category,
        trigger_criteria: suggestion.trigger_criteria,
        action_required: suggestion.action_required,
        priority: suggestion.priority,
        triage_level: suggestion.priority === 'emergency' ? 'emergent' : suggestion.priority,
        contact_method: 'secure_page',
        shift: 'all-hours',
        caller_type: 'any',
        status: 'active'
      });
    }
  };

  const handleApproveModification = async (modification) => {
    const rule = rules.find(r => r.id === modification.rule_id);
    if (!rule) return;

    if (window.confirm(`Modify protocol "${rule.complaint_category}"?\n\n${modification.field_to_modify}:\nFrom: ${modification.current_value}\nTo: ${modification.suggested_value}`)) {
      updateRuleMutation.mutate({
        id: rule.id,
        data: {
          ...rule,
          [modification.field_to_modify]: modification.suggested_value
        }
      });
    }
  };

  const exportContactDatabase = async () => {
    setIsExporting(true);
    try {
      const user = await appClient.auth.me();
      if (user.role !== 'admin') {
        alert('Only administrators can export databases.');
        setIsExporting(false);
        return;
      }

      const contactDatabase = {
        title: "Transplant Centers Contact Information & Business Hours",
        version: "1.0",
        exported_date: new Date().toISOString(),
        exported_by: user.email,
        total_centers: hospitals.length,
        
        transplant_centers: hospitals.map(hospital => ({
          id: hospital.id,
          name: hospital.name,
          status: hospital.status,
          contact_information: {
            main_phone: hospital.contact_phone || "Not specified",
            secure_page_number: hospital.secure_page_number || "Not specified",
            location: hospital.location || "Not specified"
          },
          business_hours: {
            weekday_hours: "8:00 AM - 5:00 PM (verify locally)",
            after_hours: "5:00 PM - 8:00 AM",
            weekend_coverage: "24/7 on-call available",
            holiday_coverage: "24/7 on-call available"
          },
          special_notes: hospital.notes || "No special instructions",
          last_updated: hospital.updated_date
        }))
      };

      // JSON export
      const jsonBlob = new Blob([JSON.stringify(contactDatabase, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `transplant-centers-contact-database-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Text export
      let textContent = `${'═'.repeat(80)}\n`;
      textContent += `TRANSPLANT CENTERS CONTACT INFORMATION & BUSINESS HOURS\n`;
      textContent += `Exported: ${new Date().toLocaleString()}\n`;
      textContent += `Total Centers: ${hospitals.length}\n`;
      textContent += `${'═'.repeat(80)}\n\n`;

      hospitals.forEach((hospital, idx) => {
        textContent += `\n${idx + 1}. ${hospital.name}\n`;
        textContent += `${'─'.repeat(80)}\n`;
        textContent += `Status: ${hospital.status}\n\n`;
        textContent += `CONTACT INFORMATION:\n`;
        textContent += `  Main Phone: ${hospital.contact_phone || 'Not specified'}\n`;
        textContent += `  Secure Page: ${hospital.secure_page_number || 'Not specified'}\n`;
        textContent += `  Location: ${hospital.location || 'Not specified'}\n\n`;
        textContent += `BUSINESS HOURS:\n`;
        textContent += `  Weekday: 8:00 AM - 5:00 PM (verify locally)\n`;
        textContent += `  After Hours: 5:00 PM - 8:00 AM\n`;
        textContent += `  Weekends: 24/7 on-call available\n`;
        textContent += `  Holidays: 24/7 on-call available\n\n`;
        if (hospital.notes) {
          textContent += `SPECIAL NOTES:\n  ${hospital.notes}\n\n`;
        }
      });

      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);
      const textLink = document.createElement('a');
      textLink.href = textUrl;
      textLink.download = `transplant-centers-contact-database-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(textLink);
      textLink.click();
      document.body.removeChild(textLink);
      URL.revokeObjectURL(textUrl);

      alert('Contact information database exported successfully! (JSON + TXT)');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export contact database. Please try again.');
    }
    setIsExporting(false);
  };

  const exportCriteriaDatabase = async () => {
    setIsExporting(true);
    try {
      const user = await appClient.auth.me();
      if (user.role !== 'admin') {
        alert('Only administrators can export databases.');
        setIsExporting(false);
        return;
      }

      const allActiveRules = await appClient.entities.TriageRule.filter({ status: 'active' }, '-hospital_id');

      const criteriaDatabase = {
        title: "Transplant Centers Criteria Rules & Paging Instructions",
        version: "1.0",
        exported_date: new Date().toISOString(),
        exported_by: user.email,
        total_centers: hospitals.length,
        total_rules: allActiveRules.length,
        
        transplant_centers: hospitals.map(hospital => {
          const hospitalRules = allActiveRules.filter(r => r.hospital_id === hospital.id);
          
          return {
            id: hospital.id,
            name: hospital.name,
            total_rules: hospitalRules.length,
            
            rules_by_urgency: {
              emergent: hospitalRules.filter(r => r.triage_level === 'emergent').map(r => ({
                complaint_category: r.complaint_category,
                patient_type: r.patient_type,
                organ_type: r.organ_type,
                trigger_criteria: r.trigger_criteria,
                action_required: r.action_required,
                contact_method: r.contact_method,
                contact_info: r.contact_info,
                escalation_path: r.escalation_path,
                time_sensitivity: r.time_sensitivity,
                shift: r.shift,
                caller_type: r.caller_type
              })),
              always_urgent: hospitalRules.filter(r => r.triage_level === 'always_urgent').map(r => ({
                complaint_category: r.complaint_category,
                patient_type: r.patient_type,
                organ_type: r.organ_type,
                trigger_criteria: r.trigger_criteria,
                action_required: r.action_required,
                contact_method: r.contact_method,
                contact_info: r.contact_info,
                escalation_path: r.escalation_path,
                shift: r.shift
              })),
              urgent: hospitalRules.filter(r => r.triage_level === 'urgent').map(r => ({
                complaint_category: r.complaint_category,
                patient_type: r.patient_type,
                organ_type: r.organ_type,
                trigger_criteria: r.trigger_criteria,
                action_required: r.action_required,
                contact_method: r.contact_method,
                contact_info: r.contact_info,
                shift: r.shift
              })),
              non_urgent: hospitalRules.filter(r => r.triage_level === 'non-urgent').map(r => ({
                complaint_category: r.complaint_category,
                patient_type: r.patient_type,
                organ_type: r.organ_type,
                action_required: r.action_required,
                contact_method: r.contact_method
              })),
              education: hospitalRules.filter(r => r.triage_level === 'education').map(r => ({
                complaint_category: r.complaint_category,
                patient_type: r.patient_type,
                organ_type: r.organ_type,
                patient_education: r.patient_education
              }))
            },
            
            paging_instructions: {
              secure_page: hospital.secure_page_number || "Contact hospital main line",
              main_contact: hospital.contact_phone || "Not specified",
              general_escalation: hospital.notes || "Follow standard escalation protocols"
            }
          };
        })
      };

      // JSON export
      const jsonBlob = new Blob([JSON.stringify(criteriaDatabase, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `transplant-centers-criteria-paging-database-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Text export
      let textContent = `${'═'.repeat(80)}\n`;
      textContent += `TRANSPLANT CENTERS CRITERIA RULES & PAGING INSTRUCTIONS\n`;
      textContent += `Exported: ${new Date().toLocaleString()}\n`;
      textContent += `Total Centers: ${hospitals.length} | Total Rules: ${allActiveRules.length}\n`;
      textContent += `${'═'.repeat(80)}\n\n`;

      hospitals.forEach((hospital, idx) => {
        const hospitalRules = allActiveRules.filter(r => r.hospital_id === hospital.id);
        textContent += `\n${idx + 1}. ${hospital.name}\n`;
        textContent += `${'─'.repeat(80)}\n`;
        textContent += `Total Rules: ${hospitalRules.length}\n\n`;
        
        textContent += `PAGING INSTRUCTIONS:\n`;
        textContent += `  Secure Page: ${hospital.secure_page_number || 'Contact main line'}\n`;
        textContent += `  Main Contact: ${hospital.contact_phone || 'Not specified'}\n\n`;

        const emergent = hospitalRules.filter(r => r.triage_level === 'emergent');
        if (emergent.length > 0) {
          textContent += `┌─ EMERGENT CRITERIA (${emergent.length}) ─┐\n\n`;
          emergent.forEach((rule, i) => {
            textContent += `  ${i + 1}. ${rule.complaint_category}\n`;
            textContent += `     Patient: ${rule.patient_type} | Organ: ${rule.organ_type}\n`;
            textContent += `     Trigger: ${rule.trigger_criteria}\n`;
            textContent += `     Action: ${rule.action_required}\n`;
            textContent += `     Contact: ${rule.contact_method} ${rule.contact_info ? '- ' + rule.contact_info : ''}\n`;
            if (rule.escalation_path) textContent += `     Escalation: ${rule.escalation_path}\n`;
            textContent += `\n`;
          });
        }

        const alwaysUrgent = hospitalRules.filter(r => r.triage_level === 'always_urgent');
        if (alwaysUrgent.length > 0) {
          textContent += `┌─ ALWAYS URGENT (${alwaysUrgent.length}) ─┐\n\n`;
          alwaysUrgent.forEach((rule, i) => {
            textContent += `  ${i + 1}. ${rule.complaint_category}\n`;
            textContent += `     Patient: ${rule.patient_type} | Organ: ${rule.organ_type}\n`;
            textContent += `     Trigger: ${rule.trigger_criteria}\n`;
            textContent += `     Action: ${rule.action_required}\n`;
            textContent += `     Contact: ${rule.contact_method} ${rule.contact_info ? '- ' + rule.contact_info : ''}\n\n`;
          });
        }

        const nonUrgent = hospitalRules.filter(r => r.triage_level === 'non-urgent');
        if (nonUrgent.length > 0) {
          textContent += `┌─ NON-URGENT (${nonUrgent.length}) ─┐\n\n`;
          nonUrgent.forEach((rule, i) => {
            textContent += `  ${i + 1}. ${rule.complaint_category}\n`;
            textContent += `     Action: ${rule.action_required}\n\n`;
          });
        }

        textContent += `\n`;
      });

      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);
      const textLink = document.createElement('a');
      textLink.href = textUrl;
      textLink.download = `transplant-centers-criteria-paging-database-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(textLink);
      textLink.click();
      document.body.removeChild(textLink);
      URL.revokeObjectURL(textUrl);

      alert('Criteria & paging database exported successfully! (JSON + TXT)');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export criteria database. Please try again.');
    }
    setIsExporting(false);
  };

  const exportProtocolGuide = async () => {
    setIsExporting(true);
    try {
      const user = await appClient.auth.me();
      if (user.role !== 'admin') {
        alert('Only administrators can export protocol guides.');
        return;
      }

      // Fetch all active rules and hospitals
      const allRules = await appClient.entities.TriageRule.filter({ status: 'active' }, '-hospital_id');
      
      // Group rules by hospital
      const rulesByHospital = {};
      allRules.forEach(rule => {
        if (!rulesByHospital[rule.hospital_id]) {
          rulesByHospital[rule.hospital_id] = [];
        }
        rulesByHospital[rule.hospital_id].push(rule);
      });

      // Build comprehensive guide
      const protocolGuide = {
        title: "TriageLink Transplant Center Protocol & Paging Guide",
        version: "2.0",
        last_updated: new Date().toISOString(),
        exported_by: user.email,
        centers: hospitals.map(hospital => {
          const hospitalRules = rulesByHospital[hospital.id] || [];
          
          // Group rules by categories
          const emergentRules = hospitalRules.filter(r => r.triage_level === 'emergent');
          const alwaysUrgentRules = hospitalRules.filter(r => r.triage_level === 'always_urgent');
          const urgentRules = hospitalRules.filter(r => r.triage_level === 'urgent');
          const nonUrgentRules = hospitalRules.filter(r => r.triage_level === 'non-urgent');
          const educationRules = hospitalRules.filter(r => r.triage_level === 'education');
          
          // Group by patient type and organ type
          const byPatientType = {};
          hospitalRules.forEach(rule => {
            const key = `${rule.patient_type}-${rule.organ_type}`;
            if (!byPatientType[key]) byPatientType[key] = [];
            byPatientType[key].push(rule);
          });

          return {
            hospital_name: hospital.name,
            hospital_code: hospital.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 6),
            contact_information: {
              main_phone: hospital.contact_phone,
              secure_page: hospital.secure_page_number,
              location: hospital.location,
              status: hospital.status
            },
            business_hours: "8:00 AM - 5:00 PM (verify locally)",
            after_hours: "5:00 PM - 8:00 AM + Weekends",
            total_protocols: hospitalRules.length,
            
            protocols_by_urgency: {
              emergent: {
                count: emergentRules.length,
                description: "IMMEDIATE ACTION REQUIRED - Direct to ER and page provider",
                protocols: emergentRules.map(r => ({
                  complaint_category: r.complaint_category,
                  trigger_criteria: r.trigger_criteria,
                  action_required: r.action_required,
                  contact_method: r.contact_method,
                  contact_info: r.contact_info,
                  escalation_path: r.escalation_path,
                  patient_type: r.patient_type,
                  organ_type: r.organ_type,
                  shift: r.shift,
                  caller_type: r.caller_type,
                  time_sensitivity: r.time_sensitivity,
                  documentation_notes: r.documentation_notes
                }))
              },
              always_urgent: {
                count: alwaysUrgentRules.length,
                description: "REQUIRES PROMPT ATTENTION - Page provider immediately",
                protocols: alwaysUrgentRules.map(r => ({
                  complaint_category: r.complaint_category,
                  trigger_criteria: r.trigger_criteria,
                  action_required: r.action_required,
                  contact_method: r.contact_method,
                  contact_info: r.contact_info,
                  escalation_path: r.escalation_path,
                  patient_type: r.patient_type,
                  organ_type: r.organ_type,
                  shift: r.shift,
                  caller_type: r.caller_type,
                  time_sensitivity: r.time_sensitivity
                }))
              },
              urgent: {
                count: urgentRules.length,
                description: "URGENT - Contact provider within timeframe",
                protocols: urgentRules.map(r => ({
                  complaint_category: r.complaint_category,
                  trigger_criteria: r.trigger_criteria,
                  action_required: r.action_required,
                  contact_method: r.contact_method,
                  contact_info: r.contact_info,
                  patient_type: r.patient_type,
                  organ_type: r.organ_type,
                  shift: r.shift,
                  time_sensitivity: r.time_sensitivity
                }))
              },
              non_urgent: {
                count: nonUrgentRules.length,
                description: "NON-URGENT - Can wait until next business day",
                protocols: nonUrgentRules.map(r => ({
                  complaint_category: r.complaint_category,
                  trigger_criteria: r.trigger_criteria,
                  action_required: r.action_required,
                  contact_method: r.contact_method,
                  patient_type: r.patient_type,
                  organ_type: r.organ_type
                }))
              },
              patient_education: {
                count: educationRules.length,
                description: "EDUCATION ONLY - Provide information to caller",
                protocols: educationRules.map(r => ({
                  complaint_category: r.complaint_category,
                  patient_education: r.patient_education,
                  patient_type: r.patient_type,
                  organ_type: r.organ_type
                }))
              }
            },
            
            protocols_by_patient_organ_type: Object.entries(byPatientType).map(([key, protocols]) => {
              const [patientType, organType] = key.split('-');
              return {
                patient_type: patientType,
                organ_type: organType,
                total_protocols: protocols.length,
                protocols: protocols.map(p => ({
                  complaint_category: p.complaint_category,
                  triage_level: p.triage_level,
                  trigger_criteria: p.trigger_criteria,
                  action_required: p.action_required,
                  contact_method: p.contact_method,
                  contact_info: p.contact_info,
                  shift: p.shift
                }))
              };
            }),
            
            special_instructions: hospital.notes || "No special instructions documented"
          };
        }),
        
        general_guidelines: {
          emergent_criteria: [
            "Self-harm or suicide intent → Call 911, page provider",
            "Chest pain → Direct to ER, notify nephrologist/surgeon",
            "Severe shortness of breath → Direct to ER",
            "Inability to urinate → Direct to ER",
            "Uncontrolled pain → Direct to ER",
            "Vomiting unable to keep meds down → Direct to ER",
            "Fever >101.5°F → Direct to ER, notify provider",
            "Blood pressure >170/100 or <100/60 → Direct to ER",
            "Fresh blood in urine → Direct to ER",
            "GI bleeding → Direct to ER",
            "Signs of rejection → Immediate page"
          ],
          always_urgent_after_hours: [
            "Post-pancreas/SPK patients with ANY concern → Page surgeon",
            "Lab critical values → Page nephrologist",
            "Outside provider MD-to-MD calls → Page nephrologist",
            "ER department calls → Page nephrologist",
            "Burning/urgency/frequency urination → Page nephrologist",
            "Ran out of immunosuppressant meds → Email/page nephrologist"
          ],
          non_urgent: [
            "New medication from other MD (non-urgent)",
            "Missing medication from discharge (has enough until morning)",
            "Non-critical lab questions",
            "Nausea but keeping meds down",
            "Pre-transplant questions (non-urgent)",
            "Medication refills (has enough supply)"
          ],
          patient_education_responses: {
            missed_dose: "Take as soon as remember, don't double dose",
            grapefruit: "Avoid in future, no immediate action needed",
            cold_symptoms: "OK to use decongestants, avoid alcohol-based products, max 2000mg acetaminophen/day, no NSAIDs",
            otc_medications: "No ibuprofen/NSAIDs, max 2000mg Tylenol/day",
            dentist_antibiotics: "Not needed unless dentist deems necessary",
            fasting_for_labs: "Usually not needed, take meds after lab draw"
          }
        }
      };

      // Create formatted text version
      let textContent = `═══════════════════════════════════════════════════════════════
${protocolGuide.title}
Version ${protocolGuide.version} | Last Updated: ${new Date().toLocaleDateString()}
═══════════════════════════════════════════════════════════════

`;

      protocolGuide.centers.forEach((center, idx) => {
        textContent += `\n${'═'.repeat(70)}\n`;
        textContent += `${idx + 1}. ${center.hospital_name} (${center.hospital_code})\n`;
        textContent += `${'═'.repeat(70)}\n\n`;
        
        textContent += `CONTACT INFORMATION:\n`;
        textContent += `  Main Phone: ${center.contact_information.main_phone || 'Not specified'}\n`;
        textContent += `  Secure Page: ${center.contact_information.secure_page || 'Not specified'}\n`;
        textContent += `  Location: ${center.contact_information.location || 'Not specified'}\n`;
        textContent += `  Business Hours: ${center.business_hours}\n`;
        textContent += `  After Hours: ${center.after_hours}\n`;
        textContent += `  Total Protocols: ${center.total_protocols}\n\n`;

        // EMERGENT
        if (center.protocols_by_urgency.emergent.count > 0) {
          textContent += `┌─ EMERGENT PROTOCOLS (${center.protocols_by_urgency.emergent.count}) ─┐\n`;
          textContent += `│ ${center.protocols_by_urgency.emergent.description}\n`;
          textContent += `└${'─'.repeat(68)}┘\n\n`;
          
          center.protocols_by_urgency.emergent.protocols.forEach((p, i) => {
            textContent += `  ${i + 1}. ${p.complaint_category}\n`;
            textContent += `     Patient: ${p.patient_type} | Organ: ${p.organ_type} | Shift: ${p.shift}\n`;
            textContent += `     Trigger: ${p.trigger_criteria}\n`;
            textContent += `     Action: ${p.action_required}\n`;
            textContent += `     Contact: ${p.contact_method} - ${p.contact_info || 'See hospital contact info'}\n`;
            if (p.escalation_path) textContent += `     Escalation: ${p.escalation_path}\n`;
            textContent += `\n`;
          });
        }

        // ALWAYS URGENT
        if (center.protocols_by_urgency.always_urgent.count > 0) {
          textContent += `┌─ ALWAYS URGENT PROTOCOLS (${center.protocols_by_urgency.always_urgent.count}) ─┐\n`;
          textContent += `│ ${center.protocols_by_urgency.always_urgent.description}\n`;
          textContent += `└${'─'.repeat(68)}┘\n\n`;
          
          center.protocols_by_urgency.always_urgent.protocols.forEach((p, i) => {
            textContent += `  ${i + 1}. ${p.complaint_category}\n`;
            textContent += `     Patient: ${p.patient_type} | Organ: ${p.organ_type} | Shift: ${p.shift}\n`;
            textContent += `     Trigger: ${p.trigger_criteria}\n`;
            textContent += `     Action: ${p.action_required}\n`;
            textContent += `     Contact: ${p.contact_method} - ${p.contact_info || 'Page on-call provider'}\n`;
            textContent += `\n`;
          });
        }

        // NON-URGENT
        if (center.protocols_by_urgency.non_urgent.count > 0) {
          textContent += `┌─ NON-URGENT PROTOCOLS (${center.protocols_by_urgency.non_urgent.count}) ─┐\n`;
          textContent += `│ ${center.protocols_by_urgency.non_urgent.description}\n`;
          textContent += `└${'─'.repeat(68)}┘\n\n`;
          
          center.protocols_by_urgency.non_urgent.protocols.forEach((p, i) => {
            textContent += `  ${i + 1}. ${p.complaint_category}\n`;
            textContent += `     Patient: ${p.patient_type} | Organ: ${p.organ_type}\n`;
            textContent += `     Action: ${p.action_required}\n\n`;
          });
        }

        // PATIENT EDUCATION
        if (center.protocols_by_urgency.patient_education.count > 0) {
          textContent += `┌─ PATIENT EDUCATION (${center.protocols_by_urgency.patient_education.count}) ─┐\n`;
          textContent += `└${'─'.repeat(68)}┘\n\n`;
          
          center.protocols_by_urgency.patient_education.protocols.forEach((p, i) => {
            textContent += `  ${i + 1}. ${p.complaint_category}\n`;
            textContent += `     ${p.patient_education}\n\n`;
          });
        }

        if (center.special_instructions !== "No special instructions documented") {
          textContent += `\n⚠️  SPECIAL INSTRUCTIONS:\n${center.special_instructions}\n`;
        }
      });

      textContent += `\n\n${'═'.repeat(70)}\n`;
      textContent += `GENERAL TRANSPLANT TRIAGE GUIDELINES\n`;
      textContent += `${'═'.repeat(70)}\n\n`;
      textContent += `ALWAYS EMERGENT (Call 911 + Page Provider):\n`;
      protocolGuide.general_guidelines.emergent_criteria.forEach(c => {
        textContent += `  • ${c}\n`;
      });
      textContent += `\nALWAYS URGENT (After Hours - Page Immediately):\n`;
      protocolGuide.general_guidelines.always_urgent_after_hours.forEach(c => {
        textContent += `  • ${c}\n`;
      });
      textContent += `\nPATIENT EDUCATION QUICK REFERENCE:\n`;
      Object.entries(protocolGuide.general_guidelines.patient_education_responses).forEach(([key, value]) => {
        textContent += `  • ${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
      });

      // Download JSON version
      const jsonBlob = new Blob([JSON.stringify(protocolGuide, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `transplant-center-protocol-guide-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Download text version
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);
      const textLink = document.createElement('a');
      textLink.href = textUrl;
      textLink.download = `transplant-center-protocol-guide-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(textLink);
      textLink.click();
      document.body.removeChild(textLink);
      URL.revokeObjectURL(textUrl);

      alert('Protocol guide exported successfully! (JSON + Text versions)');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export protocol guide. Please try again.');
    }
    setIsExporting(false);
  };

  const priorityColors = {
    routine: { bg: '#1E40AF', text: '#60A5FA', border: '#60A5FA' },
    urgent: { bg: '#92400E', text: '#F59E0B', border: '#F59E0B' },
    emergency: { bg: '#991B1B', text: '#EF4444', border: '#EF4444' }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3" style={{ color: '#60A5FA' }}>
                <Brain className="w-10 h-10" />
                AI Protocol Management
              </h1>
              <p className="text-lg" style={{ color: '#60A5FA' }}>
                Configure and manage triage rules for AI-powered decision support
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={analyzeProtocolRefinements}
                disabled={isAnalyzing}
                style={{ backgroundColor: '#8B5CF6', color: '#000000' }}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    AI Refinement Analysis
                  </>
                )}
              </Button>
              <Button
                onClick={exportContactDatabase}
                disabled={isExporting}
                variant="outline"
                style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Export Contact DB
                  </>
                )}
              </Button>
              <Button
                onClick={exportCriteriaDatabase}
                disabled={isExporting}
                variant="outline"
                style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Export Criteria DB
                  </>
                )}
              </Button>
              <Button
                onClick={exportProtocolGuide}
                disabled={isExporting}
                variant="outline"
                style={{ borderColor: '#10B981', color: '#10B981' }}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Full Protocol Guide
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                style={{ backgroundColor: '#60A5FA', color: '#000000' }}
                className="gap-2"
              >
                <Plus className="w-5 h-5" />
                New Protocol
              </Button>
            </div>
          </div>
        </motion.div>

        {/* AI Refinement Suggestions */}
        <AnimatePresence>
          {showRefinements && refinementSuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="border" style={{ borderColor: '#8B5CF6', backgroundColor: '#374151' }}>
                <CardHeader className="border-b" style={{ borderColor: '#8B5CF6' }}>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                      <Sparkles className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                      Automated Protocol Refinement Suggestions
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRefinements(false)}
                      style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                    >
                      Close
                    </Button>
                  </div>
                  <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
                    {refinementSuggestions.summary}
                  </p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* New Protocol Suggestions */}
                  {refinementSuggestions.new_protocol_suggestions?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                        <Plus className="w-5 h-5" style={{ color: '#10B981' }} />
                        Suggested New Protocols ({refinementSuggestions.new_protocol_suggestions.length})
                      </h3>
                      <div className="space-y-3">
                        {refinementSuggestions.new_protocol_suggestions.map((suggestion, idx) => {
                          const hospital = hospitals.find(h => h.id === suggestion.hospital_id);
                          return (
                            <Card key={idx} className="border" style={{ borderColor: '#10B981', backgroundColor: '#1F2937' }}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-bold mb-1" style={{ color: '#60A5FA' }}>
                                      {suggestion.complaint_category}
                                    </h4>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      <Badge style={{ backgroundColor: '#1E3A8A', color: '#60A5FA' }}>
                                        {hospital?.name || 'Unknown'}
                                      </Badge>
                                      <Badge style={{ backgroundColor: '#7C3AED', color: '#A78BFA' }}>
                                        {suggestion.patient_type}
                                      </Badge>
                                      <Badge style={{ backgroundColor: '#BE185D', color: '#F9A8D4' }}>
                                        {suggestion.organ_type}
                                      </Badge>
                                      <Badge style={{ backgroundColor: '#92400E', color: '#F59E0B' }}>
                                        {suggestion.priority}
                                      </Badge>
                                      <Badge style={{ backgroundColor: suggestion.confidence === 'high' ? '#065F46' : '#92400E', color: '#FFF' }}>
                                        {suggestion.confidence} confidence
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveNewProtocol(suggestion)}
                                    style={{ backgroundColor: '#10B981', color: '#000000' }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-semibold" style={{ color: '#9CA3AF' }}>Based on: </span>
                                    <span style={{ color: '#60A5FA' }}>{suggestion.case_count} similar cases</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold" style={{ color: '#9CA3AF' }}>Trigger Criteria: </span>
                                    <span style={{ color: '#60A5FA' }}>{suggestion.trigger_criteria}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold" style={{ color: '#9CA3AF' }}>Action Required: </span>
                                    <span style={{ color: '#60A5FA' }}>{suggestion.action_required}</span>
                                  </div>
                                  <div className="p-2 rounded" style={{ backgroundColor: '#374151' }}>
                                    <span className="font-semibold" style={{ color: '#8B5CF6' }}>AI Reasoning: </span>
                                    <span style={{ color: '#9CA3AF' }}>{suggestion.reasoning}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Protocol Modifications */}
                  {refinementSuggestions.protocol_modifications?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                        <TrendingUp className="w-5 h-5" style={{ color: '#F59E0B' }} />
                        Suggested Protocol Modifications ({refinementSuggestions.protocol_modifications.length})
                      </h3>
                      <div className="space-y-3">
                        {refinementSuggestions.protocol_modifications.map((modification, idx) => {
                          const rule = rules.find(r => r.id === modification.rule_id);
                          return (
                            <Card key={idx} className="border" style={{ borderColor: '#F59E0B', backgroundColor: '#1F2937' }}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-bold mb-1" style={{ color: '#60A5FA' }}>
                                      {rule?.complaint_category || 'Unknown Rule'}
                                    </h4>
                                    <Badge style={{ backgroundColor: modification.confidence === 'high' ? '#065F46' : '#92400E', color: '#FFF' }}>
                                      {modification.confidence} confidence
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveModification(modification)}
                                    style={{ backgroundColor: '#F59E0B', color: '#000000' }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-semibold" style={{ color: '#9CA3AF' }}>Field to modify: </span>
                                    <span style={{ color: '#60A5FA' }}>{modification.field_to_modify}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold" style={{ color: '#9CA3AF' }}>Based on: </span>
                                    <span style={{ color: '#60A5FA' }}>{modification.based_on_corrections} corrections</span>
                                  </div>
                                  <div className="p-2 rounded" style={{ backgroundColor: '#374151' }}>
                                    <div className="mb-1">
                                      <span className="font-semibold" style={{ color: '#EF4444' }}>Current: </span>
                                      <span style={{ color: '#9CA3AF' }}>{modification.current_value}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold" style={{ color: '#10B981' }}>Suggested: </span>
                                      <span style={{ color: '#60A5FA' }}>{modification.suggested_value}</span>
                                    </div>
                                  </div>
                                  <div className="p-2 rounded" style={{ backgroundColor: '#374151' }}>
                                    <span className="font-semibold" style={{ color: '#8B5CF6' }}>AI Reasoning: </span>
                                    <span style={{ color: '#9CA3AF' }}>{modification.reasoning}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ambiguous Protocols */}
                  {refinementSuggestions.ambiguous_protocols?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#60A5FA' }}>
                        <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                        Ambiguous/Conflicting Protocols ({refinementSuggestions.ambiguous_protocols.length})
                      </h3>
                      <div className="space-y-3">
                        {refinementSuggestions.ambiguous_protocols.map((conflict, idx) => (
                          <Card key={idx} className="border" style={{ borderColor: '#EF4444', backgroundColor: '#1F2937' }}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <Badge style={{ 
                                    backgroundColor: conflict.severity === 'critical' ? '#991B1B' : conflict.severity === 'high' ? '#92400E' : '#374151',
                                    color: '#FFF' 
                                  }}>
                                    {conflict.severity} severity
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-semibold" style={{ color: '#9CA3AF' }}>Affected Rules: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {conflict.rule_ids.map(ruleId => {
                                      const rule = rules.find(r => r.id === ruleId);
                                      return rule ? (
                                        <Badge key={ruleId} variant="outline" style={{ borderColor: '#EF4444', color: '#60A5FA' }}>
                                          {rule.complaint_category}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                                <div className="p-2 rounded" style={{ backgroundColor: '#374151' }}>
                                  <span className="font-semibold" style={{ color: '#EF4444' }}>Conflict: </span>
                                  <span style={{ color: '#9CA3AF' }}>{conflict.conflict_description}</span>
                                </div>
                                <div className="p-2 rounded" style={{ backgroundColor: '#374151' }}>
                                  <span className="font-semibold" style={{ color: '#10B981' }}>Recommended Action: </span>
                                  <span style={{ color: '#60A5FA' }}>{conflict.recommended_action}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {!refinementSuggestions.new_protocol_suggestions?.length && 
                   !refinementSuggestions.protocol_modifications?.length && 
                   !refinementSuggestions.ambiguous_protocols?.length && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10B981' }} />
                      <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                        Protocols Look Good!
                      </h3>
                      <p style={{ color: '#9CA3AF' }}>
                        No significant improvements suggested at this time. Continue monitoring for new patterns.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Section */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
                  <CardTitle style={{ color: '#60A5FA' }}>
                    {editingRule ? 'Edit Protocol' : 'Create New Protocol'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label style={{ color: '#60A5FA' }}>Hospital *</Label>
                        <Select value={formData.hospital_id} onValueChange={(val) => setFormData({...formData, hospital_id: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue placeholder="Select hospital..." />
                          </SelectTrigger>
                          <SelectContent>
                            {hospitals.map(h => (
                              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Triage Level *</Label>
                        <Select value={formData.triage_level} onValueChange={(val) => setFormData({...formData, triage_level: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="emergent">Emergent</SelectItem>
                            <SelectItem value="always_urgent">Always Urgent</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="non-urgent">Non-Urgent</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Shift</Label>
                        <Select value={formData.shift} onValueChange={(val) => setFormData({...formData, shift: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business-hours">Business Hours</SelectItem>
                            <SelectItem value="after-hours">After Hours</SelectItem>
                            <SelectItem value="all-hours">All Hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Caller Type</Label>
                        <Select value={formData.caller_type} onValueChange={(val) => setFormData({...formData, caller_type: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="patient-family">Patient/Family</SelectItem>
                            <SelectItem value="labs">Labs</SelectItem>
                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                            <SelectItem value="outside-provider">Outside Provider</SelectItem>
                            <SelectItem value="md-consult">MD Consult</SelectItem>
                            <SelectItem value="emergency-department">Emergency Department</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Patient Type *</Label>
                        <Select value={formData.patient_type} onValueChange={(val) => setFormData({...formData, patient_type: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pre-transplant">Pre-Transplant</SelectItem>
                            <SelectItem value="post-transplant">Post-Transplant</SelectItem>
                            <SelectItem value="non-transplant">Non-Transplant</SelectItem>
                            <SelectItem value="living-donor">Living Donor</SelectItem>
                            <SelectItem value="any">Any</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Organ Type *</Label>
                        <Select value={formData.organ_type} onValueChange={(val) => setFormData({...formData, organ_type: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kidney">Kidney</SelectItem>
                            <SelectItem value="liver">Liver</SelectItem>
                            <SelectItem value="kidney-pancreas">Kidney-Pancreas</SelectItem>
                            <SelectItem value="pancreas">Pancreas</SelectItem>
                            <SelectItem value="heart">Heart</SelectItem>
                            <SelectItem value="any">Any</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Complaint Details */}
                    <div className="space-y-4">
                      <div>
                        <Label style={{ color: '#60A5FA' }}>Complaint Category *</Label>
                        <Input
                          value={formData.complaint_category}
                          onChange={(e) => setFormData({...formData, complaint_category: e.target.value})}
                          placeholder="e.g., Fever, Pain, Medication Issue"
                          required
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Trigger Criteria</Label>
                        <Textarea
                          value={formData.trigger_criteria}
                          onChange={(e) => setFormData({...formData, trigger_criteria: e.target.value})}
                          placeholder="e.g., Temperature >101.5°F, BP >170/100"
                          rows={3}
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Action Required *</Label>
                        <Textarea
                          value={formData.action_required}
                          onChange={(e) => setFormData({...formData, action_required: e.target.value})}
                          placeholder="e.g., Direct to ER and page nephrologist on call"
                          rows={3}
                          required
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label style={{ color: '#60A5FA' }}>Contact Method</Label>
                        <Select value={formData.contact_method} onValueChange={(val) => setFormData({...formData, contact_method: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="secure_page">Secure Page</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="urgent_page">Urgent Page</SelectItem>
                            <SelectItem value="warm_transfer">Warm Transfer</SelectItem>
                            <SelectItem value="direct_to_er">Direct to ER</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Contact Info</Label>
                        <Input
                          value={formData.contact_info}
                          onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                          placeholder="Phone/pager number or instructions"
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Priority</Label>
                        <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="routine">Routine</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Time Sensitivity</Label>
                        <Input
                          value={formData.time_sensitivity}
                          onChange={(e) => setFormData({...formData, time_sensitivity: e.target.value})}
                          placeholder="e.g., immediate, within 1 hour"
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div className="space-y-4">
                      <div>
                        <Label style={{ color: '#60A5FA' }}>Escalation Path</Label>
                        <Textarea
                          value={formData.escalation_path}
                          onChange={(e) => setFormData({...formData, escalation_path: e.target.value})}
                          placeholder="Who to escalate to if no response"
                          rows={2}
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Documentation Notes</Label>
                        <Textarea
                          value={formData.documentation_notes}
                          onChange={(e) => setFormData({...formData, documentation_notes: e.target.value})}
                          placeholder="Required documentation or templates"
                          rows={2}
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Patient Education</Label>
                        <Textarea
                          value={formData.patient_education}
                          onChange={(e) => setFormData({...formData, patient_education: e.target.value})}
                          placeholder="Education to provide to patient"
                          rows={2}
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        onClick={resetForm}
                        variant="outline"
                        style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                        style={{ backgroundColor: '#60A5FA', color: '#000000' }}
                      >
                        {editingRule ? 'Update Protocol' : 'Create Protocol'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <Card className="border mb-6" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4" style={{ color: '#60A5FA' }} />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search protocols..."
                    className="pl-10"
                    style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                  />
                </div>
              </div>

              <Select value={filterHospital} onValueChange={setFilterHospital}>
                <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                  <SelectValue placeholder="All Hospitals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hospitals</SelectItem>
                  {hospitals.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPatientType} onValueChange={setFilterPatientType}>
                <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                  <SelectValue placeholder="All Patient Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patient Types</SelectItem>
                  <SelectItem value="pre-transplant">Pre-Transplant</SelectItem>
                  <SelectItem value="post-transplant">Post-Transplant</SelectItem>
                  <SelectItem value="non-transplant">Non-Transplant</SelectItem>
                  <SelectItem value="living-donor">Living Donor</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterOrganType} onValueChange={setFilterOrganType}>
                <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                  <SelectValue placeholder="All Organs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organs</SelectItem>
                  <SelectItem value="kidney">Kidney</SelectItem>
                  <SelectItem value="liver">Liver</SelectItem>
                  <SelectItem value="kidney-pancreas">Kidney-Pancreas</SelectItem>
                  <SelectItem value="heart">Heart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant={filterStatus === "active" ? "default" : "outline"}
                onClick={() => setFilterStatus("active")}
                style={filterStatus === "active" ? { backgroundColor: '#10B981', color: '#000000' } : { borderColor: '#60A5FA', color: '#60A5FA' }}
              >
                Active ({rules.filter(r => r.status === 'active').length})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "inactive" ? "default" : "outline"}
                onClick={() => setFilterStatus("inactive")}
                style={filterStatus === "inactive" ? { backgroundColor: '#6B7280', color: '#000000' } : { borderColor: '#60A5FA', color: '#60A5FA' }}
              >
                Archived ({rules.filter(r => r.status === 'inactive').length})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                style={filterStatus === "all" ? { backgroundColor: '#60A5FA', color: '#000000' } : { borderColor: '#60A5FA', color: '#60A5FA' }}
              >
                All ({rules.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <div className="space-y-4">
          {filteredRules.length === 0 ? (
            <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
              <CardContent className="p-8 text-center">
                <Filter className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                  No protocols found
                </h3>
                <p style={{ color: '#9CA3AF' }}>
                  Try adjusting your filters or create a new protocol.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRules.map((rule) => {
              const hospital = hospitals.find(h => h.id === rule.hospital_id);
              const priorityConfig = priorityColors[rule.priority] || priorityColors.routine;

              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold" style={{ color: '#60A5FA' }}>
                              {rule.complaint_category}
                            </h3>
                            <Badge
                              className="border"
                              style={{
                                backgroundColor: priorityConfig.bg,
                                color: priorityConfig.text,
                                borderColor: priorityConfig.border
                              }}
                            >
                              {rule.priority}
                            </Badge>
                            <Badge
                              className="border"
                              style={{
                                backgroundColor: rule.status === 'active' ? '#065F46' : '#374151',
                                color: rule.status === 'active' ? '#10B981' : '#9CA3AF',
                                borderColor: rule.status === 'active' ? '#10B981' : '#6B7280'
                              }}
                            >
                              {rule.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                              {rule.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge style={{ backgroundColor: '#1E3A8A', color: '#60A5FA' }}>
                              {hospital?.name || 'Unknown Hospital'}
                            </Badge>
                            <Badge style={{ backgroundColor: '#7C3AED', color: '#A78BFA' }}>
                              {rule.patient_type}
                            </Badge>
                            <Badge style={{ backgroundColor: '#BE185D', color: '#F9A8D4' }}>
                              {rule.organ_type}
                            </Badge>
                            <Badge style={{ backgroundColor: '#065F46', color: '#6EE7B7' }}>
                              {rule.shift}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(rule)}
                            style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {rule.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchive(rule)}
                              style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateRuleMutation.mutate({ id: rule.id, data: { ...rule, status: 'active' } })}
                              style={{ borderColor: '#10B981', color: '#10B981' }}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(rule)}
                            style={{ borderColor: '#EF4444', color: '#EF4444' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        {rule.trigger_criteria && (
                          <div>
                            <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Trigger Criteria</p>
                            <p className="text-sm" style={{ color: '#60A5FA' }}>{rule.trigger_criteria}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Action Required</p>
                          <p className="text-sm" style={{ color: '#60A5FA' }}>{rule.action_required}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Contact Method</p>
                          <p className="text-sm" style={{ color: '#60A5FA' }}>
                            {rule.contact_method.replace('_', ' ')} 
                            {rule.contact_info && ` - ${rule.contact_info}`}
                          </p>
                        </div>
                        {rule.escalation_path && (
                          <div>
                            <p className="text-sm font-semibold mb-1" style={{ color: '#9CA3AF' }}>Escalation Path</p>
                            <p className="text-sm" style={{ color: '#60A5FA' }}>{rule.escalation_path}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}