import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XCircleIcon, XIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

/** Optional single action (e.g. "Undo") rendered inside a toast. */
interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (input: {
    tone?: ToastTone;
    title: string;
    description?: string;
    duration?: number;
    action?: ToastAction;
  }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2Icon className="h-5 w-5" />, accent: 'text-success' },
  error: { icon: <XCircleIcon className="h-5 w-5" />, accent: 'text-danger' },
  warning: { icon: <TriangleAlertIcon className="h-5 w-5" />, accent: 'text-warning' },
  info: { icon: <InfoIcon className="h-5 w-5" />, accent: 'text-brand' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    ({ tone = 'info', title, description, duration = 4200, action }) => {
      const id = (counter.current += 1);
      setToasts((current) => [...current, { id, tone, title, description, action }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ tone: 'success', title, description }),
      error: (title, description) => toast({ tone: 'error', title, description }),
      info: (title, description) => toast({ tone: 'info', title, description }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
            {toasts.map((item) => (
              <div
                key={item.id}
                role={item.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-lg animate-fade-up"
              >
                <span className={cn('mt-0.5 shrink-0', toneStyles[item.tone].accent)}>{toneStyles[item.tone].icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  {item.description ? <p className="mt-0.5 text-sm text-muted">{item.description}</p> : null}
                  {item.action ? (
                    <button
                      type="button"
                      onClick={() => {
                        item.action?.onClick();
                        dismiss(item.id);
                      }}
                      className="-ml-2 mt-1.5 inline-flex min-h-[36px] items-center rounded-lg px-2 text-sm font-bold text-brand transition hover:bg-brand-tint focus-visible:outline-none focus-visible:shadow-focus"
                    >
                      {item.action.label}
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss"
                  className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-faint transition hover:bg-surface-sunk hover:text-ink"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
