import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyNewMessage } from "@/lib/notifications";
import { messageSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import type { Conversation, Message } from "@/lib/types";

async function getParticipantContext(conversationId: string, userId: string) {
  const db = supabaseAdmin();
  const { data: convRaw } = await db
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convRaw) return null;
  const conversation = convRaw as Conversation;
  if (conversation.owner_id !== userId && conversation.finder_id !== userId)
    return null;
  return conversation;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;

  const conversation = await getParticipantContext(conversationId, user.id);
  if (!conversation)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: messagesRaw } = await supabaseAdmin()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);

  return NextResponse.json({ messages: (messagesRaw ?? []) as Message[] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`msg:${user.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Terlalu banyak pesan. Tunggu sebentar." },
      { status: 429 },
    );
  }
  const { conversationId } = await params;

  const conversation = await getParticipantContext(conversationId, user.id);
  if (!conversation)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let content: string;
  try {
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Pesan tidak valid." },
        { status: 400 },
      );
    }
    content = parsed.data.content;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: inserted, error } = await db
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content })
    .select("*")
    .single();
  if (error || !inserted) {
    return NextResponse.json(
      { error: "Gagal mengirim pesan." },
      { status: 500 },
    );
  }

  const counterpartId =
    conversation.owner_id === user.id
      ? conversation.finder_id
      : conversation.owner_id;
  const { data: senderProfile } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  await notifyNewMessage(
    counterpartId,
    conversationId,
    (senderProfile?.full_name as string) || "Pengguna",
    content.slice(0, 80),
  );

  return NextResponse.json({ message: inserted as Message });
}
