import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/cities", ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    if (q.length < 2) return HttpResponse.json({ cities: [] });
    return HttpResponse.json({
      cities: [
        {
          id: "1",
          city: "Tokyo",
          country: "Japan",
          countryCode: "JP",
          latitude: 35.6762,
          longitude: 139.6503,
          displayName: "Tokyo, Japan",
          placeType: "City",
        },
      ],
    });
  }),
  http.get("/api/timezone", ({ request }) => {
    const url = new URL(request.url);
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    if (!lat || !lng) {
      return HttpResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }
    return HttpResponse.json({
      city: "Tokyo",
      country: "Japan",
      timezone: "Asia/Tokyo",
      offsetMinutes: 540,
    });
  }),
  http.get("/api/ip-timezone", () => {
    return HttpResponse.json({
      city: "London",
      country: "United Kingdom",
      timezone: "Europe/London",
      source: "ip",
    });
  }),
];
