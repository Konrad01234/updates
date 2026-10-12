import type { Location, Memory, Relationship, Resident } from "@/lib/types";

export const SYSTEM_TOWN = `Du simulierst Bewohner der deutschen Kleinstadt Lindenbach. Antworte ausschließlich mit gültigem JSON nach dem vorgegebenen Schema, ohne Einleitung, ohne Markdown-Zäune.`;

export function describeResident(r: Resident): string {
  return `${r.name} (${r.id}), ${r.age}, ${r.job}. Persönlichkeit: ${r.personality}. Ziele: ${r.goals.join("; ")}.`;
}

export function describeMemories(ms: Memory[]): string {
  return ms.map((m) => `- [${m.id}] Tag ${m.sim_day}, ${m.sim_hour} Uhr: ${m.content}`).join("\n") || "- (keine)";
}

export function describeRelationship(rel: Relationship | undefined, other: Resident): string {
  if (!rel || (rel.score === 0 && !rel.label)) return `Kennt ${other.name} noch nicht.`;
  return `Beziehung zu ${other.name}: ${rel.score} von -100 bis +100${rel.label ? `, „${rel.label}“` : ""}.`;
}

export function describeLocations(ls: Location[]): string {
  return ls.filter((l) => l.status !== "closed").map((l) => `- ${l.id}: ${l.name} (${l.type}, ${l.open_hour}–${l.close_hour} Uhr${l.price ? `, ${l.price} €` : ""})`).join("\n");
}
