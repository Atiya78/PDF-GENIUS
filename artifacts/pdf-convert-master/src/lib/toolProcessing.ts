import { useEffect, useRef } from "react";

const active = new Set<symbol>();
export const PROCESSING_EVENT = "pdfgenius:processing";
export const isToolProcessing = () => active.size > 0;

export function setToolProcessing(key: symbol, processing: boolean) {
  processing ? active.add(key) : active.delete(key);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROCESSING_EVENT));
}

/** Count concurrent loaders; one finished operation must not reveal chat early. */
export function useToolProcessing(processing: boolean) {
  const key = useRef(Symbol("processing"));
  useEffect(() => {
    setToolProcessing(key.current, processing);
    return () => setToolProcessing(key.current, false);
  }, [processing]);
}