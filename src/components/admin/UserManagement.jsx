import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Shield, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appClient } from "@/api/appClient";
import { format } from "date-fns";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => appClient.entities.User.list('-created_date'),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => appClient.entities.UserRole.list(),
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, previousRoleId }) => {
      const currentUser = await appClient.auth.me();
      const targetUser = users.find(u => u.id === userId);
      
      await appClient.entities.User.update(userId, { custom_role_id: roleId });
      
      // Log the role assignment
      await appClient.entities.PermissionAuditLog.create({
        action_type: roleId ? 'role_assigned' : 'role_revoked',
        target_user_email: targetUser.email,
        target_role_id: roleId,
        target_role_name: roles.find(r => r.id === roleId)?.role_name,
        performed_by: currentUser.email,
        performed_by_name: currentUser.full_name,
        changes_made: {
          previous_role_id: previousRoleId,
          new_role_id: roleId
        },
        metadata: { timestamp: new Date().toISOString() }
      });
      
      return { userId, roleId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['permissionAuditLogs'] });
    },
  });

  const handleRoleChange = (userId, newRoleId, previousRoleId) => {
    updateUserRoleMutation.mutate({ userId, roleId: newRoleId, previousRoleId });
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleName = (roleId) => {
    if (!roleId) return 'Default';
    const role = roles.find(r => r.id === roleId);
    return role?.role_name || 'Unknown Role';
  };

  return (
    <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
      <CardHeader className="border-b" style={{ borderColor: '#60A5FA' }}>
        <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
          <Users className="w-5 h-5" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#60A5FA' }} />
            <Input
              placeholder="Search users by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#60A5FA' }}>
                <th className="text-left p-3" style={{ color: '#60A5FA' }}>User</th>
                <th className="text-left p-3" style={{ color: '#60A5FA' }}>Role</th>
                <th className="text-left p-3" style={{ color: '#60A5FA' }}>Custom Role</th>
                <th className="text-left p-3" style={{ color: '#60A5FA' }}>Status</th>
                <th className="text-left p-3" style={{ color: '#60A5FA' }}>Last Login</th>
                <th className="text-left p-3" style={{ color: '#60A5FA' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.filter(user => user).map((user) => (
                <tr key={user.id} className="border-b" style={{ borderColor: '#6B7280' }}>
                  <td className="p-3">
                    <div>
                      <div className="font-semibold" style={{ color: '#60A5FA' }}>
                        {user.full_name}
                      </div>
                      <div className="text-sm" style={{ color: '#9CA3AF' }}>
                        {user.email}
                      </div>
                      {user.department && (
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>
                          {user.department}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      style={{
                        backgroundColor: user.role === 'admin' ? '#8B5CF6' : '#60A5FA',
                        color: '#000000'
                      }}
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Select
                      value={user.custom_role_id || 'none'}
                      onValueChange={(value) => 
                        handleRoleChange(user.id, value === 'none' ? null : value, user.custom_role_id)
                      }
                    >
                      <SelectTrigger 
                        className="w-48"
                        style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Custom Role</SelectItem>
                        {roles.filter(r => r.status === 'active').map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.role_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Badge
                      style={{
                        backgroundColor: 
                          user.status === 'active' ? '#10B981' :
                          user.status === 'suspended' ? '#EF4444' : '#6B7280',
                        color: '#000000'
                      }}
                    >
                      {user.status || 'active'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>
                      {user.last_login 
                        ? format(new Date(user.last_login), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </span>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
            <p style={{ color: '#9CA3AF' }}>
              {searchTerm ? 'No users found matching your search' : 'No users found'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}