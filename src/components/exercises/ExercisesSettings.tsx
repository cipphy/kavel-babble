import { useEffect, useRef, useState } from "react";

interface ExercisesSettingsProps {
    gambaMode: boolean;
    onGambaModeChange: (enabled: boolean) => void;
    onOpenEditStatistics: () => void;
}

export default function ExercisesSettings({ gambaMode, onGambaModeChange, onOpenEditStatistics }: ExercisesSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    return (
        <div className="relative" ref={panelRef}>
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label="Exercise settings"
                className="rounded p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
            >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    />
                </svg>
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Exercise settings"
                    className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
                >
                    <label className="flex cursor-pointer items-start justify-between gap-3 text-sm">
                        <span>
                            <span className="block font-medium">Gamba Mode</span>
                            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                                Spin a slot-machine carousel to pick your exercise
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={gambaMode}
                            onChange={(e) => onGambaModeChange(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#7467ff]"
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() => {
                            setIsOpen(false);
                            onOpenEditStatistics();
                        }}
                        className="mt-3 w-full rounded border border-neutral-200 px-3 py-2 text-mid text-sm transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                    >
                        Edit statistics
                    </button>
                </div>
            )}
        </div>
    );
}
