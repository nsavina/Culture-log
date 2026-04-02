import { ExternalLink, Star } from "lucide-react";
import type { EntryType, Enrichment } from "@/lib/types";

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  const display = Array.isArray(value) ? value.join(", ") : String(value);
  if (!display) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{display}</span>
    </div>
  );
}

function LinkField({ label, url, text }: { label: string; url: string; text?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        {text ?? new URL(url).hostname}
      </a>
    </div>
  );
}

interface EnrichmentDisplayProps {
  enrichment: Enrichment;
  type: EntryType;
  /** Optional slot for cover upload component — replaces the static image */
  coverUpload?: React.ReactNode;
}

export function EnrichmentDisplay({ enrichment, type, coverUpload }: EnrichmentDisplayProps) {
  const e = enrichment as Record<string, unknown>;
  const imageUrl = (e.poster_url ?? e.cover_url ?? e.photo_url) as string | undefined;
  const isMedia = type === "movie" || type === "series";
  const isBook = type === "book";
  const isPlace = type === "cafe" || type === "restaurant_dish";

  return (
    <div className="border-b pb-5">
      <h3 className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
        Details
      </h3>

      <div className="flex gap-5">
        {coverUpload ? (
          coverUpload
        ) : imageUrl ? (
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-36 w-24 object-cover bg-muted" />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 min-w-0">
          {isMedia ? (
            <>
              <Field label="Director" value={e.director} />
              <Field label="Year" value={e.year} />
              <Field label="Genre" value={e.genre} />
              {e.imdb_rating ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    IMDB
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    {String(e.imdb_rating)}/10
                  </span>
                </div>
              ) : null}
            </>
          ) : null}

          {isBook ? (
            <>
              <Field label="Author" value={e.author} />
              <Field label="Year" value={e.year} />
              <Field label="Genre" value={e.genre} />
              <Field label="Pages" value={e.pages} />
            </>
          ) : null}

          {isPlace ? (
            <>
              <Field label="Cuisine" value={e.cuisine} />
              <Field label="Price range" value={e.price_range} />
              <Field label="Address" value={e.address} />
            </>
          ) : null}

          <Field label="Description" value={e.description} />

          {typeof e.imdb_url === "string" ? (
            <LinkField label="IMDB" url={e.imdb_url} text="View on IMDB" />
          ) : null}
          {typeof e.google_maps_url === "string" ? (
            <LinkField label="Google Maps" url={e.google_maps_url} text="View on Maps" />
          ) : null}
        </div>
      </div>

      {/* Google Maps embed for places — no API key needed */}
      {isPlace && typeof e.address === "string" && e.address.length > 0 && (
        <div className="mt-4">
          <iframe
            title="Map"
            width="100%"
            height="200"
            style={{ border: 0, borderRadius: 8 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(e.address as string)}&output=embed`}
          />
        </div>
      )}
    </div>
  );
}
