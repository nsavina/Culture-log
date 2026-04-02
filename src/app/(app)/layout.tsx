import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        displayName={profile?.display_name ?? user.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-6 sm:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
