import { describe, expect, it } from "vitest";
import { buildUserMessage } from "@/lib/recommend-prompt";
import type { Entry } from "@/lib/types";

function makeEntry(overrides: Partial<Entry>): Entry {
  return {
    id: "id",
    user_id: "user",
    type: "movie",
    status: "experienced",
    title: "Untitled",
    link: null,
    rating: null,
    impression: null,
    audio_path: null,
    recommended_by: null,
    recommendation_context: null,
    enrichment: null,
    cover_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildUserMessage", () => {
  it("includes the user request when a prompt is given", () => {
    const msg = buildUserMessage([], "I'm in Lisbon, want something cozy");
    expect(msg).toContain("USER REQUEST:");
    expect(msg).toContain("I'm in Lisbon, want something cozy");
  });

  it("omits the user request section without a prompt", () => {
    expect(buildUserMessage([], null)).not.toContain("USER REQUEST:");
  });

  it("lists experienced entries with rating and enrichment details", () => {
    const entries = [
      makeEntry({
        title: "Dune",
        rating: 9,
        enrichment: { director: "Denis Villeneuve", genre: ["sci-fi"] },
      }),
    ];
    const msg = buildUserMessage(entries, null);
    expect(msg).toContain("EXPERIENCED ENTRIES (rated):");
    expect(msg).toContain('- movie: "Dune", (9/10), genres: sci-fi, director: Denis Villeneuve');
  });

  it("lists wishlist entries separately", () => {
    const entries = [makeEntry({ title: "Solaris", status: "wishlist", type: "book" })];
    const msg = buildUserMessage(entries, null);
    expect(msg).toContain("WISHLIST (interested but not experienced yet):");
    expect(msg).toContain('- book: "Solaris"');
  });

  it("aggregates average ratings and top genres", () => {
    const entries = [
      makeEntry({ title: "A", rating: 8, enrichment: { genre: ["sci-fi", "drama"] } }),
      makeEntry({ title: "B", rating: 6, enrichment: { genre: ["sci-fi"] } }),
    ];
    const msg = buildUserMessage(entries, null);
    expect(msg).toContain("Average ratings by type: movie: 7.0");
    expect(msg).toContain("Top genres: sci-fi (2), drama (1)");
  });
});
