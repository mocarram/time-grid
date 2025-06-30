import React from "react";

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-slate-800/50 bg-slate-900/50 py-4">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:justify-between">
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()}{" "}
            <a
              className="font-semibold text-blue-400"
              href="https://github.com/mocarram/time-grid"
            >
              TimeGrid
            </a>
            . Synchronize time across the globe.
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/mocarram/time-grid"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-slate-600/50 hover:bg-slate-700/30 hover:text-slate-300"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://bolt.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-slate-600/50 hover:bg-slate-700/30 hover:text-slate-300"
            >
              <span>Built with</span>
              <span className="font-semibold text-blue-400">Bolt.new</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
