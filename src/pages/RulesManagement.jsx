
import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Save, X, Building2, Shield, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ImportRulesDialog from "@/components/rules/ImportRulesDialog";

export default function RulesManagement() {
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    hospital_id: "",
    patient_type: "",
    organ_type: "",
    complaint_category: "",
    trigger_criteria: "",
    action_required: "",
    contact_method: "",
    contact_info: "",
    escalation_path: "",
    documentation_notes: "",
    priority: "routine",
    status: "active"
  });
  const [hospitalFormData, setHospitalFormData] = useState({
    name: "",
    contact_phone: "",
    secure_page_number: "",
    location: "",
    status: "active",
    notes: ""
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

  const createRuleMutation = useMutation({
    mutationFn: (data) => appClient.entities.TriageRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
      resetRuleForm();
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.TriageRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
      resetRuleForm();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => appClient.entities.TriageRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
    },
  });

  const createHospitalMutation = useMutation({
    mutationFn: (data) => appClient.entities.Hospital.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      resetHospitalForm();
    },
  });

  const updateHospitalMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.Hospital.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      resetHospitalForm();
    },
  });

  const deleteHospitalMutation = useMutation({
    mutationFn: (id) => appClient.entities.Hospital.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
    },
  });

  const handleRuleSubmit = (e) => {
    e.preventDefault();
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: ruleFormData });
    } else {
      createRuleMutation.mutate(ruleFormData);
    }
  };

  const handleHospitalSubmit = (e) => {
    e.preventDefault();
    if (editingHospital) {
      updateHospitalMutation.mutate({ id: editingHospital.id, data: hospitalFormData });
    } else {
      createHospitalMutation.mutate(hospitalFormData);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setRuleFormData(rule);
    setShowRuleForm(true);
  };

  const handleEditHospital = (hospital) => {
    setEditingHospital(hospital);
    setHospitalFormData(hospital);
    setShowHospitalForm(true);
  };

  const handleDeleteRule = (id) => {
    if (confirm("Are you sure you want to delete this triage rule?")) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleDeleteHospital = (id) => {
    if (confirm("Are you sure you want to delete this hospital?")) {
      deleteHospitalMutation.mutate(id);
    }
  };

  const resetRuleForm = () => {
    setShowRuleForm(false);
    setEditingRule(null);
    setRuleFormData({
      hospital_id: "",
      patient_type: "",
      organ_type: "",
      complaint_category: "",
      trigger_criteria: "",
      action_required: "",
      contact_method: "",
      contact_info: "",
      escalation_path: "",
      documentation_notes: "",
      priority: "routine",
      status: "active"
    });
  };

  const resetHospitalForm = () => {
    setShowHospitalForm(false);
    setEditingHospital(null);
    setHospitalFormData({
      name: "",
      contact_phone: "",
      secure_page_number: "",
      location: "",
      status: "active",
      notes: ""
    });
  };

  const getHospitalName = (hospitalId) => {
    return hospitals.find(h => h.id === hospitalId)?.name || "Unknown";
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#60A5FA' }}>
            <Shield className="inline-block w-8 h-8 mr-2" style={{ color: '#60A5FA' }} />
            Admin - Rules Management
          </h1>
          <p className="text-lg" style={{ color: '#60A5FA' }}>Configure hospitals, triage protocols, alerts, and paging routes</p>
        </div>

        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="rules">Triage Rules & Alerts</TabsTrigger>
            <TabsTrigger value="hospitals">Hospitals Management</TabsTrigger>
          </TabsList>

          {/* TRIAGE RULES TAB */}
          <TabsContent value="rules">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold" style={{ color: '#60A5FA' }}>Triage Rules & Paging Routes</h2>
                <p style={{ color: '#60A5FA' }}>Define criteria, alerts, and escalation paths for each scenario</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowImportDialog(true)}
                  variant="outline"
                  className="font-semibold"
                  style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Import File
                </Button>
                <Button
                  onClick={() => setShowRuleForm(!showRuleForm)}
                  className="text-white font-semibold"
                  style={{ backgroundColor: '#60A5FA' }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Rule
                </Button>
              </div>
            </div>

            <ImportRulesDialog
              open={showImportDialog}
              onOpenChange={setShowImportDialog}
              hospitals={hospitals}
            />

            <AnimatePresence>
              {showRuleForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="mb-8 border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                    <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
                      <CardTitle style={{ color: '#60A5FA' }}>
                        {editingRule ? 'Edit Triage Rule' : 'Create New Triage Rule'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <form onSubmit={handleRuleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Hospital *</Label>
                            <Select
                              value={ruleFormData.hospital_id}
                              onValueChange={(value) => setRuleFormData({...ruleFormData, hospital_id: value})}
                              required
                            >
                              <SelectTrigger className="border" style={{ borderColor: '#60A5FA' }}>
                                <SelectValue placeholder="Select hospital" />
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

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Patient Type *</Label>
                            <Select
                              value={ruleFormData.patient_type}
                              onValueChange={(value) => setRuleFormData({...ruleFormData, patient_type: value})}
                              required
                            >
                              <SelectTrigger className="border" style={{ borderColor: '#60A5FA' }}>
                                <SelectValue placeholder="Select patient type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pre-transplant">Pre-Transplant</SelectItem>
                                <SelectItem value="post-transplant">Post-Transplant</SelectItem>
                                <SelectItem value="non-transplant">Non-Transplant</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Organ Type *</Label>
                            <Select
                              value={ruleFormData.organ_type}
                              onValueChange={(value) => setRuleFormData({...ruleFormData, organ_type: value})}
                              required
                            >
                              <SelectTrigger className="border" style={{ borderColor: '#60A5FA' }}>
                                <SelectValue placeholder="Select organ type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kidney">Kidney</SelectItem>
                                <SelectItem value="liver">Liver</SelectItem>
                                <SelectItem value="kidney-pancreas">Kidney & Pancreas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Complaint Category *</Label>
                            <Input
                              value={ruleFormData.complaint_category}
                              onChange={(e) => setRuleFormData({...ruleFormData, complaint_category: e.target.value})}
                              placeholder="e.g., Fever, Pain, Medication Issue"
                              required
                              className="border"
                              style={{ borderColor: '#60A5FA' }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Trigger Criteria / Alert Threshold</Label>
                            <Input
                              value={ruleFormData.trigger_criteria}
                              onChange={(e) => setRuleFormData({...ruleFormData, trigger_criteria: e.target.value})}
                              placeholder="e.g., Fever >100.5°F"
                              className="border"
                              style={{ borderColor: '#60A5FA' }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Contact Method *</Label>
                            <Select
                              value={ruleFormData.contact_method}
                              onValueChange={(value) => setRuleFormData({...ruleFormData, contact_method: value})}
                              required
                            >
                              <SelectTrigger className="border" style={{ borderColor: '#60A5FA' }}>
                                <SelectValue placeholder="Select contact method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="phone">Phone</SelectItem>
                                <SelectItem value="secure_page">Secure Page</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="urgent_page">Urgent Page</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Contact Info / Paging Number</Label>
                            <Input
                              value={ruleFormData.contact_info}
                              onChange={(e) => setRuleFormData({...ruleFormData, contact_info: e.target.value})}
                              placeholder="Phone/pager number"
                              className="border"
                              style={{ borderColor: '#60A5FA' }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Priority *</Label>
                            <Select
                              value={ruleFormData.priority}
                              onValueChange={(value) => setRuleFormData({...ruleFormData, priority: value})}
                              required
                            >
                              <SelectTrigger className="border" style={{ borderColor: '#60A5FA' }}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="routine">Routine</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Status *</Label>
                            <Select
                              value={ruleFormData.status}
                              onValueChange={(value) => setRuleFormData({...ruleFormData, status: value})}
                              required
                            >
                              <SelectTrigger className="border" style={{ borderColor: '#60A5FA' }}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: '#60A5FA' }}>Action Required / Paging Instructions *</Label>
                          <Textarea
                            value={ruleFormData.action_required}
                            onChange={(e) => setRuleFormData({...ruleFormData, action_required: e.target.value})}
                            placeholder="Describe what action should be taken and who to page"
                            required
                            className="border min-h-24"
                            style={{ borderColor: '#60A5FA' }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: '#60A5FA' }}>Escalation Path / Secondary Paging Route</Label>
                          <Textarea
                            value={ruleFormData.escalation_path}
                            onChange={(e) => setRuleFormData({...ruleFormData, escalation_path: e.target.value})}
                            placeholder="Who to escalate to if no response and timeline"
                            className="border"
                            style={{ borderColor: '#60A5FA' }}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: '#60A5FA' }}>Documentation Notes / Required Templates</Label>
                          <Textarea
                            value={ruleFormData.documentation_notes}
                            onChange={(e) => setRuleFormData({...ruleFormData, documentation_notes: e.target.value})}
                            placeholder="Required documentation or templates to use"
                            className="border"
                            style={{ borderColor: '#60A5FA' }}
                          />
                        </div>

                        <div className="flex gap-3 justify-end">
                          <Button type="button" variant="outline" onClick={resetRuleForm}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="text-white"
                            style={{ backgroundColor: '#60A5FA' }}
                            disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {editingRule ? 'Update Rule' : 'Create Rule'}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rules List */}
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-semibold" style={{ color: '#60A5FA' }}>
                            {getHospitalName(rule.hospital_id)}
                          </h3>
                          <Badge style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', borderColor: '#60A5FA' }}>
                            {rule.patient_type}
                          </Badge>
                          <Badge style={{ backgroundColor: '#F0FDF4', color: '#166534', borderColor: '#10B981' }}>
                            {rule.organ_type === 'kidney-pancreas' ? 'Kidney & Pancreas' : rule.organ_type}
                          </Badge>
                          <Badge style={{
                            backgroundColor: rule.priority === 'emergency' ? '#FEE2E2' : rule.priority === 'urgent' ? '#FEF3C7' : '#DBEAFE',
                            color: rule.priority === 'emergency' ? '#991B1B' : rule.priority === 'urgent' ? '#92400E' : '#1E40AF'
                          }}>
                            {rule.priority}
                          </Badge>
                          {rule.source === 'imported' && (
                            <Badge style={{ backgroundColor: '#7C3AED20', color: '#A78BFA', borderColor: '#7C3AED' }}>
                              Imported
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-lg mb-1" style={{ color: '#60A5FA' }}>{rule.complaint_category}</p>
                        {rule.trigger_criteria && (
                          <p className="text-sm mb-2" style={{ color: '#60A5FA' }}>
                            <strong>Alert Trigger:</strong> {rule.trigger_criteria}
                          </p>
                        )}
                        <p className="mb-2" style={{ color: '#60A5FA' }}>
                          <strong>Action/Paging:</strong> {rule.action_required}
                        </p>
                        {rule.contact_info && (
                          <p className="text-sm" style={{ color: '#60A5FA' }}>
                            <strong>Contact:</strong> {rule.contact_method.replace('_', ' ')} - {rule.contact_info}
                          </p>
                        )}
                        {rule.escalation_path && (
                          <p className="text-sm mt-2" style={{ color: '#60A5FA' }}>
                            <strong>Escalation:</strong> {rule.escalation_path}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditRule(rule)}
                          style={{ borderColor: '#60A5FA' }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* HOSPITALS TAB */}
          <TabsContent value="hospitals">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold" style={{ color: '#60A5FA' }}>Hospital Management</h2>
                <p style={{ color: '#60A5FA' }}>Add and edit hospitals and their contact information</p>
              </div>
              <Button
                onClick={() => setShowHospitalForm(!showHospitalForm)}
                className="text-white font-semibold"
                style={{ backgroundColor: '#60A5FA' }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Hospital
              </Button>
            </div>

            <AnimatePresence>
              {showHospitalForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="mb-8 border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                    <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
                      <CardTitle style={{ color: '#60A5FA' }}>
                        {editingHospital ? 'Edit Hospital' : 'Add New Hospital'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <form onSubmit={handleHospitalSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Hospital Name *</Label>
                            <Input
                              value={hospitalFormData.name}
                              onChange={(e) => setHospitalFormData({...hospitalFormData, name: e.target.value})}
                              placeholder="e.g., Mayo Clinic"
                              required
                              className="border"
                              style={{ borderColor: '#60A5FA' }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Contact Phone</Label>
                            <Input
                              value={hospitalFormData.contact_phone}
                              onChange={(e) => setHospitalFormData({...hospitalFormData, contact_phone: e.target.value})}
                              placeholder="Main contact number"
                              className="border"
                              style={{ borderColor: '#60A5FA' }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Secure Page Number</Label>
                            <Input
                              value={hospitalFormData.secure_page_number}
                              onChange={(e) => setHospitalFormData({...hospitalFormData, secure_page_number: e.target.value})}
                              placeholder="Secure paging number"
                              className="border"
                              style={{ borderColor: '#60A5FA' }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Location</Label>
                            <Input
                              value={hospitalFormData.location}
                              onChange={(e) => setHospitalFormData({...hospitalFormData, location: e.target.value})}
                              placeholder="City, State"
                              className="border"
                              style={{ borderColor: '#60A5FA' }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label style={{ color: '#60A5FA' }}>Status *</Label>
                            <Select
                              value={hospitalFormData.status}
                              onValueChange={(value) => setHospitalFormData({...hospitalFormData, status: value})}
                              required
                            >
                              <SelectTrigger className="border" style={{ borderColor: '#60A5FA' }}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label style={{ color: '#60A5FA' }}>Notes</Label>
                          <Textarea
                            value={hospitalFormData.notes}
                            onChange={(e) => setHospitalFormData({...hospitalFormData, notes: e.target.value})}
                            placeholder="Additional notes about the hospital"
                            className="border"
                            style={{ borderColor: '#60A5FA' }}
                          />
                        </div>

                        <div className="flex gap-3 justify-end">
                          <Button type="button" variant="outline" onClick={resetHospitalForm}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="text-white"
                            style={{ backgroundColor: '#60A5FA' }}
                            disabled={createHospitalMutation.isPending || updateHospitalMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {editingHospital ? 'Update Hospital' : 'Add Hospital'}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hospitals List */}
            <div className="grid md:grid-cols-2 gap-4">
              {hospitals.map((hospital) => (
                <Card key={hospital.id} className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Building2 className="w-6 h-6" style={{ color: '#60A5FA' }} />
                          <h3 className="text-xl font-semibold" style={{ color: '#60A5FA' }}>
                            {hospital.name}
                          </h3>
                        </div>
                        {hospital.location && (
                          <p className="text-sm mb-1" style={{ color: '#60A5FA' }}>
                            <strong>Location:</strong> {hospital.location}
                          </p>
                        )}
                        {hospital.contact_phone && (
                          <p className="text-sm mb-1" style={{ color: '#60A5FA' }}>
                            <strong>Phone:</strong> {hospital.contact_phone}
                          </p>
                        )}
                        {hospital.secure_page_number && (
                          <p className="text-sm mb-1" style={{ color: '#60A5FA' }}>
                            <strong>Secure Page:</strong> {hospital.secure_page_number}
                          </p>
                        )}
                        {hospital.notes && (
                          <p className="text-sm mt-2" style={{ color: '#60A5FA' }}>
                            {hospital.notes}
                          </p>
                        )}
                        <Badge
                          className="mt-3"
                          style={{
                            backgroundColor: hospital.status === 'active' ? '#DBEAFE' : '#F3F4F6',
                            color: hospital.status === 'active' ? '#1E40AF' : '#6B7280'
                          }}
                        >
                          {hospital.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditHospital(hospital)}
                          style={{ borderColor: '#60A5FA' }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteHospital(hospital.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
