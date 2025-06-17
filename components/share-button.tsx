'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Share2, Check, Copy } from 'lucide-react';
import type { TimezoneData, TimeState } from '@/types/timezone';

interface ShareButtonProps {
  referenceTimezone: TimezoneData;
  timeState: TimeState;
}

export function ShareButton({ referenceTimezone, timeState }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    
    // Create the share data
    const shareData = {
      ref: {
        id: referenceTimezone.id,
        city: referenceTimezone.city,
        country: referenceTimezone.country,
        timezone: referenceTimezone.timezone,
      },
      time: timeState.selectedTime.toISOString(),
      zones: timeState.timezones.map(tz => ({
        id: tz.id,
        city: tz.city,
        country: tz.country,
        timezone: tz.timezone,
      })),
      modified: timeState.isTimeModified
    };

    // Encode the data
    const encodedData = btoa(JSON.stringify(shareData));
    return `${baseUrl}?share=${encodedData}`;
  };

  const handleShare = async () => {
    const shareUrl = generateShareUrl();
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show the URL in a prompt
      prompt('Copy this URL to share:', shareUrl);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleShare}
            className="h-14 w-14 rounded-full glass-button hover:glow transition-all duration-500 group shadow-2xl hover:shadow-green-500/25 hover:scale-110"
            title="Share current view"
          >
            {copied ? (
              <Check className="h-6 w-6 text-green-300 group-hover:text-white transition-colors duration-300" />
            ) : (
              <Share2 className="h-6 w-6 text-green-300 group-hover:text-white transition-colors duration-300 group-hover:rotate-12" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          className="glass-card border-white/10 text-white bg-slate-900/90 backdrop-blur-xl"
        >
          <p className="text-sm font-medium">
            {copied ? 'Link copied!' : 'Share current view'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}