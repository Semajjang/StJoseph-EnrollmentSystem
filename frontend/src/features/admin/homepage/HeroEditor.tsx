import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { Card, CardBody, CardHeader, Field, Input, Textarea } from '../../../components/ui';
import type { HomePageContent } from '../../../lib/homepageContent';
import { ImagePicker } from './ImagePicker';
import { readImageFileAsDataUrl } from './homepageEditing';

interface HeroEditorProps {
  content: HomePageContent;
  setContent: Dispatch<SetStateAction<HomePageContent>>;
}

/** Hero eyebrow, title, description, and banner image. */
export function HeroEditor({ content, setContent }: HeroEditorProps) {
  const handleHeroImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const imageUrl = await readImageFileAsDataUrl(file);
    setContent((prev) => ({ ...prev, heroImageUrl: imageUrl }));
  };

  return (
    <Card padding="none">
      <CardHeader title="Hero content" description="The banner headline and image at the top of the homepage." />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Eyebrow">
            {({ id }) => (
              <Input
                id={id}
                value={content.heroEyebrow}
                onChange={(event) => setContent((prev) => ({ ...prev, heroEyebrow: event.target.value }))}
              />
            )}
          </Field>
          <Field label="Hero title">
            {({ id }) => (
              <Input
                id={id}
                value={content.heroTitle}
                onChange={(event) => setContent((prev) => ({ ...prev, heroTitle: event.target.value }))}
              />
            )}
          </Field>
        </div>
        <Field label="Hero description">
          {({ id }) => (
            <Textarea
              id={id}
              rows={3}
              value={content.heroDescription}
              onChange={(event) => setContent((prev) => ({ ...prev, heroDescription: event.target.value }))}
            />
          )}
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
          <ImagePicker
            image={content.heroImageUrl}
            label="Upload banner"
            aspect="h-32"
            onChange={handleHeroImageChange}
          />
          <div className="rounded-xl border border-line bg-surface-sunk p-4">
            <p className="text-sm font-semibold text-ink">Banner image</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Shown large in the homepage hero. A wide landscape image works best.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
