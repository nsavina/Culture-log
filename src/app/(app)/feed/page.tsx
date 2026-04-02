import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/button-link";
import { EntryCard } from "@/components/entry-card";
import { FilterBar } from "@/components/filter-bar";
import type { Entry, EntryType, EntryStatus } from "@/lib/types";

interface FeedPageProps {
  searchParams: Promise<{ type?: string; status?: string }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const typeFilter = params.type as EntryType | undefined;
  const statusFilter = params.status as EntryStatus | undefined;

  let query = supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: entries } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-tight">Feed</h1>
        <ButtonLink href="/entry/new" variant="outline" size="sm">
          + Add
        </ButtonLink>
      </div>

      <FilterBar />

      {entries && entries.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(entries as Entry[]).map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">No entries yet.</p>
          <ButtonLink href="/entry/new" variant="outline">
            Add your first entry
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
