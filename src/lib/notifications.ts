import { supabaseAdmin } from "@/lib/supabase/admin";
import type { NotificationType } from "@/lib/types";

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  try {
    await supabaseAdmin()
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        body,
        link: link ?? null,
      });
  } catch (err) {
    console.error("[notify] gagal membuat notifikasi:", err);
  }
}

/** Notifikasi pesan baru: hapus notifikasi unread lama untuk percakapan sama agar tidak menumpuk. */
export async function notifyNewMessage(
  userId: string,
  conversationId: string,
  senderName: string,
  preview: string,
): Promise<void> {
  const db = supabaseAdmin();
  const link = `/messages/${conversationId}`;
  try {
    await db
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("type", "NEW_MESSAGE")
      .eq("link", link)
      .eq("read", false);
  } catch {
    // non-fatal
  }
  await notify(
    userId,
    "NEW_MESSAGE",
    "Pesan baru",
    `${senderName}: ${preview}`,
    link,
  );
}
