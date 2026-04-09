// Cache-bust key
const _CACHE_BUST = 'v1-' + Date.now()

const translations = {
  en: {
    // Navigation
    camera: 'Camera',
    history: 'History',
    inbox: 'Inbox',
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

    // Camera permission
    cameraPermissionDenied: 'Camera access was blocked.',
    cameraPermissionHint: 'Your browser denied camera access — this is usually because you clicked "Block", or the browser remembered a previous block. Click the camera or lock icon in the address bar to allow access, then tap Retry.',
    retryCamera: 'Retry camera access',

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
    pendingOcr: 'Processing...',

    // Confidence indicator
    confidence: 'Confidence',
    lowConfidenceWarning: 'LOW CONFIDENCE - VERIFY MANUALLY',
    noKnownAllergies: 'NO KNOWN ALLERGIES',

    // Form type badge
    formTypeBadgeDD1380: 'DD-1380',
    formTypeBadgeFORM100: 'FORM 100',

    // Form 100 section
    form100Section: 'Primary Medical Card (Form 100)',
    dateOfBirth: 'Date of birth',
    gender: 'Gender',
    idNumber: 'ID number',
    diagnosis: 'Diagnosis',
    diagnosisCode: 'Code',
    evacuationDestination: 'Evacuation destination',
    providerName: 'Provider',
    preMedicalAid: 'Pre-medical aid',
    medicalAid: 'Medical aid',
    noPreMedicalAid: 'No pre-medical aid documented.',
    noMedicalAid: 'No medical aid documented.',

    // Language toggle aria label
    toggleLanguage: 'Toggle language',

    // Onboarding modal
    onboardingTitle: 'Welcome to M.A.R.C.H',
    onboardingAbout:
      'This app uses Claude AI to read casualty triage cards. When offline, it falls back to on-device OCR automatically.',
    onboardingInstallTitle: 'Add to your home screen',
    onboardingInstallIOS: 'Tap the Share button (↑) in Safari, then "Add to Home Screen".',
    onboardingInstallAndroid: 'Install App',
    onboardingDismiss: 'Got it',
  },

  uk: {
    // Navigation
    camera: 'Камера',
    history: 'Журнал',
    inbox: 'Вхідні',
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

    // Camera permission
    cameraPermissionDenied: 'Доступ до камери заблоковано.',
    cameraPermissionHint: 'Ваш браузер відмовив у доступі до камери — зазвичай це відбувається через те, що ви натиснули «Заблокувати» або браузер зберіг налаштування попереднього блокування. Натисніть на піктограму камери або замка в адресному рядку, щоб дозволити доступ, а потім натисніть «Спробувати ще раз».',
    retryCamera: 'Спробувати ще раз',

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
    pendingOcr: 'Обробка...',

    // Confidence indicator
    confidence: 'Впевненість',
    lowConfidenceWarning: 'НИЗЬКА ВПЕВНЕНІСТЬ — ПЕРЕВІРИТИ ВРУЧНУ',
    noKnownAllergies: 'АЛЕРГІЇ НЕВІДОМІ',

    // Form type badge
    formTypeBadgeDD1380: 'ДД-1380',
    formTypeBadgeFORM100: 'ФОРМА 100',

    // Form 100 section
    form100Section: 'Первинна медична картка (Форма 100)',
    dateOfBirth: 'Дата народження',
    gender: 'Стать',
    idNumber: 'Номер ID',
    diagnosis: 'Діагноз',
    diagnosisCode: 'Код',
    evacuationDestination: 'Місце евакуації',
    providerName: 'Лікар',
    preMedicalAid: 'Долікарська допомога',
    medicalAid: 'Медична допомога',
    noPreMedicalAid: 'Долікарська допомога не задокументована.',
    noMedicalAid: 'Медична допомога не задокументована.',

    // Language toggle aria label
    toggleLanguage: 'Змінити мову',

    // Onboarding modal
    onboardingTitle: 'Ласкаво просимо до M.A.R.C.H',
    onboardingAbout:
      'Цей застосунок використовує Claude AI для читання карток сортування. В офлайн-режимі автоматично перемикається на розпізнавання на пристрої.',
    onboardingInstallTitle: 'Додайте на головний екран',
    onboardingInstallIOS: 'Натисніть кнопку «Поділитися» (↑) у Safari, потім «На головний екран».',
    onboardingInstallAndroid: 'Встановити застосунок',
    onboardingDismiss: 'Зрозуміло',
  },
}

export default translations
