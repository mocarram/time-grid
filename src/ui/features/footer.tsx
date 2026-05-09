export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 border-t border-slate-800/50 bg-slate-900/50 py-4">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:justify-between">
          <div className="text-sm text-slate-500">
            © {year}{" "}
            <a
              className="font-semibold text-blue-400"
              href="https://github.com/mocarram/time-grid"
            >
              TimeGrid
            </a>
            . Synchronize time across the globe.
          </div>
          <a
            href="https://github.com/mocarram/time-grid"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-600/50 hover:bg-slate-700/30"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
