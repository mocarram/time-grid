"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Share2, Check, Copy } from "lucide-react";

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
      console.error("Failed to copy to clipboard:", error);
      // Fallback: show the URL in a prompt
      prompt("Copy this URL to share:", shareUrl);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleShare}
            className='glass-button hover:glow group h-14 w-14 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 hover:shadow-green-500/25'
            title='Share current view'
          >
            {copied ? (
              <Check className='h-6 w-6 text-green-300 transition-colors duration-300 group-hover:text-white' />
            ) : (
              <Share2 className='h-6 w-6 text-green-300 transition-colors duration-300 group-hover:rotate-12 group-hover:text-white' />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side='left'
          className='glass-card border-white/10 bg-slate-900/90 text-white backdrop-blur-xl'
        >
          <p className='text-sm font-medium'>
            {copied ? "Link copied!" : "Share current view"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
