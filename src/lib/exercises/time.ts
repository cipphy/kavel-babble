/** Parses "h:mm:ss", "mm:ss", or bare seconds into a total-seconds count. Returns null if malformed. */
export function parseDuration(input: string): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(":").map((p) => p.trim());
    if (parts.length === 0 || parts.length > 3) return null;
    if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;

    const nums = parts.map((p) => parseInt(p, 10));

    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (nums.length === 1) {
        [seconds] = nums;
    } else if (nums.length === 2) {
        [minutes, seconds] = nums;
    } else {
        [hours, minutes, seconds] = nums;
    }

    if (minutes > 59 || seconds > 59) return null;

    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? total : null;
}

/** Formats a total-seconds count as "h:mm:ss" (or "mm:ss" when under an hour). */
export function formatDuration(totalSeconds: number): string {
    const clamped = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(clamped / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    const seconds = clamped % 60;

    const mm = minutes.toString().padStart(2, "0");
    const ss = seconds.toString().padStart(2, "0");

    return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}
