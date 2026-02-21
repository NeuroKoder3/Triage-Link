import React, { useState, useRef, useCallback } from "react";
import { appClient } from "@/api/appClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Sparkles,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Import,
  Eye,
  Trash2,
} from "lucide-react";
import { parseFile, ACCEPTED_FILE_TYPES, FILE_TYPE_LABELS } from "@/lib/fileParser";

const EXTRACTION_PROMPT = `You are an expert medical triage data extraction AI. Your task is to analyze a document containing transplant hospital criteria, paging rules, and triage protocols, then extract structured rules from it.

DOCUMENT CONTENT:
{DOCUMENT_TEXT}

INSTRUCTIONS:
1. Carefully read the entire document content above
2. Identify ALL triage rules, paging criteria, alert thresholds, escalation paths, and contact routing instructions
3. For each rule found, extract the structured fields listed below
4. If a field is not explicitly stated, infer it from context or mark it as empty
5. Pay special attention to: complaint categories, trigger criteria, paging numbers, escalation paths, urgency levels, organ types, patient types

Extract each rule as a JSON object. Return a JSON object with this exact structure:
{
  "rules": [
    {
      "complaint_category": "The complaint or condition category (e.g., Fever, Pain, Bleeding, Medication Issue)",
      "trigger_criteria": "Specific threshold or criteria that triggers this rule (e.g., Fever >100.5°F, Creatinine >2.0)",
      "action_required": "What action to take / who to page / routing instructions",
      "contact_method": "phone | secure_page | email | urgent_page",
      "contact_info": "Phone/pager number if mentioned",
      "escalation_path": "Who to escalate to if no response",
      "priority": "routine | urgent | emergency",
      "patient_type": "pre-transplant | post-transplant | non-transplant (if specified)",
      "organ_type": "kidney | liver | kidney-pancreas (if specified)",
      "documentation_notes": "Any required documentation or special instructions"
    }
  ],
  "hospital_name": "Name of the hospital if mentioned in the document",
  "summary": "Brief 2-3 sentence summary of what the document contains"
}

IMPORTANT:
- Extract EVERY rule you can find, even partial ones
- Use exact paging numbers and contact info from the document
- Preserve medical terminology exactly as written
- If the document has tabular data, treat each row as a potential rule
- Return valid JSON only`;

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['xlsx', 'xls'].includes(ext)) return <FileSpreadsheet className="w-8 h-8" style={{ color: '#10B981' }} />;
  if (ext === 'pdf') return <FileText className="w-8 h-8" style={{ color: '#EF4444' }} />;
  return <File className="w-8 h-8" style={{ color: '#3B82F6' }} />;
}

function getFileTypeLabel(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return FILE_TYPE_LABELS[ext] || 'Document';
}

export default function ImportRulesDialog({ open, onOpenChange, hospitals }) {
  const [file, setFile] = useState(null);
  const [parsedContent, setParsedContent] = useState(null);
  const [extractedRules, setExtractedRules] = useState(null);
  const [extractionSummary, setExtractionSummary] = useState(null);
  const [detectedHospital, setDetectedHospital] = useState(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [parseError, setParseError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState('upload'); // upload | preview | extracted | done
  const [selectedRules, setSelectedRules] = useState(new Set());
  const [showPreviewText, setShowPreviewText] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const resetState = useCallback(() => {
    setFile(null);
    setParsedContent(null);
    setExtractedRules(null);
    setExtractionSummary(null);
    setDetectedHospital(null);
    setSelectedHospitalId('');
    setParseError(null);
    setIsParsing(false);
    setIsExtracting(false);
    setIsImporting(false);
    setImportResult(null);
    setStep('upload');
    setSelectedRules(new Set());
    setShowPreviewText(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);

    try {
      const result = await parseFile(selectedFile);
      setParsedContent(result);
      setStep('preview');
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const ext = droppedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'pdf', 'docx', 'doc'].includes(ext)) {
      setParseError('Unsupported file type. Please upload .xlsx, .pdf, or .docx files.');
      return;
    }

    setFile(droppedFile);
    setParseError(null);
    setIsParsing(true);

    try {
      const result = await parseFile(droppedFile);
      setParsedContent(result);
      setStep('preview');
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleExtractRules = async () => {
    if (!parsedContent) return;

    setIsExtracting(true);
    setParseError(null);

    try {
      const docText = parsedContent.text.substring(0, 15000);
      const prompt = EXTRACTION_PROMPT.replace('{DOCUMENT_TEXT}', docText);

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            rules: { type: "array" },
            hospital_name: { type: "string" },
            summary: { type: "string" },
          },
        },
      });

      let parsed;
      try {
        parsed = typeof result === 'string' ? JSON.parse(result) : result;
      } catch {
        parsed = { rules: [], summary: 'Could not parse AI response. You may need to configure an LLM endpoint in Settings.', hospital_name: '' };
      }

      const rules = parsed.rules || [];
      setExtractedRules(rules);
      setExtractionSummary(parsed.summary || '');
      setDetectedHospital(parsed.hospital_name || null);
      setSelectedRules(new Set(rules.map((_, i) => i)));
      setStep('extracted');

      if (parsed.hospital_name && hospitals.length > 0) {
        const match = hospitals.find(h =>
          h.name.toLowerCase().includes(parsed.hospital_name.toLowerCase()) ||
          parsed.hospital_name.toLowerCase().includes(h.name.toLowerCase())
        );
        if (match) setSelectedHospitalId(match.id);
      }
    } catch (err) {
      setParseError(`AI extraction failed: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImportSelected = async () => {
    if (!extractedRules || selectedRules.size === 0) return;

    setIsImporting(true);
    let imported = 0;
    let failed = 0;

    try {
      const rulesToImport = extractedRules.filter((_, i) => selectedRules.has(i));

      for (const rule of rulesToImport) {
        try {
          await appClient.entities.TriageRule.create({
            hospital_id: selectedHospitalId || '',
            patient_type: rule.patient_type || '',
            organ_type: rule.organ_type || '',
            complaint_category: rule.complaint_category || 'Imported Rule',
            trigger_criteria: rule.trigger_criteria || '',
            action_required: rule.action_required || '',
            contact_method: rule.contact_method || 'phone',
            contact_info: rule.contact_info || '',
            escalation_path: rule.escalation_path || '',
            documentation_notes: rule.documentation_notes || '',
            priority: ['routine', 'urgent', 'emergency'].includes(rule.priority) ? rule.priority : 'routine',
            status: 'active',
            source: 'imported',
            source_file: file?.name || 'unknown',
          });
          imported++;
        } catch {
          failed++;
        }
      }

      setImportResult({ imported, failed, total: rulesToImport.length });
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['triageRules'] });
    } catch (err) {
      setParseError(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleRule = (index) => {
    setSelectedRules(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRules.size === extractedRules.length) {
      setSelectedRules(new Set());
    } else {
      setSelectedRules(new Set(extractedRules.map((_, i) => i)));
    }
  };

  const progressValue =
    step === 'upload' ? 0 :
    step === 'preview' ? 33 :
    step === 'extracted' ? 66 :
    100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: '#1F2937', borderColor: '#60A5FA' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#60A5FA' }}>
            <Import className="w-5 h-5" />
            Import Hospital Criteria & Paging Rules
          </DialogTitle>
          <DialogDescription style={{ color: '#93C5FD' }}>
            Upload an Excel, PDF, or Word document containing triage criteria and paging rules.
            The AI will extract and structure the rules automatically.
          </DialogDescription>
        </DialogHeader>

        <Progress value={progressValue} className="h-1.5 mt-2" />

        <div className="flex items-center gap-2 mt-1 mb-2">
          {['Upload File', 'Preview & Extract', 'Review Rules', 'Complete'].map((label, i) => (
            <div key={label} className="flex items-center gap-1 text-xs" style={{ color: progressValue >= (i * 33) ? '#60A5FA' : '#6B7280' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: progressValue >= (i * 33) ? '#60A5FA' : '#374151' }} />
              {label}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-blue-400"
                style={{ borderColor: '#60A5FA40' }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {isParsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#60A5FA' }} />
                    <p style={{ color: '#60A5FA' }}>Parsing file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-12 h-12" style={{ color: '#60A5FA' }} />
                    <div>
                      <p className="text-lg font-medium" style={{ color: '#60A5FA' }}>
                        Drop your file here or click to browse
                      </p>
                      <p className="text-sm mt-1" style={{ color: '#93C5FD' }}>
                        Supports Excel (.xlsx), PDF (.pdf), and Word (.docx) files
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#7F1D1D40', borderColor: '#EF444480' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
                  <p className="text-sm" style={{ color: '#FCA5A5' }}>{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && parsedContent && (
            <div className="space-y-4 py-4">
              <Card style={{ backgroundColor: '#374151', borderColor: '#60A5FA' }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.name)}
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: '#60A5FA' }}>{file.name}</p>
                      <p className="text-sm" style={{ color: '#93C5FD' }}>
                        {getFileTypeLabel(file.name)} &middot; {(file.size / 1024).toFixed(1)} KB
                        {parsedContent.pageCount && ` \u00B7 ${parsedContent.pageCount} pages`}
                        {parsedContent.sheetNames && ` \u00B7 ${parsedContent.sheetNames.length} sheet(s): ${parsedContent.sheetNames.join(', ')}`}
                        {parsedContent.structured && ` \u00B7 ${parsedContent.structured.length} rows`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowPreviewText(!showPreviewText)}>
                      <Eye className="w-4 h-4 mr-1" /> {showPreviewText ? 'Hide' : 'Preview'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {showPreviewText && (
                <Card style={{ backgroundColor: '#111827', borderColor: '#60A5FA40' }}>
                  <CardContent className="p-4">
                    <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto" style={{ color: '#93C5FD' }}>
                      {parsedContent.text.substring(0, 3000)}
                      {parsedContent.text.length > 3000 && '\n\n... (content truncated for preview)'}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#7F1D1D40' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
                  <p className="text-sm" style={{ color: '#FCA5A5' }}>{parseError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={resetState} style={{ borderColor: '#60A5FA' }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Remove File
                </Button>
                <Button
                  onClick={handleExtractRules}
                  disabled={isExtracting}
                  className="font-semibold"
                  style={{ backgroundColor: '#60A5FA', color: '#000' }}
                >
                  {isExtracting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Extracting Rules with AI...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Extract Rules with AI
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Extracted Rules Review */}
          {step === 'extracted' && extractedRules && (
            <div className="space-y-4 py-4">
              {extractionSummary && (
                <Card style={{ backgroundColor: '#374151', borderColor: '#60A5FA' }}>
                  <CardContent className="p-4">
                    <p className="text-sm" style={{ color: '#93C5FD' }}>
                      <Sparkles className="w-4 h-4 inline mr-1" style={{ color: '#60A5FA' }} />
                      {extractionSummary}
                    </p>
                    {detectedHospital && (
                      <p className="text-sm mt-1" style={{ color: '#60A5FA' }}>
                        Detected hospital: <strong>{detectedHospital}</strong>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: '#60A5FA' }}>
                    {extractedRules.length} rules extracted
                  </p>
                  <p className="text-sm" style={{ color: '#93C5FD' }}>
                    {selectedRules.size} selected for import
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAll} style={{ borderColor: '#60A5FA', color: '#60A5FA' }}>
                    {selectedRules.size === extractedRules.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              {/* Hospital assignment */}
              <Card style={{ backgroundColor: '#374151', borderColor: '#60A5FA' }}>
                <CardContent className="p-4">
                  <label className="text-sm font-medium block mb-2" style={{ color: '#60A5FA' }}>
                    Assign to Hospital (optional)
                  </label>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="w-full p-2 rounded border text-sm"
                    style={{ backgroundColor: '#1F2937', borderColor: '#60A5FA', color: '#60A5FA' }}
                  >
                    <option value="">-- No hospital selected --</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Rules list */}
              <div className="space-y-2">
                {extractedRules.map((rule, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer transition-all"
                    style={{
                      backgroundColor: selectedRules.has(index) ? '#374151' : '#1F293780',
                      borderColor: selectedRules.has(index) ? '#60A5FA' : '#37415180',
                      opacity: selectedRules.has(index) ? 1 : 0.6,
                    }}
                    onClick={() => toggleRule(index)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {selectedRules.has(index) ? (
                            <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: '#6B7280' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm" style={{ color: '#60A5FA' }}>
                              {rule.complaint_category || 'Uncategorized'}
                            </span>
                            {rule.priority && (
                              <Badge style={{
                                backgroundColor: rule.priority === 'emergency' ? '#FEE2E2' : rule.priority === 'urgent' ? '#FEF3C7' : '#DBEAFE',
                                color: rule.priority === 'emergency' ? '#991B1B' : rule.priority === 'urgent' ? '#92400E' : '#1E40AF',
                                fontSize: '0.65rem',
                              }}>
                                {rule.priority}
                              </Badge>
                            )}
                            {rule.patient_type && (
                              <Badge style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '0.65rem' }}>
                                {rule.patient_type}
                              </Badge>
                            )}
                            {rule.organ_type && (
                              <Badge style={{ backgroundColor: '#F0FDF4', color: '#166534', fontSize: '0.65rem' }}>
                                {rule.organ_type}
                              </Badge>
                            )}
                          </div>
                          {rule.trigger_criteria && (
                            <p className="text-xs mb-0.5" style={{ color: '#93C5FD' }}>
                              <strong>Trigger:</strong> {rule.trigger_criteria}
                            </p>
                          )}
                          {rule.action_required && (
                            <p className="text-xs" style={{ color: '#93C5FD' }}>
                              <strong>Action:</strong> {rule.action_required}
                            </p>
                          )}
                          {rule.contact_info && (
                            <p className="text-xs" style={{ color: '#93C5FD' }}>
                              <strong>Contact:</strong> {rule.contact_method} - {rule.contact_info}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {extractedRules.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#F59E0B' }} />
                  <p style={{ color: '#F59E0B' }}>No rules could be extracted from this document.</p>
                  <p className="text-sm mt-1" style={{ color: '#93C5FD' }}>
                    Make sure an LLM endpoint is configured in Settings, or try a different document.
                  </p>
                </div>
              )}

              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#7F1D1D40' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
                  <p className="text-sm" style={{ color: '#FCA5A5' }}>{parseError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setStep('preview')} style={{ borderColor: '#60A5FA' }}>
                  Back
                </Button>
                <Button
                  onClick={handleImportSelected}
                  disabled={selectedRules.size === 0 || isImporting}
                  className="font-semibold"
                  style={{ backgroundColor: '#10B981', color: '#fff' }}
                >
                  {isImporting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Importing {selectedRules.size} Rules...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Import className="w-4 h-4" /> Import {selectedRules.size} Rules
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 'done' && importResult && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto" style={{ color: '#10B981' }} />
              <h3 className="text-xl font-semibold" style={{ color: '#60A5FA' }}>Import Complete</h3>
              <div className="space-y-2">
                <p style={{ color: '#93C5FD' }}>
                  Successfully imported <strong style={{ color: '#10B981' }}>{importResult.imported}</strong> rules
                  {importResult.failed > 0 && (
                    <span> ({importResult.failed} failed)</span>
                  )}
                </p>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  From: {file?.name}
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={resetState}
                  style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                >
                  Import Another File
                </Button>
                <Button onClick={handleClose} style={{ backgroundColor: '#60A5FA', color: '#000' }}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
