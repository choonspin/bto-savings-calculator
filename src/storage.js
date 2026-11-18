// Where a plan is kept: this browser, or a document shared by everyone who opens a claude.ai copy.

const SAVE_DELAY_MS = 700;
const LOAD_TIMEOUT_MS = 10_000;

/** Keeps the plan in this browser. Storage can be blocked (private windows), so failures are ignored. */
export function browserStore(key) {
  return {
    load() {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch {
        return null;
      }
    },
    save(plan) {
      try {
        localStorage.setItem(key, JSON.stringify(plan));
      } catch {
        // The page still works; it just won't remember the plan.
      }
    },
  };
}

/**
 * Keeps one plan in a claude.ai artifact's shared database, so everyone the page is shared with
 * sees and edits the same plan. Resolves to null anywhere else.
 *
 * `onRemotePlan(data)` receives the stored plan when it loads and whenever someone else changes it.
 * `onStatus(text)` receives short status messages for the page header.
 */
export async function connectSharedStore({ path, onRemotePlan, onStatus }) {
  const db = window.claude?.use ? await window.claude.use('db') : null;
  if (!db) return null;

  const doc = db.doc(path);
  let saveTimer = null;
  let writes = Promise.resolve();
  let canWrite = true;

  onStatus('Loading the shared plan…');
  const loadTimer = setTimeout(() => onStatus("Can't reach the shared plan yet"), LOAD_TIMEOUT_MS);

  doc.onSnapshot(
    (snapshot) => {
      if (!snapshot.metadata.fromCache) clearTimeout(loadTimer);
      // Skip echoes of an edit from this device that hasn't settled yet
      if (snapshot.metadata.hasPendingWrites || saveTimer) return;
      if (snapshot.exists) onRemotePlan(snapshot.data());
      if (!snapshot.metadata.fromCache) onStatus('Synced');
    },
    () => {
      clearTimeout(loadTimer);
      canWrite = false;
      onStatus("Can't reach the shared plan. Changes stay in this browser.");
    },
  );

  return {
    /** Saves after a short pause, so a slider drag becomes one write. */
    save(plan) {
      if (!canWrite) return;
      clearTimeout(saveTimer);
      onStatus('Saving…');
      saveTimer = setTimeout(() => {
        saveTimer = null;
        const copy = structuredClone(plan);
        writes = writes
          .then(() => doc.set(copy))
          .then(() => { if (!saveTimer) onStatus('Synced'); })
          .catch((error) => {
            if (error?.code === 'invalid_argument') {
              canWrite = false;
              onStatus('View only: changes stay in this browser');
            } else {
              onStatus("Couldn't sync. Changes are saved in this browser.");
            }
          });
      }, SAVE_DELAY_MS);
    },
  };
}
