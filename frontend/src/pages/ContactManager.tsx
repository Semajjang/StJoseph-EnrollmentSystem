import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ContactPageContent,
  defaultContactPageContent,
  fetchContactPageContent,
  loadContactPageContent,
  resetContactPageContent,
  saveContactPageContent
} from '../lib/contactContent';
import {
  ContactMessage,
  addReplyToContactMessage,
  fetchContactMessages,
  updateContactMessageStatus
} from '../lib/contactMessages';

interface ContactManagerProps {
  onPreviewContact: () => void;
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

export function ContactManager({ onPreviewContact }: ContactManagerProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<ContactPageContent>(() => loadContactPageContent());
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'New' | 'Replied' | 'Closed'>('all');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [nextContent, nextMessages] = await Promise.all([
        fetchContactPageContent(),
        fetchContactMessages()
      ]);

      if (!isMounted) {
        return;
      }

      setContent(nextContent);
      setMessages(nextMessages);
      setSelectedMessageId((prev) => prev || nextMessages[0]?.id || null);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const inboxCounts = useMemo(
    () => ({
      all: messages.length,
      New: messages.filter((message) => message.status === 'New').length,
      Replied: messages.filter((message) => message.status === 'Replied').length,
      Closed: messages.filter((message) => message.status === 'Closed').length
    }),
    [messages]
  );

  const filteredMessages = useMemo(() => {
    if (inboxFilter === 'all') {
      return messages;
    }

    return messages.filter((message) => message.status === inboxFilter);
  }, [messages, inboxFilter]);

  const selectedMessage = useMemo(
    () => filteredMessages.find((message) => message.id === selectedMessageId) || null,
    [filteredMessages, selectedMessageId]
  );

  useEffect(() => {
    setSelectedMessageId((prev) => {
      if (prev && filteredMessages.some((message) => message.id === prev)) {
        return prev;
      }

      return filteredMessages[0]?.id || null;
    });
  }, [filteredMessages]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveContactPageContent(content);
    setIsSaving(false);

    if (result.error) {
      setSaveMessage(result.error);
      return;
    }

    setContent(result.content);
    setSaveMessage('Contact page updates saved.');
  };

  const handleReset = async () => {
    setIsSaving(true);
    const result = await resetContactPageContent();
    setIsSaving(false);

    if (result.error) {
      setSaveMessage(result.error);
      return;
    }

    setContent(defaultContactPageContent);
    setSaveMessage('Contact page reset to defaults.');
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyBody.trim() || !user) {
      return;
    }

    setIsSendingReply(true);
    const result = await addReplyToContactMessage(selectedMessage.id, {
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role === 'admin' ? 'admin' : 'staff',
      body: replyBody
    });
    setIsSendingReply(false);

    if (result.error || !result.message) {
      setSaveMessage(result.error || 'Reply could not be sent.');
      return;
    }

    setMessages((prev) =>
      [result.message, ...prev.filter((message) => message.id !== result.message?.id)].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
    );
    if (inboxFilter !== 'all' && inboxFilter !== result.message.status) {
      setInboxFilter(result.message.status);
    }
    setSelectedMessageId(result.message.id);
    setReplyBody('');
    setSaveMessage('');
  };

  const handleStatusChange = async (status: 'New' | 'Replied' | 'Closed') => {
    if (!selectedMessage) {
      return;
    }

    const result = await updateContactMessageStatus(selectedMessage.id, status);

    if (!result.message) {
      return;
    }

    setMessages((prev) =>
      [result.message, ...prev.filter((message) => message.id !== result.message?.id)].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
    );
    if (inboxFilter !== 'all' && inboxFilter !== result.message.status) {
      setInboxFilter(result.message.status);
    }
    setSelectedMessageId(result.message.id);
  };

  const handleReplyInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();

    if (isSendingReply || !replyBody.trim()) {
      return;
    }

    void handleReply();
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Contact Management
          </p>
          <h1 className="text-3xl font-extrabold text-gray-800">Manage Contact Page and Inbox</h1>
          <p className="mt-1 text-gray-500">
            Edit the public contact information, review incoming messages, and reply from staff.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPreviewContact}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Preview Contact Page
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
        <div className="mb-6 rounded-2xl border border-sky-200 bg-[#EFF6FF] px-5 py-4 text-sm font-semibold text-sky-700">
          {saveMessage}
        </div> :
        null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[0.78fr,1.22fr]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-extrabold text-gray-800">Public Contact Details</h2>
          <div className="space-y-4 overflow-auto pr-1">
            <label className="block">
              <span className="text-sm font-bold text-gray-700">Page Title</span>
              <input
                value={content.pageTitle}
                onChange={(event) => setContent((prev) => ({ ...prev, pageTitle: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-700">Page Description</span>
              <textarea
                rows={3}
                value={content.pageDescription}
                onChange={(event) => setContent((prev) => ({ ...prev, pageDescription: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-700">Form Title</span>
              <input
                value={content.formTitle}
                onChange={(event) => setContent((prev) => ({ ...prev, formTitle: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-700">Form Description</span>
              <textarea
                rows={3}
                value={content.formDescription}
                onChange={(event) => setContent((prev) => ({ ...prev, formDescription: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Administrator Label</span>
                <input
                  value={content.administratorLabel}
                  onChange={(event) => setContent((prev) => ({ ...prev, administratorLabel: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Administrator Name</span>
                <input
                  value={content.administratorName}
                  onChange={(event) => setContent((prev) => ({ ...prev, administratorName: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Phone</span>
                <input
                  value={content.phone}
                  onChange={(event) => setContent((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-700">Email</span>
                <input
                  value={content.email}
                  onChange={(event) => setContent((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-bold text-gray-700">Address</span>
              <input
                value={content.address}
                onChange={(event) => setContent((prev) => ({ ...prev, address: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-700">Office Hours</span>
              <input
                value={content.officeHours}
                onChange={(event) => setContent((prev) => ({ ...prev, officeHours: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-sky-300"
              />
            </label>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-gray-800">Inbox</h2>
              <p className="mt-1 text-sm text-gray-500">
                Incoming messages from the contact page are listed here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchContactMessages().then((nextMessages) => {
                setMessages(nextMessages);
              })}
              className="rounded-xl bg-[#EFF6FF] px-4 py-2 text-sm font-bold text-sky-700 hover:bg-[#DBEAFE]"
            >
              Refresh Inbox
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInboxFilter('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${inboxFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              All ({inboxCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setInboxFilter('New')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${inboxFilter === 'New' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
            >
              New ({inboxCounts.New})
            </button>
            <button
              type="button"
              onClick={() => setInboxFilter('Replied')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${inboxFilter === 'Replied' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              Replied ({inboxCounts.Replied})
            </button>
            <button
              type="button"
              onClick={() => setInboxFilter('Closed')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${inboxFilter === 'Closed' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
            >
              Closed ({inboxCounts.Closed})
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[250px,minmax(0,1fr)]">
            <div className="min-h-0 space-y-3 overflow-auto pr-1">
              {filteredMessages.length === 0 ?
                <div className="rounded-2xl bg-[#F8FBFF] px-4 py-5 text-sm text-gray-500">
                  {inboxFilter === 'all' ? 'No messages yet.' : `No ${inboxFilter.toLowerCase()} messages.`}
                </div> :
                filteredMessages.map((message) =>
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => setSelectedMessageId(message.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${selectedMessageId === message.id ? 'border-sky-300 bg-[#EFF6FF]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}>

                    <p className="text-sm font-extrabold text-gray-800">{message.subject}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-sky-600">
                      {message.status}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">{message.senderName}</p>
                    <p className="mt-1 text-xs text-gray-400">{formatDateTime(message.updatedAt)}</p>
                  </button>
                )}
            </div>

            <div className="flex min-h-0 h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-[#F8FBFF] p-5">
              {selectedMessage ?
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-800">{selectedMessage.subject}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        From {selectedMessage.senderName} · {selectedMessage.senderEmail}
                        {selectedMessage.senderPhone ? ` · ${selectedMessage.senderPhone}` : ''}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-sky-600">
                        Created {formatDateTime(selectedMessage.createdAt)}
                      </p>
                    </div>
                    <select
                      value={selectedMessage.status}
                      onChange={(event) => void handleStatusChange(event.target.value as 'New' | 'Replied' | 'Closed')}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-sky-300">

                      <option value="New">New</option>
                      <option value="Replied">Replied</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="mt-5 flex min-h-0 flex-1 flex-col">
                    <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Thread</p>
                    <div className="mt-3 min-h-0 flex-1 overflow-auto pr-1">
                      <div className="space-y-3 rounded-2xl bg-white p-3 shadow-sm">
                        <div className="flex justify-start">
                          <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-gray-100 bg-[#F8FAFC] px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-extrabold text-gray-800">{selectedMessage.senderName}</p>
                              <span className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                                guardian
                              </span>
                              <p className="text-xs text-gray-400">{formatDateTime(selectedMessage.createdAt)}</p>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                              {selectedMessage.body}
                            </p>
                          </div>
                        </div>

                        {selectedMessage.replies.length === 0 ?
                          <div className="rounded-2xl bg-[#F8FBFF] px-4 py-4 text-sm text-gray-500">
                            No replies yet.
                          </div> :
                          selectedMessage.replies.map((reply) => {
                            const isOwnReply = Boolean(user?.id && reply.authorId && reply.authorId === user.id);

                            return (
                              <div key={reply.id} className={`flex ${isOwnReply ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                                    isOwnReply
                                      ? 'rounded-tr-md bg-[#DBEAFE] text-[#1E3A8A]'
                                      : 'rounded-tl-md border border-gray-100 bg-[#F8FAFC] text-gray-800'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className={`text-sm font-extrabold ${isOwnReply ? 'text-[#1E40AF]' : 'text-gray-800'}`}>
                                      {reply.authorName}
                                    </p>
                                    <span className={`text-xs font-semibold uppercase tracking-wide ${isOwnReply ? 'text-[#1D4ED8]' : 'text-sky-600'}`}>
                                      {reply.authorRole}
                                    </span>
                                    <p className={`text-xs ${isOwnReply ? 'text-blue-600' : 'text-gray-400'}`}>
                                      {formatDateTime(reply.createdAt)}
                                    </p>
                                  </div>
                                  <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${isOwnReply ? 'text-[#1E3A8A]' : 'text-gray-700'}`}>
                                    {reply.body}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="block">
                      <span className="text-sm font-bold text-gray-700">Reply</span>
                      <textarea
                        rows={4}
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        onKeyDown={handleReplyInputKeyDown}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-300"
                        placeholder="Write your reply to this contact message. Press Enter to send, Shift+Enter for a new line." />

                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleReply()}
                        disabled={isSendingReply || !replyBody.trim()}
                        className="rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300">

                        {isSendingReply ? 'Sending Reply...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div> :
                <div className="rounded-2xl bg-white px-4 py-5 text-sm text-gray-500 shadow-sm">
                  Select a message to review and reply.
                </div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}