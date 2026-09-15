"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const searchableTools = [
  {
    href: "/calculators/laundromat-profit-calculator",
    keywords: ["laundromat", "laundry", "laundromat profit"],
  },
  {
    href: "/calculators/vending-machine-profit-calculator",
    keywords: ["vending", "vending machine", "vending profit"],
  },
  {
    href: "/calculators/car-wash-profit-roi-calculator",
    keywords: [
      "car wash",
      "carwash",
      "car wash profit",
      "car wash roi",
    ],
  },
  {
    href: "/calculators/startup-cost-calculator",
    keywords: ["startup", "startup cost", "startup costs"],
  },
  {
    href: "/calculators/break-even-calculator",
    keywords: ["break even", "break-even", "breakeven"],
  },
  {
    href: "/calculators/profit-margin-calculator",
    keywords: [
      "profit margin",
      "margin",
      "markup",
      "gross profit",
    ],
  },
  {
    href: "/calculators/roi-calculator",
    keywords: [
      "roi",
      "return on investment",
      "investment return",
    ],
  },
];

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

export default function ToolSearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) {
      setMessage("Enter a calculator or business topic to search.");
      return;
    }

    const exactMatch = searchableTools.find((tool) =>
      tool.keywords.some(
        (keyword) =>
          normalizeSearch(keyword) === normalizedQuery
      )
    );

    const partialMatch = searchableTools.find((tool) =>
      tool.keywords.some((keyword) => {
        const normalizedKeyword = normalizeSearch(keyword);

        return (
          normalizedKeyword.includes(normalizedQuery) ||
          normalizedQuery.includes(normalizedKeyword)
        );
      })
    );

    const match = exactMatch ?? partialMatch;

    if (match) {
      setMessage("");
      router.push(match.href);
      return;
    }

    setMessage(
      `No calculator found for "${query.trim()}". Try profit margin, break-even, startup costs, car wash, laundromat, vending, or ROI.`
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"
      >
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setMessage("");
          }}
          placeholder="Search calculators and business tools..."
          aria-label="Search calculators and business tools"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
        />

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
        >
          Search Tools
        </button>
      </form>

      {message && (
        <p
          role="status"
          className="mt-3 text-sm text-slate-600"
        >
          {message}
        </p>
      )}
    </div>
  );
}