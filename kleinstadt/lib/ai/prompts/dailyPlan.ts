import type { Location, Memory, Resident } from "@/lib/types";
import { SYSTEM_TOWN, describeLocations, describeMemories, describeResident } from "./shared";

export function dailyPlanPrompt(r: Resident, locations: Location[], topMemories: Memory[], day: number, weather = "") {
  return {
    system: SYSTEM_TOWN,
    user: `Erstelle den Tagesplan für Tag ${day} für diese Person. ${weather}

${describeResident(r)}
Wohnung: ${r.home_id}. Arbeitsplatz: ${r.work_id ?? "keiner"}.

Orte:
${describeLocations(locations)}

Wichtigste Erinnerungen von gestern:
${describeMemories(topMemories)}

Regeln: Nur geöffnete Orte (status open). Stunden 6 bis 23, jede Stunde genau ein Eintrag, nur Ort-Ids aus der Liste, nur Orte, die zu dieser Stunde geöffnet sind. Arbeit zu üblichen Zeiten, Freizeit passend zur Persönlichkeit und zu den Zielen.

Schema: { "plan": [{ "hour": 6, "location_id": "...", "activity": "..." }, ...] }`,
  };
}
