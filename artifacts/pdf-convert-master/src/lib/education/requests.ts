import { getAuthToken } from "@/lib/authedFetch";

export function educationHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function requestIdentity(ref: { current: { signature: string; id: string } | null }, input: object) {
  const signature = JSON.stringify(input);
  if (ref.current?.signature !== signature) ref.current = { signature, id: crypto.randomUUID() };
  return ref.current!.id;
}
