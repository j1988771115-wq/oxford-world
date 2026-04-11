import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateEmbeddings, chunkText } from "@/lib/embeddings";
import { isAdmin } from "@/lib/admin-auth";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — list all knowledge entries
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("course_content")
    .select("id, course_id, content, content_type, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — add new content with auto-chunking + embedding
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { content, content_type, course_id, title } = await req.json();

  if (!content || !content_type) {
    return NextResponse.json(
      { error: "content and content_type are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Chunk the content
  const chunks = chunkText(content);

  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks);

  // Insert all chunks with embeddings
  const rows = chunks.map((chunk, i) => ({
    content: title ? `[${title}]\n${chunk}` : chunk,
    content_type,
    course_id: course_id || null,
    embedding: JSON.stringify(embeddings[i]),
  }));

  const { error } = await supabase.from("course_content").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    chunks: chunks.length,
    message: `已新增 ${chunks.length} 個知識片段`,
  });
}

// DELETE — remove a knowledge entry
export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("course_content")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
