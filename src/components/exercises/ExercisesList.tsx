import { useEffect, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import * as Dialog from "@radix-ui/react-dialog";
import type { CollectionEntry } from "astro:content";
import { getExerciseState } from "../../lib/exercises/srs";
import { useExercisesState } from "../../lib/exercises/useExercisesState";
import { isGambaModeEnabled, setGambaModeEnabled } from "../../lib/exercises/gamba";
import { groupByOrder } from "../../lib/exercises/groups";
import { buildIdMap } from "../../lib/exercises/idMap";
import ExercisesSettings from "./ExercisesSettings";
import GambaCarousel from "./GambaCarousel";
import ExerciseGroupSection from "./ExerciseGroupSection";
import Confetti from "./Confetti";
import EditStatisticsModal from "./EditStatisticsModal";

interface ExercisesListProps {
    exercises: CollectionEntry<"exercises">[];
}

export default function ExercisesList({ exercises }: ExercisesListProps) {
    const allSlugs = exercises.map((e) => e.slug);
    const idMap = buildIdMap(exercises);
    const { store, ready, toggle, toggleGroup, generate, applyStatEdits, clearAllData } = useExercisesState(
        allSlugs,
        idMap,
    );
    const [revealRef] = useAutoAnimate<HTMLDivElement>({ duration: 700, easing: "ease-in-out" });
    const [statsModalOpen, setStatsModalOpen] = useState(false);

    const [gambaMode, setGambaMode] = useState(false);
    useEffect(() => {
        setGambaMode(isGambaModeEnabled());
    }, []);

    const handleGambaModeChange = (enabled: boolean) => {
        setGambaMode(enabled);
        setGambaModeEnabled(enabled);
    };

    const [pendingTarget, setPendingTarget] = useState<string | null>(null);
    const [resultSlug, setResultSlug] = useState<string | null>(null);
    const [spinning, setSpinning] = useState(false);
    const [spinKey, setSpinKey] = useState(0);
    const [confettiActive, setConfettiActive] = useState(false);

    const poolIsEmpty = ready && allSlugs.every((slug) => !getExerciseState(store, slug).enabled);

    const handleGenerate = () => {
        const slug = generate();
        if (!slug) return;

        if (gambaMode) {
            setResultSlug(null);
            setPendingTarget(slug);
            setSpinning(true);
            setSpinKey((k) => k + 1);
        } else {
            setSpinning(false);
            setPendingTarget(null);
            setResultSlug(slug);
        }
    };

    const carouselItems = exercises
        .filter((e) => getExerciseState(store, e.slug).enabled)
        .map((e) => ({
            slug: e.slug,
            title: e.data.title,
            thumbSrc: e.data.image.thumbSrc || e.data.image.src,
            alt: e.data.image.alt,
        }));

    const resultExercise = resultSlug ? exercises.find((e) => e.slug === resultSlug) : undefined;
    const resultOpen = Boolean(resultExercise) && !spinning;

    return (
        <div>
            <div className="mb-3 flex justify-end">
                <ExercisesSettings
                    gambaMode={gambaMode}
                    onGambaModeChange={handleGambaModeChange}
                    onOpenEditStatistics={() => setStatsModalOpen(true)}
                />
            </div>

            <div className="mb-2 flex justify-center">
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={poolIsEmpty || spinning}
                    className="rounded-xl bg-[#7467ff] px-10 py-4 text-base font-semibold text-white transition-colors hover:bg-[#5f52e0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Generate Exercise
                </button>
            </div>

            {gambaMode && (
                <p className="mb-4 text-center text-xs text-neutral-500 dark:text-neutral-400">*Gamba mode on</p>
            )}

            {poolIsEmpty && (
                <p className="mb-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Enable at least one exercise below to generate a warmup.
                </p>
            )}

            <div ref={revealRef}>
                {spinning && pendingTarget && (
                    <GambaCarousel
                        key={spinKey}
                        items={carouselItems}
                        targetSlug={pendingTarget}
                        onFinished={() => {
                            setSpinning(false);
                            setResultSlug(pendingTarget);
                            setConfettiActive(true);
                        }}
                    />
                )}
            </div>

            {confettiActive && <Confetti onDone={() => setConfettiActive(false)} />}

            <Dialog.Root
                open={resultOpen}
                onOpenChange={(open) => {
                    if (!open) setResultSlug(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#7467ff]/40 bg-white p-6 shadow-2xl dark:bg-neutral-950">
                        <Dialog.Close
                            aria-label="Close"
                            className="absolute right-3 top-3 rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                        >
                            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </Dialog.Close>

                        {resultExercise && (
                            <div className="flex flex-col items-center gap-4 pt-2 text-center">
                                <img
                                    src={resultExercise.data.image.thumbSrc || resultExercise.data.image.src}
                                    alt={resultExercise.data.image.alt}
                                    className="h-24 w-24 rounded-lg object-cover"
                                />
                                <div>
                                    <Dialog.Title className="text-lg font-medium">{resultExercise.data.title}</Dialog.Title>
                                    <Dialog.Description className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                                        {resultExercise.data.description}
                                    </Dialog.Description>
                                </div>
                                <a
                                    href={`/exercises/${resultExercise.slug}`}
                                    className="w-full rounded-lg bg-[#7467ff] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5f52e0]"
                                >
                                    Go to Exercise
                                </a>
                            </div>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <EditStatisticsModal
                open={statsModalOpen}
                onOpenChange={setStatsModalOpen}
                exercises={exercises}
                store={store}
                onApply={applyStatEdits}
                onClearAllData={clearAllData}
            />

            <hr className="my-8 border-neutral-200 dark:border-neutral-800" />

            <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-300">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                dolore magna aliqua, ut enim ad minim veniam quis nostrud exercitation.
            </p>

            <div className="space-y-4">
                {groupByOrder(exercises).map((group) => (
                    <ExerciseGroupSection
                        key={group.groupName}
                        groupName={group.groupName}
                        exercises={group.exercises}
                        store={store}
                        spinning={spinning}
                        onToggleExercise={toggle}
                        onToggleGroup={toggleGroup}
                    />
                ))}
            </div>
        </div>
    );
}
