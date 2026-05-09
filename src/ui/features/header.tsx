import { APP_VERSION } from "@config/index";
import { Clock } from "lucide-react";

export function Header() {
  return (
    <header className="mb-12 text-center">
      <div className="mb-4 flex items-center justify-center gap-4">
        <div className="glass rounded-xl p-3">
          <Clock className="h-6 w-6 text-blue-400" aria-hidden="true" />
        </div>
        <div className="relative">
          <h1 className="text-glow text-5xl font-thin tracking-tight text-white">TimeGrid</h1>
          <div className="absolute -right-12 -top-1 rounded-full border border-slate-600/40 bg-slate-700/20 px-2 py-1 text-[10px] font-medium text-slate-400">
            v{APP_VERSION}
          </div>
        </div>
      </div>
      <p className="text-base font-light text-slate-400">Synchronize time across the globe</p>
    </header>
  );
}
