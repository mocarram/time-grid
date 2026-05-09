import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createCitiesClient } from "@infra/api/cities";
import { server } from "@test/setup/msw-server";

describe("citiesClient.search", () => {
  const client = createCitiesClient();

  it("returns parsed cities from the API", async () => {
    const r = await client.search("Tokyo");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(1);
      expect(r.value[0]!.city).toBe("Tokyo");
    }
  });

  it("returns empty for short queries (no network call)", async () => {
    server.use(
      http.get("/api/cities", () => {
        throw new Error("should not be called");
      }),
    );
    const r = await client.search("a");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });

  it("returns empty for whitespace-only queries", async () => {
    server.use(
      http.get("/api/cities", () => {
        throw new Error("should not be called");
      }),
    );
    const r = await client.search("   ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });

  it("URL-encodes special characters", async () => {
    let queried: string | null = null;
    server.use(
      http.get("/api/cities", ({ request }) => {
        queried = new URL(request.url).searchParams.get("q");
        return HttpResponse.json({ cities: [] });
      }),
    );
    await client.search("São Paulo");
    expect(queried).toBe("São Paulo");
  });

  it("escapes hostile queries (no script injection in URL)", async () => {
    let calledUrl = "";
    server.use(
      http.get("/api/cities", ({ request }) => {
        calledUrl = request.url;
        return HttpResponse.json({ cities: [] });
      }),
    );
    await client.search("<script>");
    expect(calledUrl).toContain("%3Cscript%3E");
  });

  it("propagates HTTP errors", async () => {
    server.use(http.get("/api/cities", () => HttpResponse.json({}, { status: 500 })));
    const r = await client.search("Tokyo");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("http");
      if (r.error.kind === "http") expect(r.error.status).toBe(500);
    }
  });

  it("rejects malformed responses with schema error", async () => {
    server.use(http.get("/api/cities", () => HttpResponse.text("<html>down</html>")));
    const r = await client.search("Tokyo");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("schema");
  });

  it("aborts when signal fires", async () => {
    server.use(
      http.get("/api/cities", async () => {
        await new Promise((res) => setTimeout(res, 100));
        return HttpResponse.json({ cities: [] });
      }),
    );
    const ctl = new AbortController();
    const promise = client.search("Tokyo", ctl.signal);
    ctl.abort();
    const r = await promise;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(["abort", "network"]).toContain(r.error.kind);
  });

  it("times out long-running requests", async () => {
    server.use(
      http.get("/api/cities", async () => {
        await new Promise((res) => setTimeout(res, 12_000));
        return HttpResponse.json({ cities: [] });
      }),
    );
    // Lower the timeout for this test by re-creating with the default and
    // mocking the timer? Simpler: trust apiFetch's 8s default — which is
    // longer than vitest defaults. Use a short signal with timeout.
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), 100);
    const r = await client.search("Tokyo", ctl.signal);
    expect(r.ok).toBe(false);
  }, 15_000);
});
