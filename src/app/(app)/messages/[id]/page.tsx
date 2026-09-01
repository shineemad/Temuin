import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { getProfile, requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Claim, Conversation, Match } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { ChatPanel } from "@/components/chat-panel";

export const metadata: Metadata = { title: "Secure Communication" };

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: convRaw } = await db
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!convRaw) notFound();
  const conversation = convRaw as Conversation;
  if (conversation.owner_id !== user.id && conversation.finder_id !== user.id)
    notFound();

  const counterpartId =
    conversation.owner_id === user.id
      ? conversation.finder_id
      : conversation.owner_id;
  const counterpart = await getProfile(counterpartId);
  const counterpartName = counterpart?.full_name || "Pengguna Temuin";
  const myRole = conversation.owner_id === user.id ? "Pemilik" : "Penemu";

  // Konteks klaim untuk header.
  const { data: claimRaw } = await db
    .from("claims")
    .select("*")
    .eq("id", conversation.claim_id)
    .maybeSingle();
  const claim = claimRaw as Claim | null;
  let itemName = "barang";
  if (claim) {
    const { data: matchRaw } = await db
      .from("matches")
      .select("*")
      .eq("id", claim.match_id)
      .maybeSingle();
    const match = matchRaw as Match | null;
    if (match) {
      const { data: lostRaw } = await db
        .from("lost_reports")
        .select("item_name")
        .eq("id", match.lost_report_id)
        .maybeSingle();
      if (lostRaw?.item_name) itemName = lostRaw.item_name as string;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-up">
      <PageHeader
        title={`Chat dengan ${conversation.owner_id === user.id ? "Penemu" : "Pemilik"}`}
        description={`Koordinasi serah terima "${itemName}" — Anda sebagai ${myRole}.`}
        action={
          claim && (
            <Link
              href={`/claims/${claim.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft className="size-4" />
              Ke Klaim
            </Link>
          )
        }
      />

      <ChatPanel
        conversationId={conversation.id}
        currentUserId={user.id}
        counterpartName={counterpartName}
      />

      <Card className="bg-slate-50/70 p-4">
        <p className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500">
          <Lock className="mt-0.5 size-4 shrink-0 text-slate-400" />
          Chat ini adalah jalur komunikasi aman Temuin. Nomor telepon dan kontak
          pribadi tidak dibagikan otomatis — bagikan hanya jika Anda merasa
          perlu dan aman. Sarankan bertemu di tempat umum (mis. pos satpam,
          customer service).
        </p>
      </Card>
    </div>
  );
}
