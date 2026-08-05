import { useEffect, useRef } from "react";

interface ConfettiProps {
    onDone: () => void;
}

const COLORS = ["#7467ff", "#9b90ff", "#5f52e0", "#c7c0ff"];
const PARTICLE_COUNT = 140;
const DURATION_MS = 3000;
const FADE_OUT_MS = 600;

interface Particle {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    speedY: number;
    speedX: number;
    rotation: number;
    rotationSpeed: number;
}

export default function Confetti({ onDone }: ConfettiProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
            onDone();
            return;
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            onDone();
            return;
        }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 300,
            width: 6 + Math.random() * 6,
            height: 3 + Math.random() * 5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            speedY: 2.5 + Math.random() * 3,
            speedX: (Math.random() - 0.5) * 2.5,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 12,
        }));

        let rafId: number;
        const start = performance.now();
        const fadeStart = DURATION_MS - FADE_OUT_MS;

        const frame = (now: number) => {
            const elapsed = now - start;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const opacity = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / FADE_OUT_MS) : 1;

            for (const p of particles) {
                p.y += p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
                ctx.restore();
            }

            if (elapsed < DURATION_MS) {
                rafId = requestAnimationFrame(frame);
            } else {
                onDone();
            }
        };

        rafId = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("resize", resize);
        };
        // Runs once per mount — the parent mounts a fresh instance for each celebration.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true" />;
}
