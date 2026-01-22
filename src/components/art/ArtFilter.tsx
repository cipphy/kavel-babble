import { useState, useEffect, useRef } from "react";

interface ArtFilterProps {
    allTags: string[];
    onFilterChange: (tags: string[], sort: string) => void;
}

export default function ArtFilter({ allTags, onFilterChange }: ArtFilterProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedSort, setSelectedSort] = useState<string>("newest");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Read from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tagParam = params.get("tags");
        const tags = tagParam ? tagParam.split(",") : [];
        const sort = params.get("sort") || "newest";
        setSelectedTags(tags);
        setSelectedSort(sort);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle ESC key to close dropdown
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isDropdownOpen) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isDropdownOpen]);

    const handleTagToggle = (tag: string) => {
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter((t) => t !== tag)
            : [...selectedTags, tag];

        setSelectedTags(newTags);
        updateURL(newTags, selectedSort);
        onFilterChange(newTags, selectedSort);
    };

    const handleClearTags = () => {
        setSelectedTags([]);
        updateURL([], selectedSort);
        onFilterChange([], selectedSort);
    };

    const handleSortChange = (sort: string) => {
        setSelectedSort(sort);
        updateURL(selectedTags, sort);
        onFilterChange(selectedTags, sort);
    };

    const updateURL = (tags: string[], sort: string) => {
        const params = new URLSearchParams();
        if (tags.length > 0) params.set("tags", tags.join(","));
        if (sort !== "newest") params.set("sort", sort);

        const queryString = params.toString();
        const newURL = queryString ? `/?${queryString}` : "/";
        window.history.replaceState({}, "", newURL);
    };

    const getButtonText = () => {
        if (selectedTags.length === 0) return "All Tags";
        if (selectedTags.length === 1) return selectedTags[0];
        return `${selectedTags.length} tags selected`;
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm text-neutral-600 dark:text-neutral-400">
                    Sort:
                </label>
                <select
                    id="sort"
                    value={selectedSort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="rounded border border-neutral-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            {/* Multi-select tag filter */}
            {allTags.length > 0 && (
                <div className="relative flex items-center gap-2" ref={dropdownRef}>
                    <label htmlFor="tag-filter" className="text-sm text-neutral-600 dark:text-neutral-400">
                        Filter:
                    </label>
                    <div className="relative">
                        <button
                            id="tag-filter"
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="listbox"
                            className="flex min-w-[140px] items-center justify-between gap-2 rounded border border-neutral-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
                        >
                            <span className="truncate">{getButtonText()}</span>
                            <svg
                                className={`h-4 w-4 shrink-0 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isDropdownOpen && (
                            <div
                                role="listbox"
                                aria-multiselectable="true"
                                className="absolute right-0 z-10 mt-1 max-h-60 min-w-[200px] overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
                            >
                                {selectedTags.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearTags}
                                        className="w-full border-b border-neutral-200 px-3 py-2 text-left text-xs text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900"
                                    >
                                        Clear all
                                    </button>
                                )}
                                {allTags.map((tag) => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <label
                                            key={tag}
                                            role="option"
                                            aria-selected={isSelected}
                                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleTagToggle(tag)}
                                                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-200 focus:ring-offset-0 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:ring-neutral-800"
                                            />
                                            <span>{tag}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
