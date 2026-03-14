const translations = {
  en: {
    // Navigation
    camera: 'Camera',
    history: 'History',
    backToCamera: 'Back to Camera',
    backToHistory: 'Back to History',
    back: 'Back',

    // Connection status
    online: 'Online',
    offline: 'Offline',

    // Access code panel
    enterMedicAccessCode: 'Enter Medic Access Code',
    accessCodeDescription:
      'Store it once in this browser for online OCR. You can still capture offline without it.',
    accessCodePlaceholder: 'Enter access code...',
    saveCode: 'Save code',

    // Camera instructions
    cameraInstructions:
      'Point the camera at the casualty card and capture once. The app preprocesses every image before OCR to improve low-light readability.',

    // Save actions
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved',

    // History screen
    savedCards: 'Saved cards',
    total: 'total',
    syncingQueue: '· syncing queue',
    noSavedCards: 'No saved triage cards yet. Capture a card, review the result, then save it here.',
    unknownPatient: 'Unknown patient',
    unitNotCaptured: 'Unit not captured',
    unclassified: 'Unclassified',
    upgraded: 'Upgraded',
    offlineVerify: 'Offline verify',

    // Triage card sections
    patient: 'Patient',
    unit: 'Unit',
    timestamp: 'Timestamp',
    bloodType: 'Blood type',
    allergies: 'Allergies',
    mechanismOfInjury: 'Mechanism of injury',
    injuries: 'Injuries',
    vitalSigns: 'Vital signs',
    treatments: 'Treatments',
    medications: 'Medications',
    tourniquet: 'Tourniquet',
    notes: 'Notes',

    // Triage card empty states
    noMechanismCaptured: 'No mechanism captured',
    noInjuryDetail: 'No injury detail extracted.',
    noTreatments: 'No treatments extracted.',
    noMedications: 'No medications extracted.',
    noTourniquetDocumented: 'No tourniquet documented.',

    // Tourniquet detail
    tourniquetApplied: 'Applied',
    location: 'Location',
    time: 'Time',
    notCaptured: 'Not captured',

    // Unit / evacuation row
    evacuationPriority: 'Evacuation priority',

    // Offline banner
    offlineBannerVerify: 'OFFLINE - VERIFY',
    offlineBannerUpgraded: 'Previously offline result upgraded with Claude verification.',

    // Error / validation
    enterAccessCodeError: 'Enter an access code or continue offline.',
    captureError: 'The card could not be processed. Try again.',
    saveError: 'The triage card could not be saved.',

    // Processing labels (set programmatically in App.jsx)
    processing: 'Processing',
    preprocessingImage: 'Preprocessing image',
    sendingToClaude: 'Sending to Claude',
    claudeFailedOffline: 'Claude failed, running offline OCR',
    runningOfflineOcr: 'Running offline OCR',

    // Confidence indicator
    confidence: 'Confidence',
    lowConfidenceWarning: 'LOW CONFIDENCE - VERIFY MANUALLY',
    noKnownAllergies: 'NO KNOWN ALLERGIES',

    // Language toggle aria label
    toggleLanguage: 'Toggle language',
  },

  uk: {
    // Navigation
    camera: 'Камера',
    history: 'Журнал',
    backToCamera: 'Повернутись до камери',
    backToHistory: 'Повернутись до журналу',
    back: 'Назад',

    // Connection status
    online: 'Онлайн',
    offline: 'Офлайн',

    // Access code panel
    enterMedicAccessCode: 'Введіть код доступу медика',
    accessCodeDescription:
      'Збережіть його один раз у цьому браузері для онлайн-розпізнавання. Без коду можна знімати в офлайн-режимі.',
    accessCodePlaceholder: 'Введіть код доступу...',
    saveCode: 'Зберегти код',

    // Camera instructions
    cameraInstructions:
      'Наведіть камеру на картку пораненого та зробіть знімок. Програма попередньо обробляє кожне зображення перед розпізнаванням для кращої читабельності при слабкому освітленні.',

    // Save actions
    save: 'Зберегти',
    saving: 'Збереження...',
    saved: 'Збережено',

    // History screen
    savedCards: 'Збережені картки',
    total: 'всього',
    syncingQueue: '· синхронізація черги',
    noSavedCards:
      'Збережених карток сортування ще немає. Зробіть знімок, перегляньте результат, а потім збережіть його тут.',
    unknownPatient: 'Невідомий пацієнт',
    unitNotCaptured: 'Підрозділ не зафіксовано',
    unclassified: 'Не класифіковано',
    upgraded: 'Оновлено',
    offlineVerify: 'Офлайн — перевірити',

    // Triage card sections
    patient: 'Пацієнт',
    unit: 'Підрозділ',
    timestamp: 'Час',
    bloodType: 'Група крові',
    allergies: 'Алергії',
    mechanismOfInjury: 'Механізм ураження',
    injuries: 'Ураження',
    vitalSigns: 'Життєві показники',
    treatments: 'Процедури',
    medications: 'Медикаменти',
    tourniquet: 'Джгут',
    notes: 'Примітки',

    // Triage card empty states
    noMechanismCaptured: 'Механізм не зафіксовано',
    noInjuryDetail: 'Деталі ураження не розпізнано.',
    noTreatments: 'Процедури не розпізнано.',
    noMedications: 'Медикаменти не розпізнано.',
    noTourniquetDocumented: 'Джгут не задокументовано.',

    // Tourniquet detail
    tourniquetApplied: 'Накладено',
    location: 'Місце',
    time: 'Час',
    notCaptured: 'Не зафіксовано',

    // Unit / evacuation row
    evacuationPriority: 'Пріоритет евакуації',

    // Offline banner
    offlineBannerVerify: 'ОФЛАЙН — ПЕРЕВІРИТИ',
    offlineBannerUpgraded: 'Попередній офлайн-результат оновлено через перевірку Claude.',

    // Error / validation
    enterAccessCodeError: 'Введіть код доступу або продовжте в офлайн-режимі.',
    captureError: 'Картку не вдалось обробити. Спробуйте ще раз.',
    saveError: 'Картку сортування не вдалось зберегти.',

    // Processing labels
    processing: 'Обробка',
    preprocessingImage: 'Попередня обробка зображення',
    sendingToClaude: 'Відправка до Claude',
    claudeFailedOffline: 'Claude недоступний, запуск офлайн-розпізнавання',
    runningOfflineOcr: 'Офлайн-розпізнавання',

    // Confidence indicator
    confidence: 'Впевненість',
    lowConfidenceWarning: 'НИЗЬКА ВПЕВНЕНІСТЬ — ПЕРЕВІРИТИ ВРУЧНУ',
    noKnownAllergies: 'АЛЕРГІЇ НЕВІДОМІ',

    // Language toggle aria label
    toggleLanguage: 'Змінити мову',
  },
}

export default translations
