import { useEffect, useMemo, useState } from 'react';
import { EyeIcon, InboxIcon, RotateCcwIcon, SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ContactPageContent,
  defaultContactPageContent,
  fetchContactPageContent,
  loadContactPageContent,
  resetContactPageContent,
  saveContactPageContent,
} from '../lib/contactContent';
import {
  ContactMessageStatus,
  addReplyToContactMessage,
  updateContactMessageStatus,
} from '../lib/contactMessages';
import { ChatThread, Composer, ConversationList, useContactMessagesRealtime } from '../features/messaging';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingScreen,
  PageHeader,
  SegmentedControl,
  Select,
  Tabs,
  Textarea,
  useToast,
} from '../components/ui';

interface ContactManagerProps {
  onPreviewContact: () => void;
}

type InboxFilter = 'all' | ContactMessageStatus;

const contentFields: { key: keyof ContactPageContent; label: string; textarea?: boolean }[] = [
  { key: 'pageTitle', label: 'Page title' },
  { key: 'pageDescription', label: 'Page description', textarea: true },
  { key: 'formTitle', label: 'Form title' },
  { key: 'formDescription', label: 'Form description', textarea: true },
  { key: 'administratorLabel', label: 'Administrator label' },
  { key: 'administratorName', label: 'Administrator name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'officeHours', label: 'Office hours' },
];

export function ContactManager({ onPreviewContact }: ContactManagerProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<'inbox' | 'content'>('inbox');

  const { messages, setMessages, isLoading } = useContactMessagesRealtime({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [replyBody, setReplyBody] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [content, setContent] = useState<ContactPageContent>(() => loadContactPageContent());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchContactPageContent().then((next) => {
      if (active) setContent(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: messages.length,
      New: messages.filter((message) => message.status === 'New').length,
      Replied: messages.filter((message) => message.status === 'Replied').length,
      Closed: messages.filter((message) => message.status === 'Closed').length,
    }),
    [messages],
  );

  const filtered = useMemo(
    () => (inboxFilter === 'all' ? messages : messages.filter((message) => message.status === inboxFilter)),
    [messages, inboxFilter],
  );

  const selected = useMemo(
    () => filtered.find((message) => message.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  const handleReply = async () => {
    if (!selected || !replyBody.trim() || !user) return;
    setIsSendingReply(true);
    const result = await addReplyToContactMessage(selected.id, {
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role === 'admin' ? 'admin' : 'staff',
      body: replyBody,
    });
    setIsSendingReply(false);
    if (result.error || !result.message) {
      toast.error('Reply not sent', result.error || 'Please try again.');
      return;
    }
    const updated = result.message;
    setMessages((prev) => [updated, ...prev.filter((message) => message.id !== updated.id)]);
    setSelectedId(updated.id);
    setReplyBody('');
  };

  const handleStatusChange = async (status: ContactMessageStatus) => {
    if (!selected) return;
    const result = await updateContactMessageStatus(selected.id, status);
    if (!result.message) return;
    const updated = result.message;
    setMessages((prev) => [updated, ...prev.filter((message) => message.id !== updated.id)]);
    setSelectedId(updated.id);
    toast.success('Status updated', `Marked as ${status}.`);
  };

  const handleSaveContent = async () => {
    setIsSaving(true);
    const result = await saveContactPageContent(content);
    setIsSaving(false);
    if (result.error) {
      toast.error('Could not save', result.error);
      return;
    }
    setContent(result.content);
    toast.success('Contact page saved', 'Your changes are now live for families.');
  };

  const handleResetContent = async () => {
    setIsSaving(true);
    const result = await resetContactPageContent();
    setIsSaving(false);
    if (result.error) {
      toast.error('Could not reset', result.error);
      return;
    }
    setContent(defaultContactPageContent);
    toast.success('Contact page reset', 'Restored the default details.');
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        eyebrow="Messages"
        title="Contact inbox & page"
        description="Reply to families in real time and manage the public contact details."
        actions={
          <Button variant="outline" leftIcon={<EyeIcon className="h-4 w-4" />} onClick={onPreviewContact}>
            Preview page
          </Button>
        }
      />

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={(value) => setTab(value as 'inbox' | 'content')}
          items={[
            { id: 'inbox', label: 'Inbox', icon: <InboxIcon className="h-4 w-4" />, count: counts.all },
            { id: 'content', label: 'Contact page', icon: <SettingsIcon className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'inbox' ? (
        <Card padding="none" className="mt-5 flex min-h-[560px] flex-col overflow-hidden">
          <div className="border-b border-line p-4">
            <SegmentedControl
              value={inboxFilter}
              onChange={(value) => setInboxFilter(value)}
              options={[
                { value: 'all', label: `All ${counts.all}` },
                { value: 'New', label: `New ${counts.New}` },
                { value: 'Replied', label: `Replied ${counts.Replied}` },
                { value: 'Closed', label: `Closed ${counts.Closed}` },
              ]}
            />
          </div>

          {isLoading ? (
            <LoadingScreen label="Loading the inbox" />
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={<InboxIcon />}
                title={inboxFilter === 'all' ? 'No messages yet' : `No ${inboxFilter.toLowerCase()} messages`}
                description="Messages families send from the contact page will show up here, live."
              />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto border-b border-line p-3 lg:border-b-0 lg:border-r">
                <ConversationList conversations={filtered} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
              </div>
              <div className="flex min-h-0 flex-col">
                {selected ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-bold text-ink">{selected.subject}</h3>
                        <p className="truncate text-xs text-muted">
                          {selected.senderName} · {selected.senderEmail}
                          {selected.senderPhone ? ` · ${selected.senderPhone}` : ''}
                        </p>
                      </div>
                      <div className="w-40">
                        <Select
                          value={selected.status}
                          onChange={(event) => void handleStatusChange(event.target.value as ContactMessageStatus)}
                          aria-label="Conversation status"
                        >
                          <option value="New">New</option>
                          <option value="Replied">Replied</option>
                          <option value="Closed">Closed</option>
                        </Select>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunk/50 px-5 py-4">
                      <ChatThread message={selected} viewer="staff" />
                    </div>
                    <div className="border-t border-line p-4">
                      <Composer
                        value={replyBody}
                        onChange={setReplyBody}
                        onSend={() => void handleReply()}
                        isSending={isSendingReply}
                        placeholder="Reply to this family…"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="mt-5 max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Public contact details</h2>
              <p className="mt-0.5 text-sm text-muted">These appear on the family-facing Messages page.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {contentFields.map((field) => (
              <Field key={field.key} label={field.label} className={field.textarea ? 'sm:col-span-2' : undefined}>
                {({ id }) =>
                  field.textarea ? (
                    <Textarea
                      id={id}
                      rows={3}
                      value={content[field.key]}
                      onChange={(event) => setContent((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <Input
                      id={id}
                      value={content[field.key]}
                      onChange={(event) => setContent((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  )
                }
              </Field>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="ghost" leftIcon={<RotateCcwIcon className="h-4 w-4" />} onClick={() => void handleResetContent()} disabled={isSaving}>
              Reset to defaults
            </Button>
            <Button onClick={() => void handleSaveContent()} isLoading={isSaving}>
              Save changes
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
