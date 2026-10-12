import type { ZodSchema } from "zod";

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
  const res = await client.messages.create({
    model: MODELS[req.role],
    max_tokens: req.maxTokens ?? 1500,
    system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: req.user }],
  });
  return res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
}

/** Calls the model (or the mock), validates JSON against the schema, retries once on failure. */
export async function callJson<T>(tag: string, req: AiRequest, schema: ZodSchema<T>, budget: AiBudget): Promise<T> {
  if (budget.used >= budget.limit) {
    throw new Error(`AI budget exhausted: ${budget.used}/${budget.limit} calls today`);
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    budget.used++;
    const raw = isMock() ? mockProvider(tag, req) : JSON.parse(stripFences(await callAnthropic(req)));
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    if (attempt === 1) throw new Error(`schema error for ${tag}: ${parsed.error.message}`);
  }
  throw new Error("unreachable");
}
