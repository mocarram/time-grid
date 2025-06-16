'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, MapPin, Loader2, Globe } from 'lucide-react';
import { POPULAR_TIMEZONES, getTimezoneOffset } from '@/lib/timezone-utils';
import type { TimezoneData } from '@/types/timezone';

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

export function AddTimezoneDialog({ onAddTimezone, existingTimezones }: AddTimezoneDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const filteredTimezones = POPULAR_TIMEZONES.filter(tz => 
    !existingTimezones.some(existing => existing.id === tz.id) &&
    (tz.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
     tz.country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.cities) {
        setSearchResults(data.cities);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCities(searchQuery.trim());
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCities]);

  const handleAddTimezone = (timezone: TimezoneData) => {
    const updatedTimezone = {
      ...timezone,
      offset: getTimezoneOffset(timezone.timezone)
    };
    onAddTimezone(updatedTimezone);
    setOpen(false);
    setSearchQuery('');
  };

  const handleAddSearchResult = async (city: CitySearchResult) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/timezone?lat=${city.latitude}&lng=${city.longitude}`);
      const data = await response.json();
      
      if (data.timezone) {
        const newTimezone: TimezoneData = {
          id: `custom-${city.id}`,
          city: city.city,
          country: city.country,
          timezone: data.timezone,
          offset: data.offset
        };
        
        onAddTimezone(newTimezone);
        setOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Failed to add city:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-16 w-16 rounded-full glass-button hover:glow transition-all duration-500 group">
          <Plus className="h-6 w-6 text-blue-600 dark:text-blue-300 group-hover:text-blue-700 dark:group-hover:text-white transition-colors duration-300" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg glass-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-light flex items-center gap-2 text-slate-800 dark:text-white">
            <Globe className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            Add Timezone
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="search" className="text-slate-700 dark:text-slate-300 font-medium">
              Search cities
            </Label>
            <div className="relative">
              {isSearching ? (
                <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500 dark:text-blue-400 animate-spin" />
              ) : (
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              )}
              <Input
                id="search"
                placeholder="Search for a city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 glass-input text-slate-800 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 h-12 rounded-xl"
              />
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* Search Results */}
            {showResults && searchResults.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>Search Results</span>
                </div>
                {searchResults.map((city) => (
                  <div
                    key={city.id}
                    className="glass p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-all duration-300 group"
                    onClick={() => handleAddSearchResult(city)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                          {city.city}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {city.country}
                          {city.state && ` • ${city.state}`}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-500 px-2 py-1 bg-white/20 dark:bg-white/5 rounded-lg capitalize">
                        {city.placeType}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTimezones.length > 0 && (
                  <div className="border-t border-slate-200/30 dark:border-white/[0.06] pt-4 mt-6">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Popular Cities
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Popular Timezones */}
            {(!showResults || searchResults.length === 0) && filteredTimezones.length === 0 ? (
              searchQuery && isSearching ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-white/[0.05]" />
                          <Skeleton className="h-3 w-16 bg-slate-200 dark:bg-white/[0.05]" />
                        </div>
                        <Skeleton className="h-6 w-12 bg-slate-200 dark:bg-white/[0.05]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-light">
                    {searchQuery ? 'No cities found. Try a different search term.' : 'All popular cities added'}
                  </p>
                </div>
              )
            ) : (
              (!showResults || searchResults.length === 0) && filteredTimezones.map((timezone) => (
                <div
                  key={timezone.id}
                  className="glass p-4 rounded-xl cursor-pointer hover:bg-white/[0.05] dark:hover:bg-white/[0.02] transition-all duration-300 group"
                  onClick={() => handleAddTimezone(timezone)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                        {timezone.city}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{timezone.country}</div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-mono px-2 py-1 bg-white/20 dark:bg-white/[0.04] rounded-lg">
                      GMT{timezone.offset >= 0 ? '+' : ''}
                      {Math.floor(timezone.offset / 60)}
                      {timezone.offset % 60 !== 0 ? ':' + (timezone.offset % 60).toString().padStart(2, '0') : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}