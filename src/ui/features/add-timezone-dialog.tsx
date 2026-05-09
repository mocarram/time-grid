"use client";

import { useStores } from "@app/stores/store-context";
import { LIMITS } from "@config/index";
import { TIMEZONE_ABBREVIATIONS } from "@data/abbreviations";
import { POPULAR_CITIES } from "@data/popular-cities";
import { formatOffsetGmt, offsetMinutesAt } from "@domain/timezone/offset";
import { buildTimezoneData } from "@domain/workspace/operations";
import type { CitySearchResult } from "@schemas/api";
import type { TimezoneData } from "@schemas/timezone";
import { Clock, Globe, Loader2, MapPin, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddTimezoneDialogProps {
  existingTimezones: TimezoneData[];
  onAdd: (timezone: TimezoneData) => boolean;
}

export function AddTimezoneDialog({ existingTimezones, onAdd }: AddTimezoneDialogProps) {
  const { citiesClient, timezoneClient } = useStores();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"cities" | "abbreviations">("cities");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const abbrInputRef = useRef<HTMLInputElement>(null);

  const isExistingCity = useCallback(
    (city: string, country: string) =>
      existingTimezones.some(
        (e) =>
          e.city.toLowerCase() === city.toLowerCase() &&
          e.country.toLowerCase() === country.toLowerCase() &&
          e.id !== "local",
      ),
    [existingTimezones],
  );

  // Debounced search
  useEffect(() => {
    if (tab !== "cities") {
      setResults([]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < LIMITS.searchMinChars) {
      setResults([]);
      setError(null);
      return;
    }
    inflight.current?.abort();
    const ctl = new AbortController();
    inflight.current = ctl;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      const result = await citiesClient.search(trimmed, ctl.signal);
      if (ctl.signal.aborted) return;
      setIsSearching(false);
      if (result.ok) {
        setResults(result.value);
      } else if (result.error.kind !== "abort") {
        setResults([]);
        setError("Couldn't fetch cities. Try again.");
      }
    }, LIMITS.searchDebounceMs);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [query, tab, citiesClient]);

  // Focus on open / tab change
  useEffect(() => {
    if (!open) return;
    const target = tab === "cities" ? cityInputRef.current : abbrInputRef.current;
    const t = setTimeout(() => target?.focus(), 100);
    return () => clearTimeout(t);
  }, [open, tab]);

  const filteredPopular = POPULAR_CITIES.filter(
    (city) =>
      !isExistingCity(city.city, city.country) &&
      (city.city.toLowerCase().includes(query.toLowerCase()) ||
        city.country.toLowerCase().includes(query.toLowerCase())),
  );

  const filteredAbbreviations = TIMEZONE_ABBREVIATIONS.filter((abbr) => {
    const matches =
      abbr.abbreviation.toLowerCase().includes(query.toLowerCase()) ||
      abbr.name.toLowerCase().includes(query.toLowerCase()) ||
      abbr.region.toLowerCase().includes(query.toLowerCase());
    const exists = existingTimezones.some(
      (t) => t.kind === "abbreviation" && t.timezone === abbr.timezone,
    );
    return matches && !exists;
  });

  const handleAddPopular = (city: (typeof POPULAR_CITIES)[number]) => {
    const tz = buildTimezoneData({
      city: city.city,
      country: city.country,
      timezone: city.timezone,
    });
    if (onAdd(tz)) {
      setOpen(false);
      setQuery("");
    }
  };

  const handleAddSearchResult = async (city: CitySearchResult) => {
    if (isExistingCity(city.city, city.country)) return;
    setIsSearching(true);
    const result = await timezoneClient.resolve(city.latitude, city.longitude);
    setIsSearching(false);
    if (!result.ok) {
      setError("Couldn't resolve timezone. Try a different city.");
      return;
    }
    const tz = buildTimezoneData({
      city: city.city,
      country: city.country,
      timezone: result.value.timezone,
    });
    if (onAdd(tz)) {
      setOpen(false);
      setQuery("");
      setResults([]);
    }
  };

  const handleAddAbbreviation = (abbr: (typeof TIMEZONE_ABBREVIATIONS)[number]) => {
    const tz = buildTimezoneData({
      city: abbr.abbreviation,
      country: abbr.region,
      timezone: abbr.timezone,
      kind: "abbreviation",
      abbreviation: abbr.abbreviation,
      region: abbr.region,
    });
    if (onAdd(tz)) {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="glass-button hover:glow group h-14 w-14 rounded-full shadow-2xl"
          aria-label="Add timezone"
          title="Add timezone"
        >
          <Plus className="h-6 w-6 text-blue-300" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-light">
            <Globe className="h-5 w-5 text-blue-400" aria-hidden="true" />
            Add Timezone
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(t) => setTab(t as "cities" | "abbreviations")}>
          <TabsList className="grid w-full grid-cols-2 border border-white/10 bg-white/5">
            <TabsTrigger
              value="cities"
              className="text-slate-400 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
            >
              <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
              Cities
            </TabsTrigger>
            <TabsTrigger
              value="abbreviations"
              className="text-slate-400 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
            >
              <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
              Time Zones
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              {isSearching && tab === "cities" ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              )}
            </div>
            <Input
              ref={tab === "cities" ? cityInputRef : abbrInputRef}
              placeholder={
                tab === "cities"
                  ? "Search for a city…"
                  : "Search time zones (PST, EST, GMT…)"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="glass-input h-12 rounded-xl pl-12 text-white placeholder:text-slate-500"
              aria-label={tab === "cities" ? "Search cities" : "Search time zones"}
            />
          </div>

          {error && (
            <div role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <TabsContent value="cities" className="mt-4">
            <div className="scrollbar-thin scrollbar-thumb-white/10 h-60 space-y-3 overflow-y-auto sm:h-80">
              {results.length > 0 && (
                <>
                  <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    <span>Search Results</span>
                  </div>
                  {results.map((city) => {
                    const taken = isExistingCity(city.city, city.country);
                    return (
                      <button
                        type="button"
                        key={city.id}
                        disabled={taken}
                        onClick={() => handleAddSearchResult(city)}
                        className={`glass group block w-full rounded-xl p-4 text-left transition-all duration-300 ${
                          taken
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">{city.city}</div>
                            <div className="text-sm text-slate-400">{city.country}</div>
                          </div>
                          <div className="rounded-lg bg-white/5 px-2 py-1 text-xs capitalize text-slate-500">
                            {city.placeType}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
              {results.length === 0 && filteredPopular.length === 0 && (
                <div className="py-8 text-center">
                  <Globe className="mx-auto mb-3 h-12 w-12 text-slate-600" aria-hidden="true" />
                  <p className="font-light text-slate-400">
                    {query
                      ? "No cities found. Try a different search term."
                      : "All popular cities added"}
                  </p>
                </div>
              )}
              {results.length === 0 &&
                filteredPopular.map((city) => (
                  <button
                    type="button"
                    key={city.slug}
                    onClick={() => handleAddPopular(city)}
                    className="glass group block w-full rounded-xl p-4 text-left transition-all duration-300 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{city.city}</div>
                        <div className="text-sm text-slate-400">{city.country}</div>
                      </div>
                      <div className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-slate-500">
                        {formatOffsetGmt(offsetMinutesAt(city.timezone))}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="abbreviations" className="mt-4">
            <div className="scrollbar-thin scrollbar-thumb-white/10 h-60 space-y-3 overflow-y-auto sm:h-80">
              {filteredAbbreviations.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="mx-auto mb-3 h-12 w-12 text-slate-600" aria-hidden="true" />
                  <p className="font-light text-slate-400">
                    {query
                      ? "No time zones found. Try PST, EST, GMT…"
                      : "All common time zones added"}
                  </p>
                </div>
              ) : (
                filteredAbbreviations.map((abbr) => (
                  <button
                    type="button"
                    key={abbr.slug}
                    onClick={() => handleAddAbbreviation(abbr)}
                    className="glass group block w-full rounded-xl border-l-4 border-l-orange-400/50 p-4 text-left transition-all duration-300 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-lg font-bold text-orange-300">
                            {abbr.abbreviation}
                          </div>
                          {abbr.isDST && (
                            <span className="rounded-full border border-yellow-400/30 bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-300">
                              DST
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-white">{abbr.name}</div>
                        <div className="text-sm text-slate-400">{abbr.region}</div>
                      </div>
                      <div className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-slate-500">
                        {formatOffsetGmt(offsetMinutesAt(abbr.timezone))}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
