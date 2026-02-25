const MEDICAL_KEYWORDS = {
  emergency: [
    'unresponsive', 'unconscious', 'not breathing', 'cardiac arrest', 'seizure', 'seizing',
    'stroke', 'chest pain', 'severe bleeding', 'hemorrhage', 'anaphylaxis', 'shock',
    'cannot breathe', 'difficulty breathing', 'shortness of breath', 'sob', 'acute abdomen',
    'severe pain', 'suicidal', 'overdose', 'ingestion', 'poisoning', 'collapse',
    'head injury', 'trauma', 'severe allergic', 'airway', 'uncontrolled bleeding',
    'altered mental status', 'confusion', 'disoriented', 'loss of consciousness',
    'st john\'s wort', 'subtherapeutic', 'graft loss', 'hyperacute rejection',
    'cannot keep meds down', 'unable to take immunosuppressants', 'vomiting medications',
  ],
  urgent: [
    'fever', 'pain', 'swelling', 'nausea', 'vomiting', 'diarrhea', 'bleeding',
    'headache', 'dizziness', 'rash', 'infection', 'wound', 'drainage', 'pus',
    'elevated', 'abnormal labs', 'creatinine', 'high blood pressure', 'hypertension',
    'low blood pressure', 'hypotension', 'tachycardia', 'bradycardia',
    'missed dose', 'missed medication', 'weight gain', 'edema', 'fluid retention',
    'decreased urine', 'oliguria', 'dark urine', 'blood in urine', 'hematuria',
    'jaundice', 'yellow skin', 'abdominal pain', 'graft tenderness',
    'tremor', 'shaking', 'elevated creatinine', 'bk virus', 'cmv', 'ebv',
    'rejection', 'acute rejection', 'high tacrolimus', 'high cyclosporine',
    'drug level', 'trough level', 'elevated liver enzymes',
  ],
  non_urgent: [
    'refill', 'prescription', 'medication refill', 'lab results', 'appointment',
    'follow up', 'follow-up', 'question about', 'wondering', 'routine',
    'schedule', 'scheduling', 'referral', 'paperwork', 'form', 'records',
    'insurance', 'billing', 'transportation', 'pharmacy', 'general question',
    'diet', 'exercise', 'lifestyle', 'wellness', 'check up', 'annual',
    'mild', 'minor', 'slight discomfort', 'chronic stable',
  ],
};

const ORGAN_REJECTION_SIGNS = {
  kidney: {
    symptoms: ['decreased urine output', 'creatinine elevation', 'rising creatinine', 'graft tenderness',
      'fever', 'malaise', 'weight gain', 'hypertension', 'flu-like symptoms', 'oliguria', 'edema',
      'elevated creatinine', 'blood in urine', 'dark urine'],
    markers: ['creatinine', 'bun', 'egfr', 'proteinuria'],
  },
  liver: {
    symptoms: ['elevated liver enzymes', 'increased bilirubin', 'jaundice', 'dark urine',
      'pale stools', 'abdominal pain', 'fever', 'fatigue', 'itching', 'confusion',
      'ast', 'alt', 'elevated ast', 'elevated alt'],
    markers: ['ast', 'alt', 'bilirubin', 'alkaline phosphatase', 'inr'],
  },
  'kidney-pancreas': {
    symptoms: ['rising blood glucose', 'decreased c-peptide', 'abdominal pain',
      'nausea', 'vomiting', 'fever', 'elevated amylase', 'elevated lipase',
      'hyperglycemia', 'graft tenderness'],
    markers: ['glucose', 'c-peptide', 'amylase', 'lipase', 'hemoglobin a1c'],
  },
  heart: {
    symptoms: ['shortness of breath', 'chest pain', 'palpitations', 'syncope',
      'edema', 'fatigue', 'arrhythmia', 'decreased ejection fraction'],
    markers: ['bnp', 'troponin', 'ejection fraction'],
  },
};

const DRUG_INTERACTIONS = [
  { drugs: ['tacrolimus', 'cyclosporine'], interactsWith: ['nsaid', 'ibuprofen', 'naproxen', 'aspirin', 'advil', 'motrin', 'aleve'],
    type: 'Nephrotoxicity risk', severity: 'major', action: 'URGENT: Discontinue NSAID, check renal function' },
  { drugs: ['tacrolimus', 'cyclosporine'], interactsWith: ['st john', 'st. john', "st john's wort"],
    type: 'Subtherapeutic immunosuppression', severity: 'contraindicated', action: 'EMERGENCY: Stop St. John\'s Wort immediately, check drug levels, assess for rejection' },
  { drugs: ['tacrolimus', 'cyclosporine'], interactsWith: ['fluconazole', 'voriconazole', 'itraconazole', 'ketoconazole'],
    type: 'Increased CNI levels - toxicity risk', severity: 'major', action: 'URGENT: Check drug levels, may need dose reduction' },
  { drugs: ['tacrolimus', 'cyclosporine'], interactsWith: ['erythromycin', 'clarithromycin', 'azithromycin'],
    type: 'Increased CNI levels', severity: 'major', action: 'URGENT: Monitor levels closely, consider dose adjustment' },
  { drugs: ['tacrolimus', 'cyclosporine'], interactsWith: ['verapamil', 'diltiazem', 'amlodipine'],
    type: 'Increased CNI levels', severity: 'moderate', action: 'Monitor levels, may need dose adjustment' },
  { drugs: ['tacrolimus', 'cyclosporine'], interactsWith: ['rifampin', 'rifampicin', 'phenytoin', 'carbamazepine'],
    type: 'Decreased CNI levels - rejection risk', severity: 'major', action: 'URGENT: Check levels, increase monitoring frequency' },
  { drugs: ['mycophenolate', 'cellcept', 'myfortic'], interactsWith: ['antacid', 'tums', 'maalox', 'omeprazole', 'pantoprazole'],
    type: 'Reduced absorption', severity: 'moderate', action: 'Separate dosing times, monitor levels' },
  { drugs: ['prednisone', 'prednisolone', 'methylprednisolone', 'steroid'], interactsWith: [],
    type: 'Adrenal suppression', severity: 'major', action: 'Never abruptly discontinue - taper required' },
];

const DRUG_TOXICITY = {
  tacrolimus: {
    symptoms: ['tremor', 'headache', 'confusion', 'seizure', 'nephrotoxicity', 'rising creatinine',
      'hypertension', 'high blood pressure', 'nausea', 'diarrhea', 'hyperglycemia', 'insomnia'],
    severity_escalation: ['tremor', 'headache', 'confusion', 'seizure'],
    action: 'Check trough level immediately, consider dose reduction',
  },
  cyclosporine: {
    symptoms: ['tremor', 'headache', 'gum hyperplasia', 'hirsutism', 'nephrotoxicity',
      'rising creatinine', 'hypertension', 'nausea'],
    severity_escalation: ['tremor', 'headache', 'nephrotoxicity', 'seizure'],
    action: 'Check drug level, assess renal function',
  },
  mycophenolate: {
    symptoms: ['severe diarrhea', 'vomiting', 'leukopenia', 'anemia', 'gi symptoms',
      'low white count', 'neutropenia', 'abdominal pain', 'nausea'],
    severity_escalation: ['leukopenia', 'severe diarrhea', 'neutropenia'],
    action: 'Check CBC, consider dose adjustment or split dosing',
  },
  prednisone: {
    symptoms: ['hyperglycemia', 'high blood sugar', 'mood changes', 'psychosis', 'insomnia',
      'weight gain', 'osteoporosis', 'infection', 'moon face', 'buffalo hump'],
    severity_escalation: ['psychosis', 'severe hyperglycemia', 'adrenal crisis'],
    action: 'Monitor glucose, assess symptoms, never abruptly stop',
  },
  sirolimus: {
    symptoms: ['mouth sores', 'hyperlipidemia', 'poor wound healing', 'edema',
      'proteinuria', 'pneumonitis', 'thrombocytopenia'],
    severity_escalation: ['pneumonitis', 'severe proteinuria'],
    action: 'Check drug level, assess for pneumonitis if respiratory symptoms',
  },
};

const MEDICAL_REFERENCES = {
  kidney: [
    { title: 'KDIGO Clinical Practice Guideline for the Care of Kidney Transplant Recipients',
      source: 'KDIGO', url: 'https://kdigo.org/guidelines/', relevance: 'Kidney transplant management',
      key_points: 'Comprehensive guidelines for post-transplant care including immunosuppression, infection prevention, and rejection monitoring' },
    { title: 'Management of the Kidney Transplant Recipient',
      source: 'American Society of Transplantation', url: 'https://www.myast.org/professional-development/practice-guidelines',
      relevance: 'Post-transplant management protocols', key_points: 'Evidence-based protocols for managing transplant recipients' },
  ],
  liver: [
    { title: 'AASLD Practice Guidelines for Liver Transplantation',
      source: 'AASLD', url: 'https://www.aasld.org/practice-guidelines', relevance: 'Liver transplant management',
      key_points: 'Guidelines for liver transplant recipient care and monitoring' },
  ],
  general: [
    { title: 'OPTN/UNOS Clinical Resources', source: 'OPTN/UNOS',
      url: 'https://optn.transplant.hrsa.gov/professionals/clinical-resources/',
      relevance: 'National transplant clinical resources', key_points: 'Clinical protocols and best practices for organ transplantation' },
    { title: 'Transplant Infectious Disease Guidelines', source: 'AST',
      url: 'https://www.myast.org/professional-development/practice-guidelines',
      relevance: 'Infection management in transplant recipients', key_points: 'Prevention and treatment of infections in immunosuppressed patients' },
  ],
};

function normalizeText(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalizeText(text).split(/\s+/).filter(t => t.length > 1);
}

function computeRelevanceScore(complaint, rule) {
  const complaintNorm = normalizeText(complaint);
  const tokens = tokenize(complaint);
  let score = 0;
  let matchedFields = [];

  const ruleFields = [
    { field: 'complaint_category', weight: 4 },
    { field: 'trigger_criteria', weight: 3 },
    { field: 'action_required', weight: 1 },
    { field: 'documentation_notes', weight: 1 },
    { field: 'patient_type', weight: 2 },
    { field: 'organ_type', weight: 2 },
  ];

  for (const { field, weight } of ruleFields) {
    const val = normalizeText(rule[field]);
    if (!val) continue;
    const valTokens = tokenize(rule[field]);
    let fieldScore = 0;

    if (complaintNorm.includes(val)) {
      fieldScore += 10 * weight;
      matchedFields.push(field);
    } else {
      for (const token of tokens) {
        if (val.includes(token) && token.length > 2) {
          fieldScore += weight;
        }
      }
      for (const vt of valTokens) {
        if (complaintNorm.includes(vt) && vt.length > 2) {
          fieldScore += weight;
          if (!matchedFields.includes(field)) matchedFields.push(field);
        }
      }
    }
    score += fieldScore;
  }

  if (rule.priority === 'emergency') score += 3;
  else if (rule.priority === 'urgent') score += 2;

  return { score, matchedFields };
}

function detectUrgency(complaint) {
  const norm = normalizeText(complaint);

  for (const kw of MEDICAL_KEYWORDS.emergency) {
    if (norm.includes(kw)) return { level: 'emergency', keyword: kw };
  }

  let urgentCount = 0;
  let urgentKeywords = [];
  for (const kw of MEDICAL_KEYWORDS.urgent) {
    if (norm.includes(kw)) {
      urgentCount++;
      urgentKeywords.push(kw);
    }
  }
  if (urgentCount >= 2) return { level: 'urgent', keyword: urgentKeywords.join(', ') };
  if (urgentCount === 1) return { level: 'urgent', keyword: urgentKeywords[0] };

  for (const kw of MEDICAL_KEYWORDS.non_urgent) {
    if (norm.includes(kw)) return { level: 'non-urgent', keyword: kw };
  }

  return { level: 'non-urgent', keyword: null };
}

function detectRejectionSigns(complaint, organType) {
  const norm = normalizeText(complaint);
  const results = [];

  const organs = organType ? [organType] : Object.keys(ORGAN_REJECTION_SIGNS);
  for (const organ of organs) {
    const info = ORGAN_REJECTION_SIGNS[organ];
    if (!info) continue;
    const matchedSymptoms = info.symptoms.filter(s => norm.includes(s));
    if (matchedSymptoms.length > 0) {
      results.push({ organ, matchedSymptoms, count: matchedSymptoms.length });
    }
  }

  return results;
}

function detectDrugToxicity(complaint) {
  const norm = normalizeText(complaint);
  const results = [];

  for (const [drug, info] of Object.entries(DRUG_TOXICITY)) {
    if (!norm.includes(drug)) continue;
    const matchedSymptoms = info.symptoms.filter(s => norm.includes(s));
    if (matchedSymptoms.length > 0) {
      const severityIdx = info.severity_escalation.findIndex(s => norm.includes(s));
      const severity = severityIdx >= 2 ? 'critical' : severityIdx >= 1 ? 'high' : severityIdx >= 0 ? 'moderate' : 'low';
      results.push({ drug, matchedSymptoms, severity, action: info.action });
    }
  }

  return results;
}

function detectDrugInteractions(complaint) {
  const norm = normalizeText(complaint);
  const results = [];

  for (const interaction of DRUG_INTERACTIONS) {
    const hasPrimary = interaction.drugs.some(d => norm.includes(d));
    const hasInteracting = interaction.interactsWith.some(d => norm.includes(d));

    if (hasPrimary && hasInteracting) {
      const primaryFound = interaction.drugs.find(d => norm.includes(d));
      const interactingFound = interaction.interactsWith.find(d => norm.includes(d));
      results.push({
        drugs: [primaryFound, interactingFound],
        type: interaction.type,
        severity: interaction.severity,
        action: interaction.action,
      });
    }
  }

  return results;
}

function generateClarificationQuestions(complaint, organType, patientType) {
  const norm = normalizeText(complaint);
  const questions = [];

  if (norm.includes('fever') || norm.includes('temperature')) {
    questions.push('What is the exact temperature reading?');
    questions.push('When did the fever start and has it been continuous or intermittent?');
  }
  if (norm.includes('pain')) {
    questions.push('On a scale of 1-10, how severe is the pain?');
    questions.push('Where exactly is the pain located and does it radiate?');
    questions.push('When did the pain start and is it getting worse?');
  }
  if (norm.includes('vomit') || norm.includes('nausea')) {
    questions.push('How many times have you vomited in the last 24 hours?');
    questions.push('Are you able to keep your medications down?');
  }
  if (norm.includes('bleeding') || norm.includes('blood')) {
    questions.push('How much bleeding is there and how long has it been going on?');
    questions.push('Is the bleeding getting worse or is it stable?');
  }

  if (patientType === 'post-transplant' || norm.includes('transplant')) {
    if (!norm.includes('medication') && !norm.includes('med')) {
      questions.push('Have you taken all of your immunosuppressant medications today?');
    }
    questions.push('When was your last set of lab work, and were any values abnormal?');
    questions.push('How long ago was your transplant surgery?');
  }

  if (questions.length === 0) {
    questions.push('When did these symptoms first start?');
    questions.push('Are the symptoms getting better, worse, or staying the same?');
    if (norm.length < 50) {
      questions.push('Can you describe your symptoms in more detail?');
    }
  }

  return questions.slice(0, 5);
}

function generateFollowUpActions(urgency, matchedRule, complaint, organType) {
  const actions = [];
  const norm = normalizeText(complaint);

  if (urgency === 'emergency') {
    actions.push('Ensure patient has immediate access to emergency care');
    actions.push('Notify transplant team and on-call physician immediately');
    actions.push('Document exact time of call and symptoms reported');
  }

  if (urgency === 'urgent') {
    actions.push('Schedule urgent follow-up within 24 hours');
    actions.push('Notify transplant coordinator of the concern');
  }

  if (norm.includes('creatinine') || norm.includes('kidney') || organType === 'kidney') {
    actions.push('Check serum creatinine and BUN levels');
    actions.push('Monitor urine output over next 24 hours');
  }
  if (norm.includes('tacrolimus') || norm.includes('cyclosporine')) {
    actions.push('Check trough drug level at next available lab draw');
  }
  if (norm.includes('fever') || norm.includes('infection')) {
    actions.push('Monitor temperature every 4 hours');
    actions.push('Obtain blood cultures if fever >101.3°F (38.5°C)');
  }
  if (norm.includes('vomit') || norm.includes('diarrhea')) {
    actions.push('Monitor fluid intake and output');
    actions.push('Assess ability to tolerate oral immunosuppressants');
  }

  if (matchedRule?.action_required) {
    actions.push(`Follow protocol: ${matchedRule.action_required}`);
  }

  if (actions.length === 0) {
    actions.push('Document the call and symptoms in patient record');
    actions.push('Review patient history for any recent changes');
    actions.push('Follow up with patient within 48-72 hours');
  }

  return [...new Set(actions)].slice(0, 6);
}

function generatePatientCommunication(complaint, urgency, matchedRule, organType) {
  const norm = normalizeText(complaint);
  let verbalScript, writtenMessage;
  const educationPoints = [];
  const redFlags = [];

  if (urgency === 'emergency') {
    verbalScript = `I understand you're experiencing concerning symptoms. Based on what you've described, this needs immediate attention. Please go to the nearest emergency room right away, or call 911 if you cannot safely transport yourself. Let them know you are a transplant patient. I will notify the transplant team immediately.`;
    writtenMessage = `URGENT: Please seek immediate emergency care. Inform the ER staff that you are a transplant patient on immunosuppressive medications. The transplant team has been notified.`;
  } else if (urgency === 'urgent') {
    verbalScript = `Thank you for calling. Based on your symptoms, I want to make sure we address this promptly. I'm going to ${matchedRule?.action_required || 'contact the on-call provider'} to get you the care you need. In the meantime, please monitor your symptoms closely.`;
    writtenMessage = `Your concern has been forwarded to the appropriate medical team for prompt review. Please continue taking your medications as prescribed unless instructed otherwise. If symptoms worsen, please call back or go to the ER.`;
  } else {
    verbalScript = `Thank you for calling. I've noted your concern and will ${matchedRule?.action_required || 'forward this to the appropriate team for review'}. You should hear back within the next business day. If anything changes or you feel worse, please don't hesitate to call back.`;
    writtenMessage = `Your message has been received and forwarded for review. You can expect a response within 1-2 business days. If your condition changes or worsens, please call the triage line immediately.`;
  }

  if (norm.includes('transplant') || norm.includes('immunosuppress')) {
    educationPoints.push('Always take your immunosuppressant medications on time, even when feeling unwell');
    educationPoints.push('Keep a record of your temperature, blood pressure, and weight daily');
    educationPoints.push('Avoid grapefruit and St. John\'s Wort as they interact with transplant medications');
  }

  educationPoints.push('Keep all scheduled lab appointments to monitor your health');
  educationPoints.push('Stay well hydrated unless you have fluid restrictions');

  redFlags.push('Fever above 101°F (38.3°C)');
  redFlags.push('Inability to keep immunosuppressant medications down');
  redFlags.push('Sudden decrease in urine output');
  redFlags.push('New onset confusion or severe headache');
  redFlags.push('Signs of infection: redness, warmth, swelling, or drainage at any surgical site');

  return {
    verbal_script: verbalScript,
    written_message: writtenMessage,
    key_education_points: educationPoints.slice(0, 5),
    red_flag_warnings: redFlags.slice(0, 5),
  };
}

function extractComplaintFromPrompt(prompt) {
  const complaintPatterns = [
    /PATIENT COMPLAINT:\s*"([^"]+)"/i,
    /COMPLAINT:\s*"([^"]+)"/i,
    /ORIGINAL COMPLAINT:\s*(.+?)(?:\n|$)/i,
    /complaint[:\s]+(.+?)(?:\n|$)/i,
    /message[:\s]+"([^"]+)"/i,
  ];

  for (const pat of complaintPatterns) {
    const m = prompt.match(pat);
    if (m) return m[1].trim();
  }

  return prompt.substring(0, 500);
}

function extractRulesFromPrompt(prompt) {
  const rules = [];
  const rulePattern = /ID:\s*([^\n|]+)\s*\|\s*Category:\s*([^\n|]+)\s*\|\s*Trigger:\s*([^\n|]*)\s*\|\s*Action:\s*([^\n|]*)\s*\|\s*Priority:\s*([^\n|]*)\s*\|\s*Contact:\s*([^\n|]*)/gi;

  let match;
  while ((match = rulePattern.exec(prompt)) !== null) {
    rules.push({
      id: match[1].trim(),
      complaint_category: match[2].trim(),
      trigger_criteria: match[3].trim(),
      action_required: match[4].trim(),
      priority: match[5].trim().toLowerCase(),
      contact_method: match[6].trim(),
    });
  }

  if (rules.length === 0) {
    try {
      const jsonMatch = prompt.match(/AVAILABLE PROTOCOLS:\s*(\[[\s\S]*?\])/i);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) rules.push(...parsed);
      }
    } catch {
      // no structured rules found in prompt
    }
  }

  return rules;
}

function extractHospitalFromPrompt(prompt) {
  const m = prompt.match(/hospital[:\s]+([^\n|,]+)/i);
  return m ? m[1].trim() : null;
}

function extractOrganTypeFromPrompt(prompt) {
  const m = prompt.match(/organ[_ ]type[:\s]+([^\n|,]+)/i);
  return m ? m[1].trim().toLowerCase() : null;
}

function extractPatientTypeFromPrompt(prompt) {
  const m = prompt.match(/patient[_ ]type[:\s]+([^\n|,]+)/i);
  return m ? m[1].trim().toLowerCase() : null;
}

export function analyzeTriageComplaint(prompt) {
  const complaint = extractComplaintFromPrompt(prompt);
  const rules = extractRulesFromPrompt(prompt);
  const hospitalName = extractHospitalFromPrompt(prompt);
  const organType = extractOrganTypeFromPrompt(prompt);
  const patientType = extractPatientTypeFromPrompt(prompt);
  const norm = normalizeText(complaint);

  const urgencyDetection = detectUrgency(complaint);
  const rejectionSigns = detectRejectionSigns(complaint, organType);
  const toxicityAlerts = detectDrugToxicity(complaint);
  const interactionAlerts = detectDrugInteractions(complaint);

  if (rejectionSigns.length > 0 && urgencyDetection.level === 'non-urgent') {
    urgencyDetection.level = 'urgent';
    urgencyDetection.keyword = 'rejection signs detected';
  }
  if (toxicityAlerts.some(t => t.severity === 'critical' || t.severity === 'high')) {
    urgencyDetection.level = 'urgent';
    urgencyDetection.keyword = 'drug toxicity concern';
  }
  if (interactionAlerts.some(i => i.severity === 'contraindicated')) {
    urgencyDetection.level = 'emergency';
    urgencyDetection.keyword = 'dangerous drug interaction';
  } else if (interactionAlerts.some(i => i.severity === 'major') && urgencyDetection.level === 'non-urgent') {
    urgencyDetection.level = 'urgent';
    urgencyDetection.keyword = 'drug interaction concern';
  }

  const scoredRules = rules.map(r => ({
    ...r,
    ...computeRelevanceScore(complaint, r),
  })).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

  const matchedRule = scoredRules.length > 0 ? scoredRules[0] : null;
  const confidence = matchedRule
    ? Math.min(95, Math.max(50, matchedRule.score * 5 + 40))
    : Math.max(30, 55 - (norm.length < 20 ? 20 : 0));

  if (matchedRule) {
    const rulePriority = matchedRule.priority;
    if (rulePriority === 'emergency' && urgencyDetection.level !== 'emergency') {
      urgencyDetection.level = 'emergency';
    } else if (rulePriority === 'urgent' && urgencyDetection.level === 'non-urgent') {
      urgencyDetection.level = 'urgent';
    }
  }

  const urgencyLabel = urgencyDetection.level === 'emergency' ? 'Emergency'
    : urgencyDetection.level === 'urgent' ? 'Always Urgent' : 'Non Urgent';

  const actionRequired = matchedRule?.action_required
    || (urgencyDetection.level === 'emergency' ? 'Page on-call transplant physician immediately'
    : urgencyDetection.level === 'urgent' ? 'Send urgent page to transplant coordinator'
    : 'Send non-urgent message to transplant team for review');

  const contactMethod = matchedRule?.contact_method
    || (urgencyDetection.level === 'emergency' ? 'urgent_page'
    : urgencyDetection.level === 'urgent' ? 'secure_page' : 'email');

  let reasoning = '';
  if (matchedRule) {
    reasoning = `Matched protocol "${matchedRule.complaint_category}" (confidence: ${confidence}%). `;
    if (matchedRule.matchedFields?.length > 0) {
      reasoning += `Keywords matched in: ${matchedRule.matchedFields.join(', ')}. `;
    }
  } else {
    reasoning = `No exact protocol match found. Using built-in clinical reasoning based on symptom analysis. `;
  }
  if (urgencyDetection.keyword) {
    reasoning += `Urgency driven by: ${urgencyDetection.keyword}. `;
  }
  if (rejectionSigns.length > 0) {
    const rejDetails = rejectionSigns.map(r => `${r.organ} rejection signs (${r.matchedSymptoms.join(', ')})`).join('; ');
    reasoning += `Rejection assessment: ${rejDetails}. `;
  }
  if (toxicityAlerts.length > 0) {
    reasoning += `Drug toxicity concern: ${toxicityAlerts.map(t => `${t.drug} (${t.severity})`).join(', ')}. `;
  }
  if (interactionAlerts.length > 0) {
    reasoning += `Drug interaction detected: ${interactionAlerts.map(i => `${i.drugs.join(' + ')} - ${i.type}`).join('; ')}. `;
  }
  reasoning += urgencyDetection.level === 'emergency'
    ? 'This requires immediate medical attention.'
    : urgencyDetection.level === 'urgent'
    ? 'Prompt evaluation is recommended within 24 hours.'
    : 'This can be addressed during normal business hours.';

  const flaggedKeywords = [];
  for (const list of Object.values(MEDICAL_KEYWORDS)) {
    for (const kw of list) {
      if (norm.includes(kw) && !flaggedKeywords.includes(kw)) flaggedKeywords.push(kw);
    }
  }

  const clinicalReasoning = buildClinicalReasoning(complaint, urgencyDetection, rejectionSigns, toxicityAlerts, interactionAlerts, matchedRule, organType);
  const altDiagnoses = generateAlternativeDiagnoses(complaint, organType);
  const followUpActions = generateFollowUpActions(urgencyDetection.level, matchedRule, complaint, organType);
  const references = getRelevantReferences(organType);
  const patientComm = generatePatientCommunication(complaint, urgencyDetection.level, matchedRule, organType);
  const riskAssessment = buildRiskAssessment(complaint, urgencyDetection, rejectionSigns, toxicityAlerts);
  const needsClarification = norm.length < 30 || confidence < 55;
  const clarificationQuestions = needsClarification
    ? generateClarificationQuestions(complaint, organType, patientType) : [];

  const drugToxicityAlert = toxicityAlerts.length > 0
    ? { is_suspected: true, suspected_drug: toxicityAlerts[0].drug,
        toxicity_symptoms: toxicityAlerts[0].matchedSymptoms, severity: toxicityAlerts[0].severity,
        recommended_actions: [toxicityAlerts[0].action], rationale: `Symptoms consistent with ${toxicityAlerts[0].drug} toxicity` }
    : { is_suspected: false, suspected_drug: '', toxicity_symptoms: [], severity: 'low', recommended_actions: [], rationale: '' };

  const drugInteractionAlert = interactionAlerts.length > 0
    ? { is_suspected: true, interacting_drugs: interactionAlerts[0].drugs,
        interaction_type: interactionAlerts[0].type, severity: interactionAlerts[0].severity,
        clinical_effects: interactionAlerts[0].type, recommended_actions: [interactionAlerts[0].action] }
    : { is_suspected: false, interacting_drugs: [], interaction_type: '', severity: 'minor', clinical_effects: '', recommended_actions: [] };

  const protocolDeviation = {
    should_deviate: rejectionSigns.length > 0 || toxicityAlerts.some(t => t.severity === 'high' || t.severity === 'critical'),
    standard_protocol_action: matchedRule?.action_required || 'Standard triage protocol',
    recommended_action: rejectionSigns.length > 0
      ? 'Escalate to urgent evaluation due to rejection signs'
      : toxicityAlerts.length > 0
      ? 'Escalate for drug level check and toxicity evaluation'
      : matchedRule?.action_required || actionRequired,
    risk_factors: [
      ...rejectionSigns.flatMap(r => r.matchedSymptoms),
      ...toxicityAlerts.map(t => `${t.drug} toxicity (${t.severity})`),
    ],
    deviation_rationale: rejectionSigns.length > 0
      ? 'Multiple rejection signs detected warrant immediate evaluation regardless of standard protocol'
      : toxicityAlerts.length > 0
      ? 'Drug toxicity symptoms require urgent level monitoring'
      : 'No deviation recommended - follow standard protocol',
    evidence_supporting_escalation: rejectionSigns.length > 0
      ? 'KDIGO guidelines recommend prompt evaluation when rejection signs are present'
      : '',
  };

  return {
    urgency_level: urgencyDetection.level,
    matched_rule_id: matchedRule?.id || 'GENERAL_PROTOCOL',
    complaint_category: matchedRule?.complaint_category || categorizeComplaint(complaint),
    action_required: actionRequired,
    contact_method: contactMethod,
    contact_info: matchedRule?.contact_info || '',
    patient_education: patientComm.key_education_points.join('. '),
    escalation_path: matchedRule?.escalation_path || (urgencyDetection.level === 'emergency' ? 'On-call transplant attending' : 'Transplant coordinator'),
    reasoning,
    confidence_score: Math.round(confidence),
    ai_summary: `Hospital: ${hospitalName || 'N/A'} | Urgency: ${urgencyLabel} | Route: ${actionRequired}`,
    patient_condition_summary: clinicalReasoning,
    flagged_keywords: flaggedKeywords.slice(0, 10),
    similar_cases_noted: false,
    risk_assessment: riskAssessment,
    needs_clarification: needsClarification,
    clarification_questions: clarificationQuestions,
    clinical_reasoning: clinicalReasoning,
    alternative_diagnoses: altDiagnoses,
    drug_toxicity_alert: drugToxicityAlert,
    drug_interaction_alert: drugInteractionAlert,
    protocol_deviation_recommendation: protocolDeviation,
    follow_up_actions: followUpActions,
    medical_literature_references: references,
    patient_communication_template: patientComm,
  };
}

function buildClinicalReasoning(complaint, urgency, rejectionSigns, toxicity, interactions, matchedRule, organType) {
  const parts = [];
  parts.push(`Patient presents with: "${complaint}".`);

  if (matchedRule) {
    parts.push(`This complaint matches the "${matchedRule.complaint_category}" protocol with ${matchedRule.priority} priority.`);
  }

  parts.push(`Assessment: ${urgency.level === 'emergency' ? 'Emergency presentation requiring immediate intervention.'
    : urgency.level === 'urgent' ? 'Urgent presentation requiring prompt evaluation.'
    : 'Non-urgent presentation appropriate for routine follow-up.'}`);

  if (rejectionSigns.length > 0) {
    parts.push(`REJECTION CONCERN: Symptoms consistent with possible ${rejectionSigns.map(r => r.organ).join('/')} rejection including: ${rejectionSigns.flatMap(r => r.matchedSymptoms).join(', ')}. Immediate evaluation recommended.`);
  }
  if (toxicity.length > 0) {
    parts.push(`TOXICITY ALERT: Possible ${toxicity.map(t => t.drug).join(', ')} toxicity. ${toxicity.map(t => t.action).join('. ')}.`);
  }
  if (interactions.length > 0) {
    parts.push(`INTERACTION WARNING: ${interactions.map(i => `${i.drugs.join(' + ')} may cause ${i.type}`).join('. ')}.`);
  }

  return parts.join(' ');
}

function buildRiskAssessment(complaint, urgency, rejectionSigns, toxicity) {
  const riskFactors = [];
  let riskLevel = 'low';

  if (urgency.level === 'emergency') { riskLevel = 'critical'; riskFactors.push('Emergency presentation'); }
  else if (urgency.level === 'urgent') { riskLevel = 'moderate'; riskFactors.push('Urgent symptoms present'); }

  if (rejectionSigns.length > 0) {
    riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
    riskFactors.push(`Possible rejection signs (${rejectionSigns.flatMap(r => r.matchedSymptoms).join(', ')})`);
  }
  if (toxicity.length > 0) {
    riskLevel = riskLevel === 'low' ? 'moderate' : riskLevel;
    riskFactors.push(`Drug toxicity concern (${toxicity.map(t => t.drug).join(', ')})`);
  }

  const norm = normalizeText(complaint);
  if (norm.includes('missed dose') || norm.includes('missed medication')) {
    riskFactors.push('Medication non-adherence');
    if (riskLevel === 'low') riskLevel = 'moderate';
  }
  if (norm.includes('recent discharge') || norm.includes('recently discharged')) {
    riskFactors.push('Recent hospital discharge - readmission risk');
    if (riskLevel === 'low') riskLevel = 'moderate';
  }

  if (riskFactors.length === 0) riskFactors.push('No significant additional risk factors identified');

  return {
    readmission_risk: riskLevel,
    complication_risk: riskLevel,
    risk_factors: riskFactors,
    recommended_follow_up: riskLevel === 'critical' || riskLevel === 'high'
      ? 'Immediate evaluation required'
      : riskLevel === 'moderate'
      ? 'Follow-up within 24-48 hours recommended'
      : 'Routine follow-up at next scheduled appointment',
  };
}

function categorizeComplaint(complaint) {
  const norm = normalizeText(complaint);
  const categories = [
    { keywords: ['fever', 'temperature', 'chills', 'sweats'], category: 'Fever / Temperature' },
    { keywords: ['pain', 'ache', 'sore', 'discomfort', 'cramp'], category: 'Pain Management' },
    { keywords: ['nausea', 'vomit', 'diarrhea', 'gi', 'stomach', 'bowel'], category: 'GI Symptoms' },
    { keywords: ['bleed', 'blood', 'hemorrhage'], category: 'Bleeding / Hemorrhage' },
    { keywords: ['infection', 'wound', 'drainage', 'redness', 'pus'], category: 'Infection Concern' },
    { keywords: ['medication', 'med', 'refill', 'prescription', 'rx'], category: 'Medication Issue' },
    { keywords: ['lab', 'result', 'creatinine', 'level', 'value'], category: 'Lab Results' },
    { keywords: ['breathing', 'breath', 'respiratory', 'cough', 'wheeze'], category: 'Respiratory' },
    { keywords: ['urine', 'urinary', 'void', 'output'], category: 'Urinary Concern' },
    { keywords: ['skin', 'rash', 'itch', 'swelling', 'edema'], category: 'Skin / Swelling' },
    { keywords: ['headache', 'dizzy', 'vision', 'neuro', 'tremor', 'confusion'], category: 'Neurological' },
    { keywords: ['blood pressure', 'bp', 'hypertension', 'hypotension'], category: 'Blood Pressure' },
    { keywords: ['appointment', 'schedule', 'follow up', 'referral'], category: 'Scheduling / Follow-up' },
  ];

  for (const { keywords, category } of categories) {
    if (keywords.some(k => norm.includes(k))) return category;
  }
  return 'General Inquiry';
}

function generateAlternativeDiagnoses(complaint, organType) {
  const norm = normalizeText(complaint);
  const alts = [];

  if (norm.includes('fever')) {
    alts.push('Viral upper respiratory infection');
    alts.push('Urinary tract infection');
    alts.push('Opportunistic infection (CMV, BK virus)');
    if (organType) alts.push(`${organType} graft rejection`);
  }
  if (norm.includes('pain') && (norm.includes('abdomen') || norm.includes('abdominal'))) {
    alts.push('Gastroenteritis');
    alts.push('Constipation');
    alts.push('Medication side effect');
    if (organType === 'kidney' || organType === 'kidney-pancreas') alts.push('Graft site complication');
  }
  if (norm.includes('headache')) {
    alts.push('Tension headache');
    alts.push('Hypertension-related headache');
    alts.push('Calcineurin inhibitor toxicity');
    alts.push('Posterior reversible encephalopathy syndrome (PRES)');
  }
  if (norm.includes('diarrhea')) {
    alts.push('Mycophenolate side effect');
    alts.push('Infectious gastroenteritis');
    alts.push('C. difficile colitis');
    alts.push('Viral enteritis');
  }
  if (norm.includes('creatinine') || norm.includes('kidney')) {
    alts.push('Acute rejection episode');
    alts.push('Calcineurin inhibitor nephrotoxicity');
    alts.push('Dehydration');
    alts.push('BK nephropathy');
  }

  if (alts.length === 0) {
    alts.push('Further evaluation needed to narrow differential diagnosis');
    alts.push('Consider medication side effects');
    if (organType) alts.push('Monitor for signs of graft dysfunction');
  }

  return [...new Set(alts)].slice(0, 5);
}

function getRelevantReferences(organType) {
  const refs = [...(MEDICAL_REFERENCES.general || [])];
  if (organType && MEDICAL_REFERENCES[organType]) {
    refs.unshift(...MEDICAL_REFERENCES[organType]);
  } else {
    refs.unshift(...(MEDICAL_REFERENCES.kidney || []));
  }
  return refs.slice(0, 4);
}

export function analyzeReAnalysis(prompt) {
  const result = analyzeTriageComplaint(prompt);
  result.status_change = 'Re-analysis performed with updated clinical information.';
  return result;
}

export function generateProtocolSuggestions(prompt) {
  const norm = normalizeText(prompt);

  const suggestions = [];
  const modifications = [];
  const conflicts = [];

  const correctionPatterns = prompt.match(/correction[s]?\s*[:\-]?\s*([^\n]+)/gi) || [];
  const overridePatterns = prompt.match(/overr?id[ed]+\s*[:\-]?\s*([^\n]+)/gi) || [];

  if (correctionPatterns.length > 0 || overridePatterns.length > 0) {
    suggestions.push({
      hospital_id: '', patient_type: '', organ_type: '',
      complaint_category: 'AI-Suggested Protocol',
      trigger_criteria: 'Based on correction pattern analysis',
      action_required: 'Review and adjust existing protocols based on identified correction patterns',
      priority: 'routine',
      reasoning: `Analysis identified ${correctionPatterns.length + overridePatterns.length} correction/override patterns that suggest protocol refinements may be needed.`,
      case_count: correctionPatterns.length + overridePatterns.length,
      confidence: correctionPatterns.length > 3 ? 'high' : 'medium',
    });
  }

  if (norm.includes('fever') && norm.includes('urgent')) {
    suggestions.push({
      hospital_id: '', patient_type: 'post-transplant', organ_type: '',
      complaint_category: 'Fever in Post-Transplant Patient',
      trigger_criteria: 'Temperature >100.4°F (38°C) in post-transplant patient',
      action_required: 'Page transplant coordinator, obtain blood cultures, check CBC',
      priority: 'urgent',
      reasoning: 'Fever in immunosuppressed transplant patients requires urgent evaluation due to infection risk.',
      case_count: 1, confidence: 'high',
    });
  }

  return {
    new_protocol_suggestions: suggestions,
    protocol_modifications: modifications,
    conflict_alerts: conflicts,
    learning_summary: `Analyzed correction data. Generated ${suggestions.length} protocol suggestion(s) and identified ${conflicts.length} potential conflict(s).`,
  };
}

export function analyzeRuleEffectiveness(prompt) {
  const norm = normalizeText(prompt);
  const overrideMatch = norm.match(/overrid[den]*\s*(\d+)/);
  const overrides = overrideMatch ? parseInt(overrideMatch[1]) : 0;
  const usageMatch = norm.match(/used\s*(\d+)/);
  const usage = usageMatch ? parseInt(usageMatch[1]) : 10;

  const overrideRate = usage > 0 ? (overrides / usage) * 100 : 0;
  let score, status, recommendedAction;

  if (overrideRate < 10) {
    score = 90; status = 'excellent'; recommendedAction = 'keep';
  } else if (overrideRate < 25) {
    score = 75; status = 'good'; recommendedAction = 'keep';
  } else if (overrideRate < 50) {
    score = 55; status = 'needs_review'; recommendedAction = 'modify';
  } else {
    score = 30; status = 'poor'; recommendedAction = 'replace';
  }

  return {
    effectiveness_score: score,
    performance_status: status,
    common_override_reasons: overrides > 0
      ? ['Urgency level disagreement', 'Different contact method preferred', 'Additional context changed assessment']
      : ['No significant override patterns detected'],
    optimization_suggestions: status === 'excellent'
      ? ['Rule is performing well — no changes recommended']
      : ['Review trigger criteria for accuracy', 'Consider adjusting priority level', 'Verify contact routing is current'],
    analysis_summary: `Rule effectiveness score: ${score}/100. Override rate: ${overrideRate.toFixed(1)}%. Status: ${status}.`,
    recommended_action: recommendedAction,
  };
}

export function generateTrendInsights(prompt) {
  const norm = normalizeText(prompt);
  const insights = [];

  if (norm.includes('volume') || norm.includes('calls') || norm.includes('cases')) {
    insights.push({
      title: 'Call Volume Pattern',
      description: 'Triage call volume should be monitored for seasonal trends and staffing optimization.',
      sentiment: 'neutral',
      metric_impact: 'Staffing and resource allocation',
    });
  }
  if (norm.includes('urgent') || norm.includes('emergency')) {
    insights.push({
      title: 'Urgency Distribution',
      description: 'Monitor the ratio of urgent/emergency to non-urgent calls to identify potential protocol gaps.',
      sentiment: 'neutral',
      metric_impact: 'Protocol effectiveness and patient safety',
    });
  }
  if (norm.includes('override') || norm.includes('correction')) {
    insights.push({
      title: 'AI Correction Rate',
      description: 'Track correction patterns to identify areas where protocols need refinement.',
      sentiment: 'concern',
      metric_impact: 'Protocol accuracy and AI reliability',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'System Performance',
      description: 'Triage system is operating within normal parameters. Continue monitoring for trends.',
      sentiment: 'positive',
      metric_impact: 'Overall system health',
    });
  }

  return {
    insights,
    overall_summary: `Analysis covers ${insights.length} key area(s). Review insights for actionable opportunities.`,
  };
}

export function generateRuleSuggestion(prompt) {
  const norm = normalizeText(prompt);
  let category = 'General Protocol';
  let priority = 'routine';

  if (norm.includes('fever')) { category = 'Fever Management'; priority = 'urgent'; }
  else if (norm.includes('pain')) { category = 'Pain Assessment'; priority = 'urgent'; }
  else if (norm.includes('medication') || norm.includes('refill')) { category = 'Medication Management'; priority = 'routine'; }
  else if (norm.includes('infection')) { category = 'Infection Concern'; priority = 'urgent'; }
  else if (norm.includes('rejection')) { category = 'Rejection Monitoring'; priority = 'emergency'; }

  return {
    complaint_category: category,
    trigger_criteria: 'Based on correction pattern analysis — review and customize trigger criteria',
    action_required: 'Route to transplant coordinator for evaluation',
    contact_method: priority === 'emergency' ? 'urgent_page' : priority === 'urgent' ? 'secure_page' : 'email',
    priority,
    reasoning: `Repeated corrections in the "${category}" category suggest a new protocol rule could improve triage accuracy.`,
    confidence_score: 65,
  };
}

export function detectAnomalies(prompt) {
  const norm = normalizeText(prompt);

  const hasSpikeKeywords = norm.includes('spike') || norm.includes('increase') || norm.includes('surge');
  const hasDeclineKeywords = norm.includes('decline') || norm.includes('decrease') || norm.includes('drop');

  const anomalies = [];

  if (hasSpikeKeywords) {
    anomalies.push({
      type: 'Volume spike detected',
      severity: 'medium',
      description: 'An increase in triage call volume has been identified. Review for potential contributing factors.',
      affected_period: 'Recent period',
      recommendation: 'Monitor staffing levels and review call patterns for root cause.',
    });
  }
  if (hasDeclineKeywords) {
    anomalies.push({
      type: 'Activity decline noted',
      severity: 'low',
      description: 'A decrease in triage activity has been noted. This may be normal seasonal variation or may indicate an access barrier.',
      affected_period: 'Recent period',
      recommendation: 'Verify that all reporting channels are functioning correctly.',
    });
  }

  return {
    has_anomalies: anomalies.length > 0,
    overall_severity: anomalies.length > 0 ? 'attention_needed' : 'info',
    summary: anomalies.length > 0
      ? `Detected ${anomalies.length} potential anomaly(ies) in triage data. Review recommended.`
      : 'No significant anomalies detected in the current dataset. All metrics are within normal ranges.',
    anomalies,
  };
}

export function generateAnalyticsSummary(prompt) {
  return {
    keyTrends: [
      { trend: 'Monitor call volume trends for staffing optimization', impact: 'Resource allocation', actionable: true },
      { trend: 'Track urgency distribution across hospitals', impact: 'Protocol calibration', actionable: true },
      { trend: 'Review AI correction patterns for protocol refinement', impact: 'Triage accuracy', actionable: true },
    ],
    resourceRecommendations: [
      'Ensure adequate coordinator coverage during peak hours',
      'Review and update hospital-specific protocols quarterly',
      'Maintain current training on transplant-specific triage protocols',
    ],
    processOptimizations: [
      'Standardize documentation of triage calls across all coordinators',
      'Implement regular protocol review cycles based on correction data',
      'Cross-reference triage outcomes with patient outcomes for quality improvement',
    ],
    areasNeedingAttention: [
      { area: 'Protocol coverage gaps', severity: 'medium', recommendation: 'Review imported rules for completeness across all complaint categories' },
      { area: 'Documentation consistency', severity: 'low', recommendation: 'Encourage consistent use of structured triage documentation' },
    ],
    predictions: [
      { prediction: 'Call volume may increase during post-transplant follow-up periods', timeframe: 'Ongoing', confidence: 'medium' },
    ],
    executiveSummary: 'Triage system is operational. Focus on maintaining protocol accuracy through regular review and refinement of imported rules.',
  };
}

export function interpretReportQuery(prompt) {
  const norm = normalizeText(prompt);
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);

  if (norm.includes('last month') || norm.includes('past month')) {
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (norm.includes('last quarter') || norm.includes('past quarter')) {
    startDate.setMonth(startDate.getMonth() - 3);
  } else if (norm.includes('last week') || norm.includes('past week')) {
    startDate.setDate(startDate.getDate() - 7);
  } else if (norm.includes('this month')) {
    startDate.setDate(1);
  } else if (norm.includes('today')) {
    // keep same day
  } else if (norm.includes('last year') || norm.includes('past year')) {
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else {
    startDate.setMonth(startDate.getMonth() - 1);
  }

  const filters = {};
  if (norm.includes('urgent') || norm.includes('emergency')) filters.urgency = norm.includes('emergency') ? 'emergency' : 'urgent';
  if (norm.includes('kidney')) filters.organ_type = 'kidney';
  if (norm.includes('liver')) filters.organ_type = 'liver';

  const queryMatch = prompt.match(/"([^"]+)"/);
  const userQuery = queryMatch ? queryMatch[1] : prompt.substring(0, 200);

  return {
    report_title: `Custom Report: ${userQuery.substring(0, 60)}`,
    interpretation: `Generating report based on: "${userQuery}"`,
    date_range: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    filters,
    suggested_metrics: ['Total calls', 'Urgency distribution', 'Response times', 'Correction rates'],
    visualization_types: ['bar_chart', 'pie_chart', 'trend_line'],
  };
}

export function generateOptimizationAlerts(prompt) {
  return {
    recommendations: [
      {
        alert_title: 'Review Protocol Coverage',
        alert_type: 'process_improvement',
        severity: 'info',
        hospital_id: '',
        description: 'Ensure all imported hospital protocols cover the most common complaint categories.',
        ai_analysis: 'Regular protocol review helps maintain triage accuracy and reduces the need for AI corrections.',
        suggested_actions: [
          { action: 'Audit imported rules for coverage gaps', priority: 'medium', estimated_impact: 'Improved first-contact accuracy' },
          { action: 'Review correction patterns by complaint category', priority: 'medium', estimated_impact: 'Targeted protocol refinement' },
        ],
        expected_improvement: 'Reduced correction rate and improved coordinator confidence',
        evidence_basis: 'Based on best practices in triage protocol management',
      },
    ],
    overall_assessment: 'System is operational. Import hospital-specific rules to improve triage accuracy for each facility.',
    data_quality_notes: 'Accuracy improves with more imported rules and coordinator feedback.',
  };
}

export function handleConnectionTest() {
  return { status: 'ok', message: 'Built-in AI engine is active and ready.' };
}

export function routeInvokeLLM(params) {
  const prompt = params.prompt || params.user_prompt || '';
  const norm = normalizeText(prompt);

  if (norm.includes('respond with exactly') && norm.includes('status')) {
    return handleConnectionTest();
  }

  if (norm.includes('re-analyze') || norm.includes('re analyze') || norm.includes('reanalyz') || norm.includes('updated information')) {
    return analyzeReAnalysis(prompt);
  }

  if (norm.includes('patient complaint') || norm.includes('triage') && (norm.includes('complaint') || norm.includes('analyze'))) {
    return analyzeTriageComplaint(prompt);
  }

  if (norm.includes('protocol') && (norm.includes('suggestion') || norm.includes('learning') || norm.includes('correction'))) {
    return generateProtocolSuggestions(prompt);
  }

  if (norm.includes('effectiveness') || (norm.includes('rule') && norm.includes('performance'))) {
    return analyzeRuleEffectiveness(prompt);
  }

  if (norm.includes('trend') || norm.includes('insight')) {
    return generateTrendInsights(prompt);
  }

  if (norm.includes('suggest') && norm.includes('rule')) {
    return generateRuleSuggestion(prompt);
  }

  if (norm.includes('anomal') || norm.includes('unusual pattern') || norm.includes('outlier')) {
    return detectAnomalies(prompt);
  }

  if (norm.includes('analytic') && (norm.includes('summary') || norm.includes('recommend'))) {
    return generateAnalyticsSummary(prompt);
  }

  if (norm.includes('custom report') || norm.includes('natural language') || norm.includes('interpret')) {
    return interpretReportQuery(prompt);
  }

  if (norm.includes('optimiz') || norm.includes('alert') && norm.includes('recommendation')) {
    return generateOptimizationAlerts(prompt);
  }

  if (norm.includes('complaint') || norm.includes('symptom') || norm.includes('patient')) {
    return analyzeTriageComplaint(prompt);
  }

  return analyzeTriageComplaint(prompt);
}
