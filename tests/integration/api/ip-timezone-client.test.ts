import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createIpTimezoneClient } from "@infra/api/ip-timezone";
import { server } from "@test/setup/msw-server";

describe("ipTimezoneClient.detect", () => {
  const client = createIpTimezoneClient();

  it("returns parsed location", async () => {
    const r = await client.detect();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.timezone).toBe("Europe/London");
  });

  it("propagates network failure", async () => {
    server.use(http.get("/api/ip-timezone", () => HttpResponse.error()));
    const r = await client.detect();
    expect(r.ok).toBe(false);
  });

  it("rejects schema-mismatched response", async () => {
    server.use(
      http.get("/api/ip-timezone", () =>
        HttpResponse.json({ city: "X", country: "Y", timezone: "Mars/Olympus", source: "ip" }),
      ),
    );
    const r = await client.detect();
    expect(r.ok).toBe(false);
  });
});
