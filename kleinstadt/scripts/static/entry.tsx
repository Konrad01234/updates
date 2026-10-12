/** Entry of the static build: the whole mock simulation runs in the browser, no server needed. */
import { createRoot } from "react-dom/client";
import Page from "@/app/page";
import { installBrowserApi } from "./api";

installBrowserApi();
createRoot(document.getElementById("root")!).render(<Page />);
