import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Badge, Button, Field, Input } from '../../components/ui';
import { cn } from '../../lib/cn';
import {
  ManagedProgram,
  formatSectionTimeRange,
  isValidSectionTimeRange,
  normalizeSectionName,
  sectionCapacity,
} from './sections';

interface SectionManagerProps {
  program: ManagedProgram;
  sections: string[];
  sectionLoad: Record<string, number>;
  selectedSection: string | null;
  onSelectSection: (section: string | null) => void;
  autoAssign: boolean;
  onToggleAutoAssign: () => void;
  onAddSection: (name: string, startTime: string, endTime: string) => boolean;
}

/** Add / browse the sections for one program, with the auto-assign switch. */
export function SectionManager({
  program,
  sections,
  sectionLoad,
  selectedSection,
  onSelectSection,
  autoAssign,
  onToggleAutoAssign,
  onAddSection,
}: SectionManagerProps) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const canAdd = Boolean(normalizeSectionName(name) && formatSectionTimeRange(startTime, endTime));
  const showTimeError = Boolean(startTime && endTime && !isValidSectionTimeRange(startTime, endTime));

  const handleAdd = () => {
    if (onAddSection(name, startTime, endTime)) {
      setName('');
      setStartTime('');
      setEndTime('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">{program} sections</h3>
          <p className="mt-0.5 text-xs text-muted">Up to {sectionCapacity} learners per section.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5">
          <span className="text-sm font-semibold text-ink-soft">Auto-assign approved learners</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoAssign}
            aria-label="Toggle automatic section assignment"
            onClick={onToggleAutoAssign}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              autoAssign ? 'bg-brand' : 'bg-line-strong',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                autoAssign ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface-sunk/60 p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
        <Field label="Section name">
          {({ id }) => (
            <Input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="e.g. Section A"
            />
          )}
        </Field>
        <Field label="Start time">
          {({ id }) => (
            <Input
              id={id}
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          )}
        </Field>
        <Field label="End time" error={showTimeError ? 'Ends after start' : undefined}>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="time"
              value={endTime}
              invalid={invalid}
              onChange={(event) => setEndTime(event.target.value)}
            />
          )}
        </Field>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} disabled={!canAdd} onClick={handleAdd}>
          Add section
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.length === 0 ? (
          <p className="text-sm text-muted">
            No sections yet. Add one above to start assigning approved learners.
          </p>
        ) : (
          <>
            <SectionChip
              label="All sections"
              active={selectedSection === null}
              onClick={() => onSelectSection(null)}
            />
            {sections.map((section) => {
              const load = sectionLoad[section] || 0;
              const isFull = load >= sectionCapacity;
              return (
                <SectionChip
                  key={section}
                  label={section}
                  count={`${load}/${sectionCapacity}`}
                  tone={isFull ? 'danger' : 'neutral'}
                  active={selectedSection === section}
                  onClick={() => onSelectSection(section)}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function SectionChip({
  label,
  count,
  tone = 'neutral',
  active,
  onClick,
}: {
  label: string;
  count?: string;
  tone?: 'neutral' | 'danger';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'border-brand bg-brand text-white shadow-sm'
          : 'border-line bg-surface text-ink-soft hover:border-brand/40 hover:text-brand-strong',
      )}
    >
      {label}
      {count ? (
        <Badge
          tone={active ? 'neutral' : tone}
          className={active ? 'border-white/30 bg-white/20 text-white' : undefined}
        >
          {count}
        </Badge>
      ) : null}
    </button>
  );
}
