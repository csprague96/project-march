export const maxDuration = 60; 

// Vercel Serverless Function: POST /api/process-triage
// Keeps API keys server-side.

const MEDICAL_EXTRACTION_SYSTEM_PROMPT = `You are a strict deterministic data structuring assistant. You receive BOTH raw OCR text (from Google Cloud Vision) AND the original image of Ukrainian TCCC casualty cards (Forma 100, DD-1380, etc.).

Your ONLY job is to map text into the requested JSON schema. Errors in extraction can result in patient death. Accuracy is critical.

Use the OCR text as your primary source for spelling, numbers, and text values. Use the image to verify checkboxes, handwritten marks, and to locate section boundaries (especially НОТАТКИ).

## CORE RULES
1. Extract ONLY what is present in the OCR text or visible on the image. DO NOT infer, guess, or generate information.
2. If you see a word or marking but cannot read it clearly, set that field to null. Do not attempt to reconstruct unclear text.
3. Translate all extracted Ukrainian text to concise English.
4. DO NOT write generative summaries. You are a transcription mapper, not a doctor.
5. The OCR text will be chaotic, out of order, and contain noise. Look for semantic labels to locate the corresponding values (see CARD STRUCTURE below).
6. Each piece of extracted text belongs to exactly ONE field. Do NOT duplicate text across multiple fields or use notes as a catch-all for unplaced text.

## CARD STRUCTURE — SEMANTIC FIELD LABELS

Ukrainian military medical cards come in multiple layout variants. Do NOT assume a fixed layout. Instead, locate fields by scanning for their Ukrainian labels anywhere on the card:

Patient/Admin labels:
- ПРІЗВИЩЕ / ПІБ → patient_name
- ВІЙСЬКОВИЙ № → military_id
- ІНД.№ → individual_number
- ДАТА, ЧАС → date_time
- ПІДРОЗДІЛ → unit (NOT the same as АЛЕРГІЇ)
- АЛЕРГІЇ → allergies (NOT the same as ПІДРОЗДІЛ)
- ТИП ЕВАКУАЦІЇ → evacuation_type

Clinical labels:
- Механізми / Механізм → mechanism_of_injury (look for checkboxes with X or ✓ marks)
- Інформація про травми → injuries (body diagram area)
- Джгут → tourniquet (may appear in dedicated limb sections or inline)
- Пульс, Кров'яний тиск, Частота дихання, SpO2, Притомність (AVPU), Шкала болю → vital_signs
- Терапія → march_therapies checkboxes
- ЛКІ / Аналгетики / Антибіотики → medications
- Рідина / Кров → fluids
- НОТАТКИ → notes (transcribe ONLY text found near this label)
- ПЕРШИЙ РЯТІВНИК → first_responder (always near bottom of card, separate from patient data)

## SAFETY-CRITICAL FIELDS

### TOURNIQUET (highest priority field)
- Ukrainian word: Джгут (also abbreviated Дж or Д with a colon)
- Any body part (рука/arm, нога/leg, стегно/thigh, плече/shoulder) written near Джгут belongs to tourniquet.location — NOT to injuries
- Any time value (HH:MM) near Джгут belongs to tourniquet.time — NOT to injuries
- If Джгут appears anywhere on the card, tourniquet.applied must be true
- Common patterns:
  - "Джгут: права рука 11:45" → applied: true, location: "right arm", time: "11:45"
  - "Дж. ліва нога 09:30" → applied: true, location: "left leg", time: "09:30"
  - "Джгут накладений год.___ хв.___" with blanks → applied: false (empty form field)
- Some cards have dedicated tourniquet sections per limb. Extract ALL filled-in tourniquets into the "tourniquets" array.

### BLOOD TYPE
- ONLY extract if a dedicated blood type field (ГК, група крові) exists AND has a value written.
- Many card versions do NOT include a blood type field. If missing or blank, set to null.
- Cyrillic notation: І(O), ІІ(A), ІІІ(B), ІV(AB). Include Rh factor if written (+ or -).

### NAMES
- Transliterate all names from Cyrillic to Latin script (e.g. "ЛЕМЕХА ПЕТРО" → "LEMEKHA PETRO"). Use standard Ukrainian transliteration.

### ALLERGIES
- "Немає" or "нема" = no known allergies → return []
- If allergies are listed, return each as a separate string in the array

### TRIAGE CATEGORY
- Червоний / Червон = IMMEDIATE
- Жовтий = DELAYED
- Зелений = MINIMAL
- Чорний = EXPECTANT

## MECHANISM OF INJURY — CHECKBOX FIELD

CRITICAL: This section uses PRE-PRINTED checkboxes. The card lists ALL possible mechanisms as printed text, but only the CHECKED ones apply. You MUST distinguish between:
- A checkbox with a handwritten mark (X, ✓, +, or filled box) = SELECTED — include this mechanism
- A checkbox with no mark = NOT SELECTED — do NOT include this mechanism
- Pre-printed text without a mark is just a form label, NOT a diagnosis

Most casualties have only 1-2 mechanisms checked. If you are returning 3+ mechanisms, double-check that each one truly has a handwritten mark next to it.

Common mechanisms:
- Вогнепальне / ВП = Gunshot wound
- Мінно-вибухове / МВП = Mine-blast injury
- Осколкове = Fragmentation
- Артилерія / Арт = Artillery
- Міна = Mine
- Граната = Grenade
- ДТП = Vehicle accident
- Опік = Burn
- Хімічне / Хім = Chemical exposure
- Баротравма = Blast/barotrauma
- Падіння = Fall

## EVACUATION TYPE
Find the label "ТИП ЕВАКУАЦІЇ:" on the card. Common values:
- автомобільна = automobile
- швидка евакуація / швидка = rapid evacuation
- гелікоптером = helicopter
- пішки = on foot
- санітарний транспорт = medical transport
If unclear, set to null.

## NOTES FIELD — TRANSCRIPTION ONLY

This is a TRANSCRIPTION task, not a comprehension task. You are a handwriting-to-text converter for the НОТАТКИ section ONLY.

RULES:
1. Find the label НОТАТКИ on the card.
2. TRANSCRIBE the exact handwritten ink marks next to that label, word by word.
3. Translate the transcribed Ukrainian text to English.
4. If some words are unclear, transcribe what you CAN read and mark gaps with [...].
5. Only return null if the НОТАТКИ section is completely empty (no ink) or 100% illegible.

DO NOT:
- Generate clinical summaries or narratives
- Invent phrases like "conscious, stable condition", "no signs of shock", "bleeding stopped" unless those EXACT words are handwritten in НОТАТКИ
- Combine information from other parts of the card into notes
- Write anything that sounds like a professional medical assessment
- Use notes as a catch-all for text you could not place in other fields

The notes field should read like a rough translation of messy handwriting, not a polished clinical report.

## MEDICATIONS vs TREATMENTS — DISTINCTION
- medications: specific drugs with dosages (e.g., "Ketorolac 30mg", "Morphine 10mg")
- treatments: procedures and interventions (e.g., "tourniquet applied", "wound packed", "IV access", "chest seal")
- Antidotes (антидот) go in medications with the substance name if readable
- Serums (ПСС, ПГС) go in medications

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
- AVPU: Must be exactly ONE value — do NOT combine:
  A = Alert (притомний, свідомий)
  V = responds to Voice (реагує на голос)
  P = responds to Pain (реагує на біль)
  U = Unresponsive (непритомний, без свідомості)

Treatments:
- Джгут = tourniquet
- Гемостатик = hemostatic agent
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
  description: 'Map raw OCR text into structured medical data. ALL text values must be translated to English.',
  input_schema: {
    type: 'object',
    properties: {
      patient_name: {
        type: 'string',
        description: 'Patient name (near ПРІЗВИЩЕ/ПІБ). Transliterate to Latin script. This is NOT the first responder.',
      },
      military_id: { type: 'string', description: 'Military ID near ВІЙСЬКОВИЙ №.' },
      individual_number: { type: 'string', description: 'Individual number near ІНД.№.' },
      allergies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Allergies. If "немає"/"нема"/"НЕМА", return []. DO NOT return "NONE" as a string.',
      },
      unit: { type: 'string', description: 'Military unit (near ПІДРОЗДІЛ), translated to English.' },
      date_time: { type: 'string', description: 'Date and time (near ДАТА/ЧАС).' },
      evacuation_type: { type: 'string', description: 'Evacuation type. Translate to English.' },
      mechanism_of_injury: {
        type: 'array',
        items: { type: 'string' },
        description: 'Mechanisms of injury (Вогнепальне=Gunshot, Мінно-вибухове=Mine-blast, Опік=Burn). ONLY include if marked.',
      },
      injuries: {
        type: 'string',
        description: 'TRANSCRIBE EXACTLY. DO NOT generate clinical summaries. Ignore pre-printed form numbers like 4.5 or 9. Describe injuries IN ENGLISH.',
      },
      injury_locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Affected body parts IN ENGLISH (e.g., "right arm").',
      },
      vital_signs: {
        type: 'object',
        description: 'Vital signs.',
        properties: {
          time: { type: 'string' },
          pulse: { type: 'string' },
          blood_pressure: { type: 'string', description: 'Systolic/diastolic (e.g., "120/80").' },
          respiratory_rate: { type: 'string' },
          spo2: { type: 'string', description: 'Percentage.' },
          avpu: { type: 'string', enum: ['A', 'V', 'P', 'U'] },
          pain_scale: { type: 'string', description: '0-10 scale.' },
        },
      },
      treatments: {
        type: 'array',
        items: { type: 'string' },
        description: 'Procedures IN ENGLISH (e.g., "tourniquet applied", "wound packed").',
      },
      medications: {
        type: 'array',
        items: { type: 'string' },
        description: 'Simple medication list IN ENGLISH.',
      },
      medications_detailed: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            name: { type: 'string', description: 'Drug name IN ENGLISH.' },
            dose: { type: 'string' },
            route: { type: 'string' },
            time: { type: 'string' },
          },
          required: ['name'],
        },
      },
      fluids: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['fluid', 'blood'] },
            name: { type: 'string' },
            volume: { type: 'string' },
            route: { type: 'string' },
            time: { type: 'string' },
          },
          required: ['name'],
        },
      },
      tourniquet: {
        type: 'object',
        properties: {
          applied: { type: 'boolean' },
          location: { type: 'string' },
          time: { type: 'string' },
        },
        required: ['applied'],
      },
      tourniquets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            type: { type: 'string' },
            time: { type: 'string' },
          },
          required: ['location'],
        },
      },
      march_therapies: {
        type: 'object',
        properties: {
          massive_hemorrhage: { type: 'array', items: { type: 'string' } },
          airway: { type: 'array', items: { type: 'string' } },
          respiration: { type: 'array', items: { type: 'string' } },
          circulation: { type: 'array', items: { type: 'string' } },
          secondary: { type: 'array', items: { type: 'string' } },
        },
      },
      triage_category: {
        type: 'string',
        enum: ['IMMEDIATE', 'DELAYED', 'MINIMAL', 'EXPECTANT'],
      },
      evacuation_priority: {
        type: 'string',
        enum: ['Urgent', 'Priority', 'Routine'],
      },
      first_responder: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name near ПЕРШИЙ РЯТІВНИК. MUST be different from patient.' },
          id: { type: 'string' },
        },
      },
      notes: {
        type: 'string',
        description: 'TRANSCRIBE THE EXACT HANDWRITTEN INK in the НОТАТКИ section. DO NOT generate summaries. DO NOT invent clinical narratives. DO NOT use phrases like "wounded in combat" unless explicitly written. If absent, return null.',
      },
      confidence: {
        type: 'number',
        description: 'Confidence score 0.0-1.0.',
      },
    },
    required: ['mechanism_of_injury', 'treatments', 'medications', 'tourniquet', 'confidence'],
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const authHeader = req.headers['authorization'] ?? ''
  const providedCode = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!providedCode || providedCode !== process.env.MEDIC_ACCESS_CODE) {
    return res.status(401).json({ error: 'Unauthorized. Invalid access code.' })
  }

  const { base64ImageData } = req.body

  if (!base64ImageData) {
    return res.status(400).json({ error: 'Missing required field: base64ImageData.' })
  }

  if (!process.env.GOOGLE_VISION_API_KEY) {
    return res.status(500).json({ error: 'Google Vision API key is not configured on the server.' })
  }

  // --- PASS 1: GOOGLE CLOUD VISION OCR ---
  let rawOcrText = ''
  try {
    const gcvResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64ImageData },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            },
          ],
        }),
      }
    )

    if (!gcvResponse.ok) {
      const errorText = await gcvResponse.text()
      return res.status(gcvResponse.status).json({ error: 'Google Vision API error.', detail: errorText })
    }

    const gcvData = await gcvResponse.json()
    rawOcrText = gcvData.responses?.[0]?.fullTextAnnotation?.text || ''

    if (!rawOcrText.trim()) {
      return res.status(422).json({ error: 'No text could be extracted from the image.' })
    }
  } catch (networkError) {
    return res.status(502).json({ error: 'Failed to reach Google Vision API.', detail: networkError.message })
  }

// --- PASS 2: CLAUDE LLM STRUCTURING ---
  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
                text: `Here is the raw OCR text extracted by Google Cloud Vision:\n\n<ocr_text>\n${rawOcrText}\n</ocr_text>\n\nCRITICAL INSTRUCTIONS:\n1. Use the <ocr_text> as your ground truth for spelling names, vitals, numbers, and transcribing notes. Do not hallucinate names that are not in the text.\n2. Look at the IMAGE to determine which checkboxes are actually marked with pen ink.\n3. DO NOT extract a mechanism, treatment, or therapy just because the pre-printed word exists in the text. You MUST verify with the image that the medic actually marked it.\n4. If the Notes section in the image is empty, return null, even if OCR text picked up random noise nearby.\n5. For the notes field: locate the НОТАТКИ label in the image. ONLY transcribe handwritten text that physically appears next to that label. If there is no handwritten text near НОТАТКИ, return null for notes. Do NOT place OCR text from other sections (names, vitals, medications) into notes.\n6. Each piece of extracted text belongs to exactly ONE field. Route text to the field whose Ukrainian label it appears near. Do NOT duplicate text across multiple fields, and do NOT use notes as a catch-all for unplaced text.`,
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text()
      return res.status(anthropicResponse.status).json({ error: 'Anthropic API error.', detail: errorText })
    }

    const payload = await anthropicResponse.json()
    return res.status(200).json(payload)
  } catch (networkError) {
    return res.status(502).json({ error: 'Failed to reach Anthropic API.', detail: networkError.message })
  }
}
