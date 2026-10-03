import { useCallback } from "react";
import { useRecordEducationEvent } from "@workspace/api-client-react";
import type { EducationEvent } from "@workspace/api-client-react";

/** Fire-and-forget usage counts. Never sends document content. */
export function useTrack(tool: EducationEvent["tool"]) {
  const { mutate } = useRecordEducationEvent();
  return useCallback((event: EducationEvent["event"]) => mutate({ data: { event, tool } }), [mutate, tool]);
}
