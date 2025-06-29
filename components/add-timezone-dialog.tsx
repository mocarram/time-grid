"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, MapPin, Loader2, Globe, Clock } from "lucide-react";
import {
  POPULAR_TIMEZONES,
  TIMEZONE_ABBREVIATIONS,
  getTimezoneOffset,
  getTimezoneDisplayName,
} from "@/lib/timezone-utils";
import type { TimezoneData } from "@/types/timezone";

interface CitySearchResult {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  displayName: string;
  placeType: string;
}

interface AddTimezoneDialogProps {
  onAddTimezone: (timezone: TimezoneData) => void;
  existingTimezones: TimezoneData[];
}

export function AddTimezoneDialog({
  onAddTimezone,
  existingTimezones,
}: AddTimezoneDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState("cities");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timezoneInputRef = useRef<HTMLInputElement>(null);

  const filteredTimezones = POPULAR_TIMEZONES.filter(
    tz =>
      !existingTimezones.some(
        existing =>
          existing.city.toLowerCase() === tz.city.toLowerCase() &&
          existing.country.toLowerCase() === tz.country.toLowerCase()
      ) &&
      (tz.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tz.country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAbbreviations = TIMEZONE_ABBREVIATIONS.filter(
    tz =>
      !existingTimezones.some(
        existing => existing.timezone === tz.timezone && existing.isAbbreviation
      ) &&
      (tz.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tz.region.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const searchCities = useCallback(
    async (query: string) => {
      if (query.length < 2 || activeTab !== "cities") {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/cities?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        if (data.cities) {
          setSearchResults(data.cities);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && activeTab === "cities") {
        searchCities(searchQuery.trim());
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCities, activeTab]);

  // Focus the search input when the dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Longer delay to ensure the dialog is fully rendered and accessible
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Additional focus attempt when the active tab changes to cities
  useEffect(() => {
    if (open && activeTab === "cities" && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab]);

  // Focus the timezone input when switching to abbreviations tab
  useEffect(() => {
    if (open && activeTab === "abbreviations" && timezoneInputRef.current) {
      const timer = setTimeout(() => {
        timezoneInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab]);

  const handleAddTimezone = (timezone: TimezoneData) => {
    const updatedTimezone = {
      ...timezone,
      offset: getTimezoneOffset(timezone.timezone),
    };
    onAddTimezone(updatedTimezone);
    setOpen(false);
    setSearchQuery("");
  };

  const handleAddAbbreviation = (abbr: (typeof TIMEZONE_ABBREVIATIONS)[0]) => {
    const newTimezone: TimezoneData = {
      id: `abbr-${abbr.id}-${Date.now()}`,
      city: abbr.abbreviation,
      country: abbr.region,
      timezone: abbr.timezone,
      offset: getTimezoneOffset(abbr.timezone),
      isAbbreviation: true,
      abbreviation: abbr.abbreviation,
      region: abbr.region,
    };

    onAddTimezone(newTimezone);
    setOpen(false);
    setSearchQuery("");
  };

  const handleAddSearchResult = async (city: CitySearchResult) => {
    // Check if this city/timezone already exists (excluding auto-detected local reference)
    const isDuplicate = existingTimezones.some(
      existing =>
        existing.city.toLowerCase() === city.city.toLowerCase() &&
        existing.country.toLowerCase() === city.country.toLowerCase() &&
        existing.id !== "local" // Allow adding if the existing one is just auto-detected local
    );

    if (isDuplicate) {
      console.log("City already exists, not adding:", city.city, city.country);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/timezone?lat=${city.latitude}&lng=${city.longitude}`
      );
      const data = await response.json();

      if (data.timezone) {
        const newTimezone: TimezoneData = {
          id: `custom-${city.id}-${Date.now()}`,
          city: city.city,
          country: city.country,
          timezone: data.timezone,
          offset: data.offset,
        };

        onAddTimezone(newTimezone);
        setOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error("Failed to add city:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='glass-button hover:glow group h-14 w-14 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 hover:shadow-blue-500/25'>
          <Plus className='h-6 w-6 text-blue-300 transition-colors duration-300 group-hover:rotate-90 group-hover:text-white' />
        </Button>
      </DialogTrigger>
      <DialogContent className='glass-card border-white/10 text-white sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl font-light'>
            <Globe className='h-5 w-5 text-blue-400' />
            Add Timezone
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='glass grid w-full grid-cols-2 border border-white/10 bg-white/5'>
            <TabsTrigger
              value='cities'
              className='text-slate-400 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300'
            >
              <MapPin className='mr-2 h-4 w-4' />
              Cities
            </TabsTrigger>
            <TabsTrigger
              value='abbreviations'
              className='text-slate-400 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300'
            >
              <Clock className='mr-2 h-4 w-4' />
              Time Zones
            </TabsTrigger>
          </TabsList>

          <div className='relative mt-4'>
            <div className='absolute left-4 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center'>
              {isSearching && activeTab === "cities" ? (
                <Loader2 className='h-4 w-4 origin-center animate-spin text-blue-400' />
              ) : (
                <Search className='h-4 w-4 text-slate-400' />
              )}
            </div>

            <Input
              ref={activeTab === "cities" ? searchInputRef : timezoneInputRef}
              id='search'
              autoFocus
              placeholder={
                activeTab === "cities"
                  ? "Search for a city..."
                  : "Search time zones (e.g., PST, EST, GMT)..."
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='glass-input h-12 rounded-xl pl-12 text-white placeholder:text-slate-500'
            />
          </div>

          <TabsContent value='cities' className='mt-4'>
            <div className='scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent h-60 space-y-3 overflow-y-auto sm:h-80'>
              {/* Search Results */}
              {showResults && searchResults.length > 0 && (
                <>
                  <div className='mb-3 flex items-center gap-2 text-sm text-slate-400'>
                    <MapPin className='h-4 w-4' />
                    <span>Search Results</span>
                  </div>
                  {searchResults.map(city => (
                    <div
                      key={city.id}
                      className={`glass group rounded-xl p-4 transition-all duration-300 ${
                        existingTimezones.some(
                          existing =>
                            existing.city.toLowerCase() ===
                              city.city.toLowerCase() &&
                            existing.country.toLowerCase() ===
                              city.country.toLowerCase() &&
                            existing.id !== "local"
                        )
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:bg-white/10"
                      }`}
                      onClick={() => handleAddSearchResult(city)}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='space-y-1'>
                          <div
                            className={`font-medium transition-colors ${
                              existingTimezones.some(
                                existing =>
                                  existing.city.toLowerCase() ===
                                    city.city.toLowerCase() &&
                                  existing.country.toLowerCase() ===
                                    city.country.toLowerCase() &&
                                  existing.id !== "local"
                              )
                                ? "text-slate-600"
                                : "text-white group-hover:text-blue-300"
                            }`}
                          >
                            {city.city}
                          </div>
                          <div
                            className={`text-sm ${
                              existingTimezones.some(
                                existing =>
                                  existing.city.toLowerCase() ===
                                    city.city.toLowerCase() &&
                                  existing.country.toLowerCase() ===
                                    city.country.toLowerCase() &&
                                  existing.id !== "local"
                              )
                                ? "text-slate-600"
                                : "text-slate-400"
                            }`}
                          >
                            {city.country}
                          </div>
                        </div>
                        <div
                          className={`rounded-lg bg-white/5 px-2 py-1 text-xs capitalize ${
                            existingTimezones.some(
                              existing =>
                                existing.city.toLowerCase() ===
                                  city.city.toLowerCase() &&
                                existing.country.toLowerCase() ===
                                  city.country.toLowerCase() &&
                                existing.id !== "local"
                            )
                              ? "text-slate-600"
                              : "text-slate-500"
                          }`}
                        >
                          {city.placeType}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredTimezones.length > 0 && (
                    <div className='mt-6 border-t border-white/10 pt-4'>
                      <div className='mb-3 flex items-center gap-2 text-sm text-slate-400'>
                        <Globe className='h-4 w-4' />
                        Popular Cities
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Popular Timezones */}
              {(!showResults || searchResults.length === 0) &&
              filteredTimezones.length === 0 ? (
                searchQuery && isSearching ? (
                  <div className='space-y-3'>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className='glass rounded-xl p-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex-1 space-y-2'>
                            <Skeleton className='h-4 w-24 bg-white/10' />
                            <Skeleton className='h-3 w-16 bg-white/10' />
                          </div>
                          <Skeleton className='h-6 w-12 bg-white/10' />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='py-8 text-center'>
                    <Globe className='mx-auto mb-3 h-12 w-12 text-slate-600' />
                    <p className='font-light text-slate-400'>
                      {searchQuery
                        ? "No cities found. Try a different search term."
                        : "All popular cities added"}
                    </p>
                  </div>
                )
              ) : (
                (!showResults || searchResults.length === 0) &&
                filteredTimezones.map(timezone => (
                  <div
                    key={timezone.id}
                    className='glass group cursor-pointer rounded-xl p-4 transition-all duration-300 hover:bg-white/10'
                    onClick={() => handleAddTimezone(timezone)}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='space-y-1'>
                        <div className='font-medium text-white transition-colors group-hover:text-blue-300'>
                          {timezone.city}
                        </div>
                        <div className='text-sm text-slate-400'>
                          {timezone.country}
                        </div>
                      </div>
                      <div className='rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-slate-500'>
                        GMT{timezone.offset >= 0 ? "+" : ""}
                        {Math.floor(timezone.offset / 60)}
                        {timezone.offset % 60 !== 0
                          ? ":" +
                            (timezone.offset % 60).toString().padStart(2, "0")
                          : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value='abbreviations' className='mt-4'>
            <div className='scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent h-60 space-y-3 overflow-y-auto sm:h-80'>
              {filteredAbbreviations.length === 0 ? (
                searchQuery ? (
                  <div className='py-8 text-center'>
                    <Clock className='mx-auto mb-3 h-12 w-12 text-slate-600' />
                    <p className='font-light text-slate-400'>
                      No time zones found. Try searching for PST, EST, GMT, etc.
                    </p>
                  </div>
                ) : (
                  <div className='py-8 text-center'>
                    <Clock className='mx-auto mb-3 h-12 w-12 text-slate-600' />
                    <p className='font-light text-slate-400'>
                      All common time zones added
                    </p>
                  </div>
                )
              ) : (
                filteredAbbreviations.map(abbr => (
                  <div
                    key={abbr.id}
                    className='glass group cursor-pointer rounded-xl border-l-4 border-l-orange-400/50 p-4 transition-all duration-300 hover:bg-white/10'
                    onClick={() => handleAddAbbreviation(abbr)}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='space-y-1'>
                        <div className='flex items-center gap-3'>
                          <div className='font-mono text-lg font-bold text-orange-300 transition-colors group-hover:text-orange-200'>
                            {abbr.abbreviation}
                          </div>
                          {abbr.isDST && (
                            <span className='rounded-full border border-yellow-400/30 bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-300'>
                              DST
                            </span>
                          )}
                        </div>
                        <div className='text-sm font-medium text-white transition-colors group-hover:text-blue-300'>
                          {abbr.name}
                        </div>
                        <div className='text-sm text-slate-400'>
                          {abbr.region}
                        </div>
                      </div>
                      <div className='rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-slate-500'>
                        GMT{getTimezoneOffset(abbr.timezone) >= 0 ? "+" : ""}
                        {Math.floor(getTimezoneOffset(abbr.timezone) / 60)}
                        {getTimezoneOffset(abbr.timezone) % 60 !== 0
                          ? ":" +
                            (getTimezoneOffset(abbr.timezone) % 60)
                              .toString()
                              .padStart(2, "0")
                          : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
