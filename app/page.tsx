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

// ── Types ──────────────────────────────────────────────────────────────

type Mode = "today" | "lazysun" | "career" | "system";
type RunFn = (command: string, args?: string) => Promise<void>;

// ── Status bar ─────────────────────────────────────────────────────────

function StatusBar({ health }: { health: HealthStatus }) {
  if (health.state === "checking") {
    return (
      <span style={{ color: "var(--text-faint)", fontSize: "11px" }}>
        <span className="dot-1">.</span>
        <span className="dot-2">.</span>
        <span className="dot-3">.</span>
        {" connecting"}
      </span>
    );
  }
  if (health.state === "online") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
        <span
          className="status-pulse"
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--green)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span style={{ color: "var(--green)" }}>tailscale:connected</span>
        {health.ai && (
          <span style={{ color: "var(--text-faint)" }}> · {health.ai}</span>
        )}
      </span>
    );
  }
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "var(--red)",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span style={{ color: "var(--red)" }}>offline</span>
      <span style={{ color: "var(--text-faint)" }}> · {health.reason}</span>
    </span>
  );
}

// ── Thinking ───────────────────────────────────────────────────────────

function Thinking({ command }: { command: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "var(--amber)",
        fontSize: "12px",
        padding: "6px 0",
      }}
    >
      <span style={{ color: "var(--text-faint)" }}>{"$ "}</span>
      <span>{command}</span>
      <span className="dot-1" style={{ color: "var(--text-dim)" }}>.</span>
      <span className="dot-2" style={{ color: "var(--text-dim)" }}>.</span>
      <span className="dot-3" style={{ color: "var(--text-dim)" }}>.</span>
    </div>
  );
}

// ── CmdField ───────────────────────────────────────────────────────────

interface CmdFieldProps {
  label: string;
  placeholder: string;
  command: string;
  multiline?: boolean;
  rows?: number;
  onRun: RunFn;
  loading: boolean;
  btnLabel?: string;
  transformArgs?: (args: string) => string;
}

function CmdField({
  label,
  placeholder,
  command,
  multiline = false,
  rows = 3,
  onRun,
  loading,
  btnLabel = "run →",
  transformArgs,
}: CmdFieldProps) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim() || loading) return;
    const args = transformArgs ? transformArgs(value.trim()) : value.trim();
    onRun(command, args);
    setValue("");
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey && !multiline) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Enter" && e.ctrlKey && multiline) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label className="cmd-label">{label}</label>
      <div style={{ display: "flex", gap: "6px", alignItems: multiline ? "flex-end" : "center" }}>
        {multiline ? (
          <textarea
            className="cmd-input"
            placeholder={placeholder}
            value={value}
            rows={rows}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
            onKeyDown={onKey}
          />
        ) : (
          <input
            type="text"
            className="cmd-input"
            placeholder={placeholder}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            onKeyDown={onKey}
          />
        )}
        <button className="run-btn" onClick={submit} disabled={loading || !value.trim()}>
          {btnLabel}
        </button>
      </div>
      {multiline && (
        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>
          ctrl+enter to run
        </span>
      )}
    </div>
  );
}

// ── CmdGrid ────────────────────────────────────────────────────────────

interface PillItem {
  label: string;
  command: string;
  args?: string;
}

function CmdGrid({ items, onRun, loading }: { items: PillItem[]; onRun: RunFn; loading: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {items.map((item) => (
        <button
          key={item.command + (item.args ?? "")}
          className="pill"
          onClick={() => onRun(item.command, item.args)}
          disabled={loading}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── Universal command input ────────────────────────────────────────────

function UniversalCmd({ onRun, loading }: { onRun: RunFn; loading: boolean }) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim() || loading) return;
    const parts = value.trim().replace(/^\//, "").split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1).join(" ");
    onRun(command, args);
    setValue("");
  }

  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <span style={{ color: "var(--amber)", flexShrink: 0, fontSize: "13px" }}>{"$"}</span>
      <input
        type="text"
        className="cmd-input"
        placeholder="/command args..."
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
        }}
      />
      <button className="run-btn" onClick={submit} disabled={loading || !value.trim()}>
        exec
      </button>
    </div>
  );
}

// ── MODE: TODAY ────────────────────────────────────────────────────────

function TodayMode({
  onRun,
  loading,
  lastAutoRun,
}: {
  onRun: RunFn;
  loading: boolean;
  lastAutoRun: Date | null;
}) {
  const [adjustVal, setAdjustVal] = useState("");

  function submitAdjust() {
    if (!adjustVal.trim() || loading) return;
    onRun("adjust", adjustVal.trim());
    setAdjustVal("");
  }

  const timeStr = lastAutoRun
    ? lastAutoRun.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="mode-enter" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Schedule header */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span className="cmd-label" style={{ marginBottom: 0 }}>schedule</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {timeStr && (
              <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>
                loaded {timeStr}
              </span>
            )}
            <button
              className="inline-action"
              onClick={() => onRun("today")}
              disabled={loading}
            >
              ↻ refresh
            </button>
          </div>
        </div>
        <p style={{ fontSize: "11px", color: "var(--text-faint)", margin: 0, lineHeight: 1.6 }}>
          /today auto-loads on mount · output shown on the right
        </p>
      </div>

      {/* Adjust input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label className="cmd-label">adjust</label>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            className="cmd-input"
            placeholder='what changed? e.g. "commute until noon"'
            value={adjustVal}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAdjustVal(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") { e.preventDefault(); submitAdjust(); }
            }}
          />
          <button
            className="run-btn"
            onClick={submitAdjust}
            disabled={loading || !adjustVal.trim()}
          >
            adjust →
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label className="cmd-label">quick</label>
        <CmdGrid
          onRun={onRun}
          loading={loading}
          items={[
            { label: "next action", command: "next" },
            { label: "morning brief", command: "morning" },
            { label: "free slots", command: "free" },
            { label: "3-day cal", command: "schedule", args: "3" },
            { label: "week plan", command: "weekplan" },
            { label: "overview", command: "overview" },
          ]}
        />
      </div>
    </div>
  );
}

// ── MODE: LAZYSUN ──────────────────────────────────────────────────────

const LAZYSUN_TABS = [
  { key: "pdp",     label: "PDP" },
  { key: "tiktok",  label: "TikTok" },
  { key: "meta",    label: "Meta" },
  { key: "cal",     label: "Calendar" },
  { key: "email",   label: "Email" },
  { key: "reel",    label: "Reel" },
  { key: "photo",   label: "Photo QA" },
] as const;

type LazysunTab = (typeof LAZYSUN_TABS)[number]["key"];

function LazysunMode({
  onRun,
  loading,
  hasOutput,
}: {
  onRun: RunFn;
  loading: boolean;
  hasOutput: boolean;
}) {
  const [tab, setTab] = useState<LazysunTab>("pdp");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackVal, setFeedbackVal] = useState("");
  const [logDone, setLogDone] = useState(false);

  // Reset log/feedback UI when new output arrives
  const prevHasOutput = useRef(hasOutput);
  useEffect(() => {
    if (hasOutput && !prevHasOutput.current) {
      setLogDone(false);
      setFeedbackOpen(false);
      setFeedbackVal("");
    }
    prevHasOutput.current = hasOutput;
  }, [hasOutput]);

  async function handleLog() {
    await onRun("log");
    setLogDone(true);
  }

  async function handleFeedback() {
    if (!feedbackVal.trim()) return;
    await onRun("feedback", feedbackVal.trim());
    setFeedbackOpen(false);
    setFeedbackVal("");
  }

  return (
    <div className="mode-enter" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Tab bar */}
      <div className="tab-strip">
        {LAZYSUN_TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "pdp" && (
        <div key="pdp" className="mode-enter" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <CmdField
            label="product detail page"
            placeholder="Sonny Corduroy Hat, Moss Green, $98, 100% cotton, made in Portugal..."
            command="pdp"
            multiline
            rows={4}
            onRun={onRun}
            loading={loading}
            btnLabel="generate →"
          />
          <CmdField
            label="revision"
            placeholder="what to change from the last version..."
            command="pdp"
            onRun={onRun}
            loading={loading}
            btnLabel="revise →"
            transformArgs={(v) => `revision: ${v}`}
          />
        </div>
      )}

      {tab === "tiktok" && (
        <div key="tiktok" className="mode-enter">
          <CmdField
            label="tiktok shop listing"
            placeholder="product name, category, key details, price..."
            command="tiktok"
            multiline
            rows={3}
            onRun={onRun}
            loading={loading}
            btnLabel="generate →"
          />
        </div>
      )}

      {tab === "meta" && (
        <div key="meta" className="mode-enter">
          <CmdField
            label="meta ads creative"
            placeholder="product info, target audience, offer/price, AOV target..."
            command="meta"
            multiline
            rows={3}
            onRun={onRun}
            loading={loading}
            btnLabel="generate →"
          />
        </div>
      )}

      {tab === "cal" && (
        <div key="cal" className="mode-enter">
          <CmdField
            label="content calendar (4-week)"
            placeholder="brief: product launches, promos, themes this month..."
            command="contentcal"
            multiline
            rows={3}
            onRun={onRun}
            loading={loading}
            btnLabel="generate →"
          />
        </div>
      )}

      {tab === "email" && (
        <div key="email" className="mode-enter">
          <CmdField
            label="email flow audit"
            placeholder="flow type + context (e.g. welcome flow, LazySun hats $98)..."
            command="emailaudit"
            multiline
            rows={3}
            onRun={onRun}
            loading={loading}
            btnLabel="audit →"
          />
        </div>
      )}

      {tab === "reel" && (
        <div key="reel" className="mode-enter">
          <CmdField
            label="reel script"
            placeholder="product + hook concept + target length (e.g. Sonny Hat, 30s, morning ritual angle)..."
            command="reel"
            multiline
            rows={3}
            onRun={onRun}
            loading={loading}
            btnLabel="script →"
          />
        </div>
      )}

      {tab === "photo" && (
        <div key="photo" className="mode-enter" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <CmdField
            label="photo QA via URL"
            placeholder="image URL · optional context (e.g. hoodie-acorn hero shot)..."
            command="photoreview"
            onRun={onRun}
            loading={loading}
            btnLabel="review →"
          />
          <div className="notice">
            Send a photo directly in Telegram for instant Gemini vision QA.
            This URL input works as a desktop alternative when you have the image link.
          </div>
        </div>
      )}

      {/* Log / Feedback — shown after output from this mode */}
      {hasOutput && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: "var(--text-faint)", marginRight: "2px" }}>
              output ready:
            </span>
            <button
              className="inline-action"
              onClick={handleLog}
              disabled={loading || logDone}
            >
              {logDone ? "✓ logged" : "↓ log this"}
            </button>
            <button
              className="inline-action"
              onClick={() => setFeedbackOpen(!feedbackOpen)}
              disabled={loading}
            >
              💬 add feedback
            </button>
          </div>

          {feedbackOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <textarea
                className="cmd-input"
                placeholder="Jordan's notes / what to keep or change for next time..."
                value={feedbackVal}
                rows={3}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFeedbackVal(e.target.value)}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="run-btn"
                  onClick={handleFeedback}
                  disabled={loading || !feedbackVal.trim()}
                  style={{ fontSize: "11px", padding: "5px 12px" }}
                >
                  save →
                </button>
                <button
                  className="inline-action"
                  onClick={() => { setFeedbackOpen(false); setFeedbackVal(""); }}
                >
                  cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MODE: CAREER ───────────────────────────────────────────────────────

function ManualTrack({ onRun, loading }: { onRun: RunFn; loading: boolean }) {
  const [platform, setPlatform] = useState("");
  const [employer, setEmployer] = useState("");
  const [role, setRole] = useState("");

  function submit() {
    if (!employer.trim() || !role.trim() || loading) return;
    const args = `${platform.trim() || "direct"} ${employer.trim()} ${role.trim()}`;
    onRun("track", args);
    setPlatform("");
    setEmployer("");
    setRole("");
  }

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      <input
        type="text"
        className="cmd-input"
        placeholder="platform"
        value={platform}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setPlatform(e.target.value)}
        style={{ width: "100px", flexShrink: 0 }}
      />
      <input
        type="text"
        className="cmd-input"
        placeholder="employer"
        value={employer}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmployer(e.target.value)}
        style={{ flex: 1, minWidth: "100px" }}
      />
      <input
        type="text"
        className="cmd-input"
        placeholder="role"
        value={role}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setRole(e.target.value)}
        style={{ flex: 1, minWidth: "100px" }}
      />
      <button
        className="run-btn"
        onClick={submit}
        disabled={loading || !employer.trim() || !role.trim()}
      >
        track →
      </button>
    </div>
  );
}

function CareerMode({ onRun, loading }: { onRun: RunFn; loading: boolean }) {
  return (
    <div className="mode-enter" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Pipeline overview */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label className="cmd-label">pipeline</label>
        <CmdGrid
          onRun={onRun}
          loading={loading}
          items={[
            { label: "follow-ups due", command: "followup" },
            { label: "applications", command: "applications" },
            { label: "stats", command: "stats" },
          ]}
        />
      </div>

      {/* Analyze — primary action */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <CmdField
          label="analyze job"
          placeholder="paste job URL or full job description text..."
          command="analyze"
          multiline
          rows={4}
          onRun={onRun}
          loading={loading}
          btnLabel="analyze →"
        />
        <div className="notice">
          /apply with YES/NO/EDIT confirm gate is Telegram-only (stateful conversation flow).
          /analyze is used here — scores via KYN, generates cover letter, and auto-logs to Sheets.
        </div>
      </div>

      {/* KYN quick score */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <CmdField
          label="kyn score only"
          placeholder="paste job post for quick rate/fit/employer score (no AI)..."
          command="kyn"
          onRun={onRun}
          loading={loading}
          btnLabel="score →"
        />
        <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>
          pure KYN engine · rate 40pt · employer 30pt · fit 30pt · pakwan -20pt
        </span>
      </div>

      {/* Manual track */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label className="cmd-label">track manually</label>
        <ManualTrack onRun={onRun} loading={loading} />
      </div>
    </div>
  );
}

// ── MODE: SYSTEM ───────────────────────────────────────────────────────

function SystemMode({ onRun, loading }: { onRun: RunFn; loading: boolean }) {
  return (
    <div className="mode-enter" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Section title="reply" defaultOpen>
        <CmdField
          label="draft reply"
          placeholder="paste the message you need to reply to..."
          command="reply"
          multiline
          rows={3}
          onRun={onRun}
          loading={loading}
          btnLabel="draft →"
        />
      </Section>

      <Section title="skills + learning">
        <CmdGrid
          onRun={onRun}
          loading={loading}
          items={[
            { label: "all skills", command: "skills" },
            { label: "top gaps", command: "gaps" },
            { label: "view log", command: "logshow" },
          ]}
        />
        <CmdField
          label="learn skill"
          placeholder="skill name (e.g. Meta Ads, Klaviyo)..."
          command="learn"
          onRun={onRun}
          loading={loading}
          btnLabel="learn →"
        />
        <CmdField
          label="roadmap"
          placeholder="weeks or topic (e.g. 4, or email marketing)..."
          command="roadmap"
          onRun={onRun}
          loading={loading}
          btnLabel="plan →"
        />
      </Section>

      <Section title="profile + projects">
        <CmdGrid
          onRun={onRun}
          loading={loading}
          items={[
            { label: "my profile", command: "me" },
            { label: "projects", command: "projects" },
            { label: "sprint board", command: "sprint" },
          ]}
        />
        <CmdField
          label="update project"
          placeholder="[project] [field] [value]"
          command="update"
          onRun={onRun}
          loading={loading}
          btnLabel="update →"
        />
        <CmdField
          label="mark done"
          placeholder="[project] [new next task]"
          command="done"
          onRun={onRun}
          loading={loading}
          btnLabel="done →"
        />
      </Section>

      <Section title="build ideas">
        <CmdField
          label="capture idea"
          placeholder="rough description — generates a Claude Code ready spec..."
          command="idea"
          multiline
          rows={3}
          onRun={onRun}
          loading={loading}
          btnLabel="spec →"
        />
        <CmdGrid
          onRun={onRun}
          loading={loading}
          items={[{ label: "all ideas", command: "ideas" }]}
        />
      </Section>

      <Section title="time tracking">
        <CmdField
          label="log time"
          placeholder='description + duration (e.g. "PDP for Sonny Hat 45min")...'
          command="toggl"
          onRun={onRun}
          loading={loading}
          btnLabel="log →"
        />
        <CmdGrid
          onRun={onRun}
          loading={loading}
          items={[
            { label: "hours this week", command: "hours" },
            { label: "jordan report", command: "togglreport" },
          ]}
        />
      </Section>

      <Section title="terminal">
        <UniversalCmd onRun={onRun} loading={loading} />
      </Section>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

const MODES: { key: Mode; label: string }[] = [
  { key: "today",   label: "today" },
  { key: "lazysun", label: "lazysun" },
  { key: "career",  label: "career" },
  { key: "system",  label: "system" },
];

export default function Page() {
  const [mode, setMode] = useState<Mode>("today");
  const [health, setHealth] = useState<HealthStatus>({ state: "checking" });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [outputMode, setOutputMode] = useState<Mode | null>(null);
  const [lastAutoRun, setLastAutoRun] = useState<Date | null>(null);

  const hasAutoRun = useRef(false);
  const activeModeRef = useRef<Mode>(mode);
  useEffect(() => { activeModeRef.current = mode; }, [mode]);

  const run = useCallback(async (command: string, args: string = "") => {
    setLoading(true);
    setActiveCommand(command);
    setError(null);
    const currentMode = activeModeRef.current;
    try {
      const result = await runCommand(command, args);
      setOutput(result);
      setOutputMode(currentMode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setOutput("");
      setOutputMode(null);
    } finally {
      setLoading(false);
      setActiveCommand(null);
    }
  }, []);

  // Health polling + auto-run /today on mount
  useEffect(() => {
    checkHealth().then((h) => {
      setHealth(h);
      if (h.state === "online" && !hasAutoRun.current) {
        hasAutoRun.current = true;
        run("today").then(() => setLastAutoRun(new Date()));
      }
    });
    const id = setInterval(() => checkHealth().then(setHealth), 30_000);
    return () => clearInterval(id);
  }, [run]);

  async function runWithTracking(command: string, args = "") {
    await run(command, args);
    if (command === "today") setLastAutoRun(new Date());
  }

  const hasLazysunOutput = outputMode === "lazysun" && !!output;

  const outputLabel = activeCommand
    ? activeCommand
    : outputMode
    ? `${outputMode} · last run`
    : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* ── Full-width header ── */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px 8px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "var(--font-terminal)",
                fontSize: "13px",
                color: "var(--text)",
                letterSpacing: "0.02em",
              }}
            >
              <span style={{ color: "var(--amber)" }}>lebron</span>
              <span style={{ color: "var(--text-faint)" }}>@ljros</span>
              <span style={{ color: "var(--text-dim)" }}>:~$ </span>
              <span
                className="cursor-blink"
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "13px",
                  background: "var(--amber)",
                  verticalAlign: "text-bottom",
                  marginLeft: "2px",
                }}
              />
            </span>
          </div>
          <StatusBar health={health} />
        </div>

        {/* Mode nav */}
        <div className="mode-nav" style={{ paddingLeft: "8px" }}>
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`mode-nav-btn ${mode === m.key ? "active" : ""}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
        }}
      >
        {/* Left: mode panel */}
        <div
          className="left-panel"
          style={{
            width: "420px",
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Loading indicator */}
          {loading && activeCommand && (
            <div style={{ padding: "8px 16px 0", flexShrink: 0 }}>
              <Thinking command={`/${activeCommand}`} />
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {mode === "today" && (
              <TodayMode
                onRun={runWithTracking}
                loading={loading}
                lastAutoRun={lastAutoRun}
              />
            )}
            {mode === "lazysun" && (
              <LazysunMode
                onRun={run}
                loading={loading}
                hasOutput={hasLazysunOutput}
              />
            )}
            {mode === "career" && (
              <CareerMode onRun={run} loading={loading} />
            )}
            {mode === "system" && (
              <SystemMode onRun={run} loading={loading} />
            )}
          </div>
        </div>

        {/* Right: persistent output pane */}
        <div
          className="right-panel"
          style={{ flex: 1, overflow: "hidden", minWidth: 0 }}
        >
          <OutputArea
            output={output}
            error={error ?? ""}
            command={outputLabel}
          />
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          .left-panel {
            width: 100% !important;
            border-right: none !important;
            overflow: visible !important;
            height: auto !important;
            flex-shrink: 0 !important;
          }
          .right-panel {
            min-height: 300px;
            flex-shrink: 0 !important;
            border-top: 1px solid var(--border);
          }
          div[style*="overflow: hidden"][style*="display: flex"] {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
