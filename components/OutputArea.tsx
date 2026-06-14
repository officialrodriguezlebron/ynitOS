"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OutputAreaProps {
  output: string;
  error: string | null;
  command?: string;
}

function telegramToMarkdown(text: string): string {
  // Telegram *bold* → markdown **bold** (single-star, not doubled)
  return text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "**$1**");
}

export function OutputArea({ output, error, command }: OutputAreaProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const isEmpty = !output && !error;

  return (
    <div className="output-pane h-full flex flex-col">
      {/* Header bar */}
      <div className="output-header">
        <span>
          {command ? (
            <>
              <span style={{ color: "var(--text-faint)" }}>{"// "}</span>
              <span style={{ color: "var(--amber)" }}>output</span>
              <span style={{ color: "var(--text-faint)" }}>{" · /"}{command}</span>
            </>
          ) : (
            <span style={{ color: "var(--text-dim)" }}>{"// output"}</span>
          )}
        </span>

        {!isEmpty && (
          <button
            onClick={handleCopy}
            style={{
              background: "transparent",
              border: `1px solid ${copied ? "var(--green)" : "var(--border-2)"}`,
              color: copied ? "var(--green)" : "var(--text-dim)",
              padding: "2px 8px",
              borderRadius: "3px",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "var(--font-terminal)",
              transition: "all 0.12s",
            }}
          >
            {copied ? "copied ✓" : "copy"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="output-content fade-up">
        {isEmpty ? (
          <div
            style={{
              color: "var(--text-faint)",
              fontSize: "12px",
              paddingTop: "24px",
              lineHeight: 2,
            }}
          >
            <div>{"// waiting for command..."}</div>
            <div style={{ marginTop: "8px" }}>
              {"// use quick actions or the command sections on the left"}
            </div>
            <div style={{ color: "var(--border-2)", marginTop: "32px", fontSize: "11px" }}>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} style={{ opacity: 1 - i * 0.12 }}>
                  {"~"}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="prose-terminal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {telegramToMarkdown(output)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
