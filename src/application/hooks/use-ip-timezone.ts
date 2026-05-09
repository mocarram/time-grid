"use client";

import { useStores } from "@app/stores/store-context";
import type { IpTimezoneResponse } from "@schemas/api";
import { useEffect, useState } from "react";

export interface IpTimezoneState {
  data: IpTimezoneResponse | null;
  error: string | null;
  loading: boolean;
}

export function useIpTimezone(): IpTimezoneState {
  const { ipTimezoneClient } = useStores();
  const [state, setState] = useState<IpTimezoneState>({
    data: null,
    error: null,
    loading: true,
  });
  useEffect(() => {
    const ctl = new AbortController();
    let cancelled = false;
    void (async () => {
      const result = await ipTimezoneClient.detect(ctl.signal);
      if (cancelled) return;
      if (result.ok) {
        setState({ data: result.value, error: null, loading: false });
      } else {
        setState({ data: null, error: errorMessage(result.error), loading: false });
      }
    })();
    return () => {
      cancelled = true;
      ctl.abort();
    };
  }, [ipTimezoneClient]);
  return state;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorMessage(err: any): string {
  if (!err || typeof err !== "object") return String(err);
  if (err.kind === "http") return `http_${err.status}`;
  return err.kind ?? "unknown";
}
