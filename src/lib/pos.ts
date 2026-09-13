import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Pos } from "@/lib/types";

export async function getActivePos(): Promise<Pos[]> {
  const { data } = await supabaseAdmin()
    .from("pos")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return (data as Pos[] | null) ?? [];
}

export async function getPos(id: string): Promise<Pos | null> {
  const { data } = await supabaseAdmin()
    .from("pos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Pos | null) ?? null;
}
