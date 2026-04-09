export const BLOOD_TYPES_UA = {
  'О+': 'O+',
  'О-': 'O-',
  '0+': 'O+',
  '0-': 'O-',
  'А+': 'A+',
  'А-': 'A-',
  'Б+': 'B+',
  'Б-': 'B-',
  'АБ+': 'AB+',
  'АБ-': 'AB-',
  'I+': 'O+',
  'I-': 'O-',
  'II+': 'A+',
  'II-': 'A-',
  'III+': 'B+',
  'III-': 'B-',
  'IV+': 'AB+',
  'IV-': 'AB-',
}

export const INJURY_MECHANISMS_UA = {
  артилерія: 'Artillery',
  опік: 'Burn',
  падіння: 'Fall',
  граната: 'Grenade',
  вп: 'GSW',
  вогнепальне: 'GSW',
  свп: 'IED',
  міна: 'Landmine',
  дтп: 'MVC',
  рпг: 'RPG',
  осколкове: 'Fragmentation',
  вибух: 'Blast',
  тупа: 'Blunt',
  дрон: 'Drone/UAS',
  blast: 'Blast',
}

export const MEDICATIONS_UA = {
  морфін: 'Morphine',
  морфій: 'Morphine',
  кеторолак: 'Ketorolac',
  кетанов: 'Ketorolac',
  кеторол: 'Ketorolac',
  кетопрофен: 'Ketoprofen',
  транексамова: 'Tranexamic Acid (TXA)',
  txa: 'Tranexamic Acid (TXA)',
  антибіотик: 'Antibiotic',
  амоксицилін: 'Amoxicillin',
  амоксиклав: 'Amoxicillin/Clavulanate',
  ібупрофен: 'Ibuprofen',
  парацетамол: 'Paracetamol',
  трамадол: 'Tramadol',
  промедол: 'Trimeperidine',
  налбуфін: 'Nalbuphine',
  ондансетрон: 'Ondansetron',
  цефтріаксон: 'Ceftriaxone',
  цефалоспорин: 'Cephalosporin',
  ципрофлоксацин: 'Ciprofloxacin',
  дексаметазон: 'Dexamethasone',
  атропін: 'Atropine',
  метоклопрамід: 'Metoclopramide',
}

export const TREATMENTS_UA = {
  джгут: 'Tourniquet',
  гемостатик: 'Hemostatic',
  нфа: 'NPA',
  нпа: 'NPA',
  крикотиреотомія: 'Cricothyrotomy',
  декомпресія: 'Needle Decompression',
  оклюзійна: 'Chest Seal',
  шина: 'Splint',
  інфузія: 'IV Fluid',
}

export const TRIAGE_CATEGORY_KEYWORDS = {
  IMMEDIATE: ['immediate', 'red', 'червоний', 'негайно'],
  DELAYED: ['delayed', 'yellow', 'жовтий', 'відкладений'],
  MINIMAL: ['minimal', 'green', 'зелений', 'легкий'],
  EXPECTANT: ['expectant', 'black', 'чорний'],
}

export const EVACUATION_TYPES_UA = {
  'автомобільна': 'automobile',
  'швидка': 'rapid evacuation',
  'гелікоптером': 'helicopter',
  'пішки': 'on foot',
  'санітарний транспорт': 'medical transport',
}

export const EVACUATION_PRIORITY_KEYWORDS = {
  Urgent: ['urgent', 'терміново'],
  Priority: ['priority', 'пріоритет'],
  Routine: ['routine', 'планово'],
}
