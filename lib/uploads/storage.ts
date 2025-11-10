import type { StoredUploadPayload, UploadSlotKey } from './types';

const DB_NAME = 'project-maney-uploads';
const STORE_NAME = 'files';

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryStore = new Map<UploadSlotKey, StoredUploadPayload>();

async function getDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);

      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error('Unable to open upload storage database.'));
      };

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onclose = () => {
          dbPromise = null;
        };
        resolve(database);
      };
    } catch (error) {
      dbPromise = null;
      reject(error);
    }
  }).catch((error) => {
    console.error('Failed to initialise upload storage.', error);
    return null;
  });

  return dbPromise;
}

export async function persistUpload(slot: UploadSlotKey, payload: StoredUploadPayload) {
  const database = await getDatabase();
  if (!database) {
    memoryStore.set(slot, payload);
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to persist upload.'));
      const store = transaction.objectStore(STORE_NAME);
      store.put(payload, slot);
    });
  } catch (error) {
    console.error('Failed to persist upload to IndexedDB. Falling back to memory store.', error);
    memoryStore.set(slot, payload);
  }
}

export async function retrieveUpload(slot: UploadSlotKey): Promise<StoredUploadPayload | null> {
  const database = await getDatabase();
  if (!database) {
    return memoryStore.get(slot) ?? null;
  }

  try {
    return await new Promise<StoredUploadPayload | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to read upload.'));
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(slot);
      request.onsuccess = () => {
        resolve((request.result as StoredUploadPayload | undefined) ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to read upload.'));
    });
  } catch (error) {
    console.error('Failed to retrieve upload from IndexedDB.', error);
    return memoryStore.get(slot) ?? null;
  }
}

export async function removeUpload(slot: UploadSlotKey) {
  const database = await getDatabase();
  memoryStore.delete(slot);

  if (!database) {
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to delete upload.'));
      const store = transaction.objectStore(STORE_NAME);
      store.delete(slot);
    });
  } catch (error) {
    console.error('Failed to remove upload from IndexedDB.', error);
  }
}
