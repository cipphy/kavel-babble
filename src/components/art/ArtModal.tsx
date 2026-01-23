import { useEffect, useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import useEmblaCarousel from "embla-carousel-react";
import type { CollectionEntry } from "astro:content";

interface ArtModalProps {
    posts: CollectionEntry<"art">[];
}

export default function ArtModal({ posts }: ArtModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlug, setCurrentSlug] = useState<string | null>(null);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

    const currentPost = posts.find((p) => p.slug === currentSlug);
    const currentIndex = currentPost ? posts.findIndex((p) => p.slug === currentSlug) : -1;

    // Handle opening modal from URL or click
    const openModal = useCallback((slug: string, pushState = true) => {
        setCurrentSlug(slug);
        setIsOpen(true);

        if (pushState) {
            window.history.pushState({ artModal: slug }, "", `/art/${slug}`);
        }
    }, []);

    // Handle closing modal
    const closeModal = useCallback(() => {
        setIsOpen(false);
        setCurrentSlug(null);

        // Only go back if we're on an art URL
        if (window.location.pathname.startsWith("/art/")) {
            window.history.back();
        }
    }, []);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state?.artModal) {
                openModal(event.state.artModal, false);
            } else if (window.location.pathname === "/") {
                setIsOpen(false);
                setCurrentSlug(null);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [openModal]);

    // Check URL on mount for deep links
    useEffect(() => {
        const path = window.location.pathname;
        if (path.startsWith("/art/")) {
            const slug = path.replace("/art/", "").replace(/\/$/, "");
            if (posts.find((p) => p.slug === slug)) {
                openModal(slug, false);
            }
        }
    }, [posts, openModal]);

    // Intercept art post links
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a[href^="/art/"]') as HTMLAnchorElement;

            if (link) {
                e.preventDefault();
                const slug = link.pathname.replace("/art/", "").replace(/\/$/, "");
                openModal(slug, true);
            }
        };

        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [openModal]);

    // Update carousel when post changes
    useEffect(() => {
        if (emblaApi && currentIndex >= 0) {
            emblaApi.scrollTo(0, true);
        }
    }, [emblaApi, currentIndex]);

    if (!currentPost) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-5xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">

                    {/* Close button */}
                    <Dialog.Close className="absolute right-4 top-4 z-10 rounded-lg bg-neutral-900/80 p-2 text-neutral-200 backdrop-blur-sm transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-600">
                        <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                        <span className="sr-only">Close</span>
                    </Dialog.Close>

                    <div className="flex h-full max-h-[90vh] flex-col">
                        {/* Carousel */}
                        <div className="relative flex-1 overflow-hidden bg-neutral-900">
                            <div className="embla h-full" ref={emblaRef}>
                                <div className="embla__container flex h-full">
                                    {currentPost.data.images.map((image, index) => (
                                        <div key={index} className="embla__slide relative flex min-w-0 flex-[0_0_100%] items-center justify-center">
                                            <img
                                                src={image.src}
                                                alt={image.alt}
                                                className="max-h-[60vh] w-auto object-contain"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Navigation arrows */}
                            {currentPost.data.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => emblaApi?.scrollPrev()}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-neutral-900/80 p-3 text-neutral-200 backdrop-blur-sm transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-600"
                                        aria-label="Previous image"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => emblaApi?.scrollNext()}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-neutral-900/80 p-3 text-neutral-200 backdrop-blur-sm transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-600"
                                        aria-label="Next image"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6.1584 3.13514C6.35985 2.94628 6.67627 2.95648 6.86513 3.15794L10.6151 7.15794C10.7954 7.35027 10.7954 7.64955 10.6151 7.84188L6.86513 11.8419C6.67627 12.0433 6.35985 12.0535 6.1584 11.8647C5.95694 11.6758 5.94673 11.3594 6.13559 11.1579L9.565 7.49991L6.13559 3.84188C5.94673 3.64042 5.95694 3.32401 6.1584 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Post metadata */}
                        <div className="border-t border-neutral-800 bg-neutral-950 p-6">
                            <Dialog.Title className="text-lg font-semibold text-neutral-50">
                                {currentPost.data.title}
                            </Dialog.Title>

                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                <time className="text-xs text-neutral-400" dateTime={currentPost.data.date.toISOString()}>
                                    {currentPost.data.date.toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                </time>

                                {currentPost.data.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {currentPost.data.tags.map((tag) => (
                                            <span key={tag} className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-200">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Description/Content */}
                            {currentPost.body && (
                                <div className="mt-4 text-sm text-neutral-300 prose-sm prose-invert">
                                    {currentPost.body}
                                </div>
                            )}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
