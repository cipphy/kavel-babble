import { GROUP_ORDER } from "../../content/exerciseGroups";

export interface ExerciseGroup<T> {
    groupName: string;
    exercises: T[];
}

export function groupByOrder<T extends { data: { group: string } }>(
    exercises: T[],
    groupOrder: string[] = GROUP_ORDER,
): ExerciseGroup<T>[] {
    const buckets = new Map<string, T[]>();
    for (const exercise of exercises) {
        const bucket = buckets.get(exercise.data.group);
        if (bucket) bucket.push(exercise);
        else buckets.set(exercise.data.group, [exercise]);
    }

    const orderedNames = [...buckets.keys()].sort((a, b) => {
        const ai = groupOrder.indexOf(a);
        const bi = groupOrder.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
    });

    return orderedNames.map((groupName) => ({ groupName, exercises: buckets.get(groupName)! }));
}
