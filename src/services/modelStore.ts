import { createEmptyModel, normalizeImportedModel } from '@/services/model';
import type { LsbModelJson } from '@/types/model';

const DB_NAME = 'lsb-trainer-db';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const CURRENT_MODEL_ID = 'current';

interface StoredModel {
  id: string;
  value: LsbModelJson;
}

export async function loadModel(): Promise<LsbModelJson> {
  const db = await openDatabase();
  const stored = await requestToPromise<StoredModel | undefined>(
    db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(CURRENT_MODEL_ID),
  );

  if (stored?.value) {
    return stored.value;
  }

  const defaultModel = await fetchDefaultModel();
  // Persist the default model so subsequent loads return the same current model
  await saveModel(defaultModel);
  return defaultModel;
}

export async function saveModel(model: LsbModelJson): Promise<void> {
  const db = await openDatabase();
  const stored: StoredModel = {
    id: CURRENT_MODEL_ID,
    value: toSerializableModel(model),
  };

  await requestToPromise(
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(stored),
  );
}

export async function clearStoredModel(): Promise<LsbModelJson> {
  const model = await fetchDefaultModel();
  await saveModel(model);
  return model;
}

export async function importModelFile(file: File): Promise<LsbModelJson> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  return normalizeImportedModel(parsed);
}

export function downloadModel(model: LsbModelJson): void {
  const blob = new Blob([JSON.stringify(toSerializableModel(model), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  link.href = url;
  link.download = `modelo-lsb-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
  });
}

function requestToPromise<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Operacion IndexedDB fallida.'));
  });
}

function toSerializableModel(model: LsbModelJson): LsbModelJson {
  return JSON.parse(JSON.stringify(model)) as LsbModelJson;
}

async function fetchDefaultModel(): Promise<LsbModelJson> {
  try {
    const base = (import.meta as any)?.env?.BASE_URL ?? '/';
    const url = `${base}default_model.json`;
    const resp = await fetch(url);

    if (!resp.ok) {
      throw new Error('default model not found');
    }

    const parsed = await resp.json();
    return normalizeImportedModel(parsed as unknown);
  } catch (err) {
    // Fallback to empty model if fetching or normalization fails
    return createEmptyModel();
  }
}
