import type { Dispatch, SetStateAction } from 'react';
import { Card, CardBody, CardHeader, Field, Input, Textarea } from '../../../components/ui';
import type { HomePageContent } from '../../../lib/homepageContent';

interface PortalCopyEditorProps {
  content: HomePageContent;
  setContent: Dispatch<SetStateAction<HomePageContent>>;
}

/** Copy for the enrollment flow and quick-action blocks. */
export function PortalCopyEditor({ content, setContent }: PortalCopyEditorProps) {
  return (
    <Card padding="none">
      <CardHeader title="Portal sections" description="Copy for the enrollment flow and quick-action blocks." />
      <CardBody className="space-y-4">
        <Field label="Flow title">
          {({ id }) => (
            <Input
              id={id}
              value={content.flowTitle}
              onChange={(event) => setContent((prev) => ({ ...prev, flowTitle: event.target.value }))}
            />
          )}
        </Field>
        <Field label="Flow description">
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              value={content.flowDescription}
              onChange={(event) => setContent((prev) => ({ ...prev, flowDescription: event.target.value }))}
            />
          )}
        </Field>
        <Field label="Quick action title">
          {({ id }) => (
            <Input
              id={id}
              value={content.quickActionTitle}
              onChange={(event) => setContent((prev) => ({ ...prev, quickActionTitle: event.target.value }))}
            />
          )}
        </Field>
        <Field label="Quick action description">
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              value={content.quickActionDescription}
              onChange={(event) => setContent((prev) => ({ ...prev, quickActionDescription: event.target.value }))}
            />
          )}
        </Field>
      </CardBody>
    </Card>
  );
}
