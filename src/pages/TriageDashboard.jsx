import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import TriageFlowSelector from "../components/triage/TriageFlowSelector";
import TriageInstructions from "../components/triage/TriageInstructions";
import AIAnalysisResult from "../components/triage/AIAnalysisResult";
import AIFeedbackModal from "../components/triage/AIFeedbackModal";
import VitalsUpdateModal from "../components/triage/VitalsUpdateModal";
import TriageAnalyticsSection from "../components/triage/TriageAnalyticsSection";
import CollaborationPanel from "../components/triage/CollaborationPanel";

export default function TriageDashboard() {
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedCallerType, setSelectedCallerType] = useState("");
  const [selectedPatientType, setSelectedPatientType] = useState("");
  const [selectedOrganType, setSelectedOrganType] = useState("");
  const [complaintMessage, setComplaintMessage] = useState("");
  const [coordinatorNotes, setCoordinatorNotes] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [confirmedRule, setConfirmedRule] = useState(null);
  const [correctionData, setCorrectionData] = useState(null);
  const [error, setError] = useState(null);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [completedTriageLog, setCompletedTriageLog] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCollaboration, setShowCollaboration] = useState(false);

  const queryClient = useQueryClient();

  // Initialize user and session
  useEffect(() => {
    const initSession = async () => {
      try {
        const user = await appClient.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to get user:', error);
      }
    };
    initSession();
  }, []);

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => appClient.entities.Hospital.filter({ status: 'active' }),
  });

  const { data: allRules = [] } = useQuery({
    queryKey: ['triageRules'],
    queryFn: () => appClient.entities.TriageRule.filter({ status: 'active' }),
  });

  const { data: patientHistory = [] } = useQuery({
    queryKey: ['recentTriageLogs', selectedHospital],
    queryFn: () => appClient.entities.TriageLog.filter({ hospital_id: selectedHospital }, '-created_date', 20),
    enabled: !!selectedHospital,
  });

  const { data: pagingConfigs = [] } = useQuery({
    queryKey: ['pagingConfigs', selectedHospital],
    queryFn: () => appClient.entities.PagingConfiguration.filter({ 
      hospital_id: selectedHospital, 
      is_active: true 
    }),
    enabled: !!selectedHospital,
  });

  // Get selected hospital object
  const hospital = hospitals.find(h => h.id === selectedHospital);

  // Get available rules for the current selection
  const availableRules = React.useMemo(() => {
    if (!selectedHospital || !selectedPatientType || !selectedOrganType) return [];
    
    return allRules.filter(rule => 
      rule.hospital_id === selectedHospital && 
      rule.patient_type === selectedPatientType &&
      rule.organ_type === selectedOrganType
    );
  }, [selectedHospital, selectedPatientType, selectedOrganType, allRules]);

  // Start timer when AI analysis begins
  useEffect(() => {
    if (aiAnalysis) {
      setStartTime(Date.now());
    }
  }, [aiAnalysis]);

  const handleAnalyze = async () => {
    console.log('=== handleAnalyze called ===');
    console.log('Selected values:', { 
      hospital: selectedHospital, 
      patientType: selectedPatientType, 
      organType: selectedOrganType,
      complaint: complaintMessage.substring(0, 50) + '...'
    });
    console.log('Available rules count:', availableRules.length);
    
    setError(null);

    // Create or update collaboration session
    if (!sessionId && currentUser && selectedHospital) {
      const newSessionId = `session-${Date.now()}`;
      setSessionId(newSessionId);
      setShowCollaboration(true);
      
      try {
        await appClient.entities.TriageSession.create({
          session_id: newSessionId,
          hospital_id: selectedHospital,
          hospital_name: hospital?.name,
          coordinator_email: currentUser.email,
          coordinator_name: currentUser.full_name,
          active_viewers: [{
            email: currentUser.email,
            name: currentUser.full_name,
            role: currentUser.role,
            joined_at: new Date().toISOString()
          }],
          session_state: {
            selectedPatientType,
            selectedOrganType,
            complaintMessage
          },
          patient_type: selectedPatientType,
          organ_type: selectedOrganType,
          status: 'active'
        });
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    }
    
    if (!complaintMessage.trim()) {
      const errorMsg = "Please enter a complaint message before analyzing.";
      setError(errorMsg);
      alert(errorMsg);
      return;
    }
    
    // Don't stop if no rules - AI can still make recommendations based on protocols

    console.log('All checks passed, starting AI analysis...');
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setConfirmedRule(null);

    try {
      // Generate patient identifier for this triage
      const patientId = `CASE-${Date.now().toString().substring(-8)}`;

      // Advanced keyword extraction and medical term identification
      const medicalKeywords = {
        vitals: ['fever', 'temperature', 'temp', 'blood pressure', 'bp', 'heart rate', 'pulse', 'breathing', 'respiratory', 'oxygen', 'spo2'],
        symptoms: ['pain', 'ache', 'nausea', 'vomiting', 'diarrhea', 'bleeding', 'swelling', 'shortness of breath', 'sob', 'dizzy', 'weakness', 'fatigue', 'confusion'],
        urgency: ['severe', 'extreme', 'unbearable', 'worsening', 'sudden', 'acute', 'emergency', 'critical', 'unable to', 'cant', 'cannot'],
        transplant: ['rejection', 'anti-rejection', 'immunosuppressant', 'tacrolimus', 'prograf', 'cellcept', 'prednisone', 'graft', 'donor', 'transplant'],
        gi: ['stomach', 'belly', 'abdomen', 'nausea', 'vomit', 'diarrhea', 'constipation', 'bowel'],
        urinary: ['urine', 'urinate', 'pee', 'bladder', 'kidney', 'burning', 'frequency', 'urgency'],
        cardiac: ['chest pain', 'heart', 'palpitations', 'irregular', 'racing'],
        infection: ['fever', 'chills', 'infection', 'red', 'warm', 'discharge', 'pus', 'wound'],
        rejection_indicators: ['creatinine', 'decreased urine', 'weight gain', 'tender graft', 'elevated liver enzymes', 'jaundice', 'dark urine', 'flu-like', 'malaise'],
        immunosuppressants: ['tacrolimus', 'prograf', 'cyclosporine', 'neoral', 'mycophenolate', 'cellcept', 'myfortic', 'sirolimus', 'rapamune', 'everolimus', 'zortress', 'azathioprine', 'imuran', 'prednisone', 'methylprednisolone'],
        drug_interactions: ['grapefruit', 'pomegranate', 'nsaid', 'ibuprofen', 'advil', 'aleve', 'aspirin', 'st johns wort', 'echinacea', 'herbal', 'supplement']
      };

      const complaintLower = complaintMessage.toLowerCase();
      const extractedKeywords = {};
      const flaggedTerms = [];
      
      Object.entries(medicalKeywords).forEach(([category, terms]) => {
        const matched = terms.filter(term => complaintLower.includes(term));
        if (matched.length > 0) {
          extractedKeywords[category] = matched;
          flaggedTerms.push(...matched);
        }
      });

      // Identify numerical values (vitals, lab values)
      const numericalMatches = complaintMessage.match(/(\d+\.?\d*)\s*(degrees?|°f?|fahrenheit|systolic|diastolic|mmhg|bpm|beats?|\/\d+)/gi) || [];

      // Get historical corrections to improve AI accuracy
      const corrections = await appClient.entities.AICorrection.filter({
        hospital_id: selectedHospital,
        patient_type: selectedPatientType,
        organ_type: selectedOrganType
      }, '-created_date', 10);

      // Get recent patient history for context
      const recentLogs = patientHistory.filter(log => 
        log.patient_type === selectedPatientType && 
        log.organ_type === selectedOrganType
      ).slice(0, 5);

      // Get patient medical records if available (EHR/EMR data)
      let medicalRecords = [];
      try {
        medicalRecords = await appClient.entities.PatientMedicalRecord.filter({
          patient_identifier: patientId,
          hospital_id: selectedHospital,
          is_current: true
        }, '-recorded_date', 5);
      } catch (e) {
        console.log('No medical records found');
      }

      // Get previous risk assessments for this patient
      let previousRisks = [];
      try {
        previousRisks = await appClient.entities.RiskAssessment.filter({
          patient_identifier: patientId,
          hospital_id: selectedHospital
        }, '-created_date', 3);
      } catch (e) {
        console.log('No previous risk assessments');
      }

      // Enhanced rules context with sophisticated matching
      const rulesContext = availableRules.map(rule => {
        const ruleText = `${rule.complaint_category} ${rule.trigger_criteria}`.toLowerCase();
        const keywords = [
          rule.complaint_category,
          rule.trigger_criteria,
          ...(rule.trigger_criteria?.split(/[,;]/) || [])
        ].filter(Boolean);
        
        // Multi-level keyword matching
        const exactMatches = keywords.filter(keyword => 
          complaintLower.includes(keyword.toLowerCase())
        );
        
        // Semantic matching - check if medical keywords from complaint appear in rule
        const semanticMatches = flaggedTerms.filter(term => 
          ruleText.includes(term)
        );
        
        // Calculate relevance score
        const relevanceScore = (exactMatches.length * 2) + semanticMatches.length;
        
        return {
          id: rule.id,
          complaint_category: rule.complaint_category,
          trigger_criteria: rule.trigger_criteria,
          action_required: rule.action_required,
          priority: rule.priority,
          contact_method: rule.contact_method,
          contact_info: rule.contact_info,
          escalation_path: rule.escalation_path,
          matched_keywords: exactMatches.length > 0 ? exactMatches : undefined,
          semantic_matches: semanticMatches.length > 0 ? semanticMatches : undefined,
          relevance_score: relevanceScore
        };
      }).sort((a, b) => b.relevance_score - a.relevance_score);

      // Prepare learning context from past corrections
      const learningContext = corrections.length > 0 
        ? `\n\nPAST COORDINATOR CORRECTIONS (Learn from these):
${corrections.map(c => `- Original complaint: "${c.original_complaint}"
  AI suggested: Rule ${c.ai_suggested_rule_id}
  Coordinator chose: Rule ${c.coordinator_selected_rule_id}
  Reason: ${c.correction_reason}`).join('\n')}`
        : '';

      // Prepare patient history context
      const historyContext = recentLogs.length > 0
        ? `\n\nRECENT PATIENT HISTORY (${selectedPatientType} ${selectedOrganType} patients at ${hospital?.name}):
${recentLogs.map(log => `- ${new Date(log.created_date).toLocaleDateString()}: ${log.complaint_category} → ${log.action_taken.substring(0, 80)}...`).join('\n')}`
        : '';

      // Prepare medical records context (EHR/EMR data)
      const medicalContext = medicalRecords.length > 0
        ? `\n\nPATIENT MEDICAL RECORDS (from EHR/EMR):
${medicalRecords.map(record => {
  if (record.record_type === 'vitals' && record.vitals) {
    return `- Recent Vitals: Temp ${record.vitals.temperature}°F, BP ${record.vitals.blood_pressure_systolic}/${record.vitals.blood_pressure_diastolic}, HR ${record.vitals.heart_rate}, SpO2 ${record.vitals.oxygen_saturation}%`;
  }
  if (record.record_type === 'medications' && record.medications) {
    return `- Current Medications: ${record.medications.map(m => m.name).join(', ')}`;
  }
  if (record.record_type === 'allergies' && record.allergies) {
    return `- Allergies: ${record.allergies.join(', ')}`;
  }
  if (record.record_type === 'diagnosis' && record.diagnoses) {
    return `- Diagnoses: ${record.diagnoses.map(d => d.condition).join(', ')}`;
  }
  return `- ${record.record_type}: Available`;
}).join('\n')}`
        : '';

      // Prepare risk assessment context
      const riskContext = previousRisks.length > 0
        ? `\n\nPREVIOUS RISK ASSESSMENTS:
${previousRisks.map(risk => `- ${risk.assessment_type}: ${risk.risk_level} (Score: ${risk.risk_score}) - ${risk.ai_reasoning?.substring(0, 100)}...`).join('\n')}`
        : '';

      // Get hospital-specific paging instructions
      const hospitalPagingInfo = `
      HOSPITAL CONTACT INFORMATION:
      - Hospital: ${hospital?.name}
      - Main Phone: ${hospital?.contact_phone || 'Not specified'}
      - Secure Page: ${hospital?.secure_page_number || 'Not specified'}
      - Location: ${hospital?.location || 'Not specified'}
      - Special Instructions: ${hospital?.notes || 'None'}
      `;

      const prompt = `You are an expert medical triage AI assistant with advanced natural language processing capabilities and comprehensive knowledge of transplant triage protocols. Your role is to:
1. Analyze medical terminology with clinical precision
2. Identify critical symptoms and their severity
3. Flag any missing or ambiguous information
4. Apply appropriate triage protocols based on comprehensive analysis

CALL INFORMATION:
- Hospital: ${hospital?.name}
- Shift: ${selectedShift === 'business-hours' ? 'Business Hours' : 'After Business Hours/Weekends'}
- Caller Type: ${selectedCallerType}
- Patient Type: ${selectedPatientType}
- Organ Type: ${selectedOrganType}
- Reason for Call: "${complaintMessage}"

EXTRACTED MEDICAL KEYWORDS AND CONTEXT:
${Object.keys(extractedKeywords).length > 0 ? Object.entries(extractedKeywords).map(([cat, terms]) => 
  `- ${cat.toUpperCase()}: ${terms.join(', ')}`
).join('\n') : '- No specific medical keywords automatically identified'}

NUMERICAL VALUES DETECTED:
${numericalMatches.length > 0 ? numericalMatches.join(', ') : 'None explicitly stated'}

INFORMATION COMPLETENESS CHECK:
- Vital signs mentioned: ${extractedKeywords.vitals ? 'YES' : 'NO'}
- Symptom severity indicated: ${extractedKeywords.urgency ? 'YES' : 'NEEDS CLARIFICATION'}
- Duration/onset timing: ${complaintMessage.match(/(since|for|started|began|hours?|days?|minutes?|weeks?)/i) ? 'YES' : 'MISSING'}
- Previous similar episodes: ${complaintMessage.match(/(before|previous|history|again|recurring)/i) ? 'MENTIONED' : 'NOT MENTIONED'}

      ${hospitalPagingInfo}

      COMPREHENSIVE TRIAGE PROTOCOLS AND CRITERIA:

      EMERGENT CRITERIA (IMMEDIATE ACTION REQUIRED):
      - Self-harm or suicide intent → Call 911 immediately, page provider
      - Chest pain → Direct to ER, notify nephrologist/surgeon on call
      - Severe shortness of breath → Direct to ER, notify on call
      - Inability to urinate → Direct to ER, notify on call
      - Uncontrolled pain not responding to medication → Direct to ER, notify on call
      - Vomiting with inability to keep immunosuppressant meds down (>1 dose missed) → Direct to ER
      - Fever >101.5°F (>100.5°F for some protocols) → Direct to ER, notify on call
      - Blood pressure >170/100 or <100/60 → Direct to ER, notify nephrologist/surgeon
      - Significant decrease in urine output or fresh blood in urine → Direct to ER
      - GI bleeding (rectal or vomit) → Direct to ER
      - Any signs of rejection → Immediate page
      - Critical lab values (Hemoglobin <7, Potassium >6, Glucose <50, positive blood cultures) → Page immediately
      
      ALWAYS URGENT (REQUIRE PROMPT ATTENTION):
      After Hours:
      - All post-pancreas/SPK patients with ANY concern → Page surgeon on call
      - Lab critical values → Page nephrologist on call
      - Outside provider MD-to-MD calls → Page nephrologist on call
      - ER department calls → Page nephrologist on call
      - Burning/urgency/frequency with urination → Page nephrologist on call
      - Patient at lab waiting for order → Contact coordinator urgently
      - Any unlisted urgent concern → Page appropriate provider
      - Ran out of immunosuppressant meds (weekends/holidays) → Email/page nephrologist
      - Fever >100.3°F with other symptoms
      - Blood sugar <60 or >300 (for pancreas patients)
      
      Business Hours:
      - Warm transfer to clinic for urgent issues: fever, new symptoms, at pharmacy without meds, at lab without order
      - MD-to-MD consultations → Warm transfer or page
      - Patient returning call from physician same day → Warm transfer
      
      NON-URGENT (CAN WAIT FOR NEXT BUSINESS DAY):
      - New medication prescribed by other MD (if not urgent)
      - Missing medication from discharge bag (if has enough until next day)
      - Questions about lab results (non-critical)
      - Nausea but able to keep meds down
      - Pre-transplant patient questions
      - Medication refills (if has enough until next business day)
      - Pharmacy prior authorization requests
      - New lab order requests
      - Constipation, insomnia
      - Ate grapefruit/pomegranate (educate and email office)
      - OTC medication questions
      - Antibiotics before dentist question
      - Fasting for labs question
      
      PATIENT EDUCATION RESPONSES:
      - Missed dose: Take as soon as remember, don't double dose
      - Grapefruit/pomegranate: Avoid in future, no action if already consumed
      - Cold symptoms: OK to use decongestants, avoid alcohol-based products, check acetaminophen content (<2000mg/day max), no NSAIDs
      - OTC meds: No ibuprofen/NSAIDs, max 2000mg Tylenol/day
      - Dentist antibiotics: Not needed unless dentist deems necessary
      - Fasting for labs: Usually not needed, take meds after lab draw

      ${availableRules.length > 0 ? `\nAVAILABLE CONFIGURED TRIAGE RULES FOR THIS HOSPITAL/PATIENT/ORGAN TYPE:
      ${JSON.stringify(rulesContext, null, 2)}` : '\nNOTE: No specific rules configured for this combination. Use general transplant triage protocols above.'}
      ${learningContext}
      ${historyContext}
      ${medicalContext}
      ${riskContext}

      ADVANCED NLP ANALYSIS INSTRUCTIONS:
      1. MEDICAL TERMINOLOGY PROCESSING:
         - Interpret medical synonyms (e.g., "SOB" = shortness of breath, "emesis" = vomiting)
         - Recognize severity descriptors (mild, moderate, severe, unbearable, etc.)
         - Identify temporal patterns (acute vs chronic, new vs recurrent)
         - Parse vital sign values and lab results with clinical context
      
      2. CONTEXTUAL UNDERSTANDING:
         - Consider the full clinical picture, not just isolated symptoms
         - Recognize red flags even if not explicitly stated (e.g., chest pain + SOB = cardiac emergency)
         - Understand transplant-specific complications (rejection signs, immunosuppression issues)
         - Identify medication-related issues (side effects, drug interactions, adherence problems)
      
      3. MISSING INFORMATION DETECTION AND PROACTIVE QUESTIONING:
         - ALWAYS evaluate if critical information is MISSING or AMBIGUOUS
         - Be HIGHLY PROACTIVE - if any of these are unclear, set needs_clarification=true:
           * Exact vital signs (temperature value, BP numbers, not just "high" or "low")
           * Timing and onset (when symptoms started, how long they've lasted)
           * Severity scale (pain level 1-10, ability to function)
           * Medication adherence (did they take today's immunosuppressants?)
           * Symptom progression (getting better, worse, or staying same?)
           * Red flag symptoms (bleeding amount, vomiting frequency, inability to keep meds down)
         - For transplant patients, ALWAYS ask about:
           * Recent lab values if mentioning abnormal labs
           * Immunosuppressant levels if mentioning medication issues
           * Time since transplant (early post-op vs established graft)
           * Any missed medication doses in last 24-48 hours
         - Prioritize questions that could change urgency from non-urgent to urgent/emergency
         - Ask 2-5 specific questions, not vague ones like "tell me more"
      
      4. SOPHISTICATED RULE MATCHING:
         - Use the relevance_score provided for each rule as a starting point
         - Consider semantic similarity, not just exact keyword matches
         - Evaluate if symptoms cross multiple protocol categories
         - Account for symptom combinations that escalate urgency
      
      5. CLINICAL DECISION-MAKING:
         - Always err on the side of caution for transplant patients
         - Consider worst-case scenarios for ambiguous presentations
         - Factor in time since transplant (early post-op vs established)
         - Recognize when "routine" symptoms might indicate serious complications
      
      6. PROTOCOL APPLICATION:
         - If a specific rule matches from the configured rules, use it
         - If NO configured rule matches, use general protocols with detailed reasoning
         - If suggesting a rule_id, it must be from the list or "GENERAL_PROTOCOL"
         - Confidence_score should reflect: exact match (85-100), semantic match (70-84), general protocol (50-69), needs clarification (<50)

      CRITICAL RESPONSE FORMAT REQUIREMENTS:
      Your response MUST include these key elements in the ai_summary field:
      1. Hospital Name: ${hospital?.name}
      2. Level of Urgency: Always Urgent, Non Urgent, or Emergency
      3. Paging Route: Specific instruction based on the hospital's configured rules and contact methods

      Example format: "Hospital: ${hospital?.name} | Urgency: Non Urgent | Route: Send email to nephrologist"

      TRANSPLANT-SPECIFIC CLINICAL EXPERTISE:
      1. REJECTION ASSESSMENT (Critical for all transplant patients):
        KIDNEY REJECTION SIGNS:
        - Decreased urine output, creatinine elevation >0.3mg/dL from baseline
        - Tenderness over graft site, fever, malaise, weight gain >2-3lbs in 24hrs
        - Hypertension, flu-like symptoms

        LIVER REJECTION SIGNS:
        - Elevated liver enzymes (AST/ALT), increased bilirubin, jaundice
        - Dark urine, pale stools, abdominal pain, fever
        - Fatigue, itching, confusion

        PANCREAS/SPK REJECTION:
        - Rising blood glucose, decreased C-peptide
        - Abdominal pain, nausea, vomiting, fever
        - Elevated amylase/lipase

      2. IMMUNOSUPPRESSANT DRUG INTERACTIONS & TOXICITY:
        TACROLIMUS/CYCLOSPORINE INTERACTIONS:
        - INCREASE levels: Grapefruit, azole antifungals, macrolides, verapamil, diltiazem
        - DECREASE levels: St John's Wort, rifampin, phenytoin, carbamazepine
        - TOXICITY SIGNS: Tremor, headache, elevated creatinine, high BP, nausea

        MYCOPHENOLATE CONCERNS:
        - GI side effects common (diarrhea, nausea) - dose adjustment may help
        - Avoid taking with antacids (reduces absorption)
        - Monitor for neutropenia, increased infection risk

        STEROID CONSIDERATIONS:
        - Never abruptly stop - adrenal crisis risk
        - Side effects: hyperglycemia, mood changes, insomnia, osteoporosis, infection risk

      3. CRITICAL TIME-SENSITIVE SCENARIOS:
         - Missed >1 dose of immunosuppressants within 48hrs → URGENT evaluation
         - Inability to keep immunosuppressants down due to vomiting → EMERGENCY
         - Signs of rejection (above) → URGENT to EMERGENCY
         - BK virus symptoms in kidney transplant → URGENT nephrology contact
         - CMV/EBV reactivation concerns → URGENT infectious disease

      4. DRUG TOXICITY & INTERACTION ANALYSIS:
         You MUST analyze for potential medication toxicity and dangerous interactions:

         CALCINEURIN INHIBITOR TOXICITY (Tacrolimus/Cyclosporine):
         - SYMPTOMS: Tremor, headache, confusion, seizures, nephrotoxicity (rising creatinine), hypertension
         - INTERACTIONS: Azole antifungals (fluconazole, voriconazole), macrolides (erythromycin, clarithromycin), calcium channel blockers
         - IF DETECTED: Flag as URGENT, suggest checking drug levels immediately, consider dose reduction

         MYCOPHENOLATE TOXICITY:
         - SYMPTOMS: Severe diarrhea, vomiting, leukopenia, anemia
         - INTERACTIONS: Antacids, proton pump inhibitors (reduce absorption)
         - IF DETECTED: Suggest CBC check, possible dose adjustment or split dosing

         STEROID TOXICITY:
         - SYMPTOMS: Hyperglycemia, mood changes, psychosis, insomnia, weight gain
         - IF DETECTED: Monitor glucose, consider psychiatric evaluation if severe mood changes

         DANGEROUS DRUG COMBINATIONS:
         - NSAIDs + Tacrolimus/Cyclosporine → Nephrotoxicity risk (URGENT warning)
         - St John's Wort + ANY immunosuppressant → Subtherapeutic levels, rejection risk (EMERGENCY)
         - Multiple nephrotoxic agents → Acute kidney injury risk

         ANALYZE EVERY COMPLAINT FOR:
         - Symptoms matching known drug side effects or toxicity
         - Recently started medications that could interact
         - Over-the-counter drugs patient might not report (NSAIDs, supplements)
         - Symptom combinations suggesting toxicity vs disease progression

      5. RISK-BASED ESCALATION & PROTOCOL DEVIATION:
         Evaluate combinations of risk factors and suggest escalation when multiple risks present:

         HIGH-RISK COMBINATIONS (Auto-escalate to URGENT/EMERGENCY):
         - Fever + Immunosuppression + Recent dose increase → Infection risk + toxicity
         - GI symptoms + Missed immunosuppressant doses → Rejection risk + malabsorption
         - Neurological symptoms + CNI therapy → Possible PRES or toxicity
         - Acute kidney injury + Multiple nephrotoxic drugs → Immediate intervention needed
         - Post-op <3 months + Any concerning symptom → Higher complication risk

         PROTOCOL DEVIATION TRIGGERS:
         - Patient at higher risk than typical protocol suggests (e.g., elderly, multiple comorbidities)
         - Symptom pattern doesn't fit standard categories but concerning
         - Recent hospital discharge with similar complaint (readmission risk)
         - Multiple calls for same issue (escalating problem)

         SUGGEST DEVIATIONS WHEN:
         - Standard protocol says "non-urgent" but risk factors warrant immediate evaluation
         - Protocol suggests phone triage but patient needs in-person assessment
         - Single symptom seems minor but context makes it urgent (e.g., "mild fever" post-transplant)

         PROVIDE RATIONALE:
         - Clearly explain why deviation is recommended
         - Cite specific risk factors from patient history
         - Reference evidence or guidelines supporting escalation
         - Quantify risk when possible (e.g., "3+ rejection risk factors present")

      ADDITIONAL AI RECOMMENDATIONS REQUIRED:
      1. FOLLOW-UP ACTIONS: Provide 3-5 specific follow-up steps (e.g., "Check tacrolimus trough level in AM", "Monitor temperature q4h", "Document fluid intake/output")

      2. MEDICAL LITERATURE REFERENCES: Include 2-3 relevant guidelines WITH SPECIFIC LINKS:
        ALWAYS include actual reference links from these authoritative sources:
        - KDIGO Guidelines: https://kdigo.org/guidelines/ (for kidney transplant)
        - AST Guidelines: https://www.myast.org/professional-development/practice-guidelines (American Society of Transplantation)
        - OPTN/UNOS: https://optn.transplant.hrsa.gov/professionals/clinical-resources/
        - UpToDate: https://www.uptodate.com/ (for specific drug interactions and symptom management)
        - Transplant-specific protocols based on organ type, rejection monitoring, immunosuppression management
        - Current evidence on symptom management (e.g., "Fever in solid organ transplant recipients - UpToDate 2026")

      3. PATIENT COMMUNICATION TEMPLATE: Create ready-to-use communication for the coordinator:
        - Verbal Script: What to say to the patient on the phone (warm, clear, actionable)
        - Written Message: Follow-up text/email if needed (concise summary of instructions)
        - Key Education Points: 3-5 critical things patient needs to understand
        - Red Flag Warnings: Specific symptoms that require immediate return call/ER visit

      RESPONSE SCHEMA:
      - urgency_level: "emergency" (for Emergency), "urgent" (for Always Urgent), or "non-urgent" (for Non Urgent)
      - matched_rule_id: Rule ID from list, or "GENERAL_PROTOCOL" if using general guidance
      - action_required: Paging route with specific instructions (e.g., "Send Non Urgent email to post kidney rx refill email")
      - reasoning: Explain why this urgency and action (reference symptoms, protocols, medical data)
      - confidence_score: 0-100 (higher if exact rule match, moderate if using general protocols)
      - ai_summary: Brief summary formatted as "Hospital: [CODE] | Urgency: [LEVEL] | Route: [SPECIFIC INSTRUCTIONS]"
      - patient_condition_summary: Comprehensive assessment for medical staff`;

      console.log('Calling LLM with prompt length:', prompt.length);
      console.log('Rules context:', rulesContext);
      
      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            urgency_level: {
              type: "string",
              enum: ["urgent", "non-urgent", "emergency"],
              description: "The urgency level: emergency (Emergency), urgent (Always Urgent), or non-urgent (Non Urgent)"
            },
            matched_rule_id: {
              type: "string",
              description: "Rule ID if match found, or GENERAL_PROTOCOL if using general guidance"
            },
            complaint_category: {
              type: "string",
              description: "Category of the complaint (for general protocols)"
            },
            action_required: {
              type: "string",
              description: "Paging route with specific instructions (e.g., 'Send Non Urgent email to post kidney rx refill email')"
            },
            contact_method: {
              type: "string",
              description: "How to contact provider (phone, urgent_page, email, etc.)"
            },
            contact_info: {
              type: "string",
              description: "Contact information or instructions"
            },
            patient_education: {
              type: "string",
              description: "Education to provide to patient"
            },
            escalation_path: {
              type: "string",
              description: "Escalation instructions if needed"
            },
            reasoning: {
              type: "string",
              description: "Detailed reasoning for the decision"
            },
            confidence_score: {
              type: "number",
              description: "Confidence score from 0-100"
            },
            ai_summary: {
              type: "string",
              description: "Brief summary formatted as 'Hospital: [CODE] | Urgency: [Always Urgent/Non Urgent/Emergency] | Route: [specific paging instructions]'"
            },
            patient_condition_summary: {
              type: "string",
              description: "Comprehensive patient condition summary for medical staff review"
            },
            flagged_keywords: {
              type: "array",
              items: { type: "string" },
              description: "Keywords automatically flagged from the complaint"
            },
            similar_cases_noted: {
              type: "boolean",
              description: "Whether similar cases were found in recent history"
            },
            risk_assessment: {
              type: "object",
              properties: {
                readmission_risk: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                complication_risk: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                risk_factors: { type: "array", items: { type: "string" } },
                recommended_follow_up: { type: "string" }
              },
              description: "AI risk assessment based on all available data"
            },
            needs_clarification: {
              type: "boolean",
              description: "Whether additional information is needed for accurate triage"
            },
            clarification_questions: {
              type: "array",
              items: { type: "string" },
              description: "Specific questions to ask the caller for better assessment (if needs_clarification=true)"
            },
            clinical_reasoning: {
              type: "string",
              description: "Detailed clinical reasoning explaining the medical decision-making process"
            },
            alternative_diagnoses: {
              type: "array",
              items: { type: "string" },
              description: "Other possible conditions to consider based on symptoms"
            },
            drug_toxicity_alert: {
              type: "object",
              properties: {
                is_suspected: { type: "boolean" },
                suspected_drug: { type: "string" },
                toxicity_symptoms: { type: "array", items: { type: "string" } },
                severity: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                recommended_actions: { type: "array", items: { type: "string" } },
                rationale: { type: "string" }
              },
              description: "Analysis of potential drug toxicity based on symptoms and medications"
            },
            drug_interaction_alert: {
              type: "object",
              properties: {
                is_suspected: { type: "boolean" },
                interacting_drugs: { type: "array", items: { type: "string" } },
                interaction_type: { type: "string" },
                severity: { type: "string", enum: ["minor", "moderate", "major", "contraindicated"] },
                clinical_effects: { type: "string" },
                recommended_actions: { type: "array", items: { type: "string" } }
              },
              description: "Identified drug interactions and their clinical significance"
            },
            protocol_deviation_recommendation: {
              type: "object",
              properties: {
                should_deviate: { type: "boolean" },
                standard_protocol_action: { type: "string" },
                recommended_action: { type: "string" },
                risk_factors: { type: "array", items: { type: "string" } },
                deviation_rationale: { type: "string" },
                evidence_supporting_escalation: { type: "string" }
              },
              description: "Recommendation to deviate from standard protocol based on risk assessment"
            },
            follow_up_actions: {
              type: "array",
              items: { type: "string" },
              description: "Specific follow-up steps recommended after initial triage"
            },
            medical_literature_references: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  source: { type: "string", description: "Organization or journal name" },
                  url: { type: "string", description: "Direct link to guideline or article" },
                  relevance: { type: "string" },
                  key_points: { type: "string" }
                }
              },
              description: "Relevant medical guidelines, studies, or protocols WITH LINKS - must include actual URLs from KDIGO, AST, OPTN, or UpToDate"
            },
            patient_communication_template: {
              type: "object",
              properties: {
                verbal_script: { type: "string" },
                written_message: { type: "string" },
                key_education_points: { type: "array", items: { type: "string" } },
                red_flag_warnings: { type: "array", items: { type: "string" } }
              },
              description: "Draft communication templates for patient education"
            }
          },
          required: ["urgency_level", "matched_rule_id", "reasoning", "confidence_score", "ai_summary", "needs_clarification"]
        }
      });

      // Store risk assessment if AI provided one
      if (result.risk_assessment && result.risk_assessment.readmission_risk) {
        try {
          await appClient.entities.RiskAssessment.create({
            patient_identifier: patientId,
            hospital_id: selectedHospital,
            assessment_type: 'readmission_risk',
            risk_score: result.risk_assessment.readmission_risk === 'critical' ? 90 : 
                       result.risk_assessment.readmission_risk === 'high' ? 75 :
                       result.risk_assessment.readmission_risk === 'moderate' ? 50 : 25,
            risk_level: result.risk_assessment.readmission_risk,
            contributing_factors: result.risk_assessment.risk_factors?.map(f => ({ factor: f, weight: 1 })) || [],
            ai_reasoning: result.reasoning,
            recommended_actions: result.risk_assessment.recommended_follow_up ? [result.risk_assessment.recommended_follow_up] : [],
            prediction_confidence: result.confidence_score,
            status: 'active'
          });
        } catch (e) {
          console.error('Failed to create risk assessment:', e);
        }
      }

      console.log('LLM Result:', result);
      
      // Check if AI needs clarification
      if (result.needs_clarification && result.clarification_questions && result.clarification_questions.length > 0) {
        console.log('AI requesting clarification:', result.clarification_questions);
        setAiAnalysis({
          ...result,
          needs_clarification: true,
          matched_rule: null,
          is_clarification_request: true
        });
        setIsAnalyzing(false);
        return;
      }
      
      // Find the matched rule
      const matchedRule = availableRules.find(r => r.id === result.matched_rule_id);
      
      console.log('Matched rule:', matchedRule);

      if (matchedRule) {
        setAiAnalysis({
          ...result,
          matched_rule: matchedRule
        });
      } else if (result.matched_rule_id === 'GENERAL_PROTOCOL' || !matchedRule) {
        // AI is using general protocols - create a synthetic rule from AI recommendation
        console.log('Using AI general protocol recommendation');
        const syntheticRule = {
          id: 'GENERAL_PROTOCOL',
          complaint_category: result.complaint_category || 'General Triage Protocol',
          trigger_criteria: complaintMessage,
          action_required: result.action_required || result.ai_summary,
          priority: result.urgency_level === 'emergency' ? 'emergency' : result.urgency_level === 'urgent' ? 'urgent' : 'routine',
          contact_method: result.contact_method || (result.urgency_level === 'emergency' ? 'urgent_page' : 'phone'),
          contact_info: result.contact_info || hospital?.contact_phone || 'Contact on-call provider',
          patient_education: result.patient_education,
          escalation_path: result.escalation_path
        };
        
        setAiAnalysis({
          ...result,
          matched_rule: syntheticRule,
          is_general_protocol: true
        });
      } else {
        console.warn('AI did not match a valid rule ID and did not use GENERAL_PROTOCOL');
        setAiAnalysis({
          urgency_level: result.urgency_level || "urgent",
          matched_rule: {
            id: 'GENERAL_PROTOCOL',
            complaint_category: 'General Triage',
            trigger_criteria: complaintMessage,
            action_required: result.action_required || "Contact appropriate on-call provider based on protocols",
            priority: "urgent",
            contact_method: "phone",
            contact_info: hospital?.contact_phone || "Contact coordinator"
          },
          reasoning: result.reasoning || "Using general transplant triage protocols",
          confidence_score: result.confidence_score || 70,
          ai_summary: result.ai_summary || "Recommendation based on general protocols",
          patient_condition_summary: result.patient_condition_summary || "Assessment completed using general guidelines",
          is_general_protocol: true
        });
      }

    } catch (error) {
      console.error("Error analyzing with AI:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        error: error
      });
      setError(`AI analysis failed: ${error.message || error.toString() || 'Unknown error'}. Please check console for details.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAnalysis = (selectedRule, metadata) => {
    if (selectedRule) {
      setConfirmedRule(selectedRule);
      
      // If this was an override, store correction data
      if (metadata?.isOverride) {
        setCorrectionData({
          original_complaint: complaintMessage,
          hospital_id: selectedHospital,
          patient_type: selectedPatientType,
          organ_type: selectedOrganType,
          ai_suggested_rule_id: metadata.originalRuleId,
          ai_suggested_urgency: aiAnalysis.urgency_level,
          ai_confidence_score: aiAnalysis.confidence_score,
          coordinator_selected_rule_id: selectedRule.id,
          correction_reason: metadata.correctionReason
        });
      }
    }
  };

  const handleCancelAnalysis = () => {
    setAiAnalysis(null);
    setConfirmedRule(null);
    setCorrectionData(null);
    setError(null);
  };

  const createLogMutation = useMutation({
    mutationFn: async (logData) => {
      // Create triage log
      const log = await appClient.entities.TriageLog.create(logData);
      
      // If there was a correction, save it to help AI learn
      if (correctionData) {
        await appClient.entities.AICorrection.create(correctionData);
      }
      
      // Check if automatic paging should be triggered
      await checkAndTriggerPaging(log);
      
      return log;
    },
    onSuccess: (log) => {
      queryClient.invalidateQueries({ queryKey: ['triageLogs'] });
      queryClient.invalidateQueries({ queryKey: ['aiCorrections'] });
      queryClient.invalidateQueries({ queryKey: ['pageLogs'] });
      setCompletedTriageLog(log);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowFeedbackModal(true);
      }, 1500);
    },
  });

  const checkAndTriggerPaging = async (triageLog) => {
    try {
      const user = await appClient.auth.me();
      
      // Find matching paging configuration
      const matchingConfig = pagingConfigs.find(config => {
        // Check urgency level match
        const urgencyMatch = config.trigger_urgency_levels.includes(aiAnalysis?.urgency_level);
        
        // Check patient type match (empty array = all types)
        const patientMatch = !config.trigger_patient_types?.length || 
                           config.trigger_patient_types.includes(selectedPatientType);
        
        // Check organ type match (empty array = all types)
        const organMatch = !config.trigger_organ_types?.length || 
                          config.trigger_organ_types.includes(selectedOrganType);
        
        // Check business hours restriction
        const now = new Date();
        const hour = now.getHours();
        const isBusinessHours = hour >= 8 && hour < 17;
        const timeMatch = !config.business_hours_only || isBusinessHours;
        
        return urgencyMatch && patientMatch && organMatch && timeMatch;
      });
      
      if (!matchingConfig) {
        return; // No paging configuration matches this case
      }
      
      // If confirmation required, don't auto-page
      if (matchingConfig.require_confirmation) {
        console.log('Paging requires manual confirmation');
        return;
      }
      
      // Construct paging message
      const message = matchingConfig.message_template 
        ? matchingConfig.message_template
            .replace('{hospital}', hospital.name)
            .replace('{urgency}', aiAnalysis?.urgency_level || 'urgent')
            .replace('{patient_type}', selectedPatientType)
            .replace('{organ_type}', selectedOrganType)
            .replace('{complaint}', complaintMessage.substring(0, 100))
            .replace('{action}', confirmedRule?.action_required || 'See triage log')
        : `URGENT TRIAGE ALERT\n\nHospital: ${hospital.name}\nUrgency: ${aiAnalysis?.urgency_level}\nPatient: ${selectedPatientType} ${selectedOrganType}\n\nComplaint: ${complaintMessage.substring(0, 150)}\n\nAction Required: ${confirmedRule?.action_required}\n\nCoordinator: ${user.full_name}`;
      
      // Send page via configured method
      let pageStatus = 'sent';
      let errorMsg = null;
      
      try {
        if (matchingConfig.paging_method === 'email' || matchingConfig.paging_method === 'secure_page') {
          await appClient.integrations.Core.SendEmail({
            from_name: `TriageLink - ${hospital.name}`,
            to: matchingConfig.primary_contact,
            subject: `🚨 ${aiAnalysis?.urgency_level?.toUpperCase()} Triage Alert - ${selectedPatientType} ${selectedOrganType}`,
            body: message
          });
          pageStatus = 'delivered';
        }
        // Add other paging methods (SMS, phone) here when available
      } catch (error) {
        console.error('Failed to send page:', error);
        pageStatus = 'failed';
        errorMsg = error.message;
        
        // Try backup contact if primary fails
        if (matchingConfig.backup_contact) {
          try {
            await appClient.integrations.Core.SendEmail({
              from_name: `TriageLink - ${hospital.name}`,
              to: matchingConfig.backup_contact,
              subject: `🚨 ${aiAnalysis?.urgency_level?.toUpperCase()} Triage Alert - ${selectedPatientType} ${selectedOrganType}`,
              body: message + '\n\n[Sent to backup contact - primary contact failed]'
            });
            pageStatus = 'delivered';
            errorMsg = null;
          } catch (backupError) {
            console.error('Backup contact also failed:', backupError);
          }
        }
      }
      
      // Log the page
      await appClient.entities.PageLog.create({
        triage_log_id: triageLog.id,
        hospital_id: selectedHospital,
        hospital_name: hospital.name,
        urgency_level: aiAnalysis?.urgency_level || 'urgent',
        patient_type: selectedPatientType,
        organ_type: selectedOrganType,
        paging_method: matchingConfig.paging_method,
        recipient: matchingConfig.primary_contact,
        message_sent: message,
        status: pageStatus,
        sent_at: new Date().toISOString(),
        error_message: errorMsg,
        coordinator_email: user.email
      });
      
    } catch (error) {
      console.error('Error in paging system:', error);
    }
  };



  const resetPatientForm = async () => {
    // Mark session as completed if exists
    if (sessionId && currentUser) {
      try {
        const sessions = await appClient.entities.TriageSession.filter({ session_id: sessionId }, '-created_date', 1);
        if (sessions[0]) {
          await appClient.entities.TriageSession.update(sessions[0].id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Failed to close session:', error);
      }
    }

    setSelectedHospital("");
    setSelectedShift("");
    setSelectedCallerType("");
    setSelectedPatientType("");
    setSelectedOrganType("");
    setComplaintMessage("");
    setCoordinatorNotes("");
    setStartTime(null);
    setAiAnalysis(null);
    setConfirmedRule(null);
    setCorrectionData(null);
    setError(null);
    setSessionId(null);
    setShowCollaboration(false);
  };

  const handleComplete = async () => {
    if (!confirmedRule || !hospital) return;

    const durationSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    const logData = {
      hospital_id: selectedHospital,
      hospital_name: hospital.name,
      rule_id: confirmedRule.id,
      patient_type: selectedPatientType,
      organ_type: selectedOrganType,
      complaint_category: confirmedRule.complaint_category,
      action_taken: confirmedRule.action_required,
      contact_method: confirmedRule.contact_method,
      coordinator_notes: `Patient complaint: ${complaintMessage}\n\nAI Analysis: ${aiAnalysis?.ai_summary}\nUrgency: ${aiAnalysis?.urgency_level}\n${correctionData ? `\n[AI Override Applied - Learning from correction]` : ''}\n\n${coordinatorNotes}`,
      duration_seconds: durationSeconds,
      status: "completed"
    };

    createLogMutation.mutate(logData);

    // Log HIPAA audit entry
    try {
      const user = await appClient.auth.me();
      await appClient.entities.HIPAAAuditLog.create({
        action_type: 'phi_created',
        user_email: user.email,
        user_name: user.full_name,
        user_role: user.role,
        entity_type: 'TriageLog',
        hospital_id: selectedHospital,
        hospital_name: hospital.name,
        access_reason: 'treatment',
        action_result: 'success',
        metadata: {
          patient_type: selectedPatientType,
          organ_type: selectedOrganType,
          urgency: aiAnalysis?.urgency_level
        }
      });
    } catch (error) {
      console.error('Failed to create HIPAA audit log:', error);
    }
  };



  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData) => {
      const user = await appClient.auth.me();
      return appClient.entities.AIFeedback.create({
        triage_log_id: completedTriageLog.id,
        hospital_id: selectedHospital,
        patient_type: selectedPatientType,
        organ_type: selectedOrganType,
        original_complaint: complaintMessage,
        ai_suggested_rule_id: aiAnalysis?.matched_rule?.id,
        ai_confidence_score: aiAnalysis?.confidence_score,
        ai_urgency_level: aiAnalysis?.urgency_level,
        final_rule_id: confirmedRule?.id,
        was_overridden: !!correctionData,
        reviewer_email: user.email,
        reviewer_name: user.full_name,
        review_date: new Date().toISOString(),
        ...feedbackData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiFeedbacks'] });
      setShowFeedbackModal(false);
      resetPatientForm();
    },
  });

  const submitVitalsMutation = useMutation({
    mutationFn: async (vitalsData) => {
      const user = await appClient.auth.me();
      return appClient.entities.PatientVitals.create({
        triage_log_id: completedTriageLog.id,
        hospital_id: selectedHospital,
        patient_identifier: `CASE-${completedTriageLog.id.substring(0, 8)}`,
        recorded_by: user.email,
        requires_reanalysis: true,
        reanalysis_completed: false,
        ...vitalsData
      });
    },
    onSuccess: async (vitalsRecord) => {
      queryClient.invalidateQueries({ queryKey: ['patientVitals'] });
      
      // Trigger re-analysis with new vitals
      await handleReanalysis(vitalsRecord);
    },
  });

  const handleReanalysis = async (vitalsRecord) => {
    setIsAnalyzing(true);
    
    try {
      const enhancedComplaint = `${complaintMessage}\n\nUPDATED VITALS:\n` +
        `${vitalsRecord.temperature ? `Temperature: ${vitalsRecord.temperature}°F\n` : ''}` +
        `${vitalsRecord.blood_pressure_systolic ? `BP: ${vitalsRecord.blood_pressure_systolic}/${vitalsRecord.blood_pressure_diastolic}\n` : ''}` +
        `${vitalsRecord.heart_rate ? `HR: ${vitalsRecord.heart_rate} bpm\n` : ''}` +
        `${vitalsRecord.oxygen_saturation ? `SpO2: ${vitalsRecord.oxygen_saturation}%\n` : ''}` +
        `${vitalsRecord.pain_level ? `Pain: ${vitalsRecord.pain_level}/10\n` : ''}` +
        `${vitalsRecord.additional_symptoms ? `\nNEW SYMPTOMS: ${vitalsRecord.additional_symptoms}` : ''}`;

      const rulesContext = availableRules.map(rule => ({
        id: rule.id,
        complaint_category: rule.complaint_category,
        trigger_criteria: rule.trigger_criteria,
        action_required: rule.action_required,
        priority: rule.priority,
        contact_method: rule.contact_method
      }));

      const result = await appClient.integrations.Core.InvokeLLM({
        prompt: `RE-ANALYZE this patient case with NEW VITAL SIGNS and updated symptoms.

ORIGINAL COMPLAINT: ${complaintMessage}

UPDATED INFORMATION:
${enhancedComplaint}

AVAILABLE PROTOCOLS:
${JSON.stringify(rulesContext, null, 2)}

IMPORTANT: This is a RE-ANALYSIS with new data. Consider how the new vitals and symptoms change the urgency and appropriate protocol. Has the situation escalated or improved?

Provide updated urgency level, matched protocol, reasoning, confidence score, summary, and patient condition summary.`,
        response_json_schema: {
          type: "object",
          properties: {
            urgency_level: { type: "string", enum: ["urgent", "non-urgent", "emergency"] },
            matched_rule_id: { type: "string" },
            reasoning: { type: "string" },
            confidence_score: { type: "number" },
            ai_summary: { type: "string" },
            patient_condition_summary: { type: "string" },
            status_change: { type: "string", description: "How the situation has changed" }
          },
          required: ["urgency_level", "matched_rule_id", "reasoning", "confidence_score", "ai_summary"]
        }
      });

      const matchedRule = availableRules.find(r => r.id === result.matched_rule_id);
      
      if (matchedRule) {
        setAiAnalysis({
          ...result,
          matched_rule: matchedRule,
          is_reanalysis: true
        });
      }

      // Mark re-analysis as completed
      await appClient.entities.PatientVitals.update(vitalsRecord.id, { reanalysis_completed: true });
      
    } catch (error) {
      console.error("Re-analysis error:", error);
      setError("Re-analysis failed. Please try manual analysis.");
    }
    
    setIsAnalyzing(false);
    setShowVitalsModal(false);
  };

  const handleFeedbackSubmit = (feedbackData) => {
    submitFeedbackMutation.mutate(feedbackData);
  };

  const handleVitalsSubmit = (vitalsData) => {
    submitVitalsMutation.mutate(vitalsData);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#60A5FA' }}>
            Triage Dashboard
          </h1>
          <p className="text-lg" style={{ color: '#60A5FA' }}>
            AI-powered smart decision support with real-time alerts
          </p>
        </motion.div>

        {/* Analytics Section */}
        <div className="mb-6">
          <TriageAnalyticsSection />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className={showCollaboration ? "grid lg:grid-cols-3 gap-6" : "grid lg:grid-cols-2 gap-6"}>
              {/* Selector Column */}
              <div>
                <TriageFlowSelector
                  hospitals={hospitals}
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                  selectedShift={selectedShift}
                  setSelectedShift={setSelectedShift}
                  selectedCallerType={selectedCallerType}
                  setSelectedCallerType={setSelectedCallerType}
                  selectedPatientType={selectedPatientType}
                  setSelectedPatientType={setSelectedPatientType}
                  selectedOrganType={selectedOrganType}
                  setSelectedOrganType={setSelectedOrganType}
                  complaintMessage={complaintMessage}
                  setComplaintMessage={setComplaintMessage}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                />
              </div>

              {/* Results Column */}
              <div>
            <AnimatePresence mode="wait">
              {confirmedRule && hospital ? (
                <TriageInstructions
                      key={confirmedRule.id}
                      rule={confirmedRule}
                      hospital={hospital}
                      aiAnalysis={aiAnalysis}
                      onComplete={handleComplete}
                      coordinatorNotes={coordinatorNotes}
                      setCoordinatorNotes={setCoordinatorNotes}
                      isLoading={createLogMutation.isPending}
                      />
                      ) : aiAnalysis?.is_clarification_request ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Card className="border" style={{ borderColor: '#F59E0B', backgroundColor: '#374151' }}>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: '#F59E0B' }} />
                                <div className="flex-1">
                                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#F59E0B' }}>
                                    Additional Information Needed
                                  </h3>
                                  <p className="mb-4" style={{ color: '#60A5FA' }}>
                                    The AI has identified that more information is needed for accurate triage. Please ask the caller the following questions:
                                  </p>
                                  <div className="space-y-2 mb-4">
                                    {aiAnalysis.clarification_questions?.map((question, idx) => (
                                      <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: '#4B5563' }}>
                                        <div className="flex gap-2">
                                          <span className="font-bold" style={{ color: '#F59E0B' }}>{idx + 1}.</span>
                                          <span style={{ color: '#60A5FA' }}>{question}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {aiAnalysis.reasoning && (
                                    <div className="p-3 rounded-lg border" style={{ backgroundColor: '#1F2937', borderColor: '#F59E0B' }}>
                                      <p className="text-sm font-semibold mb-1" style={{ color: '#F59E0B' }}>Why this information matters:</p>
                                      <p className="text-sm" style={{ color: '#9CA3AF' }}>{aiAnalysis.reasoning}</p>
                                    </div>
                                  )}
                                  <div className="flex gap-3 mt-6">
                                    <Button
                                      onClick={handleCancelAnalysis}
                                      variant="outline"
                                      className="flex-1"
                                      style={{ borderColor: '#60A5FA', color: '#60A5FA' }}
                                    >
                                      Start Over
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        const updatedComplaint = window.prompt(
                                          'Please update the complaint with the additional information:\n\n' + 
                                          aiAnalysis.clarification_questions?.join('\n') + 
                                          '\n\nOriginal: ' + complaintMessage,
                                          complaintMessage
                                        );
                                        if (updatedComplaint && updatedComplaint !== complaintMessage) {
                                          setComplaintMessage(updatedComplaint);
                                          handleCancelAnalysis();
                                          setTimeout(() => handleAnalyze(), 100);
                                        }
                                      }}
                                      className="flex-1"
                                      style={{ backgroundColor: '#F59E0B', color: '#000000' }}
                                    >
                                      Update & Re-Analyze
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ) : aiAnalysis ? (
                <AIAnalysisResult
                      analysis={aiAnalysis}
                      availableRules={availableRules}
                      onConfirm={handleConfirmAnalysis}
                      onCancel={handleCancelAnalysis}
                      />
                      ) : availableRules.length === 0 && selectedOrganType ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                        <CardContent className="p-8 text-center">
                          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
                          <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                            No Rules Available
                          </h3>
                          <p style={{ color: '#60A5FA' }}>
                            No triage rules configured for this combination. Please add rules in Rules Management or contact your supervisor.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card className="border" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
                        <CardContent className="p-8 text-center">
                          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#60A5FA' }} />
                          <h3 className="text-xl font-semibold mb-2" style={{ color: '#60A5FA' }}>
                            Ready to Start
                          </h3>
                          <p style={{ color: '#60A5FA' }}>
                            Select hospital, shift, caller type, patient type, organ type, and describe the reason for the call. Then click "Analyze with AI" to get the appropriate paging route.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    )}
                    </AnimatePresence>
                    </div>

              {/* Collaboration Panel */}
              {showCollaboration && sessionId && (
                <div>
                  <CollaborationPanel 
                    sessionId={sessionId}
                    currentUser={currentUser}
                  />
                </div>
              )}
                    </div>

        {/* Success Notification */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 right-8 p-6 rounded-xl shadow-2xl border z-50"
              style={{ backgroundColor: '#374151', borderColor: '#60A5FA' }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8" style={{ color: '#10B981' }} />
                <div>
                  <h4 className="font-semibold" style={{ color: '#60A5FA' }}>
                    {correctionData ? 'Logged & AI Learning Applied!' : 'Triage Completed!'}
                  </h4>
                  <p className="text-sm" style={{ color: '#60A5FA' }}>Successfully logged</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Feedback Modal */}
        {showFeedbackModal && completedTriageLog && aiAnalysis && (
          <AIFeedbackModal
            triageLog={completedTriageLog}
            aiAnalysis={aiAnalysis}
            onSubmit={handleFeedbackSubmit}
            onClose={() => {
              setShowFeedbackModal(false);
              resetPatientForm();
            }}
          />
        )}

        {/* Vitals Update Modal */}
        {showVitalsModal && completedTriageLog && (
          <VitalsUpdateModal
            triageLog={completedTriageLog}
            onSubmit={handleVitalsSubmit}
            onClose={() => setShowVitalsModal(false)}
          />
        )}

        {/* Add Vitals Button (when triage completed) */}
        {completedTriageLog && !showFeedbackModal && !showVitalsModal && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 right-8 z-40"
          >
            <Button
              onClick={() => setShowVitalsModal(true)}
              style={{ backgroundColor: '#8B5CF6', color: '#000000' }}
            >
              Update Vitals & Re-Analyze
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}