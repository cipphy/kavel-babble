import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useExercisesState } from "../../lib/exercises/useExercisesState";
import { formatDuration, parseDuration } from "../../lib/exercises/time";
import type { ExerciseIdMap } from "../../lib/exercises/idMap";

interface ExercisePanelProps {
    slug: string;
    idMap: ExerciseIdMap;
}

function PlayIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4l10 6-10 6V4z" />
        </svg>
    );
}

function PauseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4h3v12H6V4zM11 4h3v12h-3V4z" />
        </svg>
    );
}

function ResetIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 002.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0112.88 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
            />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            />
        </svg>
    );
}

const TOAST_DURATION_MS = 2500;

function CompletionToast({ onDone }: { onDone: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        const timer = setTimeout(onDone, TOAST_DURATION_MS);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timer);
        };
        // Runs once per mount — the parent mounts a fresh instance for each completion.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[70] flex justify-center px-4" role="status">
            <div
                className={`flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 dark:bg-green-500 ${visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
                    }`}
            >
                <CheckIcon />
                Exercise completed
            </div>
        </div>
    );
}

function playAlert() {
    try {
        const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const pulseCount = 3;
            const pulseDuration = 0.6;
            const gapDuration = 0.35;

            for (let i = 0; i < pulseCount; i++) {
                const startAt = ctx.currentTime + i * (pulseDuration + gapDuration);
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.type = "sine";
                oscillator.frequency.value = 880;
                gain.gain.setValueAtTime(0.2, startAt);
                gain.gain.exponentialRampToValueAtTime(0.0001, startAt + pulseDuration);
                oscillator.connect(gain);
                gain.connect(ctx.destination);
                oscillator.start(startAt);
                oscillator.stop(startAt + pulseDuration);
            }

            const totalDuration = pulseCount * (pulseDuration + gapDuration);
            setTimeout(() => ctx.close().catch(() => { }), (totalDuration + 0.2) * 1000);
        }
    } catch {
        // Web Audio unavailable — silently skip the beep
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
            navigator.vibrate([200, 100, 200, 100, 200]);
        } catch {
            // vibration unsupported/blocked — ignore
        }
    }
}

const DEFAULT_DURATION_INPUT = "0:05:00";
const DEFAULT_QUALITY = 3;

export default function ExercisePanel({ slug, idMap }: ExercisePanelProps) {
    const { complete } = useExercisesState([slug], idMap);

    const [durationInput, setDurationInput] = useState(DEFAULT_DURATION_INPUT);
    const [remainingSeconds, setRemainingSeconds] = useState(() => parseDuration(DEFAULT_DURATION_INPUT) ?? 0);
    const [isRunning, setIsRunning] = useState(false);

    const parsedDuration = parseDuration(durationInput);
    const isValidDuration = parsedDuration !== null;

    useEffect(() => {
        if (!isRunning) return;
        if (remainingSeconds <= 0) {
            setIsRunning(false);
            return;
        }

        const id = setInterval(() => {
            setRemainingSeconds((s) => {
                if (s <= 1) {
                    setIsRunning(false);
                    playAlert();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);

        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning]);

    const handleDurationChange = (value: string) => {
        setDurationInput(value);
        if (!isRunning) {
            const parsed = parseDuration(value);
            if (parsed !== null) setRemainingSeconds(parsed);
        }
    };

    const handleTogglePlay = () => {
        if (isRunning) {
            setIsRunning(false);
            return;
        }
        const parsed = parseDuration(durationInput);
        if (parsed === null) return;
        if (remainingSeconds <= 0) setRemainingSeconds(parsed);
        setIsRunning(true);
    };

    const handleReset = () => {
        setIsRunning(false);
        setRemainingSeconds(parseDuration(durationInput) ?? 0);
    };

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [quality, setQuality] = useState(DEFAULT_QUALITY);
    const [justCompleted, setJustCompleted] = useState(false);

    const handleDialogOpenChange = (open: boolean) => {
        setConfirmOpen(open);
        if (!open) setQuality(DEFAULT_QUALITY);
    };

    const handleConfirmComplete = () => {
        complete(slug, quality);
        setConfirmOpen(false);
        setQuality(DEFAULT_QUALITY);
        setJustCompleted(true);
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">

                <div className="flex flex-col items-center gap-4">
                    <div className="font-mono text-5xl tabular-nums" role="timer" aria-live="polite">
                        {formatDuration(remainingSeconds)}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <label htmlFor="exercise-duration" className="sr-only">
                            Duration (h:mm:ss)
                        </label>
                        <input
                            id="exercise-duration"
                            type="text"
                            inputMode="numeric"
                            value={durationInput}
                            onChange={(e) => handleDurationChange(e.target.value)}
                            disabled={isRunning}
                            placeholder="h:mm:ss"
                            className="w-40 rounded border border-neutral-200 bg-white px-4 py-2.5 text-center font-mono text-base focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
                        />

                        <button
                            type="button"
                            onClick={handleTogglePlay}
                            disabled={!isValidDuration}
                            aria-label={isRunning ? "Pause timer" : "Start timer"}
                            className="rounded-lg bg-[#7467ff] p-3 text-white transition-colors hover:bg-[#5f52e0] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isRunning ? <PauseIcon /> : <PlayIcon />}
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            aria-label="Reset timer"
                            className="rounded-lg bg-[#7467ff] p-3 text-white transition-colors hover:bg-[#5f52e0] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ResetIcon />
                        </button>
                    </div>
                </div>

                {!isValidDuration && (
                    <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">
                        Enter a duration like 1:05:00 or 5:00.
                    </p>
                )}
            </div>

            <div className="flex flex-col items-center">
                <Dialog.Root open={confirmOpen} onOpenChange={handleDialogOpenChange}>
                    <Dialog.Trigger asChild>
                        <button
                            type="button"
                            className="rounded-lg bg-[#7467ff] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#5f52e0]"
                        >
                            I have completed this exercise
                        </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-neutral-800 dark:bg-neutral-950">
                            <Dialog.Title className="text-base font-semibold">Mark this exercise complete?</Dialog.Title>
                            <Dialog.Description className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                                How did it go? This updates when you'll see it again in the exercise generator.
                            </Dialog.Description>

                            <div className="mt-5">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="exercise-quality"
                                        className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                                    >
                                        Difficulty
                                    </label>
                                    <span
                                        className="w-6 text-center font-mono text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100"
                                        aria-hidden="true"
                                    >
                                        {quality}
                                    </span>
                                </div>
                                <input
                                    id="exercise-quality"
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="1"
                                    value={quality}
                                    onChange={(e) => setQuality(Number(e.target.value))}
                                    aria-valuetext={`${quality} out of 5`}
                                    className="mt-2 w-full accent-[#7467ff] focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:ring-offset-2 dark:focus:ring-neutral-800 dark:focus:ring-offset-neutral-950"
                                />
                                <div className="mt-1 flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                    <span>Very Difficult</span>
                                    <span>Very Easy</span>
                                </div>
                            </div>

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
                                    onClick={handleConfirmComplete}
                                    className="rounded-lg bg-[#7467ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5f52e0]"
                                >
                                    Log it
                                </button>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>

                {justCompleted && <CompletionToast onDone={() => window.location.assign("/exercises")} />}
            </div>
        </div>
    );
}
