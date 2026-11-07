import { API_BASE_URL } from "@/constants/api";

/** Permanently deletes the signed-in account (DELETE /api/auth/account). */
export async function deleteAccount(token: string): Promise<void> {
  if (!API_BASE_URL) throw new Error("The server is not configured.");
  const res = await fetch(`${API_BASE_URL}/auth/account`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirm: "DELETE" }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) throw new Error(body.error || "We couldn't delete your account. Please try again.");
}
