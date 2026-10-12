import { EMBEDDING_DIM } from "@/lib/types";
import { isMock } from "./client";

/** Deterministic bag-of-words vector for mock mode: similar texts get similar vectors. */
export function mockEmbedding(text: string): number[] {
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  for (const word of text.toLowerCase().match(/[a-zäöüß]+/g) ?? []) {
    let h = 0;
    for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    v[h % EMBEDDING_DIM] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

export async function embed(text: string): Promise<number[]> {
  if (isMock() || !process.env.VOYAGE_API_KEY) return mockEmbedding(text);
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` },
    body: JSON.stringify({ model: "voyage-3-lite", input: [text], output_dimension: EMBEDDING_DIM }),
  });
  if (!res.ok) throw new Error(`voyage ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
