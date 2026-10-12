/** Stand-in for next/dynamic in the static build: lazy-load the component, no SSR concerns in a plain page. */
import { lazy, Suspense, type ComponentType } from "react";

type Loader<P> = () => Promise<{ default: ComponentType<P> } | ComponentType<P>>;

export default function dynamic<P extends object>(loader: Loader<P>): ComponentType<P> {
  const Lazy = lazy(async () => {
    const mod = await loader();
    return "default" in mod ? mod : { default: mod };
  });
  return function Dynamic(props: P) {
    return <Suspense fallback={null}><Lazy {...props} /></Suspense>;
  };
}
