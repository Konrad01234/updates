import type { Location, Memory, Resident } from "@/lib/types";
import { SYSTEM_TOWN, describeMemories, describeResident } from "./shared";

export function foundingPrompt(r: Resident, memories: Memory[], shops: Location[], day: number) {
  return {
    system: `${SYSTEM_TOWN} Du entscheidest für eine Person, ob sie ein Geschäft gründet.`,
    user: `${describeResident(r)} Kontostand: ${r.balance} €. Tag ${day}.

Bestehende Läden: ${shops.map((s) => `${s.name} (${s.type}, ${s.price} € pro Besuch)`).join(", ")}.

Erinnerungen:
${describeMemories(memories)}

Will diese Person jetzt einen Laden eröffnen? Startkapital 1500 €. Wenn ja: Name, Typ (shop oder cafe), kurze Beschreibung und Preis pro Besuch in Euro, passend zur Person.

Schema: { "found": true, "name": "...", "type": "shop", "description": "...", "price": 5 }`,
  };
}
