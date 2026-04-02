"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RatingInput } from "@/components/rating-input";
import type { Entry, EntryType, EntryStatus } from "@/lib/types";
import { ENTRY_TYPE_LABELS } from "@/lib/types";
import { Loader2 } from "lucide-react";

/** Fire-and-forget enrichment — don't block navigation */
function triggerEnrichment(
  entryId: string,
  title: string,
  type: EntryType,
  link: string | null,
  impression: string | null
) {
  fetch("/api/ai/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId, title, type, link, impression }),
  }).then((res) => {
    if (!res.ok) console.warn("Enrichment failed:", res.status);
  }).catch((err) => {
    console.warn("Enrichment request failed:", err);
  });
}

interface EntryFormProps {
  entry?: Entry;
  userId: string;
  defaultTitle?: string;
  defaultType?: EntryType;
}

function FormLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground"
    >
      {children}
    </label>
  );
}

export function EntryForm({ entry, userId, defaultTitle, defaultType }: EntryFormProps) {
  const router = useRouter();
  const isEditing = !!entry;

  const [type, setType] = useState<EntryType>(entry?.type ?? defaultType ?? "movie");
  const [status, setStatus] = useState<EntryStatus>(entry?.status ?? "wishlist");
  const [title, setTitle] = useState(entry?.title ?? defaultTitle ?? "");
  const [link, setLink] = useState(entry?.link ?? "");
  const [rating, setRating] = useState<number | null>(entry?.rating ?? null);
  const [impression, setImpression] = useState(entry?.impression ?? "");
  const [recommendedBy, setRecommendedBy] = useState(entry?.recommended_by ?? "");
  const [recommendationContext, setRecommendationContext] = useState(
    entry?.recommendation_context ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);

  const VALID_TYPES = new Set(["movie", "series", "book", "cafe", "restaurant_dish"]);

  async function parseLink(url: string) {
    // Only auto-fill if title is empty
    if (title.trim()) return;

    try {
      new URL(url);
    } catch {
      return; // Not a valid URL
    }

    setParsing(true);
    try {
      const res = await fetch("/api/ai/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.type && VALID_TYPES.has(data.type)) setType(data.type as EntryType);
    } catch {
      // Silently fail
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      toast.error("Database unavailable");
      return;
    }

    setSaving(true);

    const data = {
      user_id: userId,
      type,
      status,
      title: title.trim().charAt(0).toUpperCase() + title.trim().slice(1),
      link: link.trim() || null,
      rating: status === "experienced" ? rating : null,
      impression: impression.trim() || null,
      recommended_by: recommendedBy.trim() || null,
      recommendation_context: recommendationContext.trim() || null,
    };

    if (isEditing) {
      const { error } = await supabase
        .from("entries")
        .update(data)
        .eq("id", entry.id)
        .eq("user_id", userId);

      if (error) {
        toast.error("Failed to update entry");
        setSaving(false);
        return;
      }
      toast.success("Entry updated");
      triggerEnrichment(entry.id, data.title, data.type, data.link, data.impression);
      router.refresh();
      setSaving(false);
    } else {
      const { data: newEntry, error } = await supabase
        .from("entries")
        .insert(data)
        .select("id")
        .single();

      if (error || !newEntry) {
        toast.error("Failed to create entry");
        setSaving(false);
        return;
      }
      toast.success("Entry created");
      triggerEnrichment(newEntry.id, data.title, data.type, data.link, data.impression);
      router.push(`/entry/${newEntry.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <FormLabel>Type</FormLabel>
          <Select
            value={type}
            onValueChange={(v) => setType(v as EntryType)}
            items={Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(ENTRY_TYPE_LABELS) as [EntryType, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>Status</FormLabel>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as EntryStatus)}
            items={[
              { value: "wishlist", label: "Wishlist" },
              { value: "experienced", label: "Experienced" },
            ]}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wishlist">Wishlist</SelectItem>
              <SelectItem value="experienced">Experienced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FormLabel htmlFor="title">Title *</FormLabel>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Inception, Blue Bottle Coffee..."
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FormLabel htmlFor="link">Link</FormLabel>
          {parsing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <Input
          id="link"
          type="text"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (pasted) parseLink(pasted);
          }}
          onBlur={() => {
            if (link.trim()) parseLink(link.trim());
          }}
          placeholder="Paste IMDB, Google Maps, or any URL"
        />
      </div>

      {status === "experienced" && (
        <div className="flex flex-col gap-2">
          <FormLabel>Rating</FormLabel>
          <RatingInput value={rating} onChange={setRating} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <FormLabel htmlFor="impression">Impression</FormLabel>
        <Textarea
          id="impression"
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          placeholder="What did you think?"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <FormLabel htmlFor="recommended_by">Recommended by</FormLabel>
          <Input
            id="recommended_by"
            value={recommendedBy}
            onChange={(e) => setRecommendedBy(e.target.value)}
            placeholder="Who suggested it?"
          />
        </div>
        <div className="flex flex-col gap-2">
          <FormLabel htmlFor="recommendation_context">How you found it</FormLabel>
          <Input
            id="recommendation_context"
            value={recommendationContext}
            onChange={(e) => setRecommendationContext(e.target.value)}
            placeholder="Podcast, friend, etc."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
