import { createContext } from "react";

// The landing page owns its heading and metadata, not the embedded tool.
export const ToolLandingContext = createContext(false);