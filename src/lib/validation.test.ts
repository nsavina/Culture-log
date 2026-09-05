import { describe, expect, it } from "vitest";
import {
  enrichRequestSchema,
  parseLinkRequestSchema,
  recommendRequestSchema,
} from "@/lib/validation";

const UUID = "6c84fb90-12c4-11e1-840d-7b25c5ee775a";

describe("enrichRequestSchema", () => {
  it("accepts a valid body", () => {
    const result = enrichRequestSchema.safeParse({
      entryId: UUID,
      title: "Dune",
      type: "movie",
      link: "https://www.imdb.com/title/tt1160419/",
      impression: "Loved it",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null link and impression (client sends nulls)", () => {
    const result = enrichRequestSchema.safeParse({
      entryId: UUID,
      title: "Dune",
      type: "movie",
      link: null,
      impression: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid entryId", () => {
    const result = enrichRequestSchema.safeParse({
      entryId: "42",
      title: "Dune",
      type: "movie",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown entry type", () => {
    const result = enrichRequestSchema.safeParse({
      entryId: UUID,
      title: "Dune",
      type: "podcast",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = enrichRequestSchema.safeParse({
      entryId: UUID,
      title: "",
      type: "movie",
    });
    expect(result.success).toBe(false);
  });
});

describe("recommendRequestSchema", () => {
  it("accepts an empty body (full generation)", () => {
    expect(recommendRequestSchema.safeParse({}).success).toBe(true);
  });

  it("accepts entryType with exclude list", () => {
    const result = recommendRequestSchema.safeParse({
      entryType: "book",
      exclude: ["Dune", "Neuromancer"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid entryType", () => {
    expect(recommendRequestSchema.safeParse({ entryType: "podcast" }).success).toBe(false);
  });

  it("rejects a non-array exclude", () => {
    expect(recommendRequestSchema.safeParse({ exclude: "Dune" }).success).toBe(false);
  });
});

describe("parseLinkRequestSchema", () => {
  it("accepts a valid URL", () => {
    expect(
      parseLinkRequestSchema.safeParse({ url: "https://www.goodreads.com/book/show/44767458" })
        .success
    ).toBe(true);
  });

  it("rejects a non-URL string", () => {
    expect(parseLinkRequestSchema.safeParse({ url: "not a url" }).success).toBe(false);
  });

  it("rejects a missing url", () => {
    expect(parseLinkRequestSchema.safeParse({}).success).toBe(false);
  });
});
