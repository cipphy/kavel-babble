import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { CollectionEntry } from "astro:content";
import { type ExercisesStore, type StatEdit, getExerciseState } from "../../lib/exercises/srs";

interface EditStatisticsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exercises: CollectionEntry<"exercises">[];
    store: ExercisesStore;
    onApply: (edits: Record<string, StatEdit>) => void;
    onClearAllData: () => void;
}

export default function EditStatisticsModal({
    open,
    onOpenChange,
    exercises,
    store,
    onApply,
    onClearAllData,
}: EditStatisticsModalProps) {
    const [edits, setEdits] = useState<Record<string, StatEdit>>({});
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const seeded: Record<string, StatEdit> = {};
        for (const exercise of exercises) {
            const state = getExerciseState(store, exercise.slug);
            seeded[exercise.slug] = {
                intervalDays: state.intervalDays,
                reps: state.reps,
                easeFactor: state.easeFactor,
            };
        }
        setEdits(seeded);
        // Only re-seed when the modal transitions to open, not on every store/exercises
        // change while it's open — that would clobber in-progress edits.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleFieldChange = (slug: string, field: keyof StatEdit, value: number) => {
        setEdits((current) => ({
            ...current,
            [slug]: { ...current[slug], [field]: value },
        }));
    };

    const handleApply = () => {
        onApply(edits);
        onOpenChange(false);
    };

    const handleConfirmClear = () => {
        onClearAllData();
        setClearConfirmOpen(false);
        onOpenChange(false);
    };

    const inputClass =
        "w-20 rounded border border-neutral-200 bg-white px-2 py-1 text-center font-mono text-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-neutral-600 dark:focus:ring-neutral-800";

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                    <Dialog.Title className="text-base font-semibold">Edit Statistics</Dialog.Title>

                    <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 sm:grid-cols-3">
                        <div>
                            <dt className="font-medium text-neutral-700 dark:text-neutral-300">Interval (days)</dt>
                            <dd>How many days until this exercise is due again.</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-neutral-700 dark:text-neutral-300">Reps</dt>
                            <dd>Consecutive successful completions in a row.</dd>
                        </div>
                        <div>
                            <dt className="font-medium text-neutral-700 dark:text-neutral-300">Ease</dt>
                            <dd>Multiplier applied to the interval after each completion.</dd>
                        </div>
                    </dl>

                    <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <table className="w-full border-collapse text-sm">
                            <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
                                <tr>
                                    <th className="p-2 text-left font-medium">Exercise</th>
                                    <th className="p-2 text-center font-medium">Interval (days)</th>
                                    <th className="p-2 text-center font-medium">Reps</th>
                                    <th className="p-2 text-center font-medium">Ease</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exercises.map((exercise) => {
                                    const edit = edits[exercise.slug];
                                    if (!edit) return null;
                                    return (
                                        <tr key={exercise.slug} className="border-t border-neutral-200 dark:border-neutral-800">
                                            <td className="p-2">{exercise.data.title}</td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="1"
                                                    value={edit.intervalDays}
                                                    onChange={(e) =>
                                                        handleFieldChange(exercise.slug, "intervalDays", Number(e.target.value))
                                                    }
                                                    aria-label={`Interval in days for "${exercise.data.title}"`}
                                                    className={inputClass}
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={edit.reps}
                                                    onChange={(e) => handleFieldChange(exercise.slug, "reps", Number(e.target.value))}
                                                    aria-label={`Reps for "${exercise.data.title}"`}
                                                    className={inputClass}
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1.3"
                                                    value={edit.easeFactor}
                                                    onChange={(e) =>
                                                        handleFieldChange(exercise.slug, "easeFactor", Number(e.target.value))
                                                    }
                                                    aria-label={`Ease factor for "${exercise.data.title}"`}
                                                    className={inputClass}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => setClearConfirmOpen(true)}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                        >
                            Clear All Data
                        </button>
                        <div className="flex gap-3">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="rounded-lg border border-neutral-200 px-4 py-2 text-sm transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                                >
                                    Cancel
                                </button>
                            </Dialog.Close>
                            <button
                                type="button"
                                onClick={handleApply}
                                className="rounded-lg bg-[#7467ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5f52e0]"
                            >
                                Apply Changes
                            </button>
                        </div>
                    </div>

                    <Dialog.Root open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" />
                            <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
                                <Dialog.Title className="text-base font-semibold">
                                    Are you sure you want to clear all data?
                                </Dialog.Title>
                                <Dialog.Description className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                                    This permanently erases every exercise's saved progress from this browser and the URL.
                                    This cannot be undone.
                                </Dialog.Description>
                                <div className="mt-5 flex justify-end gap-3">
                                    <Dialog.Close asChild>
                                        <button
                                            type="button"
                                            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                                        >
                                            Cancel
                                        </button>
                                    </Dialog.Close>
                                    <button
                                        type="button"
                                        onClick={handleConfirmClear}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                                    >
                                        Clear All Data
                                    </button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
