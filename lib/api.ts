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

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
