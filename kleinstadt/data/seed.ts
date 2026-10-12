import type { Location, Memory, PlanEntry, Relationship, Resident } from "@/lib/types";

const locations: Location[] = [
  { id: "markt", name: "Marktplatz", type: "square", description: "Kopfsteinpflaster, Brunnen, Bänke", open_hour: 0, close_hour: 24 },
  { id: "cafe", name: "Café Linde", type: "cafe", description: "Neues Café mit großen Fenstern zum Marktplatz", open_hour: 7, close_hour: 19 },
  { id: "baeckerei", name: "Bäckerei Vogt", type: "shop", description: "Familienbäckerei seit 1952, Theke mit Blick auf den Markt", open_hour: 6, close_hour: 14 },
  { id: "schule", name: "Grundschule", type: "work", description: "Backsteinbau mit Pausenhof", open_hour: 7, close_hour: 16 },
  { id: "park", name: "Stadtpark", type: "park", description: "Alte Linden, Teich, Spielplatz", open_hour: 0, close_hour: 24 },
  ...["martha", "leon", "sofia", "karl", "nadia", "tom", "elif", "paul"].map<Location>((id) => ({
    id: `home_${id}`, name: `Wohnung ${id[0].toUpperCase() + id.slice(1)}`, type: "home", description: "Zuhause", open_hour: 0, close_hour: 24,
  })),
];
// Nadia, Tom and Elif share a home.
locations.find((l) => l.id === "home_tom")!.name = "Haus Yilmaz";
locations.find((l) => l.id === "home_nadia")!.name = "Haus Yilmaz";
locations.find((l) => l.id === "home_elif")!.name = "Haus Yilmaz";

/** Fixed plan: work hours at the workplace, otherwise a mix of home, market, café and park. */
function plan(home: string, work: string | null, workHours: [number, number], leisure: string[]): PlanEntry[] {
  const entries: PlanEntry[] = [];
  for (let h = 6; h <= 23; h++) {
    if (work && h >= workHours[0] && h < workHours[1]) entries.push({ hour: h, location_id: work, activity: "arbeitet" });
    else if (h < 8 || h >= 21) entries.push({ hour: h, location_id: home, activity: h < 8 ? "frühstückt" : "Feierabend zu Hause" });
    else entries.push({ hour: h, location_id: leisure[h % leisure.length], activity: "Freizeit" });
  }
  return entries;
}

const residents: Resident[] = [
  { id: "martha", name: "Martha Vogt", age: 61, job: "Bäckerin, Inhaberin der Bäckerei Vogt", home_id: "home_martha", work_id: "baeckerei",
    personality: "stolz, misstrauisch, fleißig", goals: ["Die Bäckerei in der Familie halten", "Herausfinden, was das neue Café vorhat"],
    daily_plan: plan("home_martha", "baeckerei", [6, 14], ["markt", "home_martha", "park"]), current_location_id: null, current_action: "" },
  { id: "leon", name: "Leon Vogt", age: 24, job: "Bäckergeselle bei seiner Mutter Martha", home_id: "home_leon", work_id: "baeckerei",
    personality: "träumerisch, konfliktscheu", goals: ["Heimlich nach Berlin ziehen", "Es Martha irgendwann sagen"],
    daily_plan: plan("home_leon", "baeckerei", [6, 14], ["park", "cafe", "markt"]), current_location_id: null, current_action: "" },
  { id: "sofia", name: "Sofia Marin", age: 34, job: "Besitzerin des Café Linde", home_id: "home_sofia", work_id: "cafe",
    personality: "offen, ehrgeizig, direkt", goals: ["Das Café in Lindenbach etablieren", "Ein Frühstücksangebot starten"],
    daily_plan: plan("home_sofia", "cafe", [7, 19], ["markt", "park"]), current_location_id: null, current_action: "" },
  { id: "karl", name: "Karl Brenner", age: 72, job: "Rentner, früher Bürgermeister", home_id: "home_karl", work_id: null,
    personality: "gesellig, nostalgisch, tratscht gern", goals: ["Über alles Bescheid wissen", "Den Park so lassen, wie er ist"],
    daily_plan: plan("home_karl", null, [0, 0], ["markt", "baeckerei", "cafe", "park"]), current_location_id: null, current_action: "" },
  { id: "nadia", name: "Nadia Yilmaz", age: 41, job: "Lehrerin an der Grundschule", home_id: "home_nadia", work_id: "schule",
    personality: "warmherzig, überlastet, gerecht", goals: ["Einen neuen Spielplatz im Park durchsetzen", "Mehr Zeit für Elif"],
    daily_plan: plan("home_nadia", "schule", [7, 16], ["park", "markt", "home_nadia"]), current_location_id: null, current_action: "" },
  { id: "tom", name: "Tom Yilmaz", age: 43, job: "Gärtner im Stadtpark", home_id: "home_tom", work_id: "park",
    personality: "ruhig, stur, loyal", goals: ["Den Park in Schuss halten", "Leon beim Mutmachen helfen"],
    daily_plan: plan("home_tom", "park", [7, 16], ["markt", "home_tom"]), current_location_id: null, current_action: "" },
  { id: "elif", name: "Elif Yilmaz", age: 16, job: "Schülerin", home_id: "home_elif", work_id: "schule",
    personality: "neugierig, rebellisch", goals: ["Heimlich im Café jobben", "Eigenes Geld verdienen"],
    daily_plan: plan("home_elif", "schule", [8, 14], ["cafe", "park", "markt"]), current_location_id: null, current_action: "" },
  { id: "paul", name: "Paul Richter", age: 29, job: "Postbote", home_id: "home_paul", work_id: null,
    personality: "humorvoll, unzuverlässig", goals: ["Die Schulden bei Martha irgendwie loswerden", "Spaß haben"],
    daily_plan: plan("home_paul", null, [0, 0], ["markt", "baeckerei", "park", "cafe"]), current_location_id: null, current_action: "" },
];

function rel(a: string, b: string, score: number, label: string, both = true): Relationship[] {
  const r = [{ resident_id: a, other_id: b, score, label, updated_day: 0 }];
  if (both) r.push({ resident_id: b, other_id: a, score, label, updated_day: 0 });
  return r;
}

const relationships: Relationship[] = [
  ...rel("martha", "leon", 70, "Mutter und Sohn"),
  ...rel("nadia", "tom", 70, "Ehepaar"),
  ...rel("nadia", "elif", 70, "Mutter und Tochter"),
  ...rel("tom", "elif", 70, "Vater und Tochter"),
  ...rel("martha", "sofia", -30, "sieht das Café als Konkurrenz", false),
  ...rel("nadia", "karl", -20, "Streit um den Park", false),
  ...rel("karl", "nadia", -10, "findet sie zu fordernd", false),
  ...rel("paul", "martha", -10, "schuldet ihr Geld", false),
  ...rel("martha", "paul", -15, "zahlt nicht zurück", false),
  ...rel("tom", "leon", 30, "mag den Jungen", false),
];

const seedMemory = (resident_id: string, content: string, importance: number): Omit<Memory, "id"> => ({
  resident_id, kind: "observation", content, importance, sim_day: 0, sim_hour: 20, embedding: null, last_accessed: 0,
});

const memories: Omit<Memory, "id">[] = [
  seedMemory("martha", "Das neue Café Linde hat am Marktplatz eröffnet, direkt gegenüber von meiner Bäckerei.", 7),
  seedMemory("martha", "Paul schuldet mir seit drei Monaten 180 Euro und weicht mir aus.", 6),
  seedMemory("martha", "Leon ist in letzter Zeit so abwesend bei der Arbeit.", 5),
  seedMemory("leon", "Ich habe eine Zusage für ein Zimmer in Berlin, ab nächsten Monat.", 9),
  seedMemory("leon", "Mutter darf davon noch nichts wissen, sie würde es nicht verstehen.", 8),
  seedMemory("leon", "Tom hat gesagt, ich soll mir mein Leben nicht von anderen vorschreiben lassen.", 6),
  seedMemory("sofia", "Die Bäckerin Martha hat mich beim Eröffnen keines Blickes gewürdigt.", 6),
  seedMemory("sofia", "Elif hat gefragt, ob sie nachmittags bei mir aushelfen kann, ihre Eltern sollen es nicht wissen.", 7),
  seedMemory("sofia", "Ein Frühstücksangebot könnte das Café endlich füllen.", 5),
  seedMemory("karl", "Der neue Spielplatz, den Nadia will, würde meine Lieblingsbank im Park kosten.", 7),
  seedMemory("karl", "Als Bürgermeister wusste ich immer alles zuerst, das vermisse ich.", 5),
  seedMemory("karl", "Irgendwas ist mit dem jungen Vogt los, er schleicht so herum.", 4),
  seedMemory("nadia", "Karl blockiert den Spielplatz im Stadtrat, nur wegen seiner Bank.", 7),
  seedMemory("nadia", "Elif kommt in letzter Zeit spät nach Hause und sagt nicht, wo sie war.", 6),
  seedMemory("nadia", "Zu viele Korrekturen, zu wenig Schlaf.", 4),
  seedMemory("tom", "Leon hat mir anvertraut, dass er weg will. Ich habe ihm Mut gemacht.", 8),
  seedMemory("tom", "Die Linden am Teich müssen bald beschnitten werden.", 3),
  seedMemory("tom", "Nadia arbeitet sich kaputt für diesen Spielplatz.", 5),
  seedMemory("elif", "Sofia lässt mich nachmittags im Café arbeiten, Mama und Papa wissen nichts davon.", 9),
  seedMemory("elif", "Karl Brenner sieht alles, vor dem muss ich aufpassen.", 6),
  seedMemory("elif", "Mit eigenem Geld könnte ich endlich das Konzert in Düsseldorf sehen.", 5),
  seedMemory("paul", "Ich schulde Martha 180 Euro und weiß nicht, wie ich das zurückzahlen soll.", 8),
  seedMemory("paul", "Beim Zustellen habe ich einen Brief aus Berlin für Leon Vogt gesehen.", 6),
  seedMemory("paul", "Das Café hat echt guten Kaffee, besser als Marthas.", 3),
];

export const seed = () => ({ locations, residents, relationships, memories });
