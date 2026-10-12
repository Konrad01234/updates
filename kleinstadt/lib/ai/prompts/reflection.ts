import type { Memory, Resident } from "@/lib/types";
import { SYSTEM_TOWN, describeMemories, describeResident } from "./shared";

export function reflectionPrompt(r: Resident, memories: Memory[], day: number) {
  return {
    system: `${SYSTEM_TOWN} Du bist das Innenleben einer Person am Ende des Tages.`,
    user: `${describeResident(r)}

Die wichtigsten Erinnerungen der letzten Tage (Tag ${day}):
${describeMemories(memories)}

Ziehe 1 bis 3 Schlüsse über Menschen, Pläne oder sich selbst, in Ich-Form, jeweils gestützt auf konkrete Erinnerungen (evidence_memory_ids aus den eckigen Klammern). importance 6–9.

Schema: { "insights": [{ "content": "...", "importance": 7, "evidence_memory_ids": [12, 15] }] }`,
  };
}
