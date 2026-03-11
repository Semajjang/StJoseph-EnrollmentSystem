import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  ContactMessage,
  addReplyToContactMessage,
  createContactMessage,
  fetchContactMessages
} from '../lib/contactMessages';
import {
  ContactPageContent,
  fetchContactPageContent,
  loadContactPageContent
} from '../lib/contactContent';

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const emptyFormState: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: ''
};

const contactLastSeenStorageKeyPrefix = 'contact-last-seen-staff-replies';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

export function Contact() {
  const { user } = useAuth();
  const [content, setContent] = useState<ContactPageContent>(() => loadContactPageContent());
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [formState, setFormState] = useState<ContactFormState>(() => ({
    ...emptyFormState,
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [lastSeenStaffReplyAt, setLastSeenStaffReplyAt] = useState<Record<string, number>>({});

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      email: user?.email || prev.email,
      phone: user?.phone || prev.phone
    }));
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadContactPage = async () => {
      const [nextContent, nextMessages] = await Promise.all([
        fetchContactPageContent(),
        fetchContactMessages(user?.id)
      ]);

      if (!isMounted) {
        return;
      }

      setContent(nextContent);
      setMessages(nextMessages);
    };

    void loadContactPage();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const conversations = useMemo(() => messages, [messages]);
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || conversations[0] || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedConversationId(null);
      return;
    }

    setSelectedConversationId((prev) =>
      prev && conversations.some((conversation) => conversation.id === prev) ? prev : conversations[0].id
    );
  }, [conversations]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') {
      setLastSeenStaffReplyAt({});
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(`${contactLastSeenStorageKeyPrefix}:${user.id}`);

      if (!rawValue) {
        setLastSeenStaffReplyAt({});
        return;
      }

      const parsed = JSON.parse(rawValue) as Record<string, number>;
      setLastSeenStaffReplyAt(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setLastSeenStaffReplyAt({});
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      `${contactLastSeenStorageKeyPrefix}:${user.id}`,
      JSON.stringify(lastSeenStaffReplyAt)
    );
  }, [lastSeenStaffReplyAt, user?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    const latestStaffReplyAt = selectedConversation.replies
      .filter((reply) => reply.authorRole === 'staff' || reply.authorRole === 'admin')
      .reduce((latest, reply) => Math.max(latest, new Date(reply.createdAt).getTime()), 0);

    if (!latestStaffReplyAt) {
      return;
    }

    setLastSeenStaffReplyAt((prev) => {
      const currentSeen = prev[selectedConversation.id] || 0;

      if (latestStaffReplyAt <= currentSeen) {
        return prev;
      }

      return {
        ...prev,
        [selectedConversation.id]: latestStaffReplyAt
      };
    });
  }, [selectedConversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    const result = await createContactMessage({
      senderId: user?.id || null,
      senderName: formState.name,
      senderEmail: formState.email,
      senderPhone: formState.phone,
      subject: formState.subject,
      body: formState.message
    });

    setIsSubmitting(false);

    if (result.error || !result.message) {
      setSubmitMessage(result.error || 'Unable to send your message right now.');
      return;
    }

    setMessages((prev) => [result.message, ...prev.filter((message) => message.id !== result.message.id)]);
    setSelectedConversationId(result.message.id);
    setFormState((prev) => ({
      ...prev,
      subject: '',
      message: ''
    }));
    setSubmitMessage('Message sent. Staff can now review and reply from the dashboard.');
  };

  const handleReply = async (conversationId: string) => {
    const replyBody = replyDrafts[conversationId]?.trim();

    if (!replyBody || !user) {
      return;
    }

    setSendingReplyId(conversationId);
    const result = await addReplyToContactMessage(conversationId, {
      authorId: user.id,
      authorName: user.name,
      authorRole: 'guardian',
      body: replyBody
    });
    setSendingReplyId(null);

    if (result.error || !result.message) {
      setSubmitMessage(result.error || 'Unable to send your reply right now.');
      return;
    }

    setMessages((prev) =>
      [result.message, ...prev.filter((message) => message.id !== result.message?.id && message != null)].sort(
        (left, right) => new Date((right?.updatedAt ?? '')).getTime() - new Date((left?.updatedAt ?? '')).getTime()
      ) as ContactMessage[]
    );
    setReplyDrafts((prev) => ({
      ...prev,
      [conversationId]: ''
    }));
    setSubmitMessage('');
  };

  const handleSelectConversation = (conversationId: string) => {
    const targetConversation = conversations.find((conversation) => conversation.id === conversationId);
    const latestStaffReplyAt = targetConversation?.replies
      .filter((reply) => reply.authorRole === 'staff' || reply.authorRole === 'admin')
      .reduce((latest, reply) => Math.max(latest, new Date(reply.createdAt).getTime()), 0) || 0;

    setSelectedConversationId(conversationId);
    setLastSeenStaffReplyAt((prev) => ({
      ...prev,
      [conversationId]: Math.max(prev[conversationId] || 0, latestStaffReplyAt)
    }));
  };

  return (
    <div className="p-8 pb-24 xl:flex xl:h-screen xl:flex-col xl:overflow-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">{content.pageTitle}</h1>
        <p className="text-gray-500 mt-1">{content.pageDescription}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:min-h-0 xl:flex-1 xl:grid-cols-[0.82fr,1.18fr]">
        <div className="space-y-6 xl:flex xl:min-h-0 xl:flex-col">
          {/* Contact Info Card */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.1
            }}
            className="bg-[#FBCFE8] rounded-2xl shadow-md p-8 text-gray-800 relative overflow-hidden">

            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-20 rounded-full -mr-10 -mt-10" />

            <h2 className="text-2xl font-bold mb-8 relative z-10">
              Contact Information
            </h2>

            <div className="space-y-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                  A
                </div>
                <div>
                  <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                    {content.administratorLabel}
                  </p>
                  <p className="text-xl font-bold">{content.administratorName}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                  P
                </div>
                <div>
                  <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                    Phone
                  </p>
                  <p className="text-xl font-bold">{content.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                  E
                </div>
                <div>
                  <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                    Email
                  </p>
                  <p className="text-xl font-bold break-all">
                    {content.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                  L
                </div>
                <div>
                  <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                    Address
                  </p>
                  <p className="text-xl font-bold">{content.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                  H
                </div>
                <div>
                  <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                    Office Hours
                  </p>
                  <p className="text-xl font-bold">{content.officeHours}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            className="rounded-2xl border border-gray-50 bg-white p-8 shadow-md xl:min-h-0 xl:flex-1 xl:overflow-auto"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">{content.formTitle}</h2>
              <p className="mt-1 text-sm text-gray-500">{content.formDescription}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 transition-colors focus:border-[#BAE6FD] focus:outline-none"
                  placeholder="Full Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 transition-colors focus:border-[#BAE6FD] focus:outline-none"
                    placeholder="Email Address"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 transition-colors focus:border-[#BAE6FD] focus:outline-none"
                    placeholder="Phone Number"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={formState.subject}
                  onChange={(event) => setFormState((prev) => ({ ...prev, subject: event.target.value }))}
                  className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 transition-colors focus:border-[#BAE6FD] focus:outline-none"
                  placeholder="What do you need help with?"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={formState.message}
                  onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                  className="w-full resize-none rounded-xl border-2 border-gray-100 px-4 py-3 transition-colors focus:border-[#BAE6FD] focus:outline-none"
                  placeholder="How can we help you?"
                />
              </div>
              {submitMessage ?
                <div className="rounded-2xl bg-[#EFF6FF] px-4 py-3 text-sm font-semibold text-sky-700">
                  {submitMessage}
                </div> :
                null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#BAE6FD] py-3 font-bold text-gray-800 shadow-sm transition-colors hover:bg-[#7DD3FC] disabled:cursor-not-allowed disabled:bg-sky-200"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </motion.div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-gray-800">Your Conversations</h2>
            <p className="mt-1 text-sm text-gray-500">
              Staff replies to your submitted contact messages will appear here.
            </p>
          </div>

          {conversations.length === 0 ?
            <div className="rounded-2xl bg-[#F8FBFF] px-5 py-6 text-sm font-medium text-gray-500">
              No messages yet. Send your first message using the form.
            </div> :
            <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[260px,minmax(0,1fr)]">
              <div className="space-y-2 xl:min-h-0 xl:overflow-auto xl:pr-1">
                {conversations.map((conversation) => {
                  const latestReply = conversation.replies[conversation.replies.length - 1];
                  const previewText = (latestReply?.body || conversation.body || '').replace(/\s+/g, ' ').trim();
                  const latestStaffReplyAt = conversation.replies
                    .filter((reply) => reply.authorRole === 'staff' || reply.authorRole === 'admin')
                    .reduce((latest, reply) => Math.max(latest, new Date(reply.createdAt).getTime()), 0);
                  const seenAt = lastSeenStaffReplyAt[conversation.id] || 0;
                  const hasUnread = latestStaffReplyAt > 0 && latestStaffReplyAt > seenAt;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedConversation?.id === conversation.id ? 'border-sky-300 bg-[#EFF6FF]' : 'border-blue-100 bg-[#F8FBFF] hover:bg-[#EEF6FF]'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-extrabold text-gray-800">{conversation.subject}</p>
                        {hasUnread ?
                          <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            New
                          </span> :
                          null}
                      </div>
                      <p className="mt-1 truncate text-xs leading-5 text-gray-500">{previewText}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatDateTime(conversation.updatedAt)}</p>
                    </button>
                  );
                })}
              </div>

              {selectedConversation ?
                <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-blue-100 bg-[#F8FBFF]">
                  <div className="border-b border-blue-100 bg-[#F8FBFF] px-5 pt-5 pb-4">
                    <h3 className="text-lg font-extrabold text-gray-800">{selectedConversation.subject}</h3>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                      {selectedConversation.status} · {formatDateTime(selectedConversation.createdAt)}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-auto px-5 py-4">
                    <div className="flex justify-end">
                      <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-[#DBEAFE] px-4 py-3 text-[#1E3A8A] shadow-sm">
                        <p className="text-sm font-extrabold text-[#1E40AF]">
                          {selectedConversation.senderName}
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
                            guardian
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                          {selectedConversation.body}
                        </p>
                        <p className="mt-2 text-xs text-blue-600">{formatDateTime(selectedConversation.createdAt)}</p>
                      </div>
                    </div>

                    {selectedConversation.replies.map((reply) => {
                      const isGuardianReply = reply.authorRole === 'guardian';

                      return (
                        <div key={reply.id} className={`flex ${isGuardianReply ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                              isGuardianReply
                                ? 'rounded-tr-md bg-[#DBEAFE] text-[#1E3A8A]'
                                : 'rounded-tl-md border border-blue-100 bg-white text-gray-800'
                            }`}
                          >
                            <p className={`text-sm font-extrabold ${isGuardianReply ? 'text-[#1E40AF]' : 'text-gray-800'}`}>
                              {reply.authorName}
                              <span className={`ml-2 text-xs font-semibold uppercase tracking-wide ${isGuardianReply ? 'text-[#1D4ED8]' : 'text-sky-600'}`}>
                                {reply.authorRole}
                              </span>
                            </p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{reply.body}</p>
                            <p className={`mt-2 text-xs ${isGuardianReply ? 'text-blue-600' : 'text-gray-400'}`}>
                              {formatDateTime(reply.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-blue-100 bg-[#F8FBFF] p-5">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Reply To Staff</span>
                      <textarea
                        rows={3}
                        value={replyDrafts[selectedConversation.id] || ''}
                        onChange={(event) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [selectedConversation.id]: event.target.value
                          }))
                        }
                        className="mt-2 w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-300"
                        placeholder="Send a follow-up reply in this conversation."
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleReply(selectedConversation.id)}
                        disabled={sendingReplyId === selectedConversation.id || !replyDrafts[selectedConversation.id]?.trim()}
                        className="rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
                      >
                        {sendingReplyId === selectedConversation.id ? 'Sending Reply...' : 'Reply In Thread'}
                      </button>
                    </div>
                  </div>
                </div> :
                null}
            </div>}
        </div>
      </div>
    </div>);

}