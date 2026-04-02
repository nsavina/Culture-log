import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
import { TasteSummary } from "@/components/taste-summary";
import { RecommendationsSection } from "@/components/recommendations-section";
import { Separator } from "@/components/ui/separator";
import type { Entry, Recommendation } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile, entries, and recommendations in parallel
  const [profileResult, entriesResult, recsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, prompt")
      .eq("id", user.id)
      .single(),
    supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_type"),
  ]);

  const profile = profileResult.data;
  const entries = (entriesResult.data ?? []) as Entry[];
  const recommendations = (recsResult.data ?? []) as Recommendation[];
  const experiencedCount = entries.filter((e) => e.status === "experienced").length;

  // Build a map of existing entry titles (lowercased) → entry id, for marking added recommendations
  const addedEntries = new Map<string, string>();
  for (const e of entries) {
    const key = `${e.type}:${e.title.toLowerCase()}`;
    addedEntries.set(key, e.id);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1: What are you looking for? */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">What are you looking for?</h2>
        <p className="text-xs text-muted-foreground">
          Describe your context and what you want — recommendations will match your request.
        </p>
        <ProfileForm
          userId={user.id}
          initialPrompt={profile?.prompt ?? ""}
        />
      </section>

      <Separator />

      {/* Section 2: Taste Summary */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Your Taste</h2>
        <TasteSummary entries={entries} />
      </section>

      <Separator />

      {/* Section 3: AI Recommendations */}
      <section className="flex flex-col gap-3 pb-20">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <RecommendationsSection
          initialRecommendations={recommendations}
          experiencedCount={experiencedCount}
          addedEntries={Object.fromEntries(addedEntries)}
        />
      </section>
    </div>
  );
}
