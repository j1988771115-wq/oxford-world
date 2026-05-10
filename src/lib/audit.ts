import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type { AdminActor } from "@/lib/admin-auth";

/**
 * Admin 動作 audit log。
 *
 * Codex review patch: metadata 必須 PII whitelist
 * - 禁存完整 HTML / recipient email list / 個資
 * - 大 string (>200 char) 自動 hash + length
 * - email array 自動 mask (count + sample masked)
 */

interface AuditLogParams {
  actor: AdminActor | { email?: string | null; role?: string; profileId?: string | null };
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

function maskEmail(email: string): string {
  const m = email.match(/^(.{1,3})([^@]*)@(.+)$/);
  if (!m) return "***";
  return `${m[1]}***@${m[3]}`;
}

function sanitizeMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      if (v.length > 500) {
        // 大 string (e.g. 完整 HTML) → hash + length
        out[`${k}_hash`] = createHash("sha256").update(v).digest("hex").slice(0, 16);
        out[`${k}_length`] = v.length;
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        // email → mask
        out[`${k}_masked`] = maskEmail(v);
      } else {
        out[k] = v;
      }
    } else if (Array.isArray(v) && v.length > 0) {
      // array of emails → count + sample masked
      const allEmails = v.every(
        (x) => typeof x === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),
      );
      if (allEmails) {
        out[`${k}_count`] = v.length;
        out[`${k}_sample_masked`] = (v as string[]).slice(0, 3).map(maskEmail);
      } else {
        out[`${k}_count`] = v.length;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return;
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      sk,
      { auth: { persistSession: false } },
    );
    const safeMetadata = sanitizeMetadata(params.metadata ?? {});
    const headers = params.request?.headers;
    await supabase.from("admin_audit_logs").insert({
      actor_email: params.actor.email ?? "anonymous",
      actor_role: (params.actor as AdminActor).role ?? "unknown",
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      metadata: safeMetadata,
      ip: headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: headers?.get("user-agent") ?? null,
    });
  } catch (e) {
    console.error("[audit] write fail:", e);
    // fail-open: audit fail 不擋 admin 動作
  }
}
