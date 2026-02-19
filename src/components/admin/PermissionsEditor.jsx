import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Database, FileText, Activity, Settings } from "lucide-react";
import { appClient } from "@/api/appClient";
import { useQuery } from "@tanstack/react-query";

export default function PermissionsEditor({ role, onClose, onSaved }) {
  const [roleName, setRoleName] = useState(role?.role_name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [status, setStatus] = useState(role?.status || "active");
  const [assignedHospitals, setAssignedHospitals] = useState(role?.assigned_hospitals || []);
  const [isSaving, setIsSaving] = useState(false);

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.list(),
  });

  const [permissions, setPermissions] = useState(role?.permissions || {
    entities: {
      TriageLog: { create: false, read: false, update: false, delete: false },
      MDConsultation: { create: false, read: false, update: false, delete: false },
      TriageRule: { create: false, read: false, update: false, delete: false },
      Hospital: { create: false, read: false, update: false, delete: false },
      PagingSchedule: { create: false, read: false, update: false, delete: false },
      AICorrection: { create: false, read: false, update: false, delete: false },
      RuleSuggestion: { create: false, read: false, update: false, delete: false },
      PendingAlert: { create: false, read: false, update: false, delete: false },
      ScheduledReport: { create: false, read: false, update: false, delete: false },
      AutomatedReport: { create: false, read: false, update: false, delete: false }
    },
    reports: {
      view_all_reports: false,
      view_own_reports: true,
      generate_reports: false,
      schedule_reports: false,
      export_reports: false,
      view_analytics: false
    },
    triage: {
      perform_triage: false,
      override_ai_suggestions: false,
      access_all_hospitals: false,
      manage_alerts: false
    },
    admin: {
      manage_users: false,
      manage_roles: false,
      manage_hospitals: false,
      manage_rules: false,
      view_audit_logs: false,
      system_settings: false
    }
  });

  const handlePermissionChange = (category, key, action, value) => {
    setPermissions(prev => {
      const newPerms = { ...prev };
      if (action) {
        newPerms[category][key][action] = value;
      } else {
        newPerms[category][key] = value;
      }
      return newPerms;
    });
  };

  const handleSelectAllEntity = (entityName, value) => {
    setPermissions(prev => ({
      ...prev,
      entities: {
        ...prev.entities,
        [entityName]: {
          create: value,
          read: value,
          update: value,
          delete: value
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      alert('Please enter a role name');
      return;
    }

    setIsSaving(true);

    try {
      const user = await appClient.auth.me();
      
      const roleData = {
        role_name: roleName,
        description,
        status,
        permissions,
        assigned_hospitals: assignedHospitals,
        is_system_role: role?.is_system_role || false
      };

      if (role) {
        // Update existing role
        await appClient.entities.UserRole.update(role.id, roleData);
        
        // Log the update
        await appClient.entities.PermissionAuditLog.create({
          action_type: 'role_updated',
          target_role_id: role.id,
          target_role_name: roleName,
          performed_by: user.email,
          performed_by_name: user.full_name,
          changes_made: {
            before: role,
            after: roleData
          },
          metadata: { timestamp: new Date().toISOString() }
        });
      } else {
        // Create new role
        const newRole = await appClient.entities.UserRole.create(roleData);
        
        // Log the creation
        await appClient.entities.PermissionAuditLog.create({
          action_type: 'role_created',
          target_role_id: newRole.id,
          target_role_name: roleName,
          performed_by: user.email,
          performed_by_name: user.full_name,
          metadata: { timestamp: new Date().toISOString() }
        });
      }

      onSaved();
    } catch (error) {
      console.error("Error saving role:", error);
      alert('Error saving role. Please try again.');
    }

    setIsSaving(false);
  };

  const toggleHospital = (hospitalId) => {
    setAssignedHospitals(prev => 
      prev.includes(hospitalId)
        ? prev.filter(id => id !== hospitalId)
        : [...prev, hospitalId]
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#374151', borderColor: '#60A5FA' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#60A5FA' }}>
            <Shield className="inline-block w-5 h-5 mr-2" />
            {role ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Role Name *</Label>
              <Input
                placeholder="e.g., Senior Coordinator"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={role?.is_system_role}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Description</Label>
              <Textarea
                placeholder="Describe what this role is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: '#60A5FA' }}>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Permissions Tabs */}
          <Tabs defaultValue="entities" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="entities">
                <Database className="w-4 h-4 mr-1" />
                Entities
              </TabsTrigger>
              <TabsTrigger value="reports">
                <FileText className="w-4 h-4 mr-1" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="triage">
                <Activity className="w-4 h-4 mr-1" />
                Triage
              </TabsTrigger>
              <TabsTrigger value="admin">
                <Settings className="w-4 h-4 mr-1" />
                Admin
              </TabsTrigger>
            </TabsList>

            {/* Entities Permissions */}
            <TabsContent value="entities" className="space-y-4 max-h-96 overflow-y-auto">
              {Object.keys(permissions.entities).map((entityName) => (
                <div key={entityName} className="p-3 rounded-lg border" style={{ backgroundColor: '#4B5563', borderColor: '#6B7280' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm" style={{ color: '#60A5FA' }}>
                      {entityName}
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const allSelected = Object.values(permissions.entities[entityName]).every(v => v);
                        handleSelectAllEntity(entityName, !allSelected);
                      }}
                      style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                    >
                      {Object.values(permissions.entities[entityName]).every(v => v) ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {['create', 'read', 'update', 'delete'].map((action) => (
                      <div key={action} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${entityName}-${action}`}
                          checked={permissions.entities[entityName][action]}
                          onCheckedChange={(checked) => 
                            handlePermissionChange('entities', entityName, action, checked)
                          }
                        />
                        <label
                          htmlFor={`${entityName}-${action}`}
                          className="text-sm capitalize cursor-pointer"
                          style={{ color: '#9CA3AF' }}
                        >
                          {action}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Reports Permissions */}
            <TabsContent value="reports" className="space-y-3">
              {Object.entries(permissions.reports).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`report-${key}`}
                    checked={value}
                    onCheckedChange={(checked) => 
                      handlePermissionChange('reports', key, null, checked)
                    }
                  />
                  <label
                    htmlFor={`report-${key}`}
                    className="text-sm cursor-pointer"
                    style={{ color: '#60A5FA' }}
                  >
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                </div>
              ))}
            </TabsContent>

            {/* Triage Permissions */}
            <TabsContent value="triage" className="space-y-3">
              {Object.entries(permissions.triage).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`triage-${key}`}
                    checked={value}
                    onCheckedChange={(checked) => 
                      handlePermissionChange('triage', key, null, checked)
                    }
                  />
                  <label
                    htmlFor={`triage-${key}`}
                    className="text-sm cursor-pointer"
                    style={{ color: '#60A5FA' }}
                  >
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                </div>
              ))}

              {/* Hospital Assignment */}
              {!permissions.triage.access_all_hospitals && (
                <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: '#4B5563', borderColor: '#6B7280' }}>
                  <Label className="mb-2" style={{ color: '#60A5FA' }}>
                    Assigned Hospitals (leave empty for all)
                  </Label>
                  <div className="space-y-2 mt-2">
                    {hospitals.map((hospital) => (
                      <div key={hospital.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`hospital-${hospital.id}`}
                          checked={assignedHospitals.includes(hospital.id)}
                          onCheckedChange={() => toggleHospital(hospital.id)}
                        />
                        <label
                          htmlFor={`hospital-${hospital.id}`}
                          className="text-sm cursor-pointer"
                          style={{ color: '#9CA3AF' }}
                        >
                          {hospital.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Admin Permissions */}
            <TabsContent value="admin" className="space-y-3">
              {Object.entries(permissions.admin).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`admin-${key}`}
                    checked={value}
                    onCheckedChange={(checked) => 
                      handlePermissionChange('admin', key, null, checked)
                    }
                  />
                  <label
                    htmlFor={`admin-${key}`}
                    className="text-sm cursor-pointer"
                    style={{ color: '#60A5FA' }}
                  >
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !roleName.trim()}
            style={{ backgroundColor: '#60A5FA', color: '#000000' }}
          >
            {isSaving ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}