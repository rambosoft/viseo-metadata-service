import { describe, expect, it } from "vitest";

import {
  buildSearchRequestFingerprint,
  canServePageFromLocalIndex,
  normalizeSearchText,
  tokenizeSearchText,
} from "../../src/application/search/media-search-helpers.js";

describe("media search helpers", () => {
  it("normalizes and tokenizes search text deterministically", () => {
    expect(normalizeSearchText("  Fight-Club!  ")).toBe("fight club");
    expect(tokenizeSearchText("Fight Fight Club")).toEqual(["fight", "club"]);
  });

  it("builds a deterministic search fingerprint", () => {
    const first = buildSearchRequestFingerprint({
      tenantId: "tenant_1",
      q: "Fight Club",
      lang: "en" as never,
      page: 1,
      pageSize: 20
    });
    const second = buildSearchRequestFingerprint({
      tenantId: "tenant_1",
      q: "fight club",
      lang: "en" as never,
      page: 1,
      pageSize: 20
    });

    expect(first).toBe(second);
  });

  it("detects when the local index can satisfy a requested page", () => {
    expect(
      canServePageFromLocalIndex(
        {
          items: [{ mediaId: "med_1" } as never],
          total: 1,
          source: "index"
        },
        {
          q: "fight",
          lang: "en" as never,
          page: 1,
          pageSize: 20
        }
      )
    ).toBe(true);

    expect(
      canServePageFromLocalIndex(
        {
          items: [],
          total: 0,
          source: "index"
        },
        {
          q: "fight",
          lang: "en" as never,
          page: 1,
          pageSize: 20
        }
      )
    ).toBe(false);
  });
});
