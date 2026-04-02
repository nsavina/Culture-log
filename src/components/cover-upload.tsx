"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

interface CoverUploadProps {
  entryId: string;
  userId: string;
  currentCoverUrl: string | null;
  /** Fallback image from enrichment */
  enrichmentImageUrl: string | null;
}

export function CoverUpload({
  entryId,
  userId,
  currentCoverUrl,
  enrichmentImageUrl,
}: CoverUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl);

  const displayUrl = coverUrl ?? enrichmentImageUrl;
  const hasCustomCover = !!coverUrl;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    setUploading(true);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${entryId}.${ext}`;

    // Upload to storage (upsert to overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from("covers")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload image");
      console.error("Upload error:", uploadError.message);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("covers")
      .getPublicUrl(path);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Save to entry
    const { error: updateError } = await supabase
      .from("entries")
      .update({ cover_url: publicUrl })
      .eq("id", entryId)
      .eq("user_id", userId);

    if (updateError) {
      toast.error("Failed to save cover");
      console.error("Update error:", updateError.message);
    } else {
      setCoverUrl(publicUrl);
      toast.success("Cover updated");
      router.refresh();
    }

    setUploading(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemove() {
    const supabase = createClient();
    if (!supabase || !coverUrl) return;

    setRemoving(true);

    // Delete from storage
    const path = `${userId}/${entryId}`;
    // List files to find exact filename (extension might vary)
    const { data: files } = await supabase.storage.from("covers").list(userId, {
      search: entryId,
    });
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from("covers").remove(paths);
    }

    // Clear from entry
    const { error } = await supabase
      .from("entries")
      .update({ cover_url: null })
      .eq("id", entryId)
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to remove cover");
    } else {
      setCoverUrl(null);
      toast.success("Cover removed");
      router.refresh();
    }

    setRemoving(false);
  }

  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {displayUrl ? (
        // Has image — show with overlay controls
        <div className="relative h-36 w-24 shrink-0 overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />

          {/* Overlay on hover */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-[10px] uppercase tracking-wider text-white/80 hover:text-white"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Change"
              )}
            </button>
            {hasCustomCover && (
              <button
                onClick={handleRemove}
                disabled={removing}
                className="text-[10px] uppercase tracking-wider text-white/60 hover:text-white"
              >
                {removing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Remove"
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        // No image — show upload button
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-36 w-24 shrink-0 flex-col items-center justify-center gap-1.5 border border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5 text-muted-foreground/50" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">
                Add cover
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
