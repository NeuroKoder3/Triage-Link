import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Cpu, CheckCircle, XCircle, Loader2, Shield, Database, Download, Upload, FileJson } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { canPerformAction } from "@/lib/rbac";

export default function Settings() {
  const { user } = useAuth();
  const userRole = user?.role || 'coordinator';
  const canConfigureLLM = canPerformAction(userRole, 'configure_llm');
  const canBackup = canPerformAction(userRole, 'backup_restore');

  const [llmEndpoint, setLlmEndpoint] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const endpoint = await appClient.settings.get('llm_endpoint') || '';
      const apiKey = await appClient.settings.get('llm_api_key') || '';
      const model = await appClient.settings.get('llm_model') || '';
      setLlmEndpoint(endpoint);
      setLlmApiKey(apiKey);
      setLlmModel(model);

      if (endpoint && endpoint.includes('localhost:11434')) {
        fetchOllamaModels(endpoint);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchOllamaModels = async (endpoint) => {
    setLoadingModels(true);
    try {
      const baseUrl = endpoint.replace(/\/v1\/chat\/completions.*/, '');
      const response = await fetch(`${baseUrl}/api/tags`);
      const data = await response.json();
      setOllamaModels(data.models || []);
    } catch {
      setOllamaModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await appClient.settings.set('llm_endpoint', llmEndpoint);
      await appClient.settings.set('llm_api_key', llmApiKey);
      await appClient.settings.set('llm_model', llmModel);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (llmEndpoint.includes('localhost:11434')) {
        fetchOllamaModels(llmEndpoint);
      }

      try {
        await appClient.audit.log({
          action: 'settings_updated',
          entity: 'llm_config',
          severity: 'info',
          details: JSON.stringify({ endpoint: llmEndpoint, model: llmModel }),
        });
      } catch {}
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: 'Respond with exactly: {"status":"ok","message":"LLM connection successful"}',
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            message: { type: "string" },
          },
        },
      });

      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (parsed.status === 'ok' || parsed.message) {
        setTestResult({ success: true, message: parsed.message || 'Connection successful!' });
      } else if (parsed.confidence_score === 0) {
        setTestResult({ success: false, message: 'No LLM endpoint configured. Enter an endpoint URL and save first.' });
      } else {
        setTestResult({ success: true, message: `LLM responded. Model is working.` });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const setOllamaDefaults = () => {
    setLlmEndpoint('http://localhost:11434/v1/chat/completions');
    setLlmApiKey('');
    setLlmModel('llama3.1:8b');
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
          <p className="text-sm" style={{ color: '#60A5FA', opacity: 0.7 }}>Configure AI, backups, and system preferences</p>
        </div>
      </div>

      {canConfigureLLM && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border" style={{ backgroundColor: '#111827', borderColor: '#1E3A5F' }}>
            <CardHeader className="border-b" style={{ borderColor: '#1E3A5F' }}>
              <CardTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
                <Cpu className="w-5 h-5" />
                AI / LLM Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="p-4 rounded-lg border" style={{ backgroundColor: '#0D1B2A', borderColor: '#1E3A5F' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#60A5FA' }}>Quick Setup</h3>
                <p className="text-xs mb-3" style={{ color: '#93C5FD' }}>
                  Choose a provider to auto-fill the settings below. Ollama is recommended for fully offline operation.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={setOllamaDefaults}
                    className="text-xs"
                    style={{ backgroundColor: '#1E3A5F', color: '#60A5FA', borderColor: '#60A5FA' }}
                  >
                    <Cpu className="w-3 h-3 mr-1" /> Ollama (Local)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setLlmEndpoint('https://api.openai.com/v1/chat/completions'); setLlmModel('gpt-4o'); }}
                    className="text-xs"
                    variant="outline"
                    style={{ color: '#60A5FA', borderColor: '#374151' }}
                  >
                    OpenAI
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setLlmEndpoint('http://localhost:1234/v1/chat/completions'); setLlmModel(''); }}
                    className="text-xs"
                    variant="outline"
                    style={{ color: '#60A5FA', borderColor: '#374151' }}
                  >
                    LM Studio
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium" style={{ color: '#60A5FA' }}>API Endpoint URL</Label>
                  <Input
                    value={llmEndpoint}
                    onChange={(e) => setLlmEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/v1/chat/completions"
                    className="mt-1 font-mono text-sm"
                    style={{ backgroundColor: '#0D1B2A', color: '#E5E7EB', borderColor: '#374151' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                    OpenAI-compatible chat completions endpoint
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium" style={{ color: '#60A5FA' }}>API Key (optional for Ollama)</Label>
                  <Input
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder="sk-... (leave empty for local models)"
                    className="mt-1 font-mono text-sm"
                    style={{ backgroundColor: '#0D1B2A', color: '#E5E7EB', borderColor: '#374151' }}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium" style={{ color: '#60A5FA' }}>Model Name</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder="llama3.1:8b"
                      className="font-mono text-sm"
                      style={{ backgroundColor: '#0D1B2A', color: '#E5E7EB', borderColor: '#374151' }}
                    />
                    {llmEndpoint.includes('localhost:11434') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchOllamaModels(llmEndpoint)}
                        disabled={loadingModels}
                        style={{ color: '#60A5FA', borderColor: '#374151' }}
                      >
                        {loadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                      </Button>
                    )}
                  </div>

                  {ollamaModels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs" style={{ color: '#6B7280' }}>Available:</span>
                      {ollamaModels.map((m) => (
                        <button
                          key={m.name}
                          onClick={() => setLlmModel(m.name)}
                          className="px-2 py-0.5 rounded text-xs border transition-colors"
                          style={{
                            backgroundColor: llmModel === m.name ? '#1E3A5F' : 'transparent',
                            color: llmModel === m.name ? '#60A5FA' : '#93C5FD',
                            borderColor: llmModel === m.name ? '#60A5FA' : '#374151',
                          }}
                        >
                          {m.name} {m.size ? `(${(m.size / 1e9).toFixed(1)}GB)` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ backgroundColor: '#60A5FA', color: '#000000' }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !llmEndpoint}
                  style={{ color: '#60A5FA', borderColor: '#374151' }}
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Cpu className="w-4 h-4 mr-2" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                {saved && (
                  <Badge className="flex items-center gap-1" style={{ backgroundColor: '#065F46', color: '#34D399' }}>
                    <CheckCircle className="w-3 h-3" /> Saved
                  </Badge>
                )}
              </div>

              {testResult && (
                <div
                  className="p-3 rounded-lg border flex items-start gap-2"
                  style={{
                    backgroundColor: testResult.success ? '#064E3B' : '#7F1D1D',
                    borderColor: testResult.success ? '#059669' : '#DC2626',
                  }}
                >
                  {testResult.success
                    ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#34D399' }} />
                    : <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#FCA5A5' }} />}
                  <div>
                    <p className="text-sm font-medium" style={{ color: testResult.success ? '#34D399' : '#FCA5A5' }}>
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: testResult.success ? '#6EE7B7' : '#FECACA' }}>
                      {testResult.message}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

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
              <InfoRow label="Environment" value={typeof window !== 'undefined' && window.electronAPI ? 'Electron (Desktop)' : 'Browser (Dev)'} />
              <InfoRow label="Storage" value={typeof window !== 'undefined' && window.electronAPI?.db ? 'Encrypted SQLite' : 'localStorage (Dev)'} />
              <InfoRow label="Encryption" value={typeof window !== 'undefined' && window.electronAPI?.db ? 'AES-256-GCM' : 'None (Dev)'} />
              <InfoRow label="Auth" value={typeof window !== 'undefined' && window.electronAPI?.db ? 'Bcrypt + Sessions' : 'Local Hash'} />
              <InfoRow label="Your Role" value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {!canConfigureLLM && (
        <div className="p-4 rounded-lg border text-center" style={{ backgroundColor: '#1F2937', borderColor: '#374151' }}>
          <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: '#F59E0B' }} />
          <p className="text-sm" style={{ color: '#F59E0B' }}>
            AI and backup settings require Admin or IT role permissions.
          </p>
        </div>
      )}
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
