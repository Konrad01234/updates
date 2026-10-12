import type { ZodType, ZodTypeDef } from "zod";

export const MODELS = {
  resident: "claude-haiku-5-5",
  director: "claude-fable-5-1",
} as const;

export type ModelRole = keyof typeof MODELS;

export interface AiRequest {
  role: ModelRole;
  system: string;
  user: string;
  maxTokens?: number;
  /** Phase 4: receives text as it streams in (raw JSON fragments). */
  onToken?: (text: string) => void;
}

export interface AiBudget {
  used: number;
  limit: number;
}

export const isMock = () => process.env.MOCK_AI === "true" || !process.env.ANTHROPIC_API_KEY;

/** Mock answers are keyed by a tag the caller passes, so dry runs are deterministic. */
export type MockProvider = (tag: string, req: AiRequest) => unknown;
let mockProvider: MockProvider = () => { throw new Error("no mock provider registered"); };
export const setMockProvider = (p: MockProvider) => { mockProvider = p; };

function stripFences(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

async function callAnthropic(req: AiRequest): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const params = {
    model: MODELS[req.role],
    max_tokens: req.maxTokens ?? 1500,
    system: [{ type: "text" as const, text: req.system, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: req.user }],
  };
  if (!req.onToken) {
    const res = await client.messages.create(params);
    return res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  }
  const stream = client.messages.stream(params);
  let full = "";
  stream.on("text", (t) => { full += t; req.onToken!(t); });
  await stream.finalMessage();
  return full;
}

/** Turns streamed JSON fragments into complete "speaker: text" lines as soon as each turn closes. */
export function turnExtractor(onTurn: (speaker: string, text: string) => void) {
  let buf = "", seen = 0;
  return (chunk: string) => {
    buf += chunk;
    const re = /"speaker":\s*"([^"]+)",\s*"text":\s*"((?:[^"\\]|\\.)*)"/g;
    let m: RegExpExecArray | null, i = 0;
    while ((m = re.exec(buf))) { if (i++ >= seen) { seen++; onTurn(m[1], m[2].replace(/\\"/g, '"')); } }
  };
}

/** Calls the model (or the mock), validates JSON against the schema, retries once on failure. */
export async function callJson<T>(tag: string, req: AiRequest, schema: ZodType<T, ZodTypeDef, unknown>, budget: AiBudget): Promise<T> {
  if (budget.used >= budget.limit) {
    throw new Error(`AI budget exhausted: ${budget.used}/${budget.limit} calls today`);
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    budget.used++;
    let raw: unknown;
    if (isMock()) {
      raw = mockProvider(tag, req);
      if (req.onToken) for (const piece of JSON.stringify(raw).match(/.{1,40}/gs) ?? []) req.onToken(piece);
    } else {
      raw = JSON.parse(stripFences(await callAnthropic(req)));
    }
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    if (attempt === 1) throw new Error(`schema error for ${tag}: ${parsed.error.message}`);
  }
  throw new Error("unreachable");
}
