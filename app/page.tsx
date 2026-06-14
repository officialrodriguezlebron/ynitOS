"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Terminal, WifiOff } from "lucide-react";
import { runCommand, checkHealth } from "@/lib/api";
import { OutputArea } from "@/components/OutputArea";
import { Section } from "@/components/Section";

type RunFn = (command: string, args?: string) => Promise<void>;

// ── Reusable sub-components ───────────────────────────────────

function QuickAction({
  label,
  emoji,
  command,
  args = "",
  onRun,
  loading,
}: {
  label: string;
  emoji: string;
  command: string;
  args?: string;
  onRun: RunFn;
  loading: boolean;
}) {
  return (
    <button
      onClick={() => onRun(command, args)}
      disabled={loading}
      className="flex flex-col items-start gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-[72px] w-full text-left hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-sm font-medium text-zinc-100 leading-tight">{label}</span>
    </button>
  );
}

function CommandInput({
  label,
  placeholder,
  command,
  multiline = false,
  onRun,
  loading,
}: {
  label: string;
  placeholder: string;
  command: string;
  multiline?: boolean;
  onRun: RunFn;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (!value.trim()) return;
    onRun(command, value.trim());
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-zinc-400 font-medium">{label}</label>
      <div className="flex gap-2">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
        >
          Run
        </button>
      </div>
    </div>
  );
}

function IconButtons({
  items,
  onRun,
  loading,
}: {
  items: [string, string][];
  onRun: RunFn;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, cmd]) => (
        <button
          key={cmd}
          onClick={() => onRun(cmd)}
          disabled={loading}
          className="py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function UniversalCommand({ onRun, loading }: { onRun: RunFn; loading: boolean }) {
  const [input, setInput] = useState("");

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parts = trimmed.replace(/^\//, "").split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");
    onRun(command, args);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        Type any full command, e.g.{" "}
        <code className="text-blue-400 text-xs">/kyn [job post]</code>{" "}
        or{" "}
        <code className="text-blue-400 text-xs">/learn react</code>
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="/today   /pdp Sonny Hat   /idea add X"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base font-bold rounded-lg transition-colors shrink-0"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function Page() {
  const [health, setHealth] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCommand, setActiveCommand] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkHealth().then(setHealth);
    const id = setInterval(() => checkHealth().then(setHealth), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (output && outputRef.current) {
      setTimeout(
        () => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    }
  }, [output]);

  const run: RunFn = useCallback(async (command, args = "") => {
    setLoading(true);
    setError(null);
    setActiveCommand(command);
    try {
      const result = await runCommand(command, args);
      setOutput(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setOutput(msg);
    } finally {
      setLoading(false);
      setActiveCommand("");
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 -mx-4 px-4 py-3 mb-6 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-blue-400" />
            <h1 className="text-lg font-bold tracking-tight">LJR.devOS</h1>
          </div>

          <div className="flex items-center gap-2">
            {health === null ? (
              <span className="text-zinc-500 text-xs">Checking…</span>
            ) : health ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-green-400 text-xs font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-red-400" />
                <span className="text-red-400 text-xs font-medium">
                  Offline — check Tailscale
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {/* Loading banner */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-950/40 border border-blue-900/50 rounded-xl text-blue-300 text-sm">
            <Loader2 size={15} className="animate-spin shrink-0" />
            <span>
              Running{" "}
              <code className="text-blue-200 bg-blue-950/50 px-1 rounded text-xs">
                /{activeCommand}
              </code>
              {" "}— AI may take 10–30s…
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction emoji="📅" label="Today's Schedule" command="today" onRun={run} loading={loading} />
            <QuickAction emoji="📊" label="Overview" command="overview" onRun={run} loading={loading} />
            <QuickAction emoji="💼" label="Applications" command="applications" onRun={run} loading={loading} />
            <QuickAction emoji="⏱️" label="Hours This Week" command="hours" onRun={run} loading={loading} />
          </div>
        </div>

        {/* Ecommerce AI Team */}
        <Section title="Ecommerce AI Team" icon="🛍️" defaultOpen={true}>
          <CommandInput label="PDP Generator" placeholder="Product name, price, material, story…" command="pdp" onRun={run} loading={loading} />
          <CommandInput label="TikTok Shop Listing" placeholder="Product name, price, key selling point…" command="tiktok" onRun={run} loading={loading} />
          <CommandInput label="Meta Ad Draft" placeholder="Product name, price, key benefit…" command="meta" onRun={run} loading={loading} />
          <CommandInput label="Content Calendar" placeholder="Month, products, upcoming campaigns…" command="contentcal" onRun={run} loading={loading} />
          <CommandInput label="Email Audit" placeholder="Describe your email flows or paste content…" command="emailaudit" multiline={true} onRun={run} loading={loading} />
          <CommandInput label="Reel Script" placeholder="Footage, platform (Reels/TikTok), tone…" command="reel" multiline={true} onRun={run} loading={loading} />
        </Section>

        {/* Quick Reply */}
        <Section title="Quick Reply" icon="💬">
          <CommandInput label="Paste a message to reply to" placeholder="Hi Lebron, ready for Monday? — Jordan" command="reply" multiline={true} onRun={run} loading={loading} />
        </Section>

        {/* Career */}
        <Section title="Career" icon="🎯">
          <CommandInput label="KYN Score" placeholder="Paste full job post…" command="kyn" multiline={true} onRun={run} loading={loading} />
          <CommandInput label="Full Analysis + Cover Letter" placeholder="Job URL or paste post…" command="analyze" onRun={run} loading={loading} />
          <IconButtons items={[["Follow-ups Due", "followup"], ["Stats", "stats"]]} onRun={run} loading={loading} />
        </Section>

        {/* Planning */}
        <Section title="Planning" icon="🗓️">
          <IconButtons
            items={[["Morning Brief", "morning"], ["Next Action", "next"], ["Week Plan", "weekplan"], ["Free Slots", "free"]]}
            onRun={run}
            loading={loading}
          />
          <CommandInput label="Session Plan" placeholder="2h high  (hours + energy: high/medium/low)" command="plan" onRun={run} loading={loading} />
        </Section>

        {/* Universal Command */}
        <Section title="Universal Command" icon="⌨️">
          <UniversalCommand onRun={run} loading={loading} />
        </Section>

        {/* Output */}
        {(output || error) && (
          <div ref={outputRef}>
            <OutputArea output={output ?? ""} error={error} />
          </div>
        )}
      </div>
    </div>
  );
}
