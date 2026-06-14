"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { runCommand, checkHealth, type HealthStatus } from "@/lib/api";
import { OutputArea } from "@/components/OutputArea";
import { Section } from "@/components/Section";

// ── Types ──────────────────────────────────────────────────────

type RunFn = (command: string, args?: string) => Promise<void>;

// ── Ecommerce tabs config ──────────────────────────────────────

const ECOM_PRIMARY = [
  {
    id: "pdp",
    label: "PDP",
    placeholder: "Sonny Corduroy Hat, Moss Green, $98, 100% cotton, made in Portugal…",
    multiline: false,
  },
  {
    id: "tiktok",
    label: "TikTok",
    placeholder: "Product name, price, key selling point, brand name…",
    multiline: false,
  },
  {
    id: "meta",
    label: "Meta",
    placeholder: "Product name, price, key benefit, AOV target…",
    multiline: false,
  },
  {
    id: "contentcal",
    label: "Calendar",
    placeholder: "Month, active products, planned email campaigns…",
    multiline: false,
  },
] as const;

const ECOM_SECONDARY = [
  {
    id: "emailaudit",
    label: "Email Audit",
    placeholder: "Describe your email flows or paste content…",
    multiline: true,
  },
  {
    id: "reel",
    label: "Reel Script",
    placeholder: "Footage desc, platform (Reels/TikTok), tone, any key moment…",
    multiline: true,
  },
] as const;

// ── Status bar ─────────────────────────────────────────────────

function StatusBar({ health }: { health: HealthStatus }) {
  if (health.state === "checking") {
    return (
      <span style={{ color: "var(--text-faint)", fontSize: "11px" }}>
        ● checking
        <span className="dot-1">.</span>
        <span className="dot-2">.</span>
        <span className="dot-3">.</span>
      </span>
    );
  }

  if (health.state === "online") {
    // Parse AI status string into compact display
    const ai = health.ai
      .replace(/✅/g, "ok")
      .replace(/❌[^|]*/g, "–")
      .replace(/⚠️[^|]*/g, "⚠")
      .replace(/\s+/g, " ")
      .trim();

    return (
      <span style={{ color: "var(--green)", fontSize: "11px", letterSpacing: "0.02em" }}>
        ● tailscale:connected{" "}
        <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>| {ai}</span>
      </span>
    );
  }

  return (
    <span style={{ color: "var(--red)", fontSize: "11px" }}>
      ● {health.reason}
    </span>
  );
}

// ── Loading indicator ──────────────────────────────────────────

function Thinking({ command }: { command: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--amber)",
        borderRadius: "4px",
        fontSize: "12px",
        color: "var(--text-dim)",
        background: "var(--amber-glow)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span style={{ color: "var(--amber)" }}>{"$"}</span>
      <span>/{command}</span>
      <span style={{ color: "var(--text-faint)" }}>executing</span>
      <span style={{ color: "var(--amber)" }}>
        <span className="dot-1">·</span>
        <span className="dot-2">·</span>
        <span className="dot-3">·</span>
      </span>
    </div>
  );
}

// ── Command input field ────────────────────────────────────────

function CmdField({
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
    if (!value.trim() || loading) return;
    onRun(command, value.trim());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label className="cmd-label">{label}</label>
      <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="cmd-input"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder={placeholder}
            className="cmd-input"
          />
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className="run-btn"
          style={{ marginTop: multiline ? "0" : "0", flexShrink: 0 }}
        >
          run
        </button>
      </div>
    </div>
  );
}

// ── Grid of icon-less buttons ──────────────────────────────────

function CmdGrid({
  items,
  onRun,
  loading,
}: {
  items: [string, string][];
  onRun: RunFn;
  loading: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
      {items.map(([label, cmd]) => (
        <button
          key={cmd}
          onClick={() => onRun(cmd)}
          disabled={loading}
          style={{
            padding: "8px",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            background: "transparent",
            color: "var(--text-dim)",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "var(--font-terminal)",
            transition: "all 0.12s",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "var(--border-2)";
            (e.target as HTMLButtonElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.target as HTMLButtonElement).style.color = "var(--text-dim)";
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Ecommerce Tab Panel ────────────────────────────────────────

function EcomPanel({ onRun, loading }: { onRun: RunFn; loading: boolean }) {
  const [activeTab, setActiveTab] = useState<string>("pdp");
  const [showSecondary, setShowSecondary] = useState(false);

  const activeConfig = ECOM_PRIMARY.find((t) => t.id === activeTab)!;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      {/* Tab strip */}
      <div className="tab-strip" style={{ background: "var(--surface)" }}>
        {ECOM_PRIMARY.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowSecondary(!showSecondary)}
          className="tab-btn"
          style={{ color: showSecondary ? "var(--text-dim)" : "var(--text-faint)", fontSize: "11px" }}
        >
          {showSecondary ? "▲ less" : "▼ more"}
        </button>
      </div>

      {/* Active tab content */}
      <div style={{ padding: "12px 14px", background: "var(--surface)" }}>
        <CmdField
          key={activeConfig.id}
          label={activeConfig.label}
          placeholder={activeConfig.placeholder}
          command={activeConfig.id}
          multiline={activeConfig.multiline}
          onRun={onRun}
          loading={loading}
        />
      </div>

      {/* Secondary tools (Email/Reel) */}
      {showSecondary && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "12px 14px",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-faint)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            secondary tools
          </div>
          {ECOM_SECONDARY.map((tool) => (
            <CmdField
              key={tool.id}
              label={tool.label}
              placeholder={tool.placeholder}
              command={tool.id}
              multiline={tool.multiline}
              onRun={onRun}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Universal command ──────────────────────────────────────────

function UniversalCmd({ onRun, loading }: { onRun: RunFn; loading: boolean }) {
  const [input, setInput] = useState("");

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const parts = trimmed.replace(/^\//, "").split(/\s+/);
    onRun(parts[0].toLowerCase(), parts.slice(1).join(" "));
    setInput("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-faint)",
          letterSpacing: "0.06em",
        }}
      >
        {"// any command: /kyn [post]  /learn react  /idea [desc]"}
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "0 10px",
            gap: "6px",
          }}
        >
          <span style={{ color: "var(--amber)", fontSize: "12px", flexShrink: 0 }}>$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="/today  /pdp Sonny Hat  /gaps"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontSize: "12px",
              fontFamily: "var(--font-terminal)",
              padding: "8px 0",
            }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="run-btn"
        >
          ↵
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function Page() {
  const [health, setHealth] = useState<HealthStatus>({ state: "checking" });
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCommand, setActiveCommand] = useState("");
  const mobileOutputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkHealth().then(setHealth);
    const id = setInterval(() => checkHealth().then(setHealth), 30_000);
    return () => clearInterval(id);
  }, []);

  // On mobile, scroll to output
  useEffect(() => {
    if (output && mobileOutputRef.current) {
      setTimeout(() => {
        mobileOutputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
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
      setOutput(`error: ${msg}`);
    } finally {
      setLoading(false);
      setActiveCommand("");
    }
  }, []);

  // ── Controls panel (shared between mobile and desktop left col)
  const controlsPanel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
          }}
        >
          <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>
            lebron
          </span>
          <span style={{ color: "var(--text-faint)" }}>@</span>
          <span style={{ color: "var(--amber)", fontSize: "12px", fontWeight: 600 }}>
            ljros
          </span>
          <span style={{ color: "var(--text-faint)" }}>:~$</span>
          <span
            className="cursor-blink"
            style={{
              display: "inline-block",
              width: "8px",
              height: "14px",
              background: "var(--amber)",
              verticalAlign: "middle",
              marginLeft: "2px",
            }}
          />
        </div>
        <StatusBar health={health} />
      </div>

      {/* Scrollable controls body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* ── Quick actions ── */}
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-faint)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "7px",
            }}
          >
            quick
          </div>
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "4px",
              scrollbarWidth: "none",
            }}
          >
            {(
              [
                ["today", "today"],
                ["overview", "overview"],
                ["applications", "apps"],
                ["hours", "hours"],
                ["next", "next"],
                ["morning", "brief"],
                ["free", "free"],
              ] as [string, string][]
            ).map(([cmd, label]) => (
              <button
                key={cmd}
                onClick={() => run(cmd)}
                disabled={loading}
                className="pill"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)" }} />

        {/* ── Ecommerce AI Team ── */}
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--amber)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "7px",
              opacity: 0.8,
            }}
          >
            {"// lazysun"}
          </div>
          <EcomPanel onRun={run} loading={loading} />
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)" }} />

        {/* ── Quick reply ── */}
        <Section title="reply" prefix="cmd">
          <CmdField
            label="message to reply to"
            placeholder="Hi Lebron, ready for Monday? — Jordan"
            command="reply"
            multiline={true}
            onRun={run}
            loading={loading}
          />
        </Section>

        {/* ── Career ── */}
        <Section title="career" prefix="cmd">
          <CmdField
            label="kyn score"
            placeholder="Paste full job post…"
            command="kyn"
            multiline={true}
            onRun={run}
            loading={loading}
          />
          <CmdField
            label="analyze + cover letter"
            placeholder="Job URL or post…"
            command="analyze"
            onRun={run}
            loading={loading}
          />
          <CmdGrid
            items={[
              ["follow-ups", "followup"],
              ["stats", "stats"],
              ["projects", "projects"],
              ["gaps", "gaps"],
            ]}
            onRun={run}
            loading={loading}
          />
        </Section>

        {/* ── Planning ── */}
        <Section title="planning" prefix="cmd">
          <CmdGrid
            items={[
              ["morning brief", "morning"],
              ["week plan", "weekplan"],
              ["sprint", "sprint"],
              ["free slots", "free"],
            ]}
            onRun={run}
            loading={loading}
          />
          <CmdField
            label="session plan"
            placeholder="2h high  (hours + energy)"
            command="plan"
            onRun={run}
            loading={loading}
          />
        </Section>

        {/* ── Universal command ── */}
        <Section title="terminal" prefix="$">
          <UniversalCmd onRun={run} loading={loading} />
        </Section>

        {/* ── Loading indicator (mobile only — desktop shows in right pane) ── */}
        {loading && (
          <div className="lg:hidden">
            <Thinking command={activeCommand} />
          </div>
        )}

        {/* ── Mobile output ── */}
        <div className="lg:hidden" ref={mobileOutputRef}>
          {(output || error) && (
            <div style={{ minHeight: "300px" }}>
              <OutputArea
                output={output ?? ""}
                error={error}
                command={activeCommand || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile layout ── */}
      <div
        className="lg:hidden"
        style={{ minHeight: "100vh" }}
      >
        {controlsPanel}
      </div>

      {/* ── Desktop layout: two-column ── */}
      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: "420px 1fr",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Left: controls */}
        <div
          style={{
            borderRight: "1px solid var(--border)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {controlsPanel}
        </div>

        {/* Right: output (persistent) */}
        <div style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ padding: "16px" }}>
              <Thinking command={activeCommand} />
            </div>
          ) : (
            <OutputArea
              output={output ?? ""}
              error={error}
              command={activeCommand || undefined}
            />
          )}
        </div>
      </div>
    </>
  );
}
