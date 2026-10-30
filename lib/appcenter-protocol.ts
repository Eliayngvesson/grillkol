// Server-till-server-protokoll mellan AppCenter och programmen.
// IDENTISK kopia finns i yngvesson-appcenter/lib/appapi/protocol.ts – ändra båda.
import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_SKEW_MS = 5 * 60 * 1000;

export type EffectiveStatus =
  | "trial" | "trial_expired" | "active" | "past_due" | "past_due_expired"
  | "free" | "blocked" | "cancelled";

export type AppCustomer = {
  id: string;
  email: string | null;
  name: string | null;
  org: string | null;
  status: EffectiveStatus;
  subscription_status: string;
  trial_ends_at: string | null;
  free_access: boolean;
  access_until: string | null;
  created_at: string;
  usage: Record<string, number>;
};

export type AppStats = {
  customers: number;
  trial: number;
  trial_expired: number;
  active: number;
  past_due: number;
  free: number;
  blocked: number;
  version: string;
};

export type AccessChange =
  | { action: "grant_free"; until?: string | null }
  | { action: "revoke_free" }
  | { action: "start_trial"; days?: number }
  | { action: "extend_trial"; days: number }
  | { action: "set_trial_end"; until: string }
  | { action: "block" }
  | { action: "unblock" }
  // Från verifierade betalningshändelser (Stripe-webhook i AppCenter)
  | { action: "billing_active"; provider: string; customer_ref: string; subscription_ref: string }
  | { action: "billing_past_due" }
  | { action: "billing_cancelled" };

export type AppRequest =
  | { op: "ping" }
  | { op: "stats" }
  | { op: "list_customers"; q?: string; limit?: number }
  | { op: "get_customer"; id: string }
  | { op: "set_access"; id: string; change: AccessChange; actor: string; reason?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isStr = (v: unknown, max = 200): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const isDate = (v: unknown): v is string => isStr(v, 40) && !Number.isNaN(Date.parse(v));
const isDays = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 3650;

export function parseChange(c: unknown): AccessChange | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  switch (o.action) {
    case "grant_free":
      if (o.until == null) return { action: "grant_free", until: null };
      return isDate(o.until) ? { action: "grant_free", until: o.until } : null;
    case "revoke_free": case "block": case "unblock":
    case "billing_past_due": case "billing_cancelled":
      return { action: o.action };
    case "start_trial":
      if (o.days == null) return { action: "start_trial" };
      return isDays(o.days) ? { action: "start_trial", days: o.days } : null;
    case "extend_trial":
      return isDays(o.days) ? { action: "extend_trial", days: o.days } : null;
    case "set_trial_end":
      return isDate(o.until) ? { action: "set_trial_end", until: o.until } : null;
    case "billing_active":
      return isStr(o.provider, 40) && isStr(o.customer_ref) && isStr(o.subscription_ref)
        ? { action: "billing_active", provider: o.provider, customer_ref: o.customer_ref, subscription_ref: o.subscription_ref }
        : null;
    default:
      return null;
  }
}

export function parseRequest(raw: unknown): AppRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  switch (o.op) {
    case "ping": return { op: "ping" };
    case "stats": return { op: "stats" };
    case "list_customers": {
      const limit = o.limit == null ? 50 : Number(o.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) return null;
      if (o.q != null && !isStr(o.q, 100)) return null;
      return { op: "list_customers", q: (o.q as string | undefined) ?? undefined, limit };
    }
    case "get_customer":
      return typeof o.id === "string" && UUID.test(o.id) ? { op: "get_customer", id: o.id } : null;
    case "set_access": {
      const change = parseChange(o.change);
      if (typeof o.id !== "string" || !UUID.test(o.id) || !change || !isStr(o.actor, 200)) return null;
      return { op: "set_access", id: o.id, change, actor: o.actor, reason: isStr(o.reason, 500) ? o.reason : undefined };
    }
    default: return null;
  }
}

export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

// Godtar flera hemligheter samtidigt (nyckelrotation: nuvarande + föregående).
export function verifySignature(opts: {
  secrets: string[];
  timestamp: string | null;
  signature: string | null;
  body: string;
  now?: number;
}): boolean {
  const { secrets, timestamp, signature, body } = opts;
  const now = opts.now ?? Date.now();
  if (!timestamp || !signature || !/^\d{10,16}$/.test(timestamp)) return false;
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_MS) return false;
  const given = Buffer.from(signature, "hex");
  return secrets.filter((s) => s.length >= 32).some((secret) => {
    const expected = Buffer.from(sign(secret, timestamp, body), "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
