import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface HomeProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  // Handle OAuth callback code if present (Supabase may redirect here instead of /auth/callback)
  const params = await searchParams;
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (!error) {
      redirect("/feed");
    }
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/feed");
  }

  redirect("/login");
}
