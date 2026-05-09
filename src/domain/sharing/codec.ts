// URL share encoding/decoding for v2 (opaque base64url payload), with v1
// migration. Failures return null, never throw.

import { LIMITS, SHARE_URL } from "@config/index";
import {
  ShareSnapshotV2Schema,
  type ShareSnapshotV2,
} from "@schemas/share";
import { isValidIanaZone } from "@domain/timezone/iana";

const PARAM_VERSION = SHARE_URL.paramVersion;
const PARAM_PAYLOAD = SHARE_URL.paramPayload;

function toBase64Url(bytes: Uint8Array): string {
  let b64: string;
  if (typeof Buffer !== "undefined") {
    b64 = Buffer.from(bytes).toString("base64");
  } else {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  try {
    if (typeof Buffer !== "undefined") {
      return Uint8Array.from(Buffer.from(b64 + pad, "base64"));
    }
    const bin = atob(b64 + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input, (key, value) => {
      // Reject prototype-pollution attempts.
      if (key === "__proto__" || key === "prototype" || key === "constructor") return undefined;
      return value;
    });
  } catch {
    return null;
  }
}

export interface EncodeShareOptions {
  /** When true, allow truncating zones to fit within the URL byte budget. */
  truncateOnOverflow?: boolean;
}

export interface EncodedShare {
  url: string;
  truncated: number; // number of zones that were dropped
}

/**
 * Encode a snapshot into a URL. If the encoded URL would exceed the byte
 * budget, drops zones from the end until it fits (when `truncateOnOverflow`).
 */
export function encodeShareSnapshot(
  snapshot: ShareSnapshotV2,
  origin: string,
  pathname: string,
  opts: EncodeShareOptions = { truncateOnOverflow: true },
): EncodedShare {
  let working: ShareSnapshotV2 = { ...snapshot, zones: [...snapshot.zones] };
  let truncated = 0;
  let url = buildUrl(working, origin, pathname);
  if (opts.truncateOnOverflow) {
    while (url.length > LIMITS.shareUrlMaxBytes && working.zones.length > 0) {
      working = { ...working, zones: working.zones.slice(0, -1) };
      truncated++;
      url = buildUrl(working, origin, pathname);
    }
  }
  return { url, truncated };
}

function buildUrl(snapshot: ShareSnapshotV2, origin: string, pathname: string): string {
  const json = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(json);
  const payload = toBase64Url(bytes);
  return `${origin}${pathname}?${PARAM_VERSION}=${SHARE_URL.version}&${PARAM_PAYLOAD}=${payload}`;
}

/**
 * Decode a URL's query params into a validated v2 snapshot. v1 legacy URLs
 * are migrated. Any failure returns null.
 */
export function decodeShareParams(params: URLSearchParams): ShareSnapshotV2 | null {
  const v = params.get(PARAM_VERSION);
  if (v === String(SHARE_URL.version)) {
    return decodeV2(params);
  }
  // Try v1 legacy.
  return decodeV1(params);
}

function decodeV2(params: URLSearchParams): ShareSnapshotV2 | null {
  const payload = params.get(PARAM_PAYLOAD);
  if (!payload) return null;
  const bytes = fromBase64Url(payload);
  if (!bytes) return null;
  const json = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!json) return null;
  const parsed = safeJsonParse(json);
  if (!parsed) return null;
  const result = ShareSnapshotV2Schema.safeParse(parsed);
  return result.success ? sanitizeSnapshot(result.data) : null;
}

function decodeV1(params: URLSearchParams): ShareSnapshotV2 | null {
  const ref = params.get("ref");
  const time = params.get("time");
  const zones = params.get("zones");
  const workspace = params.get("workspace");
  const modified = params.get("modified") === "true";

  if (!ref && !time && !zones && !workspace) return null;

  let refField: ShareSnapshotV2["ref"] | null = null;
  if (ref) {
    const parts = ref.split(",");
    if (parts.length >= 3) {
      const [city, country, timezone] = parts;
      if (city && country && timezone && isValidIanaZone(decodeURIComponent(timezone))) {
        refField = {
          city: decodeURIComponent(city),
          country: decodeURIComponent(country),
          timezone: decodeURIComponent(timezone),
        };
      }
    }
  }
  if (!refField) return null;

  let zonesField: ShareSnapshotV2["zones"] = [];
  if (zones) {
    const decoded = safeJsonParse(decodeURIComponent(zones));
    if (Array.isArray(decoded)) {
      zonesField = decoded
        .map((z) => {
          if (!z || typeof z !== "object") return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const o = z as any;
          if (typeof o.city !== "string" || typeof o.country !== "string") return null;
          if (typeof o.timezone !== "string" || !isValidIanaZone(o.timezone)) return null;
          return {
            city: o.city,
            country: o.country,
            timezone: o.timezone,
            kind: "city" as const,
          };
        })
        .filter((z): z is NonNullable<typeof z> => z !== null);
    }
  }

  let instantUtc = new Date().toISOString();
  if (time) {
    const parsed = new Date(decodeURIComponent(time));
    if (!Number.isNaN(parsed.getTime())) instantUtc = parsed.toISOString();
  }

  let workspaceField: ShareSnapshotV2["workspace"];
  if (workspace) {
    const decoded = safeJsonParse(decodeURIComponent(workspace));
    if (decoded && typeof decoded === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = decoded as any;
      const candidate = {
        name: typeof o.name === "string" ? o.name : "Shared",
        description: typeof o.description === "string" ? o.description : undefined,
        color: typeof o.color === "string" ? o.color : "blue",
        icon: typeof o.icon === "string" ? o.icon : "Globe",
      };
      const validated = ShareSnapshotV2Schema.shape.workspace.safeParse(candidate);
      if (validated.success) workspaceField = validated.data;
    }
  }

  const candidate: ShareSnapshotV2 = {
    v: 2,
    ref: refField,
    zones: zonesField,
    instantUtc,
    isModified: modified,
    workspace: workspaceField,
  };
  const result = ShareSnapshotV2Schema.safeParse(candidate);
  return result.success ? sanitizeSnapshot(result.data) : null;
}

function sanitizeSnapshot(snapshot: ShareSnapshotV2): ShareSnapshotV2 {
  // Drop zones with bad IANA names. Cap at the workspace limit.
  const filtered = snapshot.zones
    .filter((z) => isValidIanaZone(z.timezone))
    .slice(0, LIMITS.timezonesPerWorkspaceMax);
  return { ...snapshot, zones: filtered };
}
