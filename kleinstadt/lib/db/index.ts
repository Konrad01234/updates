import { InMemoryStore, type Store } from "./store";

let cached: Store | null = null;

/** One store per process: Supabase when configured, otherwise in-memory (dev without database). */
export async function getStore(): Promise<Store> {
  if (cached) return cached;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { SupabaseStore } = await import("./supabase-store");
    cached = new SupabaseStore();
  } else {
    const { seed } = await import("@/data/seed");
    const mem = new InMemoryStore();
    await mem.reset(seed());
    cached = mem;
  }
  return cached;
}
