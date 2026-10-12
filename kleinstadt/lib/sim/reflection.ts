import type { Store } from "@/lib/db/store";
import type { Resident } from "@/lib/types";
import { callJson, type AiBudget } from "@/lib/ai/client";
import { ReflectionSchema } from "@/lib/ai/schemas";
import { reflectionPrompt } from "@/lib/ai/prompts/reflection";
import { mostImportant, remember } from "./memory";
import { DAY_END } from "@/lib/types";

export async function reflect(store: Store, r: Resident, day: number, budget: AiBudget): Promise<void> {
  const all = await store.listMemories(r.id);
  const top = mostImportant(all, day, 3, 20);
  if (top.length === 0) return;
  const res = await callJson("reflection", { role: "director", ...reflectionPrompt(r, top, day) }, ReflectionSchema, budget);
  for (const ins of res.insights) {
    await remember(store, r.id, "reflection", ins.content, ins.importance, day, DAY_END);
  }
  await store.addEvent({
    sim_day: day, sim_hour: DAY_END, type: "reflect", resident_ids: [r.id], location_id: r.home_id,
    summary: `${r.name} reflektiert: ${res.insights.map((i) => i.content).join(" ")}`, transcript: null,
  });
}
