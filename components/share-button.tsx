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

interface ShareButtonProps {
  onShare: () => string;
}

export function ShareButton({ onShare }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = onShare();
    
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