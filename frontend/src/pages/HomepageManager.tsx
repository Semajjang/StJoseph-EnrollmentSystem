import { useEffect, useState } from 'react';
import { EyeIcon, RotateCcwIcon } from 'lucide-react';
import {
  HomePageContent,
  defaultHomePageContent,
  fetchHomePageContent,
  loadHomePageContent,
  resetHomePageContent,
  saveHomePageContent,
} from '../lib/homepageContent';
import { Button, ConfirmDialog, PageHeader, useToast } from '../components/ui';
import { HeroEditor } from '../features/admin/homepage/HeroEditor';
import { HighlightsEditor } from '../features/admin/homepage/HighlightsEditor';
import { AnnouncementsEditor } from '../features/admin/homepage/AnnouncementsEditor';
import { PortalCopyEditor } from '../features/admin/homepage/PortalCopyEditor';

interface HomepageManagerProps {
  onPreviewHomepage: () => void;
}

export function HomepageManager({ onPreviewHomepage }: HomepageManagerProps) {
  const toast = useToast();
  const [content, setContent] = useState<HomePageContent>(() => loadHomePageContent());
  const [isSaving, setIsSaving] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      const nextContent = await fetchHomePageContent();
      if (isMounted) {
        setContent(nextContent);
      }
    };
    void loadContent();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveHomePageContent(content);
    setIsSaving(false);
    if (result.error) {
      toast.error('Could not save', result.error);
      return false;
    }
    setContent(result.content);
    toast.success('Homepage saved', 'Your changes are live for families.');
    return true;
  };

  const handleReset = async () => {
    setIsSaving(true);
    const result = await resetHomePageContent();
    setIsSaving(false);
    setConfirmResetOpen(false);
    if (result.error) {
      toast.error('Could not reset', result.error);
      return;
    }
    setContent(defaultHomePageContent);
    toast.success('Homepage reset', 'Content was restored to the defaults.');
  };

  const handlePreview = async () => {
    const saved = await handleSave();
    if (saved) {
      onPreviewHomepage();
    }
  };

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <PageHeader
        eyebrow="Content management"
        title="Homepage"
        description="Edit the hero, highlight cards, announcements, and portal copy families see first."
        actions={
          <>
            <Button variant="outline" leftIcon={<EyeIcon className="h-4 w-4" />} onClick={handlePreview}>
              Save &amp; preview
            </Button>
            <Button
              variant="ghost"
              leftIcon={<RotateCcwIcon className="h-4 w-4" />}
              onClick={() => setConfirmResetOpen(true)}
              disabled={isSaving}
            >
              Reset defaults
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              Publish updates
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <HeroEditor content={content} setContent={setContent} />
          <HighlightsEditor content={content} setContent={setContent} />
        </div>
        <div className="space-y-6">
          <AnnouncementsEditor content={content} setContent={setContent} />
          <PortalCopyEditor content={content} setContent={setContent} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={handleReset}
        isLoading={isSaving}
        title="Reset homepage to defaults?"
        message="This replaces the live homepage content with the built-in defaults right away. This can't be undone."
        confirmLabel="Reset homepage"
      />
    </div>
  );
}
