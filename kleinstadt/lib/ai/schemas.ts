import { z } from "zod";

export const PlanSchema = z.object({
  plan: z.array(z.object({
    hour: z.number().int().min(6).max(23),
    location_id: z.string(),
    activity: z.string().min(1),
  })).min(1),
});
export type PlanResponse = z.infer<typeof PlanSchema>;

export const ConversationSchema = z.object({
  turns: z.array(z.object({ speaker: z.string(), text: z.string().min(1) })).min(2).max(8),
  memories: z.array(z.object({
    resident_id: z.string(),
    content: z.string().min(1),
    importance: z.number().int().min(1).max(10),
  })).length(2),
  relationship_deltas: z.array(z.object({
    from: z.string(),
    to: z.string(),
    delta: z.number().int().min(-30).max(30),
    reason: z.string(),
  })).length(2),
});
export type ConversationResponse = z.infer<typeof ConversationSchema>;

export const ReflectionSchema = z.object({
  insights: z.array(z.object({
    content: z.string().min(1),
    importance: z.number().int().min(6).max(9),
    evidence_memory_ids: z.array(z.number().int()),
  })).min(1).max(3),
});
export type ReflectionResponse = z.infer<typeof ReflectionSchema>;

export const FoundingSchema = z.object({
  found: z.boolean(),
  name: z.string().min(1).max(40),
  type: z.enum(["shop", "cafe"]),
  description: z.string().max(200),
  price: z.number().min(1).max(60),
});
export type FoundingResponse = z.infer<typeof FoundingSchema>;

export const NewspaperSchema = z.object({
  articles: z.array(z.object({
    headline: z.string().min(3).max(120),
    teaser: z.string().min(3).max(300),
    body: z.string().min(40),
    section: z.enum(["Lokales", "Wirtschaft", "Gesellschaft", "Wetter", "Klatsch"]),
    event_ids: z.array(z.number().int()).min(1),
    mentioned_resident_ids: z.array(z.string()),
  })).min(1).max(5),
});
export type NewspaperResponse = z.infer<typeof NewspaperSchema>;

const residentProfile = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/),
  name: z.string().min(2), age: z.number().int().min(6).max(99), job: z.string(), home_id: z.string(), work_id: z.string().nullable(),
  personality: z.string(), goals: z.array(z.string()).min(1), balance: z.number().min(0), daily_wage: z.number().min(0), employer_id: z.string().nullable(),
  relationships: z.array(z.object({ other_id: z.string(), score: z.number().int().min(-100).max(100), label: z.string() })).default([]),
  memories: z.array(z.object({ content: z.string(), importance: z.number().int().min(1).max(10) })).min(1).max(3),
});

export const OperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("close_location"), location_id: z.string(), reason: z.string() }),
  z.object({ op: z.literal("open_location"), name: z.string(), type: z.enum(["shop", "cafe", "park", "square", "work"]), owner_id: z.string().nullable().default(null), price: z.number().min(0).default(0), daily_cost: z.number().min(0).default(0) }),
  z.object({ op: z.literal("add_resident"), resident: residentProfile }),
  z.object({ op: z.literal("remove_resident"), resident_id: z.string(), reason: z.string() }),
  z.object({ op: z.literal("set_weather"), weather: z.enum(["sonnig", "bewölkt", "Regen"]), days: z.number().int().min(1).max(14) }),
  z.object({ op: z.literal("transfer_money"), from_id: z.string(), to_id: z.string(), amount: z.number().positive(), reason: z.string() }),
  z.object({ op: z.literal("set_relationship"), from_id: z.string(), to_id: z.string(), delta: z.number().int().min(-100).max(100), reason: z.string() }),
  z.object({ op: z.literal("add_memory"), resident_id: z.string(), content: z.string().min(3), importance: z.number().int().min(1).max(10) }),
]);
export type Operation = z.infer<typeof OperationSchema>;

export const DirectorSchema = z.object({
  operations: z.array(OperationSchema).max(20),
  summary: z.string().min(3),
});
export type DirectorResponse = z.infer<typeof DirectorSchema>;
