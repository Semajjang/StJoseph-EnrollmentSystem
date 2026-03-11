import { supabase } from './supabase';

export type ContactMessageStatus = 'New' | 'Replied' | 'Closed';

export interface ContactReply {
  id: string;
  authorId: string | null;
  authorName: string;
  authorRole: 'guardian' | 'staff' | 'admin';
  body: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  body: string;
  status: ContactMessageStatus;
  replies: ContactReply[];
  createdAt: string;
  updatedAt: string;
}

interface ContactMessageRow {
  id: string;
  sender_id: string | null;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  subject: string;
  body: string;
  status: string;
  replies: unknown;
  created_at: string;
  updated_at: string;
}

interface CreateContactMessageInput {
  senderId: string | null;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  body: string;
}

interface AddReplyInput {
  authorId: string | null;
  authorName: string;
  authorRole: 'guardian' | 'staff' | 'admin';
  body: string;
}

const contactMessagesStorageKey = 'contact-messages';

const normalizeReply = (value: Partial<ContactReply> | null | undefined, index: number): ContactReply => ({
  id: typeof value?.id === 'string' ? value.id : `reply-${index + 1}`,
  authorId: typeof value?.authorId === 'string' ? value.authorId : null,
  authorName: typeof value?.authorName === 'string' ? value.authorName : 'Staff',
  authorRole:
    value?.authorRole === 'staff' || value?.authorRole === 'admin' || value?.authorRole === 'guardian'
      ? value.authorRole
      : 'staff',
  body: typeof value?.body === 'string' ? value.body : '',
  createdAt: typeof value?.createdAt === 'string' ? value.createdAt : new Date().toISOString()
});

const normalizeReplies = (value: unknown): ContactReply[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Partial<ContactReply> => typeof item === 'object' && item !== null)
    .map((item, index) => normalizeReply(item, index));
};

const normalizeStatus = (value: unknown): ContactMessageStatus => {
  if (value === 'New' || value === 'Replied' || value === 'Closed') {
    return value;
  }

  return 'New';
};

const normalizeMessage = (value: Partial<ContactMessage> | ContactMessageRow, index: number): ContactMessage => ({
  id: typeof value.id === 'string' ? value.id : `message-${index + 1}`,
  senderId:
    'sender_id' in value
      ? value.sender_id
      : typeof value.senderId === 'string'
        ? value.senderId
        : null,
  senderName:
    'sender_name' in value
      ? value.sender_name
      : typeof value.senderName === 'string'
        ? value.senderName
        : 'Unknown Sender',
  senderEmail:
    'sender_email' in value
      ? value.sender_email
      : typeof value.senderEmail === 'string'
        ? value.senderEmail
        : '',
  senderPhone:
    'sender_phone' in value
      ? value.sender_phone || ''
      : typeof value.senderPhone === 'string'
        ? value.senderPhone
        : '',
  subject: typeof value.subject === 'string' ? value.subject : 'General Inquiry',
  body: typeof value.body === 'string' ? value.body : '',
  status: normalizeStatus(value.status),
  replies: normalizeReplies(value.replies),
  createdAt:
    'created_at' in value
      ? value.created_at
      : typeof value.createdAt === 'string'
        ? value.createdAt
        : new Date().toISOString(),
  updatedAt:
    'updated_at' in value
      ? value.updated_at
      : typeof value.updatedAt === 'string'
        ? value.updatedAt
        : new Date().toISOString()
});

const sortMessages = (messages: ContactMessage[]) =>
  [...messages].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );

const getReplyStatus = (authorRole: AddReplyInput['authorRole']): ContactMessageStatus =>
  authorRole === 'guardian' ? 'New' : 'Replied';

const loadStoredMessages = (): ContactMessage[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(contactMessagesStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as Partial<ContactMessage>[];
    return sortMessages(parsedValue.map((message, index) => normalizeMessage(message, index)));
  } catch {
    return [];
  }
};

const saveStoredMessages = (messages: ContactMessage[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(contactMessagesStorageKey, JSON.stringify(messages));
  }
};

export const fetchContactMessages = async (senderId?: string | null): Promise<ContactMessage[]> => {
  let query = supabase
    .from('contact_messages')
    .select('id, sender_id, sender_name, sender_email, sender_phone, subject, body, status, replies, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (senderId) {
    query = query.eq('sender_id', senderId);
  }

  const { data } = await query;

  if (!data) {
    const fallbackMessages = loadStoredMessages();
    return senderId ? fallbackMessages.filter((message) => message.senderId === senderId) : fallbackMessages;
  }

  const normalizedMessages = sortMessages(
    data.map((message, index) => normalizeMessage(message as ContactMessageRow, index))
  );
  saveStoredMessages(normalizedMessages);
  return normalizedMessages;
};

export const createContactMessage = async (input: CreateContactMessageInput) => {
  const nextMessage: ContactMessage = {
    id: `message-${Date.now()}`,
    senderId: input.senderId,
    senderName: input.senderName.trim(),
    senderEmail: input.senderEmail.trim(),
    senderPhone: input.senderPhone.trim(),
    subject: input.subject.trim() || 'General Inquiry',
    body: input.body.trim(),
    status: 'New',
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const fallbackMessages = sortMessages([nextMessage, ...loadStoredMessages()]);
  saveStoredMessages(fallbackMessages);

  const { data } = await supabase
    .from('contact_messages')
    .insert({
      sender_id: nextMessage.senderId,
      sender_name: nextMessage.senderName,
      sender_email: nextMessage.senderEmail,
      sender_phone: nextMessage.senderPhone || null,
      subject: nextMessage.subject,
      body: nextMessage.body,
      status: nextMessage.status,
      replies: nextMessage.replies,
      updated_at: nextMessage.updatedAt
    })
    .select('id, sender_id, sender_name, sender_email, sender_phone, subject, body, status, replies, created_at, updated_at')
    .maybeSingle();

  if (!data) {
    return {
      error: null,
      message: nextMessage
    };
  }

  const normalizedMessage = normalizeMessage(data as ContactMessageRow, 0);
  const mergedMessages = sortMessages([
    normalizedMessage,
    ...fallbackMessages.filter((message) => message.id !== nextMessage.id)
  ]);
  saveStoredMessages(mergedMessages);

  return {
    error: null,
    message: normalizedMessage
  };
};

export const addReplyToContactMessage = async (messageId: string, input: AddReplyInput) => {
  const storedMessages = loadStoredMessages();
  const existingMessage = storedMessages.find((message) => message.id === messageId);

  if (!existingMessage) {
    return {
      error: 'Message not found.',
      message: null as ContactMessage | null
    };
  }

  const nextReply: ContactReply = {
    id: `reply-${Date.now()}`,
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    body: input.body.trim(),
    createdAt: new Date().toISOString()
  };

  const updatedMessage: ContactMessage = {
    ...existingMessage,
    status: getReplyStatus(input.authorRole),
    replies: [...existingMessage.replies, nextReply],
    updatedAt: nextReply.createdAt
  };

  const nextMessages = sortMessages(
    storedMessages.map((message) => (message.id === messageId ? updatedMessage : message))
  );
  saveStoredMessages(nextMessages);

  await supabase
    .from('contact_messages')
    .update({
      replies: updatedMessage.replies,
      status: updatedMessage.status,
      updated_at: updatedMessage.updatedAt
    })
    .eq('id', messageId);

  return {
    error: null,
    message: updatedMessage
  };
};

export const updateContactMessageStatus = async (
  messageId: string,
  status: ContactMessageStatus
) => {
  const storedMessages = loadStoredMessages();
  const nextMessages = sortMessages(
    storedMessages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            status,
            updatedAt: new Date().toISOString()
          }
        : message
    )
  );
  saveStoredMessages(nextMessages);

  const nextMessage = nextMessages.find((message) => message.id === messageId) || null;

  if (nextMessage) {
    await supabase
      .from('contact_messages')
      .update({
        status: nextMessage.status,
        updated_at: nextMessage.updatedAt
      })
      .eq('id', messageId);
  }

  return {
    error: null,
    message: nextMessage
  };
};