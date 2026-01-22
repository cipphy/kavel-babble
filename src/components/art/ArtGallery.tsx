import { useState, useEffect } from "react";
import ArtFilter from "./ArtFilter";
import type { CollectionEntry } from "astro:content";

interface ArtGalleryProps {
    posts: CollectionEntry<"art">[];
}

export default function ArtGallery({ posts }: ArtGalleryProps) {
    const [filteredPosts, setFilteredPosts] = useState(posts);

    // Extract all unique tags
    const allTags = Array.from(
        new Set(posts.flatMap((p) => p.data.tags))
    ).sort();

    const handleFilterChange = (tags: string[], sort: string) => {
        let filtered = [...posts];

        // Apply tag filter - show posts that have ALL selected tags
        if (tags.length > 0) {
            filtered = filtered.filter((p) =>
                tags.every((tag) => p.data.tags.includes(tag))
            );
        }

        // Apply sort
        if (sort === "newest") {
            filtered.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
        } else if (sort === "oldest") {
            filtered.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
        }

        setFilteredPosts(filtered);
    };

    // Initialize from URL params on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tagParam = params.get("tags");
        const tags = tagParam ? tagParam.split(",") : [];
        const sort = params.get("sort") || "newest";
        handleFilterChange(tags, sort);
    }, []);

    return (
        <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
                <h1 className="text-xl font-semibold">Art</h1>
                <ArtFilter allTags={allTags} onFilterChange={handleFilterChange} />
            </div>

            {filteredPosts.length === 0 ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    No art posts match the selected filters.
                </p>
            ) : (
                <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPosts.map((p) => (
                        <a key={p.slug} href={`/art/${p.slug}`} className="group block">
                            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                                <div className="aspect-[4/5] bg-neutral-100 dark:bg-neutral-900">
                                    <img
                                        src={p.data.images[0].thumbSrc || p.data.images[0].src}
                                        alt={p.data.images[0].alt}
                                        width={p.data.images[0].width}
                                        height={p.data.images[0].height}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    />
                                </div>
                            </div>

                            <div className="mt-2">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                                    <h2 className="text-sm font-medium">{p.data.title}</h2>
                                    <time
                                        className="text-xs text-neutral-500 dark:text-neutral-400 sm:shrink-0"
                                        dateTime={p.data.date.toISOString()}
                                    >
                                        {p.data.date.toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </time>
                                </div>
                                {p.data.tags.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {p.data.tags.map((t) => (
                                            <span
                                                key={t}
                                                className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </a>
                    ))}
                </section>
            )}
        </>
    );
}
