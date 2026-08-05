import type { ExerciseIdMap } from "./idMap";

export interface ExerciseState {
    enabled: boolean;
    lastCompletedAt: number | null; // epoch ms; null = never completed
    intervalDays: number;
    reps: number;
    easeFactor: number;
}

export interface ExercisesStore {
    updatedAt: number; // epoch ms
    exercises: Record<string, ExerciseState>;
}

export const INITIAL_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 60;
export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;

const MIN_WEIGHT = 0.05;
const DUE_SCORE_CAP = 20;
const MS_PER_DAY = 86_400_000;
const STORAGE_KEY = "kb-exercises-state";

const DEFAULT_STATE: ExerciseState = {
    enabled: true,
    lastCompletedAt: null,
    intervalDays: INITIAL_INTERVAL_DAYS,
    reps: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
};

// Per-field merge (not `?? DEFAULT_STATE`) so a stored entry saved before a new field
// existed (e.g. easeFactor, added after intervalDays/reps) still gets a valid default
// for the missing field instead of `undefined` propagating into later math.
export function getExerciseState(store: ExercisesStore, slug: string): ExerciseState {
    return { ...DEFAULT_STATE, ...store.exercises[slug] };
}

export function toggleEnabled(store: ExercisesStore, slug: string): ExercisesStore {
    const current = getExerciseState(store, slug);
    const next: ExerciseState = { ...current, enabled: !current.enabled };
    return {
        updatedAt: Date.now(),
        exercises: { ...store.exercises, [slug]: next },
    };
}

export function toggleGroupEnabled(store: ExercisesStore, slugs: string[]): ExercisesStore {
    if (slugs.length === 0) return store;

    const now = Date.now();
    const allEnabled = slugs.every((slug) => getExerciseState(store, slug).enabled);
    const nextEnabled = !allEnabled;

    const exercises = { ...store.exercises };
    for (const slug of slugs) {
        exercises[slug] = { ...getExerciseState(store, slug), enabled: nextEnabled };
    }

    return { updatedAt: now, exercises };
}

// SM-2: quality 0-5 rates how the attempt felt (0 = very difficult, 5 = very easy).
// Ease factor is updated first (per SuperMemo's original ordering), then used to compute
// the new interval. Quality < 3 is a "lapse": reps/interval restart from scratch, but the
// ease factor is NOT reset to the default — it's still recomputed via the formula below
// and kept, only the rep/interval schedule restarts.
export function recordCompletion(
    store: ExercisesStore,
    slug: string,
    quality: number,
    now: number = Date.now(),
): ExercisesStore {
    const current = getExerciseState(store, slug);
    const q = Math.min(5, Math.max(0, Math.round(quality)));

    const easeFactor = Math.max(
        MIN_EASE_FACTOR,
        current.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
    );

    let reps: number;
    let intervalDays: number;
    if (q < 3) {
        reps = 0;
        intervalDays = INITIAL_INTERVAL_DAYS;
    } else {
        reps = current.reps + 1;
        if (reps === 1) intervalDays = 1;
        else if (reps === 2) intervalDays = 6;
        else intervalDays = Math.round(current.intervalDays * easeFactor);
    }
    intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);

    const next: ExerciseState = { enabled: current.enabled, lastCompletedAt: now, intervalDays, reps, easeFactor };
    return {
        updatedAt: now,
        exercises: { ...store.exercises, [slug]: next },
    };
}

export interface StatEdit {
    intervalDays: number;
    reps: number;
    easeFactor: number;
}

// Batch-applies manual stat overrides (from the "Edit statistics" modal) in one store
// update. Clamped with the same bounds `recordCompletion` already enforces, so a manual
// edit can't produce a state the rest of the algorithm doesn't expect. `enabled` is left
// untouched. `lastCompletedAt` is also left untouched EXCEPT when it's still null (the
// exercise has never actually been completed) — encodeState's ex_srs only ever encodes
// exercises with a real completion date, so an edited-but-never-completed exercise would
// otherwise apply fine to localStorage but silently never appear in the URL. Editing its
// stats is treated as establishing that history, so it gets stamped to now here.
export function applyStatEdits(store: ExercisesStore, edits: Record<string, StatEdit>, now: number = Date.now()): ExercisesStore {
    const exercises = { ...store.exercises };
    for (const [slug, edit] of Object.entries(edits)) {
        const current = getExerciseState(store, slug);
        exercises[slug] = {
            ...current,
            lastCompletedAt: current.lastCompletedAt ?? now,
            intervalDays: Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(edit.intervalDays))),
            reps: Math.max(0, Math.round(edit.reps)),
            easeFactor: Math.max(MIN_EASE_FACTOR, edit.easeFactor),
        };
    }
    return { updatedAt: now, exercises };
}

export function createEmptyStore(): ExercisesStore {
    return { updatedAt: Date.now(), exercises: {} };
}

export function computeDueScore(state: ExerciseState, now: number = Date.now()): number {
    if (state.lastCompletedAt === null) return DUE_SCORE_CAP;
    const daysSince = (now - state.lastCompletedAt) / MS_PER_DAY;
    return Math.min(daysSince / state.intervalDays, DUE_SCORE_CAP);
}

export function selectNextExercise(
    store: ExercisesStore,
    allSlugs: string[],
    rng: () => number = Math.random,
    now: number = Date.now(),
): string | null {
    const pool = allSlugs.filter((slug) => getExerciseState(store, slug).enabled);
    if (pool.length === 0) return null;

    const weights = pool.map((slug) => Math.max(computeDueScore(getExerciseState(store, slug), now), MIN_WEIGHT));
    const total = weights.reduce((sum, w) => sum + w, 0);

    let target = rng() * total;
    for (let i = 0; i < pool.length; i++) {
        target -= weights[i];
        if (target <= 0) return pool[i];
    }
    return pool[pool.length - 1];
}

const BASE62_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function toBase62(n: number): string {
    let value = Math.max(0, Math.round(n));
    if (value === 0) return "0";
    let result = "";
    while (value > 0) {
        result = BASE62_DIGITS[value % 62] + result;
        value = Math.floor(value / 62);
    }
    return result;
}

function fromBase62(s: string): number {
    let value = 0;
    for (const char of s) {
        const digit = BASE62_DIGITS.indexOf(char);
        if (digit === -1) return 0; // malformed token -> safe default, mirrors old NaN-guard behavior
        value = value * 62 + digit;
    }
    return value;
}

export function encodeState(store: ExercisesStore, idMap: ExerciseIdMap): URLSearchParams {
    const params = new URLSearchParams();

    const off = Object.entries(store.exercises)
        .filter(([, state]) => state.enabled === false)
        .map(([slug]) => idMap.slugToId[slug] ?? slug); // fallback: no id (e.g. removed exercise) -> pass slug through
    if (off.length > 0) params.set("ex_off", off.join(","));

    const srs = Object.entries(store.exercises)
        .filter(([, state]) => state.lastCompletedAt !== null)
        .map(([slug, state]) => {
            const id = idMap.slugToId[slug] ?? slug;
            const day = toBase62(Math.floor((state.lastCompletedAt as number) / MS_PER_DAY));
            const interval = toBase62(state.intervalDays);
            const reps = toBase62(state.reps);
            const ease = toBase62(Math.round(state.easeFactor * 100));
            return `${id}:${day}.${interval}.${reps}.${ease}`;
        });
    if (srs.length > 0) params.set("ex_srs", srs.join(","));

    if (off.length > 0 || srs.length > 0) {
        params.set("ex_t", toBase62(Math.floor(store.updatedAt / MS_PER_DAY)));
    }

    return params;
}

export function decodeState(
    search: string | URLSearchParams,
    idMap: ExerciseIdMap,
): { store: ExercisesStore; hasParams: boolean } {
    const params = typeof search === "string" ? new URLSearchParams(search) : search;
    const offParam = params.get("ex_off");
    const srsParam = params.get("ex_srs");
    const tParam = params.get("ex_t");

    const hasParams = offParam !== null || srsParam !== null || tParam !== null;
    const exercises: Record<string, ExerciseState> = {};

    if (offParam) {
        for (const token of offParam.split(",").filter(Boolean)) {
            const slug = idMap.idToSlug[token] ?? token;
            exercises[slug] = { ...DEFAULT_STATE, enabled: false };
        }
    }

    if (srsParam) {
        for (const entry of srsParam.split(",").filter(Boolean)) {
            const [id, fields] = entry.split(":");
            if (!id || !fields) continue;
            const slug = idMap.idToSlug[id] ?? id;

            const [dayToken, intervalToken, repsToken, easeToken] = fields.split(".");
            const day = dayToken ? fromBase62(dayToken) : 0;
            const intervalDays = intervalToken ? fromBase62(intervalToken) : INITIAL_INTERVAL_DAYS;
            const reps = repsToken ? fromBase62(repsToken) : 0;
            const easeRaw = easeToken ? fromBase62(easeToken) : 250; // missing token -> EF 2.50

            const existing = exercises[slug];
            exercises[slug] = {
                enabled: existing ? existing.enabled : true,
                lastCompletedAt: day * MS_PER_DAY,
                intervalDays: intervalDays || INITIAL_INTERVAL_DAYS,
                reps,
                easeFactor: Math.max(MIN_EASE_FACTOR, (easeRaw || 250) / 100),
            };
        }
    }

    const updatedAt = tParam ? fromBase62(tParam) * MS_PER_DAY : 0;

    return { store: { updatedAt, exercises }, hasParams };
}

function readLocalStorage(): ExercisesStore | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || typeof parsed.exercises !== "object") return null;
        return parsed as ExercisesStore;
    } catch {
        return null;
    }
}

function readUrlState(idMap: ExerciseIdMap): { store: ExercisesStore; hasParams: boolean } | null {
    if (typeof window === "undefined") return null;
    const decoded = decodeState(window.location.search, idMap);
    return decoded.hasParams ? decoded : null;
}

export function loadState(idMap: ExerciseIdMap): ExercisesStore {
    const local = readLocalStorage();
    const url = readUrlState(idMap);

    let resolved: ExercisesStore;
    if (local && url) {
        resolved = url.store.updatedAt >= local.updatedAt ? url.store : local;
    } else if (local) {
        resolved = local;
    } else if (url) {
        resolved = url.store;
    } else {
        resolved = { updatedAt: Date.now(), exercises: {} };
    }

    saveState(resolved, idMap);
    return resolved;
}

export function saveState(store: ExercisesStore, idMap: ExerciseIdMap): void {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // localStorage unavailable (private browsing, quota, etc.) — URL sync still proceeds below
    }

    const params = encodeState(store, idMap);
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", url);
}
