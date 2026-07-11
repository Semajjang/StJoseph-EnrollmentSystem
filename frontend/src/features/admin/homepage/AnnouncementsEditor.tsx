import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Textarea } from '../../../components/ui';
import type { HomeAnnouncement, HomePageContent } from '../../../lib/homepageContent';
import { reorderItems } from './homepageEditing';

interface AnnouncementsEditorProps {
  content: HomePageContent;
  setContent: Dispatch<SetStateAction<HomePageContent>>;
}

/** Section heading + reorderable announcement posts with add / remove. */
export function AnnouncementsEditor({ content, setContent }: AnnouncementsEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const updateAnnouncement = (announcementId: string, field: keyof HomeAnnouncement, value: string) => {
    setContent((prev) => ({
      ...prev,
      announcements: prev.announcements.map((announcement) =>
        announcement.id === announcementId ? { ...announcement, [field]: value } : announcement,
      ),
    }));
  };

  const addAnnouncement = () => {
    setContent((prev) => ({
      ...prev,
      announcements: [
        ...prev.announcements,
        {
          id: `announcement-${Date.now()}`,
          title: 'New announcement',
          body: 'Write your announcement here.',
          dateLabel: 'New',
        },
      ],
    }));
  };

  const removeAnnouncement = (announcementId: string) => {
    setContent((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((announcement) => announcement.id !== announcementId),
    }));
  };

  return (
    <Card padding="none">
      <CardHeader title="Announcements" description="Notices families see on the homepage. Drag to reorder." />
      <CardBody className="space-y-4">
        <Field label="Section title">
          {({ id }) => (
            <Input
              id={id}
              value={content.announcementsTitle}
              onChange={(event) => setContent((prev) => ({ ...prev, announcementsTitle: event.target.value }))}
            />
          )}
        </Field>
        <Field label="Intro text">
          {({ id }) => (
            <Textarea
              id={id}
              rows={2}
              value={content.announcementsIntro}
              onChange={(event) => setContent((prev) => ({ ...prev, announcementsIntro: event.target.value }))}
            />
          )}
        </Field>

        {content.announcements.map((announcement, index) => (
          <div
            key={announcement.id}
            draggable
            onDragStart={() => setDraggedId(announcement.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!draggedId) {
                return;
              }
              setContent((prev) => ({
                ...prev,
                announcements: reorderItems(prev.announcements, draggedId, announcement.id),
              }));
              setDraggedId(null);
            }}
            onDragEnd={() => setDraggedId(null)}
            className="space-y-3 rounded-2xl border border-line bg-surface-sunk/60 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.1em] text-muted">
                <GripVerticalIcon className="h-3.5 w-3.5 cursor-move" />
                Post {index + 1}
              </p>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2Icon className="h-3.5 w-3.5" />}
                onClick={() => removeAnnouncement(announcement.id)}
                className="text-danger hover:bg-danger-soft"
              >
                Remove
              </Button>
            </div>
            <Field label="Title">
              {({ id }) => (
                <Input
                  id={id}
                  value={announcement.title}
                  onChange={(event) => updateAnnouncement(announcement.id, 'title', event.target.value)}
                />
              )}
            </Field>
            <Field label="Date label">
              {({ id }) => (
                <Input
                  id={id}
                  value={announcement.dateLabel}
                  onChange={(event) => updateAnnouncement(announcement.id, 'dateLabel', event.target.value)}
                />
              )}
            </Field>
            <Field label="Body">
              {({ id }) => (
                <Textarea
                  id={id}
                  rows={3}
                  value={announcement.body}
                  onChange={(event) => updateAnnouncement(announcement.id, 'body', event.target.value)}
                />
              )}
            </Field>
          </div>
        ))}

        <Button variant="subtle" fullWidth leftIcon={<PlusIcon className="h-4 w-4" />} onClick={addAnnouncement}>
          Add announcement
        </Button>
      </CardBody>
    </Card>
  );
}
