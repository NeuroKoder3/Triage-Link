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
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Edit, Trash2, CheckCircle, XCircle, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PagingConfiguration() {
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    hospital_id: "",
    trigger_urgency_levels: ["emergency", "urgent"],
    trigger_patient_types: [],
    trigger_organ_types: [],
    paging_method: "secure_page",
    primary_contact: "",
    backup_contact: "",
    message_template: "",
    business_hours_only: false,
    require_confirmation: false,
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.list(),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['pagingConfigs'],
    queryFn: () => appClient.entities.PagingConfiguration.list('-created_date'),
  });

  const { data: pageLogs = [] } = useQuery({
    queryKey: ['pageLogs'],
    queryFn: () => appClient.entities.PageLog.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const hospital = hospitals.find(h => h.id === data.hospital_id);
      return appClient.entities.PagingConfiguration.create({
        ...data,
        hospital_name: hospital?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagingConfigs'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.PagingConfiguration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagingConfigs'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.PagingConfiguration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagingConfigs'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData(config);
    setShowForm(true);
  };

  const handleDelete = (config) => {
    if (window.confirm(`Delete paging configuration for ${config.hospital_name}?`)) {
      deleteMutation.mutate(config.id);
    }
  };

  const resetForm = () => {
    setFormData({
      hospital_id: "",
      trigger_urgency_levels: ["emergency", "urgent"],
      trigger_patient_types: [],
      trigger_organ_types: [],
      paging_method: "secure_page",
      primary_contact: "",
      backup_contact: "",
      message_template: "",
      business_hours_only: false,
      require_confirmation: false,
      is_active: true
    });
    setEditingConfig(null);
    setShowForm(false);
  };

  const toggleUrgencyLevel = (level) => {
    setFormData(prev => ({
      ...prev,
      trigger_urgency_levels: prev.trigger_urgency_levels.includes(level)
        ? prev.trigger_urgency_levels.filter(l => l !== level)
        : [...prev.trigger_urgency_levels, level]
    }));
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
                <Bell className="w-10 h-10" />
                Secure Paging Configuration
              </h1>
              <p className="text-lg" style={{ color: '#60A5FA' }}>
                Configure automatic secure paging for high-urgency triage cases
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{ backgroundColor: '#60A5FA', color: '#000000' }}
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              New Configuration
            </Button>
          </div>
        </motion.div>

        {/* Form */}
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
                    {editingConfig ? 'Edit Paging Configuration' : 'Create Paging Configuration'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
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
                      <Label className="mb-3 block" style={{ color: '#60A5FA' }}>Trigger on Urgency Levels *</Label>
                      <div className="flex gap-3 flex-wrap">
                        {['emergency', 'urgent', 'non-urgent'].map(level => (
                          <Button
                            key={level}
                            type="button"
                            variant={formData.trigger_urgency_levels.includes(level) ? "default" : "outline"}
                            onClick={() => toggleUrgencyLevel(level)}
                            style={formData.trigger_urgency_levels.includes(level) 
                              ? { backgroundColor: '#EF4444', color: '#000000' }
                              : { borderColor: '#60A5FA', color: '#60A5FA' }}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label style={{ color: '#60A5FA' }}>Paging Method *</Label>
                        <Select value={formData.paging_method} onValueChange={(val) => setFormData({...formData, paging_method: val})}>
                          <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="secure_page">Secure Page</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="phone_call">Phone Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Primary Contact *</Label>
                        <Input
                          value={formData.primary_contact}
                          onChange={(e) => setFormData({...formData, primary_contact: e.target.value})}
                          placeholder="Phone/Email"
                          required
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>

                      <div>
                        <Label style={{ color: '#60A5FA' }}>Backup Contact</Label>
                        <Input
                          value={formData.backup_contact}
                          onChange={(e) => setFormData({...formData, backup_contact: e.target.value})}
                          placeholder="Backup Phone/Email"
                          style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label style={{ color: '#60A5FA' }}>Message Template</Label>
                      <Textarea
                        value={formData.message_template}
                        onChange={(e) => setFormData({...formData, message_template: e.target.value})}
                        placeholder="Use {hospital}, {urgency}, {patient_type}, {organ_type}, {complaint}, {action}"
                        rows={4}
                        style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: '#4B5563' }}>
                        <Label style={{ color: '#60A5FA' }}>Business Hours Only</Label>
                        <Switch
                          checked={formData.business_hours_only}
                          onCheckedChange={(val) => setFormData({...formData, business_hours_only: val})}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: '#4B5563' }}>
                        <Label style={{ color: '#60A5FA' }}>Require Manual Confirmation</Label>
                        <Switch
                          checked={formData.require_confirmation}
                          onCheckedChange={(val) => setFormData({...formData, require_confirmation: val})}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: '#4B5563' }}>
                        <Label style={{ color: '#60A5FA' }}>Active</Label>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(val) => setFormData({...formData, is_active: val})}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="button" onClick={resetForm} variant="outline" style={{ borderColor: '#60A5FA', color: '#60A5FA' }}>
                        Cancel
                      </Button>
                      <Button type="submit" style={{ backgroundColor: '#60A5FA', color: '#000000' }}>
                        {editingConfig ? 'Update Configuration' : 'Create Configuration'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Configurations List */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {configs.map((config) => (
            <motion.div key={config.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#60A5FA' }}>
                        {config.hospital_name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {config.trigger_urgency_levels?.map(level => (
                          <Badge key={level} style={{ backgroundColor: '#EF4444', color: '#FFF' }}>
                            {level}
                          </Badge>
                        ))}
                        <Badge style={{ backgroundColor: config.is_active ? '#10B981' : '#6B7280', color: '#FFF' }}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(config)} style={{ borderColor: '#60A5FA', color: '#60A5FA' }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(config)} style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold" style={{ color: '#9CA3AF' }}>Method: </span>
                      <span style={{ color: '#60A5FA' }}>{config.paging_method}</span>
                    </div>
                    <div>
                      <span className="font-semibold" style={{ color: '#9CA3AF' }}>Contact: </span>
                      <span style={{ color: '#60A5FA' }}>{config.primary_contact}</span>
                    </div>
                    {config.require_confirmation && (
                      <Badge variant="outline" style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>
                        Requires Confirmation
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Page Logs */}
        <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
          <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
            <CardTitle style={{ color: '#60A5FA' }}>Recent Pages Sent ({pageLogs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {pageLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg border" style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold" style={{ color: '#60A5FA' }}>{log.hospital_name}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge style={{ backgroundColor: '#EF4444', color: '#FFF' }}>{log.urgency_level}</Badge>
                        <Badge style={{ backgroundColor: log.status === 'delivered' ? '#10B981' : log.status === 'failed' ? '#EF4444' : '#6B7280', color: '#FFF' }}>
                          {log.status}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>
                      {new Date(log.sent_at || log.created_date).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold" style={{ color: '#9CA3AF' }}>To: </span>
                    <span style={{ color: '#60A5FA' }}>{log.recipient}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}