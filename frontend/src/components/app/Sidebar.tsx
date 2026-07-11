import { useState } from 'react';
import { LogOutIcon, XIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNavForRole } from './navigation';
import { cn } from '../../lib/cn';
import schoolLogo from '../../../school-logo.png';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ activePage, onNavigate, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [logoVisible, setLogoVisible] = useState(true);
  const { items, portalLabel } = getNavForRole(user?.role);

  const go = (page: string) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[264px] flex-col bg-brand-deep text-white shadow-lg transition-transform duration-300 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Ambient warmth */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
          style={{ background: 'radial-gradient(120% 80% at 20% 0%, rgba(245,158,11,0.16), transparent 60%)' }}
          aria-hidden
        />

        {/* Brand */}
        <div className="relative flex items-center justify-between gap-3 px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
              {logoVisible ? (
                <img src={schoolLogo} alt="" className="h-full w-full object-contain" onError={() => setLogoVisible(false)} />
              ) : (
                <span className="text-2xs font-bold text-brand">SJ</span>
              )}
            </div>
            <div className="leading-tight">
              <p className="font-display text-[15px] font-bold text-white">St. Joseph</p>
              <p className="text-xs text-white/60">Daycare Center</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white md:hidden"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-2">
          <p className="mb-2 px-3 text-2xs font-bold uppercase tracking-[0.16em] text-white/40">{portalLabel}</p>
          <ul className="space-y-1">
            {items.map((item) => {
              const active = activePage === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                      active ? 'bg-white/12 text-white' : 'text-white/65 hover:bg-white/8 hover:text-white',
                    )}
                  >
                    {active ? (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />
                    ) : null}
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-accent' : 'text-white/70 group-hover:text-white')} />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="relative border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => go('profile')}
            className={cn(
              'mb-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
              activePage === 'profile' ? 'bg-white/12' : 'hover:bg-white/8',
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/90 text-sm font-bold text-ink">
              {(user?.name || 'U').trim().charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-white">{user?.name || 'Account'}</span>
              <span className="block text-xs capitalize text-white/55">{user?.role}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/55 transition-colors hover:bg-danger/20 hover:text-white"
          >
            <LogOutIcon className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
