// Vercel Serverless Function: POST /api/process-triage
// Keeps ANTHROPIC_API_KEY server-side. Clients authenticate with MEDIC_ACCESS_CODE.

const MEDICAL_EXTRACTION_SYSTEM_PROMPT = `You are a military medical data extraction system processing Ukrainian TCCC casualty cards (DD Form 1380 / картка пораненого / Форма 100). Errors in extraction can result in patient death. Accuracy is critical.

## CORE RULES

1. Extract only what is explicitly written. Do NOT infer, guess, or add information not visible on the card.
2. If you see a word or marking but cannot read it clearly, set that field to null. Do not attempt to reconstruct unclear text.
3. "Shrapnel", "fragmentation", or any mechanism not written on the card must NOT appear in your output.
4. Translate all extracted Ukrainian text to concise English in your output.

## CARD STRUCTURE — SEMANTIC FIELD LABELS

Ukrainian military medical cards come in multiple layout variants (Форма 100, Первинна медична картка, DD-1380, etc.). Do NOT assume a fixed layout. Instead, locate fields by scanning for their Ukrainian labels anywhere on the card:

Patient/Admin labels:
- ПРІЗВИЩЕ / ПІБ → patient name
- ВІЙСЬКОВИЙ № → military ID
- ІНД.№ → individual number
- ДАТА, ЧАС → date and time
- ПІДРОЗДІЛ → military unit (NOT the same as АЛЕРГІЇ)
- АЛЕРГІЇ → allergies (NOT the same as ПІДРОЗДІЛ)
- ТИП ЕВАКУАЦІЇ → evacuation type

Clinical labels:
- Механізми / Механізм → mechanism of injury (look for checkboxes with X or ✓ marks)
- Інформація про травми → injury description and body diagram
- Джгут → tourniquet (may appear in dedicated limb sections or inline)
- Пульс, Кров'яний тиск, Частота дихання, SpO2, Притомність (AVPU), Шкала болю → vital signs
- Терапія → MARCH therapy checkboxes
- ЛКІ / Аналгетики / Антибіотики → medications
- Рідина / Кров → IV fluids and blood products
- НОТАТКИ → notes (transcribe ONLY text found near this label)
- ПЕРШИЙ РЯТІВНИК → first responder (always near bottom of card, separate from patient data)

## SAFETY-CRITICAL FIELDS — SPECIAL RULES

These fields use a LOWER confidence threshold. If you can see the information but are uncertain, include it and lower the confidence score. Do NOT null these fields due to uncertainty — a uncertain value that gets manually verified is safer than silence.

### TOURNIQUET (highest priority field)
- The Ukrainian word for tourniquet is: Джгут (also abbreviated Дж or Д with a colon)
- RULE: Any body part (рука/arm, нога/leg, стегно/thigh, плече/shoulder) written near Джгут belongs to tourniquet.location — NOT to injuries
- RULE: Any time value (HH:MM format) written near Джгут belongs to tourniquet.time — NOT to injuries
- RULE: If Джгут appears anywhere on the card, tourniquet.applied must be true
- Common patterns you will see:
  - "Джгут: права рука 11:45" → applied: true, location: "right arm", time: "11:45"
  - "Дж. ліва нога 09:30" → applied: true, location: "left leg", time: "09:30"
  - "Джгут накладений год.___ хв.___" with blanks → applied: false (form field, not filled)
- Some cards have dedicated tourniquet sections per limb (Пр. руки, Л. руки, Пр. ноги, Л. ноги), each with ТИП and ЧАС. Others list tourniquets inline.
- Extract ALL tourniquets with data filled in. Return each in the "tourniquets" array.

### BLOOD TYPE
- ONLY extract if a dedicated blood type field (ГК, група крові) exists on the card AND has a value written in it.
- Many card versions do NOT include a blood type field. If missing or blank, set to null.
- Do NOT guess or infer blood type from other markings on the card.
- If present: Cyrillic notation І(O), ІІ(A), ІІІ(B), ІV(AB). Include Rh factor if written (+ or -).

### NAMES
- Transliterate all names (patient, first responder) from Cyrillic to Latin script (e.g. "ЛЕМЕХА ПЕТРО" → "LEMEKHA PETRO", "ОКРОШКО ГАЛИНА" → "OKROSHKO HALYNA"). Use standard Ukrainian transliteration.

### ALLERGIES  
- "Немає" or "нема" = no known allergies → return []
- If allergies are listed, return each as a separate string in the array

### TRIAGE CATEGORY
- Червоний / Червон = IMMEDIATE
- Жовтий = DELAYED  
- Зелений = MINIMAL
- Чорний = EXPECTANT
- The triage color may be written, underlined, or circled on the card

## MECHANISM OF INJURY — CHECKBOX FIELD

CRITICAL: This section uses PRE-PRINTED checkboxes. The card lists ALL possible mechanisms as printed text, but only the CHECKED ones apply. You MUST distinguish between:
- A checkbox with a handwritten mark (X, ✓, +, or filled box) = SELECTED — include this mechanism
- A checkbox with no mark = NOT SELECTED — do NOT include this mechanism
- Pre-printed text without a mark is just a form label, NOT a diagnosis

Most casualties have only 1-2 mechanisms checked. If you are returning 3+ mechanisms, double-check that each one truly has a handwritten mark next to it.

Common mechanisms and their Ukrainian terms:
- Вогнепальне / ВП = Gunshot wound
- Мінно-вибухове / МВП = Mine-blast injury  
- Осколкове = Fragmentation
- Артилерія / Арт = Artillery
- Міна = Mine
- Граната = Grenade
- ДТП = Vehicle accident
- Опік = Burn
- Хімічне / Хім = Chemical exposure
- Отруєння = Poisoning/toxic exposure
- Баротравма = Blast/barotrauma
- Падіння = Fall

## EVACUATION TYPE

Find the label "ТИП ЕВАКУАЦІЇ:" on the card. Common values:
- автомобільна = automobile
- швидка евакуація / швидка = rapid evacuation
- гелікоптером = helicopter
- пішки = on foot
- санітарний транспорт = medical transport
Do NOT invent evacuation types. If unclear, set to null.

## NOTES FIELD — STRICT EXTRACTION

- The notes field MUST contain ONLY text from the НОТАТКИ section of the card.
- Do NOT generate summaries, clinical observations, or inferred medical assessments.
- Do NOT mention treatments, procedures, or signs not explicitly written in НОТАТКИ.
- If НОТАТКИ is empty or illegible, set notes to null.

## MEDICATIONS vs TREATMENTS — DISTINCTION

- medications: specific drugs with dosages (e.g., "Кеторолак 30mg", "Морфін 10mg", "Ібупрофен 800mg", "Цефтріаксон 1g", "Атропін 1mg", "Дексаметазон 50mg")
- treatments: procedures and interventions (e.g., "tourniquet applied", "wound packed", "IV access", "chest seal", "splint", "oxygen", "blood transfusion", "санітарна обробка")
- Antidotes (антидот) go in medications with the substance name if readable
- Serums (ПСС, ПГС) go in medications
- Look for labels ЛКІ, Аналгетики, Антибіотики, Інші to find medication sections. Extract each medication separately with its name, dose, route, and time.

COMMON UKRAINIAN MEDICATION BRAND NAMES — do NOT confuse similar-sounding drugs:
- Кетанов / Кеторол = Ketorolac (an NSAID) — NOT Ketoprofen (a different drug)
- Морфін / Морфій = Morphine
- Трамадол / Трамал = Tramadol
- Промедол = Trimeperidine
- Налбуфін = Nalbuphine
- Ондансетрон = Ondansetron
- Цефтріаксон = Ceftriaxone
- Цефалоспорин = Cephalosporin (generic class)
- Амоксиклав / Амоксицилін = Amoxicillin/Clavulanate
- Ципрофлоксацин = Ciprofloxacin
- Метоклопрамід / Церукал = Metoclopramide
- Дексаметазон = Dexamethasone
- Атропін = Atropine

## FULL ABBREVIATION REFERENCE

Patient/Admin:
- ПІБ = full name (last, first, patronymic)
- Підрозділ = unit
- В. звання = military rank
- Посвідчення = ID / dog tag number

Vitals:
- АТ = blood pressure (systolic/diastolic)
- ЧСС / Пульс = pulse/heart rate
- ЧД = respiratory rate
- SpO2 / СпО2 = oxygen saturation
- AVPU: Must be exactly ONE value — do NOT combine (e.g., "A/V/P" is WRONG):
  A = Alert (притомний, свідомий)
  V = responds to Voice (реагує на голос)
  P = responds to Pain (реагує на біль)
  U = Unresponsive (непритомний, без свідомості)

Treatments:
- Джгут = tourniquet
- Гемостатик = hemostatic agent (e.g., QuikClot)
- Оклюзійний пластир = occlusive/chest seal
- Іммобілізація = immobilization/splinting
- Переливання крові = blood transfusion
- Крапельниця / в/в = IV infusion
- ШВЛ = mechanical ventilation
- Санітарна обробка = sanitary/decontamination treatment

## CONFIDENCE SCORING
Score 0.0–1.0 reflecting overall legibility and completeness. Fully legible with all fields = 0.95. Partial legibility or missing key fields = 0.5–0.7. Nearly unreadable = below 0.4. Reduce confidence if tourniquet, blood type, or triage category are uncertain — do not null them.`

const EXTRACTION_TOOL = {
  name: 'extract_triage_data',
  description: 'Extract structured medical data from a Ukrainian TCCC casualty card. ALL text values must be translated to English.',
  input_schema: {
    type: 'object',
    properties: {
      patient_name: {
        type: 'string',
        description: 'Find label ПРІЗВИЩЕ or ПІБ. Read the handwritten name and transliterate Cyrillic to Latin. This is the PATIENT, not the first responder.',
      },
      military_id: {
        type: 'string',
        description: 'Find label ВІЙСЬКОВИЙ №. Read the number written next to it.',
      },
      individual_number: {
        type: 'string',
        description: 'Find label ІНД.№. Read the number written next to it.',
      },
      blood_type: {
        type: 'string',
        enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
        description: 'ONLY if a dedicated blood type field (ГК, група крові) exists on the card AND has a value written in it. Many card versions do not include this field. If no blood type field exists or it is blank, return null. Do NOT guess or infer blood type from other markings.',
      },
      allergies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Find label АЛЕРГІЇ. If "немає"/"нема"/"НЕМА" is written, return []. Do NOT return "NONE" as a string. This field is separate from ПІДРОЗДІЛ.',
      },
      unit: {
        type: 'string',
        description: 'Find label ПІДРОЗДІЛ. Read the military unit written next to it, translate to English (e.g., "101st Brigade"). This field is separate from АЛЕРГІЇ.',
      },
      date_time: {
        type: 'string',
        description: 'Find labels ДАТА and ЧАС. Read the complete date and time digits carefully (e.g., "15-3-2026 18:10").',
      },
      evacuation_type: {
        type: 'string',
        description: 'Find label ТИП ЕВАКУАЦІЇ. Translate: автомобільна=automobile, швидка=rapid evacuation, гелікоптером=helicopter. Null if unclear or absent.',
      },
      mechanism_of_injury: {
        type: 'array',
        items: { type: 'string' },
        description: 'From the Механізми CHECKBOX section. The card pre-prints ALL possible mechanisms as text — include ONLY those with a handwritten mark (X, ✓, +) next to them. Unmarked printed text is NOT a diagnosis. Most patients have 1-2 mechanisms. Translate to English.',
      },
      injuries: {
        type: 'string',
        description: 'Find HANDWRITTEN injury descriptions on the card. The body diagram has pre-printed numbers (4.5, 9, etc.) that are part of the blank form — only report handwritten annotations added by the medic. Describe injuries IN ENGLISH. Do NOT include tourniquet locations.',
      },
      injury_locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Body parts where the medic added HANDWRITTEN injury markings (circles, arrows, written text) to the diagram. Ignore pre-printed form numbers. IN ENGLISH.',
      },
      vital_signs: {
        type: 'object',
        description: 'Find the vitals section by scanning for labels: Пульс, Кров\'яний тиск, Частота дихання, SpO2, AVPU, Шкала болю. Read the handwritten value next to each label.',
        properties: {
          time: { type: 'string', description: 'Find label Час or Статус. Time vitals were recorded.' },
          pulse: { type: 'string', description: 'Find label Пульс or ЧСС. Numeric bpm value.' },
          blood_pressure: { type: 'string', description: 'Find label Кров\'яний тиск or АТ. Format: systolic/diastolic. Read each digit carefully.' },
          respiratory_rate: { type: 'string', description: 'Find label Частота дихання or ЧД. Numeric breaths/min.' },
          spo2: { type: 'string', description: 'Find label SpO2 or Пульс ОкС. Percentage value.' },
          avpu: {
            type: 'string',
            enum: ['A', 'V', 'P', 'U'],
            description: 'Find label Притомність or AVPU. Exactly ONE letter: A/V/P/U.',
          },
          pain_scale: { type: 'string', description: 'Find label Шкала болю. Pain score (0-10).' },
        },
      },
      treatments: {
        type: 'array',
        items: { type: 'string' },
        description: 'Procedures IN ENGLISH (e.g., "tourniquet applied", "wound packed", "IV access").',
      },
      medications: {
        type: 'array',
        items: { type: 'string' },
        description: 'Simple medication name list IN ENGLISH.',
      },
      medications_detailed: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category: analgesic, antibiotic, or other.' },
            name: { type: 'string', description: 'Drug name IN ENGLISH. Кетанов=Ketorolac (NOT Ketoprofen). Морфін=Morphine.' },
            dose: { type: 'string', description: 'Dosage with units (e.g., "10mg").' },
            route: { type: 'string', description: 'Route: oral, IV, IM, etc.' },
            time: { type: 'string', description: 'Time administered.' },
          },
          required: ['name'],
        },
        description: 'Find labels ЛКІ, Аналгетики, Антибіотики, Інші. Extract EACH medication row separately.',
      },
      fluids: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['fluid', 'blood'], description: 'fluid or blood product.' },
            name: { type: 'string', description: 'Fluid name IN ENGLISH (e.g., "Ringer\'s solution").' },
            volume: { type: 'string', description: 'Volume (e.g., "500ml").' },
            route: { type: 'string', description: 'Route (e.g., "IV").' },
            time: { type: 'string', description: 'Time administered.' },
          },
          required: ['name'],
        },
        description: 'Find labels Рідина, Кров, or С (fluids/blood). Extract fluid and blood product entries.',
      },
      tourniquet: {
        type: 'object',
        properties: {
          applied: { type: 'boolean', description: 'True if ANY tourniquet section has data filled in.' },
          location: { type: 'string', description: 'Body part IN ENGLISH (e.g., "right arm").' },
          time: { type: 'string', description: 'Time applied.' },
        },
        required: ['applied'],
        description: 'Primary tourniquet. Derived from first filled tourniquet section on card.',
      },
      tourniquets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Body part IN ENGLISH.' },
            type: { type: 'string', description: 'Tourniquet type if written.' },
            time: { type: 'string', description: 'Time applied.' },
          },
          required: ['location'],
        },
        description: 'ALL tourniquets found on the card. Scan for Джгут labels near each limb section.',
      },
      march_therapies: {
        type: 'object',
        description: 'From the Терапія section. Like mechanisms, this uses checkboxes — only include therapies with a handwritten mark.',
        properties: {
          massive_hemorrhage: { type: 'array', items: { type: 'string' }, description: 'M - only CHECKED interventions, IN ENGLISH.' },
          airway: { type: 'array', items: { type: 'string' }, description: 'A - only CHECKED interventions, IN ENGLISH.' },
          respiration: { type: 'array', items: { type: 'string' }, description: 'R - only CHECKED interventions, IN ENGLISH.' },
          circulation: { type: 'array', items: { type: 'string' }, description: 'C - only CHECKED interventions, IN ENGLISH.' },
          secondary: { type: 'array', items: { type: 'string' }, description: 'S - only CHECKED interventions, IN ENGLISH.' },
        },
      },
      triage_category: {
        type: 'string',
        enum: ['IMMEDIATE', 'DELAYED', 'MINIMAL', 'EXPECTANT'],
        description: 'Червоний=IMMEDIATE, Жовтий=DELAYED, Зелений=MINIMAL, Чорний=EXPECTANT.',
      },
      evacuation_priority: {
        type: 'string',
        enum: ['Urgent', 'Priority', 'Routine'],
      },
      first_responder: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Find label ПЕРШИЙ РЯТІВНИК, then read the name near it. Transliterate to Latin. This is the MEDIC who filled out the card, NOT the patient.' },
          id: { type: 'string', description: 'Find ІНД.№ near ПЕРШИЙ РЯТІВНИК label. This ID MUST be different from the patient individual_number.' },
        },
        description: 'Find label ПЕРШИЙ РЯТІВНИК on the card. The name and ID here are the medic, NOT the patient. Values MUST differ from patient_name and individual_number.',
      },
      notes: {
        type: 'string',
        description: 'Find label НОТАТКИ on the card. Transcribe ONLY the handwritten text near that label, then translate to English. Do NOT summarize, paraphrase, or generate clinical observations. Null if empty or illegible.',
      },
      confidence: {
        type: 'number',
        description: 'Extraction confidence 0.0-1.0. Fully legible=0.95, partial=0.5-0.7, unreadable<0.4.',
      },
    },
    required: ['mechanism_of_injury', 'treatments', 'medications', 'tourniquet', 'confidence'],
  },
}

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  // Validate the shared access code from the Authorization header.
  // Expected format: "Bearer <access_code>"
  const authHeader = req.headers['authorization'] ?? ''
  const providedCode = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!providedCode || providedCode !== process.env.MEDIC_ACCESS_CODE) {
    return res.status(401).json({ error: 'Unauthorized. Invalid access code.' })
  }

  const { base64ImageData } = req.body

  if (!base64ImageData) {
    return res.status(400).json({ error: 'Missing required field: base64ImageData.' })
  }

  // Forward request to Anthropic using the server-side API key
  let anthropicResponse
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0,
        system: MEDICAL_EXTRACTION_SYSTEM_PROMPT,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: 'extract_triage_data' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64ImageData,
                },
              },
              {
                type: 'text',
                text: 'Extract all medical fields from this Ukrainian TCCC casualty card. Translate ALL text to English.',
              },
            ],
          },
        ],
      }),
    })
  } catch (networkError) {
    return res.status(502).json({ error: 'Failed to reach Anthropic API.', detail: networkError.message })
  }

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text()
    return res.status(anthropicResponse.status).json({ error: 'Anthropic API error.', detail: errorText })
  }

  const payload = await anthropicResponse.json()
  return res.status(200).json(payload)
}
