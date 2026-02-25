import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Cpu, CheckCircle, Loader2, Shield, Database, Download, Upload, FileJson } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { canPerformAction } from "@/lib/rbac";

export default function Settings() {
  const { user } = useAuth();
  const userRole = user?.role || 'coordinator';
  const canBackup = canPerformAction(userRole, 'backup_restore');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: 'Respond with exactly: {"status":"ok","message":"AI engine active"}',
        response_json_schema: {
          type: "object",
          properties: { status: { type: "string" }, message: { type: "string" } },
        },
      });

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      setTestResult({ success: true, message: parsed.message || 'Built-in AI engine is active and ready.' });
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Engine test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleBackupCreate = async () => {
    setBackupStatus({ type: 'info', message: 'Creating backup...' });
    try {
      const result = await appClient.backup.create();
      if (result.canceled) {
        setBackupStatus(null);
      } else if (result.success) {
        setBackupStatus({ type: 'success', message: `Backup saved to: ${result.path}` });
      } else {
        setBackupStatus({ type: 'error', message: result.message || 'Backup failed' });
      }
    } catch (err) {
      setBackupStatus({ type: 'error', message: err.message });
    }
  };

  const handleBackupRestore = async () => {
    setBackupStatus({ type: 'info', message: 'Restoring from backup...' });
    try {
      const result = await appClient.backup.restore();
      if (result.canceled) {
        setBackupStatus(null);
      } else if (result.success) {
        setBackupStatus({ type: 'success', message: 'Backup restored successfully. Restart the app to see changes.' });
      } else {
        setBackupStatus({ type: 'error', message: result.message || 'Restore failed' });
      }
    } catch (err) {
      setBackupStatus({ type: 'error', message: err.message });
    }
  };

  const handleExportData = async () => {
    setBackupStatus({ type: 'info', message: 'Exporting data...' });
    try {
      const result = await appClient.backup.export();
      if (result.canceled) {
        setBackupStatus(null);
      } else if (result.success) {
        setBackupStatus({ type: 'success', message: `Data exported to: ${result.path}` });
      } else {
        setBackupStatus({ type: 'error', message: result.message || 'Export failed' });
      }
    } catch (err) {
      setBackupStatus({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-8 h-8" style={{ color: '#60A5FA' }} />
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#60A5FA' }}>Settings</h1>
          <p className="text-sm" style={{ color: '#60A5FA', opacity: 0.7 }}>AI engine status, backups, and system preferences</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="border" style={{ backgroundColor: '#111827', borderColor: '#1E3A5F' }}>
          <CardHeader className="border-b" style={{ borderColor: '#1E3A5F' }}>
            <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Cpu className="w-5 h-5" />
              Built-in AI Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="p-4 rounded-lg border" style={{ backgroundColor: '#0D1B2A', borderColor: '#1E3A5F' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#10B981' }} />
                <h3 className="text-sm font-semibold" style={{ color: '#60A5FA' }}>Engine Status: Active</h3>
              </div>
              <p className="text-xs mb-4" style={{ color: '#93C5FD' }}>
                TriageLink uses a fully embedded AI engine — no external APIs or internet connection required.
                The engine analyzes complaints using imported hospital rules, built-in medical knowledge,
                and transplant-specific clinical reasoning.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FeatureItem label="Rule-Based Matching" description="Matches complaints against imported hospital protocols" />
                <FeatureItem label="Medical Knowledge" description="Built-in transplant, rejection, and drug interaction awareness" />
                <FeatureItem label="Drug Toxicity Detection" description="Identifies immunosuppressant toxicity and interactions" />
                <FeatureItem label="Clinical Reasoning" description="Generates urgency, routing, and follow-up recommendations" />
                <FeatureItem label="Risk Assessment" description="Evaluates readmission and complication risk factors" />
                <FeatureItem label="Patient Communication" description="Generates coordinator scripts and patient education" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleTest}
                disabled={testing}
                style={{ backgroundColor: '#60A5FA', color: '#000000' }}
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Cpu className="w-4 h-4 mr-2" />}
                {testing ? 'Testing...' : 'Test AI Engine'}
              </Button>
              {testResult && (
                <Badge className="flex items-center gap-1" style={{ backgroundColor: '#065F46', color: '#34D399' }}>
                  <CheckCircle className="w-3 h-3" /> {testResult.message}
                </Badge>
              )}
            </div>

            <div className="p-3 rounded-lg border" style={{ backgroundColor: '#064E3B', borderColor: '#059669' }}>
              <p className="text-sm font-medium" style={{ color: '#34D399' }}>
                How to improve AI accuracy
              </p>
              <p className="text-xs mt-1" style={{ color: '#6EE7B7' }}>
                Import hospital-specific triage rules and paging criteria via the &quot;Import Rules&quot; feature
                on the Triage Rules page. The more rules you import, the more accurate the AI analysis becomes.
                The engine prioritizes imported rules first, then falls back to built-in clinical reasoning.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {canBackup && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="border" style={{ backgroundColor: '#111827', borderColor: '#1E3A5F' }}>
            <CardHeader className="border-b" style={{ borderColor: '#1E3A5F' }}>
              <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <Database className="w-5 h-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm" style={{ color: '#93C5FD' }}>
                Create encrypted backups, restore from backup, or export all data as JSON.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleBackupCreate}
                  variant="outline"
                  style={{ color: '#60A5FA', borderColor: '#374151' }}
                >
                  <Download className="w-4 h-4 mr-2" /> Create Backup
                </Button>
                <Button
                  onClick={handleBackupRestore}
                  variant="outline"
                  style={{ color: '#F59E0B', borderColor: '#374151' }}
                >
                  <Upload className="w-4 h-4 mr-2" /> Restore from Backup
                </Button>
                <Button
                  onClick={handleExportData}
                  variant="outline"
                  style={{ color: '#34D399', borderColor: '#374151' }}
                >
                  <FileJson className="w-4 h-4 mr-2" /> Export as JSON
                </Button>
              </div>
              {backupStatus && (
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: backupStatus.type === 'success' ? '#064E3B' : backupStatus.type === 'error' ? '#7F1D1D' : '#1E3A5F',
                    borderColor: backupStatus.type === 'success' ? '#059669' : backupStatus.type === 'error' ? '#DC2626' : '#60A5FA',
                  }}
                >
                  <p className="text-sm" style={{ color: backupStatus.type === 'success' ? '#34D399' : backupStatus.type === 'error' ? '#FCA5A5' : '#93C5FD' }}>
                    {backupStatus.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card className="border" style={{ backgroundColor: '#111827', borderColor: '#1E3A5F' }}>
          <CardHeader className="border-b" style={{ borderColor: '#1E3A5F' }}>
            <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
              <Shield className="w-5 h-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Application" value="TriageLink" />
              <InfoRow label="AI Engine" value="Built-in (No External API)" />
              <InfoRow label="Environment" value={typeof window !== 'undefined' && window.electronAPI ? 'Electron (Desktop)' : 'Browser (Dev)'} />
              <InfoRow label="Storage" value={typeof window !== 'undefined' && window.electronAPI?.db ? 'Encrypted SQLite' : 'localStorage (Dev)'} />
              <InfoRow label="Encryption" value={typeof window !== 'undefined' && window.electronAPI?.db ? 'AES-256-GCM' : 'None (Dev)'} />
              <InfoRow label="Auth" value={typeof window !== 'undefined' && window.electronAPI?.db ? 'Bcrypt + Sessions' : 'Local Hash'} />
              <InfoRow label="Your Role" value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function FeatureItem({ label, description }) {
  return (
    <div className="p-2 rounded" style={{ backgroundColor: '#111827' }}>
      <p className="text-xs font-medium" style={{ color: '#60A5FA' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{description}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: '#0D1B2A' }}>
      <span className="text-sm" style={{ color: '#6B7280' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: '#93C5FD' }}>{value}</span>
    </div>
  );
}
