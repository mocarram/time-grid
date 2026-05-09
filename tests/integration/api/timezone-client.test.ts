import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createTimezoneClient } from "@infra/api/timezone";
import { server } from "@test/setup/msw-server";

describe("timezoneClient.resolve", () => {
  const client = createTimezoneClient();

  it("returns parsed timezone for valid coordinates", async () => {
    const r = await client.resolve(35.6762, 139.6503);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.timezone).toBe("Asia/Tokyo");
      expect(r.value.offsetMinutes).toBe(540);
    }
  });

  it("propagates 400 when API rejects coordinates", async () => {
    server.use(
      http.get("/api/timezone", () =>
        HttpResponse.json({ error: "Missing coordinates" }, { status: 400 }),
      ),
    );
    const r = await client.resolve(0, 0);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === "http") expect(r.error.status).toBe(400);
  });

  it("rejects malformed responses", async () => {
    server.use(http.get("/api/timezone", () => HttpResponse.json({ city: "x" })));
    const r = await client.resolve(0, 0);
    expect(r.ok).toBe(false);
  });
});
