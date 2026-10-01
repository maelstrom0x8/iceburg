const KEY = "iceburg:has-seen-landing";

export function hasSeenLanding(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markLandingSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    console.warn("Could not persist landing-page state to localStorage.");
  }
}
