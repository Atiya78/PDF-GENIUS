import { createHmac } from "node:crypto";
import type { Request, Response } from "express";

/** Auth middleware supplies the DB user; never trust client name/email inputs. */
export function supportChatIdentity(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  if (!req.user?.email) return res.status(401).json({ error: "Sign in first" });
  // TODO(owner): Configure TAWK_API_KEY on the server and enable Tawk Secure Mode.
  // This is a private provider key, never the public widget ID or a JWT secret.
  const key = process.env.TAWK_API_KEY;
  if (!key) return res.status(503).json({ error: "Support identity is not configured" });
  return res.json({
    name: req.user.name || undefined,
    email: req.user.email,
    hash: createHmac("sha256", key).update(req.user.email).digest("hex"),
  });
}