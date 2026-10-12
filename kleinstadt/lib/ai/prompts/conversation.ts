import type { Location, Memory, Relationship, Resident } from "@/lib/types";
import { SYSTEM_TOWN, describeMemories, describeRelationship, describeResident } from "./shared";

export interface ConversationContext {
  a: Resident; b: Resident;
  memA: Memory[]; memB: Memory[];
  relAB?: Relationship; relBA?: Relationship;
  location: Location; hour: number; day: number;
  maxTurns: number;
}

export function conversationPrompt(c: ConversationContext) {
  return {
    system: `${SYSTEM_TOWN} Du schreibst ein Gespräch zwischen zwei Bewohnern.`,
    user: `Ort: ${c.location.name} (${c.location.description}). Tag ${c.day}, ${c.hour} Uhr.

Person A: ${describeResident(c.a)}
${describeRelationship(c.relAB, c.b)}
Erinnerungen von A:
${describeMemories(c.memA)}

Person B: ${describeResident(c.b)}
${describeRelationship(c.relBA, c.a)}
Erinnerungen von B:
${describeMemories(c.memB)}

Schreibe ein natürliches, kurzes Gespräch mit 4 bis ${c.maxTurns} Wechseln. Konflikte sind erlaubt. Keine Erzählerstimme. Danach: je eine Erinnerung pro Person in Ich-Form (importance 1–10, Smalltalk 1–3, Streit 7–9) und je eine Beziehungsänderung (delta -30 bis +30).

Schema:
{
  "turns": [{ "speaker": "<resident_id>", "text": "..." }],
  "memories": [{ "resident_id": "${c.a.id}", "content": "...", "importance": 3 }, { "resident_id": "${c.b.id}", "content": "...", "importance": 3 }],
  "relationship_deltas": [{ "from": "${c.a.id}", "to": "${c.b.id}", "delta": 0, "reason": "..." }, { "from": "${c.b.id}", "to": "${c.a.id}", "delta": 0, "reason": "..." }]
}`,
  };
}
