import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { CollectionEntry } from "astro:content";
import { type ExercisesStore, getExerciseState } from "../../lib/exercises/srs";

interface ExerciseGroupSectionProps {
    groupName: string;
    exercises: CollectionEntry<"exercises">[];
    store: ExercisesStore;
    spinning: boolean;
    onToggleExercise: (slug: string) => void;
    onToggleGroup: (slugs: string[]) => void;
}

export default function ExerciseGroupSection({
    groupName,
    exercises,
    store,
    spinning,
    onToggleExercise,
    onToggleGroup,
}: ExerciseGroupSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const [listRef] = useAutoAnimate<HTMLDivElement>();

    const allEnabled = exercises.every((e) => getExerciseState(store, e.slug).enabled);

    return (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 p-3">
                <input
                    type="checkbox"
                    checked={allEnabled}
                    onChange={() => {
                        if (!spinning) onToggleGroup(exercises.map((e) => e.slug));
                    }}
                    disabled={spinning}
                    aria-label={`Select all exercises in "${groupName}"`}
                    className="h-5 w-5 shrink-0 accent-[#7467ff] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="flex flex-1 items-center justify-between gap-2 rounded py-1 text-left transition-colors hover:text-[#7467ff]"
                >
                    <span className="font-medium">{groupName}</span>
                    <svg
                        className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            <div ref={listRef}>
                {expanded && (
                    <ul className="space-y-4 rounded-b-lg border-t border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        {exercises.map((exercise) => {
                            const state = getExerciseState(store, exercise.slug);
                            return (
                                <li
                                    key={exercise.slug}
                                    className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center ${
                                        state.enabled
                                            ? "border-[#7467ff]/70 dark:border-[#7467ff]/40"
                                            : "border-neutral-200 dark:border-neutral-800"
                                    }`}
                                >
                                    <div className="flex flex-1 items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={state.enabled}
                                            onChange={() => {
                                                if (!spinning) onToggleExercise(exercise.slug);
                                            }}
                                            disabled={spinning}
                                            className="h-5 w-5 shrink-0 accent-[#7467ff] disabled:cursor-not-allowed disabled:opacity-50"
                                            aria-label={`Include "${exercise.data.title}" in the exercise pool`}
                                        />
                                        <img
                                            src={exercise.data.image.thumbSrc || exercise.data.image.src}
                                            alt={exercise.data.image.alt}
                                            className="h-20 w-20 shrink-0 rounded-lg object-cover sm:w-24"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-medium">{exercise.data.title}</h3>
                                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                                                {exercise.data.description}
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={`/exercises/${exercise.slug}`}
                                        className="shrink-0 rounded-lg bg-[#7467ff] px-4 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-[#5f52e0]"
                                    >
                                        Use this exercise
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
