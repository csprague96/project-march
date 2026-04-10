const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const EVAC_PRIORITIES = ['Urgent', 'Priority', 'Routine']

const TRIAGE_MAPPING = {
  IMMEDIATE: ['IMMEDIATE', 'RED', 'ЧЕРВОНИЙ', 'НЕГАЙНО'],
  DELAYED: ['DELAYED', 'YELLOW', 'ЖОВТИЙ', 'ВІДКЛАДЕНИЙ'],
  MINIMAL: ['MINIMAL', 'GREEN', 'ЗЕЛЕНИЙ', 'ЛЕГКИЙ'],
  EXPECTANT: ['EXPECTANT', 'BLACK', 'ЧОРНИЙ']
}

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

  const deduplicated = [...new Set(cleaned)]
  
  return allowNull && deduplicated.length === 0 ? null : deduplicated
}

function normalizeBloodType(value) {
  return BLOOD_TYPES.includes(value) ? value : null
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

  // Tool Use response: structured data in tool_use block
  const toolUseBlock = contentBlocks.find((block) => block.type === 'tool_use')
  if (toolUseBlock?.input) {
    return toolUseBlock.input
  }

  // Fallback: legacy text-based JSON response
  const responseText = contentBlocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  if (!responseText.trim()) {
    throw new Error('Claude did not return extraction data.')
  }

  try {
    return JSON.parse(stripJsonCodeFence(responseText))
  } catch {
    throw new Error(`Claude returned unreadable data. Raw response: ${responseText.slice(0, 120)}`)
  }
}

function normalizeString(value) {
  return value?.toString().trim() || null
}

const VALID_AVPU = ['A', 'V', 'P', 'U']

function normalizeAvpu(value) {
  if (!value) return null
  const cleaned = value.toString().trim().toUpperCase()
  if (VALID_AVPU.includes(cleaned)) return cleaned
  const parts = cleaned.split(/[/,\s]+/)
  const firstValid = parts.find((p) => VALID_AVPU.includes(p))
  return firstValid ?? null
}

function normalizeMedicationsDetailed(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && item.name)
    .map((item) => ({
      category: normalizeString(item.category),
      name: normalizeString(item.name) ?? '',
      dose: normalizeString(item.dose),
      route: normalizeString(item.route),
      time: normalizeString(item.time),
    }))
}

function normalizeFluids(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && item.name)
    .map((item) => ({
      type: item.type === 'blood' ? 'blood' : 'fluid',
      name: normalizeString(item.name) ?? '',
      volume: normalizeString(item.volume),
      route: normalizeString(item.route),
      time: normalizeString(item.time),
    }))
}

function normalizeTourniquets(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && item.location)
    .map((item) => ({
      location: normalizeString(item.location) ?? '',
      type: normalizeString(item.type),
      time: normalizeString(item.time),
    }))
}

function normalizeMarchTherapies(value) {
  if (!value || typeof value !== 'object') return null
  return {
    massive_hemorrhage: toArray(value.massive_hemorrhage),
    airway: toArray(value.airway),
    respiration: toArray(value.respiration),
    circulation: toArray(value.circulation),
    secondary: toArray(value.secondary),
  }
}

export function normalizeTriageResult(payload = {}, overrides = {}) {
  const tourniquets = normalizeTourniquets(payload.tourniquets)
  const firstTourniquet = tourniquets[0] ?? null

  const normalized = {
    patient_name: normalizeString(payload.patient_name),
    military_id: normalizeString(payload.military_id),
    individual_number: normalizeString(payload.individual_number),
    blood_type: normalizeBloodType(payload.blood_type),
    allergies: toArray(payload.allergies, true),
    unit: normalizeString(payload.unit),
    date_time: normalizeString(payload.date_time),
    evacuation_type: normalizeString(payload.evacuation_type),
    mechanism_of_injury: toArray(payload.mechanism_of_injury),
    injuries: normalizeString(payload.injuries),
    injury_locations: toArray(payload.injury_locations, true),
    vital_signs: {
      time: normalizeString(payload.vital_signs?.time),
      pulse: normalizeString(payload.vital_signs?.pulse),
      blood_pressure: normalizeString(payload.vital_signs?.blood_pressure),
      respiratory_rate: normalizeString(payload.vital_signs?.respiratory_rate),
      spo2: normalizeString(payload.vital_signs?.spo2),
      avpu: normalizeAvpu(payload.vital_signs?.avpu),
      pain_scale: normalizeString(payload.vital_signs?.pain_scale),
    },
    treatments: toArray(payload.treatments),
    medications: toArray(payload.medications),
    medications_detailed: normalizeMedicationsDetailed(payload.medications_detailed),
    fluids: normalizeFluids(payload.fluids),
    // Legacy singular tourniquet — derived from the first entry in tourniquets,
    // or from the legacy field if tourniquets array is empty (old records).
    tourniquet: {
      applied: tourniquets.length > 0 ? true : Boolean(payload.tourniquet?.applied),
      location: firstTourniquet?.location ?? normalizeString(payload.tourniquet?.location),
      time: firstTourniquet?.time ?? normalizeString(payload.tourniquet?.time),
    },
    tourniquets,
    march_therapies: normalizeMarchTherapies(payload.march_therapies),
    triage_category: normalizeTriageCategory(payload.triage_category),
    evacuation_priority: normalizeEvacuationPriority(payload.evacuation_priority),
    first_responder: payload.first_responder
      ? { name: normalizeString(payload.first_responder.name), id: normalizeString(payload.first_responder.id) }
      : null,
    notes: (() => {
      const raw = normalizeString(payload.notes)
      if (!raw) return null
      return raw.length > 500 ? raw.slice(0, 500) : raw
    })(),
    confidence: Number.isFinite(payload.confidence)
      ? Math.max(0, Math.min(1, Number(payload.confidence)))
      : 0,
    ...overrides,
  }

  return normalized
}

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
    let errorMessage = `Server error ${response.status}`
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.error ?? errorBody.detail ?? errorMessage
    } catch {
      errorMessage = (await response.text()) || errorMessage
    }
    throw new Error(errorMessage)
  }

  const payload = await response.json()
  const parsedJson = extractJsonFromClaudeResponse(payload)
  return normalizeTriageResult(parsedJson)
}
