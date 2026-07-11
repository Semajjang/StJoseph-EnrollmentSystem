import { useState } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { GripVerticalIcon } from 'lucide-react';
import { Card, CardBody, CardHeader, Field, Input } from '../../../components/ui';
import type { HomeHighlight, HomePageContent } from '../../../lib/homepageContent';
import { ImagePicker } from './ImagePicker';
import { readImageFileAsDataUrl, reorderItems } from './homepageEditing';

interface HighlightsEditorProps {
  content: HomePageContent;
  setContent: Dispatch<SetStateAction<HomePageContent>>;
}

/** Reorderable highlight cards, each pairing a photo with a short label. */
export function HighlightsEditor({ content, setContent }: HighlightsEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const updateHighlight = (highlightId: string, field: keyof HomeHighlight, value: string) => {
    setContent((prev) => ({
      ...prev,
      highlights: prev.highlights.map((highlight) =>
        highlight.id === highlightId ? { ...highlight, [field]: value } : highlight,
      ),
    }));
  };

  const handleImageChange = async (highlightId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    updateHighlight(highlightId, 'imageUrl', await readImageFileAsDataUrl(file));
  };

  return (
    <Card padding="none">
      <CardHeader title="Highlight cards" description="Drag to reorder. Each card links a photo to a short label." />
      <CardBody className="space-y-4">
        {content.highlights.map((highlight, index) => (
          <div
            key={highlight.id}
            draggable
            onDragStart={() => setDraggedId(highlight.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!draggedId) {
                return;
              }
              setContent((prev) => ({
                ...prev,
                highlights: reorderItems(prev.highlights, draggedId, highlight.id),
              }));
              setDraggedId(null);
            }}
            onDragEnd={() => setDraggedId(null)}
            className="rounded-2xl border border-line bg-surface-sunk/60 p-4"
          >
            <p className="mb-3 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-muted">
              <GripVerticalIcon className="h-3.5 w-3.5 cursor-move" />
              Card {index + 1} · drag to reorder
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[130px_1fr]">
              <ImagePicker
                image={highlight.imageUrl}
                label="Upload image"
                aspect="h-28"
                onChange={(event) => handleImageChange(highlight.id, event)}
              />
              <div className="space-y-3">
                <Field label="Title">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={highlight.title}
                      onChange={(event) => updateHighlight(highlight.id, 'title', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Subtitle">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={highlight.subtitle}
                      onChange={(event) => updateHighlight(highlight.id, 'subtitle', event.target.value)}
                    />
                  )}
                </Field>
              </div>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
