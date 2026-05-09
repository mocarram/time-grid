"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShareButtonProps {
  onShare: () => string | null;
}

export function ShareButton({ onShare }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    const url = onShare();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this URL to share:", url);
    }
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handle}
            className="glass-button hover:glow group h-14 w-14 rounded-full shadow-2xl"
            aria-label="Share current view"
            title="Share current view"
          >
            {copied ? (
              <Check className="h-6 w-6 text-green-300" aria-hidden="true" />
            ) : (
              <Share2 className="h-6 w-6 text-green-300" aria-hidden="true" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="glass-card border-white/10 bg-slate-900/90 text-white"
        >
          <p className="text-sm font-medium">{copied ? "Link copied!" : "Share current view"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
