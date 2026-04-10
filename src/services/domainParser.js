import {
  BLOOD_TYPES_UA,
  EVACUATION_PRIORITY_KEYWORDS,
  EVACUATION_TYPES_UA,
  INJURY_MECHANISMS_UA,
  MEDICATIONS_UA,
  TREATMENTS_UA,
  TRIAGE_CATEGORY_KEYWORDS,
} from '../data/medicalVocab'
import { getDictionaryMatches } from '../utils/fuzzyMatch'
import { normalizeTriageResult } from './claudeOCR'

// Exact-match dictionaries for the most common standardized handwritten values.
// Keys are lowercase Ukrainian; values are English. Unmatched strings pass through
// as-is so no data is silently dropped.

const BODY_PART_UA = {
  'права нога': 'Right Leg',
  'ліва нога': 'Left Leg',
  'права рука': 'Right Arm',
  'ліва рука': 'Left Arm',
  'шия': 'Neck',
}

const ALLERGY_UA = {
  'немає': 'None known',
  'невідомо': 'Unknown',
}

// Translates a raw extracted string using a given dictionary.
// Comparison is case- and whitespace-insensitive. Falls back to the original
// string if no match is found so Cyrillic text is never silently discarded.
function translateOrPassthrough(raw, dictionary) {
  if (!raw) {
    return raw
  }

  const normalized = raw.trim().toLowerCase()
  return dictionary[normalized] ?? raw.trim()
}

function findFirstMatch(text, expressions) {
  for (const expression of expressions) {
    const match = text.match(expression)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return null
}

function findKeywordGroup(text, groups) {
  return Object.entries(groups).find(([, keywords]) =>
    keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase())),
  )?.[0] ?? null
}

function extractBloodType(text) {
  const directMatch = text.match(/\b(AB[+-]|A[+-]|B[+-]|O[+-])\b/i)?.[1]

  if (directMatch) {
    return directMatch.toUpperCase()
  }

  const uaMatch = Object.entries(BLOOD_TYPES_UA).find(([key]) => text.includes(key))
  return uaMatch?.[1] ?? null
}

function extractVitals(text) {
  return {
    pulse: findFirstMatch(text, [/(?:пульс|чсс|pulse)\s*[:-]?\s*([0-9]{2,3})/i]),
    blood_pressure: findFirstMatch(text, [/(?:ат|тиск|bp)\s*[:-]?\s*([0-9]{2,3}\s*\/\s*[0-9]{2,3})/i]),
    respiratory_rate: findFirstMatch(text, [/(?:чд|rr|resp)\s*[:-]?\s*([0-9]{1,2})/i]),
    spo2: findFirstMatch(text, [/(?:spo2|сатурац\w*)\s*[:-]?\s*([0-9]{2,3}%?)/i]),
    avpu: findFirstMatch(text, [/(?:avpu)\s*[:-]?\s*([A-Za-z]+)/i]),
  }
}

function extractLine(text, labels) {
  const expression = new RegExp(`(?:${labels.join('|')})\\s*[:\\-]?\\s*(.+)`, 'im')
  return text.match(expression)?.[1]?.trim() ?? null
}

function extractNotesSection(text) {
  const match = text.match(/(?:нотатки|notes|примітки)\s*[:\-]?\s*([\s\S]{1,500}?)(?=(?:перший рятівник|підпис|first responder|signature|$))/im)
  return match?.[1]?.trim() || null
}

function extractTourniquet(text) {
  const applied = /джгут|tourniquet/i.test(text)
  if (!applied) {
    return {
      applied: false,
      location: null,
      time: null,
    }
  }

  const rawLocation = findFirstMatch(text, [/(?:джгут|tourniquet).{0,24}(ліва нога|ліва рука|права нога|права рука|шия|left leg|left arm|right leg|right arm|neck|leg|arm)/i])

  return {
    applied: true,
    location: translateOrPassthrough(rawLocation, BODY_PART_UA),
    time: findFirstMatch(text, [/(?:джгут|tourniquet).{0,18}([0-2]?\d[:.][0-5]\d)/i]),
  }
}

export function parseOfflineOcrText(rawText = '') {
  const text = rawText.replace(/\r/g, '\n')
  const mechanisms = getDictionaryMatches(text, INJURY_MECHANISMS_UA, 2)
  const medications = getDictionaryMatches(text, MEDICATIONS_UA, 2)
  const treatments = getDictionaryMatches(text, TREATMENTS_UA, 2)
  const allergiesLine = extractLine(text, ['алерг', 'allerg'])
  const allergies = allergiesLine
    ? allergiesLine
        .split(/[;,]/)
        .map((item) => translateOrPassthrough(item.trim(), ALLERGY_UA))
        .filter(Boolean)
    : null

  const populatedFields = [
    extractBloodType(text),
    mechanisms.length,
    medications.length,
    treatments.length,
    extractLine(text, ['піб', 'ім.?я', 'name']),
    extractLine(text, ['підрозділ', 'unit']),
  ].filter(Boolean).length

  const calculatedConfidence = Math.min(0.75, 0.28 + populatedFields * 0.08)

  return normalizeTriageResult({
    patient_name: extractLine(text, ['піб', 'ім.?я', 'name']),
    blood_type: extractBloodType(text),
    allergies,
    unit: extractLine(text, ['підрозділ', 'unit']),
    date_time: extractLine(text, ['date', 'час', 'дата']),
    evacuation_type: translateOrPassthrough(extractLine(text, ['евакуації', 'evacuation']), EVACUATION_TYPES_UA),
    mechanism_of_injury: mechanisms,
    injuries: extractLine(text, ['injur', 'поранення', 'ушкодження']),
    vital_signs: extractVitals(text),
    treatments,
    medications,
    tourniquet: extractTourniquet(text),
    triage_category: findKeywordGroup(text, TRIAGE_CATEGORY_KEYWORDS),
    evacuation_priority: findKeywordGroup(text, EVACUATION_PRIORITY_KEYWORDS),
    notes: extractNotesSection(text),
    confidence: calculatedConfidence,
  })
}
