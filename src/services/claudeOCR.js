const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const EVAC_PRIORITIES = ['Urgent', 'Priority', 'Routine']

function toArray(value, allowNull = false) {
  if (value == null) {
    return allowNull ? null : []
  }

  let cleaned = []
  if (Array.isArray(value)) {
    cleaned = value.map((item) => item?.toString().trim()).filter(Boolean)
  } else {
    cleaned = value
      .toString()
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  // Use a Set to remove exact duplicates
  const deduplicated = [...new Set(cleaned)]
  
  return allowNull && deduplicated.length === 0 ? null : deduplicated
}

  const cleaned = value
    .toString()
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return allowNull && cleaned.length === 0 ? null : cleaned
}

function normalizeBloodType(value) {
  return BLOOD_TYPES.includes(value) ? value : null
}

const TRIAGE_MAPPING = {
  IMMEDIATE: ['IMMEDIATE', 'RED', 'ЧЕРВОНИЙ', 'НЕГАЙНО'],
  DELAYED: ['DELAYED', 'YELLOW', 'ЖОВТИЙ', 'ВІДКЛАДЕНИЙ'],
  MINIMAL: ['MINIMAL', 'GREEN', 'ЗЕЛЕНИЙ', 'ЛЕГКИЙ'],
  EXPECTANT: ['EXPECTANT', 'BLACK', 'ЧОРНИЙ']
}

function normalizeTriageCategory(value) {
  if (!value) return null;

  const upperValue = value.toString().trim().toUpperCase();

  const matchedCategory = Object.entries(TRIAGE_MAPPING).find(([category, keywords]) => 
    keywords.includes(upperValue)
  );

  return matchedCategory ? matchedCategory[0] : null;
}

function normalizeEvacuationPriority(value) {
  if (!value) {
    return null
  }

  const match = EVAC_PRIORITIES.find(
    (priority) => priority.toLowerCase() === value.toString().trim().toLowerCase(),
  )

  return match ?? null
}

function stripJsonCodeFence(value) {
  return value
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim()
}

function extractJsonFromClaudeResponse(payload) {
  const contentBlocks = Array.isArray(payload?.content) ? payload.content : []
  const responseText = contentBlocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  if (!responseText.trim()) {
    throw new Error('Claude did not return OCR text.')
  }

  try {
    return JSON.parse(stripJsonCodeFence(responseText))
  } catch {
    throw new Error(`Claude returned unreadable data. Raw response: ${responseText.slice(0, 120)}`)
  }
}

export function normalizeTriageResult(payload = {}, overrides = {}) {
  const normalized = {
    patient_name: payload.patient_name?.toString().trim() || null,
    blood_type: normalizeBloodType(payload.blood_type),
    allergies: toArray(payload.allergies, true),
    unit: payload.unit?.toString().trim() || null,
    date_time: payload.date_time?.toString().trim() || null,
    mechanism_of_injury: toArray(payload.mechanism_of_injury),
    injuries: payload.injuries?.toString().trim() || null,
    vital_signs: {
      pulse: payload.vital_signs?.pulse?.toString().trim() || null,
      blood_pressure: payload.vital_signs?.blood_pressure?.toString().trim() || null,
      respiratory_rate: payload.vital_signs?.respiratory_rate?.toString().trim() || null,
      spo2: payload.vital_signs?.spo2?.toString().trim() || null,
      avpu: payload.vital_signs?.avpu?.toString().trim() || null,
    },
    treatments: toArray(payload.treatments),
    medications: toArray(payload.medications),
    tourniquet: {
      applied: Boolean(payload.tourniquet?.applied),
      location: payload.tourniquet?.location?.toString().trim() || null,
      time: payload.tourniquet?.time?.toString().trim() || null,
    },
    triage_category: normalizeTriageCategory(payload.triage_category),
    evacuation_priority: normalizeEvacuationPriority(payload.evacuation_priority),
    notes: payload.notes?.toString().trim() || null,
    confidence: Number.isFinite(payload.confidence)
      ? Math.max(0, Math.min(1, Number(payload.confidence)))
      : 0,
    ...overrides,
  }

  return normalized
}

// Sends base64 image data to our Vercel serverless function.
// The access code (a shared password) is passed as a Bearer token —
// the actual Anthropic API key never touches the client.
export async function extractWithClaude({ accessCode, base64ImageData }) {
  const response = await fetch('/api/process-triage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessCode}`,
    },
    body: JSON.stringify({ base64ImageData }),
  })

  if (!response.ok) {
    // The server returns JSON errors; extract the message for a readable throw.
    let errorMessage = `Server error ${response.status}`
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.error ?? errorBody.detail ?? errorMessage
    } catch {
      errorMessage = (await response.text()) || errorMessage
    }
    throw new Error(errorMessage)
  }

  // The serverless function returns the raw Anthropic payload; parse it here.
  const payload = await response.json()
  const parsedJson = extractJsonFromClaudeResponse(payload)
  return normalizeTriageResult(parsedJson)
}
