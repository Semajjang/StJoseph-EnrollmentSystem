import { useState } from 'react';
import type { ReactNode } from 'react';
import { HeartHandshakeIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react';
import schoolLogo from '../../../school-logo.png';

const trustPoints = [
  { icon: SparklesIcon, text: 'Enroll and track your child’s application in one place' },
  { icon: HeartHandshakeIcon, text: 'Message the daycare staff directly, anytime' },
  { icon: ShieldCheckIcon, text: 'Your family’s records kept private and secure' },
];

/**
 * Split branded layout for every signed-out screen. The warm brand panel sits
 * on the left (desktop) / top (mobile); the form fills the right side.
 */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [logoVisible, setLogoVisible] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      {/* Brand panel */}
      <div className="relative overflow-hidden bg-brand-deep px-6 py-8 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(90% 60% at 15% 0%, rgba(245,158,11,0.18), transparent 55%)' }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
            {logoVisible ? (
              <img src={schoolLogo} alt="" className="h-full w-full object-contain" onError={() => setLogoVisible(false)} />
            ) : (
              <span className="text-2xs font-bold text-brand">SJ</span>
            )}
          </div>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-bold">St. Joseph</p>
            <p className="text-xs text-white/60">Daycare Center</p>
          </div>
        </div>

        <div className="relative mt-8 hidden lg:block">
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            Every child, cared for.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
            The family portal for St. Joseph Daycare Center in Barangay Sto. Domingo, Cainta — enrollment,
            requirements, and updates, all in one caring place.
          </p>
          <ul className="mt-8 space-y-4">
            {trustPoints.map((point) => (
              <li key={point.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent">
                  <point.icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-white/80">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-8 hidden text-xs text-white/40 lg:block">
          © {new Date().getFullYear()} St. Joseph Daycare Center
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
