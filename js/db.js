const DB_NAME = 'TimeTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const saveSession = async (sessionData) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Add timestamp for when this record was created
        const record = {
            ...sessionData,
            createdAt: new Date().toISOString()
        };

        const request = store.add(record);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getHistory = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const importSessions = async (sessions) => {
    const db = await openDB();

    // Fetch existing data to check for duplicates
    const existingTransaction = db.transaction([STORE_NAME], 'readonly');
    const existingStore = existingTransaction.objectStore(STORE_NAME);
    const existingRequest = existingStore.getAll();

    return new Promise((resolve, reject) => {
        existingRequest.onsuccess = () => {
            const currentData = existingRequest.result;
            
            // Create a Set of timestamps for fast O(1) lookup
            const existingStartTimes = new Set(currentData.map(item => item.startTime));

            const writeTransaction = db.transaction([STORE_NAME], 'readwrite');
            const writeStore = writeTransaction.objectStore(STORE_NAME);
            
            let addedCount = 0;
            let skippedCount = 0;

            sessions.forEach(session => {
                // Skip if start time exactly matches an existing record
                if (existingStartTimes.has(session.startTime)) {
                    skippedCount++;
                    return; 
                }

                // Remove imported ID to allow local DB to auto-increment a new one
                const { id, ...cleanSession } = session; 
                writeStore.add(cleanSession);
                addedCount++;
            });

            writeTransaction.oncomplete = () => resolve({ added: addedCount, skipped: skippedCount });
            writeTransaction.onerror = () => reject(writeTransaction.error);
        };
        
        existingRequest.onerror = () => reject(existingRequest.error);
    });
};

export const requestPersistentStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persisted storage granted: ${isPersisted}`);
        return isPersisted;
    }
    return false;
};

export const updateSession = async (updatedSession) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // .put() updates if the ID exists, or adds if it doesn't
        const request = store.put(updatedSession);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteSession = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};