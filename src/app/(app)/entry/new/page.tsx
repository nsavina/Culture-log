import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EntryForm } from "@/components/entry-form";
import type { EntryType } from "@/lib/types";

const VALID_TYPES = new Set(["movie", "series", "book", "cafe", "restaurant_dish"]);

interface NewEntryPageProps {
  searchParams: Promise<{ title?: string; type?: string }>;
}

export default async function NewEntryPage({ searchParams }: NewEntryPageProps) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const defaultTitle = params.title ?? undefined;
  const defaultType = VALID_TYPES.has(params.type ?? "")
    ? (params.type as EntryType)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">New Entry</h1>
      <EntryForm
        userId={user.id}
        defaultTitle={defaultTitle}
        defaultType={defaultType}
      />
    </div>
  );
}
