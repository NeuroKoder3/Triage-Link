import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseExcelFile(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheets = {};
  const allRows = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    sheets[sheetName] = rows;
    allRows.push(...rows);
  }

  const textRepresentation = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `--- Sheet: ${name} ---\n${csv}`;
  }).join('\n\n');

  return {
    type: 'xlsx',
    fileName: file.name,
    text: textRepresentation,
    structured: allRows,
    sheets,
    sheetNames: workbook.SheetNames,
  };
}

export async function parsePdfFile(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push(text);
  }

  return {
    type: 'pdf',
    fileName: file.name,
    text: pages.join('\n\n'),
    pageCount: pdf.numPages,
    pages,
  };
}

export async function parseDocxFile(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });

  return {
    type: 'docx',
    fileName: file.name,
    text: result.value,
    warnings: result.messages,
  };
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  switch (ext) {
    case 'xlsx':
    case 'xls':
      return parseExcelFile(file);
    case 'pdf':
      return parsePdfFile(file);
    case 'docx':
    case 'doc':
      return parseDocxFile(file);
    default:
      throw new Error(`Unsupported file type: .${ext}. Please upload .xlsx, .pdf, or .docx files.`);
  }
}

export const ACCEPTED_FILE_TYPES = '.xlsx,.xls,.pdf,.docx,.doc';

export const FILE_TYPE_LABELS = {
  xlsx: 'Excel Spreadsheet',
  xls: 'Excel Spreadsheet',
  pdf: 'PDF Document',
  docx: 'Word Document',
  doc: 'Word Document',
};

const COLUMN_MAPPINGS = {
  complaint_category: [
    'complaint', 'complaint_category', 'complaint category', 'category',
    'condition', 'symptom', 'symptoms', 'reason', 'reason for call',
    'chief complaint', 'presenting complaint', 'diagnosis', 'issue',
    'problem', 'concern', 'type', 'call type', 'call reason',
  ],
  trigger_criteria: [
    'trigger', 'trigger_criteria', 'trigger criteria', 'criteria',
    'threshold', 'alert', 'alert threshold', 'when to page',
    'when to call', 'condition', 'parameters', 'vital signs',
    'critical values', 'critical value', 'lab values', 'lab value',
  ],
  action_required: [
    'action', 'action_required', 'action required', 'actions',
    'paging', 'paging instructions', 'instructions', 'response',
    'who to page', 'who to call', 'page', 'route', 'routing',
    'paging route', 'disposition', 'what to do', 'protocol',
    'procedure', 'steps', 'notification', 'notify',
  ],
  contact_method: [
    'contact method', 'contact_method', 'method', 'how to contact',
    'communication', 'notification method', 'page type',
  ],
  contact_info: [
    'contact', 'contact_info', 'contact info', 'phone', 'pager',
    'pager number', 'phone number', 'number', 'extension', 'ext',
    'email', 'contact number', 'paging number',
  ],
  escalation_path: [
    'escalation', 'escalation_path', 'escalation path', 'escalate',
    'if no response', 'backup', 'secondary', 'secondary contact',
    'follow up', 'follow-up', 'failover',
  ],
  priority: [
    'priority', 'urgency', 'severity', 'level', 'urgency level',
    'triage level', 'acuity', 'class',
  ],
  patient_type: [
    'patient type', 'patient_type', 'patient', 'patient category',
    'population', 'pre/post', 'transplant status',
  ],
  organ_type: [
    'organ', 'organ type', 'organ_type', 'transplant type',
    'organ system',
  ],
  documentation_notes: [
    'notes', 'documentation', 'documentation_notes', 'documentation notes',
    'comments', 'remarks', 'additional info', 'additional information',
    'details', 'special instructions',
  ],
};

function normalizeHeader(header) {
  return String(header).toLowerCase().trim().replace(/[_\-/\\]+/g, ' ').replace(/\s+/g, ' ');
}

function mapColumnsToFields(headers) {
  const mapping = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const nh = normalizedHeaders[i];
      if (aliases.includes(nh) || aliases.some(a => nh.includes(a) || a.includes(nh))) {
        if (!mapping[field]) {
          mapping[field] = headers[i];
        }
      }
    }
  }

  return mapping;
}

function inferPriority(text) {
  const lower = (text || '').toLowerCase();
  if (/\b(emergency|stat|critical|life.?threatening|code\s*(blue|red))\b/.test(lower)) return 'emergency';
  if (/\b(urgent|immediate|asap|high|always urgent)\b/.test(lower)) return 'urgent';
  return 'routine';
}

function inferContactMethod(text) {
  const lower = (text || '').toLowerCase();
  if (/\b(urgent\s*page|stat\s*page|emergency\s*page|911)\b/.test(lower)) return 'urgent_page';
  if (/\b(secure\s*page|page|pager|beeper)\b/.test(lower)) return 'secure_page';
  if (/\b(email|e-mail)\b/.test(lower)) return 'email';
  return 'phone';
}

function inferPatientType(text) {
  const lower = (text || '').toLowerCase();
  if (/\b(pre.?transplant|pre.?tx|listed|waiting|evaluation)\b/.test(lower)) return 'pre-transplant';
  if (/\b(post.?transplant|post.?tx|recipient|post.?op)\b/.test(lower)) return 'post-transplant';
  if (/\b(non.?transplant|general|other)\b/.test(lower)) return 'non-transplant';
  return '';
}

function inferOrganType(text) {
  const lower = (text || '').toLowerCase();
  if (/\bkidney.?(pancreas|&|and)\b/.test(lower)) return 'kidney-pancreas';
  if (/\bkidney|renal\b/.test(lower)) return 'kidney';
  if (/\bliver|hepatic\b/.test(lower)) return 'liver';
  if (/\bheart|cardiac\b/.test(lower)) return 'heart';
  return '';
}

export function extractRulesFromStructuredData(rows) {
  if (!rows || rows.length === 0) return { rules: [], summary: 'No data rows found.' };

  const headers = Object.keys(rows[0]);
  const columnMap = mapColumnsToFields(headers);

  const unmappedColumns = headers.filter(h =>
    !Object.values(columnMap).includes(h)
  );

  const hasUsefulMapping = Object.keys(columnMap).length >= 1;

  if (!hasUsefulMapping) {
    return extractRulesFromUnmappedRows(rows, headers);
  }

  const rules = [];
  for (const row of rows) {
    const getValue = (field) => {
      const col = columnMap[field];
      return col ? String(row[col] || '').trim() : '';
    };

    const complaint = getValue('complaint_category');
    const action = getValue('action_required');
    const trigger = getValue('trigger_criteria');

    if (!complaint && !action && !trigger) continue;

    const allText = Object.values(row).join(' ');

    rules.push({
      complaint_category: complaint || 'Imported Rule',
      trigger_criteria: trigger,
      action_required: action,
      contact_method: getValue('contact_method') || inferContactMethod(action || allText),
      contact_info: getValue('contact_info'),
      escalation_path: getValue('escalation_path'),
      priority: getValue('priority') || inferPriority(allText),
      patient_type: getValue('patient_type') || inferPatientType(allText),
      organ_type: getValue('organ_type') || inferOrganType(allText),
      documentation_notes: getValue('documentation_notes'),
    });
  }

  const mappedFields = Object.keys(columnMap).join(', ');
  return {
    rules,
    summary: `Extracted ${rules.length} rules from ${rows.length} rows (offline mode). Mapped columns: ${mappedFields}.`,
    hospital_name: '',
  };
}

function extractRulesFromUnmappedRows(rows, headers) {
  const rules = [];

  for (const row of rows) {
    const values = Object.values(row).map(v => String(v || '').trim()).filter(Boolean);
    if (values.length === 0) continue;

    const allText = values.join(' | ');

    const firstNonEmpty = values[0] || '';
    const secondVal = values[1] || '';
    const thirdVal = values[2] || '';

    if (firstNonEmpty.length < 2) continue;

    rules.push({
      complaint_category: firstNonEmpty,
      trigger_criteria: secondVal,
      action_required: thirdVal || values.slice(1).join(' — '),
      contact_method: inferContactMethod(allText),
      contact_info: '',
      escalation_path: '',
      priority: inferPriority(allText),
      patient_type: inferPatientType(allText),
      organ_type: inferOrganType(allText),
      documentation_notes: values.length > 3 ? values.slice(3).join('; ') : '',
    });
  }

  return {
    rules,
    summary: `Extracted ${rules.length} rules from ${rows.length} rows using positional mapping (offline mode). Columns: ${headers.join(', ')}.`,
    hospital_name: '',
  };
}

export function extractRulesFromText(text) {
  if (!text || text.trim().length === 0) return { rules: [], summary: 'No text content found.' };

  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const rules = [];
  let currentRule = null;

  const sectionPattern = /^(?:\d+[\.\)]\s*|[-•]\s*|[A-Z][A-Z\s]{2,}:)/;
  const kvPattern = /^([^:]{2,40}):\s*(.+)/;

  for (const line of lines) {
    if (sectionPattern.test(line) || (line.length > 10 && line.length < 200 && !line.includes(':'))) {
      if (currentRule && (currentRule.complaint_category || currentRule.action_required)) {
        rules.push(finalizeTextRule(currentRule));
      }
      currentRule = { _rawLines: [line] };

      const cleaned = line.replace(/^[\d.\-•)\s]+/, '').trim();
      currentRule.complaint_category = cleaned;
    } else if (kvPattern.test(line)) {
      if (!currentRule) currentRule = { _rawLines: [] };
      currentRule._rawLines.push(line);
      const [, key, value] = line.match(kvPattern);
      assignKeyValueToRule(currentRule, key.trim(), value.trim());
    } else if (currentRule) {
      currentRule._rawLines.push(line);
      if (!currentRule.action_required && line.length > 5) {
        currentRule.action_required = (currentRule.action_required || '') + ' ' + line;
      }
    }
  }

  if (currentRule && (currentRule.complaint_category || currentRule.action_required)) {
    rules.push(finalizeTextRule(currentRule));
  }

  if (rules.length === 0) {
    return extractRulesLineByLine(lines);
  }

  return {
    rules,
    summary: `Extracted ${rules.length} rules from text content (offline mode).`,
    hospital_name: '',
  };
}

function assignKeyValueToRule(rule, key, value) {
  const lk = key.toLowerCase();
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    if (aliases.some(a => lk.includes(a) || a.includes(lk))) {
      rule[field] = value;
      return;
    }
  }
  rule.documentation_notes = (rule.documentation_notes || '') + `${key}: ${value}; `;
}

function finalizeTextRule(rule) {
  const allText = (rule._rawLines || []).join(' ');
  delete rule._rawLines;
  return {
    complaint_category: rule.complaint_category || 'Imported Rule',
    trigger_criteria: rule.trigger_criteria || '',
    action_required: (rule.action_required || '').trim(),
    contact_method: rule.contact_method || inferContactMethod(allText),
    contact_info: rule.contact_info || '',
    escalation_path: rule.escalation_path || '',
    priority: rule.priority || inferPriority(allText),
    patient_type: rule.patient_type || inferPatientType(allText),
    organ_type: rule.organ_type || inferOrganType(allText),
    documentation_notes: (rule.documentation_notes || '').trim(),
  };
}

function extractRulesLineByLine(lines) {
  const rules = [];
  const medicalPattern = /\b(fever|pain|bleed|nausea|vomit|creatinine|potassium|blood pressure|bp|temp|swelling|infection|rejection|graft|transplant|kidney|liver|heart|page|call|notify|urgent|emergency|contact|escalat)/i;

  for (const line of lines) {
    if (line.length < 10 || !medicalPattern.test(line)) continue;

    rules.push({
      complaint_category: line.substring(0, 80),
      trigger_criteria: '',
      action_required: line.length > 80 ? line.substring(80) : line,
      contact_method: inferContactMethod(line),
      contact_info: '',
      escalation_path: '',
      priority: inferPriority(line),
      patient_type: inferPatientType(line),
      organ_type: inferOrganType(line),
      documentation_notes: '',
    });
  }

  return {
    rules,
    summary: `Extracted ${rules.length} potential rules by scanning for medical keywords (offline mode).`,
    hospital_name: '',
  };
}
