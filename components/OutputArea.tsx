"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";

interface OutputAreaProps {
  output: string;
  error: string | null;
}

function telegramToMarkdown(text: string): string {
  // Agent outputs use Telegram's *bold* — convert to markdown **bold**
  // Only convert single-star wrapping (not already-doubled)
  return text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "**$1**");
}

export function OutputArea({ output, error }: OutputAreaProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const content = telegramToMarkdown(output);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Output
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800"
        >
          {copied ? (
            <>
              <Check size={13} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              Copy
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 text-red-400 text-sm bg-red-950/30 border-b border-red-900/50">
          {error}
        </div>
      )}

      <div className="p-4 prose-dark overflow-x-auto max-h-[60vh] overflow-y-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
