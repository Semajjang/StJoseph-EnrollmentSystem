import { useEffect, useState } from 'react';
import { CheckCircle2Icon, LayersIcon, XIcon } from 'lucide-react';
import { Button, Select } from '../../components/ui';
import { sectionCapacity } from './sections';

interface EnrollmentBulkBarProps {
  selectedCount: number;
  isBusy: boolean;
  onApproveSelected: () => void;
  onClear: () => void;
  /** Section labels for the active program, or null when viewing all programs. */
  sectionOptions: string[] | null;
  sectionLoad: Record<string, number> | null;
  onAssignSection: (section: string) => void;
}

/**
 * Floating action bar for the enrollment queue. Appears when at least one row
 * is selected and offers bulk approve + (within a single program) bulk section
 * assignment, reusing the same per-row Supabase mutations behind the scenes.
 */
export function EnrollmentBulkBar({
  selectedCount,
  isBusy,
  onApproveSelected,
  onClear,
  sectionOptions,
  sectionLoad,
  onAssignSection,
}: EnrollmentBulkBarProps) {
  const [pendingSection, setPendingSection] = useState('');

  // Reset the chosen section if the option list changes (e.g. program switch).
  useEffect(() => {
    setPendingSection('');
  }, [sectionOptions]);

  const handleAssign = () => {
    if (!pendingSection) {
      return;
    }
    onAssignSection(pendingSection);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-tint/60 px-4 py-3">
      <p className="text-sm font-semibold text-ink">
        {selectedCount} selected
      </p>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <Button
          variant="primary"
          size="md"
          leftIcon={<CheckCircle2Icon className="h-4 w-4" />}
          onClick={onApproveSelected}
          isLoading={isBusy}
        >
          Approve selected
        </Button>

        {sectionOptions ? (
          <div className="flex items-center gap-2">
            <div className="w-[210px]">
              <Select
                aria-label="Section to assign to selected learners"
                value={pendingSection}
                disabled={isBusy || sectionOptions.length === 0}
                onChange={(event) => setPendingSection(event.target.value)}
              >
                <option value="">
                  {sectionOptions.length === 0 ? 'No sections yet' : 'Assign section…'}
                </option>
                {sectionOptions.map((section) => {
                  const load = sectionLoad?.[section] || 0;
                  const suffix =
                    load > sectionCapacity
                      ? ` (Overloaded ${load}/${sectionCapacity})`
                      : load === sectionCapacity
                        ? ` (Full ${load}/${sectionCapacity})`
                        : '';
                  return (
                    <option key={section} value={section}>
                      {section}
                      {suffix}
                    </option>
                  );
                })}
              </Select>
            </div>
            <Button
              variant="subtle"
              size="md"
              leftIcon={<LayersIcon className="h-4 w-4" />}
              onClick={handleAssign}
              disabled={isBusy || !pendingSection}
            >
              Assign
            </Button>
          </div>
        ) : null}

        <Button
          variant="ghost"
          size="md"
          leftIcon={<XIcon className="h-4 w-4" />}
          onClick={onClear}
          disabled={isBusy}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
