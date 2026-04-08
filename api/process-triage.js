// Vercel Serverless Function: POST /api/process-triage
// Keeps ANTHROPIC_API_KEY server-side. Clients authenticate with MEDIC_ACCESS_CODE.

const MEDICAL_EXTRACTION_SYSTEM_PROMPT = `You are a military medical document extraction system. You are reading a Ukrainian TCCC casualty card (DD Form 1380 / картка пораненого).

Extract ALL of the following fields from the handwritten document. If a field is not legible or not present, set it to null. Do not guess. If you are less than 80% confident in a value, set it to null.

Return ONLY a valid JSON object with this exact structure:
{
  "patient_name": string | null,
  "blood_type": string | null,
  "allergies": string[] | null,
  "unit": string | null,
  "date_time": string | null,
  "mechanism_of_injury": string[],
  "injuries": string | null,
  "vital_signs": {
    "pulse": string | null,
    "blood_pressure": string | null,
    "respiratory_rate": string | null,
    "spo2": string | null,
    "avpu": string | null
  },
  "treatments": string[],
  "medications": string[],
  "tourniquet": {
    "applied": boolean,
    "location": string | null,
    "time": string | null
  },
  "triage_category": string | null,
  "evacuation_priority": string | null,
  "notes": string | null,
  "confidence": number
}

Common Ukrainian medical abbreviations you may encounter:
- ГК (група крові) = blood type
- АТ (артеріальний тиск) = blood pressure
- ЧД (частота дихання) = respiratory rate
- ЧСС (частота серцевих скорочень) = heart rate
- Джгут = tourniquet
- Гемостатик = hemostatic agent
- Знеболення = pain management
- Опік = burn
- ВП (вогнепальне поранення) = gunshot wound
- МВП (мінно-вибухове поранення) = mine-blast injury
- Осколкове = fragmentation or shrapnel

Translate extracted medical content into concise English for all returned text fields.`

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
        max_tokens: 2048,
        system: MEDICAL_EXTRACTION_SYSTEM_PROMPT,
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
                text: 'Extract all medical fields from this Ukrainian TCCC casualty card. Return ONLY the JSON object, no other text.',
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
