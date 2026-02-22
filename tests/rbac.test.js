import { describe, it, expect } from 'vitest';
import { canAccessPage, canPerformAction, getAccessiblePages, getRolePermissions, getAllRoles } from '../src/lib/rbac.js';

describe('RBAC - Role-Based Access Control', () => {
  describe('getAllRoles', () => {
    it('returns all defined roles', () => {
      const roles = getAllRoles();
      expect(roles).toContain('admin');
      expect(roles).toContain('coordinator');
      expect(roles).toContain('supervisor');
      expect(roles).toContain('qa');
      expect(roles).toContain('it');
      expect(roles.length).toBe(5);
    });
  });

  describe('Admin role', () => {
    it('can access all pages', () => {
      const pages = getAccessiblePages('admin');
      expect(pages).toContain('TriageDashboard');
      expect(pages).toContain('RulesManagement');
      expect(pages).toContain('AuditLog');
      expect(pages).toContain('Analytics');
      expect(pages).toContain('Compliance');
    });

    it('can perform all actions', () => {
      expect(canPerformAction('admin', 'manage_users')).toBe(true);
      expect(canPerformAction('admin', 'manage_rules')).toBe(true);
      expect(canPerformAction('admin', 'backup_restore')).toBe(true);
      expect(canPerformAction('admin', 'triage_patients')).toBe(true);
      expect(canPerformAction('admin', 'configure_llm')).toBe(true);
    });
  });

  describe('Coordinator role', () => {
    it('can only access triage and reports', () => {
      expect(canAccessPage('coordinator', 'TriageDashboard')).toBe(true);
      expect(canAccessPage('coordinator', 'Reports')).toBe(true);
      expect(canAccessPage('coordinator', 'ReportingDashboard')).toBe(true);
    });

    it('cannot access admin pages', () => {
      expect(canAccessPage('coordinator', 'RulesManagement')).toBe(false);
      expect(canAccessPage('coordinator', 'AuditLog')).toBe(false);
      expect(canAccessPage('coordinator', 'Compliance')).toBe(false);
      expect(canAccessPage('coordinator', 'AIProtocolManagement')).toBe(false);
    });

    it('cannot perform admin actions', () => {
      expect(canPerformAction('coordinator', 'manage_users')).toBe(false);
      expect(canPerformAction('coordinator', 'manage_rules')).toBe(false);
      expect(canPerformAction('coordinator', 'backup_restore')).toBe(false);
    });

    it('can perform triage actions', () => {
      expect(canPerformAction('coordinator', 'triage_patients')).toBe(true);
      expect(canPerformAction('coordinator', 'view_reports')).toBe(true);
    });
  });

  describe('Supervisor role', () => {
    it('can access triage, rules, analytics, audit', () => {
      expect(canAccessPage('supervisor', 'TriageDashboard')).toBe(true);
      expect(canAccessPage('supervisor', 'RulesManagement')).toBe(true);
      expect(canAccessPage('supervisor', 'Analytics')).toBe(true);
      expect(canAccessPage('supervisor', 'AuditLog')).toBe(true);
    });

    it('cannot access AI protocol or compliance', () => {
      expect(canAccessPage('supervisor', 'AIProtocolManagement')).toBe(false);
      expect(canAccessPage('supervisor', 'Compliance')).toBe(false);
    });
  });

  describe('QA role', () => {
    it('can access analytics, reports, audit, compliance', () => {
      expect(canAccessPage('qa', 'Analytics')).toBe(true);
      expect(canAccessPage('qa', 'Reports')).toBe(true);
      expect(canAccessPage('qa', 'AuditLog')).toBe(true);
      expect(canAccessPage('qa', 'Compliance')).toBe(true);
    });

    it('cannot access triage or rules', () => {
      expect(canAccessPage('qa', 'TriageDashboard')).toBe(false);
      expect(canAccessPage('qa', 'RulesManagement')).toBe(false);
    });
  });

  describe('IT role', () => {
    it('can access compliance, audit, analytics', () => {
      expect(canAccessPage('it', 'Compliance')).toBe(true);
      expect(canAccessPage('it', 'AuditLog')).toBe(true);
      expect(canAccessPage('it', 'Analytics')).toBe(true);
    });

    it('can perform IT-specific actions', () => {
      expect(canPerformAction('it', 'configure_llm')).toBe(true);
      expect(canPerformAction('it', 'backup_restore')).toBe(true);
    });

    it('cannot triage patients', () => {
      expect(canPerformAction('it', 'triage_patients')).toBe(false);
      expect(canAccessPage('it', 'TriageDashboard')).toBe(false);
    });
  });

  describe('Unknown role defaults to coordinator', () => {
    it('defaults to coordinator permissions for unknown roles', () => {
      const perms = getRolePermissions('unknown_role');
      const coordinatorPerms = getRolePermissions('coordinator');
      expect(perms).toEqual(coordinatorPerms);
    });

    it('handles null/undefined role', () => {
      expect(canAccessPage(null, 'TriageDashboard')).toBe(true);
      expect(canAccessPage(undefined, 'RulesManagement')).toBe(false);
    });
  });

  describe('Case insensitivity', () => {
    it('handles uppercase role names', () => {
      expect(canAccessPage('Admin', 'RulesManagement')).toBe(true);
      expect(canAccessPage('COORDINATOR', 'TriageDashboard')).toBe(true);
    });
  });
});
