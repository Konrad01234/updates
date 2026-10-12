/** Minimal typing for react-dom/client, so the static entry type-checks without adding @types/react-dom. */
declare module "react-dom/client" {
  import type { ReactNode } from "react";
  export interface Root { render(node: ReactNode): void; unmount(): void }
  export function createRoot(container: Element | DocumentFragment): Root;
}
