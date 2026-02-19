import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Edit, Trash2, Users, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import PermissionsEditor from "./PermissionsEditor";

export default function RoleManagement() {
  const [editingRole, setEditingRole] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => appClient.entities.UserRole.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => appClient.entities.User.list(),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      const user = await appClient.auth.me();
      
      // Log the deletion
      await appClient.entities.PermissionAuditLog.create({
        action_type: 'role_deleted',
        target_role_id: roleId,
        target_role_name: roles.find(r => r.id === roleId)?.role_name,
        performed_by: user.email,
        performed_by_name: user.full_name,
        metadata: { timestamp: new Date().toISOString() }
      });
      
      return appClient.entities.UserRole.delete(roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionAuditLogs'] });
    },
  });

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowEditor(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowEditor(true);
  };

  const handleDeleteRole = (role) => {
    if (role.is_system_role) {
      alert('Cannot delete system roles');
      return;
    }
    
    const usersWithRole = users.filter(u => u.custom_role_id === role.id);
    if (usersWithRole.length > 0) {
      if (!confirm(`${usersWithRole.length} users are assigned to this role. Are you sure you want to delete it? Users will lose their custom permissions.`)) {
        return;
      }
    }
    
    if (confirm(`Delete role "${role.role_name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const getUserCountForRole = (roleId) => {
    return users.filter(u => u.custom_role_id === roleId).length;
  };

  const getPermissionSummary = (permissions) => {
    if (!permissions) return 0;
    let count = 0;
    
    if (permissions.admin) {
      Object.values(permissions.admin).forEach(v => v && count++);
    }
    if (permissions.triage) {
      Object.values(permissions.triage).forEach(v => v && count++);
    }
    if (permissions.reports) {
      Object.values(permissions.reports).forEach(v => v && count++);
    }
    
    return count;
  };

  return (
    <>
      <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
        <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Shield className="w-5 h-5" />
              Role Management
            </CardTitle>
            <Button
              onClick={handleCreateRole}
              style={{ backgroundColor: '#60A5FA', color: '#000000' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.filter(role => role).map((role) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-lg border"
                style={{ backgroundColor: '#4B5563', borderColor: '#60A5FA' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold" style={{ color: '#60A5FA' }}>
                        {role.role_name}
                      </h4>
                      {role.is_system_role && (
                        <Badge style={{ backgroundColor: '#8B5CF6', color: '#000000' }}>
                          SYSTEM
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mb-2" style={{ color: '#9CA3AF' }}>
                      {role.description}
                    </p>
                  </div>
                  <Badge
                    style={{
                      backgroundColor: role.status === 'active' ? '#10B981' : '#6B7280',
                      color: '#000000'
                    }}
                  >
                    {role.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                    <Users className="w-4 h-4" />
                    <span>{getUserCountForRole(role.id)} users</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                    <Lock className="w-4 h-4" />
                    <span>{getPermissionSummary(role.permissions)} permissions</span>
                  </div>
                  {role.assigned_hospitals && role.assigned_hospitals.length > 0 && (
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      Restricted to {role.assigned_hospitals.length} hospital(s)
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: '#6B7280' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditRole(role)}
                    className="flex-1"
                    style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  {!role.is_system_role && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteRole(role)}
                      style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {roles.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                No Custom Roles
              </h3>
              <p className="mb-4" style={{ color: '#9CA3AF' }}>
                Create custom roles to define granular permissions for different user types
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showEditor && (
        <PermissionsEditor
          role={editingRole}
          onClose={() => {
            setShowEditor(false);
            setEditingRole(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['userRoles'] });
            setShowEditor(false);
            setEditingRole(null);
          }}
        />
      )}
    </>
  );
}