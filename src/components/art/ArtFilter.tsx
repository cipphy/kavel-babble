import { useState, useEffect, useRef } from "react";

// Tag categorization
const FIDELITY_TAGS = ["doodle", "sketch", "ink"];
const MEDIUM_TAGS = ["digital", "traditional"];
const PROGRAM_TAGS = ["personal", "drawabox", "promptathon"];

type TagState = 'add' | 'remove';

// Helper to categorize tags from URL format (+tag or -tag)
function categorizeTagsWithState(tagStrings: string[]): {
    fidelity: Record<string, TagState>;
    medium: Record<string, TagState>;
    program: Record<string, TagState>;
    other: Record<string, TagState>;
} {
    const result = {
        fidelity: {} as Record<string, TagState>,
        medium: {} as Record<string, TagState>,
        program: {} as Record<string, TagState>,
        other: {} as Record<string, TagState>
    };

    tagStrings.forEach(tagStr => {
        const state: TagState = tagStr.startsWith('-') ? 'remove' : 'add';
        const tag = tagStr.replace(/^[+-]/, '');

        if (FIDELITY_TAGS.includes(tag.toLowerCase())) {
            result.fidelity[tag] = state;
        } else if (MEDIUM_TAGS.includes(tag.toLowerCase())) {
            result.medium[tag] = state;
        } else if (PROGRAM_TAGS.includes(tag.toLowerCase())) {
            result.program[tag] = state;
        } else {
            result.other[tag] = state;
        }
    });

    return result;
}

// Helper to categorize plain tags (for allTags)
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
        fidelity: Record<string, TagState>;
        medium: Record<string, TagState>;
        program: Record<string, TagState>;
        other: Record<string, TagState>;
    }>({ fidelity: {}, medium: {}, program: {}, other: {} });
    const [selectedSort, setSelectedSort] = useState<string>("newest");
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
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
        const tagStrings = tagParam ? tagParam.split(",") : [];
        const categorized = categorizeTagsWithState(tagStrings);
        const sort = params.get("sort") || "newest";
        setSelectedTags(categorized);
        setSelectedSort(sort);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Don't close if clicking a dropdown button (let button's onClick handle it)
            if (target.closest('button[id$="-filter"]')) {
                return;
            }

            // Don't close if clicking inside the dropdown menu itself
            if (target.closest('[role="listbox"]')) {
                return;
            }

            Object.entries(dropdownRefs).forEach(([key, ref]) => {
                if (ref.current && !ref.current.contains(event.target as Node)) {
                    if (openDropdown === key) {
                        setOpenDropdown(null);
                    }
                }
            });
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
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
        const currentState = categoryTags[tag];

        const newCategoryTags = { ...categoryTags };
        if (!currentState) {
            // empty → add
            newCategoryTags[tag] = 'add';
        } else if (currentState === 'add') {
            // add → remove
            newCategoryTags[tag] = 'remove';
        } else {
            // remove → empty
            delete newCategoryTags[tag];
        }

        const newSelectedTags = { ...selectedTags, [category]: newCategoryTags };
        setSelectedTags(newSelectedTags);

        const allTagStrings = flattenTagsToArray(newSelectedTags);
        updateURL(allTagStrings, selectedSort);
        onFilterChange(allTagStrings, selectedSort);
    };

    const handleClearCategory = (category: keyof typeof selectedTags) => {
        const newSelectedTags = { ...selectedTags, [category]: {} };
        setSelectedTags(newSelectedTags);

        const allTagStrings = flattenTagsToArray(newSelectedTags);
        updateURL(allTagStrings, selectedSort);
        onFilterChange(allTagStrings, selectedSort);
    };

    const handleSortChange = (sort: string) => {
        setSelectedSort(sort);
        const allTagStrings = flattenTagsToArray(selectedTags);
        updateURL(allTagStrings, sort);
        onFilterChange(allTagStrings, sort);
    };

    // Helper to flatten tag records to array with +/- prefixes
    const flattenTagsToArray = (tagRecords: typeof selectedTags): string[] => {
        const result: string[] = [];
        Object.values(tagRecords).forEach(categoryRecord => {
            Object.entries(categoryRecord).forEach(([tag, state]) => {
                result.push(state === 'add' ? `+${tag}` : `-${tag}`);
            });
        });
        return result;
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
        const count = Object.keys(selectedTags[category]).length;
        const pluralMap: Record<string, string> = {
            "Fidelity": "Fidelities",
            "Medium": "Mediums",
            "Program": "Programs",
            "Filter": "Tags"
        };
        const plural = pluralMap[label] || label;
        if (count === 0) return `All ${plural}`;
        if (count === 1) return Object.keys(selectedTags[category])[0];
        return `${count} tags`;
    };

    const categorizedAllTags = categorizeTags(allTags);

    const renderCategoryDropdown = (
        category: keyof typeof selectedTags,
        label: string,
        categoryTags: string[]
    ) => {
        const isOpen = openDropdown === category;
        const hasSelections = Object.keys(selectedTags[category]).length > 0;

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
                            {categoryTags.map((tag) => {
                                const tagState = selectedTags[category][tag]; // 'add' | 'remove' | undefined
                                const isAdd = tagState === 'add';
                                const isRemove = tagState === 'remove';
                                const isEmpty = !tagState;

                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        role="option"
                                        aria-selected={!isEmpty}
                                        onClick={() => handleTagToggle(category, tag)}
                                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
                                    >
                                        <div
                                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${isAdd
                                                    ? "border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500"
                                                    : isRemove
                                                        ? "border-red-600 bg-red-600 dark:border-red-500 dark:bg-red-500"
                                                        : "border-neutral-300 dark:border-neutral-700"
                                                }`}
                                        >
                                            {isAdd ? (
                                                <svg className="h-3 w-3" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                                                </svg>
                                            ) : isRemove ? (
                                                <svg className="h-3 w-3" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
                                                </svg>
                                            ) : null}
                                        </div>
                                        <span>{tag}</span>
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => handleClearCategory(category)}
                                disabled={!hasSelections}
                                className={`w-full border-t border-neutral-200 px-3 py-2 text-left text-xs transition-colors dark:border-neutral-800 ${hasSelections
                                    ? "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900 cursor-pointer"
                                    : "text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                                    }`}
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFilterControls = () => (
        <>
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
        </>
    );

    return (
        <>
            {/* Mobile accordion */}
            <div className="sm:hidden">
                <button
                    type="button"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="flex w-full items-center justify-between py-2 text-base font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                    aria-expanded={isFiltersOpen}
                >
                    <span>Filters</span>
                    <svg
                        className={`h-4 w-4 transition-transform duration-200 ${isFiltersOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                <div className="border-b border-neutral-200 dark:border-neutral-800" />
                <div
                    className={`transition-all duration-200 ease-in-out ${isFiltersOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                        }`}
                >
                    <div className="flex flex-col gap-3 pb-4 pt-3">
                        {renderFilterControls()}
                    </div>
                </div>
            </div>

            {/* Desktop expanded view */}
            <div className="hidden sm:flex sm:flex-wrap sm:gap-3 sm:items-center">
                {renderFilterControls()}
            </div>
        </>
    );
}
