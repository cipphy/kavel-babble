export interface ExerciseIdMap {
    slugToId: Record<string, string>;
    idToSlug: Record<string, string>;
}

export function buildIdMap(exercises: { slug: string; data: { id: string } }[]): ExerciseIdMap {
    const slugToId: Record<string, string> = {};
    const idToSlug: Record<string, string> = {};
    for (const exercise of exercises) {
        slugToId[exercise.slug] = exercise.data.id;
        idToSlug[exercise.data.id] = exercise.slug;
    }
    return { slugToId, idToSlug };
}

export function findDuplicateIds(exercises: { slug: string; data: { id: string } }[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const exercise of exercises) {
        if (seen.has(exercise.data.id)) duplicates.add(exercise.data.id);
        else seen.add(exercise.data.id);
    }
    return [...duplicates];
}
