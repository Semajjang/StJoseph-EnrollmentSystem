import { useState } from 'react';
import type { ReactNode } from 'react';
import { MenuIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

/** The signed-in frame: fixed sidebar on desktop, drawer + top bar on mobile. */
export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar activePage={activePage} onNavigate={onNavigate} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex min-h-screen flex-col md:pl-[264px]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/85 px-4 py-2.5 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft shadow-sm transition hover:bg-surface-sunk"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-bold text-ink">St. Joseph Daycare</span>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
