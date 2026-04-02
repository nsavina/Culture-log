import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Entry } from "@/lib/types";
import { EntryDetail } from "@/components/entry-detail";

interface EntryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entry } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!entry) notFound();

  return <EntryDetail entry={entry as Entry} userId={user.id} />;
}
