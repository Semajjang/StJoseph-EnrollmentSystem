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

  const recentConversations = useMemo(() => messages.slice(0, 6), [messages]);

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
      [result.message, ...prev.filter((message) => message.id !== result.message?.id)].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
    );
    setReplyDrafts((prev) => ({
      ...prev,
      [conversationId]: ''
    }));
    setSubmitMessage('Reply sent. Staff can continue the same conversation from the dashboard.');
  };

  return (
    <div className="p-8 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">{content.pageTitle}</h1>
        <p className="text-gray-500 mt-1">{content.pageDescription}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr,0.9fr]">
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
          className="bg-white rounded-2xl shadow-md p-8 border border-gray-50">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">{content.formTitle}</h2>
            <p className="mt-1 text-sm text-gray-500">{content.formDescription}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Your Name
              </label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                placeholder="Full Name" />

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                  placeholder="Email Address" />

              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formState.phone}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                  placeholder="Phone Number" />

              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Subject
              </label>
              <input
                type="text"
                required
                value={formState.subject}
                onChange={(event) => setFormState((prev) => ({ ...prev, subject: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                placeholder="What do you need help with?" />

            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Message
              </label>
              <textarea
                required
                rows={4}
                value={formState.message}
                onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors resize-none"
                placeholder="How can we help you?" />

            </div>
            {submitMessage ?
              <div className="rounded-2xl bg-[#EFF6FF] px-4 py-3 text-sm font-semibold text-sky-700">
                {submitMessage}
              </div> :
              null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#BAE6FD] hover:bg-[#7DD3FC] text-gray-800 font-bold py-3 rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-sky-200">

              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </motion.div>

        <div className="space-y-6">
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

          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-extrabold text-gray-800">Your Conversations</h2>
              <p className="mt-1 text-sm text-gray-500">
                Staff replies to your submitted contact messages will appear here.
              </p>
            </div>

            {recentConversations.length === 0 ?
              <div className="rounded-2xl bg-[#F8FBFF] px-5 py-6 text-sm font-medium text-gray-500">
                No messages yet. Send your first message using the form.
              </div> :
              <div className="space-y-4">
                {recentConversations.map((conversation) =>
                  <div key={conversation.id} className="rounded-2xl border border-blue-100 bg-[#F8FBFF] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-gray-800">{conversation.subject}</h3>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                          {conversation.status} · {formatDateTime(conversation.createdAt)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-600">{conversation.body}</p>

                    {conversation.replies.length > 0 ?
                      <div className="mt-4 space-y-3 border-t border-blue-100 pt-4">
                        {conversation.replies.map((reply) =>
                          <div
                            key={reply.id}
                            className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">

                            <p className="font-bold text-gray-800">
                              {reply.authorName}
                              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                                {reply.authorRole}
                              </span>
                            </p>
                            <p className="mt-1 leading-6">{reply.body}</p>
                            <p className="mt-2 text-xs font-medium text-gray-400">
                              {formatDateTime(reply.createdAt)}
                            </p>
                          </div>
                        )}
                      </div> :
                      null}

                    <div className="mt-4 border-t border-blue-100 pt-4">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Reply To Staff
                        </span>
                        <textarea
                          rows={3}
                          value={replyDrafts[conversation.id] || ''}
                          onChange={(event) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [conversation.id]: event.target.value
                            }))
                          }
                          className="mt-2 w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-300"
                          placeholder="Send a follow-up reply in this conversation."
                        />
                      </label>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleReply(conversation.id)}
                          disabled={sendingReplyId === conversation.id || !replyDrafts[conversation.id]?.trim()}
                          className="rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                          {sendingReplyId === conversation.id ? 'Sending Reply...' : 'Reply In Thread'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>}
          </div>
        </div>
      </div>
    </div>);

}