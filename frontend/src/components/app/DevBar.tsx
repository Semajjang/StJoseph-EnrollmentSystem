import { WrenchIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { DevRole } from '../../lib/devAuth';
import { cn } from '../../lib/cn';

const roles: DevRole[] = ['guardian', 'staff', 'admin'];

/**
 * Floating control shown only when auth is bypassed for development. Lets you
 * jump between the guardian / staff / admin views without signing in.
 */
export function DevBar() {
  const { user, setDevRole } = useAuth();

  return (
    <div className="fixed bottom-4 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 shadow-lg">
      <span className="flex items-center gap-1.5 pl-1 text-2xs font-bold uppercase tracking-wide text-amber-700">
        <WrenchIcon className="h-3.5 w-3.5" />
        Dev · no login
      </span>
      <div className="flex items-center gap-1">
        {roles.map((role) => {
          const active = user?.role === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => setDevRole(role)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-colors',
                active ? 'bg-amber-600 text-white' : 'text-amber-800 hover:bg-amber-100',
              )}
            >
              {role}
            </button>
          );
        })}
      </div>
    </div>
  );
}
