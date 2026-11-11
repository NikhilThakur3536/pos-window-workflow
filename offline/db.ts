import { openDB } from 'idb';

const DB_NAME = 'onetouch-retail-db';
const STORE_NAME = 'offline-db-data';

export async function getDb() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
}

export async function setDBData<T>(key: string, value: T) {
    const db = await getDb();
    await db.put(STORE_NAME, value, key);
}

export async function getDBData<T>(key: string): Promise<T | undefined> {
    const db = await getDb();
    return db.get(STORE_NAME, key);
}

export async function clearDB() {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    await tx.done;
}

// Creation Array DB

export async function addToDBArray<T>(key: string, value: T) {
    const db = await getDb();
    const existing = (await db.get(STORE_NAME, key)) || [];
    existing.unshift(value);
    await db.put(STORE_NAME, existing, key);
}

export async function getDBArray<T>(key: string): Promise<T[]> {
    const db = await getDb();
    return (await db.get(STORE_NAME, key)) || [];
}

export async function clearDBArray(key: string) {
    const db = await getDb();
    await db.delete(STORE_NAME, key);
}
