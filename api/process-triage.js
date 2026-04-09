// Vercel Serverless Function: POST /api/process-triage
// Keeps ANTHROPIC_API_KEY server-side. Clients authenticate with MEDIC_ACCESS_CODE.

const MEDICAL_EXTRACTION_SYSTEM_PROMPT = `You are a military medical data extraction system processing Ukrainian TCCC casualty cards (DD Form 1380 / картка пораненого / Форма 100). Errors in extraction can result in patient death. Accuracy is critical.

## CORE RULES

1. Extract only what is explicitly written. Do NOT infer, guess, or add information not visible on the card.
2. If you see a word or marking but cannot read it clearly, set that field to null. Do not attempt to reconstruct unclear text.
3. "Shrapnel", "fragmentation", or any mechanism not written on the card must NOT appear in your output.
4. Translate all extracted Ukrainian text to concise English in your output.

## CARD LAYOUT — ФОРМА 100

The card has two halves (left and right). Extract fields from their labeled sections:

LEFT HALF (top to bottom):
- ТИП ЕВАКУАЦІЇ: evacuation type (top header)
- ВІЙСЬКОВИЙ №: military ID number
- ПРІЗВИЩЕ ТА ІМ'Я: patient surname and first name
- ІНД.№: individual number
- ДАТА/М-РІ: date, ЧАС: time
- ПІДРОЗДІЛ: unit
- АЛЕРГІЇ: allergies
- Механізми: checkboxes for mechanism of injury
- Інформація про травми: body diagram with injury markings
- Джгут sections (4 limbs): Пр. руки, Л. руки, Пр. ноги, Л. ноги — each with ТИП and ЧАС
- Vital signs table at bottom: Час, Пульс, Кров'яний тиск, Частота дихання, SpO2, Притомність (AVPU), Шкала болю (0-10)

RIGHT HALF (top to bottom):
- Терапія: therapy checkboxes (M-A-R-C-H protocol categories)
- С: IV fluids/blood section (Назва, Об'єм, Шлях, Час)
- ЛКІ: medications section with sub-rows:
  - Аналгетики (analgesics): Назва, Доза, Шлях, Час
  - Антибіотики (antibiotics): Назва, Доза, Шлях, Час
  - Інші (other medications)
- ІНШЕ: other treatments checkboxes
- НОТАТКИ: free-text notes section — extract ONLY text written here
- ПЕРШИЙ РЯТІВНИК: first responder name and individual number

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
- CARD STRUCTURE: The card has 4 dedicated tourniquet sections — one per limb:
  - Джгут Пр. руки (right arm) — with ТИП (type) and ЧАС (time)
  - Джгут Л. руки (left arm) — with ТИП (type) and ЧАС (time)
  - Джгут Пр. ноги (right leg) — with ТИП (type) and ЧАС (time)
  - Джгут Л. ноги (left leg) — with ТИП (type) and ЧАС (time)
- Extract ALL tourniquets that have data filled in — check each limb section separately.
- Return each in the "tourniquets" array. Do NOT collapse multiple tourniquets into one.

### BLOOD TYPE
- Written as: ГК, група крові, or the blood type directly (A+, B-, O+, AB+, etc.)
- Cyrillic blood type notation: І(O), ІІ(A), ІІІ(B), ІV(AB)
- Include Rh factor if written (+ or -)

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

## MECHANISM OF INJURY — FIELD ISOLATION

This field contains ONLY the cause/mechanism. Do NOT include body parts, times, or treatment details here.

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

Located at top of card as "ТИП ЕВАКУАЦІЇ:" — common values:
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
- The ЛКІ section has sub-rows: Аналгетики, Антибіотики, Інші — extract each medication separately with its name, dose, route, and time.

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
        description: 'From ПРІЗВИЩЕ ТА ІМЯ row on LEFT HALF. Patient full name transliterated from Cyrillic to Latin. NOT the first responder name from the bottom.',
      },
      military_id: {
        type: 'string',
        description: 'From ВІЙСЬКОВИЙ № at TOP LEFT of card, near evacuation type.',
      },
      individual_number: {
        type: 'string',
        description: 'From ІНД.№ field on LEFT HALF, same row as patient name.',
      },
      blood_type: {
        type: 'string',
        enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
        description: 'Blood type. Map Cyrillic: І=O, ІІ=A, ІІІ=B, ІV=AB.',
      },
      allergies: {
        type: 'array',
        items: { type: 'string' },
        description: 'From АЛЕРГІЇ field on LEFT HALF. If "немає"/"нема"/"НЕМА" is written, return empty array []. Do NOT return "NONE" as an allergy string.',
      },
      unit: {
        type: 'string',
        description: 'From ПІДРОЗДІЛ row on LEFT HALF, below ДАТА/ЧАС. Military unit designation in English (e.g., "101st Brigade", "25th Mechanized"). This is NOT the allergies field.',
      },
      date_time: {
        type: 'string',
        description: 'From ДАТА-М/РІ and ЧАС fields on LEFT HALF, below patient name. Read the complete date digits carefully (e.g., "15-3-2026 18:10").',
      },
      evacuation_type: {
        type: 'string',
        description: 'From ТИП ЕВАКУАЦІЇ at TOP of card. Translate: автомобільна=automobile, швидка=rapid evacuation, гелікоптером=helicopter. Null if unclear.',
      },
      mechanism_of_injury: {
        type: 'array',
        items: { type: 'string' },
        description: 'From Механізми checkbox section on LEFT HALF. Include ONLY mechanisms with a check mark (X or ✓). Translate to English.',
      },
      injuries: {
        type: 'string',
        description: 'From Інформація про травми section and body diagram markings. Describe injuries IN ENGLISH. Do NOT include tourniquet locations here.',
      },
      injury_locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Body parts with injury markings on the diagram, IN ENGLISH. Do NOT include tourniquet-only locations.',
      },
      vital_signs: {
        type: 'object',
        description: 'All values from the VITAL SIGNS TABLE at BOTTOM LEFT of card. Each row has a label and a handwritten value.',
        properties: {
          time: { type: 'string', description: 'From Час row (first row of vitals table).' },
          pulse: { type: 'string', description: 'From Пульс (частота) row. Numeric bpm value.' },
          blood_pressure: { type: 'string', description: 'From Кров\'яний тиск row. Format: systolic/diastolic (e.g., "140/90"). Read each digit carefully.' },
          respiratory_rate: { type: 'string', description: 'From Частота дихання row. Numeric breaths/min.' },
          spo2: { type: 'string', description: 'From Пульс ОкС/О2 насич. row. Percentage value.' },
          avpu: {
            type: 'string',
            enum: ['A', 'V', 'P', 'U'],
            description: 'From Притомність (AVPU) row. Exactly ONE letter.',
          },
          pain_scale: { type: 'string', description: 'From Шкала болю (0-10) row. The LAST row in the vitals table.' },
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
        description: 'Detailed medications from ЛКІ section. Extract EACH sub-row (Аналгетики, Антибіотики, Інші) separately.',
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
        description: 'IV fluids and blood products from the С section.',
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
        description: 'ALL tourniquets. Check each of the 4 limb sections (Пр. руки, Л. руки, Пр. ноги, Л. ноги).',
      },
      march_therapies: {
        type: 'object',
        properties: {
          massive_hemorrhage: { type: 'array', items: { type: 'string' }, description: 'M interventions IN ENGLISH.' },
          airway: { type: 'array', items: { type: 'string' }, description: 'A interventions IN ENGLISH.' },
          respiration: { type: 'array', items: { type: 'string' }, description: 'R interventions IN ENGLISH.' },
          circulation: { type: 'array', items: { type: 'string' }, description: 'C interventions IN ENGLISH.' },
          secondary: { type: 'array', items: { type: 'string' }, description: 'S interventions IN ENGLISH.' },
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
          name: { type: 'string', description: 'From ПРІЗВИЩЕ ІМ\'Я line at VERY BOTTOM RIGHT of card, after ПЕРШИЙ РЯТІВНИК label. Transliterate to Latin. This is the MEDIC, not the patient.' },
          id: { type: 'string', description: 'From ІНД.№ at VERY BOTTOM RIGHT, same line as first responder name. This number MUST be different from the patient individual_number.' },
        },
        description: 'From ПЕРШИЙ РЯТІВНИК section at VERY BOTTOM of RIGHT HALF. The name and ID here belong to the medic who filled out the card. They MUST differ from patient_name and individual_number.',
      },
      notes: {
        type: 'string',
        description: 'From НОТАТКИ box on RIGHT HALF of card, above ПЕРШИЙ РЯТІВНИК. Transcribe ONLY the handwritten text in that box, then translate to English. Do NOT summarize, paraphrase, or generate clinical observations. If the box is empty or fully illegible, return null.',
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
