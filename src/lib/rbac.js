const ROLE_PERMISSIONS = {
  admin: {
    pages: [
      'TriageDashboard', 'AIProtocolManagement', 'RulesManagement',
      'PagingConfiguration', 'Compliance', 'AuditLog',
      'Analytics', 'Reports', 'ReportingDashboard', 'Settings',
    ],
    actions: [
      'manage_users', 'manage_rules', 'manage_hospitals', 'manage_paging',
      'view_audit', 'export_data', 'import_rules', 'configure_llm',
      'backup_restore', 'triage_patients', 'view_reports', 'view_analytics',
      'view_compliance',
    ],
  },
  coordinator: {
    pages: ['TriageDashboard', 'Reports', 'ReportingDashboard'],
    actions: ['triage_patients', 'view_reports'],
  },
  supervisor: {
    pages: [
      'TriageDashboard', 'RulesManagement', 'PagingConfiguration',
      'Analytics', 'Reports', 'ReportingDashboard', 'AuditLog',
    ],
    actions: [
      'triage_patients', 'manage_rules', 'manage_paging',
      'view_reports', 'view_audit', 'view_analytics', 'import_rules',
    ],
  },
  qa: {
    pages: ['Analytics', 'Reports', 'ReportingDashboard', 'AuditLog', 'Compliance'],
    actions: ['view_reports', 'view_audit', 'view_analytics', 'view_compliance'],
  },
  it: {
    pages: ['Compliance', 'AuditLog', 'Analytics', 'Settings'],
    actions: ['view_audit', 'configure_llm', 'backup_restore', 'view_compliance', 'view_analytics'],
  },
};

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role?.toLowerCase()] || ROLE_PERMISSIONS.coordinator;
}

export function canAccessPage(role, pageName) {
  const perms = getRolePermissions(role);
  return perms.pages.includes(pageName);
}

export function canPerformAction(role, action) {
  const perms = getRolePermissions(role);
  return perms.actions.includes(action);
}

export function getAccessiblePages(role) {
  return getRolePermissions(role).pages;
}

export function getAllRoles() {
  return Object.keys(ROLE_PERMISSIONS);
}
