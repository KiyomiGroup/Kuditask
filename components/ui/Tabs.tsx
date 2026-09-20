"use client";
import { useState, ReactNode } from "react";

interface Tab { id: string; label: string; content: ReactNode; }

export function Tabs({ tabs, defaultTabId }: { tabs: Tab[]; defaultTabId?: string }) {
  const [active, setActive] = useState(defaultTabId ?? tabs[0]?.id);
  return (
    <div>
      <div className="flex gap-space-sm border-b border-outline-variant mb-space-md">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-space-sm py-space-sm text-label-lg font-label-lg border-b-2 -mb-px transition ${
              active === t.id ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.id === active)?.content}
    </div>
  );
}
