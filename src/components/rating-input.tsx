"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingInputProps {
  value: number | null;
  onChange: (rating: number | null) => void;
}

export function RatingInput({ value, onChange }: RatingInputProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          className="rounded p-0.5 transition-colors hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn(
              "h-5 w-5",
              value !== null && star <= value
                ? "fill-amber-500 text-amber-500"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
      {value !== null && (
        <span className="ml-1 text-sm text-muted-foreground">{value}/10</span>
      )}
    </div>
  );
}
