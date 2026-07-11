import { useEffect, useState } from 'react';
import { ArrowRightIcon, InboxIcon } from 'lucide-react';
import { Button, Card, EmptyState, Field, PageHeader, Select } from '../components/ui';
import { useEnrollment } from '../context/EnrollmentContext';
import { RequirementsUploader, REQUIRED_DOCUMENT_COUNT } from '../features/enrollment/RequirementsUploader';

interface RequirementsProps {
  onContinueToYourChild?: () => void;
  onStartEnrollment?: () => void;
}

export function Requirements({ onContinueToYourChild, onStartEnrollment }: RequirementsProps) {
  const { enrollments } = useEnrollment();
  const [selectedId, setSelectedId] = useState('');
  const [uploadedCount, setUploadedCount] = useState(0);

  useEffect(() => {
    if (enrollments.length === 0) {
      setSelectedId('');
      return;
    }
    const stillExists = enrollments.some((enrollment) => enrollment.id === selectedId);
    if (!selectedId || !stillExists) {
      setSelectedId(enrollments[0].id);
    }
  }, [enrollments, selectedId]);

  const selected = enrollments.find((enrollment) => enrollment.id === selectedId) || null;
  const progress = Math.round((uploadedCount / REQUIRED_DOCUMENT_COUNT) * 100);
  const isComplete = uploadedCount === REQUIRED_DOCUMENT_COUNT;

  if (enrollments.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
        <PageHeader eyebrow="Requirements" title="Upload your documents" description="Attach the documents that support your child’s application." />
        <EmptyState
          icon={<InboxIcon />}
          title="No application yet"
          description="Submit an enrollment first — then you can upload the required documents here."
          action={onStartEnrollment ? <Button onClick={onStartEnrollment}>Start enrollment</Button> : undefined}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Requirements"
        title="Upload your documents"
        description="Choose a file for each document — it uploads right away. Accepted: PDF, DOC, DOCX, PNG, JPG, JPEG."
      />

      {enrollments.length > 1 ? (
        <Card>
          <Field label="Which child?" hint="Choose the application you’re uploading documents for.">
            {({ id }) => (
              <Select id={id} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                {enrollments.map((enrollment) => (
                  <option key={enrollment.id} value={enrollment.id}>
                    {enrollment.childFirstName} {enrollment.childLastName} — {new Date(enrollment.submittedAt).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">
              {selected ? `${selected.childFirstName}’s documents` : 'Documents'}
            </h2>
            <p className="text-sm text-muted">{uploadedCount} of {REQUIRED_DOCUMENT_COUNT} uploaded</p>
          </div>
          <span className="font-display text-3xl font-extrabold text-brand-strong">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunk">
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {onContinueToYourChild ? (
          <div className="flex justify-end">
            <Button onClick={onContinueToYourChild} disabled={!isComplete} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
              Go to My Children
            </Button>
          </div>
        ) : null}
      </Card>

      {selected ? <RequirementsUploader enrollment={selected} onProgress={(uploaded) => setUploadedCount(uploaded)} /> : null}
    </div>
  );
}
