import type { Store } from "@/lib/db/store";
import type { Location, Resident } from "@/lib/types";
import { CITY_ACCOUNT } from "@/lib/types";
import { remember } from "./memory";

export const LOSS_DAYS_TO_CLOSE = 7;
export const FOUNDING_MIN_BALANCE = 2000;
export const FOUNDING_CAPITAL = 1500;
const SHOP_WORDS = ["laden", "geschäft", "café", "cafe", "shop", "salon", "kiosk", "blumen", "eröffnen"];

export const isShop = (l: Location) => (l.type === "shop" || l.type === "cafe") && l.status === "open";

/** A visit at a shop costs `price`; returns false when the visitor cannot pay. */
export async function payVisit(store: Store, r: Resident, l: Location, day: number, visits: Map<string, number>): Promise<boolean> {
  if (!isShop(l) || l.price <= 0 || l.owner_id === r.id || r.employer_id === l.id) return true;
  if (r.balance < l.price) return false;
  r.balance -= l.price; l.balance += l.price;
  await store.updateResident(r.id, { balance: r.balance });
  await store.updateLocation(l.id, { balance: l.balance });
  await store.addTransaction({ sim_day: day, from_id: r.id, to_id: l.id, amount: l.price, reason: `Besuch ${l.name}` });
  visits.set(l.id, (visits.get(l.id) ?? 0) + 1);
  return true;
}

/** 23:00: shops pay costs and wages, the rest goes to the owner; the city pays everyone else. */
export async function settleDay(store: Store, day: number, visits: Map<string, number>, streak: Map<string, number[]>): Promise<string[]> {
  const residents = await store.listResidents();
  const locations = await store.listLocations();
  const byId = new Map(residents.map((r) => [r.id, r]));
  const notes: string[] = [];
  const pay = async (from: { id: string; balance: number } | null, to: Resident, amount: number, reason: string) => {
    if (amount <= 0) return;
    if (from) from.balance -= amount;
    to.balance += amount;
    await store.addTransaction({ sim_day: day, from_id: from?.id ?? CITY_ACCOUNT, to_id: to.id, amount, reason });
  };

  for (const l of locations) {
    if (!isShop(l)) continue;
    const before = l.balance;
    const staff = residents.filter((r) => r.employer_id === l.id && r.id !== l.owner_id);
    l.balance -= l.daily_cost;
    await store.addTransaction({ sim_day: day, from_id: l.id, to_id: CITY_ACCOUNT, amount: l.daily_cost, reason: `Betriebskosten ${l.name}` });
    for (const s of staff) await pay(l, s, s.daily_wage, `Lohn ${l.name}`);
    const owner = l.owner_id ? byId.get(l.owner_id) : undefined;
    const profit = l.balance - before + (visits.get(l.id) ?? 0) * 0; // income was booked during the day
    const dayResult = l.balance - (before - (visits.get(l.id) ?? 0) * l.price);
    if (owner && l.balance > 0) await pay(l, owner, l.balance, `Gewinn ${l.name}`);
    l.days_in_loss = dayResult < 0 ? l.days_in_loss + 1 : 0;
    void profit;

    // price adaptation: 3 days > 10 visitors → +10 %, 3 days < 3 visitors → −10 %
    const hist = [...(streak.get(l.id) ?? []), visits.get(l.id) ?? 0].slice(-3);
    streak.set(l.id, hist);
    if (hist.length === 3 && hist.every((v) => v > 10)) { l.price = Math.round(l.price * 1.1 * 100) / 100; notes.push(`${l.name} erhöht den Preis auf ${l.price} €`); streak.set(l.id, []); }
    if (hist.length === 3 && hist.every((v) => v < 3)) { l.price = Math.max(0.5, Math.round(l.price * 0.9 * 100) / 100); notes.push(`${l.name} senkt den Preis auf ${l.price} €`); streak.set(l.id, []); }

    if (l.days_in_loss >= LOSS_DAYS_TO_CLOSE) {
      l.status = "closed";
      notes.push(`${l.name} schließt nach ${l.days_in_loss} Verlusttagen`);
      for (const s of staff) { s.employer_id = null; s.daily_wage = 30; await remember(store, s.id, "observation", `Ich habe meinen Job in ${l.name} verloren, der Laden hat zugemacht.`, 8, day, 23); }
      if (owner) await remember(store, owner.id, "observation", `${l.name} musste schließen. Sieben Tage Verlust in Folge, ich habe es nicht geschafft.`, 9, day, 23);
    }
    await store.updateLocation(l.id, { balance: l.balance, days_in_loss: l.days_in_loss, price: l.price, status: l.status });
  }
  for (const r of residents) {
    const employer = r.employer_id ? locations.find((l) => l.id === r.employer_id) : null;
    if (!employer || !isShop(employer)) await pay(null, r, r.daily_wage, r.employer_id ? `Lohn ${employer?.name ?? r.employer_id}` : "Rente/Unterstützung");
  }
  for (const r of residents) await store.updateResident(r.id, { balance: r.balance, employer_id: r.employer_id, daily_wage: r.daily_wage });
  return notes;
}

export const wantsToFound = (r: Resident, locations: Location[]) =>
  r.balance >= FOUNDING_MIN_BALANCE && !locations.some((l) => l.owner_id === r.id && l.status === "open") &&
  r.goals.some((g) => SHOP_WORDS.some((w) => g.toLowerCase().includes(w)));

/** Sum of all balances incl. the city account must stay constant: the invariant the test checks. */
export async function totalMoney(store: Store): Promise<number> {
  const residents = await store.listResidents();
  const locations = await store.listLocations();
  const city = (await store.listTransactions()).reduce((s, t) => s + (t.to_id === CITY_ACCOUNT ? t.amount : 0) - (t.from_id === CITY_ACCOUNT ? t.amount : 0), 0);
  return residents.reduce((s, r) => s + r.balance, 0) + locations.reduce((s, l) => s + l.balance, 0) + city;
}
