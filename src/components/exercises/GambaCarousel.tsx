import { useEffect, useRef, useState } from "react";

export interface GambaCarouselItem {
    slug: string;
    title: string;
    thumbSrc: string;
    alt: string;
}

interface GambaCarouselProps {
    items: GambaCarouselItem[];
    targetSlug: string;
    onFinished: () => void;
}

// Item box size must match the responsive classes on the rendered strip items below
// (h-20/w-20 gap-2 under the sm breakpoint, h-32/w-32 gap-3 at sm and up).
const MOBILE_ITEM_WIDTH = 80;
const MOBILE_ITEM_GAP = 8;
const DESKTOP_ITEM_WIDTH = 128;
const DESKTOP_ITEM_GAP = 12;
const DESKTOP_BREAKPOINT_QUERY = "(min-width: 640px)";

function getItemMetrics(): { itemWidth: number; itemGap: number } {
    const isDesktop = window.matchMedia(DESKTOP_BREAKPOINT_QUERY).matches;
    return isDesktop
        ? { itemWidth: DESKTOP_ITEM_WIDTH, itemGap: DESKTOP_ITEM_GAP }
        : { itemWidth: MOBILE_ITEM_WIDTH, itemGap: MOBILE_ITEM_GAP };
}

const BEFORE_LOOPS = 5; // full loops of the pool scrolled through before landing
const TRAILING_LOOPS = 3; // extra loops appended after the landing spot so the strip never visibly runs out
const SPIN_DURATION_MS = 4000;
const FAST_PHASE_T = 0.35; // fraction of the duration spent at a near-constant fast spin
const FAST_PHASE_DISTANCE = 0.60; // fraction of the total distance covered during the fast phase
const FADE_IN_MS = 700; // must match the container's transition-opacity duration class below
const START_PADDING_MS = 500; // extra beat after the fade-in settles before the spin kicks off

function playTick(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1400;
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
}

// Phase 1 (t <= FAST_PHASE_T) is a constant-velocity cruise. Phase 2 is a quintic ("minimum
// jerk") solved so position, velocity, AND acceleration all match the cruise phase at the seam,
// and velocity AND acceleration both reach zero exactly at t=1. Matching position+velocity alone
// (a cubic) still leaves a discontinuity in acceleration — braking switches on instantly at the
// seam, and the animation hits zero velocity like a wall instead of easing into the stop, which
// reads as an abrupt halt. Matching acceleration too (via two extra degrees of freedom) makes the
// deceleration itself ease in and out smoothly, front and back.
const CRUISE_VELOCITY = FAST_PHASE_DISTANCE / FAST_PHASE_T;
const BRAKE_DURATION = 1 - FAST_PHASE_T;
const BRAKE_REMAINDER = 1 - FAST_PHASE_DISTANCE - CRUISE_VELOCITY * BRAKE_DURATION;
const R1 = BRAKE_REMAINDER / (BRAKE_DURATION * BRAKE_DURATION * BRAKE_DURATION);
const R2 = -CRUISE_VELOCITY / (BRAKE_DURATION * BRAKE_DURATION);
const BRAKE_A3 = 10 * R1 - 4 * R2;
const BRAKE_A4 = (7 * R2 - 15 * R1) / BRAKE_DURATION;
const BRAKE_A5 = (3 * (2 * R1 - R2)) / (BRAKE_DURATION * BRAKE_DURATION);

function easeSpin(t: number): number {
    if (t <= FAST_PHASE_T) {
        return CRUISE_VELOCITY * t;
    }
    const u = t - FAST_PHASE_T; // elapsed time into the braking phase
    return (
        FAST_PHASE_DISTANCE +
        CRUISE_VELOCITY * u +
        BRAKE_A3 * u * u * u +
        BRAKE_A4 * u * u * u * u +
        BRAKE_A5 * u * u * u * u * u
    );
}

export default function GambaCarousel({ items, targetSlug, onFinished }: GambaCarouselProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [skip, setSkip] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const revealRaf = requestAnimationFrame(() => setVisible(true));

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const targetIndex = items.findIndex((item) => item.slug === targetSlug);

        if (reducedMotion || targetIndex === -1 || items.length === 0) {
            setSkip(true);
            onFinished();
            return () => cancelAnimationFrame(revealRaf);
        }

        const landingIndex = BEFORE_LOOPS * items.length + targetIndex;

        let rafId: number;
        let audioCtx: AudioContext | null = null;

        // Wait for the container's fade-in to finish (plus a beat) before the strip starts moving.
        const startTimer = setTimeout(() => {
            const { itemWidth, itemGap } = getItemMetrics();
            const step = itemWidth + itemGap;
            const containerWidth = containerRef.current?.clientWidth ?? 0;
            const targetOffset = landingIndex * step + itemWidth / 2 - containerWidth / 2;

            try {
                const AudioContextClass =
                    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                if (AudioContextClass) audioCtx = new AudioContextClass();
            } catch {
                audioCtx = null;
            }

            let lastBoundary = -1;
            let lastOffset = 0;
            const start = performance.now();

            const frame = (now: number) => {
                const elapsed = now - start;
                const t = Math.min(elapsed / SPIN_DURATION_MS, 1);
                // The braking cubic's exact roots shift with FAST_PHASE_T/FAST_PHASE_DISTANCE and are
                // sensitive to floating-point rounding near the boundary, so clamp to non-decreasing
                // as a hard guarantee the strip never visibly reverses, regardless of tuning.
                const currentOffset = Math.max(easeSpin(t) * targetOffset, lastOffset);
                lastOffset = currentOffset;

                if (trackRef.current) {
                    trackRef.current.style.transform = `translateX(-${currentOffset}px)`;
                }

                const boundary = Math.floor(currentOffset / step);
                if (boundary !== lastBoundary) {
                    lastBoundary = boundary;
                    if (audioCtx) playTick(audioCtx);
                }

                if (t < 1) {
                    rafId = requestAnimationFrame(frame);
                } else {
                    setTimeout(onFinished, 250);
                }
            };

            rafId = requestAnimationFrame(frame);
        }, FADE_IN_MS + START_PADDING_MS);

        return () => {
            cancelAnimationFrame(revealRaf);
            clearTimeout(startTimer);
            cancelAnimationFrame(rafId);
            audioCtx?.close().catch(() => { });
        };
        // Runs once per mount — a fresh key from the parent drives each new spin.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (skip) return null;

    const stripLength = (BEFORE_LOOPS + 1 + TRAILING_LOOPS) * items.length;
    const strip = Array.from({ length: stripLength }, (_, i) => items[i % items.length]);

    return (
        <div
            ref={containerRef}
            className={`relative mb-8 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 py-6 transition-opacity duration-700 dark:border-neutral-800 dark:bg-neutral-900 ${visible ? "opacity-100" : "opacity-0"
                }`}
            aria-hidden="true"
        >
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-[#7467ff]" />
            <div ref={trackRef} className="flex gap-2 px-4 sm:gap-3" style={{ transform: "translateX(0px)" }}>
                {strip.map((item, index) => (
                    <div
                        key={`${item.slug}-${index}`}
                        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 sm:h-32 sm:w-32"
                    >
                        <img src={item.thumbSrc} alt="" className="h-full w-full object-cover" />
                    </div>
                ))}
            </div>
        </div>
    );
}
