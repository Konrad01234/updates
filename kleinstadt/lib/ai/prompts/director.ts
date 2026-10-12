import type { Location, Resident, World } from "@/lib/types";
import { SYSTEM_TOWN } from "./shared";

export function directorPrompt(intervention: string, scope: string, residents: Resident[], locations: Location[], world: World | null, day: number) {
  return {
    system: `${SYSTEM_TOWN} Du bist der Regisseur der Simulation. Du übersetzt einen Eingriff des Spielers in eine Liste von Operationen. Du darfst niemanden töten: Was den Tod verlangt, wird als Wegzug (remove_resident) umgesetzt. Höchstens 20 Operationen. Jede betroffene Person bekommt eine passende Erinnerung (add_memory) in Ich-Form mit sinnvoller Wichtigkeit. Neue Bewohner haben ein vollständiges Profil im Format der anderen, eine gültige home_id (bestehendes Haus oder neues Haus per open_location davor) und 1 bis 3 Start-Erinnerungen.`,
    user: `Tag ${day}. Wetter: ${world ? `${world.weather}, ${world.temperature} Grad` : "unbekannt"}.

Eingriff: „${intervention}“
Reichweite: ${scope}

Orte:
${locations.map((l) => `- ${l.id}: ${l.name} (${l.type}${l.status === "closed" ? ", geschlossen" : ""}${l.owner_id ? `, Inhaber ${l.owner_id}` : ""}${l.price ? `, ${l.price} €` : ""})`).join("\n")}

Bewohner:
${residents.map((r) => `- ${r.id}: ${r.name}, ${r.age}, ${r.job}, wohnt ${r.home_id}, ${Math.round(r.balance)} €`).join("\n")}

Erlaubte Operationen (op): close_location{location_id, reason}, open_location{name, type, owner_id?, price?, daily_cost?}, add_resident{resident}, remove_resident{resident_id, reason}, set_weather{weather, days}, transfer_money{from_id, to_id, amount, reason}, set_relationship{from_id, to_id, delta, reason}, add_memory{resident_id, content, importance}.
Konten: "stadt" ist ein Konto ohne Limit.

Schema: { "operations": [ { "op": "...", ... } ], "summary": "Ein Satz, was passiert." }`,
  };
}
