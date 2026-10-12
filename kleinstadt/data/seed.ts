import type { Location, Memory, PlanEntry, Relationship, Resident } from "@/lib/types";

const place = (l: Omit<Location, "owner_id" | "balance" | "price" | "daily_cost" | "days_in_loss" | "status"> & Partial<Location>): Location => ({
  owner_id: null, balance: 0, price: 0, daily_cost: 0, days_in_loss: 0, status: "open", ...l,
});

const HOMES: Record<string, string> = {
  home_vogt: "Haus Vogt", home_sofia: "Wohnung Sofia", home_karl: "Wohnung Karl", home_yilmaz: "Haus Yilmaz", home_paul: "Wohnung Paul",
  home_brandt: "Wohnung Brandt", home_oezdemir: "Haus Özdemir", home_lange: "Wohnung Lange", home_fischer: "Haus Fischer", home_weber: "Wohnung Weber",
};

const locations: Location[] = [
  place({ id: "markt", name: "Marktplatz", type: "square", description: "Kopfsteinpflaster, Brunnen, Bänke", open_hour: 0, close_hour: 24 }),
  place({ id: "cafe", name: "Café Linde", type: "cafe", description: "Neues Café mit großen Fenstern zum Marktplatz", open_hour: 7, close_hour: 19, owner_id: "sofia", balance: 3000, price: 4, daily_cost: 150 }),
  place({ id: "baeckerei", name: "Bäckerei Vogt", type: "shop", description: "Familienbäckerei seit 1952, Theke mit Blick auf den Markt", open_hour: 6, close_hour: 14, owner_id: "martha", balance: 3000, price: 3, daily_cost: 120 }),
  place({ id: "schule", name: "Grundschule", type: "work", description: "Backsteinbau mit Pausenhof", open_hour: 7, close_hour: 16 }),
  place({ id: "park", name: "Stadtpark", type: "park", description: "Alte Linden, Teich, Spielplatz", open_hour: 0, close_hour: 24 }),
  place({ id: "kiosk", name: "Kiosk Brandt", type: "shop", description: "Zeitungen, Süßes, Lotto, ein Plausch am Fenster", open_hour: 6, close_hour: 22, owner_id: "jens", balance: 3000, price: 2, daily_cost: 80 }),
  place({ id: "friseur", name: "Salon Özdemir", type: "shop", description: "Friseursalon mit zwei Stühlen und viel Gerede", open_hour: 9, close_hour: 18, owner_id: "aylin", balance: 3000, price: 25, daily_cost: 100 }),
  place({ id: "bus", name: "Bushaltestelle", type: "square", description: "Wartehäuschen, Fahrplan, Blick auf die Felder", open_hour: 0, close_hour: 24 }),
  place({ id: "park2", name: "Lindenwiese", type: "park", description: "Kleine Wiese am Ortsrand mit einer Bank", open_hour: 0, close_hour: 24 }),
  ...Object.entries(HOMES).map(([id, name]) => place({ id, name, type: "home", description: "Zuhause", open_hour: 0, close_hour: 24 })),
];

function plan(home: string, work: string | null, workHours: [number, number], leisure: string[]): PlanEntry[] {
  const entries: PlanEntry[] = [];
  for (let h = 6; h <= 23; h++) {
    if (work && h >= workHours[0] && h < workHours[1]) entries.push({ hour: h, location_id: work, activity: "arbeitet" });
    else if (h < 8 || h >= 21) entries.push({ hour: h, location_id: home, activity: h < 8 ? "frühstückt" : "Feierabend zu Hause" });
    else entries.push({ hour: h, location_id: leisure[h % leisure.length], activity: "Freizeit" });
  }
  return entries;
}

type R = Omit<Resident, "daily_plan" | "current_location_id" | "current_action" | "balance" | "daily_wage" | "employer_id"> &
  Partial<Pick<Resident, "balance" | "daily_wage" | "employer_id">> & { hours: [number, number]; leisure: string[] };

const person = (r: R): Resident => ({
  balance: 800, daily_wage: 80, employer_id: r.work_id, ...r,
  daily_plan: plan(r.home_id, r.work_id, r.hours, r.leisure), current_location_id: null, current_action: "",
});

const residents: Resident[] = [
  person({ id: "martha", name: "Martha Vogt", age: 61, job: "Bäckerin, Inhaberin der Bäckerei Vogt", home_id: "home_vogt", work_id: "baeckerei", hours: [6, 14],
    personality: "stolz, misstrauisch, fleißig", goals: ["Die Bäckerei in der Familie halten", "Herausfinden, was das neue Café vorhat"], leisure: ["markt", "home_vogt", "park"], balance: 3000, daily_wage: 0, employer_id: null }),
  person({ id: "leon", name: "Leon Vogt", age: 24, job: "Bäckergeselle bei seiner Mutter Martha", home_id: "home_vogt", work_id: "baeckerei", hours: [6, 14],
    personality: "träumerisch, konfliktscheu", goals: ["Heimlich nach Berlin ziehen", "Es Martha irgendwann sagen"], leisure: ["park", "cafe", "markt"], daily_wage: 70 }),
  person({ id: "sofia", name: "Sofia Marin", age: 34, job: "Besitzerin des Café Linde", home_id: "home_sofia", work_id: "cafe", hours: [7, 19],
    personality: "offen, ehrgeizig, direkt", goals: ["Das Café in Lindenbach etablieren", "Ein Frühstücksangebot starten"], leisure: ["markt", "park"], balance: 3000, daily_wage: 0, employer_id: null }),
  person({ id: "karl", name: "Karl Brenner", age: 72, job: "Rentner, früher Bürgermeister", home_id: "home_karl", work_id: null, hours: [0, 0],
    personality: "gesellig, nostalgisch, tratscht gern", goals: ["Über alles Bescheid wissen", "Den Park so lassen, wie er ist"], leisure: ["markt", "baeckerei", "cafe", "park", "kiosk"], daily_wage: 60, employer_id: null }),
  person({ id: "nadia", name: "Nadia Yilmaz", age: 41, job: "Lehrerin an der Grundschule", home_id: "home_yilmaz", work_id: "schule", hours: [7, 16],
    personality: "warmherzig, überlastet, gerecht", goals: ["Einen neuen Spielplatz im Park durchsetzen", "Mehr Zeit für Elif"], leisure: ["park", "markt", "home_yilmaz"], daily_wage: 120 }),
  person({ id: "tom", name: "Tom Yilmaz", age: 43, job: "Gärtner im Stadtpark", home_id: "home_yilmaz", work_id: "park", hours: [7, 16],
    personality: "ruhig, stur, loyal", goals: ["Den Park in Schuss halten", "Leon beim Mutmachen helfen"], leisure: ["markt", "home_yilmaz", "park2"], daily_wage: 90 }),
  person({ id: "elif", name: "Elif Yilmaz", age: 16, job: "Schülerin", home_id: "home_yilmaz", work_id: "schule", hours: [8, 14],
    personality: "neugierig, rebellisch", goals: ["Heimlich im Café jobben", "Eigenes Geld verdienen"], leisure: ["cafe", "park", "markt"], balance: 50, daily_wage: 0, employer_id: null }),
  person({ id: "paul", name: "Paul Richter", age: 29, job: "Postbote", home_id: "home_paul", work_id: null, hours: [0, 0],
    personality: "humorvoll, unzuverlässig", goals: ["Die Schulden bei Martha irgendwie loswerden", "Spaß haben"], leisure: ["markt", "baeckerei", "park", "cafe", "kiosk"], daily_wage: 85 }),
  // Phase 3: eight more residents
  person({ id: "jens", name: "Jens Brandt", age: 52, job: "Kioskbesitzer", home_id: "home_brandt", work_id: "kiosk", hours: [6, 22],
    personality: "wortkarg, verlässlich, neugierig hinter dem Tresen", goals: ["Den Kiosk über Wasser halten", "Mehr Laufkundschaft vom Markt"], leisure: ["markt"], balance: 3000, daily_wage: 0, employer_id: null }),
  person({ id: "aylin", name: "Aylin Özdemir", age: 38, job: "Friseurin, Inhaberin Salon Özdemir", home_id: "home_oezdemir", work_id: "friseur", hours: [9, 18],
    personality: "herzlich, geschäftstüchtig, weiß alles über alle", goals: ["Den Salon ausbauen", "Eine zweite Angestellte einstellen"], leisure: ["cafe", "markt"], balance: 3000, daily_wage: 0, employer_id: null }),
  person({ id: "murat", name: "Murat Özdemir", age: 40, job: "Busfahrer", home_id: "home_oezdemir", work_id: "bus", hours: [5, 14],
    personality: "gelassen, pünktlich, trocken humorvoll", goals: ["Endlich Urlaub am Meer", "Aylin im Salon entlasten"], leisure: ["kiosk", "park2", "markt"], daily_wage: 95, employer_id: null }),
  person({ id: "hanna", name: "Hanna Lange", age: 27, job: "arbeitslos, früher Verkäuferin", home_id: "home_lange", work_id: null, hours: [0, 0],
    personality: "ehrgeizig, ungeduldig, kreativ", goals: ["Einen eigenen Laden eröffnen, am liebsten einen Blumenladen", "Nicht wieder nach Düsseldorf pendeln müssen"], leisure: ["markt", "cafe", "park", "kiosk"], balance: 2400, daily_wage: 30, employer_id: null }),
  person({ id: "gerda", name: "Gerda Fischer", age: 78, job: "Rentnerin", home_id: "home_fischer", work_id: null, hours: [0, 0],
    personality: "streng, großzügig, tiefreligiös", goals: ["Karl endlich die Meinung sagen", "Den Enkel Finn auf Kurs halten"], leisure: ["baeckerei", "park2", "home_fischer", "friseur"], daily_wage: 70, employer_id: null }),
  person({ id: "finn", name: "Finn Fischer", age: 19, job: "Aushilfe im Kiosk", home_id: "home_fischer", work_id: "kiosk", hours: [14, 22],
    personality: "faul, charmant, ehrlich wenn es drauf ankommt", goals: ["Genug Geld für ein Motorrad", "Elif beeindrucken"], leisure: ["park", "markt", "cafe"], daily_wage: 60 }),
  person({ id: "ruth", name: "Ruth Weber", age: 66, job: "Rentnerin, früher Lehrerin", home_id: "home_weber", work_id: null, hours: [0, 0],
    personality: "belesen, spitzzüngig, einsam", goals: ["Einen Lesekreis gründen", "Mit Nadia über die Schule reden"], leisure: ["cafe", "park", "markt", "baeckerei"], daily_wage: 70, employer_id: null }),
  person({ id: "ben", name: "Ben Weber", age: 35, job: "Lehrer an der Grundschule", home_id: "home_weber", work_id: "schule", hours: [7, 16],
    personality: "idealistisch, chaotisch, hilfsbereit", goals: ["Ein Schulgartenprojekt starten", "Weniger bei der Mutter wohnen"], leisure: ["park", "cafe", "kiosk"], daily_wage: 110 }),
];

function rel(a: string, b: string, score: number, label: string, both = true): Relationship[] {
  const r = [{ resident_id: a, other_id: b, score, label, updated_day: 0 }];
  if (both) r.push({ resident_id: b, other_id: a, score, label, updated_day: 0 });
  return r;
}

const relationships: Relationship[] = [
  ...rel("martha", "leon", 70, "Mutter und Sohn"), ...rel("nadia", "tom", 70, "Ehepaar"), ...rel("nadia", "elif", 70, "Mutter und Tochter"), ...rel("tom", "elif", 70, "Vater und Tochter"),
  ...rel("martha", "sofia", -30, "sieht das Café als Konkurrenz", false), ...rel("nadia", "karl", -20, "Streit um den Park", false), ...rel("karl", "nadia", -10, "findet sie zu fordernd", false),
  ...rel("paul", "martha", -10, "schuldet ihr Geld", false), ...rel("martha", "paul", -15, "zahlt nicht zurück", false), ...rel("tom", "leon", 30, "mag den Jungen", false),
  ...rel("aylin", "murat", 70, "Ehepaar"), ...rel("gerda", "finn", 60, "Großmutter und Enkel"), ...rel("ruth", "ben", 65, "Mutter und Sohn"),
  ...rel("jens", "finn", 20, "Chef und Aushilfe"), ...rel("gerda", "karl", -25, "alte Rechnung aus seiner Amtszeit", false), ...rel("finn", "elif", 15, "findet sie toll", false),
  ...rel("ruth", "nadia", 10, "Kollegin aus alten Zeiten", false), ...rel("ben", "nadia", 40, "Kollegen"), ...rel("hanna", "sofia", 25, "bewundert ihren Mut", false), ...rel("murat", "paul", 20, "Stammgäste am Kiosk"),
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
  seedMemory("jens", "Seit das Café aufgemacht hat, kaufen weniger Leute ihren Kaffee bei mir.", 6),
  seedMemory("jens", "Finn kommt ständig zu spät zur Schicht.", 5),
  seedMemory("aylin", "Im Salon erfahre ich alles: Elif soll heimlich im Café arbeiten.", 7),
  seedMemory("aylin", "Murat redet schon wieder vom Meer, dabei brauche ich ihn hier.", 4),
  seedMemory("murat", "Zwei Wochen Meer, das wäre es. Aylin will nicht.", 5),
  seedMemory("murat", "Paul erzählt am Kiosk immer die besten Geschichten.", 3),
  seedMemory("hanna", "Ich habe 2400 Euro gespart. Für einen kleinen Blumenladen am Markt könnte das reichen.", 9),
  seedMemory("hanna", "Sofia hat sich getraut, warum nicht ich?", 6),
  seedMemory("gerda", "Karl hat damals als Bürgermeister die Kirchenwiese verkauft. Das vergesse ich ihm nicht.", 8),
  seedMemory("gerda", "Finn hängt nur im Park herum statt zu arbeiten.", 5),
  seedMemory("finn", "Elif ist jeden Nachmittag im Café. Vielleicht gehe ich auch mal hin.", 6),
  seedMemory("finn", "Jens hat mich schon zweimal wegen Verspätung angemeckert.", 4),
  seedMemory("ruth", "Seit der Pensionierung redet kaum noch jemand mit mir.", 7),
  seedMemory("ruth", "Nadia war mal meine Referendarin. Sie macht das gut.", 4),
  seedMemory("ben", "Ein Schulgarten im Stadtpark, das wäre perfekt. Tom könnte helfen.", 7),
  seedMemory("ben", "Mit 35 noch bei Mutter wohnen, das muss sich ändern.", 5),
];

export const seed = () => ({ locations, residents, relationships, memories });
