const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://100.116.49.59:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export async function runCommand(
  command: string,
  args: string = ""
): Promise<string> {
  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ command, args }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `HTTP ${res.status}`
    );
  }

  const data = (await res.json()) as { output: string };
  return data.output;
}

// Richer health status — distinguishes timeout vs network error
export type HealthStatus =
  | { state: "checking" }
  | { state: "online"; ai: string }
  | { state: "offline"; reason: string };

export async function checkHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as { status: string; ai: string };
      return { state: "online", ai: data.ai ?? "" };
    }
    return { state: "offline", reason: `server error ${res.status}` };
  } catch (err) {
    const isTimeout =
      err instanceof DOMException &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    if (isTimeout) {
      return { state: "offline", reason: "timeout — is Tailscale on?" };
    }
    return {
      state: "offline",
      reason: "unreachable — is run_all.py running?",
    };
  }
}
