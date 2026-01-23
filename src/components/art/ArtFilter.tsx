import { useState, useEffect, useRef } from "react";

// Tag categorization
const FIDELITY_TAGS = ["doodle", "sketch", "ink"];
const MEDIUM_TAGS = ["digital", "traditional"];
const PROGRAM_TAGS = ["personal", "drawabox"];

// Helper to categorize tags
function categorizeTags(tags: string[]) {
    const fidelity = tags.filter(t => FIDELITY_TAGS.includes(t.toLowerCase()));
    const medium = tags.filter(t => MEDIUM_TAGS.includes(t.toLowerCase()));
    const program = tags.filter(t => PROGRAM_TAGS.includes(t.toLowerCase()));
    const other = tags.filter(t =>
        !FIDELITY_TAGS.includes(t.toLowerCase()) &&
        !MEDIUM_TAGS.includes(t.toLowerCase()) &&
        !PROGRAM_TAGS.includes(t.toLowerCase())
    );

    return { fidelity, medium, program, other };
}

interface ArtFilterProps {
    allTags: string[];
    onFilterChange: (tags: string[], sort: string) => void;
}

export default function ArtFilter({ allTags, onFilterChange }: ArtFilterProps) {
    const [selectedTags, setSelectedTags] = useState<{
        fidelity: string[];
        medium: string[];
        program: string[];
        other: string[];
    }>({ fidelity: [], medium: [], program: [], other: [] });
    const [selectedSort, setSelectedSort] = useState<string>("newest");
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRefs = {
        fidelity: useRef<HTMLDivElement>(null),
        medium: useRef<HTMLDivElement>(null),
        program: useRef<HTMLDivElement>(null),
        other: useRef<HTMLDivElement>(null),
    };

    // Read from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tagParam = params.get("tags");
        const tags = tagParam ? tagParam.split(",") : [];
        const categorized = categorizeTags(tags);
        const sort = params.get("sort") || "newest";
        setSelectedTags(categorized);
        setSelectedSort(sort);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            Object.entries(dropdownRefs).forEach(([key, ref]) => {
                if (ref.current && !ref.current.contains(event.target as Node)) {
                    if (openDropdown === key) {
                        setOpenDropdown(null);
                    }
                }
            });
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openDropdown]);

    // Handle ESC key to close dropdown
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && openDropdown) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [openDropdown]);

    const handleTagToggle = (category: keyof typeof selectedTags, tag: string) => {
        const categoryTags = selectedTags[category];
        const newCategoryTags = categoryTags.includes(tag)
            ? categoryTags.filter((t) => t !== tag)
            : [...categoryTags, tag];

        const newSelectedTags = { ...selectedTags, [category]: newCategoryTags };
        setSelectedTags(newSelectedTags);

        const allTags = [...newSelectedTags.fidelity, ...newSelectedTags.medium, ...newSelectedTags.program, ...newSelectedTags.other];
        updateURL(allTags, selectedSort);
        onFilterChange(allTags, selectedSort);
    };

    const handleClearCategory = (category: keyof typeof selectedTags) => {
        const newSelectedTags = { ...selectedTags, [category]: [] };
        setSelectedTags(newSelectedTags);

        const allTags = [...newSelectedTags.fidelity, ...newSelectedTags.medium, ...newSelectedTags.program, ...newSelectedTags.other];
        updateURL(allTags, selectedSort);
        onFilterChange(allTags, selectedSort);
    };

    const handleSortChange = (sort: string) => {
        setSelectedSort(sort);
        const allTags = [...selectedTags.fidelity, ...selectedTags.medium, ...selectedTags.program, ...selectedTags.other];
        updateURL(allTags, sort);
        onFilterChange(allTags, sort);
    };

    const updateURL = (tags: string[], sort: string) => {
        const params = new URLSearchParams();
        if (tags.length > 0) params.set("tags", tags.join(","));
        if (sort !== "newest") params.set("sort", sort);

        const queryString = params.toString();
        const newURL = queryString ? `/?${queryString}` : "/";
        window.history.replaceState({}, "", newURL);
    };

    const getButtonText = (category: keyof typeof selectedTags, label: string) => {
        const count = selectedTags[category].length;
        const pluralMap: Record<string, string> = {
            "Fidelity": "Fidelities",
            "Medium": "Mediums",
            "Program": "Programs",
            "Filter": "Tags"
        };
        const plural = pluralMap[label] || label;
        if (count === 0) return `All ${plural}`;
        if (count === 1) return selectedTags[category][0];
        return `${count} selected`;
    };

    const categorizedAllTags = categorizeTags(allTags);

    const renderCategoryDropdown = (
        category: keyof typeof selectedTags,
        label: string,
        categoryTags: string[]
    ) => {
        const isOpen = openDropdown === category;
        const hasSelections = selectedTags[category].length > 0;

        if (categoryTags.length === 0) return null;

        return (
            <div className="relative flex items-center gap-2" ref={dropdownRefs[category]}>
                <label htmlFor={`${category}-filter`} className="text-sm text-neutral-600 dark:text-neutral-400">
                    {label}:
                </label>
                <div className="relative">
                    <button
                        id={`${category}-filter`}
                        type="button"
                        onClick={() => setOpenDropdown(isOpen ? null : category)}
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                        className="flex min-w-[140px] items-center justify-between gap-2 rounded border border-neutral-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
                    >
                        <span className="truncate">{getButtonText(category, label)}</span>
                        <svg
                            className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isOpen && (
                        <div
                            role="listbox"
                            aria-multiselectable="true"
                            className="absolute right-0 z-10 mt-1 max-h-60 min-w-[200px] overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
                        >
                            <button
                                type="button"
                                onClick={() => handleClearCategory(category)}
                                disabled={!hasSelections}
                                className={`w-full border-b border-neutral-200 px-3 py-2 text-left text-xs transition-colors dark:border-neutral-800 ${hasSelections
                                        ? "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900 cursor-pointer"
                                        : "text-transparent dark:text-transparent cursor-default pointer-events-none"
                                    }`}
                            >
                                Clear all
                            </button>
                            {categoryTags.map((tag) => {
                                const isSelected = selectedTags[category].includes(tag);
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
                                            onChange={() => handleTagToggle(category, tag)}
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
        );
    };

    return (
        <div className="flex flex-wrap gap-3 items-center">
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

            {/* Fidelity filter */}
            {renderCategoryDropdown("fidelity", "Fidelity", categorizedAllTags.fidelity)}

            {/* Medium filter */}
            {renderCategoryDropdown("medium", "Medium", categorizedAllTags.medium)}

            {/* Program filter */}
            {renderCategoryDropdown("program", "Program", categorizedAllTags.program)}

            {/* Other tags filter */}
            {renderCategoryDropdown("other", "Filter", categorizedAllTags.other)}
        </div>
    );
}
