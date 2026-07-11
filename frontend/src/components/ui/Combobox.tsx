import { useEffect, useId, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { controlBase } from './Input';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  emptyText?: string;
}

/** A searchable single-select. Type to filter by substring; ↑/↓/Enter/Esc supported. */
export function Combobox({ options, value, onChange, id, placeholder = 'Select…', invalid, emptyText = 'No matches found' }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((option) => option.value === value) || null;
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? options.filter((option) => option.label.toLowerCase().includes(trimmed)) : options;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // Keep the keyboard-highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${highlight}`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open, listId]);

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && filtered.length > 0 ? `${listId}-opt-${highlight}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          invalid ? 'border-danger focus:border-danger' : 'border-line focus:border-brand',
          'h-11 cursor-text pl-10 pr-10',
        )}
        placeholder={selected ? selected.label : placeholder}
        value={open ? query : selected?.label ?? ''}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) => Math.min(current + 1, filtered.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter') {
            if (open && filtered[highlight]) {
              event.preventDefault();
              choose(filtered[highlight]);
            }
          } else if (event.key === 'Escape') {
            setOpen(false);
            setQuery('');
          }
        }}
      />
      <ChevronDownIcon
        className={cn('pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-transform', open && 'rotate-180')}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{emptyText}</li>
          ) : (
            filtered.map((option, index) => (
              <li key={option.value} id={`${listId}-opt-${index}`} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setHighlight(index)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm',
                    index === highlight ? 'bg-brand-tint text-brand-strong' : 'text-ink-soft hover:bg-surface-sunk',
                  )}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <CheckIcon className="h-4 w-4 shrink-0 text-brand" /> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
