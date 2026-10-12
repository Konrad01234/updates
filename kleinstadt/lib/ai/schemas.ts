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
