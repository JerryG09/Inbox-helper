"use client";

import { createContext, useContext } from "react";
import { SIMULATED_MODE, type RuntimeMode } from "@/lib/processing/live-contract";

// Server-resolved processing mode (AI-01). Defaults to simulated so components rendered outside the app keep V1.1 copy.
const RuntimeModeContext = createContext<RuntimeMode>(SIMULATED_MODE);
export const RuntimeModeProvider = RuntimeModeContext.Provider;
export const useRuntimeMode = () => useContext(RuntimeModeContext);
// True when output can come only from the genuine provider (live or unavailable-live): simulated copy is never shown.
export const useLiveCopy = () => useRuntimeMode().kind !== "simulated";
