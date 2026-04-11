import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "@/lib/email";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return process.env.ADMIN_PASSWORD && token === process.env.ADMIN_PASSWORD;
}

// GET — fetch email lists stats
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const [{ count: subscriberCount }, { count: memberCount }] = await Promise.all([
    supabase.from("email_subscribers").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    subscribers: subscriberCount || 0,
    members: memberCount || 0,
  });
}

// POST — send email blast
export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { target, subject, html } = await req.json();

  if (!subject || !html) {
    return NextResponse.json({ error: "subject and html are required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let emails: string[] = [];

  if (target === "subscribers") {
    const { data } = await supabase.from("email_subscribers").select("email");
    emails = data?.map((d) => d.email) || [];
  } else if (target === "members") {
    const { data } = await supabase.from("profiles").select("email");
    emails = data?.map((d) => d.email) || [];
  } else if (target === "pro") {
    const { data } = await supabase.from("profiles").select("email").eq("tier", "pro");
    emails = data?.map((d) => d.email) || [];
  } else if (target === "all") {
    const [{ data: subs }, { data: members }] = await Promise.all([
      supabase.from("email_subscribers").select("email"),
      supabase.from("profiles").select("email"),
    ]);
    const allEmails = [
      ...(subs?.map((d) => d.email) || []),
      ...(members?.map((d) => d.email) || []),
    ];
    emails = [...new Set(allEmails)]; // deduplicate
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "沒有收件人" }, { status: 400 });
  }

  const result = await sendBatchEmails({ emails, subject, html });

  return NextResponse.json({
    ...result,
    total: emails.length,
    message: `已發送 ${result.sent} 封，失敗 ${result.failed} 封`,
  });
}
