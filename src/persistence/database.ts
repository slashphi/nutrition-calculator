const DATABASE_NAME = "ultra-race-nutrition";
const DATABASE_VERSION = 1;
export const PLAN_KEY = "current";

let databasePromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("plans")) {
        database.createObjectStore("plans");
      }
      if (!database.objectStoreNames.contains("courses")) {
        database.createObjectStore("courses");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("storage.open"));
  });
  return databasePromise;
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("storage.request"));
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("storage.transaction"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("storage.abort"));
  });
}
