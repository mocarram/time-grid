"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Settings,
  Palette,
  Download,
  Share2,
  HelpCircle,
  Info,
  Plus,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingAppDrawerProps {
  className?: string;
  onShare?: () => void;
}

interface DrawerItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  iconColor?: string;
}

export function FloatingAppDrawer({
  className,
  onShare,
}: FloatingAppDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Drawer items with matching color scheme (removed Add Timezone)
  const drawerItems: DrawerItem[] = [
    {
      id: "share",
      label: "Share View",
      icon: <Share2 className="h-5 w-5" />,
      onClick: () => {
        onShare?.();
        setIsOpen(false);
      },
      iconColor: "text-green-300 group-hover:text-white",
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      onClick: () => {
        console.log("Settings clicked");
        setIsOpen(false);
      },
      iconColor: "text-slate-300 group-hover:text-white",
    },
    {
      id: "theme",
      label: "Theme",
      icon: <Palette className="h-5 w-5" />,
      onClick: () => {
        console.log("Theme clicked");
        setIsOpen(false);
      },
      iconColor: "text-purple-300 group-hover:text-white",
    },
    {
      id: "export",
      label: "Export",
      icon: <Download className="h-5 w-5" />,
      onClick: () => {
        console.log("Export clicked");
        setIsOpen(false);
      },
      iconColor: "text-cyan-300 group-hover:text-white",
    },
    {
      id: "help",
      label: "Help",
      icon: <HelpCircle className="h-5 w-5" />,
      onClick: () => {
        console.log("Help clicked");
        setIsOpen(false);
      },
      iconColor: "text-yellow-300 group-hover:text-white",
    },
  ];

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Backdrop - positioned independently */}
      {(isOpen || isAnimating) && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Container */}
      <div ref={drawerRef} className={cn("relative z-50", className)}>
        {/* Drawer Items */}
        {(isOpen || isAnimating) && (
          <div className="absolute bottom-20 right-0 flex flex-col-reverse gap-3">
            {drawerItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "transform transition-all duration-300 ease-out",
                  isOpen
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-4 scale-95 opacity-0"
                )}
                style={{
                  transitionDelay: isOpen
                    ? `${index * 50}ms`
                    : `${(drawerItems.length - index - 1) * 30}ms`,
                }}
              >
                <div className="group relative">
                  {/* Label */}
                  <div
                    className={cn(
                      "absolute right-16 top-1/2 -translate-y-1/2 transform whitespace-nowrap rounded-lg bg-slate-800/90 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition-all duration-200",
                      "scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                    )}
                  >
                    {item.label}
                    <div className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 translate-x-full border-b-4 border-l-4 border-r-0 border-t-4 border-b-transparent border-l-slate-800/90 border-t-transparent" />
                  </div>

                  {/* Button */}
                  <Button
                    onClick={item.onClick}
                    className="glass-button hover:glow group h-12 w-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                  >
                    <span
                      className={cn(
                        "transition-colors duration-300",
                        item.iconColor
                      )}
                    >
                      {item.icon}
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Toggle Button */}
        <Button
          onClick={toggleDrawer}
          className={cn(
            "glass-button hover:glow group h-14 w-14 rounded-full shadow-2xl transition-all duration-500 hover:scale-110",
            isOpen && "scale-105"
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-slate-300 transition-all duration-200 group-hover:rotate-90 group-hover:text-white" />
          ) : (
            <Menu className="h-6 w-6 text-slate-300 transition-all duration-200 group-hover:text-white" />
          )}
        </Button>
      </div>
    </>
  );
}
