import { InMemoryStore, type Store } from "./store";

/** Cached on globalThis: the Next dev server re-instantiates modules per route compile, and every route must see the same store. */
const g = globalThis as unknown as { __kleinstadtStore?: Store };

/** One store per process: Supabase when configured, otherwise in-memory (dev without database). */
export async function getStore(): Promise<Store> {
  if (g.__kleinstadtStore) return g.__kleinstadtStore;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { SupabaseStore } = await import("./supabase-store");
    g.__kleinstadtStore = new SupabaseStore();
  } else {
    const { seed } = await import("@/data/seed");
    const mem = new InMemoryStore();
    await mem.reset(seed());
    g.__kleinstadtStore = mem;
  }
  return g.__kleinstadtStore;
}
