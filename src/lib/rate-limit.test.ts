import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

const OPTS = { limit: 3, windowMs: 60_000 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests under the limit", () => {
    const t = 1_000_000;
    expect(checkRateLimit("u1", OPTS, t).allowed).toBe(true);
    expect(checkRateLimit("u1", OPTS, t + 1).allowed).toBe(true);
    expect(checkRateLimit("u1", OPTS, t + 2).allowed).toBe(true);
  });

  it("blocks the request over the limit and reports retry-after", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("u1", OPTS, t + i);
    }
    const result = checkRateLimit("u1", OPTS, t + 30_000);
    expect(result.allowed).toBe(false);
    // Oldest request at t expires at t + 60s → 30s left
    expect(result.retryAfterSeconds).toBe(30);
  });

  it("allows again after the window slides past old requests", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("u1", OPTS, t + i);
    }
    expect(checkRateLimit("u1", OPTS, t + 59_000).allowed).toBe(false);
    expect(checkRateLimit("u1", OPTS, t + 61_000).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("u1", OPTS, t + i);
    }
    expect(checkRateLimit("u1", OPTS, t + 10).allowed).toBe(false);
    expect(checkRateLimit("u2", OPTS, t + 10).allowed).toBe(true);
  });

  it("returns retryAfterSeconds of at least 1 when blocked", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) {
      checkRateLimit("u1", OPTS, t);
    }
    const result = checkRateLimit("u1", OPTS, t + 59_999);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
