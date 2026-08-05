import { useEffect, useState } from "react";
import {
    applyStatEdits as applyStatEditsToStore,
    createEmptyStore,
    type ExercisesStore,
    loadState,
    recordCompletion,
    saveState,
    selectNextExercise,
    type StatEdit,
    toggleEnabled,
    toggleGroupEnabled,
} from "./srs";
import type { ExerciseIdMap } from "./idMap";

const EMPTY_STORE: ExercisesStore = { updatedAt: 0, exercises: {} };

export function useExercisesState(allSlugs: string[], idMap: ExerciseIdMap) {
    const [store, setStore] = useState<ExercisesStore>(EMPTY_STORE);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setStore(loadState(idMap));
        setReady(true);
        // Runs once per mount — idMap is derived from static content and stable for the page's lifetime.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = (slug: string) => {
        setStore((current) => {
            const next = toggleEnabled(current, slug);
            saveState(next, idMap);
            return next;
        });
    };

    const complete = (slug: string, quality: number) => {
        setStore((current) => {
            const next = recordCompletion(current, slug, quality);
            saveState(next, idMap);
            return next;
        });
    };

    const toggleGroup = (slugs: string[]) => {
        setStore((current) => {
            const next = toggleGroupEnabled(current, slugs);
            saveState(next, idMap);
            return next;
        });
    };

    const applyStatEdits = (edits: Record<string, StatEdit>) => {
        setStore((current) => {
            const next = applyStatEditsToStore(current, edits);
            saveState(next, idMap);
            return next;
        });
    };

    const clearAllData = () => {
        const next = createEmptyStore();
        saveState(next, idMap);
        setStore(next);
    };

    const generate = (rng?: () => number): string | null => selectNextExercise(store, allSlugs, rng);

    return { store, ready, toggle, toggleGroup, complete, generate, applyStatEdits, clearAllData };
}
