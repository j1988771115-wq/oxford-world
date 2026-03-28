import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS for admin operations
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  // Verify webhook signature from Clerk
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // TODO: Verify signature with svix library for production
  // For now, proceed with processing

  const payload = await req.json();
  const { type, data } = payload;

  const supabase = getAdminClient();

  switch (type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name } = data;
      const email = email_addresses?.[0]?.email_address;
      const displayName = [first_name, last_name].filter(Boolean).join(" ") || null;

      if (!email) {
        console.error("Clerk webhook: no email for user", id);
        return NextResponse.json({ error: "No email" }, { status: 400 });
      }

      const { error } = await supabase.from("profiles").upsert(
        {
          clerk_id: id,
          email,
          display_name: displayName,
          tier: "free",
        },
        { onConflict: "clerk_id" }
      );

      if (error) {
        console.error("Create profile error:", error);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      console.log("Profile created for", email);
      break;
    }

    case "user.updated": {
      const { id, email_addresses, first_name, last_name } = data;
      const email = email_addresses?.[0]?.email_address;
      const displayName = [first_name, last_name].filter(Boolean).join(" ") || null;

      await supabase
        .from("profiles")
        .update({ email, display_name: displayName })
        .eq("clerk_id", id);

      break;
    }

    case "user.deleted": {
      const { id } = data;
      await supabase.from("profiles").delete().eq("clerk_id", id);
      break;
    }
  }

  return NextResponse.json({ status: "ok" });
}
