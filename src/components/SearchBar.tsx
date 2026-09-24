"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({
  autoFocus = false,
  placeholder = "SEARCH HACKATHONS, CULTURAL NIGHTS, SUMMITS…",
}: {
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="group w-full">
      <div className="flex items-end gap-3 border-b border-ink-line pb-2 transition-colors focus-within:border-acid">
        <label
          htmlFor="hackb4-search"
          className="pb-0.5 text-[10px] uppercase tracking-[0.3em] text-bone-faint"
        >
          Find
        </label>
        <input
          id="hackb4-search"
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent pb-0.5 font-terminal text-sm uppercase tracking-[0.12em] text-bone placeholder:text-bone-faint/70 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 border border-ink-line px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-bone-dim transition-colors hover:border-acid hover:bg-acid hover:text-ink"
        >
          Scan →
        </button>
      </div>
    </form>
  );
}
