"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface ProfileFormProps {
  userId: string;
  initialPrompt: string;
}

export function ProfileForm({ userId, initialPrompt }: ProfileFormProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const supabase = createClient();
    if (!supabase) {
      toast.error("Database unavailable");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ prompt: prompt.trim() || null })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to save");
      console.error("Profile save error:", error.message);
    } else {
      toast.success("Saved");
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="I live in Barcelona, looking for weekend activities. I love arthouse cinema and specialty coffee. Suggest something local..."
        rows={4}
        className="resize-none text-sm"
      />
      <Button type="submit" disabled={saving} className="self-start" size="sm">
        {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Save
      </Button>
    </form>
  );
}
