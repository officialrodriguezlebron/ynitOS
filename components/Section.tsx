"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Section({
  title,
  icon,
  defaultOpen = false,
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-4 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span className="font-semibold text-zinc-100">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </span>
        {open ? (
          <ChevronUp size={16} className="text-zinc-400 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-zinc-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/60 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
