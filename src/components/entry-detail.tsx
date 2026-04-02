"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Entry, Enrichment } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS } from "@/lib/types";
import { EntryForm } from "@/components/entry-form";
import { EnrichmentDisplay } from "@/components/enrichment-display";
import { CoverUpload } from "@/components/cover-upload";

interface EntryDetailProps {
  entry: Entry;
  userId: string;
}

export function EntryDetail({ entry, userId }: EntryDetailProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichment, setEnrichment] = useState<Enrichment | null>(entry.enrichment);

  // Auto-enrich on first open if no enrichment data
  useEffect(() => {
    if (!enrichment && !enriching) {
      handleEnrich();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete() {
    const supabase = createClient();
    if (!supabase) return;

    setDeleting(true);

    // Clean up cover from storage if exists
    if (entry.cover_url) {
      const { data: files } = await supabase.storage.from("covers").list(userId, {
        search: entry.id,
      });
      if (files && files.length > 0) {
        await supabase.storage.from("covers").remove(files.map((f) => `${userId}/${f.name}`));
      }
    }

    const { error } = await supabase.from("entries").delete().eq("id", entry.id).eq("user_id", userId);

    if (error) {
      toast.error("Failed to delete entry");
      setDeleting(false);
      return;
    }

    toast.success("Entry deleted");
    router.push("/feed");
    router.refresh();
  }

  async function handleEnrich() {
    setEnriching(true);
    try {
      const res = await fetch("/api/ai/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: entry.id,
          title: entry.title,
          type: entry.type,
          link: entry.link,
          impression: entry.impression,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Enrichment failed");
        setEnriching(false);
        return;
      }

      const { enrichment: newEnrichment } = await res.json();
      setEnrichment(newEnrichment);
      toast.success("Details loaded");
    } catch {
      toast.error("Enrichment failed");
    }
    setEnriching(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(false)}
            className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
            Back
          </button>
        </div>
        <h1 className="text-2xl font-bold">Edit Entry</h1>
        <EntryForm entry={entry} userId={userId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.push("/feed")}
        className="self-start text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
        Feed
      </button>

      <div className="flex flex-col gap-6">
        {/* Title + Rating */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-snug">{entry.title}</h1>
          {entry.rating && (
            <div className="flex shrink-0 items-center gap-1 pt-1">
              <Star className="h-4 w-4 fill-current text-foreground" />
              <span className="text-lg font-light">{entry.rating}</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider border-b pb-4">
          <span className={ENTRY_TYPE_COLORS[entry.type]}>
            {ENTRY_TYPE_LABELS[entry.type]}
          </span>
          <span className="text-muted-foreground">
            {entry.status === "experienced" ? "Experienced" : "Wishlist"}
          </span>
        </div>

        {/* Enrichment + Cover */}
        {enrichment ? (
          <EnrichmentDisplay
            enrichment={enrichment}
            type={entry.type}
            coverUpload={
              <CoverUpload
                entryId={entry.id}
                userId={userId}
                currentCoverUrl={entry.cover_url}
                enrichmentImageUrl={(() => {
                  const e = enrichment as Record<string, unknown>;
                  return (e.poster_url ?? e.cover_url ?? e.photo_url) as string | null ?? null;
                })()}
              />
            }
          />
        ) : (
          <div className="flex gap-5 border-b pb-4">
            <CoverUpload
              entryId={entry.id}
              userId={userId}
              currentCoverUrl={entry.cover_url}
              enrichmentImageUrl={null}
            />
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {enriching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {enriching ? "Loading details..." : "Load details via AI"}
            </button>
          </div>
        )}

        {/* Link */}
        {entry.link && (
          <div className="border-b pb-4">
            <h3 className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              Link
            </h3>
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {new URL(entry.link).hostname}
            </a>
          </div>
        )}

        {/* Impression */}
        {entry.impression && (
          <div className="border-b pb-4">
            <h3 className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              Impression
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.impression}</p>
          </div>
        )}

        {/* Recommendation */}
        {(entry.recommended_by || entry.recommendation_context) && (
          <div className="border-b pb-4">
            <h3 className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              Recommendation
            </h3>
            <p className="text-sm">
              {entry.recommended_by && <>By {entry.recommended_by}</>}
              {entry.recommended_by && entry.recommendation_context && " — "}
              {entry.recommendation_context}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit
          </button>

          {enrichment && (
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {enriching ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Re-enrich
            </button>
          )}

          <Dialog>
            <DialogTrigger className="text-[11px] uppercase tracking-[0.15em] text-destructive hover:text-destructive/80 transition-colors">
              Delete
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete entry?</DialogTitle>
                <DialogDescription>
                  This will permanently delete &quot;{entry.title}&quot;. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
