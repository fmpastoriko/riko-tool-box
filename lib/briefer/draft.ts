export const LAST_REPO_KEY = "codeBriefer_lastRepo";

function getDraftKey() {
  return "codeBriefer_draft";
}

export function loadDraft(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(getDraftKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(data: object): void {
  try {
    localStorage.setItem(getDraftKey(), JSON.stringify(data));
  } catch {}
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(getDraftKey());
  } catch {}
}
