"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { Message } from "@/lib/types";

const POLL_INTERVAL_MS = 3500;

export function ChatPanel({
  conversationId,
  currentUserId,
  counterpartName,
}: {
  conversationId: string;
  currentUserId: string;
  counterpartName: string;
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch {
      // offline sesaat — polling berikutnya mencoba lagi
    }
  }, [conversationId]);

  useEffect(() => {
    // setState terjadi asinkron setelah fetch — aman dari cascading render.
    const initial = setTimeout(() => void fetchMessages(), 0);
    const timer = setInterval(() => void fetchMessages(), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (!messages) return;
    bottomRef.current?.scrollIntoView({
      behavior: firstLoad.current ? "auto" : "smooth",
      block: "end",
    });
    firstLoad.current = false;
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Gagal mengirim pesan.");
        return;
      }
      setDraft("");
      await fetchMessages();
    } catch {
      toast.error("Jaringan bermasalah. Coba lagi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft lg:h-[60vh]">
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {messages === null ? (
          <div className="space-y-3">
            {[64, 40, 56].map((w, i) => (
              <div
                key={i}
                className={cn(
                  "animate-pulse rounded-2xl bg-slate-100",
                  i % 2 ? "ml-auto" : "",
                )}
                style={{ width: `${w}%`, height: 44 }}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-slate-600">
              Belum ada pesan
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              Mulai atur serah terima — contoh: “Saya bisa mengambil barang
              besok, di mana kita bertemu?”
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                    mine
                      ? "rounded-br-md bg-brand-600 text-white"
                      : "rounded-bl-md bg-slate-100 text-slate-800",
                  )}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[10px] font-bold text-slate-500">
                      {counterpartName}
                    </p>
                  )}
                  <p className="whitespace-pre-line break-words">
                    {message.content}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      mine ? "text-brand-100/80" : "text-slate-400",
                    )}
                  >
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-slate-100 p-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Tulis pesan… (Enter untuk kirim)"
          className="max-h-28 flex-1 resize-none rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
          aria-label="Kirim pesan"
        >
          <SendHorizonal className="size-4.5" />
        </button>
      </form>
    </div>
  );
}
