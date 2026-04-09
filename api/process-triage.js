// Vercel Serverless Function: POST /api/process-triage
// Keeps API keys server-side. Clients authenticate with MEDIC_ACCESS_CODE.

const MEDICAL_EXTRACTION_SYSTEM_PROMPT = `You are a strict deterministic data structuring assistant. You process raw, messy OCR text scraped by Google Cloud Vision from Ukrainian TCCC casualty cards (Forma 100, DD-1380, etc.).

Your ONLY job is to map the provided OCR text string into the requested JSON schema. Errors in extraction can result in patient death. Accuracy is critical.

## CORE RULES
1. Extract ONLY what is present in the OCR text. DO NOT infer, guess, or generate information.
2. Translate all extracted Ukrainian text to concise English.
3. DO NOT write generative summaries. You are a transcription mapper, not a doctor.
4. The OCR text will be chaotic, out of order, and contain noise. Look for semantic labels (ПІБ, Джгут, НОТАТКИ, АЛЕРГІЇ) to locate the corresponding values.

## EVACUATION TYPE
Common values near "ТИП ЕВАКУАЦІЇ": автомобільна=automobile, швидка=rapid evacuation, гелікоптером=helicopter, пішки=on foot.

## MEDICATIONS
- Кетанов / Кеторол = Ketorolac (an NSAID) — NOT Ketoprofen
- Морфін / Морфій = Morphine
- Трамадол = Tramadol
- Цефтріаксон = Ceftriaxone
- Цефалоспорин = Cephalosporin
- Дексаметазон = Dexamethasone

## CONFIDENCE SCORING
Score 0.0–1.0. High confidence (0.9+) if standard fields (Name, Pulse, Tourniquet) are easily found. Lower confidence if text is highly fragmented or contradictory.`

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
            content: `Here is the raw OCR text extracted from the Ukrainian TCCC card:\n\n<ocr_text>\n${rawOcrText}\n</ocr_text>\n\nMap this text into the structured JSON schema. Translate all clinical data to English. Follow the strict transcription rules for notes and injuries.`,
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
