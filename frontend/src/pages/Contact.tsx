import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ClockIcon, MailIcon, MapPinIcon, MessageCirclePlusIcon, PhoneIcon, UserRoundIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ContactPageContent, fetchContactPageContent, loadContactPageContent } from '../lib/contactContent';
import { addReplyToContactMessage, createContactMessage } from '../lib/contactMessages';
import { ChatThread, Composer, ConversationList, useContactMessagesRealtime } from '../features/messaging';
import { Button, Card, EmptyState, Field, Input, LoadingScreen, PageHeader, Textarea, useToast } from '../components/ui';

const lastSeenKeyPrefix = 'contact-last-seen-staff-replies';

const latestStaffReplyAt = (replies: { authorRole: string; createdAt: string }[]) =>
  replies
    .filter((reply) => reply.authorRole === 'staff' || reply.authorRole === 'admin')
    .reduce((latest, reply) => Math.max(latest, new Date(reply.createdAt).getTime()), 0);

export function Contact() {
  const { user } = useAuth();
  const toast = useToast();
  const [content, setContent] = useState<ContactPageContent>(() => loadContactPageContent());
  const { messages, setMessages, isLoading } = useContactMessagesRealtime({ senderId: user?.id, scopeToSender: true });

  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [lastSeen, setLastSeen] = useState<Record<string, number>>({});

  useEffect(() => {
    setForm((prev) => ({ ...prev, name: user?.name || prev.name, email: user?.email || prev.email, phone: user?.phone || prev.phone }));
  }, [user]);

  useEffect(() => {
    let active = true;
    void fetchContactPageContent().then((next) => {
      if (active) setContent(next);
    });
    return () => {
      active = false;
    };
  }, []);

  // Load / persist per-conversation "seen" markers for the unread indicator.
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(`${lastSeenKeyPrefix}:${user.id}`);
      setLastSeen(raw ? (JSON.parse(raw) as Record<string, number>) : {});
    } catch {
      setLastSeen({});
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    window.localStorage.setItem(`${lastSeenKeyPrefix}:${user.id}`, JSON.stringify(lastSeen));
  }, [lastSeen, user?.id]);

  const selected = useMemo(
    () => messages.find((message) => message.id === selectedId) || messages[0] || null,
    [messages, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    const seenAt = latestStaffReplyAt(selected.replies);
    if (!seenAt) return;
    setLastSeen((prev) => ((prev[selected.id] || 0) >= seenAt ? prev : { ...prev, [selected.id]: seenAt }));
  }, [selected]);

  const unreadIds = useMemo(() => {
    const ids = new Set<string>();
    for (const message of messages) {
      const staffAt = latestStaffReplyAt(message.replies);
      if (staffAt > 0 && staffAt > (lastSeen[message.id] || 0)) ids.add(message.id);
    }
    return ids;
  }, [messages, lastSeen]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await createContactMessage({
      senderId: user?.id || null,
      senderName: form.name,
      senderEmail: form.email,
      senderPhone: form.phone,
      subject: form.subject,
      body: form.message,
    });
    setIsSubmitting(false);
    if (result.error || !result.message) {
      toast.error('Message not sent', result.error || 'Please try again in a moment.');
      return;
    }
    const created = result.message;
    setMessages((prev) => [created, ...prev.filter((message) => message.id !== created.id)]);
    setSelectedId(created.id);
    setForm((prev) => ({ ...prev, subject: '', message: '' }));
    setIsComposing(false);
    toast.success('Message sent', 'The daycare staff can now see and reply to your message.');
  };

  const handleReply = async () => {
    if (!selected || !replyBody.trim() || !user) return;
    setIsSendingReply(true);
    const result = await addReplyToContactMessage(selected.id, {
      authorId: user.id,
      authorName: user.name,
      authorRole: 'guardian',
      body: replyBody,
    });
    setIsSendingReply(false);
    if (result.error || !result.message) {
      toast.error('Reply not sent', result.error || 'Please try again.');
      return;
    }
    const updated = result.message;
    setMessages((prev) => [updated, ...prev.filter((message) => message.id !== updated.id)]);
    setReplyBody('');
  };

  const contactDetails = [
    { icon: UserRoundIcon, label: content.administratorLabel, value: content.administratorName },
    { icon: PhoneIcon, label: 'Phone', value: content.phone },
    { icon: MailIcon, label: 'Email', value: content.email },
    { icon: MapPinIcon, label: 'Address', value: content.address },
    { icon: ClockIcon, label: 'Office hours', value: content.officeHours },
  ];

  const showForm = isComposing || messages.length === 0;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        eyebrow="Messages"
        title={content.pageTitle}
        description={content.pageDescription}
        actions={
          messages.length > 0 ? (
            <Button leftIcon={<MessageCirclePlusIcon className="h-4 w-4" />} onClick={() => setIsComposing((value) => !value)}>
              {isComposing ? 'Close' : 'New message'}
            </Button>
          ) : null
        }
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card padding="none" className="overflow-hidden">
            <div className="bg-brand-deep px-5 py-4">
              <p className="font-display text-sm font-bold text-white">Reach the daycare</p>
              <p className="mt-0.5 text-xs text-white/60">We usually reply within office hours.</p>
            </div>
            <div className="space-y-3.5 p-5">
              {contactDetails.map((detail) => (
                <div key={detail.label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
                    <detail.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xs font-bold uppercase tracking-wide text-muted">{detail.label}</p>
                    <p className="text-sm font-semibold text-ink">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {showForm ? (
            <Card>
              <h2 className="font-display text-base font-bold text-ink">{content.formTitle}</h2>
              <p className="mt-0.5 text-sm text-muted">{content.formDescription}</p>
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <Field label="Your name" required>
                  {({ id }) => <Input id={id} required value={form.name} onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))} />}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email" required>
                    {({ id }) => (
                      <Input id={id} type="email" required value={form.email} onChange={(event) => setForm((p) => ({ ...p, email: event.target.value }))} />
                    )}
                  </Field>
                  <Field label="Phone">
                    {({ id }) => <Input id={id} type="tel" value={form.phone} onChange={(event) => setForm((p) => ({ ...p, phone: event.target.value }))} />}
                  </Field>
                </div>
                <Field label="Subject" required>
                  {({ id }) => (
                    <Input
                      id={id}
                      required
                      value={form.subject}
                      onChange={(event) => setForm((p) => ({ ...p, subject: event.target.value }))}
                      placeholder="What do you need help with?"
                    />
                  )}
                </Field>
                <Field label="Message" required>
                  {({ id }) => (
                    <Textarea
                      id={id}
                      required
                      rows={4}
                      value={form.message}
                      onChange={(event) => setForm((p) => ({ ...p, message: event.target.value }))}
                      placeholder="How can we help you?"
                    />
                  )}
                </Field>
                <Button type="submit" fullWidth isLoading={isSubmitting}>
                  Send message
                </Button>
              </form>
            </Card>
          ) : null}
        </div>

        <Card padding="none" className="flex min-h-[540px] flex-col overflow-hidden">
          {isLoading ? (
            <LoadingScreen label="Loading your messages" />
          ) : messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={<MessageCirclePlusIcon />}
                title="No messages yet"
                description="Send your first message with the form and your conversation with the staff will appear here."
              />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto border-b border-line p-3 md:border-b-0 md:border-r">
                <ConversationList
                  conversations={messages}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelectedId}
                  unreadIds={unreadIds}
                  showSender={false}
                />
              </div>
              <div className="flex min-h-0 flex-col">
                {selected ? (
                  <>
                    <div className="border-b border-line px-5 py-3.5">
                      <h3 className="font-display text-base font-bold text-ink">{selected.subject}</h3>
                      <p className="text-xs text-muted">Conversation with the daycare staff</p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-surface-sunk/50 px-5 py-4">
                      <ChatThread message={selected} viewer="guardian" />
                    </div>
                    <div className="border-t border-line p-4">
                      <Composer
                        value={replyBody}
                        onChange={setReplyBody}
                        onSend={() => void handleReply()}
                        isSending={isSendingReply}
                        placeholder="Reply to the staff…"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
