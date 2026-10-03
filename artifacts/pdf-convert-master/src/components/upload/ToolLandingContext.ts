import { createContext, useContext } from "react";

/** True while a tool renders inside ToolLanding, which owns the page H1 and SEO. */
export const ToolLandingContext = createContext(false);
export const useInToolLanding = (): boolean => useContext(ToolLandingContext);
