const GAMBA_KEY = "kb-gamba-mode";

/** Gamba Mode is a personal display preference (like the theme toggle) — localStorage only, never URL. */
export function isGambaModeEnabled(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(GAMBA_KEY) === "1";
    } catch {
        return false;
    }
}

export function setGambaModeEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(GAMBA_KEY, enabled ? "1" : "0");
    } catch {
        // localStorage unavailable — preference just won't persist across reloads
    }
}
