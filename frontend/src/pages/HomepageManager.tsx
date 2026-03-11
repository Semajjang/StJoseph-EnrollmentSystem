import { ChangeEvent, useEffect, useState } from 'react';
import { HomeAnnouncement, HomeHighlight, HomePageContent, defaultHomePageContent, fetchHomePageContent, loadHomePageContent, resetHomePageContent, saveHomePageContent } from '../lib/homepageContent';

interface HomepageManagerProps {
  onPreviewHomepage: () => void;
}

const readImageFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image file.'));
    };

    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

export function HomepageManager({ onPreviewHomepage }: HomepageManagerProps) {
  const [content, setContent] = useState<HomePageContent>(() => loadHomePageContent());
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedHighlightId, setDraggedHighlightId] = useState<string | null>(null);
  const [draggedAnnouncementId, setDraggedAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      const nextContent = await fetchHomePageContent();

      if (!isMounted) {
        return;
      }

      setContent(nextContent);
    };

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const reorderItems = <T extends { id: string }>(items: T[], draggedId: string, targetId: string) => {
    const draggedIndex = items.findIndex((item) => item.id === draggedId);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return items;
    }

    const nextItems = [...items];
    const [draggedItem] = nextItems.splice(draggedIndex, 1);
    nextItems.splice(targetIndex, 0, draggedItem);

    return nextItems;
  };

  const updateHighlight = (highlightId: string, field: keyof HomeHighlight, value: string) => {
    setContent((prev) => ({
      ...prev,
      highlights: prev.highlights.map((highlight) =>
        highlight.id === highlightId ?
          {
            ...highlight,
            [field]: value
          } :
          highlight
      )
    }));
    setSaveMessage('');
  };

  const updateAnnouncement = (announcementId: string, field: keyof HomeAnnouncement, value: string) => {
    setContent((prev) => ({
      ...prev,
      announcements: prev.announcements.map((announcement) =>
        announcement.id === announcementId ?
          {
            ...announcement,
            [field]: value
          } :
          announcement
      )
    }));
    setSaveMessage('');
  };

  const handleHighlightImageChange = async (
    highlightId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const imageUrl = await readImageFileAsDataUrl(file);
    updateHighlight(highlightId, 'imageUrl', imageUrl);
  };

  const handleHeroImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const imageUrl = await readImageFileAsDataUrl(file);
    setContent((prev) => ({
      ...prev,
      heroImageUrl: imageUrl
    }));
    setSaveMessage('');
  };

  const handleAddAnnouncement = () => {
    setContent((prev) => ({
      ...prev,
      announcements: [
        ...prev.announcements,
        {
          id: `announcement-${Date.now()}`,
          title: 'New Announcement',
          body: 'Write your announcement here.',
          dateLabel: 'New'
        }
      ]
    }));
    setSaveMessage('');
  };

  const handleRemoveAnnouncement = (announcementId: string) => {
    setContent((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((announcement) => announcement.id !== announcementId)
    }));
    setSaveMessage('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveHomePageContent(content);
    setIsSaving(false);

    if (result.error) {
      setSaveMessage(result.error);
      return;
    }

    setContent(result.content);
    setSaveMessage('Homepage updates saved.');
  };

  const handleReset = async () => {
    setIsSaving(true);
    const result = await resetHomePageContent();
    setIsSaving(false);

    if (result.error) {
      setSaveMessage(result.error);
      return;
    }

    setContent(defaultHomePageContent);
    setSaveMessage('Homepage reset to defaults.');
  };

  const handlePreview = async () => {
    await handleSave();
    onPreviewHomepage();
  };

  return (
    <div className="p-8 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-sky-600 mb-2">
            Homepage Management
          </p>
          <h1 className="text-3xl font-extrabold text-gray-800">Manage Homepage Content</h1>
          <p className="text-gray-500 mt-1">
            Update hero content, highlight cards, images, and school announcements.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handlePreview()}
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50"
          >
            Preview Homepage
          </button>
          <button
            type="button"
            onClick={() => void handleReset()}
            className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSaving ? 'Saving...' : 'Publish Updates'}
          </button>
        </div>
      </div>

      {saveMessage ?
        <div className="mb-6 rounded-2xl bg-[#EFF6FF] border border-sky-200 px-5 py-4 text-sm font-semibold text-sky-700">
          {saveMessage}
        </div> :
        null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr,0.85fr] gap-6">
        <div className="space-y-6">
          <section className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Hero Content</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Eyebrow</span>
                <input
                  value={content.heroEyebrow}
                  onChange={(event) => setContent((prev) => ({ ...prev, heroEyebrow: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Hero Title</span>
                <input
                  value={content.heroTitle}
                  onChange={(event) => setContent((prev) => ({ ...prev, heroTitle: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>
            </div>
            <label className="block mt-4">
              <span className="text-sm font-bold text-gray-700">Hero Description</span>
              <textarea
                value={content.heroDescription}
                onChange={(event) => setContent((prev) => ({ ...prev, heroDescription: event.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
              />
            </label>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[180px,1fr]">
              <div>
                {content.heroImageUrl ?
                  <img src={content.heroImageUrl} alt="Homepage banner" className="h-32 w-full rounded-2xl object-cover" /> :
                  <div className="h-32 w-full rounded-2xl bg-gradient-to-r from-blue-400 to-blue-700" />}
                <label className="mt-3 inline-flex cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50">
                  Upload Banner
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleHeroImageChange(event)}
                  />
                </label>
              </div>
              <div className="rounded-2xl bg-[#F8FBFF] border border-blue-100 p-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Banner Image</p>
                <p className="text-sm text-gray-500 leading-6">
                  This large image appears on the homepage hero area for families. Upload a wide image for best results.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-800">Highlight Cards</h2>
                <p className="text-sm text-gray-500">Update the featured homepage cards and upload images.</p>
              </div>
            </div>
            <div className="space-y-5">
              {content.highlights.map((highlight, index) => (
                <div
                  key={highlight.id}
                  draggable
                  onDragStart={() => setDraggedHighlightId(highlight.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedHighlightId) {
                      return;
                    }

                    setContent((prev) => ({
                      ...prev,
                      highlights: reorderItems(prev.highlights, draggedHighlightId, highlight.id)
                    }));
                    setDraggedHighlightId(null);
                    setSaveMessage('');
                  }}
                  onDragEnd={() => setDraggedHighlightId(null)}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-5 cursor-move"
                >
                  <p className="text-xs uppercase tracking-wide font-bold text-gray-400 mb-3">
                    Card {index + 1} · Drag to reorder
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px,1fr]">
                    <div>
                      {highlight.imageUrl ?
                        <img src={highlight.imageUrl} alt={highlight.title} className="h-28 w-full rounded-2xl object-cover" /> :
                        <div className="h-28 w-full rounded-2xl bg-gradient-to-r from-sky-300 to-blue-500" />}
                      <label className="mt-3 inline-flex cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50">
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => void handleHighlightImageChange(highlight.id, event)}
                        />
                      </label>
                    </div>
                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-sm font-bold text-gray-700">Title</span>
                        <input
                          value={highlight.title}
                          onChange={(event) => updateHighlight(highlight.id, 'title', event.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-bold text-gray-700">Subtitle</span>
                        <input
                          value={highlight.subtitle}
                          onChange={(event) => updateHighlight(highlight.id, 'subtitle', event.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Announcements</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Section Title</span>
                <input
                  value={content.announcementsTitle}
                  onChange={(event) => setContent((prev) => ({ ...prev, announcementsTitle: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Intro Text</span>
                <textarea
                  value={content.announcementsIntro}
                  onChange={(event) => setContent((prev) => ({ ...prev, announcementsIntro: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>

              {content.announcements.map((announcement, index) => (
                <div
                  key={announcement.id}
                  draggable
                  onDragStart={() => setDraggedAnnouncementId(announcement.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedAnnouncementId) {
                      return;
                    }

                    setContent((prev) => ({
                      ...prev,
                      announcements: reorderItems(prev.announcements, draggedAnnouncementId, announcement.id)
                    }));
                    setDraggedAnnouncementId(null);
                    setSaveMessage('');
                  }}
                  onDragEnd={() => setDraggedAnnouncementId(null)}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-5 cursor-move"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs uppercase tracking-wide font-bold text-gray-400">
                      Post {index + 1} · Drag to reorder
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveAnnouncement(announcement.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input
                      value={announcement.title}
                      onChange={(event) => updateAnnouncement(announcement.id, 'title', event.target.value)}
                      placeholder="Announcement title"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                    />
                    <input
                      value={announcement.dateLabel}
                      onChange={(event) => updateAnnouncement(announcement.id, 'dateLabel', event.target.value)}
                      placeholder="Date label"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                    />
                    <textarea
                      value={announcement.body}
                      onChange={(event) => updateAnnouncement(announcement.id, 'body', event.target.value)}
                      placeholder="Announcement body"
                      rows={4}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddAnnouncement}
                className="w-full rounded-2xl border border-dashed border-sky-300 bg-[#F8FBFF] px-5 py-4 text-sm font-bold text-sky-700 hover:bg-[#EFF6FF]"
              >
                Add Announcement
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Portal Sections</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Flow Title</span>
                <input
                  value={content.flowTitle}
                  onChange={(event) => setContent((prev) => ({ ...prev, flowTitle: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Flow Description</span>
                <textarea
                  value={content.flowDescription}
                  onChange={(event) => setContent((prev) => ({ ...prev, flowDescription: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Quick Action Title</span>
                <input
                  value={content.quickActionTitle}
                  onChange={(event) => setContent((prev) => ({ ...prev, quickActionTitle: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Quick Action Description</span>
                <textarea
                  value={content.quickActionDescription}
                  onChange={(event) => setContent((prev) => ({ ...prev, quickActionDescription: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none focus:border-sky-300"
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}