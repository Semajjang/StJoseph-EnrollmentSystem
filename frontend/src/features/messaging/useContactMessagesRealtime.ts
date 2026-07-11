import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ContactMessage,
  fetchContactMessages,
  subscribeToContactMessages,
} from '../../lib/contactMessages';

const FALLBACK_POLL_MS = 15000;

const sortByUpdated = (messages: ContactMessage[]) =>
  [...messages].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

interface Options {
  /** When set, only this guardian's conversations are loaded/streamed. */
  senderId?: string | null;
  /** Guardians must not receive other families' rows even if realtime is unscoped. */
  scopeToSender?: boolean;
}

/**
 * Loads contact conversations and keeps them live via Supabase Realtime, with a
 * periodic refetch fallback so the UI still updates if realtime is unavailable.
 */
export function useContactMessagesRealtime({ senderId, scopeToSender = false }: Options) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const senderIdRef = useRef(senderId);
  senderIdRef.current = senderId;

  const refresh = useCallback(async () => {
    const next = await fetchContactMessages(senderIdRef.current ?? undefined);
    setMessages(next);
    setIsLoading(false);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void fetchContactMessages(senderId ?? undefined).then((next) => {
      if (active) {
        setMessages(next);
        setIsLoading(false);
      }
    });

    const unsubscribe = subscribeToContactMessages((change) => {
      if (!active) return;
      setMessages((prev) => {
        if (change.type === 'delete') {
          return prev.filter((message) => message.id !== change.id);
        }
        const incoming = change.message;
        if (scopeToSender && senderId && incoming.senderId !== senderId) {
          return prev;
        }
        return sortByUpdated([incoming, ...prev.filter((message) => message.id !== incoming.id)]);
      });
    });

    const pollTimer = window.setInterval(() => {
      void fetchContactMessages(senderId ?? undefined).then((next) => {
        if (active) setMessages(next);
      });
    }, FALLBACK_POLL_MS);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(pollTimer);
    };
  }, [senderId, scopeToSender]);

  return { messages, setMessages, isLoading, refresh };
}
