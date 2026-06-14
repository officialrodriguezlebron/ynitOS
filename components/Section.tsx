"use client";

import { useState } from "react";

interface SectionProps {
  title: string;
  prefix?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Section({
  title,
  prefix = "fn",
  defaultOpen = false,
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`section-header ${open ? "open" : ""}`}
      >
        <span>
          <span style={{ color: "var(--text-faint)" }}>{prefix}{"() {"} </span>
          <span style={{ color: "var(--text)" }}>{title}</span>
          {!open && <span style={{ color: "var(--text-faint)" }}>{" }"}</span>}
        </span>
        <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="section-body">
          {children}
          <div style={{ color: "var(--text-faint)", fontSize: "11px", marginTop: "4px" }}>
            {"}"}
          </div>
        </div>
      )}
    </div>
  );
}
