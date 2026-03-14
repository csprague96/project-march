import { openDB } from 'idb'

const DB_NAME = 'triage-app'
const DB_VERSION = 1
const RESULTS_STORE = 'triage-results'
const QUEUE_STORE = 'offline-queue'

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(RESULTS_STORE)) {
      const resultsStore = database.createObjectStore(RESULTS_STORE, { keyPath: 'id' })
      resultsStore.createIndex('createdAt', 'createdAt')
    }

    if (!database.objectStoreNames.contains(QUEUE_STORE)) {
      const queueStore = database.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      queueStore.createIndex('recordId', 'recordId', { unique: true })
    }
  },
})

export async function saveTriageRecord(record) {
  const database = await dbPromise
  await database.put(RESULTS_STORE, {
    ...record,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateTriageRecord(id, updates) {
  const database = await dbPromise
  const existingRecord = await database.get(RESULTS_STORE, id)

  if (!existingRecord) {
    return null
  }

  const nextRecord = {
    ...existingRecord,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  }

  await database.put(RESULTS_STORE, nextRecord)
  return nextRecord
}

export async function getTriageRecord(id) {
  const database = await dbPromise
  return database.get(RESULTS_STORE, id)
}

export async function getAllTriageRecords() {
  const database = await dbPromise
  const records = await database.getAll(RESULTS_STORE)

  return records.sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
}

export async function queueOfflineCapture(queueItem) {
  const database = await dbPromise
  await database.put(QUEUE_STORE, queueItem)
}

export async function getQueuedCaptures() {
  const database = await dbPromise
  return database.getAll(QUEUE_STORE)
}

export async function removeQueuedCapture(id) {
  const database = await dbPromise
  await database.delete(QUEUE_STORE, id)
}
